import {
  cleanInput,
  createPromptPayCharge,
  createServiceSupabase,
  getPaymentEnv,
  jsonResponse,
  mappedPaymentStatus,
  promptPayQrUri,
  validatePhone,
} from "@/app/api/payments/omise/_shared";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type CreatePaymentRequest = {
  order_code?: unknown;
  phone?: unknown;
};

type PreorderPaymentOrder = {
  id: string;
  order_code: string | null;
  phone: string | null;
  total_amount: number | null;
  status: string | null;
};

export async function POST(request: Request) {
  let payload: CreatePaymentRequest;

  try {
    payload = (await request.json()) as CreatePaymentRequest;
  } catch {
    return jsonResponse({ error: "ข้อมูลที่ส่งมาไม่ถูกต้อง" }, 400);
  }

  const orderCode = cleanInput(payload.order_code);
  const phone = cleanInput(payload.phone);

  if (!orderCode || !phone) {
    return jsonResponse(
      { error: "กรุณาระบุรหัสออเดอร์และเบอร์โทร" },
      400,
    );
  }

  if (!validatePhone(phone)) {
    return jsonResponse(
      { error: "กรุณากรอกเบอร์โทรให้ถูกต้อง 10 หลัก เช่น 0812345678" },
      400,
    );
  }

  const { env, error: envError, code, status } = getPaymentEnv();
  if (!env) {
    return jsonResponse(
      { error: envError, code: code || "PAYMENT_ENV_INVALID" },
      status || 500,
    );
  }

  const supabase = createServiceSupabase(env);
  const { data: order, error: orderError } = await supabase
    .from("preorders")
    .select("id, order_code, phone, total_amount, status")
    .eq("order_code", orderCode)
    .eq("phone", phone)
    .maybeSingle();

  if (orderError) {
    console.error("PromptPay order lookup failed", {
      supabase_code: orderError.code,
      message: orderError.message,
    });

    return jsonResponse(
      {
        error: "ไม่สามารถค้นหาออเดอร์เพื่อสร้าง QR ได้",
        code: "ORDER_LOOKUP_FAILED",
      },
      500,
    );
  }

  if (!order) {
    return jsonResponse(
      { error: "ไม่พบออเดอร์", code: "ORDER_NOT_FOUND" },
      404,
    );
  }

  const preorder = order as PreorderPaymentOrder;
  const amountBaht = Number(preorder.total_amount || 0);

  if (preorder.status === "cancelled") {
    return jsonResponse(
      { error: "ออเดอร์นี้ถูกยกเลิกแล้ว", code: "ORDER_CANCELLED" },
      409,
    );
  }

  if (!Number.isInteger(amountBaht) || amountBaht <= 0) {
    return jsonResponse(
      { error: "ยอดชำระไม่ถูกต้อง", code: "INVALID_AMOUNT" },
      400,
    );
  }

  try {
    const charge = await createPromptPayCharge({
      secretKey: env.omiseSecretKey,
      amountBaht,
      orderCode,
      preorderId: preorder.id,
    });
    const qrCodeUri = promptPayQrUri(charge);
    const paymentStatus = mappedPaymentStatus(charge);

    const { error: insertError } = await supabase
      .from("preorder_payments")
      .insert({
        preorder_id: preorder.id,
        order_code: orderCode,
        provider: "omise",
        payment_method: "promptpay",
        omise_source_id: charge.source?.id || null,
        omise_charge_id: charge.id || null,
        amount: amountBaht,
        currency: "THB",
        status: paymentStatus,
        qr_code_uri: qrCodeUri,
        expires_at: charge.expires_at || null,
        paid_at: charge.paid_at || null,
        raw_charge: charge,
      });

    if (insertError) {
      console.error("PromptPay payment record insert failed", {
        supabase_code: insertError.code,
        message: insertError.message,
      });

      return jsonResponse(
        {
          error:
            "สร้าง charge แล้ว แต่บันทึกข้อมูลการชำระเงินไม่ได้ กรุณาใช้การแนบสลิปหรือ LINE OA",
          code: "PAYMENT_RECORD_SAVE_FAILED",
        },
        500,
      );
    }

    return jsonResponse(
      {
        charge_id: charge.id || null,
        status: paymentStatus,
        amount: amountBaht,
        currency: "THB",
        qr_code_uri: qrCodeUri,
        expires_at: charge.expires_at || null,
        has_qr: Boolean(qrCodeUri),
      },
      200,
    );
  } catch {
    return jsonResponse(
      {
        error:
          "Omise ไม่สามารถสร้าง QR พร้อมเพย์ได้ กรุณาใช้การแนบสลิปหรือ LINE OA",
        code: "OMISE_CREATE_FAILED",
      },
      502,
    );
  }
}
