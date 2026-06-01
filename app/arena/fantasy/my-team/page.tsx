"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase-browser";

type SupabaseRelation<T> = T | T[] | null;

type ArenaWeek = {
  id: string;
  season_id: string;
  name: string;
  status: string;
  lineup_locks_at: string | null;
};

type PlayerOption = {
  season_player_id: string;
  team_id: string;
  shirt_number: number | null;
  position: string | null;
  display_name: string;
  team_name: string;
  star_rating: number;
  fantasy_status: string;
  fantasy_position: string | null;
};

type SeasonPlayerRow = {
  id: string;
  team_id: string;
  shirt_number: number | null;
  position: string | null;
  team: SupabaseRelation<{ name: string | null; short_name: string | null }>;
  player: SupabaseRelation<{
    first_name: string | null;
    last_name: string | null;
    nickname: string | null;
  }>;
  fantasy_settings: SupabaseRelation<{
    star_rating: number | null;
    fantasy_status: string | null;
    fantasy_position_override: string | null;
  }>;
};

type LoadState = "loading" | "unauthenticated" | "ready" | "error";

function normalizeRelation<T>(relation: SupabaseRelation<T>): T | null {
  return Array.isArray(relation) ? relation[0] || null : relation;
}

function playerName(player: SeasonPlayerRow["player"]) {
  const value = normalizeRelation(player);
  if (!value) return "Unnamed Player (ผู้เล่นไม่ระบุชื่อ)";
  const fullName = [value.first_name, value.last_name].filter(Boolean).join(" ");
  return value.nickname || fullName || "Unnamed Player (ผู้เล่นไม่ระบุชื่อ)";
}

function effectivePosition(player: PlayerOption) {
  return player.fantasy_position || player.position || "";
}

