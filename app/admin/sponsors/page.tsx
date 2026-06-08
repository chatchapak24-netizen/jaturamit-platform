"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase-browser";

type Sponsor = {
  id: string;
  name: string;
  logo_url: string | null;
  website_url: string | null;
  sponsor_tier: string | null;
  display_order: number | null;
  status: string | null;
};

const SPONSOR_TIERS = [
  { value: "main", label: "Main Sponsor" },
  { value: "co", label: "Co Sponsor" },
  { value: "official", label: "Official Partner" },
  { value: "supporter", label: "Supporter" },
  { value: "media", label: "Media Partner" },
];

export default function AdminSponsorsPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  const [editingSponsorId, setEditingSponsorId] = useState("");

  const [name, setName] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [sponsorTier, setSponsorTier] = useState("supporter");
  const [displayOrder, setDisplayOrder] = useState("99");
  const [status, setStatus] = useState("active");

  const [message, setMessage] = useState("");
  const [errorText, setErrorText] = useState("");

  const isEditing = Boolean(editingSponsorId);

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

  async function loadSponsors() {
    const { data, error } = await supabaseBrowser
      .from("sponsors")
      .select(`
        id,
        name,
        logo_url,
        website_url,
        sponsor_tier,
        display_order,
        status
      `)
      .order("display_order", { ascending: true })
      .order("name", { ascending: true });

    if (error) {
      setErrorText(error.message);
      return;
    }

    setSponsors((data || []) as Sponsor[]);
  }

  useEffect(() => {
    async function init() {
      setLoading(true);

      const isAdmin = await checkAdmin();
      if (!isAdmin) return;

      await loadSponsors();
      setLoading(false);
    }

    init();
  }, [checkAdmin]);

  function resetForm() {
    setEditingSponsorId("");
    setName("");
    setLogoUrl("");
    setWebsiteUrl("");
    setSponsorTier("supporter");
    setDisplayOrder("99");
    setStatus("active");
  }

  function startEdit(sponsor: Sponsor) {
    setMessage("");
    setErrorText("");

    setEditingSponsorId(sponsor.id);
    setName(sponsor.name || "");
    setLogoUrl(sponsor.logo_url || "");
    setWebsiteUrl(sponsor.website_url || "");
    setSponsorTier(sponsor.sponsor_tier || "supporter");
    setDisplayOrder(
      sponsor.display_order === null || sponsor.display_order === undefined
        ? "99"
        : String(sponsor.display_order)
    );
    setStatus(sponsor.status || "active");

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function validateForm() {
    if (!name.trim()) {
      setErrorText("กรุณาใส่ชื่อสปอนเซอร์");
      return false;
    }

    const parsedOrder = displayOrder.trim() === "" ? 99 : Number(displayOrder);

    if (Number.isNaN(parsedOrder)) {
      setErrorText("ลำดับการแสดงผลต้องเป็นตัวเลข");
      return false;
    }

    return true;
  }

  async function saveSponsor(e: React.FormEvent) {
    e.preventDefault();

    setMessage("");
    setErrorText("");

    if (!validateForm()) return;

    const parsedOrder = displayOrder.trim() === "" ? 99 : Number(displayOrder);

    const payload = {
      name: name.trim(),
      logo_url: logoUrl || null,
      website_url: websiteUrl || null,
      sponsor_tier: sponsorTier || "supporter",
      display_order: parsedOrder,
      status: status || "active",
    };

    setSaving(true);

    if (isEditing) {
      const { error } = await supabaseBrowser
        .from("sponsors")
        .update(payload)
        .eq("id", editingSponsorId);

      if (error) {
        setErrorText(error.message);
        setSaving(false);
        return;
      }

      await loadSponsors();
      resetForm();

      setMessage("แก้ไขสปอนเซอร์เรียบร้อยแล้ว");
      setSaving(false);
      return;
    }

    const { error } = await supabaseBrowser.from("sponsors").insert(payload);

    if (error) {
      setErrorText(error.message);
      setSaving(false);
      return;
    }

    await loadSponsors();
    resetForm();

    setMessage("เพิ่มสปอนเซอร์เรียบร้อยแล้ว");
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
          Admin / Sponsors
        </p>

        <h1 className="mt-2 text-4xl font-black">จัดการสปอนเซอร์</h1>

        <p className="mt-3 text-zinc-400">
          เพิ่มและแก้ไขโลโก้ผู้สนับสนุน ระดับสปอนเซอร์ ลำดับ และสถานะการแสดงผล
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
        <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-2xl font-black">
              {isEditing ? "แก้ไขสปอนเซอร์" : "เพิ่มสปอนเซอร์ใหม่"}
            </h2>
            <p className="mt-2 text-sm text-zinc-400">
              {isEditing
                ? "กำลังแก้ไขข้อมูลสปอนเซอร์เดิม"
                : "เพิ่มผู้สนับสนุนรายการเข้าสู่ระบบ"}
            </p>
          </div>

          {isEditing && (
            <button
              type="button"
              onClick={resetForm}
              className="rounded-2xl border border-white/10 px-5 py-3 text-sm font-bold text-zinc-300 hover:bg-white/10"
            >
              ยกเลิกการแก้ไข
            </button>
          )}
        </div>

        <form onSubmit={saveSponsor} className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm text-zinc-400">
              ชื่อสปอนเซอร์
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="เช่น MAZSA"
              className="w-full rounded-2xl border border-white/10 bg-zinc-950 px-4 py-3 text-white outline-none focus:border-red-400"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm text-zinc-400">
              ระดับสปอนเซอร์
            </label>
            <select
              value={sponsorTier}
              onChange={(e) => setSponsorTier(e.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-zinc-950 px-4 py-3 text-white outline-none focus:border-red-400"
            >
              {SPONSOR_TIERS.map((tier) => (
                <option key={tier.value} value={tier.value}>
                  {tier.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm text-zinc-400">
              URL โลโก้
            </label>
            <input
              type="text"
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
              placeholder="https://..."
              className="w-full rounded-2xl border border-white/10 bg-zinc-950 px-4 py-3 text-white outline-none focus:border-red-400"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm text-zinc-400">
              เว็บไซต์ / Facebook
            </label>
            <input
              type="text"
              value={websiteUrl}
              onChange={(e) => setWebsiteUrl(e.target.value)}
              placeholder="https://..."
              className="w-full rounded-2xl border border-white/10 bg-zinc-950 px-4 py-3 text-white outline-none focus:border-red-400"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm text-zinc-400">
              ลำดับการแสดงผล
            </label>
            <input
              type="number"
              value={displayOrder}
              onChange={(e) => setDisplayOrder(e.target.value)}
              placeholder="1"
              className="w-full rounded-2xl border border-white/10 bg-zinc-950 px-4 py-3 text-white outline-none focus:border-red-400"
            />
            <p className="mt-2 text-xs text-zinc-500">
              ตัวเลขน้อยจะแสดงก่อน เช่น 1, 2, 3
            </p>
          </div>

          <div>
            <label className="mb-2 block text-sm text-zinc-400">สถานะ</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-zinc-950 px-4 py-3 text-white outline-none focus:border-red-400"
            >
              <option value="active">active</option>
              <option value="inactive">inactive</option>
              <option value="draft">draft</option>
            </select>
          </div>

          {logoUrl && (
            <div className="md:col-span-2">
              <div className="flex items-center gap-4 rounded-2xl border border-white/10 bg-zinc-950 p-4">
                <img
                  src={logoUrl}
                  alt="preview"
                  className="h-20 w-28 rounded-2xl bg-white object-contain p-3"
                />

                <div>
                  <p className="font-bold">Preview โลโก้</p>
                  <p className="mt-1 text-sm text-zinc-500">
                    ถ้ารูปไม่ขึ้น แปลว่า URL ไม่ถูก หรือ bucket ยังไม่ public
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="md:col-span-2 flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={saving}
              className="rounded-2xl bg-red-600 px-6 py-3 font-black text-white hover:bg-red-500 disabled:opacity-50"
            >
              {saving
                ? "กำลังบันทึก..."
                : isEditing
                ? "บันทึกการแก้ไขสปอนเซอร์"
                : "เพิ่มสปอนเซอร์"}
            </button>

            {isEditing && (
              <button
                type="button"
                onClick={resetForm}
                className="rounded-2xl border border-white/10 px-6 py-3 font-black text-zinc-300 hover:bg-white/10"
              >
                ยกเลิก
              </button>
            )}
          </div>
        </form>
      </section>

      <section className="mt-8 rounded-3xl border border-white/10 bg-zinc-900 p-6">
        <h2 className="text-2xl font-black">สปอนเซอร์ทั้งหมด</h2>

        <div className="mt-6 grid gap-5 md:grid-cols-2">
          {sponsors.map((sponsor) => (
            <article
              key={sponsor.id}
              className={`rounded-3xl border p-6 ${
                editingSponsorId === sponsor.id
                  ? "border-red-400 bg-red-950/30"
                  : "border-white/10 bg-zinc-950"
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.25em] text-red-300">
                    {sponsor.sponsor_tier || "supporter"}
                  </p>

                  <h3 className="mt-2 text-2xl font-black">{sponsor.name}</h3>

                  <p className="mt-1 text-sm text-zinc-500">
                    ลำดับ: {sponsor.display_order ?? 99} · สถานะ:{" "}
                    {sponsor.status || "active"}
                  </p>

                  {sponsor.website_url && (
                    <a
                      href={sponsor.website_url}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-3 inline-flex text-sm font-bold text-red-300 hover:text-red-200"
                    >
                      เปิดเว็บไซต์ →
                    </a>
                  )}
                </div>

                {sponsor.logo_url ? (
                  <img
                    src={sponsor.logo_url}
                    alt={sponsor.name}
                    className="h-20 w-28 shrink-0 rounded-2xl bg-white object-contain p-3"
                  />
                ) : (
                  <div className="flex h-20 w-28 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-xs text-zinc-500">
                    NO LOGO
                  </div>
                )}
              </div>

              <button
                onClick={() => startEdit(sponsor)}
                className="mt-6 rounded-xl border border-white/10 px-4 py-2 text-sm font-bold text-zinc-300 hover:bg-white/10"
              >
                แก้ไขสปอนเซอร์
              </button>
            </article>
          ))}

          {sponsors.length === 0 && (
            <div className="rounded-3xl border border-dashed border-white/15 p-10 text-center text-zinc-500 md:col-span-2">
              ยังไม่มีสปอนเซอร์
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
