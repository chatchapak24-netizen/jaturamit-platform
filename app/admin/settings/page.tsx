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

export default function AdminSettingsPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [seasons, setSeasons] = useState<Season[]>([]);
  const [homepageSeasonId, setHomepageSeasonId] = useState("");

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

  async function loadData() {
    const [seasonsResult, settingResult] = await Promise.all([
      supabaseBrowser
        .from("seasons")
        .select(`
          id,
          name,
          year,
          status,
          competition:competition_id(name)
        `)
        .order("year", { ascending: false })
        .order("name", { ascending: true }),

      supabaseBrowser
        .from("site_settings")
        .select("key, value")
        .eq("key", "homepage_season_id")
        .single(),
    ]);

    if (seasonsResult.error) {
      setErrorText(seasonsResult.error.message);
      return;
    }

    const loadedSeasons: Season[] = (
      (seasonsResult.data || []) as SeasonQueryRow[]
    ).map((season) => ({
      ...season,
      competition: normalizeSeasonCompetition(season.competition),
    }));

    setSeasons(loadedSeasons);

    if (settingResult.data?.value) {
      setHomepageSeasonId(settingResult.data.value);
    } else {
      const activeSeason =
        loadedSeasons.find((season) => season.status === "active") ||
        loadedSeasons[0];

      if (activeSeason) {
        setHomepageSeasonId(activeSeason.id);
      }
    }
  }

  useEffect(() => {
    async function init() {
      setLoading(true);

      const isAdmin = await checkAdmin();
      if (!isAdmin) return;

      await loadData();
      setLoading(false);
    }

    init();
  }, []);

  async function saveSettings() {
    setMessage("");
    setErrorText("");

    if (!homepageSeasonId) {
      setErrorText("กรุณาเลือกซีซั่นสำหรับหน้าแรก");
      return;
    }

    setSaving(true);

    const { error } = await supabaseBrowser
      .from("site_settings")
      .upsert({
        key: "homepage_season_id",
        value: homepageSeasonId,
        updated_at: new Date().toISOString(),
      });

    if (error) {
      setErrorText(error.message);
      setSaving(false);
      return;
    }

    setMessage("บันทึกการตั้งค่าหน้าแรกเรียบร้อยแล้ว");
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
          Admin / Settings
        </p>

        <h1 className="mt-2 text-4xl font-black">ตั้งค่าเว็บไซต์</h1>

        <p className="mt-3 text-zinc-400">
          ตั้งค่าซีซั่นหลักที่จะแสดงบนหน้าแรกของเว็บไซต์
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
        <h2 className="text-2xl font-black">ซีซั่นที่โชว์บนหน้าแรก</h2>

        <div className="mt-6">
          <label className="mb-2 block text-sm text-zinc-400">
            เลือกทัวร์นาเมนต์ / ซีซั่น
          </label>

          <select
            value={homepageSeasonId}
            onChange={(e) => setHomepageSeasonId(e.target.value)}
            className="w-full rounded-2xl border border-white/10 bg-zinc-950 px-4 py-3 text-white outline-none focus:border-red-400"
          >
            <option value="">เลือกซีซั่น</option>
            {seasons.map((season) => (
              <option key={season.id} value={season.id}>
                {season.competition?.name} — {season.name} —{" "}
                {season.year || "-"} — {season.status}
              </option>
            ))}
          </select>
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
