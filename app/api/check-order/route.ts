import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

type CheckOrderRequest = {
  order_code?: unknown;
  phone?: unknown;
};

function jsonResponse(body: unknown, status: number) {
  return Response.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store",
    },
  });
}

function cleanInput(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export async function POST(request: Request) {
  let payload: CheckOrderRequest;

  try {
    payload = (await request.json()) as CheckOrderRequest;
  } catch {
    return jsonResponse({ error: "ข้อมูลที่ส่งมาไม่ถูกต้อง" }, 400);
  }

  const orderCode = cleanInput(payload.order_code);
  const phone = cleanInput(payload.phone);

  if (!orderCode || !phone) {
    return jsonResponse(
      { error: "กรุณากรอกรหัสออเดอร์และเบอร์โทรให้ครบ" },
      400,
    );
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return jsonResponse({ error: "ระบบยังไม่พร้อมใช้งาน" }, 500);
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const { data, error } = await supabase.rpc("lookup_preorder_status", {
    p_order_code: orderCode,
    p_phone: phone,
  });

  if (error) {
    return jsonResponse(
      { error: "ไม่สามารถตรวจสอบออเดอร์ได้ กรุณาลองใหม่อีกครั้ง" },
      500,
    );
  }

  if (!data) {
    return jsonResponse(
      { error: "ไม่พบออเดอร์ กรุณาตรวจสอบรหัสออเดอร์และเบอร์โทรอีกครั้ง" },
      404,
    );
  }

  return jsonResponse(data, 200);
}
