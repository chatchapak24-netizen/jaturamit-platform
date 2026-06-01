import Link from "next/link";
import { notFound } from "next/navigation";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

type SupabaseRelation<T> = T | T[] | null;

type Player = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  nickname: string | null;
  photo_url: string | null;
};

type SeasonTeam = {
  id: string;
  name: string;
  short_name: string | null;
  slug: string;
  logo_url: string | null;
};

type PlayerSeason = {
  id: string;
  name: string;
  year: number | null;
  status: string | null;
  competition: {
    name: string;
    slug: string;
  } | null;
};

type SeasonPlayer = {
  id: string;
  season_id: string;
  team_id: string;
  shirt_number: number | null;
  position: string | null;
  status: string | null;
  team: SeasonTeam | null;
  season: PlayerSeason | null;
};

type PlayerSeasonQueryRow = Omit<PlayerSeason, "competition"> & {
  competition: SupabaseRelation<{ name: string | null; slug: string | null }>;
};

type SeasonPlayerQueryRow = Omit<SeasonPlayer, "team" | "season"> & {
  team: SupabaseRelation<SeasonTeam>;
  season: SupabaseRelation<PlayerSeasonQueryRow>;
};

type MatchRef = {
  id: string;
  season_id: string;
};

type Lineup = {
  id: string;
  player_id: string;
  team_id: string;
  is_starter: boolean;
  minutes_played: number | null;
  match: MatchRef | null;
};

type LineupQueryRow = Omit<Lineup, "match"> & {
  match: SupabaseRelation<MatchRef>;
};

type MatchEvent = {
  id: string;
  player_id: string | null;
  team_id: string | null;
  event_type: string;
  match: MatchRef | null;
};

type MatchEventQueryRow = Omit<MatchEvent, "match"> & {
  match: SupabaseRelation<MatchRef>;
};

