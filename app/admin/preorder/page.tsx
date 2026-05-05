"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase-browser";

export default function AdminPreorderPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [customFieldsEnabled, setCustomFieldsEnabled] = useState(true);
  const [message, setMessage] = useState("");
  const [errorText, setErrorText] = useState("");

  async function checkAdmin() {
    const { data: userData } = await supabaseBrowser.auth.getUser();

    if (!userData.user) {
      router.push("/admin/login");
      return false;
    }

    const { data: adminProfile } = await supabaseBrowser
      .from("admin_users")
      .select("id")
      .eq("auth_user_id", userData.user.id)
      .eq("status", "active")
      .single();

    if (!adminProfile) {
      await supabaseBrowser.auth.signOut();
      router.push("/admin/login");
      return false;
    }

    return true;
  }

  async function loadSettings() {
    const { data, error } = await supabaseBrowser
      .from("site_settings")
      .select("key, value")
      .eq("key", "preorder_custom_fields_enabled")
      .maybeSingle();

    if (error) {
      setErrorText(error.message);
      return;
    }

    setCustomFieldsEnabled(data?.value !== "false");
  }

  useEffect(() => {
    async function init() {
      setLoading(true);

      const isAdmin = await checkAdmin();
      if (!isAdmin) return;

      await loadSettings();
      setLoading(false);
    }

    init();
  }, []);

  async function saveSettings() {
    setMessage("");
    setErrorText("");
    setSaving(true);

    const { error } = await supabaseBrowser.from("site_settings").upsert({
      key: "preorder_custom_fields_enabled",
      value: customFieldsEnabled ? "true" : "false",
      updated_at: new Date().toISOString(),
    });

    if (error) {
      setErrorText(error.message);
      setSaving(false);
      return;
    }

    setMessage("บันทึกการตั้งค่าพรีออเดอร์เรียบร้อยแล้ว");
    setSaving(false);
  }

  if (loading) {
    return (
      <main className="mx-auto max-w-6xl px-6 py-10">
        <p className="text-zinc-400">กำลังโหลดข้อมูล...</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <div className="mb-8">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-red-300">
          Admin / Preorder
        </p>
        <h1 className="mt-2 text-4xl font-black">ตั้งค่าพรีออเดอร์</h1>
        <p className="mt-3 max-w-2xl text-zinc-400">
          ควบคุมตัวเลือกของฟอร์มสั่งซื้อเสื้อจตุรมิตรราชบุรี ครั้งที่ 2
        </p>
      </div>

      {message && (
        <div className="mb-6 rounded-2xl border border-green-500/40 bg-green-950/40 p-4 text-green-200">
          {message}
        </div>
      )}

      {errorText && (
        <div className="mb-6 rounded-2xl border border-red-500/40 bg-red-950/40 p-4 text-red-200">
          {errorText}
        </div>
      )}

      <section className="rounded-3xl border border-white/10 bg-zinc-900 p-6">
        <h2 className="text-2xl font-black">ฟอร์มสั่งซื้อ</h2>

        <div className="mt-6 rounded-2xl border border-white/10 bg-zinc-950 p-4">
          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              checked={customFieldsEnabled}
              onChange={(event) => setCustomFieldsEnabled(event.target.checked)}
              className="mt-1 h-5 w-5 accent-red-600"
            />
            <span>
              <span className="block font-bold text-white">
                เปิดช่องชื่อบนเสื้อและเบอร์เสื้อ
              </span>
              <span className="mt-1 block text-sm text-zinc-400">
                ถ้าปิด ผู้สั่งซื้อจะไม่ต้องกรอกชื่อบนเสื้อและเบอร์เสื้อ
              </span>
            </span>
          </label>
        </div>

        <button
          onClick={saveSettings}
          disabled={saving}
          className="mt-6 rounded-2xl bg-red-600 px-6 py-3 font-black text-white hover:bg-red-500 disabled:opacity-50"
        >
          {saving ? "กำลังบันทึก..." : "บันทึกการตั้งค่า"}
        </button>
      </section>
    </main>
  );
}
