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

type SeasonCompetitionRelation = SupabaseRelation<{ name: string | null }>;

type SeasonQueryRow = Omit<Season, "competition"> & {
  competition: SeasonCompetitionRelation;
};

type Match = {
  id: string;
  season_id: string;
  match_date: string;
  kickoff_time: string;
  matchday: number | null;
  match_duration: number | null;
  home_team_id: string;
  away_team_id: string;
  home_team: Team | null;
  away_team: Team | null;
};

type MatchQueryRow = Omit<Match, "home_team" | "away_team"> & {
  home_team: SupabaseRelation<Team>;
  away_team: SupabaseRelation<Team>;
};

type RosterPlayer = {
  id: string;
  season_id: string;
  team_id: string;
  shirt_number: number | null;
  position: string | null;
  player: Player | null;
};

type Player = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  nickname: string | null;
};

type RosterPlayerQueryRow = Omit<RosterPlayer, "player"> & {
  player: SupabaseRelation<Player>;
};

type LineupRow = {
  player_id: string;
  team_id: string;
  shirt_number: number | null;
  position: string | null;
  is_starter: boolean;
  minute_in: string;
  minute_out: string;
};

type SubstitutionRow = {
  temp_id: string;
  team_id: string;
  player_out_id: string;
  player_in_id: string;
  minute: string;
  extra_minute: string;
  reason: string;
};

function createSubstitution(teamId = ""): SubstitutionRow {
  return {
    temp_id: crypto.randomUUID(),
    team_id: teamId,
    player_out_id: "",
    player_in_id: "",
    minute: "",
    extra_minute: "",
    reason: "",
  };
}

function playerDisplayName(item: RosterPlayer) {
  const number = item.shirt_number ? `#${item.shirt_number}` : "ไม่มีเบอร์";
  const nickname = item.player?.nickname;
  const fullName = [item.player?.first_name, item.player?.last_name]
    .filter(Boolean)
    .join(" ");

  return `${number} ${nickname || fullName || "ไม่ระบุชื่อ"}`;
}

function normalizeSeasonCompetition(
  competition: SeasonCompetitionRelation
): Season["competition"] {
  const value = Array.isArray(competition) ? competition[0] : competition;

  if (!value?.name) {
    return null;
  }

  return { name: value.name };
}

function normalizeRelation<T>(relation: SupabaseRelation<T>): T | null {
  return Array.isArray(relation) ? relation[0] || null : relation;
}

