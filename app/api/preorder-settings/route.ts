import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return Response.json(
      { customFieldsEnabled: true },
      { headers: { "Cache-Control": "no-store" } },
    );
  }

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const { data, error } = await supabase
    .from("site_settings")
    .select("value")
    .eq("key", "preorder_custom_fields_enabled")
    .maybeSingle();

  if (error) {
    return Response.json(
      { customFieldsEnabled: true },
      { headers: { "Cache-Control": "no-store" } },
    );
  }

  return Response.json(
    { customFieldsEnabled: data?.value !== "false" },
    { headers: { "Cache-Control": "no-store" } },
  );
}
