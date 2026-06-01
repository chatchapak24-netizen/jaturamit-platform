import Link from "next/link";
import { notFound } from "next/navigation";
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

type Team = {
  id: string;
  name: string;
  short_name: string | null;
  slug: string;
  school_name: string | null;
  nickname: string | null;
  logo_url: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  description: string | null;
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
  home_team_id: string;
  away_team_id: string;
  home_team: MatchTeam | null;
  away_team: MatchTeam | null;
};

type MatchTeam = {
  name: string;
  short_name: string | null;
};

type MatchQueryRow = Omit<Match, "home_team" | "away_team"> & {
  home_team: SupabaseRelation<MatchTeam>;
  away_team: SupabaseRelation<MatchTeam>;
};

type Player = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  nickname: string | null;
  photo_url: string | null;
};

type SeasonPlayer = {
  id: string;
  season_id: string;
  team_id: string;
  shirt_number: number | null;
  position: string | null;
  status: string | null;
  player: Player | null;
};

type SeasonPlayerQueryRow = Omit<SeasonPlayer, "player"> & {
  player: SupabaseRelation<Player>;
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

function playerName(player: SeasonPlayer["player"]) {
  if (!player) return "ไม่ระบุชื่อ";

  const fullName = [player.first_name, player.last_name]
    .filter(Boolean)
    .join(" ");

  return player.nickname || fullName || "ไม่ระบุชื่อ";
}

function positionLabel(position: string | null) {
  const labels: Record<string, string> = {
    GK: "ผู้รักษาประตู",
    DF: "กองหลัง",
    MF: "กองกลาง",
    FW: "กองหน้า",
  };

  return labels[position || ""] || position || "ไม่ระบุตำแหน่ง";
}

export default async function TeamDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ season?: string }>;
}) {
  const { slug } = await params;
  const query = await searchParams;

  const { data: teamData, error: teamError } = await supabase
    .from("teams")
    .select(`
      id,
      name,
      short_name,
      slug,
      school_name,
      nickname,
      logo_url,
      primary_color,
      secondary_color,
      description
    `)
    .eq("slug", slug)
    .single();

  if (teamError || !teamData) {
    notFound();
  }

  const team = teamData as Team;

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

  const selectedSeasonId = query.season || activeSeason?.id || "";

  const selectedSeason =
    seasons.find((season) => season.id === selectedSeasonId) || activeSeason;

  const [{ data: matchData, error: matchError }, { data: rosterData, error: rosterError }] =
    selectedSeasonId
      ? await Promise.all([
          supabase
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
              home_team_id,
              away_team_id,
              home_team:home_team_id(name, short_name),
              away_team:away_team_id(name, short_name)
            `)
            .eq("season_id", selectedSeasonId)
            .or(`home_team_id.eq.${team.id},away_team_id.eq.${team.id}`)
            .order("match_date", { ascending: true })
            .order("kickoff_time", { ascending: true }),

          supabase
            .from("season_players")
            .select(`
              id,
              season_id,
              team_id,
              shirt_number,
              position,
              status,
              player:player_id(
                id,
                first_name,
                last_name,
                nickname,
                photo_url
              )
            `)
            .eq("season_id", selectedSeasonId)
            .eq("team_id", team.id)
            .order("shirt_number", { ascending: true }),
        ])
      : [
          { data: [], error: null },
          { data: [], error: null },
        ];

  const matches: Match[] = ((matchData || []) as MatchQueryRow[]).map(
    (match) => ({
      ...match,
      home_team: normalizeRelation(match.home_team),
      away_team: normalizeRelation(match.away_team),
    })
  );
  const roster: SeasonPlayer[] = (
    (rosterData || []) as SeasonPlayerQueryRow[]
  ).map((player) => ({
    ...player,
    player: normalizeRelation(player.player),
  }));

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      {(seasonError || matchError || rosterError) && (
        <div className="mb-6 rounded-2xl border border-red-500/40 bg-red-950/40 p-4 text-red-200">
          {seasonError?.message || matchError?.message || rosterError?.message}
        </div>
      )}

      <section className="rounded-3xl border border-white/10 bg-zinc-900 p-8">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.35em] text-red-300">
              {team.short_name}
            </p>

            <h1 className="mt-3 text-4xl font-black">{team.name}</h1>

            <p className="mt-3 text-zinc-400">{team.school_name}</p>

            {team.nickname && (
              <p className="mt-5 inline-flex rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-zinc-300">
                {team.nickname}
              </p>
            )}

            {team.description && (
              <p className="mt-5 max-w-2xl text-sm leading-7 text-zinc-400">
                {team.description}
              </p>
            )}
          </div>

          {team.logo_url ? (
  <div className="flex h-14 w-14 items-center justify-center rounded-full border border-white/10">
    <img
      src={team.logo_url}
      alt={team.name}
      className="h-12 w-12 object-contain"
    />
  </div>
) : (
  <div
    className="h-12 w-12 rounded-full border border-white/20"
    style={{ background: team.primary_color || "#ffffff" }}
  />
)}
        </div>
      </section>

      <section className="mt-8 rounded-3xl border border-white/10 bg-zinc-900 p-6">
        <h2 className="text-2xl font-black">เลือกซีซั่น</h2>

        <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {seasons.map((season) => {
            const isActive = season.id === selectedSeasonId;

            return (
              <Link
                key={season.id}
                href={`/teams/${team.slug}?season=${season.id}`}
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

      <section className="mt-8 rounded-3xl border border-white/10 bg-zinc-900 p-6">
        <div className="mb-5">
          <h2 className="text-2xl font-black">รายชื่อนักกีฬา</h2>
          <p className="mt-2 text-sm text-zinc-400">
            {selectedSeason?.competition?.name || "รายการแข่งขัน"} ·{" "}
            {selectedSeason?.name || "ซีซั่น"}{" "}
            {selectedSeason?.year ? `· ${selectedSeason.year}` : ""}
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {roster.map((item) => (
            <article
              key={item.id}
              className="overflow-hidden rounded-3xl border border-white/10 bg-zinc-950"
            >
              <div className="flex h-56 items-center justify-center bg-gradient-to-br from-zinc-800 to-zinc-950">
                {item.player?.photo_url ? (
                  <img
                    src={item.player.photo_url}
                    alt={playerName(item.player)}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-28 w-28 items-center justify-center rounded-full border border-white/10 bg-white/5 text-4xl font-black text-zinc-500">
                    {item.shirt_number ?? "-"}
                  </div>
                )}
              </div>

              <div className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.25em] text-red-300">
                      {positionLabel(item.position)}
                    </p>

                    <Link
  href={`/players/${item.player?.id}`}
  className="mt-2 block text-2xl font-black hover:text-red-200"
>
  {playerName(item.player)}
</Link>

                    <p className="mt-1 text-sm text-zinc-500">
                      {[item.player?.first_name, item.player?.last_name]
                        .filter(Boolean)
                        .join(" ") || "ไม่มีชื่อจริง"}
                    </p>
                  </div>

                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white text-2xl font-black text-zinc-950">
                    {item.shirt_number ?? "-"}
                  </div>
                </div>

                <div className="mt-5 flex items-center justify-between border-t border-white/10 pt-4 text-sm text-zinc-400">
                  <span>สถานะ</span>
                  <span className="font-bold text-zinc-200">
                    {item.status || "active"}
                  </span>
                </div>
              </div>
            </article>
          ))}

          {roster.length === 0 && (
            <div className="rounded-3xl border border-dashed border-white/15 p-10 text-center text-zinc-500 md:col-span-2 lg:col-span-3">
              ยังไม่มีรายชื่อนักกีฬาในซีซั่นนี้
            </div>
          )}
        </div>
      </section>

      <section className="mt-8 rounded-3xl border border-white/10 bg-zinc-900 p-6">
        <h2 className="text-2xl font-black">โปรแกรมของทีม</h2>

        <div className="mt-6 grid gap-4">
          {matches.map((match) => (
            <Link
              key={match.id}
              href={`/matches/${match.id}`}
              className="block rounded-2xl border border-white/10 bg-zinc-950 p-5 transition hover:border-red-400/50 hover:bg-zinc-800"
            >
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3 text-sm text-zinc-400">
                <span>
                  นัดที่ {match.matchday || "-"} · {match.match_date} ·{" "}
                  {match.kickoff_time?.slice(0, 5)} น.
                </span>
                <span>{match.venue}</span>
              </div>

              <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4">
                <div className="text-right">
                  <p className="font-black">{match.home_team?.name}</p>
                  <p className="text-xs text-zinc-500">
                    {match.home_team?.short_name}
                  </p>
                </div>

                <div className="rounded-xl bg-white px-4 py-2 text-center font-black text-zinc-950">
                  {match.status === "finished"
                    ? `${match.home_score} - ${match.away_score}`
                    : "VS"}
                </div>

                <div>
                  <p className="font-black">{match.away_team?.name}</p>
                  <p className="text-xs text-zinc-500">
                    {match.away_team?.short_name}
                  </p>
                </div>
              </div>
            </Link>
          ))}

          {matches.length === 0 && (
            <div className="rounded-2xl border border-dashed border-white/15 p-8 text-center text-zinc-500">
              ยังไม่มีโปรแกรมของทีมในซีซั่นนี้
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