export default function ArenaFantasyMyTeamPage() {
  const [state, setState] = useState<LoadState>("loading");
  const [message, setMessage] = useState("");
  const [errorText, setErrorText] = useState("");
  const [week, setWeek] = useState<ArenaWeek | null>(null);
  const [profileId, setProfileId] = useState("");
  const [lineupId, setLineupId] = useState("");
  const [lineupStatus, setLineupStatus] = useState("draft");
  const [players, setPlayers] = useState<PlayerOption[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const selectedPlayers = useMemo(
    () =>
      selectedIds
        .map((id) => players.find((player) => player.season_player_id === id))
        .filter(Boolean) as PlayerOption[],
    [players, selectedIds]
  );

  const validation = useMemo(() => {
    const counts = { GK: 0, DF: 0, MF: 0, FW: 0 };
    const teamCounts = new Map<string, number>();
    let stars = 0;

    selectedPlayers.forEach((player) => {
      const position = effectivePosition(player);
      if (position in counts) {
        counts[position as keyof typeof counts] += 1;
      }
      teamCounts.set(player.team_id, (teamCounts.get(player.team_id) || 0) + 1);
      stars += player.star_rating;
    });

    const schoolLimitOk = Array.from(teamCounts.values()).every(
      (count) => count <= 5
    );

    return {
      counts,
      stars,
      schoolLimitOk,
      isValid:
        selectedPlayers.length === 11 &&
        counts.GK === 1 &&
        counts.DF === 4 &&
        counts.MF === 4 &&
        counts.FW === 2 &&
        stars <= 38 &&
        schoolLimitOk,
    };
  }, [selectedPlayers]);

  const loadFantasy = useCallback(async () => {
    setState("loading");
    setErrorText("");
    setMessage("");

    const { data: userData, error: userError } =
      await supabaseBrowser.auth.getUser();

    if (userError) {
      setState("error");
      setErrorText(userError.message);
      return;
    }

    if (!userData.user) {
      setState("unauthenticated");
      return;
    }

    const { data: profile, error: profileError } = await supabaseBrowser
      .from("arena_profiles")
      .upsert(
        { auth_user_id: userData.user.id },
        { onConflict: "auth_user_id" }
      )
      .select("id")
      .single();

    if (profileError || !profile) {
      setState("error");
      setErrorText(profileError?.message || "Arena profile is not available. (ไม่พบโปรไฟล์อารีนา)");
      return;
    }

    setProfileId(profile.id);

    const { data: weekData, error: weekError } = await supabaseBrowser
      .from("arena_weeks")
      .select("id, season_id, name, status, lineup_locks_at")
      .in("status", ["open", "locked"])
      .order("week_number", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (weekError) {
      setState("error");
      setErrorText(weekError.message);
      return;
    }

    if (!weekData) {
      setWeek(null);
      setPlayers([]);
      setSelectedIds([]);
      setState("ready");
      return;
    }

    setWeek(weekData as ArenaWeek);

    const [playersResult, lineupResult] = await Promise.all([
      supabaseBrowser
        .from("season_players")
        .select(
          `
            id,
            team_id,
            shirt_number,
            position,
            team:team_id(name, short_name),
            player:player_id(first_name, last_name, nickname),
            fantasy_settings:arena_player_settings(
              star_rating,
              fantasy_status,
              fantasy_position_override
            )
          `
        )
        .eq("season_id", weekData.season_id)
        .eq("status", "active")
        .order("team_id", { ascending: true })
        .order("shirt_number", { ascending: true }),

      supabaseBrowser
        .from("arena_weekly_lineups")
        .select("id, status, arena_lineup_players(season_player_id, slot_number)")
        .eq("week_id", weekData.id)
        .eq("profile_id", profile.id)
        .maybeSingle(),
    ]);

    if (playersResult.error) {
      setState("error");
      setErrorText(playersResult.error.message);
      return;
    }

    if (lineupResult.error) {
      setState("error");
      setErrorText(lineupResult.error.message);
      return;
    }

    const loadedPlayers = ((playersResult.data || []) as SeasonPlayerRow[])
      .map((row) => {
        const team = normalizeRelation(row.team);
        const setting = normalizeRelation(row.fantasy_settings);
        return {
          season_player_id: row.id,
          team_id: row.team_id,
          shirt_number: row.shirt_number,
          position: row.position,
          display_name: playerName(row.player),
          team_name: team?.short_name || team?.name || "Team (ทีม)",
          star_rating: setting?.star_rating || 1,
          fantasy_status: setting?.fantasy_status || "active",
          fantasy_position: setting?.fantasy_position_override || null,
        };
      })
      .filter((player) => player.fantasy_status === "active");

    setPlayers(loadedPlayers);

    if (lineupResult.data) {
      setLineupId(lineupResult.data.id);
      setLineupStatus(lineupResult.data.status || "draft");
      const lineupPlayers = (
        lineupResult.data.arena_lineup_players || []
      ).sort(
        (a: { slot_number: number | null }, b: { slot_number: number | null }) =>
          (a.slot_number || 0) - (b.slot_number || 0)
      );
      setSelectedIds(
        lineupPlayers.map(
          (player: { season_player_id: string }) => player.season_player_id
        )
      );
    } else {
      setLineupId("");
      setLineupStatus("draft");
      setSelectedIds([]);
    }

    setState("ready");
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadFantasy();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadFantasy]);

  function togglePlayer(playerId: string) {
    if (lineupStatus === "locked") return;
    setSelectedIds((current) => {
      if (current.includes(playerId)) {
        return current.filter((id) => id !== playerId);
      }
      if (current.length >= 11) {
        return current;
      }
      return [...current, playerId];
    });
  }

  async function saveLineup(nextStatus: "draft" | "locked") {
    setMessage("");
    setErrorText("");

    if (!week || !profileId) {
      setErrorText("Fantasy week is not available. (ไม่พบสัปดาห์แฟนตาซี)");
      return;
    }

    if (nextStatus === "locked" && !validation.isValid) {
      setErrorText("Lock Team (ล็อกทีม) is enabled only when lineup is valid. (จะล็อกทีมได้เมื่อรายชื่อถูกต้องเท่านั้น)");
      return;
    }

    const { data: lineup, error: lineupError } = await supabaseBrowser
      .from("arena_weekly_lineups")
      .upsert(
        {
          id: lineupId || undefined,
          week_id: week.id,
          profile_id: profileId,
          status: "draft",
          submitted_at: new Date().toISOString(),
          locked_at: null,
        },
        { onConflict: "week_id,profile_id" }
      )
      .select("id, status")
      .single();

    if (lineupError || !lineup) {
      setErrorText(lineupError?.message || "Lineup could not be saved.");
      return;
    }

    const { error: deleteError } = await supabaseBrowser
      .from("arena_lineup_players")
      .delete()
      .eq("lineup_id", lineup.id);

    if (deleteError) {
      setErrorText(deleteError.message);
      return;
    }

    if (selectedIds.length > 0) {
      const { error: insertError } = await supabaseBrowser
        .from("arena_lineup_players")
        .insert(
          selectedIds.map((seasonPlayerId, index) => ({
            lineup_id: lineup.id,
            season_player_id: seasonPlayerId,
            slot_number: index + 1,
          }))
        );

      if (insertError) {
        setErrorText(insertError.message);
        return;
      }
    }

    if (nextStatus === "locked") {
      const { error: lockError } = await supabaseBrowser
        .from("arena_weekly_lineups")
        .update({
          status: "locked",
          locked_at: new Date().toISOString(),
        })
        .eq("id", lineup.id);

      if (lockError) {
        setErrorText(lockError.message);
        return;
      }
    }

    setLineupId(lineup.id);
    setLineupStatus(nextStatus);
    setMessage(
      nextStatus === "locked"
        ? "Lock Team (ล็อกทีม) complete. (ล็อกทีมเรียบร้อยแล้ว)"
        : "Draft lineup saved. (บันทึกแบบร่างเรียบร้อยแล้ว)"
    );
  }

  if (state === "loading") {
    return (
      <main className="mx-auto max-w-6xl px-6 py-10 text-zinc-400">
        Loading fantasy lineup... (กำลังโหลดทีมแฟนตาซี)
      </main>
    );
  }

  if (state === "unauthenticated") {
    return (
      <main className="mx-auto max-w-6xl px-6 py-10">
        <section className="rounded-2xl border border-white/10 bg-zinc-900 p-6">
          <p className="text-xs font-black uppercase tracking-[0.24em] text-red-300">
            Login Required (ต้องเข้าสู่ระบบ)
          </p>
          <h1 className="mt-3 text-3xl font-black">My Team (ทีมของฉัน)</h1>
          <p className="mt-3 text-zinc-400">
            Sign in before creating an Arena Fantasy lineup. (เข้าสู่ระบบก่อนจัดทีมอารีนาแฟนตาซี)
          </p>
        </section>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-7xl px-6 py-10">
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-red-300">
            My Team (ทีมของฉัน)
          </p>
          <h1 className="mt-2 text-4xl font-black">Pick Lineup (เลือกทีม)</h1>
          <p className="mt-3 text-zinc-400">
            11 players, GK 1, DF 4, MF 4, FW 2, star cap 38, school limit 5. (ผู้เล่น 11 คน, GK 1, DF 4, MF 4, FW 2, เพดานดาว 38, จำกัดผู้เล่นต่อโรงเรียน 5 คน)
          </p>
        </div>
        <Link
          href="/arena/fantasy"
          className="rounded-xl border border-white/10 px-4 py-3 text-sm font-black text-zinc-200 hover:bg-white/10"
        >
          Back to Fantasy (กลับไปหน้าแฟนตาซี)
        </Link>
      </div>

      {errorText ? (
        <div className="mb-6 rounded-2xl border border-red-500/40 bg-red-950/40 p-4 text-red-200">
          {errorText}
        </div>
      ) : null}

      {message ? (
        <div className="mb-6 rounded-2xl border border-green-500/40 bg-green-950/40 p-4 text-green-200">
          {message}
        </div>
      ) : null}

      {!week ? (
        <section className="rounded-2xl border border-white/10 bg-zinc-900 p-6 text-zinc-300">
          No Arena Fantasy week is open yet. (ยังไม่มีสัปดาห์อารีนาแฟนตาซีที่เปิดอยู่)
        </section>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <section className="rounded-2xl border border-white/10 bg-zinc-900 p-5">
            <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-2xl font-black">{week.name}</h2>
                <p className="text-sm text-zinc-500">Status (สถานะ): {week.status}</p>
              </div>
              <span className="w-fit rounded-full border border-red-300/30 px-3 py-1 text-xs font-black uppercase text-red-200">
                {lineupStatus}
              </span>
            </div>
            <p className="mb-3 text-xs font-black uppercase tracking-[0.24em] text-red-300">
              Player Cards (การ์ดผู้เล่น)
            </p>

            <div className="grid gap-3 md:grid-cols-2">
              {players.map((player) => {
                const selected = selectedIds.includes(player.season_player_id);
                return (
                  <button
                    key={player.season_player_id}
                    type="button"
                    onClick={() => togglePlayer(player.season_player_id)}
                    className={`rounded-xl border p-4 text-left ${
                      selected
                        ? "border-red-300/60 bg-red-950/40"
                        : "border-white/10 bg-zinc-950 hover:border-red-400/40"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-black">{player.display_name}</p>
                        <p className="mt-1 text-sm text-zinc-500">
                          #{player.shirt_number || "-"} / {player.team_name}
                        </p>
                      </div>
                      <span className="rounded-full bg-white/10 px-2 py-1 text-xs font-black">
                        {effectivePosition(player) || "-"}
                      </span>
                    </div>
                    <p className="mt-3 text-sm text-red-200">
                      Star Rating (ระดับดาว): {"★".repeat(player.star_rating)}
                    </p>
                  </button>
                );
              })}
            </div>
          </section>

          <aside className="rounded-2xl border border-white/10 bg-zinc-900 p-5">
            <h2 className="text-2xl font-black">Lineup Rules (กติกาการจัดทีม)</h2>
            <div className="mt-5 grid gap-3 text-sm">
              <div className="flex justify-between">
                <span>Players (ผู้เล่น)</span>
                <strong>{selectedPlayers.length}/11</strong>
              </div>
              <div className="flex justify-between">
                <span>GK / DF / MF / FW (ตำแหน่ง)</span>
                <strong>
                  {validation.counts.GK}/{validation.counts.DF}/
                  {validation.counts.MF}/{validation.counts.FW}
                </strong>
              </div>
              <div className="flex justify-between">
                <span>Star Cap (เพดานดาว)</span>
                <strong>{validation.stars}/38</strong>
              </div>
              <div className="flex justify-between">
                <span>School Limit (จำกัดผู้เล่นต่อโรงเรียน)</span>
                <strong>{validation.schoolLimitOk ? "OK (ผ่าน)" : "Over (เกิน)"}</strong>
              </div>
            </div>

            <div className="mt-6 grid gap-3">
              <button
                type="button"
                onClick={() => void saveLineup("draft")}
                disabled={lineupStatus === "locked"}
                className="rounded-xl border border-white/10 px-4 py-3 font-black text-zinc-100 hover:bg-white/10 disabled:opacity-50"
              >
                Save Draft (บันทึกแบบร่าง)
              </button>
              <button
                type="button"
                onClick={() => void saveLineup("locked")}
                disabled={!validation.isValid || lineupStatus === "locked"}
                className="rounded-xl bg-red-600 px-4 py-3 font-black text-white hover:bg-red-500 disabled:opacity-50"
              >
                Lock Team (ล็อกทีม)
              </button>
            </div>
          </aside>
        </div>
      )}
    </main>
  );
}
