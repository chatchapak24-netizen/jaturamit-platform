import {
  cleanInput,
  createServiceSupabase,
  getPaymentEnv,
  isVerifiedChargeForMode,
  jsonResponse,
  mappedPaymentStatus,
  retrieveCharge,
} from "@/app/api/payments/omise/_shared";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type OmiseWebhookPayload = {
  key?: string;
  data?: {
    id?: string;
    object?: string;
  };
};

type PaymentRecord = {
  id: string;
  preorder_id: string | null;
  amount: number | null;
  status: string | null;
};

function chargeIdFromPayload(payload: OmiseWebhookPayload) {
  if (payload.data?.object === "charge") {
    return cleanInput(payload.data.id);
  }

  return "";
}

export async function POST(request: Request) {
  let payload: OmiseWebhookPayload;

  try {
    payload = (await request.json()) as OmiseWebhookPayload;
  } catch {
    return jsonResponse({ error: "invalid webhook payload" }, 400);
  }

  if (!["charge.complete", "charge.update"].includes(payload.key || "")) {
    return jsonResponse({ received: true }, 200);
  }

  const chargeId = chargeIdFromPayload(payload);
  if (!chargeId) {
    return jsonResponse({ error: "missing charge id" }, 400);
  }

  const { env, error: envError, status } = getPaymentEnv();
  if (!env) {
    return jsonResponse({ error: envError }, status || 500);
  }

  const supabase = createServiceSupabase(env);
  const { data: paymentRow, error: paymentError } = await supabase
    .from("preorder_payments")
    .select("id, preorder_id, amount, status")
    .eq("omise_charge_id", chargeId)
    .maybeSingle();

  if (paymentError) {
    return jsonResponse({ error: "payment lookup failed" }, 500);
  }

  if (!paymentRow) {
    return jsonResponse({ error: "payment was not found" }, 404);
  }

  const payment = paymentRow as PaymentRecord;

  try {
    const verifiedCharge = await retrieveCharge(env.omiseSecretKey, chargeId);
    const verifiedStatus = mappedPaymentStatus(verifiedCharge);
    const amountMatches = verifiedCharge.amount === Number(payment.amount || 0) * 100;
    const verified =
      verifiedCharge.id === chargeId &&
      amountMatches &&
      isVerifiedChargeForMode(verifiedCharge, env.omiseMode);

    if (!verified) {
      await supabase
        .from("preorder_payments")
        .update({
          raw_webhook: payload,
          raw_charge: verifiedCharge,
        })
        .eq("id", payment.id);

      return jsonResponse({ error: "charge verification failed" }, 400);
    }

    await supabase
      .from("preorder_payments")
      .update({
        status: verifiedStatus,
        paid_at:
          verifiedStatus === "successful"
            ? verifiedCharge.paid_at || new Date().toISOString()
            : null,
        raw_webhook: payload,
        raw_charge: verifiedCharge,
      })
      .eq("id", payment.id);

    if (verifiedStatus === "successful" && payment.preorder_id) {
      const { data: order } = await supabase
        .from("preorders")
        .select("id, status")
        .eq("id", payment.preorder_id)
        .maybeSingle();

      if (order && ["pending", "paid", null].includes(order.status)) {
        await supabase
          .from("preorders")
          .update({ status: "paid" })
          .eq("id", payment.preorder_id);
      }
    }

    return jsonResponse({ received: true }, 200);
  } catch {
    return jsonResponse({ error: "charge verification failed" }, 502);
  }
}
