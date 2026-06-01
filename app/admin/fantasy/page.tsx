"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase-browser";

type SupabaseRelation<T> = T | T[] | null;

type ArenaWeek = {
  id: string;
  season_id: string;
  name: string;
  week_number: number;
  status: string;
  lineup_opens_at: string | null;
  lineup_locks_at: string | null;
  season: {
    name: string | null;
    year: number | null;
  } | null;
};

type WeekRow = Omit<ArenaWeek, "season"> & {
  season: SupabaseRelation<ArenaWeek["season"]>;
};

type ScoreSummary = {
  week_id: string;
  total_points: number;
  status: string;
};

function normalizeRelation<T>(relation: SupabaseRelation<T>): T | null {
  return Array.isArray(relation) ? relation[0] || null : relation;
}

export default function AdminFantasyPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [weeks, setWeeks] = useState<ArenaWeek[]>([]);
  const [scores, setScores] = useState<ScoreSummary[]>([]);
  const [errorText, setErrorText] = useState("");

  const totalScores = useMemo(() => scores.length, [scores]);
  const finalScores = useMemo(
    () => scores.filter((score) => score.status === "final").length,
    [scores]
  );

  useEffect(() => {
    async function loadAdminFantasy() {
      setLoading(true);
      setErrorText("");

      const { data: userData } = await supabaseBrowser.auth.getUser();

      if (!userData.user) {
        router.push("/admin/login");
        return;
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
        return;
      }

      const [weeksResult, scoresResult] = await Promise.all([
        supabaseBrowser
          .from("arena_weeks")
          .select(
            `
              id,
              season_id,
              name,
              week_number,
              status,
              lineup_opens_at,
              lineup_locks_at,
              season:season_id(name, year)
            `
          )
          .order("week_number", { ascending: false }),

        supabaseBrowser
          .from("arena_weekly_scores")
          .select("week_id, total_points, status"),
      ]);

      if (weeksResult.error) {
        setErrorText(weeksResult.error.message);
        setLoading(false);
        return;
      }

      if (scoresResult.error) {
        setErrorText(scoresResult.error.message);
        setLoading(false);
        return;
      }

      setWeeks(
        ((weeksResult.data || []) as WeekRow[]).map((week) => ({
          ...week,
          season: normalizeRelation(week.season),
        }))
      );
      setScores((scoresResult.data || []) as ScoreSummary[]);
      setLoading(false);
    }

    void loadAdminFantasy();
  }, [router]);

  if (loading) {
    return (
      <main className="mx-auto max-w-6xl px-6 py-10 text-zinc-400">
        Loading Fantasy admin...
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-red-300">
            Admin / Fantasy
          </p>
          <h1 className="mt-2 text-4xl font-black">
            Jaturamit Arena Fantasy
          </h1>
          <p className="mt-3 text-zinc-400">
            Dashboard only. Player settings live in existing Admin / Players.
          </p>
        </div>
        <Link
          href="/admin/players"
          className="rounded-xl border border-white/10 px-4 py-3 text-sm font-black text-zinc-200 hover:bg-white/10"
        >
          Player Settings
        </Link>
      </div>

      {errorText ? (
        <div className="mb-6 rounded-2xl border border-red-500/40 bg-red-950/40 p-4 text-red-200">
          {errorText}
        </div>
      ) : null}

      <section className="grid gap-5 md:grid-cols-3">
        <article className="rounded-2xl border border-white/10 bg-zinc-900 p-5">
          <p className="text-xs font-black uppercase tracking-[0.24em] text-red-300">
            Fantasy Weeks
          </p>
          <h2 className="mt-3 text-3xl font-black">{weeks.length}</h2>
        </article>
        <article className="rounded-2xl border border-white/10 bg-zinc-900 p-5">
          <p className="text-xs font-black uppercase tracking-[0.24em] text-red-300">
            Weekly Scores
          </p>
          <h2 className="mt-3 text-3xl font-black">{totalScores}</h2>
        </article>
        <article className="rounded-2xl border border-white/10 bg-zinc-900 p-5">
          <p className="text-xs font-black uppercase tracking-[0.24em] text-red-300">
            Final Scores
          </p>
          <h2 className="mt-3 text-3xl font-black">{finalScores}</h2>
        </article>
      </section>

      <section className="mt-8 overflow-hidden rounded-2xl border border-white/10 bg-zinc-900">
        <div className="border-b border-white/10 p-5">
          <h2 className="text-2xl font-black">Arena Weeks</h2>
        </div>
        <table className="w-full min-w-[760px] text-sm">
          <thead className="bg-white/10 text-zinc-300">
            <tr>
              <th className="px-4 py-3 text-left">Week</th>
              <th className="px-4 py-3 text-left">Season</th>
              <th className="px-4 py-3 text-left">Lineup Window</th>
              <th className="px-4 py-3 text-right">Status</th>
            </tr>
          </thead>
          <tbody>
            {weeks.map((week) => (
              <tr key={week.id} className="border-t border-white/10">
                <td className="px-4 py-4 font-bold">
                  {week.week_number}. {week.name}
                </td>
                <td className="px-4 py-4 text-zinc-300">
                  {week.season?.name || "Season"} {week.season?.year || ""}
                </td>
                <td className="px-4 py-4 text-zinc-400">
                  {week.lineup_opens_at || "not set"} /{" "}
                  {week.lineup_locks_at || "not set"}
                </td>
                <td className="px-4 py-4 text-right">{week.status}</td>
              </tr>
            ))}
            {weeks.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-zinc-500">
                  No Arena weeks found.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </section>
    </main>
  );
}
