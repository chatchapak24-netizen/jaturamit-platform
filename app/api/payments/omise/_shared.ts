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
  supabaseUrl: string;
  supabaseServiceRoleKey: string;
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

export function getPaymentEnv(): { env: PaymentEnv | null; error: string | null } {
  const omiseSecretKey = process.env.OMISE_SECRET_KEY;
  const omiseMode = process.env.OMISE_MODE;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!omiseSecretKey || !supabaseUrl || !supabaseServiceRoleKey) {
    return { env: null, error: "payment environment is not configured" };
  }

  if (omiseMode !== "test" || omiseSecretKey.startsWith("skey_live_")) {
    return { env: null, error: "promptpay payment is limited to test mode" };
  }

  return {
    env: {
      omiseSecretKey,
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
  return (
    charge.source?.scannable_code?.image?.download_uri ||
    charge.source?.scannable_code?.image?.uri ||
    null
  );
}

export function mappedPaymentStatus(charge: OmiseCharge) {
  if (charge.status === "successful") return "successful";
  if (charge.status === "failed") return "failed";
  if (charge.status === "expired") return "expired";
  if (charge.status === "reversed") return "cancelled";
  return "pending";
}

export function isVerifiedTestCharge(charge: OmiseCharge) {
  return charge.livemode === false && charge.currency === "THB";
}
