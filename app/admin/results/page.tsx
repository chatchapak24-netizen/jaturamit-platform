"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase-browser";

type Team = {
  id: string;
  name: string;
  short_name: string | null;
};

type SupabaseRelation<T> = T | T[] | null;

type Season = {
  id: string;
  name: string;
  year: number | null;
  status: string | null;
  competition: {
    name: string;
  } | null;
};

type SeasonQueryRow = Omit<Season, "competition"> & {
  competition: SupabaseRelation<{ name: string | null }>;
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
  home_team: Team | null;
  away_team: Team | null;
};

type MatchQueryRow = Omit<Match, "home_team" | "away_team"> & {
  home_team: SupabaseRelation<Team>;
  away_team: SupabaseRelation<Team>;
};

type Player = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  nickname: string | null;
};

type RosterPlayer = {
  id: string;
  season_id: string;
  team_id: string;
  shirt_number: number | null;
  position: string | null;
  player: Player | null;
};

type RosterPlayerQueryRow = Omit<RosterPlayer, "player"> & {
  player: SupabaseRelation<Player>;
};

type EventTeam = {
  name: string;
  short_name: string | null;
};

type EventPlayer = Omit<Player, "id">;

type MatchEvent = {
  id: string;
  match_id: string;
  team_id: string | null;
  player_id: string | null;
  event_type: string;
  minute: number | null;
  extra_minute: number | null;
  description: string | null;
  team: EventTeam | null;
  player: EventPlayer | null;
};

type MatchEventQueryRow = Omit<MatchEvent, "team" | "player"> & {
  team: SupabaseRelation<EventTeam>;
  player: SupabaseRelation<EventPlayer>;
};

type StandingRow = {
  id: string;
  season_id: string;
  team_id: string;
};

type StandingMatchRow = {
  id: string;
  home_team_id: string;
  away_team_id: string;
  home_score: number | null;
  away_score: number | null;
  status: string | null;
};

function normalizeRelation<T>(relation: SupabaseRelation<T>): T | null {
  return Array.isArray(relation) ? relation[0] || null : relation;
}

function normalizeSeasonCompetition(
  competition: SeasonQueryRow["competition"]
): Season["competition"] {
  const value = normalizeRelation(competition);

  if (!value?.name) {
    return null;
  }

  return { name: value.name };
}

const EVENT_TYPES = [
  { value: "goal", label: "ประตู" },
  { value: "own_goal", label: "เข้าประตูตัวเอง" },
  { value: "yellow_card", label: "ใบเหลือง" },
  { value: "red_card", label: "ใบแดง" },
  { value: "penalty_missed", label: "จุดโทษพลาด" },
];

function playerName(player?: {
  first_name: string | null;
  last_name: string | null;
  nickname: string | null;
} | null) {
  if (!player) return "ไม่ระบุชื่อ";

  const fullName = [player.first_name, player.last_name]
    .filter(Boolean)
    .join(" ");

  return player.nickname || fullName || "ไม่ระบุชื่อ";
}

function eventLabel(type: string) {
  return EVENT_TYPES.find((item) => item.value === type)?.label || type;
}

