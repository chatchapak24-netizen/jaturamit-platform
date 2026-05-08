import Link from "next/link";
import ArenaVotePanel from "@/components/arena/ArenaVotePanel";
import { getArenaRanking, getVisibleArenaContest } from "@/lib/arena";

export const dynamic = "force-dynamic";

export default async function ArenaPage() {
  const { contest, error: contestError } = await getVisibleArenaContest();
  const { ranking, error: rankingError } = await getArenaRanking(contest?.id || null);

  return (
    <main className="mx-auto max-w-7xl px-6 py-10">
      <section className="mb-8 rounded-3xl border border-white/10 bg-gradient-to-br from-red-950/60 via-zinc-900 to-zinc-950 p-6 md:p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-red-300">
          Arena
        </p>
        <div className="mt-3 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-4xl font-black">
              {contest?.title || "Jaturamit Arena"}
            </h1>
            <p className="mt-3 max-w-3xl text-zinc-300">
              {contest?.description ||
                "Vote for your side and follow the live ranking during the event."}
            </p>
          </div>
          <Link
            href="/arena/ranking"
            className="inline-flex rounded-xl border border-red-300/30 px-4 py-3 text-sm font-black text-red-100 hover:bg-red-500/10"
          >
            Ranking board
          </Link>
        </div>
      </section>

      {(contestError || rankingError) && (
        <div className="mb-6 rounded-2xl border border-amber-300/30 bg-amber-300/10 p-4 text-amber-100">
          {contestError || rankingError}
        </div>
      )}

      {!contest ? (
        <section className="rounded-2xl border border-white/10 bg-zinc-900 p-6 text-zinc-300">
          Arena voting is not open yet.
        </section>
      ) : ranking.length === 0 ? (
        <section className="rounded-2xl border border-white/10 bg-zinc-900 p-6 text-zinc-300">
          Arena entries are not ready yet.
        </section>
      ) : (
        <ArenaVotePanel contest={contest} initialRanking={ranking} />
      )}
    </main>
  );
}
