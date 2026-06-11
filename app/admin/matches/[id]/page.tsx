import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

type SupabaseRelation<T> = T | T[] | null;

type Team = {
  id: string;
  name: string;
  short_name: string | null;
};

type Competition = {
  name: string;
  slug: string | null;
};

type MatchSeason = {
  id: string;
  name: string;
  year: number | null;
  competition: Competition | null;
};

type MatchSeasonQueryRow = Omit<MatchSeason, "competition"> & {
  competition: SupabaseRelation<Competition>;
};

type Match = {
  id: string;
  season_id: string;
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

type TimelineItem =
  | {
      id: string;
      minute: number;
      extra_minute: number;
      type: "event";
      data: MatchEvent;
    }
  | {
      id: string;
      minute: number;
      extra_minute: number;
      type: "substitution";
      data: Substitution;
    };

const statusRail = [
  { key: "scheduled", label: "Scheduled" },
  { key: "team_sheet_open", label: "Team Sheet" },
  { key: "ready_to_play", label: "Ready" },
  { key: "live", label: "Live" },
  { key: "fulltime", label: "Fulltime" },
  { key: "report_review", label: "Review" },
  { key: "official", label: "Official" },
  { key: "locked", label: "Locked" },
];

const tabLinks = [
  ["overview", "Overview"],
  ["team-sheets", "Team Sheets"],
  ["events", "Events"],
  ["result", "Result"],
  ["report", "Report"],
  ["statistics", "Statistics"],
  ["officials", "Officials"],
  ["fantasy-impact", "Fantasy Impact"],
] as const;

function normalizeRelation<T>(relation: SupabaseRelation<T>): T | null {
  return Array.isArray(relation) ? relation[0] || null : relation;
}

function normalizeMatchSeason(season: SupabaseRelation<MatchSeasonQueryRow>) {
  const value = normalizeRelation(season);

  if (!value) return null;

  return {
    ...value,
    competition: normalizeRelation(value.competition),
  };
}

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function playerName(player?: Person | null) {
  if (!player) return "Unknown player";

  const fullName = [player.first_name, player.last_name]
    .filter(Boolean)
    .join(" ");

  return player.nickname || fullName || "Unknown player";
}

function teamName(team?: Team | TeamName | null) {
  return team?.short_name || team?.name || "Team";
}

function minuteText(minute: number | null, extraMinute?: number | null) {
  if (minute === null || minute === undefined) return "-";

  if (extraMinute && extraMinute > 0) {
    return `${minute}+${extraMinute}'`;
  }

  return `${minute}'`;
}

function eventLabel(type: string) {
  const labels: Record<string, string> = {
    goal: "Goal",
    assist: "Assist",
    own_goal: "Own Goal",
    penalty_goal: "Penalty Goal",
    penalty_missed: "Penalty Missed",
    yellow_card: "Yellow Card",
    red_card: "Red Card",
    second_yellow_red: "Second Yellow Red",
    injury: "Injury",
    match_delay: "Match Delay",
    match_suspended: "Match Suspended",
  };

  return labels[type] || type.replaceAll("_", " ");
}

function normalizeStatus(status: string | null) {
  if (status === "finished") return "fulltime";
  return status || "scheduled";
}

function scoreText(home: number | null, away: number | null) {
  const homeScore = home ?? "-";
  const awayScore = away ?? "-";

  return `${homeScore} - ${awayScore}`;
}

function splitLineupsByTeam(lineups: Lineup[], teamId: string) {
  const teamLineups = lineups.filter((lineup) => lineup.team_id === teamId);

  return {
    starters: teamLineups.filter((lineup) => lineup.is_starter),
    substitutes: teamLineups.filter((lineup) => !lineup.is_starter),
  };
}

function calculateEventScore(
  events: MatchEvent[],
  match: Pick<Match, "home_team_id" | "away_team_id">
) {
  return events.reduce(
    (score, event) => {
      if (event.event_type === "goal" || event.event_type === "penalty_goal") {
        if (event.team_id === match.home_team_id) score.home += 1;
        if (event.team_id === match.away_team_id) score.away += 1;
      }

      if (event.event_type === "own_goal") {
        if (event.team_id === match.home_team_id) score.away += 1;
        if (event.team_id === match.away_team_id) score.home += 1;
      }

      return score;
    },
    { home: 0, away: 0 }
  );
}

function countEvents(events: MatchEvent[], eventTypes: string[]) {
  return events.filter((event) => eventTypes.includes(event.event_type)).length;
}

function uniquePlayerCount(lineups: Lineup[]) {
  return new Set(lineups.map((lineup) => lineup.player_id)).size;
}

function totalMinutes(lineups: Lineup[]) {
  return lineups.reduce((total, lineup) => total + (lineup.minutes_played || 0), 0);
}

export default async function AdminMatchCenterPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const { data: matchData, error: matchError } = await supabase
    .from("matches")
    .select(`
      id,
      season_id,
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
        id,
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

  const [
    { data: eventData, error: eventError },
    { data: substitutionData, error: substitutionError },
    { data: lineupData, error: lineupError },
  ] = await Promise.all([
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
  const eventScore = calculateEventScore(events, match);
  const currentStatus = normalizeStatus(match.status);

  const timeline: TimelineItem[] = [
    ...events.map((event) => ({
      id: `event-${event.id}`,
      minute: event.minute || 0,
      extra_minute: event.extra_minute || 0,
      type: "event" as const,
      data: event,
    })),
    ...substitutions.map((substitution) => ({
      id: `sub-${substitution.id}`,
      minute: substitution.minute || 0,
      extra_minute: substitution.extra_minute || 0,
      type: "substitution" as const,
      data: substitution,
    })),
  ].sort((a, b) => {
    if (a.minute !== b.minute) return a.minute - b.minute;
    return a.extra_minute - b.extra_minute;
  });

  const readWarnings = [
    eventError ? `Events: ${eventError.message}` : "",
    substitutionError ? `Substitutions: ${substitutionError.message}` : "",
    lineupError ? `Team sheets: ${lineupError.message}` : "",
  ].filter(Boolean);

  return (
    <main className="mx-auto max-w-7xl px-5 py-8 md:px-6 md:py-10">
      <div className="mb-6 flex flex-col gap-4 border-b border-white/10 pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.28em] text-red-300">
            Match Center / Read Only
          </p>
          <h1 className="mt-3 text-4xl font-black text-white md:text-5xl">
            {teamName(match.home_team)} vs {teamName(match.away_team)}
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-zinc-400">
            {match.season?.competition?.name || "Competition"} /{" "}
            {match.season?.name || "Season"}{" "}
            {match.season?.year ? match.season.year : ""} / Matchday{" "}
            {match.matchday || "-"}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            href="/admin/matches"
            className="rounded-xl border border-white/10 px-4 py-3 text-sm font-black text-zinc-200 hover:bg-white/10"
          >
            Back to Fixtures
          </Link>
          <Link
            href={`/matches/${match.id}`}
            className="rounded-xl border border-red-300/30 bg-red-400/10 px-4 py-3 text-sm font-black text-red-100 hover:bg-red-400/20"
          >
            Public Match Page
          </Link>
        </div>
      </div>

      {readWarnings.length ? (
        <div className="mb-6 rounded-2xl border border-yellow-300/30 bg-yellow-300/10 p-4 text-sm text-yellow-100">
          <p className="font-black">Read warnings</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            {readWarnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <section
        id="overview"
        className="rounded-3xl border border-white/10 bg-[linear-gradient(135deg,rgba(127,29,29,0.34),rgba(9,9,11,0.94))] p-6 shadow-[0_26px_90px_rgba(0,0,0,0.32)] md:p-8"
      >
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 text-sm text-zinc-300">
          <span>{match.match_date || "No date"}</span>
          <span>{match.kickoff_time?.slice(0, 5) || "--:--"}</span>
          <span>{match.venue || "Venue not set"}</span>
          <span>{match.round || "Round not set"}</span>
        </div>

        <div className="grid gap-5 md:grid-cols-[1fr_auto_1fr] md:items-center">
          <TeamBlock team={match.home_team} align="right" />
          <div className="rounded-3xl bg-white px-8 py-5 text-center text-4xl font-black text-zinc-950">
            {scoreText(match.home_score, match.away_score)}
          </div>
          <TeamBlock team={match.away_team} />
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-4">
          <MetricCard label="Match Status" value={match.status || "scheduled"} />
          <MetricCard label="Duration" value={`${match.match_duration || 80} min`} />
          <MetricCard label="Events" value={String(timeline.length)} />
          <MetricCard label="Players Used" value={String(uniquePlayerCount(lineups))} />
        </div>
      </section>

      <nav className="sticky top-[72px] z-20 mt-5 overflow-x-auto border-y border-white/10 bg-zinc-950/90 py-3 backdrop-blur">
        <div className="flex min-w-max gap-2">
          {tabLinks.map(([id, label]) => (
            <a
              key={id}
              href={`#${id}`}
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-black uppercase tracking-[0.14em] text-zinc-300 hover:border-red-300/50 hover:text-white"
            >
              {label}
            </a>
          ))}
        </div>
      </nav>

      <StatusRail currentStatus={currentStatus} />

      <div className="mt-8 grid gap-8 xl:grid-cols-[1fr_320px]">
        <div className="space-y-8">
          <Section title="Overview" subtitle="Fixture facts from the current match record.">
            <div className="grid gap-4 md:grid-cols-2">
              <InfoRow label="Season" value={`${match.season?.name || "-"} ${match.season?.year || ""}`} />
              <InfoRow label="Competition" value={match.season?.competition?.name || "-"} />
              <InfoRow label="Fixture ID" value={match.id} />
              <InfoRow label="Season ID" value={match.season_id} />
              <InfoRow label="Home Team" value={match.home_team?.name || "-"} />
              <InfoRow label="Away Team" value={match.away_team?.name || "-"} />
            </div>
          </Section>

          <Section
            id="team-sheets"
            title="Team Sheets"
            subtitle="Existing lineup data only. Editing remains in Admin / Lineups for now."
          >
            <div className="grid gap-5 lg:grid-cols-2">
              <LineupCard
                title={match.home_team?.name || "Home Team"}
                starters={homeLineups.starters}
                substitutes={homeLineups.substitutes}
              />
              <LineupCard
                title={match.away_team?.name || "Away Team"}
                starters={awayLineups.starters}
                substitutes={awayLineups.substitutes}
              />
            </div>
          </Section>

          <Section
            id="events"
            title="Events"
            subtitle="Timeline from existing match events and substitutions."
          >
            <Timeline timeline={timeline} />
          </Section>

          <Section
            id="result"
            title="Result"
            subtitle="Current stored score compared with event-derived score."
          >
            <div className="grid gap-4 md:grid-cols-3">
              <MetricCard
                label="Stored Score"
                value={scoreText(match.home_score, match.away_score)}
              />
              <MetricCard
                label="Event-Derived Score"
                value={`${eventScore.home} - ${eventScore.away}`}
              />
              <MetricCard label="Status" value={match.status || "scheduled"} />
            </div>
          </Section>

          <PlaceholderSection
            id="report"
            title="Report"
            body="Match report writing and approval will be added after the data model is approved."
          />

          <Section
            id="statistics"
            title="Statistics"
            subtitle="Derived summary from existing lineups, events, and substitutions."
          >
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <MetricCard label="Goals" value={String(countEvents(events, ["goal", "penalty_goal"]))} />
              <MetricCard label="Own Goals" value={String(countEvents(events, ["own_goal"]))} />
              <MetricCard label="Cards" value={String(countEvents(events, ["yellow_card", "red_card", "second_yellow_red"]))} />
              <MetricCard label="Substitutions" value={String(substitutions.length)} />
              <MetricCard label="Lineup Rows" value={String(lineups.length)} />
              <MetricCard label="Starters" value={String(lineups.filter((row) => row.is_starter).length)} />
              <MetricCard label="Players Used" value={String(uniquePlayerCount(lineups))} />
              <MetricCard label="Total Minutes" value={String(totalMinutes(lineups))} />
            </div>
          </Section>

          <PlaceholderSection
            id="officials"
            title="Officials"
            body="Officials are not wired to existing data yet. This tab is reserved for referee and match commissioner records."
          />

          <PlaceholderSection
            id="fantasy-impact"
            title="Fantasy Impact"
            body="Fantasy preview will remain read-only and coming soon until match events and minutes are official."
          />
        </div>

        <aside className="space-y-4 xl:sticky xl:top-36 xl:self-start">
          <div className="rounded-2xl border border-white/10 bg-zinc-900 p-5">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-red-300">
              Operational Checklist
            </p>
            <div className="mt-4 space-y-3 text-sm">
              <ChecklistItem label="Fixture exists" ok />
              <ChecklistItem label="Home team sheet has 11 starters" ok={homeLineups.starters.length === 11} />
              <ChecklistItem label="Away team sheet has 11 starters" ok={awayLineups.starters.length === 11} />
              <ChecklistItem label="Events loaded" ok={!eventError} />
              <ChecklistItem label="Result has stored score" ok={match.home_score !== null && match.away_score !== null} />
              <ChecklistItem label="Report module" ok={false} muted />
              <ChecklistItem label="Officials module" ok={false} muted />
              <ChecklistItem label="Fantasy impact module" ok={false} muted />
            </div>
          </div>

          <div className="rounded-2xl border border-emerald-300/20 bg-emerald-300/10 p-5 text-sm text-emerald-100">
            <p className="font-black">Read-only shell</p>
            <p className="mt-2 leading-6 text-emerald-100/80">
              This page reads existing match, lineup, event, substitution, and result data only. No save controls are present.
            </p>
          </div>
        </aside>
      </div>
    </main>
  );
}

