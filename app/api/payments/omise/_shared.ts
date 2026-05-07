import { createClient } from "@supabase/supabase-js";

export type JsonRecord = Record<string, unknown>;

export type OmiseCharge = JsonRecord & {
  id?: string;
  amount?: number;
  currency?: string;
  status?: string;
  livemode?: boolean;
  expires_at?: string | null;
  paid_at?: string | null;
  source?: {
    id?: string;
    scannable_code?: {
      image?: {
        download_uri?: string;
        uri?: string;
      };
    };
  };
};

export type PaymentEnv = {
  omiseSecretKey: string;
  omiseMode: "test" | "live";
  supabaseUrl: string;
  supabaseServiceRoleKey: string;
};

type PaymentEnvResult = {
  env: PaymentEnv | null;
  error: string | null;
  code?: string;
  status?: number;
};

const OMISE_API_BASE = "https://api.omise.co";

export function jsonResponse(body: unknown, status: number) {
  return Response.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store",
    },
  });
}

export function cleanInput(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export function validatePhone(phone: string) {
  return /^0\d{9}$/.test(phone);
}

export function getPaymentEnv(): PaymentEnvResult {
  const omiseSecretKey = process.env.OMISE_SECRET_KEY;
  const omiseMode = process.env.OMISE_MODE;
  const paymentsEnabled = process.env.OMISE_PAYMENTS_ENABLED !== "false";
  const livePaymentsAllowed = process.env.OMISE_ALLOW_LIVE_PAYMENTS === "true";
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!paymentsEnabled) {
    return {
      env: null,
      error: "PromptPay ยังไม่เปิดใช้งาน กรุณาใช้การแนบสลิปหรือ LINE OA",
      code: "PAYMENT_DISABLED",
      status: 503,
    };
  }

  if (!omiseSecretKey || !supabaseUrl || !supabaseServiceRoleKey) {
    return {
      env: null,
      error:
        "ระบบยังไม่ได้ตั้งค่า ENV สำหรับ PromptPay ให้ครบ กรุณาตรวจ OMISE_SECRET_KEY, OMISE_MODE และ SUPABASE_SERVICE_ROLE_KEY",
      code: "PAYMENT_ENV_MISSING",
      status: 500,
    };
  }

  if (omiseMode !== "test" && omiseMode !== "live") {
    return {
      env: null,
      error: "PromptPay ตั้งค่า OMISE_MODE ไม่ถูกต้อง",
      code: "PAYMENT_MODE_INVALID",
      status: 500,
    };
  }

  if (omiseMode === "test" && omiseSecretKey.startsWith("skey_live_")) {
    return {
      env: null,
      error: "PromptPay test mode ห้ามใช้ live secret key",
      code: "PAYMENT_KEY_MODE_MISMATCH",
      status: 500,
    };
  }

  if (omiseMode === "live" && !livePaymentsAllowed) {
    return {
      env: null,
      error:
        "PromptPay live mode ยังไม่เปิดใช้งาน กรุณาตั้ง OMISE_ALLOW_LIVE_PAYMENTS=true หลังผ่าน checklist",
      code: "LIVE_PAYMENTS_LOCKED",
      status: 503,
    };
  }

  if (omiseMode === "live" && !omiseSecretKey.startsWith("skey_live_")) {
    return {
      env: null,
      error: "PromptPay live mode ต้องใช้ live secret key",
      code: "PAYMENT_KEY_MODE_MISMATCH",
      status: 500,
    };
  }

  return {
    env: {
      omiseSecretKey,
      omiseMode,
      supabaseUrl,
      supabaseServiceRoleKey,
    },
    error: null,
  };
}

export function createServiceSupabase(env: PaymentEnv) {
  return createClient(env.supabaseUrl, env.supabaseServiceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

function omiseAuthHeader(secretKey: string) {
  return `Basic ${Buffer.from(`${secretKey}:`).toString("base64")}`;
}

async function omiseRequest<T>(
  secretKey: string,
  path: string,
  init?: RequestInit,
) {
  const response = await fetch(`${OMISE_API_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: omiseAuthHeader(secretKey),
      ...(init?.headers || {}),
    },
  });
  const data = (await response.json().catch(() => ({}))) as T & {
    message?: string;
  };

  if (!response.ok) {
    throw new Error(data.message || "omise request failed");
  }

  return data as T;
}

export async function createPromptPayCharge({
  secretKey,
  amountBaht,
  orderCode,
  preorderId,
}: {
  secretKey: string;
  amountBaht: number;
  orderCode: string;
  preorderId: string;
}) {
  const body = new URLSearchParams();
  body.set("amount", String(amountBaht * 100));
  body.set("currency", "THB");
  body.set("source[type]", "promptpay");
  body.set("metadata[order_code]", orderCode);
  body.set("metadata[preorder_id]", preorderId);

  return omiseRequest<OmiseCharge>(secretKey, "/charges", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });
}

export async function retrieveCharge(secretKey: string, chargeId: string) {
  return omiseRequest<OmiseCharge>(
    secretKey,
    `/charges/${encodeURIComponent(chargeId)}`,
  );
}

export function promptPayQrUri(charge: OmiseCharge) {
  const directUri =
    charge.source?.scannable_code?.image?.download_uri ||
    charge.source?.scannable_code?.image?.uri ||
    null;

  if (directUri) {
    return directUri;
  }

  return findQrImageUri(charge);
}

function findQrImageUri(value: unknown): string | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const result = findQrImageUri(item);
      if (result) return result;
    }

    return null;
  }

  const record = value as Record<string, unknown>;
  const downloadUri = record.download_uri;
  const uri = record.uri;

  if (typeof downloadUri === "string" && downloadUri.startsWith("http")) {
    return downloadUri;
  }

  if (typeof uri === "string" && uri.startsWith("http")) {
    return uri;
  }

  for (const nestedValue of Object.values(record)) {
    const result = findQrImageUri(nestedValue);
    if (result) return result;
  }

  return null;
}

export function mappedPaymentStatus(charge: OmiseCharge) {
  if (charge.status === "successful") return "successful";
  if (charge.status === "failed") return "failed";
  if (charge.status === "expired") return "expired";
  if (charge.status === "reversed") return "cancelled";
  return "pending";
}

export function isVerifiedChargeForMode(
  charge: OmiseCharge,
  omiseMode: PaymentEnv["omiseMode"],
) {
  return (
    charge.livemode === (omiseMode === "live") && charge.currency === "THB"
  );
}
