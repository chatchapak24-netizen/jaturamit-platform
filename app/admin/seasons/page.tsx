"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase-browser";

type SupabaseRelation<T> = T | T[] | null;

type Season = {
  id: string;
  name: string;
  year: number | null;
  status: string | null;
  cover_image_url: string | null;
  competition: {
    name: string;
  } | null;
};

type SeasonQueryRow = Omit<Season, "competition"> & {
  competition: SupabaseRelation<{ name: string | null }>;
};

function normalizeRelation<T>(relation: SupabaseRelation<T>): T | null {
  return Array.isArray(relation) ? relation[0] || null : relation;
}

function normalizeSeasonCompetition(
  competition: SeasonQueryRow["competition"]
): Season["competition"] {
  const value = normalizeRelation(competition);

  if (!value?.name) {
    return null;
  }

  return { name: value.name };
}

export default function AdminSeasonsPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [seasons, setSeasons] = useState<Season[]>([]);
  const [editingSeasonId, setEditingSeasonId] = useState("");
  const [coverImageUrl, setCoverImageUrl] = useState("");

  const [message, setMessage] = useState("");
  const [errorText, setErrorText] = useState("");

  const editingSeason = seasons.find((season) => season.id === editingSeasonId);

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

  async function loadSeasons() {
    const { data, error } = await supabaseBrowser
      .from("seasons")
      .select(`
        id,
        name,
        year,
        status,
        cover_image_url,
        competition:competition_id(name)
      `)
      .order("year", { ascending: false })
      .order("name", { ascending: true });

    if (error) {
      setErrorText(error.message);
      return;
    }

    const loadedSeasons: Season[] = ((data || []) as SeasonQueryRow[]).map(
      (season) => ({
        ...season,
        competition: normalizeSeasonCompetition(season.competition),
      })
    );

    setSeasons(loadedSeasons);
  }

  useEffect(() => {
    async function init() {
      setLoading(true);

      const isAdmin = await checkAdmin();
      if (!isAdmin) return;

      await loadSeasons();
      setLoading(false);
    }

    init();
  }, []);

  function startEdit(season: Season) {
    setMessage("");
    setErrorText("");
    setEditingSeasonId(season.id);
    setCoverImageUrl(season.cover_image_url || "");

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function cancelEdit() {
    setEditingSeasonId("");
    setCoverImageUrl("");
    setMessage("");
    setErrorText("");
  }

  async function saveCoverImage(e: React.FormEvent) {
    e.preventDefault();

    setMessage("");
    setErrorText("");

    if (!editingSeasonId) {
      setErrorText("กรุณาเลือกซีซั่นที่ต้องการแก้ไข");
      return;
    }

    setSaving(true);

    const { error } = await supabaseBrowser
      .from("seasons")
      .update({
        cover_image_url: coverImageUrl || null,
      })
      .eq("id", editingSeasonId);

    if (error) {
      setErrorText(error.message);
      setSaving(false);
      return;
    }

    await loadSeasons();
    setMessage("บันทึกภาพปกซีซั่นเรียบร้อยแล้ว");
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
          Admin / Seasons
        </p>

        <h1 className="mt-2 text-4xl font-black">ภาพปกซีซั่น</h1>

        <p className="mt-3 text-zinc-400">
          ตั้งค่าภาพปกของแต่ละซีซั่น เพื่อใช้แสดงบนกล่องใหญ่หน้าแรก
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

      {editingSeason && (
        <section className="mb-8 rounded-3xl border border-red-400/40 bg-red-950/20 p-6">
          <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-2xl font-black">แก้ไขภาพปกซีซั่น</h2>
              <p className="mt-2 text-sm text-zinc-400">
                {editingSeason.competition?.name} — {editingSeason.name}{" "}
                {editingSeason.year ? `· ${editingSeason.year}` : ""}
              </p>
            </div>

            <button
              type="button"
              onClick={cancelEdit}
              className="rounded-2xl border border-white/10 px-5 py-3 text-sm font-bold text-zinc-300 hover:bg-white/10"
            >
              ยกเลิก
            </button>
          </div>

          <form onSubmit={saveCoverImage} className="grid gap-4">
            <div>
              <label className="mb-2 block text-sm text-zinc-400">
                URL ภาพปกซีซั่น
              </label>

              <input
                type="text"
                value={coverImageUrl}
                onChange={(e) => setCoverImageUrl(e.target.value)}
                placeholder="https://..."
                className="w-full rounded-2xl border border-white/10 bg-zinc-950 px-4 py-3 text-white outline-none focus:border-red-400"
              />

              <p className="mt-2 text-xs text-zinc-500">
                แนะนำภาพแนวนอน 1600×700 หรือใกล้เคียง ถ้าใช้ภาพแนวตั้งจะโดนครอป
              </p>
            </div>

            {coverImageUrl && (
              <div className="rounded-2xl border border-white/10 bg-zinc-950 p-4">
                <p className="mb-3 text-sm font-bold text-zinc-300">
                  Preview ภาพปก
                </p>

                <img
                  src={coverImageUrl}
                  alt="season cover preview"
                  className="h-72 w-full rounded-2xl bg-zinc-900 object-cover"
                />

                <p className="mt-3 text-xs text-zinc-500">
                  ถ้ารูปไม่ขึ้น แปลว่า URL ไม่ถูก หรือ bucket ยังไม่ public
                </p>
              </div>
            )}

            <div className="flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={saving}
                className="rounded-2xl bg-red-600 px-6 py-3 font-black text-white hover:bg-red-500 disabled:opacity-50"
              >
                {saving ? "กำลังบันทึก..." : "บันทึกภาพปกซีซั่น"}
              </button>

              <button
                type="button"
                onClick={() => setCoverImageUrl("")}
                className="rounded-2xl border border-white/10 px-6 py-3 font-black text-zinc-300 hover:bg-white/10"
              >
                ล้างรูป
              </button>
            </div>
          </form>
        </section>
      )}

      <section className="rounded-3xl border border-white/10 bg-zinc-900 p-6">
        <h2 className="text-2xl font-black">ซีซั่นทั้งหมด</h2>

        <div className="mt-6 grid gap-5">
          {seasons.map((season) => (
            <article
              key={season.id}
              className={`overflow-hidden rounded-3xl border ${
                editingSeasonId === season.id
                  ? "border-red-400 bg-red-950/30"
                  : "border-white/10 bg-zinc-950"
              }`}
            >
              <div className="grid gap-0 md:grid-cols-[280px_1fr]">
                <div className="flex min-h-[180px] items-center justify-center bg-zinc-900">
                  {season.cover_image_url ? (
                    <img
                      src={season.cover_image_url}
                      alt={season.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="text-xs font-bold uppercase tracking-[0.25em] text-zinc-500">
                      No Cover
                    </div>
                  )}
                </div>

                <div className="p-5">
                  <p className="text-xs font-bold uppercase tracking-[0.25em] text-red-300">
                    {season.status || "draft"}
                  </p>

                  <h3 className="mt-2 text-2xl font-black">
                    {season.competition?.name}
                  </h3>

                  <p className="mt-1 text-sm text-zinc-400">
                    {season.name} {season.year ? `· ${season.year}` : ""}
                  </p>

                  <p className="mt-3 break-all text-xs text-zinc-500">
                    {season.cover_image_url || "ยังไม่มีภาพปก"}
                  </p>

                  <button
                    type="button"
                    onClick={() => startEdit(season)}
                    className="mt-5 rounded-xl border border-white/10 px-4 py-2 text-sm font-bold text-zinc-300 hover:bg-white/10"
                  >
                    แก้ไขภาพปก
                  </button>
                </div>
              </div>
            </article>
          ))}

          {seasons.length === 0 && (
            <div className="rounded-3xl border border-dashed border-white/15 p-10 text-center text-zinc-500">
              ยังไม่มีซีซั่นในระบบ
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
