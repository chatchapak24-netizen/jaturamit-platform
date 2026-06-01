import Link from "next/link";
import { getArenaRanking, getVisibleArenaContest } from "@/lib/arena";

export const dynamic = "force-dynamic";

export default async function ArenaRankingPage() {
  const { contest, error: contestError } = await getVisibleArenaContest();
  const { ranking, error: rankingError } = await getArenaRanking(contest?.id || null);
  const totalVotes = ranking.reduce((sum, entry) => sum + entry.vote_count, 0);

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-red-300">
            Arena Ranking (อันดับอารีนา)
          </p>
          <h1 className="mt-2 text-4xl font-black">
            {contest?.title || "Jaturamit Arena (จตุรมิตร อารีนา)"}
          </h1>
          <p className="mt-3 text-zinc-400">
            {totalVotes.toLocaleString("th-TH")} total votes counted (นับโหวตทั้งหมด)
          </p>
        </div>
        <Link
          href="/arena"
          className="inline-flex rounded-xl border border-white/10 px-4 py-3 text-sm font-black text-zinc-200 hover:bg-white/10"
        >
          Back to arena (กลับสู่อารีนา)
        </Link>
      </div>

      {(contestError || rankingError) && (
        <div className="mb-6 rounded-2xl border border-amber-300/30 bg-amber-300/10 p-4 text-amber-100">
          {contestError || rankingError}
        </div>
      )}

      {!contest ? (
        <section className="rounded-2xl border border-white/10 bg-zinc-900 p-6 text-zinc-300">
          Arena ranking is not open yet. (ตารางอันดับอารีนายังไม่เปิด)
        </section>
      ) : ranking.length === 0 ? (
        <section className="rounded-2xl border border-white/10 bg-zinc-900 p-6 text-zinc-300">
          No arena ranking entries are available. (ยังไม่มีรายการอันดับอารีนา)
        </section>
      ) : (
        <section className="grid gap-4">
          {ranking.map((entry) => {
            const percent =
              totalVotes > 0 ? Math.round((entry.vote_count / totalVotes) * 100) : 0;
            const isLeader = entry.rank_position === 1;

            return (
              <article
                key={entry.entry_id}
                className={`rounded-2xl border p-5 ${
                  isLeader
                    ? "border-red-300/50 bg-red-950/30"
                    : "border-white/10 bg-zinc-900"
                }`}
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-zinc-950 text-2xl font-black text-red-100">
                      {entry.rank_position}
                    </div>
                    <div>
                      <h2 className="text-2xl font-black">{entry.display_name}</h2>
                      <p className="mt-1 text-sm text-zinc-400">
                        {entry.short_name || entry.slug}
                        {entry.color_label ? ` / ${entry.color_label}` : ""}
                      </p>
                    </div>
                  </div>
                  <div className="text-left sm:text-right">
                    <p className="text-3xl font-black">
                      {entry.vote_count.toLocaleString("th-TH")}
                    </p>
                    <p className="text-sm text-zinc-400">
                      {percent}% share (สัดส่วน)
                    </p>
                  </div>
                </div>
                <div className="mt-4 h-3 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-red-500"
                    style={{ width: `${percent}%` }}
                  />
                </div>
              </article>
            );
          })}
        </section>
      )}
    </main>
  );
}
