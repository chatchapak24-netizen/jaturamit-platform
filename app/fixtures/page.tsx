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
  } | null;
};

type SeasonQueryRow = Omit<Season, "competition"> & {
  competition: SupabaseRelation<{ name: string | null; slug: string | null }>;
};

type MatchTeam = {
  name: string;
  short_name: string | null;
};

type Match = {
  id: string;
  season_id: string;
  match_date: string;
  kickoff_time: string;
  venue: string | null;
  round: string | null;
  matchday: number | null;
  status: string | null;
  home_score: number | null;
  away_score: number | null;
  home_team: MatchTeam | null;
  away_team: MatchTeam | null;
};

type MatchQueryRow = Omit<Match, "home_team" | "away_team"> & {
  home_team: SupabaseRelation<MatchTeam>;
  away_team: SupabaseRelation<MatchTeam>;
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

  return { name: value.name, slug: value.slug };
}

export default async function FixturesPage({
  searchParams,
}: {
  searchParams: Promise<{ season?: string }>;
}) {
  const params = await searchParams;

  const { data: seasonData, error: seasonError } = await supabase
    .from("seasons")
    .select(`
      id,
      name,
      year,
      status,
      competition:competition_id(
        name,
        slug
      )
    `)
    .order("year", { ascending: false })
    .order("name", { ascending: true });

  const seasons: Season[] = ((seasonData || []) as SeasonQueryRow[]).map(
    (season) => ({
      ...season,
      competition: normalizeSeasonCompetition(season.competition),
    })
  );

  const activeSeason =
    seasons.find((season) => season.status === "active") || seasons[0] || null;

  const selectedSeasonId = params.season || activeSeason?.id || "";

  const selectedSeason =
    seasons.find((season) => season.id === selectedSeasonId) || activeSeason;

  const { data, error } = selectedSeasonId
    ? await supabase
        .from("matches")
        .select(`
          id,
          season_id,
          match_date,
          kickoff_time,
          venue,
          round,
          matchday,
          status,
          home_score,
          away_score,
          home_team:home_team_id(name, short_name),
          away_team:away_team_id(name, short_name)
        `)
        .eq("season_id", selectedSeasonId)
        .order("match_date", { ascending: true })
        .order("kickoff_time", { ascending: true })
    : { data: [], error: null };

  const matches: Match[] = ((data || []) as MatchQueryRow[]).map((match) => ({
    ...match,
    home_team: normalizeRelation(match.home_team),
    away_team: normalizeRelation(match.away_team),
  }));

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <div className="mb-8">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-red-300">
          Fixtures
        </p>

        <h1 className="mt-2 text-4xl font-black">โปรแกรมการแข่งขัน</h1>

        <p className="mt-3 text-zinc-400">
          {selectedSeason?.competition?.name || "รายการแข่งขัน"} ·{" "}
          {selectedSeason?.name || "ซีซั่น"}{" "}
          {selectedSeason?.year ? `· ${selectedSeason.year}` : ""}
        </p>
      </div>

      {(seasonError || error) && (
        <div className="mb-6 rounded-2xl border border-red-500/40 bg-red-950/40 p-4 text-red-200">
          {seasonError?.message || error?.message}
        </div>
      )}

      <section className="mb-8 rounded-3xl border border-white/10 bg-zinc-900 p-6">
        <h2 className="text-2xl font-black">เลือกซีซั่น</h2>

        <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {seasons.map((season) => {
            const isActive = season.id === selectedSeasonId;

            return (
              <Link
                key={season.id}
                href={`/fixtures?season=${season.id}`}
                className={`rounded-2xl border p-4 transition ${
                  isActive
                    ? "border-red-400 bg-red-950/40"
                    : "border-white/10 bg-zinc-950 hover:border-red-400/50"
                }`}
              >
                <p className="text-xs font-bold uppercase tracking-[0.25em] text-red-300">
                  {season.status}
                </p>
                <p className="mt-2 font-black">{season.competition?.name}</p>
                <p className="mt-1 text-sm text-zinc-400">
                  {season.name} {season.year ? `· ${season.year}` : ""}
                </p>
              </Link>
            );
          })}
        </div>
      </section>

      <div className="grid gap-4">
        {matches.map((match) => (
          <Link
            key={match.id}
            href={`/matches/${match.id}`}
            className="block rounded-3xl border border-white/10 bg-zinc-900 p-6 transition hover:border-red-400/50 hover:bg-zinc-800"
          >
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3 text-sm text-zinc-400">
              <span>
                นัดที่ {match.matchday || "-"} · {match.match_date} ·{" "}
                {match.kickoff_time?.slice(0, 5)} น.
              </span>
              <span>{match.venue}</span>
            </div>

            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4">
              <div className="text-right">
                <p className="text-xl font-bold">{match.home_team?.name}</p>
                <p className="text-sm text-zinc-400">
                  {match.home_team?.short_name}
                </p>
              </div>

              <div className="rounded-2xl bg-white px-5 py-3 text-center font-black text-zinc-950">
                {match.status === "finished"
                  ? `${match.home_score} - ${match.away_score}`
                  : "VS"}
              </div>

              <div>
                <p className="text-xl font-bold">{match.away_team?.name}</p>
                <p className="text-sm text-zinc-400">
                  {match.away_team?.short_name}
                </p>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 text-sm text-zinc-500">
              <span>{match.round || "-"}</span>
              <span>{match.status || "scheduled"}</span>
            </div>
          </Link>
        ))}

        {matches.length === 0 && (
          <div className="rounded-3xl border border-dashed border-white/15 p-10 text-center text-zinc-500">
            ยังไม่มีโปรแกรมการแข่งขันในซีซั่นนี้
          </div>
        )}
      </div>
    </main>
  );
}
