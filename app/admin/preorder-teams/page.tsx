"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase-browser";
import {
  emptyToNull,
  Field,
  FormMessage,
  friendlySupabaseError,
  inputClass,
  numberValue,
  PageHeader,
  PreviewImage,
  ToggleRow,
  useRequireActiveAdmin,
} from "@/components/admin/preorder/shared";

type PreorderTeam = {
  id: string;
  slug: string;
  name: string;
  short_name: string | null;
  colors: string | null;
  logo_url: string | null;
  is_active: boolean;
  sort_order: number;
};

type TeamForm = {
  slug: string;
  name: string;
  short_name: string;
  colors: string;
  logo_url: string;
  is_active: boolean;
  sort_order: string;
};

const emptyForm: TeamForm = {
  slug: "",
  name: "",
  short_name: "",
  colors: "",
  logo_url: "",
  is_active: true,
  sort_order: "0",
};

function teamToForm(team: PreorderTeam): TeamForm {
  return {
    slug: team.slug || "",
    name: team.name || "",
    short_name: team.short_name || "",
    colors: team.colors || "",
    logo_url: team.logo_url || "",
    is_active: team.is_active,
    sort_order: String(team.sort_order ?? 0),
  };
}

export default function AdminPreorderTeamsPage() {
  const router = useRouter();
  const checkAdmin = useRequireActiveAdmin(router);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [teams, setTeams] = useState<PreorderTeam[]>([]);
  const [editingId, setEditingId] = useState("");
  const [form, setForm] = useState<TeamForm>(emptyForm);
  const [message, setMessage] = useState("");
  const [errorText, setErrorText] = useState("");

  const isEditing = Boolean(editingId);

  async function loadTeams() {
    const { data, error } = await supabaseBrowser
      .from("preorder_teams")
      .select("id, slug, name, short_name, colors, logo_url, is_active, sort_order")
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true });

    if (error) {
      setErrorText(friendlySupabaseError(error.message));
      return;
    }

    setTeams((data || []) as PreorderTeam[]);
  }

  useEffect(() => {
    async function init() {
      setLoading(true);
      const isAdmin = await checkAdmin();
      if (!isAdmin) return;

      await loadTeams();
      setLoading(false);
    }

    init();
  }, [checkAdmin]);

  function resetForm() {
    setEditingId("");
    setForm(emptyForm);
  }

  function startEdit(team: PreorderTeam) {
    setMessage("");
    setErrorText("");
    setEditingId(team.id);
    setForm(teamToForm(team));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function validateForm() {
    if (!form.slug.trim()) {
      setErrorText("กรุณากรอก slug ของทีม");
      return false;
    }

    if (!form.name.trim()) {
      setErrorText("กรุณากรอกชื่อทีม");
      return false;
    }

    return true;
  }

  async function saveTeam(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setErrorText("");

    if (!validateForm()) return;

    setSaving(true);

    const payload = {
      slug: form.slug.trim(),
      name: form.name.trim(),
      short_name: emptyToNull(form.short_name),
      colors: emptyToNull(form.colors),
      logo_url: emptyToNull(form.logo_url),
      is_active: form.is_active,
      sort_order: numberValue(form.sort_order),
    };
    const request = isEditing
      ? supabaseBrowser.from("preorder_teams").update(payload).eq("id", editingId)
      : supabaseBrowser.from("preorder_teams").insert(payload);
    const { error } = await request;

    if (error) {
      setErrorText(friendlySupabaseError(error.message));
      setSaving(false);
      return;
    }

    await loadTeams();
    resetForm();
    setMessage(isEditing ? "แก้ไขทีมพรีออเดอร์เรียบร้อยแล้ว" : "เพิ่มทีมใหม่เรียบร้อยแล้ว");
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
        eyebrow="Admin / Preorder Teams"
        title="จัดการทีมพรีออเดอร์"
        description="จัดการข้อมูลโรงเรียน สี โลโก้ และสถานะทีมสำหรับระบบพรีออเดอร์สินค้า"
      />

      <FormMessage message={message} tone="success" />
      <FormMessage message={errorText} tone="error" />

      <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <form
          onSubmit={saveTeam}
          className="rounded-3xl border border-white/10 bg-zinc-900 p-5 sm:p-6"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-2xl font-black">
                {isEditing ? "แก้ไขทีม" : "เพิ่มทีมใหม่"}
              </h2>
              <p className="mt-2 text-sm text-zinc-400">
                slug ต้องไม่ซ้ำ เช่น photha หรือ daruna
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
                placeholder="photha"
              />
            </Field>
            <Field label="ชื่อทีม / โรงเรียน">
              <input
                className={inputClass}
                value={form.name}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
              />
            </Field>
            <Field label="ชื่อย่อ">
              <input
                className={inputClass}
                value={form.short_name}
                onChange={(event) => setForm({ ...form, short_name: event.target.value })}
              />
            </Field>
            <Field label="สีประจำทีม">
              <input
                className={inputClass}
                value={form.colors}
                onChange={(event) => setForm({ ...form, colors: event.target.value })}
                placeholder="เหลือง-น้ำเงิน"
              />
            </Field>
            <Field label="Logo URL" hint="ไม่บังคับ ถ้ามี URL จะมี preview ด้านขวา">
              <input
                className={inputClass}
                value={form.logo_url}
                onChange={(event) => setForm({ ...form, logo_url: event.target.value })}
                placeholder="https://..."
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
            <ToggleRow
              title="เปิดใช้งานทีม"
              description="ปิดทีมแทนการลบ เพื่อไม่กระทบสินค้าหรือออเดอร์ในอนาคต"
              checked={form.is_active}
              onChange={(checked) => setForm({ ...form, is_active: checked })}
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="mt-6 rounded-2xl bg-red-600 px-6 py-3 font-black text-white hover:bg-red-500 disabled:opacity-60"
          >
            {saving ? "กำลังบันทึก..." : "บันทึกทีม"}
          </button>
        </form>

        <section className="grid gap-5">
          <article className="rounded-3xl border border-white/10 bg-zinc-900 p-5 sm:p-6">
            <h2 className="text-2xl font-black">Preview ทีม</h2>
            <div className="mt-5 grid gap-4 sm:grid-cols-[180px_1fr] sm:items-center">
              <PreviewImage imageUrl={form.logo_url || null} label="Team logo preview" className="aspect-square" />
              <div>
                <p className="text-2xl font-black text-white">
                  {form.short_name || form.name || "ชื่อทีม"}
                </p>
                <p className="mt-2 text-sm text-zinc-400">{form.name || "ชื่อโรงเรียน"}</p>
                <p className="mt-2 text-sm font-bold text-red-200">
                  {form.colors || "ยังไม่ได้ตั้งสี"}
                </p>
              </div>
            </div>
          </article>

          <article className="rounded-3xl border border-white/10 bg-zinc-900 p-5 sm:p-6">
            <h2 className="text-2xl font-black">รายการทีม</h2>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {teams.map((team) => (
                <button
                  type="button"
                  key={team.id}
                  onClick={() => startEdit(team)}
                  className="rounded-2xl border border-white/10 bg-zinc-950 p-4 text-left hover:border-red-300/50"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-black text-white">{team.short_name || team.name}</p>
                      <p className="mt-1 text-sm text-zinc-400">{team.slug}</p>
                    </div>
                    <span
                      className={`rounded-full border px-3 py-1 text-xs font-bold ${
                        team.is_active
                          ? "border-emerald-400/40 bg-emerald-500/10 text-emerald-100"
                          : "border-zinc-500/40 bg-zinc-700/20 text-zinc-300"
                      }`}
                    >
                      {team.is_active ? "เปิด" : "ปิด"}
                    </span>
                  </div>
                  <p className="mt-3 text-sm text-zinc-300">{team.name}</p>
                  <p className="mt-1 text-xs text-zinc-500">{team.colors || "ยังไม่มีสี"}</p>
                </button>
              ))}
            </div>
          </article>
        </section>
      </section>
    </main>
  );
}
