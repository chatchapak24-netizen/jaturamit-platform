import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

type CheckOrderRequest = {
  order_code?: unknown;
  phone?: unknown;
};

const SAFE_ORDER_FIELDS =
  "order_code, team, size, shirt_name, shirt_number, quantity, delivery_method, status, created_at, updated_at";

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
    return jsonResponse({ error: "กรุณากรอกเลขออเดอร์และเบอร์โทร" }, 400);
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return jsonResponse({ error: "ระบบยังไม่พร้อมใช้งาน" }, 500);
  }

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const { data, error } = await supabase
    .from("preorders")
    .select(SAFE_ORDER_FIELDS)
    .eq("order_code", orderCode)
    .eq("phone", phone)
    .maybeSingle();

  if (error) {
    return jsonResponse({ error: "ไม่สามารถตรวจสอบออเดอร์ได้" }, 500);
  }

  if (!data) {
    return jsonResponse({ error: "ไม่พบออเดอร์ตามข้อมูลที่กรอก" }, 404);
  }

  return jsonResponse({ order: data }, 200);
}
