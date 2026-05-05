"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase-browser";
import {
  DEFAULT_PREORDER_CONFIG,
  normalizePreorderConfig,
  type PreorderConfig,
} from "@/lib/preorder-config";

type SettingRow = {
  key: string;
  value: string | null;
};

export default function AdminPreorderPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState<PreorderConfig>(
    DEFAULT_PREORDER_CONFIG,
  );
  const [message, setMessage] = useState("");
  const [errorText, setErrorText] = useState("");

  const checkAdmin = useCallback(async () => {
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
  }, [router]);

  async function loadSettings() {
    const { data, error } = await supabaseBrowser
      .from("site_settings")
      .select("key, value")
      .in("key", ["preorder_config", "preorder_custom_fields_enabled"]);

    if (error) {
      setErrorText(error.message);
      return;
    }

    const rows = (data || []) as SettingRow[];
    const preorderConfig = rows.find((item) => item.key === "preorder_config");
    const legacyCustomFields = rows.find(
      (item) => item.key === "preorder_custom_fields_enabled",
    );

    setConfig(
      normalizePreorderConfig(
        preorderConfig?.value,
        legacyCustomFields?.value !== "false",
      ),
    );
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
  }, [checkAdmin]);

  function updateRequiredField(
    key: keyof PreorderConfig["requiredFields"],
    value: boolean,
  ) {
    setConfig((currentConfig) => ({
      ...currentConfig,
      requiredFields: {
        ...currentConfig.requiredFields,
        [key]: value,
      },
    }));
  }

  async function saveSettings() {
    setMessage("");
    setErrorText("");

    const safeConfig = normalizePreorderConfig(config);

    setSaving(true);

    const { error } = await supabaseBrowser.from("site_settings").upsert([
      {
        key: "preorder_config",
        value: JSON.stringify(safeConfig),
        updated_at: new Date().toISOString(),
      },
      {
        key: "preorder_custom_fields_enabled",
        value: safeConfig.customFieldsEnabled ? "true" : "false",
        updated_at: new Date().toISOString(),
      },
    ]);

    if (error) {
      setErrorText(error.message);
      setSaving(false);
      return;
    }

    setConfig(safeConfig);
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
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="mb-8">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-red-300">
          Admin / Preorder
        </p>
        <h1 className="mt-2 text-3xl font-black sm:text-4xl">
          ตั้งค่าพรีออเดอร์
        </h1>
        <p className="mt-3 max-w-2xl text-zinc-400">
          กำหนดรูปสินค้า ราคา และฟิลด์ที่ต้องกรอกในฟอร์มสั่งซื้อเสื้อจตุรมิตรราชบุรี ครั้งที่ 2
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

      <section className="grid gap-6 lg:grid-cols-[1fr_0.9fr]">
        <div className="rounded-3xl border border-white/10 bg-zinc-900 p-5 sm:p-6">
          <h2 className="text-2xl font-black">สินค้า</h2>

          <div className="mt-6 grid gap-5">
            <label className="block">
              <span className="text-sm font-bold text-zinc-200">
                ราคาต่อเสื้อหนึ่งตัว
              </span>
              <input
                type="number"
                min={1}
                value={config.unitPrice}
                onChange={(event) =>
                  setConfig({
                    ...config,
                    unitPrice: Number(event.target.value) || 1,
                  })
                }
                className="mt-2 w-full rounded-xl border border-white/10 bg-zinc-950 px-4 py-3 text-white outline-none focus:border-red-300"
              />
            </label>

            <label className="block">
              <span className="text-sm font-bold text-zinc-200">
                ลิงก์รูปสินค้า
              </span>
              <input
                value={config.productImageUrl}
                onChange={(event) =>
                  setConfig({
                    ...config,
                    productImageUrl: event.target.value,
                  })
                }
                placeholder="https://..."
                className="mt-2 w-full rounded-xl border border-white/10 bg-zinc-950 px-4 py-3 text-white outline-none focus:border-red-300"
              />
              <span className="mt-2 block text-xs text-zinc-500">
                ใช้ URL รูปที่เปิด public ได้ เช่น รูปจาก Supabase Storage หรือ CDN
              </span>
            </label>

            <ToggleRow
              title="เปิดช่องชื่อบนเสื้อและเบอร์เสื้อ"
              description="ถ้าปิด ลูกค้าจะไม่เห็นและไม่ต้องกรอกสองช่องนี้"
              checked={config.customFieldsEnabled}
              onChange={(checked) =>
                setConfig({
                  ...config,
                  customFieldsEnabled: checked,
                  requiredFields: {
                    ...config.requiredFields,
                    shirtName: checked
                      ? config.requiredFields.shirtName
                      : false,
                    shirtNumber: checked
                      ? config.requiredFields.shirtNumber
                      : false,
                  },
                })
              }
            />
          </div>
        </div>

        <div className="overflow-hidden rounded-3xl border border-white/10 bg-zinc-900">
          <div
            className="aspect-[4/3] bg-gradient-to-br from-red-600 via-zinc-900 to-amber-500"
            style={
              config.productImageUrl
                ? {
                    backgroundImage: `linear-gradient(rgba(9,9,11,0.2), rgba(9,9,11,0.7)), url("${config.productImageUrl}")`,
                    backgroundPosition: "center",
                    backgroundSize: "cover",
                  }
                : undefined
            }
          />
          <div className="p-5">
            <p className="text-sm font-bold text-zinc-400">ตัวอย่างหน้าเว็บ</p>
            <p className="mt-2 text-3xl font-black">{config.unitPrice} บาท</p>
            <p className="mt-2 text-sm text-zinc-300">
              {config.customFieldsEnabled
                ? "เปิดให้กรอกชื่อบนเสื้อและเบอร์เสื้อ"
                : "ปิดช่องชื่อบนเสื้อและเบอร์เสื้อ"}
            </p>
          </div>
        </div>
      </section>

      <section className="mt-6 rounded-3xl border border-white/10 bg-zinc-900 p-5 sm:p-6">
        <h2 className="text-2xl font-black">ฟิลด์ที่ต้องกรอก</h2>
        <p className="mt-2 text-sm text-zinc-400">
          ชื่อ เบอร์โทร ทีม ไซส์ จำนวน และวิธีรับสินค้าเป็นฟิลด์หลักของระบบและยังบังคับกรอกเสมอ
        </p>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <ToggleRow
            title="ชื่อบนเสื้อเป็นข้อมูลจำเป็น"
            description="มีผลเฉพาะตอนเปิดช่องชื่อ/เบอร์เสื้อ"
            checked={config.requiredFields.shirtName}
            disabled={!config.customFieldsEnabled}
            onChange={(checked) => updateRequiredField("shirtName", checked)}
          />
          <ToggleRow
            title="เบอร์เสื้อเป็นข้อมูลจำเป็น"
            description="มีผลเฉพาะตอนเปิดช่องชื่อ/เบอร์เสื้อ"
            checked={config.requiredFields.shirtNumber}
            disabled={!config.customFieldsEnabled}
            onChange={(checked) => updateRequiredField("shirtNumber", checked)}
          />
          <ToggleRow
            title="ที่อยู่จัดส่งเป็นข้อมูลจำเป็น"
            description="บังคับเฉพาะเมื่อลูกค้าเลือกจัดส่ง"
            checked={config.requiredFields.shippingAddress}
            onChange={(checked) =>
              updateRequiredField("shippingAddress", checked)
            }
          />
          <ToggleRow
            title="หมายเหตุเป็นข้อมูลจำเป็น"
            description="ปกติแนะนำให้เปิดเป็นไม่บังคับ"
            checked={config.requiredFields.note}
            onChange={(checked) => updateRequiredField("note", checked)}
          />
          <ToggleRow
            title="หมายเหตุการชำระเงินเป็นข้อมูลจำเป็น"
            description="ใช้เมื่ออยากให้ลูกค้ากรอกข้อมูลโอนเงินหรือหลักฐานเพิ่มเติม"
            checked={config.requiredFields.paymentNote}
            onChange={(checked) => updateRequiredField("paymentNote", checked)}
          />
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

function ToggleRow({
  title,
  description,
  checked,
  disabled,
  onChange,
}: {
  title: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label
      className={`flex items-start gap-3 rounded-2xl border border-white/10 bg-zinc-950 p-4 ${
        disabled ? "opacity-50" : ""
      }`}
    >
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-1 h-5 w-5 accent-red-600"
      />
      <span>
        <span className="block font-bold text-white">{title}</span>
        <span className="mt-1 block text-sm text-zinc-400">{description}</span>
      </span>
    </label>
  );
}
