import Link from "next/link";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

type SupabaseRelation<T> = T | T[] | null;

type Season = {
  id: string;
  name: string;
  year: number | null;
  status: string | null;
  competition: {
    name: string;
    slug: string;
    description: string | null;
  } | null;
};

type SeasonQueryRow = Omit<Season, "competition"> & {
  competition: SupabaseRelation<{
    name: string | null;
    slug: string | null;
    description: string | null;
  }>;
};

type SeasonTeam = {
  id: string;
  season_id: string;
};

type Match = {
  id: string;
  season_id: string;
  status: string | null;
};

function normalizeRelation<T>(relation: SupabaseRelation<T>): T | null {
  return Array.isArray(relation) ? relation[0] || null : relation;
}

function normalizeSeasonCompetition(
  competition: SeasonQueryRow["competition"]
): Season["competition"] {
  const value = normalizeRelation(competition);

  if (!value?.name || !value.slug) {
    return null;
  }

  return {
    name: value.name,
    slug: value.slug,
    description: value.description,
  };
}

export default async function TournamentsPage() {
  const [
    { data: seasonData, error: seasonError },
    { data: seasonTeamData, error: seasonTeamError },
    { data: matchData, error: matchError },
  ] = await Promise.all([
    supabase
      .from("seasons")
      .select(`
        id,
        name,
        year,
        status,
        competition:competition_id(
          name,
          slug,
          description
        )
      `)
      .order("year", { ascending: false })
      .order("name", { ascending: true }),

    supabase
      .from("season_teams")
      .select("id, season_id"),

    supabase
      .from("matches")
      .select("id, season_id, status"),
  ]);

  const seasons: Season[] = ((seasonData || []) as SeasonQueryRow[]).map(
    (season) => ({
      ...season,
      competition: normalizeSeasonCompetition(season.competition),
    })
  );
  const seasonTeams = (seasonTeamData || []) as SeasonTeam[];
  const matches = (matchData || []) as Match[];

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <div className="mb-8">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-red-300">
          Tournaments
        </p>

        <h1 className="mt-2 text-4xl font-black">ทัวร์นาเมนต์ / ซีซั่น</h1>

        <p className="mt-3 text-zinc-400">
          เลือกรายการแข่งขันและซีซั่นที่ต้องการดูข้อมูล โปรแกรม ตารางคะแนน ทีม และสถิตินักเตะ
        </p>
      </div>

      {(seasonError || seasonTeamError || matchError) && (
        <div className="mb-6 rounded-2xl border border-red-500/40 bg-red-950/40 p-4 text-red-200">
          {seasonError?.message || seasonTeamError?.message || matchError?.message}
        </div>
      )}

      <div className="grid gap-6">
        {seasons.map((season) => {
          const teamCount = seasonTeams.filter(
            (item) => item.season_id === season.id
          ).length;

          const seasonMatches = matches.filter(
            (match) => match.season_id === season.id
          );

          const finishedCount = seasonMatches.filter(
            (match) => match.status === "finished"
          ).length;

          const isActive = season.status === "active";

          return (
            <section
              key={season.id}
              className={`rounded-3xl border p-6 ${
                isActive
                  ? "border-red-400/50 bg-red-950/30"
                  : "border-white/10 bg-zinc-900"
              }`}
            >
              <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.25em] text-red-300">
                    {season.status || "draft"}
                  </p>

                  <h2 className="mt-2 text-3xl font-black">
                    {season.competition?.name || "รายการแข่งขัน"}
                  </h2>

                  <p className="mt-2 text-lg font-bold text-zinc-200">
                    {season.name} {season.year ? `· ${season.year}` : ""}
                  </p>

                  {season.competition?.description && (
                    <p className="mt-4 max-w-2xl text-sm leading-7 text-zinc-400">
                      {season.competition.description}
                    </p>
                  )}
                </div>

                {isActive && (
                  <div className="rounded-full border border-red-400/40 bg-red-500/10 px-4 py-2 text-sm font-black text-red-200">
                    Active Season
                  </div>
                )}
              </div>

              <div className="mt-6 grid gap-4 md:grid-cols-3">
                <StatCard label="ทีมเข้าร่วม" value={teamCount.toString()} />
                <StatCard label="แมตช์ทั้งหมด" value={seasonMatches.length.toString()} />
                <StatCard label="แข่งจบแล้ว" value={finishedCount.toString()} />
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  href={`/fixtures?season=${season.id}`}
                  className="rounded-full bg-red-600 px-5 py-3 text-sm font-black text-white hover:bg-red-500"
                >
                  โปรแกรม
                </Link>

                <Link
                  href={`/standings?season=${season.id}`}
                  className="rounded-full border border-white/10 px-5 py-3 text-sm font-black text-zinc-200 hover:bg-white/10"
                >
                  ตารางคะแนน
                </Link>

                <Link
                  href={`/teams?season=${season.id}`}
                  className="rounded-full border border-white/10 px-5 py-3 text-sm font-black text-zinc-200 hover:bg-white/10"
                >
                  ทีม
                </Link>

                <Link
                  href={`/players?season=${season.id}`}
                  className="rounded-full border border-white/10 px-5 py-3 text-sm font-black text-zinc-200 hover:bg-white/10"
                >
                  นักเตะ
                </Link>

                <Link
                  href={`/player-stats?season=${season.id}`}
                  className="rounded-full border border-white/10 px-5 py-3 text-sm font-black text-zinc-200 hover:bg-white/10"
                >
                  สถิตินักเตะ
                </Link>

                <Link
                  href={`/scorers?season=${season.id}`}
                  className="rounded-full border border-white/10 px-5 py-3 text-sm font-black text-zinc-200 hover:bg-white/10"
                >
                  ดาวซัลโว
                </Link>

                <Link
                  href={`/discipline?season=${season.id}`}
                  className="rounded-full border border-white/10 px-5 py-3 text-sm font-black text-zinc-200 hover:bg-white/10"
                >
                  วินัยนักเตะ
                </Link>
              </div>
            </section>
          );
        })}

        {seasons.length === 0 && (
          <div className="rounded-3xl border border-dashed border-white/15 p-10 text-center text-zinc-500">
            ยังไม่มีทัวร์นาเมนต์ / ซีซั่น
          </div>
        )}
      </div>
    </main>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-zinc-950 p-5">
      <p className="text-sm text-zinc-500">{label}</p>
      <p className="mt-2 text-3xl font-black text-white">{value}</p>
    </div>
  );
}