type SeasonStat = {
  season_id: string;
  competition_name: string;
  season_name: string;
  year: number | null;
  team_name: string;
  team_short_name: string | null;
  team_slug: string | null;
  team_logo_url: string | null;
  shirt_number: number | null;
  position: string | null;
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

function normalizePlayerSeason(
  season: SupabaseRelation<PlayerSeasonQueryRow>
): PlayerSeason | null {
  const value = normalizeRelation(season);

  if (!value) {
    return null;
  }

  const competition = normalizeRelation(value.competition);

  return {
    ...value,
    competition:
      competition?.name && competition.slug
        ? { name: competition.name, slug: competition.slug }
        : null,
  };
}

function fullName(player: Player) {
  return [player.first_name, player.last_name].filter(Boolean).join(" ");
}

function displayName(player: Player) {
  return player.nickname || fullName(player) || "ไม่ระบุชื่อ";
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

export default async function PlayerProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const { data: playerData, error: playerError } = await supabase
    .from("players")
    .select("id, first_name, last_name, nickname, photo_url")
    .eq("id", id)
    .single();

  if (playerError || !playerData) {
    notFound();
  }

  const player = playerData as Player;

  const [
    { data: seasonPlayerData, error: seasonPlayerError },
    { data: lineupData, error: lineupError },
    { data: eventData, error: eventError },
  ] = await Promise.all([
    supabase
      .from("season_players")
      .select(`
        id,
        season_id,
        team_id,
        shirt_number,
        position,
        status,
        team:team_id(
          id,
          name,
          short_name,
          slug,
          logo_url
        ),
        season:season_id(
          id,
          name,
          year,
          status,
          competition:competition_id(
            name,
            slug
          )
        )
      `)
      .eq("player_id", id),

    supabase
      .from("match_lineups")
      .select(`
        id,
        player_id,
        team_id,
        is_starter,
        minutes_played,
        match:match_id(
          id,
          season_id
        )
      `)
      .eq("player_id", id),

    supabase
      .from("match_events")
      .select(`
        id,
        player_id,
        team_id,
        event_type,
        match:match_id(
          id,
          season_id
        )
      `)
      .eq("player_id", id),
  ]);

  const seasonPlayers: SeasonPlayer[] = (
    (seasonPlayerData || []) as SeasonPlayerQueryRow[]
  ).map((item) => ({
    ...item,
    team: normalizeRelation(item.team),
    season: normalizePlayerSeason(item.season),
  }));
  const lineups: Lineup[] = ((lineupData || []) as LineupQueryRow[]).map(
    (lineup) => ({
      ...lineup,
      match: normalizeRelation(lineup.match),
    })
  );
  const events: MatchEvent[] = (
    (eventData || []) as MatchEventQueryRow[]
  ).map((event) => ({
    ...event,
    match: normalizeRelation(event.match),
  }));

  const statMap = new Map<string, SeasonStat>();

  seasonPlayers.forEach((item) => {
    statMap.set(item.season_id, {
      season_id: item.season_id,
      competition_name: item.season?.competition?.name || "รายการแข่งขัน",
      season_name: item.season?.name || "ซีซั่น",
      year: item.season?.year || null,
      team_name: item.team?.name || "-",
      team_short_name: item.team?.short_name || null,
      team_slug: item.team?.slug || null,
      team_logo_url: item.team?.logo_url || null,
      shirt_number: item.shirt_number,
      position: item.position,
      appearances: 0,
      starts: 0,
      substitutes: 0,
      minutes_played: 0,
      goals: 0,
      yellow_cards: 0,
      red_cards: 0,
    });
  });

  lineups.forEach((lineup) => {
    const seasonId = lineup.match?.season_id;
    if (!seasonId) return;

    const row = statMap.get(seasonId);
    if (!row) return;

    row.appearances += 1;

    if (lineup.is_starter) {
      row.starts += 1;
    } else {
      row.substitutes += 1;
    }

    row.minutes_played += lineup.minutes_played || 0;
  });

  events.forEach((event) => {
    const seasonId = event.match?.season_id;
    if (!seasonId) return;

    const row = statMap.get(seasonId);
    if (!row) return;

    if (event.event_type === "goal") row.goals += 1;
    if (event.event_type === "yellow_card") row.yellow_cards += 1;
    if (event.event_type === "red_card") row.red_cards += 1;
  });

  const seasonStats = Array.from(statMap.values()).sort((a, b) => {
    return (b.year || 0) - (a.year || 0);
  });

  const total = seasonStats.reduce(
    (acc, row) => {
      acc.appearances += row.appearances;
      acc.starts += row.starts;
      acc.substitutes += row.substitutes;
      acc.minutes_played += row.minutes_played;
      acc.goals += row.goals;
      acc.yellow_cards += row.yellow_cards;
      acc.red_cards += row.red_cards;
      return acc;
    },
    {
      appearances: 0,
      starts: 0,
      substitutes: 0,
      minutes_played: 0,
      goals: 0,
      yellow_cards: 0,
      red_cards: 0,
    }
  );

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      {(seasonPlayerError || lineupError || eventError) && (
        <div className="mb-6 rounded-2xl border border-red-500/40 bg-red-950/40 p-4 text-red-200">
          {seasonPlayerError?.message || lineupError?.message || eventError?.message}
        </div>
      )}

      <section className="overflow-hidden rounded-3xl border border-white/10 bg-zinc-900">
        <div className="grid gap-0 md:grid-cols-[360px_1fr]">
          <div className="flex min-h-[360px] items-center justify-center bg-gradient-to-br from-zinc-800 to-zinc-950">
            {player.photo_url ? (
              <img
                src={player.photo_url}
                alt={displayName(player)}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-40 w-40 items-center justify-center rounded-full border border-white/10 bg-white/5 text-5xl font-black text-zinc-500">
                {player.nickname?.slice(0, 1) || "P"}
              </div>
            )}
          </div>

          <div className="p-8">
            <p className="text-sm font-semibold uppercase tracking-[0.35em] text-red-300">
              Player Profile
            </p>

            <h1 className="mt-3 text-5xl font-black">
              {displayName(player)}
            </h1>

            <p className="mt-3 text-zinc-400">
              {fullName(player) || "ไม่มีชื่อจริง"}
            </p>

            <div className="mt-8 grid gap-4 md:grid-cols-4">
              <StatCard label="ลงสนาม" value={total.appearances.toString()} />
              <StatCard label="ประตู" value={total.goals.toString()} />
              <StatCard label="นาทีรวม" value={total.minutes_played.toString()} />
              <StatCard
                label="ใบเหลือง/แดง"
                value={`${total.yellow_cards}/${total.red_cards}`}
              />
            </div>
          </div>
        </div>
      </section>

      <section className="mt-8 rounded-3xl border border-white/10 bg-zinc-900 p-6">
        <h2 className="text-2xl font-black">สถิติรวมทุกรายการ</h2>

        <div className="mt-6 overflow-x-auto rounded-2xl border border-white/10">
          <table className="w-full min-w-[900px] text-sm">
            <thead className="bg-white/10 text-zinc-300">
              <tr>
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
              <tr className="border-t border-white/10">
                <td className="px-4 py-4 text-center">{total.appearances}</td>
                <td className="px-4 py-4 text-center">{total.starts}</td>
                <td className="px-4 py-4 text-center">{total.substitutes}</td>
                <td className="px-4 py-4 text-center">{total.minutes_played}</td>
                <td className="px-4 py-4 text-center text-xl font-black text-red-300">
                  {total.goals}
                </td>
                <td className="px-4 py-4 text-center text-yellow-300">
                  {total.yellow_cards}
                </td>
                <td className="px-4 py-4 text-center text-red-400">
                  {total.red_cards}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-8 rounded-3xl border border-white/10 bg-zinc-900 p-6">
        <h2 className="text-2xl font-black">แยกตามรายการ / ซีซั่น</h2>

        <div className="mt-6 grid gap-5">
          {seasonStats.map((row) => (
            <article
              key={row.season_id}
              className="rounded-3xl border border-white/10 bg-zinc-950 p-6"
            >
              <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.25em] text-red-300">
                    {row.competition_name}
                  </p>

                  <h3 className="mt-2 text-2xl font-black">
                    {row.season_name} {row.year ? `· ${row.year}` : ""}
                  </h3>

                  <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-zinc-400">
                    {row.team_logo_url ? (
                      <img
                        src={row.team_logo_url}
                        alt={row.team_name}
                        className="h-8 w-8 rounded-full bg-white object-contain p-1"
                      />
                    ) : null}

                    <span>
                      ทีม:{" "}
                      {row.team_slug ? (
                        <Link
                          href={`/teams/${row.team_slug}?season=${row.season_id}`}
                          className="font-bold text-red-300 hover:text-red-200"
                        >
                          {row.team_short_name || row.team_name}
                        </Link>
                      ) : (
                        row.team_short_name || row.team_name
                      )}
                    </span>

                    <span>เบอร์: {row.shirt_number ?? "-"}</span>
                    <span>ตำแหน่ง: {positionLabel(row.position)}</span>
                  </div>
                </div>

                <Link
                  href={`/player-stats?season=${row.season_id}`}
                  className="rounded-2xl border border-white/10 px-5 py-3 text-sm font-bold text-zinc-300 hover:bg-white/10"
                >
                  ดูสถิติซีซั่นนี้
                </Link>
              </div>

              <div className="mt-6 grid gap-3 md:grid-cols-7">
                <StatCard label="ลงสนาม" value={row.appearances.toString()} />
                <StatCard label="ตัวจริง" value={row.starts.toString()} />
                <StatCard label="สำรอง" value={row.substitutes.toString()} />
                <StatCard label="นาที" value={row.minutes_played.toString()} />
                <StatCard label="ประตู" value={row.goals.toString()} />
                <StatCard label="เหลือง" value={row.yellow_cards.toString()} />
                <StatCard label="แดง" value={row.red_cards.toString()} />
              </div>
            </article>
          ))}

          {seasonStats.length === 0 && (
            <div className="rounded-3xl border border-dashed border-white/15 p-10 text-center text-zinc-500">
              ยังไม่มีข้อมูลสถิติของนักเตะคนนี้
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <p className="text-xs text-zinc-500">{label}</p>
      <p className="mt-2 text-2xl font-black">{value}</p>
    </div>
  );
}
