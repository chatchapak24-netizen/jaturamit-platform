"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase-browser";
import {
  emptyToNull,
  Field,
  FormMessage,
  friendlySupabaseError,
  fromDateTimeLocal,
  inputClass,
  numberValue,
  PageHeader,
  textareaClass,
  ToggleRow,
  toDateTimeLocal,
  useRequireActiveAdmin,
} from "@/components/admin/preorder/shared";

type PreorderCampaign = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  hero_title: string | null;
  hero_subtitle: string | null;
  terms: string | null;
  payment_bank_name: string | null;
  payment_account_name: string | null;
  payment_account_number: string | null;
  payment_note: string | null;
  is_active: boolean;
  starts_at: string | null;
  ends_at: string | null;
  sort_order: number;
  updated_at: string | null;
};

type CampaignForm = {
  slug: string;
  name: string;
  description: string;
  hero_title: string;
  hero_subtitle: string;
  terms: string;
  payment_bank_name: string;
  payment_account_name: string;
  payment_account_number: string;
  payment_note: string;
  is_active: boolean;
  starts_at: string;
  ends_at: string;
  sort_order: string;
};

const emptyForm: CampaignForm = {
  slug: "",
  name: "",
  description: "",
  hero_title: "",
  hero_subtitle: "",
  terms: "",
  payment_bank_name: "",
  payment_account_name: "",
  payment_account_number: "",
  payment_note: "",
  is_active: false,
  starts_at: "",
  ends_at: "",
  sort_order: "0",
};

function campaignToForm(campaign: PreorderCampaign): CampaignForm {
  return {
    slug: campaign.slug || "",
    name: campaign.name || "",
    description: campaign.description || "",
    hero_title: campaign.hero_title || "",
    hero_subtitle: campaign.hero_subtitle || "",
    terms: campaign.terms || "",
    payment_bank_name: campaign.payment_bank_name || "",
    payment_account_name: campaign.payment_account_name || "",
    payment_account_number: campaign.payment_account_number || "",
    payment_note: campaign.payment_note || "",
    is_active: campaign.is_active,
    starts_at: toDateTimeLocal(campaign.starts_at),
    ends_at: toDateTimeLocal(campaign.ends_at),
    sort_order: String(campaign.sort_order ?? 0),
  };
}

