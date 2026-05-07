import {
  cleanInput,
  createServiceSupabase,
  getPaymentEnv,
  jsonResponse,
  validatePhone,
} from "@/app/api/payments/omise/_shared";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type PaymentStatusOrder = {
  id: string;
  order_code: string | null;
};

type PaymentStatusRow = {
  status: string | null;
  amount: number | null;
  currency: string | null;
  paid_at: string | null;
  provider: string | null;
  payment_method: string | null;
};

export async function GET(request: Request) {
  const url = new URL(request.url);
  const orderCode = cleanInput(url.searchParams.get("order_code"));
  const phone = cleanInput(url.searchParams.get("phone"));

  if (!orderCode || !phone) {
    return jsonResponse({ error: "กรุณาระบุรหัสออเดอร์และเบอร์โทร" }, 400);
  }

  if (!validatePhone(phone)) {
    return jsonResponse(
      { error: "กรุณากรอกเบอร์โทรให้ถูกต้อง 10 หลัก เช่น 0812345678" },
      400,
    );
  }

  const { env, error: envError, status } = getPaymentEnv();
  if (!env) {
    return jsonResponse({ error: envError }, status || 500);
  }

  const supabase = createServiceSupabase(env);
  const { data: order, error: orderError } = await supabase
    .from("preorders")
    .select("id, order_code")
    .eq("order_code", orderCode)
    .eq("phone", phone)
    .maybeSingle();

  if (orderError) {
    return jsonResponse({ error: "ไม่สามารถตรวจสอบสถานะการชำระเงินได้" }, 500);
  }

  if (!order) {
    return jsonResponse({ error: "ไม่พบออเดอร์" }, 404);
  }

  const preorder = order as PaymentStatusOrder;
  const { data: paymentRows, error: paymentError } = await supabase
    .from("preorder_payments")
    .select("status, amount, currency, paid_at, provider, payment_method")
    .eq("preorder_id", preorder.id)
    .order("created_at", { ascending: false })
    .limit(1);

  if (paymentError) {
    return jsonResponse({ error: "ไม่สามารถตรวจสอบสถานะการชำระเงินได้" }, 500);
  }

  const payment = (paymentRows?.[0] || null) as PaymentStatusRow | null;

  return jsonResponse(
    {
      order_code: preorder.order_code,
      payment_status: payment?.status || null,
      amount: payment?.amount || null,
      currency: payment?.currency || "THB",
      paid_at: payment?.paid_at || null,
      provider: payment?.provider || null,
      payment_method: payment?.payment_method || null,
    },
    200,
  );
}
