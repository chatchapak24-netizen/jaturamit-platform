import { notFound } from "next/navigation";
import { supabase } from "@/lib/supabase";

type SupabaseRelation<T> = T | T[] | null;

type Team = {
  id: string;
  name: string;
  short_name: string | null;
};

type Competition = {
  name: string;
  slug: string;
};

type MatchSeason = {
  name: string;
  year: number | null;
  competition: Competition | null;
};

type Match = {
  id: string;
  match_date: string;
  kickoff_time: string;
  venue: string | null;
  matchday: number | null;
  round: string | null;
  status: string | null;
  home_score: number | null;
  away_score: number | null;
  match_duration: number | null;
  home_team_id: string;
  away_team_id: string;
  home_team: Team | null;
  away_team: Team | null;
  season: MatchSeason | null;
};

type MatchSeasonQueryRow = Omit<MatchSeason, "competition"> & {
  competition: SupabaseRelation<{
    name: string | null;
    slug: string | null;
  }>;
};

type MatchQueryRow = Omit<Match, "home_team" | "away_team" | "season"> & {
  home_team: SupabaseRelation<Team>;
  away_team: SupabaseRelation<Team>;
  season: SupabaseRelation<MatchSeasonQueryRow>;
};

type Person = {
  first_name: string | null;
  last_name: string | null;
  nickname: string | null;
};

type TeamName = {
  name: string;
  short_name: string | null;
};

type MatchEvent = {
  id: string;
  team_id: string | null;
  player_id: string | null;
  event_type: string;
  minute: number | null;
  extra_minute: number | null;
  description: string | null;
  team: TeamName | null;
  player: Person | null;
};

type MatchEventQueryRow = Omit<MatchEvent, "team" | "player"> & {
  team: SupabaseRelation<TeamName>;
  player: SupabaseRelation<Person>;
};

type Substitution = {
  id: string;
  team_id: string | null;
  player_out_id: string | null;
  player_in_id: string | null;
  minute: number;
  extra_minute: number | null;
  reason: string | null;
  team: TeamName | null;
  player_out: Person | null;
  player_in: Person | null;
};

type SubstitutionQueryRow = Omit<
  Substitution,
  "team" | "player_out" | "player_in"
> & {
  team: SupabaseRelation<TeamName>;
  player_out: SupabaseRelation<Person>;
  player_in: SupabaseRelation<Person>;
};

type Lineup = {
  id: string;
  team_id: string;
  player_id: string;
  is_starter: boolean;
  minute_in: number | null;
  minute_out: number | null;
  minutes_played: number | null;
  position: string | null;
  shirt_number: number | null;
  team: TeamName | null;
  player: Person | null;
};

type LineupQueryRow = Omit<Lineup, "team" | "player"> & {
  team: SupabaseRelation<TeamName>;
  player: SupabaseRelation<Person>;
};

function normalizeRelation<T>(relation: SupabaseRelation<T>): T | null {
  return Array.isArray(relation) ? relation[0] || null : relation;
}

function normalizeCompetition(
  competition: MatchSeasonQueryRow["competition"]
): Competition | null {
  const value = normalizeRelation(competition);

  if (!value?.name || !value.slug) {
    return null;
  }

  return { name: value.name, slug: value.slug };
}

function normalizeMatchSeason(season: SupabaseRelation<MatchSeasonQueryRow>) {
  const value = normalizeRelation(season);

  if (!value) {
    return null;
  }

  return {
    ...value,
    competition: normalizeCompetition(value.competition),
  };
}

function playerName(
  player?: {
    first_name: string | null;
    last_name: string | null;
    nickname: string | null;
  } | null
) {
  if (!player) return "ไม่ระบุชื่อ";

  const fullName = [player.first_name, player.last_name]
    .filter(Boolean)
    .join(" ");

  return player.nickname || fullName || "ไม่ระบุชื่อ";
}

function eventLabel(type: string) {
  const labels: Record<string, string> = {
    goal: "ประตู",
    own_goal: "เข้าประตูตัวเอง",
    yellow_card: "ใบเหลือง",
    red_card: "ใบแดง",
    penalty_missed: "จุดโทษพลาด",
  };

  return labels[type] || type;
}

function eventSymbol(type: string) {
  const symbols: Record<string, string> = {
    goal: "⚽",
    own_goal: "OG",
    yellow_card: "🟨",
    red_card: "🟥",
    penalty_missed: "❌",
  };

  return symbols[type] || "•";
}

function minuteText(minute: number | null, extraMinute?: number | null) {
  if (minute === null || minute === undefined) return "-";

  if (extraMinute && extraMinute > 0) {
    return `${minute}+${extraMinute}'`;
  }

  return `${minute}'`;
}

function splitLineupsByTeam(lineups: Lineup[], teamId: string) {
  const teamLineups = lineups.filter((lineup) => lineup.team_id === teamId);

  return {
    starters: teamLineups.filter((lineup) => lineup.is_starter),
    substitutes: teamLineups.filter((lineup) => !lineup.is_starter),
  };
}

