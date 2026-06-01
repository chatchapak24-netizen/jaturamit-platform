import Link from "next/link";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

type ScoreRow = {
  id: string;
  total_points: number;
  scored_at: string | null;
  status: string;
  profile: {
    display_name: string | null;
    handle: string | null;
  } | null;
  week: {
    name: string | null;
    status: string | null;
  } | null;
};

type SupabaseRelation<T> = T | T[] | null;

function normalizeRelation<T>(relation: SupabaseRelation<T>): T | null {
  return Array.isArray(relation) ? relation[0] || null : relation;
}

export default async function ArenaFantasyLeaderboardPage() {
  const { data, error } = await supabase
    .from("arena_weekly_scores")
    .select(
      `
        id,
        total_points,
        scored_at,
        status,
        profile:profile_id(display_name, handle),
        week:week_id(name, status)
      `
    )
    .in("status", ["scored", "final"])
    .order("total_points", { ascending: false })
    .order("scored_at", { ascending: true })
    .limit(50);

  const scores: ScoreRow[] = ((data || []) as Array<
    Omit<ScoreRow, "profile" | "week"> & {
      profile: SupabaseRelation<ScoreRow["profile"]>;
      week: SupabaseRelation<ScoreRow["week"]>;
    }
  >).map((row) => ({
    ...row,
    profile: normalizeRelation(row.profile),
    week: normalizeRelation(row.week),
  }));

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-red-300">
            Fantasy Leaderboard (ตารางอันดับแฟนตาซี)
          </p>
          <h1 className="mt-2 text-4xl font-black">
            Leaderboard (ตารางอันดับ)
          </h1>
          <p className="mt-3 text-zinc-400">
            Scores are read from existing Arena weekly scores and match stats. (คะแนนอ้างอิงจากคะแนนรายสัปดาห์และ Match Stats (สถิติหลังเกม) ของอารีนา)
          </p>
        </div>
        <Link
          href="/arena/fantasy"
          className="inline-flex rounded-xl border border-white/10 px-4 py-3 text-sm font-black text-zinc-200 hover:bg-white/10"
        >
          Back to Fantasy (กลับไปหน้าแฟนตาซี)
        </Link>
      </div>

      {error ? (
        <section className="rounded-2xl border border-amber-300/30 bg-amber-300/10 p-5 text-amber-100">
          {error.message}
        </section>
      ) : scores.length === 0 ? (
        <section className="rounded-2xl border border-white/10 bg-zinc-900 p-6 text-zinc-300">
          No scored fantasy lineups are available yet. (ยังไม่มีทีมแฟนตาซีที่มีคะแนน)
        </section>
      ) : (
        <section className="overflow-hidden rounded-2xl border border-white/10 bg-zinc-900">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="bg-white/10 text-zinc-300">
              <tr>
                <th className="px-4 py-3 text-left">Rank (อันดับ)</th>
                <th className="px-4 py-3 text-left">Profile (โปรไฟล์)</th>
                <th className="px-4 py-3 text-left">Week (สัปดาห์)</th>
                <th className="px-4 py-3 text-right">Points (คะแนน)</th>
                <th className="px-4 py-3 text-right">Status (สถานะ)</th>
              </tr>
            </thead>
            <tbody>
              {scores.map((score, index) => (
                <tr key={score.id} className="border-t border-white/10">
                  <td className="px-4 py-4 font-black text-red-200">
                    #{index + 1}
                  </td>
                  <td className="px-4 py-4 font-bold">
                    {score.profile?.display_name ||
                      score.profile?.handle ||
                      "Arena Player (ผู้เล่นอารีนา)"}
                  </td>
                  <td className="px-4 py-4 text-zinc-300">
                    {score.week?.name || "Fantasy week (สัปดาห์แฟนตาซี)"}
                  </td>
                  <td className="px-4 py-4 text-right text-2xl font-black">
                    {score.total_points.toLocaleString("th-TH")}
                  </td>
                  <td className="px-4 py-4 text-right text-zinc-400">
                    {score.status}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </main>
  );
}
