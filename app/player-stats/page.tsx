import Link from "next/link";
import { supabase } from "@/lib/supabase";

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

type Player = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  nickname: string | null;
  photo_url: string | null;
};

type Team = {
  id: string;
  name: string;
  short_name: string | null;
  logo_url: string | null;
};

type Lineup = {
  id: string;
  player_id: string;
  team_id: string;
  is_starter: boolean;
  minutes_played: number | null;
  shirt_number: number | null;
  position: string | null;
  player: Player | null;
  team: Team | null;
  match: {
    season_id: string;
  } | null;
};

type LineupQueryRow = Omit<Lineup, "player" | "team" | "match"> & {
  player: SupabaseRelation<Player>;
  team: SupabaseRelation<Team>;
  match: SupabaseRelation<{ season_id: string }>;
};

type MatchEvent = {
  id: string;
  player_id: string | null;
  team_id: string | null;
  event_type: string;
  player: Player | null;
  team: Team | null;
  match: {
    season_id: string;
  } | null;
};

type MatchEventQueryRow = Omit<MatchEvent, "player" | "team" | "match"> & {
  player: SupabaseRelation<Player>;
  team: SupabaseRelation<Team>;
  match: SupabaseRelation<{ season_id: string }>;
};

type PlayerStatRow = {
  player_id: string;
  team_id: string;
  shirt_number: number | null;
  position: string | null;
  player: {
    first_name: string | null;
    last_name: string | null;
    nickname: string | null;
    photo_url: string | null;
  } | null;
  team: {
    name: string;
    short_name: string | null;
    logo_url: string | null;
  } | null;
  appearances: number;
  starts: number;
  substitutes: number;
  minutes_played: number;
  goals: number;
  yellow_cards: number;
  red_cards: number;
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

function playerName(player: PlayerStatRow["player"]) {
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

  return labels[position || ""] || position || "-";
}

export default async function PlayerStatsPage({
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

  const [
    { data: lineupData, error: lineupError },
    { data: eventData, error: eventError },
  ] = selectedSeasonId
    ? await Promise.all([
        supabase
          .from("match_lineups")
          .select(`
            id,
            player_id,
            team_id,
            is_starter,
            minutes_played,
            shirt_number,
            position,
            player:player_id(
              id,
              first_name,
              last_name,
              nickname,
              photo_url
            ),
            team:team_id(
              id,
              name,
              short_name,
              logo_url
            ),
            match:match_id!inner(
              season_id
            )
          `)
          .eq("match.season_id", selectedSeasonId),

        supabase
          .from("match_events")
          .select(`
            id,
            player_id,
            team_id,
            event_type,
            player:player_id(
              id,
              first_name,
              last_name,
              nickname,
              photo_url
            ),
            team:team_id(
              id,
              name,
              short_name,
              logo_url
            ),
            match:match_id!inner(
              season_id
            )
          `)
          .eq("match.season_id", selectedSeasonId),
      ])
    : [
        { data: [], error: null },
        { data: [], error: null },
      ];

  const lineups: Lineup[] = ((lineupData || []) as LineupQueryRow[]).map(
    (lineup) => ({
      ...lineup,
      player: normalizeRelation(lineup.player),
      team: normalizeRelation(lineup.team),
      match: normalizeRelation(lineup.match),
    })
  );
  const events: MatchEvent[] = (
    (eventData || []) as MatchEventQueryRow[]
  ).map((event) => ({
    ...event,
    player: normalizeRelation(event.player),
    team: normalizeRelation(event.team),
    match: normalizeRelation(event.match),
  }));

  const statMap = new Map<string, PlayerStatRow>();

  function ensurePlayer(params: {
    player_id: string;
    team_id: string;
    shirt_number?: number | null;
    position?: string | null;
    player?: PlayerStatRow["player"];
    team?: PlayerStatRow["team"];
  }) {
    const key = `${params.player_id}-${params.team_id}`;

    const existing = statMap.get(key);
    if (existing) return existing;

    const created: PlayerStatRow = {
      player_id: params.player_id,
      team_id: params.team_id,
      shirt_number: params.shirt_number ?? null,
      position: params.position ?? null,
      player: params.player || null,
      team: params.team || null,
      appearances: 0,
      starts: 0,
      substitutes: 0,
      minutes_played: 0,
      goals: 0,
      yellow_cards: 0,
      red_cards: 0,
    };

    statMap.set(key, created);
    return created;
  }

  lineups.forEach((lineup) => {
    if (!lineup.player_id || !lineup.team_id) return;

    const row = ensurePlayer({
      player_id: lineup.player_id,
      team_id: lineup.team_id,
      shirt_number: lineup.shirt_number,
      position: lineup.position,
      player: lineup.player
        ? {
            first_name: lineup.player.first_name,
            last_name: lineup.player.last_name,
            nickname: lineup.player.nickname,
            photo_url: lineup.player.photo_url,
          }
        : null,
      team: lineup.team
        ? {
            name: lineup.team.name,
            short_name: lineup.team.short_name,
            logo_url: lineup.team.logo_url,
          }
        : null,
    });

    row.appearances += 1;

    if (lineup.is_starter) {
      row.starts += 1;
    } else {
      row.substitutes += 1;
    }

    row.minutes_played += lineup.minutes_played || 0;

    if (lineup.shirt_number !== null && lineup.shirt_number !== undefined) {
      row.shirt_number = lineup.shirt_number;
    }

    if (lineup.position) {
      row.position = lineup.position;
    }
  });

  events.forEach((event) => {
    if (!event.player_id || !event.team_id) return;

    const row = ensurePlayer({
      player_id: event.player_id,
      team_id: event.team_id,
      player: event.player
        ? {
            first_name: event.player.first_name,
            last_name: event.player.last_name,
            nickname: event.player.nickname,
            photo_url: event.player.photo_url,
          }
        : null,
      team: event.team
        ? {
            name: event.team.name,
            short_name: event.team.short_name,
            logo_url: event.team.logo_url,
          }
        : null,
    });

    if (event.event_type === "goal") row.goals += 1;
    if (event.event_type === "yellow_card") row.yellow_cards += 1;
    if (event.event_type === "red_card") row.red_cards += 1;
  });

  const players = Array.from(statMap.values()).sort((a, b) => {
    if (b.goals !== a.goals) return b.goals - a.goals;
    if (b.appearances !== a.appearances) return b.appearances - a.appearances;
    return (a.shirt_number || 999) - (b.shirt_number || 999);
  });

  return (
    <main className="mx-auto max-w-7xl px-6 py-10">
      <div className="mb-8">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-red-300">
          Player Stats
        </p>

        <h1 className="mt-2 text-4xl font-black">สถิตินักเตะ</h1>

        <p className="mt-3 text-zinc-400">
          {selectedSeason?.competition?.name || "รายการแข่งขัน"} ·{" "}
          {selectedSeason?.name || "ซีซั่น"}{" "}
          {selectedSeason?.year ? `· ${selectedSeason.year}` : ""}
        </p>
      </div>

      {(seasonError || lineupError || eventError) && (
        <div className="mb-6 rounded-2xl border border-red-500/40 bg-red-950/40 p-4 text-red-200">
          {seasonError?.message || lineupError?.message || eventError?.message}
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
                href={`/player-stats?season=${season.id}`}
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

      <section className="rounded-3xl border border-white/10 bg-zinc-900 p-6">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-2xl font-black">ตารางสถิติรวม</h2>
          <p className="text-sm text-zinc-500">
            นับเฉพาะแมตช์ในซีซั่นที่เลือก
          </p>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-white/10">
          <table className="w-full min-w-[1100px] text-sm">
            <thead className="bg-white/10 text-zinc-300">
              <tr>
                <th className="px-4 py-3 text-left">นักเตะ</th>
                <th className="px-4 py-3 text-left">ทีม</th>
                <th className="px-4 py-3 text-center">ตำแหน่ง</th>
                <th className="px-4 py-3 text-center">ลงสนาม</th>
                <th className="px-4 py-3 text-center">ตัวจริง</th>
                <th className="px-4 py-3 text-center">สำรอง</th>
                <th className="px-4 py-3 text-center">นาที</th>
                <th className="px-4 py-3 text-center">ประตู</th>
                <th className="px-4 py-3 text-center">เหลือง</th>
                <th className="px-4 py-3 text-center">แดง</th>
              </tr>
            </thead>

            <tbody>
              {players.map((row) => (
                <tr
                  key={`${row.player_id}-${row.team_id}`}
                  className="border-t border-white/10"
                >
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      {row.player?.photo_url ? (
                        <img
                          src={row.player.photo_url}
                          alt={playerName(row.player)}
                          className="h-12 w-12 rounded-xl bg-white object-cover"
                        />
                      ) : (
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/10 text-xs text-zinc-500">
                          {row.shirt_number ?? "-"}
                        </div>
                      )}

                      <div>
                        <Link
                          href={`/players/${row.player_id}`}
                          className="font-black hover:text-red-200"
                        >
                          {row.shirt_number ? `#${row.shirt_number} ` : ""}
                          {playerName(row.player)}
                        </Link>

                        <p className="text-xs text-zinc-500">
                          {[row.player?.first_name, row.player?.last_name]
                            .filter(Boolean)
                            .join(" ") || "-"}
                        </p>
                      </div>
                    </div>
                  </td>

                  <td className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      {row.team?.logo_url ? (
                        <img
                          src={row.team.logo_url}
                          alt={row.team.name}
                          className="h-8 w-8 rounded-full bg-white object-contain p-1"
                        />
                      ) : (
                        <div className="h-8 w-8 rounded-full bg-white/10" />
                      )}

                      <div>
                        <p className="font-bold">
                          {row.team?.short_name || row.team?.name}
                        </p>
                        <p className="text-xs text-zinc-500">
                          {row.team?.name}
                        </p>
                      </div>
                    </div>
                  </td>

                  <td className="px-4 py-4 text-center">
                    {positionLabel(row.position)}
                  </td>

                  <td className="px-4 py-4 text-center">{row.appearances}</td>

                  <td className="px-4 py-4 text-center">{row.starts}</td>

                  <td className="px-4 py-4 text-center">{row.substitutes}</td>

                  <td className="px-4 py-4 text-center">
                    {row.minutes_played}
                  </td>

                  <td className="px-4 py-4 text-center text-lg font-black text-red-300">
                    {row.goals}
                  </td>

                  <td className="px-4 py-4 text-center text-yellow-300">
                    {row.yellow_cards}
                  </td>

                  <td className="px-4 py-4 text-center text-red-400">
                    {row.red_cards}
                  </td>
                </tr>
              ))}

              {players.length === 0 && (
                <tr>
                  <td
                    colSpan={10}
                    className="px-4 py-10 text-center text-zinc-500"
                  >
                    ยังไม่มีสถิตินักเตะในซีซั่นนี้
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
