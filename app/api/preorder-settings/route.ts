import { createClient } from "@supabase/supabase-js";
import {
  DEFAULT_PREORDER_CONFIG,
  normalizePreorderConfig,
} from "@/lib/preorder-config";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return Response.json(
      DEFAULT_PREORDER_CONFIG,
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
    .select("key, value")
    .in("key", ["preorder_config", "preorder_custom_fields_enabled"]);

  if (error) {
    return Response.json(
      DEFAULT_PREORDER_CONFIG,
      { headers: { "Cache-Control": "no-store" } },
    );
  }

  const preorderConfig = data?.find((item) => item.key === "preorder_config");
  const legacyCustomFields = data?.find(
    (item) => item.key === "preorder_custom_fields_enabled",
  );
  const config = normalizePreorderConfig(
    preorderConfig?.value,
    legacyCustomFields?.value !== "false",
  );

  return Response.json(
    config,
    { headers: { "Cache-Control": "no-store" } },
  );
}