export default async function MatchDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const { data: matchData, error: matchError } = await supabase
    .from("matches")
    .select(`
      id,
      match_date,
      kickoff_time,
      venue,
      matchday,
      round,
      status,
      home_score,
      away_score,
      match_duration,
      home_team_id,
      away_team_id,
      home_team:home_team_id(id, name, short_name),
      away_team:away_team_id(id, name, short_name),
      season:season_id(
        name,
        year,
        competition:competition_id(
          name,
          slug
        )
      )
    `)
    .eq("id", id)
    .single();

  if (matchError || !matchData) {
    notFound();
  }

  const matchRow = matchData as MatchQueryRow;
  const match: Match = {
    ...matchRow,
    home_team: normalizeRelation(matchRow.home_team),
    away_team: normalizeRelation(matchRow.away_team),
    season: normalizeMatchSeason(matchRow.season),
  };

  const [{ data: eventData }, { data: substitutionData }, { data: lineupData }] =
    await Promise.all([
      supabase
        .from("match_events")
        .select(`
          id,
          team_id,
          player_id,
          event_type,
          minute,
          extra_minute,
          description,
          team:team_id(name, short_name),
          player:player_id(first_name, last_name, nickname)
        `)
        .eq("match_id", match.id)
        .order("minute", { ascending: true })
        .order("extra_minute", { ascending: true }),

      supabase
        .from("match_substitutions")
        .select(`
          id,
          team_id,
          player_out_id,
          player_in_id,
          minute,
          extra_minute,
          reason,
          team:team_id(name, short_name),
          player_out:player_out_id(first_name, last_name, nickname),
          player_in:player_in_id(first_name, last_name, nickname)
        `)
        .eq("match_id", match.id)
        .order("minute", { ascending: true })
        .order("extra_minute", { ascending: true }),

      supabase
        .from("match_lineups")
        .select(`
          id,
          team_id,
          player_id,
          is_starter,
          minute_in,
          minute_out,
          minutes_played,
          position,
          shirt_number,
          team:team_id(name, short_name),
          player:player_id(first_name, last_name, nickname)
        `)
        .eq("match_id", match.id)
        .order("is_starter", { ascending: false })
        .order("shirt_number", { ascending: true }),
    ]);

  const events: MatchEvent[] = ((eventData || []) as MatchEventQueryRow[]).map(
    (event) => ({
      ...event,
      team: normalizeRelation(event.team),
      player: normalizeRelation(event.player),
    })
  );
  const substitutions: Substitution[] = (
    (substitutionData || []) as SubstitutionQueryRow[]
  ).map((substitution) => ({
    ...substitution,
    team: normalizeRelation(substitution.team),
    player_out: normalizeRelation(substitution.player_out),
    player_in: normalizeRelation(substitution.player_in),
  }));
  const lineups: Lineup[] = ((lineupData || []) as LineupQueryRow[]).map(
    (lineup) => ({
      ...lineup,
      team: normalizeRelation(lineup.team),
      player: normalizeRelation(lineup.player),
    })
  );

  const homeLineups = splitLineupsByTeam(lineups, match.home_team_id);
  const awayLineups = splitLineupsByTeam(lineups, match.away_team_id);

  const timeline = [
    ...events.map((event) => ({
      id: `event-${event.id}`,
      minute: event.minute || 0,
      extra_minute: event.extra_minute || 0,
      type: "event" as const,
      data: event,
    })),
    ...substitutions.map((sub) => ({
      id: `sub-${sub.id}`,
      minute: sub.minute || 0,
      extra_minute: sub.extra_minute || 0,
      type: "substitution" as const,
      data: sub,
    })),
  ].sort((a, b) => {
    if (a.minute !== b.minute) return a.minute - b.minute;
    return a.extra_minute - b.extra_minute;
  });

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <div className="mb-8">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-red-300">
          Match Detail
        </p>

        <h1 className="mt-2 text-4xl font-black">
          {match.season?.competition?.name || "รายการแข่งขัน"}
        </h1>

        <p className="mt-3 text-zinc-400">
          {match.season?.name || "ซีซั่น"}{" "}
          {match.season?.year ? `· ${match.season.year}` : ""}
          {match.round ? ` · ${match.round}` : ""}
        </p>
      </div>

      <section className="rounded-3xl border border-white/10 bg-gradient-to-br from-red-950/60 via-zinc-900 to-zinc-950 p-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 text-sm text-zinc-400">
          <span>
            นัดที่ {match.matchday} · {match.match_date} ·{" "}
            {match.kickoff_time?.slice(0, 5)} น.
          </span>
          <span>{match.venue}</span>
        </div>

        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-5">
          <div className="text-right">
            <p className="text-sm font-semibold text-red-300">
              {match.home_team?.short_name}
            </p>
            <h2 className="mt-2 text-3xl font-black">
              {match.home_team?.name}
            </h2>
          </div>

          <div className="rounded-3xl bg-white px-8 py-5 text-center text-4xl font-black text-zinc-950">
            {match.status === "finished"
              ? `${match.home_score} - ${match.away_score}`
              : "VS"}
          </div>

          <div>
            <p className="text-sm font-semibold text-red-300">
              {match.away_team?.short_name}
            </p>
            <h2 className="mt-2 text-3xl font-black">
              {match.away_team?.name}
            </h2>
          </div>
        </div>

        <div className="mt-6 text-center text-sm text-zinc-400">
          สถานะ: {match.status || "scheduled"} · ความยาวเกม{" "}
          {match.match_duration || 80} นาที
        </div>
      </section>

      <section className="mt-8 rounded-3xl border border-white/10 bg-zinc-900 p-6">
        <h2 className="text-2xl font-black">รายงานเหตุการณ์ในเกม</h2>

        <div className="mt-6 grid gap-4">
          {timeline.length === 0 && (
            <div className="rounded-2xl border border-dashed border-white/15 p-8 text-center text-zinc-500">
              ยังไม่มีรายงานเหตุการณ์ในเกม
            </div>
          )}

          {timeline.map((item) => {
            if (item.type === "event") {
              const event = item.data as MatchEvent;

              return (
                <div
                  key={item.id}
                  className="rounded-2xl border border-white/10 bg-zinc-950 p-5"
                >
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <p className="font-black">
                        {eventSymbol(event.event_type)}{" "}
                        {eventLabel(event.event_type)} —{" "}
                        {playerName(event.player)}
                      </p>
                      <p className="mt-1 text-sm text-zinc-400">
                        {event.team?.short_name || event.team?.name}
                        {event.description ? ` · ${event.description}` : ""}
                      </p>
                    </div>

                    <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2 font-black text-red-300">
                      {minuteText(event.minute, event.extra_minute)}
                    </div>
                  </div>
                </div>
              );
            }

            const sub = item.data as Substitution;

            return (
              <div
                key={item.id}
                className="rounded-2xl border border-white/10 bg-zinc-950 p-5"
              >
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <p className="font-black">🔁 เปลี่ยนตัว</p>
                    <p className="mt-1 text-sm text-zinc-400">
                      {sub.team?.short_name || sub.team?.name} · ออก:{" "}
                      {playerName(sub.player_out)} / เข้า:{" "}
                      {playerName(sub.player_in)}
                      {sub.reason ? ` · ${sub.reason}` : ""}
                    </p>
                  </div>

                  <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2 font-black text-red-300">
                    {minuteText(sub.minute, sub.extra_minute)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="mt-8 grid gap-6 lg:grid-cols-2">
        <LineupCard
          title={match.home_team?.name || "ทีมเหย้า"}
          starters={homeLineups.starters}
          substitutes={homeLineups.substitutes}
        />

        <LineupCard
          title={match.away_team?.name || "ทีมเยือน"}
          starters={awayLineups.starters}
          substitutes={awayLineups.substitutes}
        />
      </section>
    </main>
  );
}

function LineupCard({
  title,
  starters,
  substitutes,
}: {
  title: string;
  starters: Lineup[];
  substitutes: Lineup[];
}) {
  return (
    <div className="rounded-3xl border border-white/10 bg-zinc-900 p-6">
      <h2 className="text-2xl font-black">{title}</h2>

      <div className="mt-6">
        <h3 className="mb-3 font-bold text-red-300">ตัวจริง</h3>

        <div className="grid gap-2">
          {starters.length === 0 && (
            <p className="text-sm text-zinc-500">ยังไม่มีข้อมูลตัวจริง</p>
          )}

          {starters.map((lineup) => (
            <LineupRow key={lineup.id} lineup={lineup} />
          ))}
        </div>
      </div>

      <div className="mt-6">
        <h3 className="mb-3 font-bold text-zinc-300">
          ตัวสำรอง / ผู้เล่นที่ลงสนาม
        </h3>

        <div className="grid gap-2">
          {substitutes.length === 0 && (
            <p className="text-sm text-zinc-500">ยังไม่มีข้อมูลตัวสำรอง</p>
          )}

          {substitutes.map((lineup) => (
            <LineupRow key={lineup.id} lineup={lineup} />
          ))}
        </div>
      </div>
    </div>
  );
}

function LineupRow({ lineup }: { lineup: Lineup }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-zinc-950 px-4 py-3 text-sm">
      <div>
        <p className="font-bold">
          {lineup.shirt_number ? `#${lineup.shirt_number} ` : ""}
          {playerName(lineup.player)}
        </p>
        <p className="text-xs text-zinc-500">{lineup.position || "-"}</p>
      </div>

      <div className="text-right text-xs text-zinc-400">
        <p>
          {lineup.minute_in ?? 0}' - {lineup.minute_out ?? "-"}'
        </p>
        <p>{lineup.minutes_played ?? 0} นาที</p>
      </div>
    </div>
  );
}
