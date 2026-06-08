"use client";

import { useCallback, useEffect, useState } from "react";
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
  match_duration: number | null;
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

export default function AdminMatchesPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState("");
  const [adding, setAdding] = useState(false);

  const [seasons, setSeasons] = useState<Season[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);

  const [selectedSeasonId, setSelectedSeasonId] = useState("");

  const [newHomeTeamId, setNewHomeTeamId] = useState("");
  const [newAwayTeamId, setNewAwayTeamId] = useState("");
  const [newMatchDate, setNewMatchDate] = useState("");
  const [newKickoffTime, setNewKickoffTime] = useState("");
  const [newVenue, setNewVenue] = useState("สนามฟุตบอลเทศบาลตำบลเบิกไพร");
  const [newRound, setNewRound] = useState("รอบแรก");
  const [newMatchday, setNewMatchday] = useState("");
  const [newDuration, setNewDuration] = useState("80");

  const [message, setMessage] = useState("");
  const [errorText, setErrorText] = useState("");

  const checkAdmin = useCallback(async () => {
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
  }, [router]);

  async function loadBaseData() {
    const [seasonsResult, teamsResult] = await Promise.all([
      supabaseBrowser
        .from("seasons")
        .select(`
          id,
          name,
          year,
          status,
          competition:competition_id(name)
        `)
        .order("year", { ascending: false })
        .order("name", { ascending: true }),

      supabaseBrowser
        .from("teams")
        .select("id, name, short_name")
        .order("short_name"),
    ]);

    if (seasonsResult.error) {
      setErrorText(seasonsResult.error.message);
      return "";
    }

    if (teamsResult.error) {
      setErrorText(teamsResult.error.message);
      return "";
    }

    const loadedSeasons: Season[] = (
      (seasonsResult.data || []) as SeasonQueryRow[]
    ).map((season) => ({
      ...season,
      competition: normalizeSeasonCompetition(season.competition),
    }));
    const loadedTeams = (teamsResult.data || []) as Team[];

    setSeasons(loadedSeasons);
    setTeams(loadedTeams);

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
        match_duration,
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

  useEffect(() => {
    async function init() {
      setLoading(true);

      const isAdmin = await checkAdmin();
      if (!isAdmin) return;

      const defaultSeasonId = await loadBaseData();
      await loadMatches(defaultSeasonId);

      setLoading(false);
    }

    init();
  }, [checkAdmin]);

  async function handleSeasonChange(seasonId: string) {
    setSelectedSeasonId(seasonId);
    setMessage("");
    setErrorText("");
    await loadMatches(seasonId);
  }

  function updateMatchValue(
    matchId: string,
    field: keyof Match,
    value: string | number | null
  ) {
    setMatches((current) =>
      current.map((match) =>
        match.id === matchId ? { ...match, [field]: value } : match
      )
    );
  }

  async function addMatch(e: React.FormEvent) {
    e.preventDefault();

    setMessage("");
    setErrorText("");

    if (!selectedSeasonId) {
      setErrorText("กรุณาเลือกซีซั่นก่อนเพิ่มแมตช์");
      return;
    }

    if (!newHomeTeamId || !newAwayTeamId) {
      setErrorText("กรุณาเลือกทีมเหย้าและทีมเยือน");
      return;
    }

    if (newHomeTeamId === newAwayTeamId) {
      setErrorText("ทีมเหย้าและทีมเยือนต้องไม่ใช่ทีมเดียวกัน");
      return;
    }

    if (!newMatchDate || !newKickoffTime) {
      setErrorText("กรุณาใส่วันที่และเวลาแข่งขัน");
      return;
    }

    const parsedMatchday = newMatchday === "" ? null : Number(newMatchday);
    const parsedDuration = newDuration === "" ? 80 : Number(newDuration);

    if (
      (parsedMatchday !== null && Number.isNaN(parsedMatchday)) ||
      Number.isNaN(parsedDuration)
    ) {
      setErrorText("นัดที่และความยาวเกมต้องเป็นตัวเลข");
      return;
    }

    setAdding(true);

    const { error } = await supabaseBrowser.from("matches").insert({
      season_id: selectedSeasonId,
      home_team_id: newHomeTeamId,
      away_team_id: newAwayTeamId,
      match_date: newMatchDate,
      kickoff_time: newKickoffTime,
      venue: newVenue || null,
      round: newRound || null,
      matchday: parsedMatchday,
      match_duration: parsedDuration,
      status: "scheduled",
    });

    if (error) {
      setErrorText(error.message);
      setAdding(false);
      return;
    }

    setNewHomeTeamId("");
    setNewAwayTeamId("");
    setNewMatchDate("");
    setNewKickoffTime("");
    setNewVenue("สนามฟุตบอลเทศบาลตำบลเบิกไพร");
    setNewRound("รอบแรก");
    setNewMatchday("");
    setNewDuration("80");

    await loadMatches(selectedSeasonId);

    setMessage("เพิ่มแมตช์ใหม่เรียบร้อยแล้ว");
    setAdding(false);
  }

  async function saveMatch(match: Match) {
    setMessage("");
    setErrorText("");
    setSavingId(match.id);

    if (!match.match_date) {
      setErrorText("กรุณาใส่วันที่แข่งขัน");
      setSavingId("");
      return;
    }

    if (!match.kickoff_time) {
      setErrorText("กรุณาใส่เวลาแข่งขัน");
      setSavingId("");
      return;
    }

    const { error } = await supabaseBrowser
      .from("matches")
      .update({
        match_date: match.match_date,
        kickoff_time: match.kickoff_time,
        venue: match.venue || null,
        round: match.round || null,
        matchday: match.matchday,
        status: match.status || "scheduled",
        match_duration: match.match_duration || 80,
      })
      .eq("id", match.id);

    if (error) {
      setErrorText(error.message);
      setSavingId("");
      return;
    }

    await loadMatches(selectedSeasonId);

    setMessage("บันทึกโปรแกรมแข่งขันเรียบร้อยแล้ว");
    setSavingId("");
  }

  async function deleteMatch(matchId: string) {
    const ok = window.confirm(
      "ต้องการลบแมตช์นี้ใช่ไหม? ถ้ามีผลการแข่งขันหรือเหตุการณ์ในเกม ข้อมูลที่เกี่ยวข้องอาจถูกลบด้วย"
    );

    if (!ok) return;

    setMessage("");
    setErrorText("");

    const { error } = await supabaseBrowser
      .from("matches")
      .delete()
      .eq("id", matchId);

    if (error) {
      setErrorText(error.message);
      return;
    }

    await loadMatches(selectedSeasonId);
    setMessage("ลบแมตช์เรียบร้อยแล้ว");
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
          Admin / Matches
        </p>
        <h1 className="mt-2 text-4xl font-black">จัดการโปรแกรมการแข่งขัน</h1>
        <p className="mt-3 text-zinc-400">
          เลือกซีซั่น เพิ่ม แก้ไข วัน เวลา สนาม รอบการแข่งขัน สถานะ และความยาวเกม
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

      <section className="mb-8 rounded-3xl border border-white/10 bg-zinc-900 p-6">
        <h2 className="text-2xl font-black">เลือกซีซั่นที่ต้องการจัดการ</h2>

        <div className="mt-6">
          <label className="mb-2 block text-sm text-zinc-400">ซีซั่น</label>
          <select
            value={selectedSeasonId}
            onChange={(e) => handleSeasonChange(e.target.value)}
            className="w-full rounded-2xl border border-white/10 bg-zinc-950 px-4 py-3 text-white outline-none focus:border-red-400"
          >
            <option value="">เลือกซีซั่น</option>
            {seasons.map((season) => (
              <option key={season.id} value={season.id}>
                {season.competition?.name} — {season.name} — {season.year || "-"} —{" "}
                {season.status}
              </option>
            ))}
          </select>
        </div>
      </section>

      <section className="mb-8 rounded-3xl border border-white/10 bg-zinc-900 p-6">
        <h2 className="text-2xl font-black">เพิ่มแมตช์ใหม่</h2>

        <form
          onSubmit={addMatch}
          className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3"
        >
          <div>
            <label className="mb-2 block text-sm text-zinc-400">
              ทีมเหย้า
            </label>
            <select
              value={newHomeTeamId}
              onChange={(e) => setNewHomeTeamId(e.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-zinc-950 px-4 py-3 text-white outline-none focus:border-red-400"
            >
              <option value="">เลือกทีมเหย้า</option>
              {teams.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.short_name || team.name} — {team.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm text-zinc-400">
              ทีมเยือน
            </label>
            <select
              value={newAwayTeamId}
              onChange={(e) => setNewAwayTeamId(e.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-zinc-950 px-4 py-3 text-white outline-none focus:border-red-400"
            >
              <option value="">เลือกทีมเยือน</option>
              {teams.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.short_name || team.name} — {team.name}
                </option>
              ))}
            </select>
          </div>

          <Field
            label="วันที่แข่งขัน"
            value={newMatchDate}
            type="date"
            onChange={setNewMatchDate}
          />

          <Field
            label="เวลาแข่งขัน"
            value={newKickoffTime}
            type="time"
            onChange={setNewKickoffTime}
          />

          <Field label="สนาม" value={newVenue} onChange={setNewVenue} />

          <Field label="รอบ" value={newRound} onChange={setNewRound} />

          <Field
            label="นัดที่"
            value={newMatchday}
            type="number"
            onChange={setNewMatchday}
          />

          <Field
            label="ความยาวเกม / นาที"
            value={newDuration}
            type="number"
            onChange={setNewDuration}
          />

          <div className="flex items-end">
            <button
              type="submit"
              disabled={adding}
              className="w-full rounded-2xl bg-red-600 px-6 py-3 font-black text-white hover:bg-red-500 disabled:opacity-50"
            >
              {adding ? "กำลังเพิ่ม..." : "เพิ่มแมตช์"}
            </button>
          </div>
        </form>
      </section>

      <div className="grid gap-6">
        {matches.map((match) => (
          <section
            key={match.id}
            className="rounded-3xl border border-white/10 bg-zinc-900 p-6"
          >
            <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm font-semibold text-red-300">
                  นัดที่ {match.matchday || "-"} · {match.round || "-"}
                </p>
                <h2 className="mt-1 text-2xl font-black">
                  {match.home_team?.name} vs {match.away_team?.name}
                </h2>
                <p className="mt-1 text-sm text-zinc-500">
                  {match.status || "scheduled"} · {match.home_score ?? "-"} -{" "}
                  {match.away_score ?? "-"}
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <a
                  href={`/matches/${match.id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-2xl border border-white/10 px-4 py-2 text-sm font-bold text-zinc-300 hover:bg-white/10"
                >
                  ดูหน้าแมตช์
                </a>

                <button
                  onClick={() => deleteMatch(match.id)}
                  className="rounded-2xl border border-red-500/40 px-4 py-2 text-sm font-bold text-red-300 hover:bg-red-950"
                >
                  ลบแมตช์
                </button>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <Field
                label="วันที่แข่งขัน"
                value={match.match_date}
                type="date"
                onChange={(value) =>
                  updateMatchValue(match.id, "match_date", value)
                }
              />

              <Field
                label="เวลาแข่งขัน"
                value={match.kickoff_time?.slice(0, 5) || ""}
                type="time"
                onChange={(value) =>
                  updateMatchValue(match.id, "kickoff_time", value)
                }
              />

              <Field
                label="สนาม"
                value={match.venue || ""}
                onChange={(value) =>
                  updateMatchValue(match.id, "venue", value)
                }
              />

              <Field
                label="รอบ"
                value={match.round || ""}
                onChange={(value) =>
                  updateMatchValue(match.id, "round", value)
                }
              />

              <Field
                label="นัดที่"
                value={String(match.matchday || "")}
                type="number"
                onChange={(value) =>
                  updateMatchValue(
                    match.id,
                    "matchday",
                    value === "" ? null : Number(value)
                  )
                }
              />

              <Field
                label="ความยาวเกม / นาที"
                value={String(match.match_duration || 80)}
                type="number"
                onChange={(value) =>
                  updateMatchValue(
                    match.id,
                    "match_duration",
                    value === "" ? 80 : Number(value)
                  )
                }
              />

              <div>
                <label className="mb-2 block text-sm text-zinc-400">
                  สถานะ
                </label>
                <select
                  value={match.status || "scheduled"}
                  onChange={(e) =>
                    updateMatchValue(match.id, "status", e.target.value)
                  }
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

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => saveMatch(match)}
                disabled={savingId === match.id}
                className="rounded-2xl bg-red-600 px-6 py-3 font-black text-white hover:bg-red-500 disabled:opacity-50"
              >
                {savingId === match.id ? "กำลังบันทึก..." : "บันทึกแมตช์นี้"}
              </button>
            </div>
          </section>
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

function Field({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: "text" | "date" | "time" | "number";
}) {
  return (
    <div>
      <label className="mb-2 block text-sm text-zinc-400">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-2xl border border-white/10 bg-zinc-950 px-4 py-3 text-white outline-none focus:border-red-400"
      />
    </div>
  );
}