export default function AdminResultsPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [savingResult, setSavingResult] = useState(false);
  const [savingEvent, setSavingEvent] = useState(false);

  const [seasons, setSeasons] = useState<Season[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [roster, setRoster] = useState<RosterPlayer[]>([]);
  const [events, setEvents] = useState<MatchEvent[]>([]);

  const [selectedSeasonId, setSelectedSeasonId] = useState("");
  const [selectedMatchId, setSelectedMatchId] = useState("");

  const [homeScore, setHomeScore] = useState("");
  const [awayScore, setAwayScore] = useState("");
  const [matchStatus, setMatchStatus] = useState("scheduled");

  const [eventTeamId, setEventTeamId] = useState("");
  const [eventPlayerId, setEventPlayerId] = useState("");
  const [eventType, setEventType] = useState("goal");
  const [eventMinute, setEventMinute] = useState("");
  const [eventExtraMinute, setEventExtraMinute] = useState("");
  const [eventDescription, setEventDescription] = useState("");

  const [message, setMessage] = useState("");
  const [errorText, setErrorText] = useState("");

  const selectedMatch = useMemo(() => {
    return matches.find((match) => match.id === selectedMatchId) || null;
  }, [matches, selectedMatchId]);

  const matchTeams = useMemo(() => {
    if (!selectedMatch) return [];

    return [
      {
        id: selectedMatch.home_team_id,
        name: selectedMatch.home_team?.name || "ทีมเหย้า",
        short_name: selectedMatch.home_team?.short_name,
      },
      {
        id: selectedMatch.away_team_id,
        name: selectedMatch.away_team?.name || "ทีมเยือน",
        short_name: selectedMatch.away_team?.short_name,
      },
    ];
  }, [selectedMatch]);

  const playersInEventTeam = useMemo(() => {
    if (!eventTeamId) return [];
    return roster.filter((item) => item.team_id === eventTeamId);
  }, [roster, eventTeamId]);

  async function checkAdmin() {
    const { data: userData } = await supabaseBrowser.auth.getUser();

    if (!userData.user) {
      router.push("/admin/login");
      return false;
    }

    const { data: adminProfile } = await supabaseBrowser
      .from("admin_users")
      .select("id")
      .eq("auth_user_id", userData.user.id)
      .eq("status", "active")
      .single();

    if (!adminProfile) {
      await supabaseBrowser.auth.signOut();
      router.push("/admin/login");
      return false;
    }

    return true;
  }

  async function loadBaseData() {
    const { data, error } = await supabaseBrowser
      .from("seasons")
      .select(`
        id,
        name,
        year,
        status,
        competition:competition_id(name)
      `)
      .order("year", { ascending: false })
      .order("name", { ascending: true });

    if (error) {
      setErrorText(error.message);
      return "";
    }

    const loadedSeasons: Season[] = ((data || []) as SeasonQueryRow[]).map(
      (season) => ({
        ...season,
        competition: normalizeSeasonCompetition(season.competition),
      })
    );

    setSeasons(loadedSeasons);

    const activeSeason =
      loadedSeasons.find((season) => season.status === "active") ||
      loadedSeasons[0];

    if (activeSeason) {
      setSelectedSeasonId(activeSeason.id);
      return activeSeason.id;
    }

    return "";
  }

  async function loadMatches(seasonId: string) {
    if (!seasonId) {
      setMatches([]);
      return;
    }

    const { data, error } = await supabaseBrowser
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
        home_team:home_team_id(id, name, short_name),
        away_team:away_team_id(id, name, short_name)
      `)
      .eq("season_id", seasonId)
      .order("match_date", { ascending: true })
      .order("kickoff_time", { ascending: true });

    if (error) {
      setErrorText(error.message);
      return;
    }

    const loadedMatches: Match[] = ((data || []) as MatchQueryRow[]).map(
      (match) => ({
        ...match,
        home_team: normalizeRelation(match.home_team),
        away_team: normalizeRelation(match.away_team),
      })
    );

    setMatches(loadedMatches);
  }

  async function loadRoster(seasonId: string) {
    if (!seasonId) {
      setRoster([]);
      return;
    }

    const { data, error } = await supabaseBrowser
      .from("season_players")
      .select(`
        id,
        season_id,
        team_id,
        shirt_number,
        position,
        player:player_id(id, first_name, last_name, nickname)
      `)
      .eq("season_id", seasonId)
      .order("team_id", { ascending: true })
      .order("shirt_number", { ascending: true });

    if (error) {
      setErrorText(error.message);
      return;
    }

    const loadedRoster: RosterPlayer[] = (
      (data || []) as RosterPlayerQueryRow[]
    ).map((item) => ({
      ...item,
      player: normalizeRelation(item.player),
    }));

    setRoster(loadedRoster);
  }

  async function loadEvents(matchId: string) {
    if (!matchId) {
      setEvents([]);
      return;
    }

    const { data, error } = await supabaseBrowser
      .from("match_events")
      .select(`
        id,
        match_id,
        team_id,
        player_id,
        event_type,
        minute,
        extra_minute,
        description,
        team:team_id(name, short_name),
        player:player_id(first_name, last_name, nickname)
      `)
      .eq("match_id", matchId)
      .order("minute", { ascending: true })
      .order("extra_minute", { ascending: true });

    if (error) {
      setErrorText(error.message);
      return;
    }

    const loadedEvents: MatchEvent[] = (
      (data || []) as MatchEventQueryRow[]
    ).map((event) => ({
      ...event,
      team: normalizeRelation(event.team),
      player: normalizeRelation(event.player),
    }));

    setEvents(loadedEvents);
  }

  useEffect(() => {
    async function init() {
      setLoading(true);

      const isAdmin = await checkAdmin();
      if (!isAdmin) return;

      const defaultSeasonId = await loadBaseData();
      await Promise.all([loadMatches(defaultSeasonId), loadRoster(defaultSeasonId)]);

      setLoading(false);
    }

    init();
  }, []);

  async function handleSeasonChange(seasonId: string) {
    setSelectedSeasonId(seasonId);
    setSelectedMatchId("");
    setEvents([]);
    setHomeScore("");
    setAwayScore("");
    setMatchStatus("scheduled");
    setEventTeamId("");
    setEventPlayerId("");
    setMessage("");
    setErrorText("");

    await Promise.all([loadMatches(seasonId), loadRoster(seasonId)]);
  }

  async function handleMatchChange(matchId: string) {
    setSelectedMatchId(matchId);
    setMessage("");
    setErrorText("");
    setEventTeamId("");
    setEventPlayerId("");

    const match = matches.find((item) => item.id === matchId);

    if (match) {
      setHomeScore(
        match.home_score === null || match.home_score === undefined
          ? ""
          : String(match.home_score)
      );
      setAwayScore(
        match.away_score === null || match.away_score === undefined
          ? ""
          : String(match.away_score)
      );
      setMatchStatus(match.status || "scheduled");
    }

    await loadEvents(matchId);
  }

  async function saveMatchResult() {
    setMessage("");
    setErrorText("");

    if (!selectedMatch) {
      setErrorText("กรุณาเลือกแมตช์");
      return;
    }

    const parsedHomeScore = homeScore === "" ? null : Number(homeScore);
    const parsedAwayScore = awayScore === "" ? null : Number(awayScore);

    if (
      (parsedHomeScore !== null && Number.isNaN(parsedHomeScore)) ||
      (parsedAwayScore !== null && Number.isNaN(parsedAwayScore))
    ) {
      setErrorText("สกอร์ต้องเป็นตัวเลข");
      return;
    }

    setSavingResult(true);

    const { error } = await supabaseBrowser
      .from("matches")
      .update({
        home_score: parsedHomeScore,
        away_score: parsedAwayScore,
        status: matchStatus,
      })
      .eq("id", selectedMatch.id);

    if (error) {
      setErrorText(error.message);
      setSavingResult(false);
      return;
    }

    await recalculateStandings(selectedSeasonId);
    await loadMatches(selectedSeasonId);

    setMessage("บันทึกผลการแข่งขันและคำนวณตารางคะแนนเรียบร้อยแล้ว");
    setSavingResult(false);
  }

  async function addEvent(e: React.FormEvent) {
    e.preventDefault();

    setMessage("");
    setErrorText("");

    if (!selectedMatch) {
      setErrorText("กรุณาเลือกแมตช์");
      return;
    }

    if (!eventTeamId) {
      setErrorText("กรุณาเลือกทีมของเหตุการณ์");
      return;
    }

    const parsedMinute = eventMinute === "" ? null : Number(eventMinute);
    const parsedExtraMinute =
      eventExtraMinute === "" ? null : Number(eventExtraMinute);

    if (
      (parsedMinute !== null && Number.isNaN(parsedMinute)) ||
      (parsedExtraMinute !== null && Number.isNaN(parsedExtraMinute))
    ) {
      setErrorText("นาทีต้องเป็นตัวเลข");
      return;
    }

    setSavingEvent(true);

    const { error } = await supabaseBrowser.from("match_events").insert({
      match_id: selectedMatch.id,
      team_id: eventTeamId,
      player_id: eventPlayerId || null,
      event_type: eventType,
      minute: parsedMinute,
      extra_minute: parsedExtraMinute,
      description: eventDescription || null,
    });

    if (error) {
      setErrorText(error.message);
      setSavingEvent(false);
      return;
    }

    setEventPlayerId("");
    setEventType("goal");
    setEventMinute("");
    setEventExtraMinute("");
    setEventDescription("");

    await loadEvents(selectedMatch.id);

    setMessage("เพิ่มเหตุการณ์ในเกมเรียบร้อยแล้ว");
    setSavingEvent(false);
  }

  async function deleteEvent(eventId: string) {
    const ok = window.confirm("ต้องการลบเหตุการณ์นี้ใช่ไหม?");
    if (!ok) return;

    setMessage("");
    setErrorText("");

    const { error } = await supabaseBrowser
      .from("match_events")
      .delete()
      .eq("id", eventId);

    if (error) {
      setErrorText(error.message);
      return;
    }

    if (selectedMatch) {
      await loadEvents(selectedMatch.id);
    }

    setMessage("ลบเหตุการณ์เรียบร้อยแล้ว");
  }

  async function recalculateStandings(seasonId: string) {
    if (!seasonId) return;

    const [seasonTeamsResult, matchesResult, standingsResult] =
      await Promise.all([
        supabaseBrowser
          .from("season_teams")
          .select("team_id")
          .eq("season_id", seasonId),

        supabaseBrowser
          .from("matches")
          .select("id, home_team_id, away_team_id, home_score, away_score, status")
          .eq("season_id", seasonId)
          .eq("status", "finished"),

        supabaseBrowser
          .from("standings")
          .select("id, season_id, team_id")
          .eq("season_id", seasonId),
      ]);

    if (seasonTeamsResult.error) {
      setErrorText(seasonTeamsResult.error.message);
      return;
    }

    if (matchesResult.error) {
      setErrorText(matchesResult.error.message);
      return;
    }

    if (standingsResult.error) {
      setErrorText(standingsResult.error.message);
      return;
    }

    const teamIds = (seasonTeamsResult.data || []).map(
      (item: { team_id: string }) => item.team_id
    );

    const table = new Map<
      string,
      {
        played: number;
        won: number;
        drawn: number;
        lost: number;
        goals_for: number;
        goals_against: number;
        goal_difference: number;
        points: number;
      }
    >();

    teamIds.forEach((teamId) => {
      table.set(teamId, {
        played: 0,
        won: 0,
        drawn: 0,
        lost: 0,
        goals_for: 0,
        goals_against: 0,
        goal_difference: 0,
        points: 0,
      });
    });

    ((matchesResult.data || []) as StandingMatchRow[]).forEach((match) => {
      if (
        match.home_score === null ||
        match.home_score === undefined ||
        match.away_score === null ||
        match.away_score === undefined
      ) {
        return;
      }

      if (!table.has(match.home_team_id)) {
        table.set(match.home_team_id, {
          played: 0,
          won: 0,
          drawn: 0,
          lost: 0,
          goals_for: 0,
          goals_against: 0,
          goal_difference: 0,
          points: 0,
        });
      }

      if (!table.has(match.away_team_id)) {
        table.set(match.away_team_id, {
          played: 0,
          won: 0,
          drawn: 0,
          lost: 0,
          goals_for: 0,
          goals_against: 0,
          goal_difference: 0,
          points: 0,
        });
      }

      const home = table.get(match.home_team_id)!;
      const away = table.get(match.away_team_id)!;

      home.played += 1;
      away.played += 1;

      home.goals_for += match.home_score;
      home.goals_against += match.away_score;

      away.goals_for += match.away_score;
      away.goals_against += match.home_score;

      if (match.home_score > match.away_score) {
        home.won += 1;
        home.points += 3;
        away.lost += 1;
      } else if (match.home_score < match.away_score) {
        away.won += 1;
        away.points += 3;
        home.lost += 1;
      } else {
        home.drawn += 1;
        away.drawn += 1;
        home.points += 1;
        away.points += 1;
      }
    });

    const existingStandings = (standingsResult.data || []) as StandingRow[];

    for (const [teamId, stats] of table.entries()) {
      const payload = {
        played: stats.played,
        won: stats.won,
        drawn: stats.drawn,
        lost: stats.lost,
        goals_for: stats.goals_for,
        goals_against: stats.goals_against,
        goal_difference: stats.goals_for - stats.goals_against,
        points: stats.points,
      };

      const existing = existingStandings.find((row) => row.team_id === teamId);

      if (existing) {
        const { error } = await supabaseBrowser
          .from("standings")
          .update(payload)
          .eq("id", existing.id);

        if (error) {
          setErrorText(error.message);
          return;
        }
      } else {
        const { error } = await supabaseBrowser.from("standings").insert({
          season_id: seasonId,
          team_id: teamId,
          ...payload,
        });

        if (error) {
          setErrorText(error.message);
          return;
        }
      }
    }
  }

  if (loading) {
    return (
      <main className="mx-auto max-w-6xl px-6 py-10">
        <p className="text-zinc-400">กำลังโหลดข้อมูล...</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <div className="mb-8">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-red-300">
          Admin / Results
        </p>
        <h1 className="mt-2 text-4xl font-black">ใส่ผลการแข่งขัน</h1>
        <p className="mt-3 text-zinc-400">
          เลือกซีซั่น เลือกแมตช์ ใส่สกอร์ และบันทึกเหตุการณ์ในเกม
        </p>
      </div>

      {message && (
        <div className="mb-6 rounded-2xl border border-green-500/40 bg-green-950/40 p-4 text-green-200">
          {message}
        </div>
      )}

      {errorText && (
        <div className="mb-6 rounded-2xl border border-red-500/40 bg-red-950/40 p-4 text-red-200">
          {errorText}
        </div>
      )}

      <section className="rounded-3xl border border-white/10 bg-zinc-900 p-6">
        <h2 className="text-2xl font-black">เลือกซีซั่นและแมตช์</h2>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm text-zinc-400">ซีซั่น</label>
            <select
              value={selectedSeasonId}
              onChange={(e) => handleSeasonChange(e.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-zinc-950 px-4 py-3 text-white outline-none focus:border-red-400"
            >
              <option value="">เลือกซีซั่น</option>
              {seasons.map((season) => (
                <option key={season.id} value={season.id}>
                  {season.competition?.name} — {season.name} —{" "}
                  {season.year || "-"} — {season.status}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm text-zinc-400">แมตช์</label>
            <select
              value={selectedMatchId}
              onChange={(e) => handleMatchChange(e.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-zinc-950 px-4 py-3 text-white outline-none focus:border-red-400"
            >
              <option value="">เลือกแมตช์</option>
              {matches.map((match) => (
                <option key={match.id} value={match.id}>
                  นัดที่ {match.matchday || "-"} · {match.match_date}{" "}
                  {match.kickoff_time?.slice(0, 5)} ·{" "}
                  {match.home_team?.short_name || match.home_team?.name} vs{" "}
                  {match.away_team?.short_name || match.away_team?.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      {selectedMatch && (
        <>
          <section className="mt-6 rounded-3xl border border-white/10 bg-zinc-900 p-6">
            <h2 className="text-2xl font-black">บันทึกผลการแข่งขัน</h2>

            <div className="mt-4 rounded-2xl border border-white/10 bg-zinc-950 p-5">
              <p className="text-sm text-zinc-400">
                นัดที่ {selectedMatch.matchday || "-"} ·{" "}
                {selectedMatch.match_date} ·{" "}
                {selectedMatch.kickoff_time?.slice(0, 5)} น.
              </p>

              <h3 className="mt-2 text-2xl font-black">
                {selectedMatch.home_team?.name} vs{" "}
                {selectedMatch.away_team?.name}
              </h3>

              <p className="mt-1 text-sm text-zinc-500">
                {selectedMatch.venue || "-"}
              </p>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-3">
              <ScoreField
                label={selectedMatch.home_team?.short_name || "ทีมเหย้า"}
                value={homeScore}
                onChange={setHomeScore}
              />

              <ScoreField
                label={selectedMatch.away_team?.short_name || "ทีมเยือน"}
                value={awayScore}
                onChange={setAwayScore}
              />

              <div>
                <label className="mb-2 block text-sm text-zinc-400">
                  สถานะ
                </label>
                <select
                  value={matchStatus}
                  onChange={(e) => setMatchStatus(e.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-zinc-950 px-4 py-3 text-white outline-none focus:border-red-400"
                >
                  <option value="scheduled">scheduled</option>
                  <option value="live">live</option>
                  <option value="finished">finished</option>
                  <option value="postponed">postponed</option>
                  <option value="cancelled">cancelled</option>
                </select>
              </div>
            </div>

            <button
              onClick={saveMatchResult}
              disabled={savingResult}
              className="mt-6 rounded-2xl bg-red-600 px-6 py-3 font-black text-white hover:bg-red-500 disabled:opacity-50"
            >
              {savingResult
                ? "กำลังบันทึก..."
                : "บันทึกผลและคำนวณตารางคะแนน"}
            </button>
          </section>

          <section className="mt-6 rounded-3xl border border-white/10 bg-zinc-900 p-6">
            <h2 className="text-2xl font-black">เพิ่มเหตุการณ์ในเกม</h2>

            <form
              onSubmit={addEvent}
              className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3"
            >
              <div>
                <label className="mb-2 block text-sm text-zinc-400">ทีม</label>
                <select
                  value={eventTeamId}
                  onChange={(e) => {
                    setEventTeamId(e.target.value);
                    setEventPlayerId("");
                  }}
                  className="w-full rounded-2xl border border-white/10 bg-zinc-950 px-4 py-3 text-white outline-none focus:border-red-400"
                >
                  <option value="">เลือกทีม</option>
                  {matchTeams.map((team) => (
                    <option key={team.id} value={team.id}>
                      {team.short_name || team.name} — {team.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm text-zinc-400">
                  นักเตะ
                </label>
                <select
                  value={eventPlayerId}
                  onChange={(e) => setEventPlayerId(e.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-zinc-950 px-4 py-3 text-white outline-none focus:border-red-400"
                >
                  <option value="">ไม่ระบุนักเตะ</option>
                  {playersInEventTeam.map((item) => (
                    <option key={item.player?.id} value={item.player?.id}>
                      {item.shirt_number ? `#${item.shirt_number} ` : ""}
                      {playerName(item.player)}{" "}
                      {item.position ? `(${item.position})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm text-zinc-400">
                  ประเภทเหตุการณ์
                </label>
                <select
                  value={eventType}
                  onChange={(e) => setEventType(e.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-zinc-950 px-4 py-3 text-white outline-none focus:border-red-400"
                >
                  {EVENT_TYPES.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </div>

              <ScoreField
                label="นาที"
                value={eventMinute}
                onChange={setEventMinute}
              />

              <ScoreField
                label="ทดเวลา"
                value={eventExtraMinute}
                onChange={setEventExtraMinute}
              />

              <div>
                <label className="mb-2 block text-sm text-zinc-400">
                  รายละเอียด
                </label>
                <input
                  type="text"
                  value={eventDescription}
                  onChange={(e) => setEventDescription(e.target.value)}
                  placeholder="เช่น ยิงไกล / โหม่ง / ฟาวล์หนัก"
                  className="w-full rounded-2xl border border-white/10 bg-zinc-950 px-4 py-3 text-white outline-none focus:border-red-400"
                />
              </div>

              <div className="lg:col-span-3">
                <button
                  type="submit"
                  disabled={savingEvent}
                  className="rounded-2xl bg-red-600 px-6 py-3 font-black text-white hover:bg-red-500 disabled:opacity-50"
                >
                  {savingEvent ? "กำลังเพิ่ม..." : "เพิ่มเหตุการณ์"}
                </button>
              </div>
            </form>
          </section>

          <section className="mt-6 rounded-3xl border border-white/10 bg-zinc-900 p-6">
            <h2 className="text-2xl font-black">เหตุการณ์ในเกม</h2>

            <div className="mt-6 grid gap-3">
              {events.map((event) => (
                <div
                  key={event.id}
                  className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-zinc-950 p-4 md:flex-row md:items-center md:justify-between"
                >
                  <div>
                    <p className="font-black">
                      {event.minute ?? "-"}
                      {event.extra_minute ? `+${event.extra_minute}` : ""}
                      {"'"} ·{" "}
                      {eventLabel(event.event_type)} ·{" "}
                      {playerName(event.player)}
                    </p>
                    <p className="mt-1 text-sm text-zinc-500">
                      {event.team?.short_name || event.team?.name}
                      {event.description ? ` · ${event.description}` : ""}
                    </p>
                  </div>

                  <button
                    onClick={() => deleteEvent(event.id)}
                    className="text-sm font-bold text-red-300 hover:text-red-200"
                  >
                    ลบ
                  </button>
                </div>
              ))}

              {events.length === 0 && (
                <div className="rounded-2xl border border-dashed border-white/15 p-8 text-center text-zinc-500">
                  ยังไม่มีเหตุการณ์ในเกม
                </div>
              )}
            </div>
          </section>
        </>
      )}
    </main>
  );
}

function ScoreField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm text-zinc-400">{label}</label>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-2xl border border-white/10 bg-zinc-950 px-4 py-3 text-white outline-none focus:border-red-400"
      />
    </div>
  );
}