export default function AdminPreorderCampaignsPage() {
  const router = useRouter();
  const checkAdmin = useRequireActiveAdmin(router);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [campaigns, setCampaigns] = useState<PreorderCampaign[]>([]);
  const [editingId, setEditingId] = useState("");
  const [form, setForm] = useState<CampaignForm>(emptyForm);
  const [message, setMessage] = useState("");
  const [errorText, setErrorText] = useState("");

  const isEditing = Boolean(editingId);
  const activeCampaignCount = useMemo(
    () =>
      campaigns.filter((campaign) =>
        editingId ? campaign.is_active && campaign.id !== editingId : campaign.is_active,
      ).length,
    [campaigns, editingId],
  );
  const activeWarning =
    form.is_active && activeCampaignCount > 0
      ? "มีแคมเปญที่เปิดใช้งานอยู่แล้ว ระบบยังอนุญาตให้บันทึกได้ แต่ควรตรวจสอบก่อนใช้กับหน้า public"
      : "";

  async function loadCampaigns() {
    const { data, error } = await supabaseBrowser
      .from("preorder_campaigns")
      .select(
        "id, slug, name, description, hero_title, hero_subtitle, terms, payment_bank_name, payment_account_name, payment_account_number, payment_note, is_active, starts_at, ends_at, sort_order, updated_at",
      )
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false });

    if (error) {
      setErrorText(friendlySupabaseError(error.message));
      return;
    }

    setCampaigns((data || []) as PreorderCampaign[]);
  }

  useEffect(() => {
    async function init() {
      setLoading(true);
      const isAdmin = await checkAdmin();
      if (!isAdmin) return;

      await loadCampaigns();
      setLoading(false);
    }

    init();
  }, [checkAdmin]);

  function resetForm() {
    setEditingId("");
    setForm(emptyForm);
  }

  function startEdit(campaign: PreorderCampaign) {
    setMessage("");
    setErrorText("");
    setEditingId(campaign.id);
    setForm(campaignToForm(campaign));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function validateForm() {
    if (!form.slug.trim()) {
      setErrorText("กรุณากรอก slug สำหรับอ้างอิงแคมเปญ");
      return false;
    }

    if (!form.name.trim()) {
      setErrorText("กรุณากรอกชื่อแคมเปญ");
      return false;
    }

    return true;
  }

  async function saveCampaign(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setErrorText("");

    if (!validateForm()) return;

    setSaving(true);

    const payload = {
      slug: form.slug.trim(),
      name: form.name.trim(),
      description: emptyToNull(form.description),
      hero_title: emptyToNull(form.hero_title),
      hero_subtitle: emptyToNull(form.hero_subtitle),
      terms: emptyToNull(form.terms),
      payment_bank_name: emptyToNull(form.payment_bank_name),
      payment_account_name: emptyToNull(form.payment_account_name),
      payment_account_number: emptyToNull(form.payment_account_number),
      payment_note: emptyToNull(form.payment_note),
      is_active: form.is_active,
      starts_at: fromDateTimeLocal(form.starts_at),
      ends_at: fromDateTimeLocal(form.ends_at),
      sort_order: numberValue(form.sort_order),
    };

    const request = isEditing
      ? supabaseBrowser.from("preorder_campaigns").update(payload).eq("id", editingId)
      : supabaseBrowser.from("preorder_campaigns").insert(payload);
    const { error } = await request;

    if (error) {
      setErrorText(friendlySupabaseError(error.message));
      setSaving(false);
      return;
    }

    await loadCampaigns();
    resetForm();
    setMessage(isEditing ? "แก้ไขแคมเปญเรียบร้อยแล้ว" : "เพิ่มแคมเปญใหม่เรียบร้อยแล้ว");
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
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <PageHeader
        eyebrow="Admin / Preorder Campaigns"
        title="จัดการแคมเปญพรีออเดอร์"
        description="เพิ่มและแก้ไขรอบพรีออเดอร์ ข้อความหน้า hero เงื่อนไข และข้อมูลบัญชีรับชำระเงิน"
      />

      <FormMessage message={message} tone="success" />
      <FormMessage message={errorText} tone="error" />
      <FormMessage message={activeWarning} tone="warning" />

      <section className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <form
          onSubmit={saveCampaign}
          className="rounded-3xl border border-white/10 bg-zinc-900 p-5 sm:p-6"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-2xl font-black">
                {isEditing ? "แก้ไขแคมเปญ" : "เพิ่มแคมเปญใหม่"}
              </h2>
              <p className="mt-2 text-sm text-zinc-400">
                slug ใช้เป็นรหัสอ้างอิง เช่น jaturamit-ratchaburi-2026
              </p>
            </div>
            {isEditing ? (
              <button
                type="button"
                onClick={resetForm}
                className="rounded-xl border border-white/10 px-3 py-2 text-sm font-bold text-zinc-300 hover:bg-white/10"
              >
                ยกเลิก
              </button>
            ) : null}
          </div>

          <div className="mt-6 grid gap-4">
            <Field label="Slug">
              <input
                className={inputClass}
                value={form.slug}
                onChange={(event) => setForm({ ...form, slug: event.target.value })}
                placeholder="jaturamit-ratchaburi-2026"
              />
            </Field>
            <Field label="ชื่อแคมเปญ">
              <input
                className={inputClass}
                value={form.name}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
              />
            </Field>
            <Field label="คำอธิบาย">
              <textarea
                className={textareaClass}
                value={form.description}
                onChange={(event) => setForm({ ...form, description: event.target.value })}
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="หัวข้อ Hero">
                <input
                  className={inputClass}
                  value={form.hero_title}
                  onChange={(event) => setForm({ ...form, hero_title: event.target.value })}
                />
              </Field>
              <Field label="คำโปรย Hero">
                <input
                  className={inputClass}
                  value={form.hero_subtitle}
                  onChange={(event) =>
                    setForm({ ...form, hero_subtitle: event.target.value })
                  }
                />
              </Field>
            </div>
            <Field label="เงื่อนไข">
              <textarea
                className={textareaClass}
                value={form.terms}
                onChange={(event) => setForm({ ...form, terms: event.target.value })}
              />
            </Field>
          </div>

          <div className="mt-6 rounded-2xl border border-white/10 bg-zinc-950 p-4">
            <h3 className="font-black text-white">ข้อมูลการชำระเงิน</h3>
            <div className="mt-4 grid gap-4">
              <Field label="ธนาคาร">
                <input
                  className={inputClass}
                  value={form.payment_bank_name}
                  onChange={(event) =>
                    setForm({ ...form, payment_bank_name: event.target.value })
                  }
                />
              </Field>
              <Field label="ชื่อบัญชี">
                <input
                  className={inputClass}
                  value={form.payment_account_name}
                  onChange={(event) =>
                    setForm({ ...form, payment_account_name: event.target.value })
                  }
                />
              </Field>
              <Field
                label="เลขบัญชี"
                hint="เก็บเป็นข้อความ เพื่อไม่ให้เลขนำหน้าหาย"
              >
                <input
                  className={inputClass}
                  value={form.payment_account_number}
                  onChange={(event) =>
                    setForm({ ...form, payment_account_number: event.target.value })
                  }
                />
              </Field>
              <Field label="หมายเหตุการชำระเงิน">
                <textarea
                  className={textareaClass}
                  value={form.payment_note}
                  onChange={(event) =>
                    setForm({ ...form, payment_note: event.target.value })
                  }
                />
              </Field>
            </div>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <Field label="เริ่มเปิดรอบ">
              <input
                type="datetime-local"
                className={inputClass}
                value={form.starts_at}
                onChange={(event) => setForm({ ...form, starts_at: event.target.value })}
              />
            </Field>
            <Field label="ปิดรอบ">
              <input
                type="datetime-local"
                className={inputClass}
                value={form.ends_at}
                onChange={(event) => setForm({ ...form, ends_at: event.target.value })}
              />
            </Field>
            <Field label="ลำดับการแสดง">
              <input
                type="number"
                className={inputClass}
                value={form.sort_order}
                onChange={(event) => setForm({ ...form, sort_order: event.target.value })}
              />
            </Field>
          </div>

          <div className="mt-5">
            <ToggleRow
              title="เปิดใช้งานแคมเปญ"
              description="แคมเปญที่ active จะพร้อมให้ระบบ public อ่านใน milestone ถัดไป"
              checked={form.is_active}
              onChange={(checked) => setForm({ ...form, is_active: checked })}
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="mt-6 rounded-2xl bg-red-600 px-6 py-3 font-black text-white hover:bg-red-500 disabled:opacity-60"
          >
            {saving ? "กำลังบันทึก..." : "บันทึกแคมเปญ"}
          </button>
        </form>

        <section className="rounded-3xl border border-white/10 bg-zinc-900 p-5 sm:p-6">
          <h2 className="text-2xl font-black">รายการแคมเปญ</h2>
          <div className="mt-5 grid gap-3">
            {campaigns.map((campaign) => (
              <button
                type="button"
                key={campaign.id}
                onClick={() => startEdit(campaign)}
                className="rounded-2xl border border-white/10 bg-zinc-950 p-4 text-left hover:border-red-300/50"
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-lg font-black text-white">{campaign.name}</p>
                    <p className="mt-1 text-sm text-zinc-400">{campaign.slug}</p>
                  </div>
                  <span
                    className={`w-fit rounded-full border px-3 py-1 text-xs font-bold ${
                      campaign.is_active
                        ? "border-emerald-400/40 bg-emerald-500/10 text-emerald-100"
                        : "border-zinc-500/40 bg-zinc-700/20 text-zinc-300"
                    }`}
                  >
                    {campaign.is_active ? "เปิดใช้งาน" : "ปิดอยู่"}
                  </span>
                </div>
                <p className="mt-3 line-clamp-2 text-sm text-zinc-400">
                  {campaign.hero_title || campaign.description || "ยังไม่มีรายละเอียด"}
                </p>
              </button>
            ))}

            {campaigns.length === 0 ? (
              <p className="rounded-2xl border border-white/10 bg-zinc-950 p-5 text-zinc-400">
                ยังไม่มีแคมเปญพรีออเดอร์
              </p>
            ) : null}
          </div>
        </section>
      </section>
    </main>
  );
}