function TeamBlock({
  team,
  align = "left",
}: {
  team: Team | null;
  align?: "left" | "right";
}) {
  return (
    <div className={cx(align === "right" ? "text-right" : "text-left")}>
      <p className="text-xs font-black uppercase tracking-[0.24em] text-red-200">
        {team?.short_name || "Team"}
      </p>
      <h2 className="mt-2 text-2xl font-black md:text-3xl">
        {team?.name || "Team not set"}
      </h2>
    </div>
  );
}

function StatusRail({ currentStatus }: { currentStatus: string }) {
  const currentIndex = statusRail.findIndex((item) => item.key === currentStatus);

  return (
    <section className="mt-6 rounded-2xl border border-white/10 bg-zinc-900 p-4">
      <div className="grid gap-2 md:grid-cols-4 xl:grid-cols-8">
        {statusRail.map((status, index) => {
          const isCurrent = status.key === currentStatus;
          const isPast = currentIndex >= 0 && index < currentIndex;

          return (
            <div
              key={status.key}
              className={cx(
                "rounded-xl border px-3 py-3 text-center text-xs font-black uppercase tracking-[0.12em]",
                isCurrent
                  ? "border-yellow-200 bg-yellow-300 text-zinc-950"
                  : isPast
                    ? "border-emerald-300/40 bg-emerald-300/10 text-emerald-100"
                    : "border-white/10 bg-zinc-950 text-zinc-500"
              )}
            >
              {status.label}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function Section({
  id,
  title,
  subtitle,
  children,
}: {
  id?: string;
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-32 rounded-3xl border border-white/10 bg-zinc-900 p-5 md:p-6">
      <div className="mb-5">
        <h2 className="text-2xl font-black text-white">{title}</h2>
        <p className="mt-2 text-sm leading-6 text-zinc-400">{subtitle}</p>
      </div>
      {children}
    </section>
  );
}

function PlaceholderSection({
  id,
  title,
  body,
}: {
  id: string;
  title: string;
  body: string;
}) {
  return (
    <Section id={id} title={title} subtitle="Coming Soon / read-only placeholder.">
      <div className="rounded-2xl border border-dashed border-white/15 bg-zinc-950 p-8 text-center">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-zinc-500">
          Coming Soon
        </p>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-zinc-400">
          {body}
        </p>
      </div>
    </Section>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-zinc-950 p-4">
      <p className="text-xs font-black uppercase tracking-[0.16em] text-zinc-500">
        {label}
      </p>
      <p className="mt-2 break-words text-sm font-bold text-zinc-100">{value}</p>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-zinc-950 p-4">
      <p className="text-xs font-black uppercase tracking-[0.16em] text-zinc-500">
        {label}
      </p>
      <p className="mt-2 text-2xl font-black text-white">{value}</p>
    </div>
  );
}

function ChecklistItem({
  label,
  ok,
  muted = false,
}: {
  label: string;
  ok: boolean;
  muted?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className={muted ? "text-zinc-500" : "text-zinc-300"}>{label}</span>
      <span
        className={cx(
          "rounded-full border px-2 py-1 text-[10px] font-black uppercase tracking-[0.12em]",
          ok
            ? "border-emerald-300/40 bg-emerald-300/10 text-emerald-100"
            : muted
              ? "border-zinc-700 bg-zinc-950 text-zinc-500"
              : "border-yellow-300/40 bg-yellow-300/10 text-yellow-100"
        )}
      >
        {ok ? "OK" : muted ? "Soon" : "Check"}
      </span>
    </div>
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
    <div className="rounded-2xl border border-white/10 bg-zinc-950 p-5">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-xl font-black">{title}</h3>
        <span className="rounded-full border border-white/10 px-3 py-1 text-xs font-black text-zinc-300">
          {starters.length} starters
        </span>
      </div>

      <LineupGroup title="Starters" rows={starters} emptyText="No starters found." />
      <LineupGroup
        title="Substitutes / Used Players"
        rows={substitutes}
        emptyText="No substitutes found."
      />
    </div>
  );
}

function LineupGroup({
  title,
  rows,
  emptyText,
}: {
  title: string;
  rows: Lineup[];
  emptyText: string;
}) {
  return (
    <div className="mt-5">
      <p className="mb-3 text-sm font-black uppercase tracking-[0.16em] text-red-300">
        {title}
      </p>
      <div className="grid gap-2">
        {rows.length ? (
          rows.map((lineup) => <LineupRow key={lineup.id} lineup={lineup} />)
        ) : (
          <p className="rounded-xl border border-dashed border-white/10 p-4 text-sm text-zinc-500">
            {emptyText}
          </p>
        )}
      </div>
    </div>
  );
}

function LineupRow({ lineup }: { lineup: Lineup }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-zinc-900 px-4 py-3 text-sm">
      <div>
        <p className="font-bold">
          {lineup.shirt_number ? `#${lineup.shirt_number} ` : ""}
          {playerName(lineup.player)}
        </p>
        <p className="text-xs text-zinc-500">{lineup.position || "-"}</p>
      </div>

      <div className="text-right text-xs text-zinc-400">
        <p>{`${lineup.minute_in ?? 0}' - ${lineup.minute_out ?? "-"}'`}</p>
        <p>{lineup.minutes_played ?? 0} min</p>
      </div>
    </div>
  );
}

function Timeline({ timeline }: { timeline: TimelineItem[] }) {
  if (!timeline.length) {
    return (
      <div className="rounded-2xl border border-dashed border-white/15 bg-zinc-950 p-8 text-center text-sm text-zinc-500">
        No events or substitutions found for this match.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {timeline.map((item) => {
        if (item.type === "event") {
          const event = item.data;

          return (
            <div
              key={item.id}
              className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-zinc-950 p-4"
            >
              <div>
                <p className="font-black">
                  {eventLabel(event.event_type)} / {playerName(event.player)}
                </p>
                <p className="mt-1 text-sm text-zinc-400">
                  {event.team?.short_name || event.team?.name || "No team"}
                  {event.description ? ` / ${event.description}` : ""}
                </p>
              </div>
              <p className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-black text-red-200">
                {minuteText(event.minute, event.extra_minute)}
              </p>
            </div>
          );
        }

        const substitution = item.data;

        return (
          <div
            key={item.id}
            className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-zinc-950 p-4"
          >
            <div>
              <p className="font-black">Substitution</p>
              <p className="mt-1 text-sm text-zinc-400">
                {substitution.team?.short_name || substitution.team?.name || "No team"} / Out:{" "}
                {playerName(substitution.player_out)} / In:{" "}
                {playerName(substitution.player_in)}
                {substitution.reason ? ` / ${substitution.reason}` : ""}
              </p>
            </div>
            <p className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-black text-red-200">
              {minuteText(substitution.minute, substitution.extra_minute)}
            </p>
          </div>
        );
      })}
    </div>
  );
}