export default function AdminLineupsPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [seasons, setSeasons] = useState<Season[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [roster, setRoster] = useState<RosterPlayer[]>([]);

  const [selectedSeasonId, setSelectedSeasonId] = useState("");
  const [selectedMatchId, setSelectedMatchId] = useState("");
  const [selectedTeamId, setSelectedTeamId] = useState("");

  const [lineups, setLineups] = useState<LineupRow[]>([]);
  const [substitutions, setSubstitutions] = useState<SubstitutionRow[]>([]);

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

  const teamRoster = useMemo(() => {
    if (!selectedTeamId) return [];
    return roster.filter((item) => item.team_id === selectedTeamId);
  }, [roster, selectedTeamId]);

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
        matchday,
        match_duration,
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

  async function loadExistingLineups(matchId: string, teamId: string) {
    const { data, error } = await supabaseBrowser
      .from("match_lineups")
      .select("*")
      .eq("match_id", matchId)
      .eq("team_id", teamId);

    if (error) {
      setErrorText(error.message);
      return;
    }

    const existing = data || [];

    const rows: LineupRow[] = teamRoster.map((item) => {
      const found = existing.find((row: any) => row.player_id === item.player?.id);

      return {
        player_id: item.player?.id || "",
        team_id: item.team_id,
        shirt_number: item.shirt_number,
        position: item.position,
        is_starter: found?.is_starter || false,
        minute_in:
          found?.minute_in !== undefined && found?.minute_in !== null
            ? String(found.minute_in)
            : "",
        minute_out:
          found?.minute_out !== undefined && found?.minute_out !== null
            ? String(found.minute_out)
            : "",
      };
    });

    setLineups(rows);
  }

  async function loadExistingSubstitutions(matchId: string, teamId: string) {
    const { data, error } = await supabaseBrowser
      .from("match_substitutions")
      .select("*")
      .eq("match_id", matchId)
      .eq("team_id", teamId)
      .order("minute", { ascending: true })
      .order("extra_minute", { ascending: true });

    if (error) {
      setErrorText(error.message);
      return;
    }

    const rows: SubstitutionRow[] = (data || []).map((item: any) => ({
      temp_id: crypto.randomUUID(),
      team_id: item.team_id || "",
      player_out_id: item.player_out_id || "",
      player_in_id: item.player_in_id || "",
      minute: item.minute?.toString() || "",
      extra_minute: item.extra_minute?.toString() || "",
      reason: item.reason || "",
    }));

    setSubstitutions(rows);
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
    setSelectedTeamId("");
    setLineups([]);
    setSubstitutions([]);
    setMessage("");
    setErrorText("");

    await Promise.all([loadMatches(seasonId), loadRoster(seasonId)]);
  }

  async function handleMatchChange(matchId: string) {
    setSelectedMatchId(matchId);
    setSelectedTeamId("");
    setLineups([]);
    setSubstitutions([]);
    setMessage("");
    setErrorText("");
  }

  async function handleTeamChange(teamId: string) {
    setSelectedTeamId(teamId);
    setMessage("");
    setErrorText("");

    if (!selectedMatch || !teamId) {
      setLineups([]);
      setSubstitutions([]);
      return;
    }

    await Promise.all([
      loadExistingLineups(selectedMatch.id, teamId),
      loadExistingSubstitutions(selectedMatch.id, teamId),
    ]);
  }

  function getPlayerName(playerId: string) {
    const item = roster.find((row) => row.player?.id === playerId);
    if (!item) return "ไม่พบนักเตะ";

    return playerDisplayName(item);
  }

  function updateLineup(
    playerId: string,
    field: keyof LineupRow,
    value: string | boolean
  ) {
    setLineups((current) =>
      current.map((row) =>
        row.player_id === playerId ? { ...row, [field]: value } : row
      )
    );
  }

  function applyStarterPreset(playerId: string, checked: boolean) {
    setLineups((current) =>
      current.map((row) => {
        if (row.player_id !== playerId) return row;

        if (checked) {
          return {
            ...row,
            is_starter: true,
            minute_in: "0",
            minute_out: String(selectedMatch?.match_duration || 80),
          };
        }

        return {
          ...row,
          is_starter: false,
          minute_in: "",
          minute_out: "",
        };
      })
    );
  }

  function addSubstitution() {
    if (!selectedTeamId) return;
    setSubstitutions((current) => [
      ...current,
      createSubstitution(selectedTeamId),
    ]);
  }

  function updateSubstitution(
    tempId: string,
    field: keyof SubstitutionRow,
    value: string
  ) {
    setSubstitutions((current) =>
      current.map((row) =>
        row.temp_id === tempId ? { ...row, [field]: value } : row
      )
    );
  }

  function removeSubstitution(tempId: string) {
    setSubstitutions((current) =>
      current.filter((row) => row.temp_id !== tempId)
    );
  }

  function applySubstitutionsToLineups() {
    const duration = selectedMatch?.match_duration || 80;

    let nextLineups = [...lineups];

    substitutions.forEach((sub) => {
      const minute = Number(sub.minute);

      if (!sub.player_out_id || !sub.player_in_id || Number.isNaN(minute)) {
        return;
      }

      nextLineups = nextLineups.map((row) => {
        if (row.player_id === sub.player_out_id) {
          return {
            ...row,
            minute_out: String(minute),
          };
        }

        if (row.player_id === sub.player_in_id) {
          return {
            ...row,
            is_starter: false,
            minute_in: String(minute),
            minute_out: String(duration),
          };
        }

        return row;
      });
    });

    setLineups(nextLineups);
    setMessage("นำข้อมูลเปลี่ยนตัวไปปรับนาทีเข้า/ออกแล้ว อย่าลืมกดบันทึก");
  }

  async function saveLineups() {
    setMessage("");
    setErrorText("");

    if (!selectedMatch) {
      setErrorText("กรุณาเลือกแมตช์");
      return;
    }

    if (!selectedTeamId) {
      setErrorText("กรุณาเลือกทีม");
      return;
    }

    const validLineups = lineups.filter((row) => {
      return row.minute_in !== "" || row.minute_out !== "" || row.is_starter;
    });

    for (const row of validLineups) {
      const minuteIn = row.minute_in === "" ? 0 : Number(row.minute_in);
      const minuteOut =
        row.minute_out === "" ? selectedMatch.match_duration || 80 : Number(row.minute_out);

      if (
        Number.isNaN(minuteIn) ||
        Number.isNaN(minuteOut) ||
        minuteIn < 0 ||
        minuteOut < 0 ||
        minuteOut < minuteIn
      ) {
        setErrorText("นาทีเข้า/ออกไม่ถูกต้อง");
        return;
      }
    }

    const validSubs = substitutions.filter((row) => {
      return row.player_out_id && row.player_in_id && row.minute !== "";
    });

    for (const sub of validSubs) {
      const minute = Number(sub.minute);
      const extraMinute =
        sub.extra_minute === "" ? 0 : Number(sub.extra_minute);

      if (
        Number.isNaN(minute) ||
        minute < 0 ||
        Number.isNaN(extraMinute) ||
        extraMinute < 0
      ) {
        setErrorText("นาทีเปลี่ยนตัวไม่ถูกต้อง");
        return;
      }

      if (sub.player_in_id === sub.player_out_id) {
        setErrorText("ผู้เล่นเข้าและออกต้องไม่ใช่คนเดียวกัน");
        return;
      }
    }

    setSaving(true);

    const { error: deleteLineupsError } = await supabaseBrowser
      .from("match_lineups")
      .delete()
      .eq("match_id", selectedMatch.id)
      .eq("team_id", selectedTeamId);

    if (deleteLineupsError) {
      setErrorText(deleteLineupsError.message);
      setSaving(false);
      return;
    }

    if (validLineups.length > 0) {
      const lineupPayload = validLineups.map((row) => {
  const minuteIn = row.minute_in === "" ? 0 : Number(row.minute_in);
  const minuteOut =
    row.minute_out === ""
      ? selectedMatch.match_duration || 80
      : Number(row.minute_out);

  return {
    match_id: selectedMatch.id,
    team_id: selectedTeamId,
    player_id: row.player_id,
    is_starter: row.is_starter,
    minute_in: minuteIn,
    minute_out: minuteOut,
    minutes_played: Math.max(0, minuteOut - minuteIn),
    position: row.position || null,
    shirt_number: row.shirt_number,
    status: "active",
  };
});

      const { error: insertLineupsError } = await supabaseBrowser
        .from("match_lineups")
        .insert(lineupPayload);

      if (insertLineupsError) {
        setErrorText(insertLineupsError.message);
        setSaving(false);
        return;
      }
    }

    const { error: deleteSubsError } = await supabaseBrowser
      .from("match_substitutions")
      .delete()
      .eq("match_id", selectedMatch.id)
      .eq("team_id", selectedTeamId);

    if (deleteSubsError) {
      setErrorText(deleteSubsError.message);
      setSaving(false);
      return;
    }

    if (validSubs.length > 0) {
      const subPayload = validSubs.map((sub) => ({
        match_id: selectedMatch.id,
        team_id: selectedTeamId,
        player_out_id: sub.player_out_id,
        player_in_id: sub.player_in_id,
        minute: Number(sub.minute),
        extra_minute: sub.extra_minute === "" ? null : Number(sub.extra_minute),
        reason: sub.reason || null,
      }));

      const { error: insertSubsError } = await supabaseBrowser
        .from("match_substitutions")
        .insert(subPayload);

      if (insertSubsError) {
        setErrorText(insertSubsError.message);
        setSaving(false);
        return;
      }
    }

    await Promise.all([
      loadExistingLineups(selectedMatch.id, selectedTeamId),
      loadExistingSubstitutions(selectedMatch.id, selectedTeamId),
    ]);

    setMessage("บันทึกตัวจริง ตัวสำรอง นาทีลงเล่น และการเปลี่ยนตัวเรียบร้อยแล้ว");
    setSaving(false);
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
          Admin / Lineups
        </p>
        <h1 className="mt-2 text-4xl font-black">จัดตัวจริง / สำรอง</h1>
        <p className="mt-3 text-zinc-400">
          เลือกซีซั่น เลือกแมตช์ แล้วบันทึกตัวจริง ตัวสำรอง นาทีลงเล่น และการเปลี่ยนตัว
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

      <section className="grid gap-5 rounded-3xl border border-white/10 bg-zinc-900 p-6 md:grid-cols-3">
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
          <label className="mb-2 block text-sm text-zinc-400">เลือกแมตช์</label>
          <select
            value={selectedMatchId}
            onChange={(e) => handleMatchChange(e.target.value)}
            className="w-full rounded-2xl border border-white/10 bg-zinc-950 px-4 py-3 text-white outline-none focus:border-red-400"
          >
            <option value="">เลือกแมตช์</option>
            {matches.map((match) => (
              <option key={match.id} value={match.id}>
                นัดที่ {match.matchday || "-"} | {match.match_date}{" "}
                {match.kickoff_time?.slice(0, 5)} |{" "}
                {match.home_team?.short_name || match.home_team?.name} vs{" "}
                {match.away_team?.short_name || match.away_team?.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-2 block text-sm text-zinc-400">เลือกทีม</label>
          <select
            value={selectedTeamId}
            onChange={(e) => handleTeamChange(e.target.value)}
            disabled={!selectedMatch}
            className="w-full rounded-2xl border border-white/10 bg-zinc-950 px-4 py-3 text-white outline-none focus:border-red-400 disabled:opacity-50"
          >
            <option value="">เลือกทีม</option>
            {matchTeams.map((team) => (
              <option key={team.id} value={team.id}>
                {team.short_name || team.name} — {team.name}
              </option>
            ))}
          </select>
        </div>
      </section>

      {selectedMatch && selectedTeamId && (
        <>
          <section className="mt-6 rounded-3xl border border-white/10 bg-zinc-900 p-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-2xl font-black">รายชื่อนักเตะ</h2>
                <p className="mt-2 text-sm text-zinc-400">
                  ติ๊กตัวจริง แล้วกำหนดนาทีเข้า/ออก ตัวสำรองให้ใส่นาทีตามที่ลงเล่น
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-zinc-950 px-4 py-3 text-sm text-zinc-300">
                ความยาวเกม: {selectedMatch.match_duration || 80} นาที
              </div>
            </div>

            <div className="mt-6 overflow-x-auto rounded-2xl border border-white/10">
              <table className="w-full min-w-[900px] text-sm">
                <thead className="bg-white/10 text-zinc-300">
                  <tr>
                    <th className="px-4 py-3 text-left">นักเตะ</th>
                    <th className="px-4 py-3 text-center">ตำแหน่ง</th>
                    <th className="px-4 py-3 text-center">ตัวจริง</th>
                    <th className="px-4 py-3 text-center">นาทีเข้า</th>
                    <th className="px-4 py-3 text-center">นาทีออก</th>
                  </tr>
                </thead>

                <tbody>
                  {lineups.map((row) => (
                    <tr key={row.player_id} className="border-t border-white/10">
                      <td className="px-4 py-3 font-bold">
                        {getPlayerName(row.player_id)}
                      </td>

                      <td className="px-4 py-3 text-center">
                        {row.position || "-"}
                      </td>

                      <td className="px-4 py-3 text-center">
                        <input
                          type="checkbox"
                          checked={row.is_starter}
                          onChange={(e) =>
                            applyStarterPreset(row.player_id, e.target.checked)
                          }
                          className="h-5 w-5"
                        />
                      </td>

                      <td className="px-4 py-3">
                        <input
                          type="number"
                          min="0"
                          value={row.minute_in}
                          onChange={(e) =>
                            updateLineup(row.player_id, "minute_in", e.target.value)
                          }
                          className="w-full rounded-xl border border-white/10 bg-zinc-950 px-3 py-2 text-center text-white outline-none focus:border-red-400"
                        />
                      </td>

                      <td className="px-4 py-3">
                        <input
                          type="number"
                          min="0"
                          value={row.minute_out}
                          onChange={(e) =>
                            updateLineup(row.player_id, "minute_out", e.target.value)
                          }
                          className="w-full rounded-xl border border-white/10 bg-zinc-950 px-3 py-2 text-center text-white outline-none focus:border-red-400"
                        />
                      </td>
                    </tr>
                  ))}

                  {lineups.length === 0 && (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-4 py-8 text-center text-zinc-500"
                      >
                        ยังไม่มีรายชื่อนักเตะในทีมนี้
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section className="mt-6 rounded-3xl border border-white/10 bg-zinc-900 p-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-2xl font-black">การเปลี่ยนตัว</h2>
                <p className="mt-2 text-sm text-zinc-400">
                  บันทึกผู้เล่นออก / ผู้เล่นเข้า และนาทีที่เปลี่ยนตัว
                </p>
              </div>

              <button
                type="button"
                onClick={addSubstitution}
                className="rounded-2xl bg-red-600 px-5 py-3 text-sm font-bold text-white hover:bg-red-500"
              >
                + เพิ่มการเปลี่ยนตัว
              </button>
            </div>

            <div className="mt-6 grid gap-4">
              {substitutions.length === 0 && (
                <div className="rounded-2xl border border-dashed border-white/15 p-6 text-center text-sm text-zinc-500">
                  ยังไม่มีการเปลี่ยนตัว
                </div>
              )}

              {substitutions.map((sub, index) => (
                <div
                  key={sub.temp_id}
                  className="rounded-2xl border border-white/10 bg-zinc-950 p-5"
                >
                  <div className="mb-4 flex items-center justify-between">
                    <p className="font-bold">เปลี่ยนตัวครั้งที่ {index + 1}</p>
                    <button
                      type="button"
                      onClick={() => removeSubstitution(sub.temp_id)}
                      className="text-sm text-red-300 hover:text-red-200"
                    >
                      ลบ
                    </button>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    <SelectPlayerField
                      label="ผู้เล่นออก"
                      value={sub.player_out_id}
                      onChange={(value) =>
                        updateSubstitution(sub.temp_id, "player_out_id", value)
                      }
                      roster={teamRoster}
                    />

                    <SelectPlayerField
                      label="ผู้เล่นเข้า"
                      value={sub.player_in_id}
                      onChange={(value) =>
                        updateSubstitution(sub.temp_id, "player_in_id", value)
                      }
                      roster={teamRoster}
                    />

                    <div>
                      <label className="mb-2 block text-sm text-zinc-400">
                        นาที
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={sub.minute}
                        onChange={(e) =>
                          updateSubstitution(sub.temp_id, "minute", e.target.value)
                        }
                        className="w-full rounded-2xl border border-white/10 bg-zinc-900 px-4 py-3 text-white outline-none focus:border-red-400"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm text-zinc-400">
                        ทดเวลา
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={sub.extra_minute}
                        onChange={(e) =>
                          updateSubstitution(
                            sub.temp_id,
                            "extra_minute",
                            e.target.value
                          )
                        }
                        placeholder="เช่น 2 ถ้าเป็น 45+2"
                        className="w-full rounded-2xl border border-white/10 bg-zinc-900 px-4 py-3 text-white outline-none focus:border-red-400"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="mb-2 block text-sm text-zinc-400">
                        หมายเหตุ
                      </label>
                      <input
                        type="text"
                        value={sub.reason}
                        onChange={(e) =>
                          updateSubstitution(sub.temp_id, "reason", e.target.value)
                        }
                        placeholder="เช่น เจ็บ / แท็กติก / พักตัวหลัก"
                        className="w-full rounded-2xl border border-white/10 bg-zinc-900 px-4 py-3 text-white outline-none focus:border-red-400"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={applySubstitutionsToLineups}
              className="mt-5 rounded-2xl border border-white/10 px-5 py-3 text-sm font-bold text-zinc-300 hover:bg-white/10"
            >
              นำข้อมูลเปลี่ยนตัวไปปรับนาทีเข้า/ออก
            </button>
          </section>

          <div className="mt-6 flex justify-end">
            <button
              type="button"
              onClick={saveLineups}
              disabled={saving}
              className="rounded-2xl bg-red-600 px-8 py-4 font-black text-white hover:bg-red-500 disabled:opacity-50"
            >
              {saving ? "กำลังบันทึก..." : "บันทึกตัวจริง / สำรอง"}
            </button>
          </div>
        </>
      )}
    </main>
  );
}

function SelectPlayerField({
  label,
  value,
  onChange,
  roster,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  roster: RosterPlayer[];
}) {
  return (
    <div>
      <label className="mb-2 block text-sm text-zinc-400">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-2xl border border-white/10 bg-zinc-900 px-4 py-3 text-white outline-none focus:border-red-400"
      >
        <option value="">เลือกนักเตะ</option>
        {roster.map((item) => (
          <option key={item.player?.id} value={item.player?.id}>
            {playerDisplayName(item)}
          </option>
        ))}
      </select>
    </div>
  );
}
