"use client";

import type { CSSProperties } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import PlayerCard from "@/components/arena/PlayerCard";
import ArenaProgressJourney from "@/components/arena-v2/ArenaProgressJourney";
import ArenaShell from "@/components/arena-v2/ArenaShell";
import FantasyPitchV2 from "@/components/arena-v2/FantasyPitchV2";
import { supabaseBrowser } from "@/lib/supabase-browser";
import {
  ARENA_SCHOOLS,
  type ArenaSchoolKey,
  getArenaSchoolTheme,
} from "@/src/lib/arena-theme";

type SupabaseRelation<T> = T | T[] | null;
type PositionGroup = "GK" | "DF" | "MF" | "FW";
type FilterPosition = "ALL" | PositionGroup;
type FilterSchool = "ALL" | ArenaSchoolKey;
type LoadState = "loading" | "unauthenticated" | "ready" | "error";

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
  school_key: ArenaSchoolKey;
  school_label: string;
  star_rating: number;
  ovr_rating: number;
  rarity: string;
  fantasy_status: string;
  fantasy_position: PositionGroup;
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

type ArenaLineupRow = {
  id: string;
  status: string | null;
  arena_lineup_players?: Array<{
    season_player_id: string;
    slot_number: number | null;
  }> | null;
};

type PitchSlot = {
  id: string;
  label: string;
  position: PositionGroup;
};

const FORMATION: Array<{ label: string; slots: PitchSlot[] }> = [
  {
    label: "GK",
    slots: [{ id: "GK-1", label: "GK", position: "GK" }],
  },
  {
    label: "DF",
    slots: Array.from({ length: 4 }, (_, index) => ({
      id: `DF-${index + 1}`,
      label: `DF ${index + 1}`,
      position: "DF" as const,
    })),
  },
  {
    label: "MF",
    slots: Array.from({ length: 4 }, (_, index) => ({
      id: `MF-${index + 1}`,
      label: `MF ${index + 1}`,
      position: "MF" as const,
    })),
  },
  {
    label: "FW",
    slots: Array.from({ length: 2 }, (_, index) => ({
      id: `FW-${index + 1}`,
      label: `FW ${index + 1}`,
      position: "FW" as const,
    })),
  },
];

const PITCH_SLOTS = FORMATION.flatMap((line) => line.slots);
const POSITION_LIMITS: Record<PositionGroup, number> = {
  GK: 1,
  DF: 4,
  MF: 4,
  FW: 2,
};
const SCHOOL_KEYS = ["DARUNA", "PHOTHA", "SARASIT", "BENJ"] as const;
const STAR_LIMIT = 38;
const SCHOOL_LIMIT = 5;
const PLAYER_LIMIT = 11;
const DEV_PREVIEW_WEEK: ArenaWeek = {
  id: "dev-preview-week",
  season_id: "dev-preview-season",
  name: "Arena Fantasy Dev Preview",
  status: "open",
  lineup_locks_at: null,
};

const DEV_PREVIEW_POSITIONS: PositionGroup[] = [
  "GK",
  "GK",
  "DF",
  "DF",
  "DF",
  "DF",
  "DF",
  "DF",
  "MF",
  "MF",
  "MF",
  "MF",
  "MF",
  "MF",
  "FW",
  "FW",
  "FW",
  "FW",
];
const DEV_PREVIEW_STARS = [5, 4, 4, 3, 3, 2, 2, 1, 5, 4, 3, 3, 2, 2, 5, 4, 3, 1];

function isDevFantasyPreview() {
  if (process.env.NODE_ENV === "production") return false;
  return new URLSearchParams(window.location.search).get("preview") === "1";
}

function normalizeRelation<T>(relation: SupabaseRelation<T>): T | null {
  return Array.isArray(relation) ? relation[0] || null : relation;
}

function playerName(player: SeasonPlayerRow["player"]) {
  const value = normalizeRelation(player);
  if (!value) return "Unnamed Player (ผู้เล่นไม่ระบุชื่อ)";
  const fullName = [value.first_name, value.last_name].filter(Boolean).join(" ");
  return value.nickname || fullName || "Unnamed Player (ผู้เล่นไม่ระบุชื่อ)";
}

function normalizePosition(value: string | null | undefined): PositionGroup {
  const normalized = (value || "").trim().toUpperCase();

  if (["GK", "GOALKEEPER"].includes(normalized)) return "GK";
  if (["DF", "DEF", "DEFENDER", "CB", "LB", "RB", "LWB", "RWB"].includes(normalized)) {
    return "DF";
  }
  if (["MF", "MID", "MIDFIELDER", "CM", "CDM", "CAM", "LM", "RM"].includes(normalized)) {
    return "MF";
  }
  if (["FW", "FWD", "FORWARD", "ST", "CF", "LW", "RW"].includes(normalized)) {
    return "FW";
  }

  return "MF";
}

function playerRarity(stars: number) {
  if (stars >= 5) return "legend";
  if (stars === 4) return "epic";
  if (stars === 3) return "elite";
  if (stars === 2) return "rare";
  return "common";
}

function playerOvr(stars: number, shirtNumber: number | null) {
  const base = 62 + stars * 7;
  const bonus = shirtNumber ? Math.min(4, shirtNumber % 5) : 0;
  return Math.min(99, base + bonus);
}

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function emptySelections() {
  return PITCH_SLOTS.reduce<Record<string, string | null>>((acc, slot) => {
    acc[slot.id] = null;
    return acc;
  }, {});
}

function readSelectionIds(selections: Record<string, string | null>) {
  return Object.values(selections).filter(Boolean) as string[];
}

function readSelectedLineupPlayers(selections: Record<string, string | null>) {
  return PITCH_SLOTS.map((slot, index) => ({
    season_player_id: selections[slot.id],
    slot_number: index + 1,
  })).filter(
    (player): player is { season_player_id: string; slot_number: number } =>
      Boolean(player.season_player_id),
  );
}

function countByPosition(players: PlayerOption[]) {
  return players.reduce<Record<PositionGroup, number>>(
    (acc, player) => {
      acc[player.fantasy_position] += 1;
      return acc;
    },
    { GK: 0, DF: 0, MF: 0, FW: 0 },
  );
}

function ruleStateClass(ok: boolean) {
  return ok ? "text-emerald-300" : "text-red-300";
}

function buildDevPreviewPlayers(): PlayerOption[] {
  return SCHOOL_KEYS.flatMap((schoolKey) => {
    const school = ARENA_SCHOOLS[schoolKey];

    return DEV_PREVIEW_POSITIONS.map((position, index) => {
      const shirtNumber = index + 1;
      const stars = DEV_PREVIEW_STARS[index] || 1;

      return {
        season_player_id: `dev-${schoolKey.toLowerCase()}-${shirtNumber}`,
        team_id: `dev-team-${schoolKey.toLowerCase()}`,
        shirt_number: shirtNumber,
        position,
        display_name: `${school.shortLabel} ${position} ${shirtNumber}`,
        team_name: school.shortLabel,
        school_key: school.key,
        school_label: school.shortLabel,
        star_rating: stars,
        ovr_rating: playerOvr(stars, shirtNumber),
        rarity: playerRarity(stars),
        fantasy_status: "active",
        fantasy_position: position,
      };
    });
  });
}

export default function ArenaFantasyMyTeamPage() {
  const router = useRouter();
  const [state, setState] = useState<LoadState>("loading");
  const [message, setMessage] = useState("");
  const [errorText, setErrorText] = useState("");
  const [week, setWeek] = useState<ArenaWeek | null>(null);
  const [profileId, setProfileId] = useState("");
  const [lineupStatus, setLineupStatus] = useState("draft");
  const [players, setPlayers] = useState<PlayerOption[]>([]);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [selections, setSelections] = useState<Record<string, string | null>>(
    () => emptySelections(),
  );
  const [activeSlotId, setActiveSlotId] = useState<string | null>(null);
  const [positionFilter, setPositionFilter] = useState<FilterPosition>("ALL");
  const [schoolFilter, setSchoolFilter] = useState<FilterSchool>("ALL");

  const playerById = useMemo(() => {
    return new Map(players.map((player) => [player.season_player_id, player]));
  }, [players]);

  const selectedIds = useMemo(() => readSelectionIds(selections), [selections]);

  const selectedPlayers = useMemo(
    () =>
      selectedIds
        .map((id) => playerById.get(id))
        .filter(Boolean) as PlayerOption[],
    [playerById, selectedIds],
  );

  const activeSlot = useMemo(
    () => PITCH_SLOTS.find((slot) => slot.id === activeSlotId) || null,
    [activeSlotId],
  );

  const validation = useMemo(() => {
    const counts = countByPosition(selectedPlayers);
    const schoolCounts = new Map<ArenaSchoolKey, number>();
    const stars = selectedPlayers.reduce(
      (total, player) => total + player.star_rating,
      0,
    );

    selectedPlayers.forEach((player) => {
      schoolCounts.set(
        player.school_key,
        (schoolCounts.get(player.school_key) || 0) + 1,
      );
    });

    const schoolLimitOk = Array.from(schoolCounts.values()).every(
      (count) => count <= SCHOOL_LIMIT,
    );

    return {
      counts,
      schoolCounts,
      stars,
      players: selectedPlayers.length,
      schoolLimitOk,
      isValid:
        selectedPlayers.length === PLAYER_LIMIT &&
        counts.GK === POSITION_LIMITS.GK &&
        counts.DF === POSITION_LIMITS.DF &&
        counts.MF === POSITION_LIMITS.MF &&
        counts.FW === POSITION_LIMITS.FW &&
        stars <= STAR_LIMIT &&
        schoolLimitOk,
    };
  }, [selectedPlayers]);

  const filteredPlayers = useMemo(() => {
    const slotPosition = activeSlot?.position;
    const effectivePositionFilter =
      positionFilter === "ALL" ? slotPosition : positionFilter;

    return players.filter((player) => {
      const positionOk =
        !effectivePositionFilter ||
        player.fantasy_position === effectivePositionFilter;
      const schoolOk =
        schoolFilter === "ALL" || player.school_key === schoolFilter;
      return positionOk && schoolOk;
    });
  }, [activeSlot, players, positionFilter, schoolFilter]);

  const redirectToArenaLogin = useCallback(() => {
    setState("unauthenticated");
    router.replace(
      `/arena/login?next=${encodeURIComponent("/arena/fantasy/my-team")}`,
    );
  }, [router]);

  const loadFantasy = useCallback(async () => {
    setState("loading");
    setErrorText("");
    setMessage("");
    setIsPreviewMode(false);
    setProfileId("");
    setIsSaving(false);

    if (isDevFantasyPreview()) {
      setWeek(DEV_PREVIEW_WEEK);
      setProfileId("");
      setLineupStatus("draft");
      setPlayers(buildDevPreviewPlayers());
      setSelections(emptySelections());
      setIsPreviewMode(true);
      setState("ready");
      return;
    }

    const { data: userData, error: userError } =
      await supabaseBrowser.auth.getUser();

    if (userError) {
      if (userError.message.toLowerCase().includes("session")) {
        redirectToArenaLogin();
        return;
      }

      setState("error");
      setErrorText(userError.message);
      return;
    }

    if (!userData.user) {
      redirectToArenaLogin();
      return;
    }

    const { data: profile, error: profileError } = await supabaseBrowser
      .from("arena_profiles")
      .upsert(
        { auth_user_id: userData.user.id },
        { onConflict: "auth_user_id" },
      )
      .select("id")
      .single();

    if (profileError || !profile) {
      setState("error");
      setErrorText(
        profileError?.message ||
          "Arena profile is not available. (ไม่พบโปรไฟล์อารีนา)",
      );
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
      setSelections(emptySelections());
      setLineupStatus("draft");
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
          `,
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
        const teamName = team?.short_name || team?.name || "Team (ทีม)";
        const school = getArenaSchoolTheme(teamName);
        const stars = setting?.star_rating || 1;
        const fantasyPosition = normalizePosition(
          setting?.fantasy_position_override || row.position,
        );

        return {
          season_player_id: row.id,
          team_id: row.team_id,
          shirt_number: row.shirt_number,
          position: row.position,
          display_name: playerName(row.player),
          team_name: teamName,
          school_key: school.key,
          school_label: school.shortLabel,
          star_rating: stars,
          ovr_rating: playerOvr(stars, row.shirt_number),
          rarity: playerRarity(stars),
          fantasy_status: setting?.fantasy_status || "active",
          fantasy_position: fantasyPosition,
        };
      })
      .filter((player) => player.fantasy_status === "active");

    setPlayers(loadedPlayers);

    const nextSelections = emptySelections();
    if (lineupResult.data) {
      const lineupData = lineupResult.data as ArenaLineupRow;
      setLineupStatus(lineupData.status || "draft");
      const lineupPlayers = (lineupData.arena_lineup_players || []).sort(
        (a, b) => (a.slot_number || 0) - (b.slot_number || 0),
      );

      lineupPlayers.forEach(
        (
          player,
          index: number,
        ) => {
          const slot = PITCH_SLOTS[(player.slot_number || index + 1) - 1];
          if (slot) nextSelections[slot.id] = player.season_player_id;
        },
      );
    } else {
      setLineupStatus("draft");
    }

    setSelections(nextSelections);
    setState("ready");
  }, [redirectToArenaLogin]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadFantasy();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadFantasy]);

  function openSelector(slot: PitchSlot) {
    if (lineupStatus === "locked") return;
    setActiveSlotId(slot.id);
    setPositionFilter(slot.position);
    setSchoolFilter("ALL");
    setMessage("");
    setErrorText("");
  }

  function removeFromSlot(slotId: string) {
    if (lineupStatus === "locked") return;
    setSelections((current) => ({ ...current, [slotId]: null }));
    setMessage("");
  }

  function canPlacePlayer(player: PlayerOption, slot: PitchSlot | null) {
    if (!slot) return { ok: false, reason: "Choose a slot first." };
    if (player.fantasy_position !== slot.position) {
      return { ok: false, reason: "Position mismatch (ตำแหน่งไม่ตรง)" };
    }

    const currentSlotPlayerId = selections[slot.id];
    const alreadySelectedElsewhere = Object.entries(selections).some(
      ([slotId, playerId]) =>
        slotId !== slot.id && playerId === player.season_player_id,
    );
    if (alreadySelectedElsewhere) {
      return { ok: false, reason: "Already selected (เลือกแล้ว)" };
    }

    const nextPlayers = selectedPlayers
      .filter((selected) => selected.season_player_id !== currentSlotPlayerId)
      .concat(player);
    const nextCounts = countByPosition(nextPlayers);
    const nextStars = nextPlayers.reduce(
      (total, selected) => total + selected.star_rating,
      0,
    );
    const nextSchoolCount = nextPlayers.filter(
      (selected) => selected.school_key === player.school_key,
    ).length;

    if (nextPlayers.length > PLAYER_LIMIT) {
      return { ok: false, reason: "11 players max (สูงสุด 11 คน)" };
    }
    if (nextCounts[player.fantasy_position] > POSITION_LIMITS[player.fantasy_position]) {
      return { ok: false, reason: "Position limit (เกินโควตาตำแหน่ง)" };
    }
    if (nextStars > STAR_LIMIT) {
      return { ok: false, reason: "Star cap 38 (ดาวเกิน 38)" };
    }
    if (nextSchoolCount > SCHOOL_LIMIT) {
      return { ok: false, reason: "School max 5 (โรงเรียนละไม่เกิน 5)" };
    }

    return { ok: true, reason: "Available (เลือกได้)" };
  }

  function selectPlayer(player: PlayerOption) {
    if (!activeSlot) return;
    const availability = canPlacePlayer(player, activeSlot);
    if (!availability.ok) return;

    setSelections((current) => ({
      ...current,
      [activeSlot.id]: player.season_player_id,
    }));
    setActiveSlotId(null);
    setMessage("");
  }

  async function saveTeam() {
    setErrorText("");
    setMessage("");

    if (!week) {
      setErrorText("Fantasy week is not available. (ไม่พบสัปดาห์แฟนตาซี)");
      return;
    }

    if (!validation.isValid) {
      setErrorText(
        "Team is not valid yet. Fill 11 players with GK 1, DF 4, MF 4, FW 2, stars <= 38, and school max 5. (ทีมยังไม่ถูกต้อง กรุณาจัดให้ครบตามกติกา)",
      );
      return;
    }

    if (isPreviewMode) {
      setMessage(
        "Team validated successfully for this sprint. No database write was made. (ตรวจทีมสำเร็จสำหรับสปรินต์นี้ ยังไม่บันทึกลงฐานข้อมูล)",
      );
      return;
    }

    if (!profileId) {
      setErrorText(
        "Arena profile is not available. Please refresh and try again. (ไม่พบโปรไฟล์อารีนา กรุณารีเฟรชแล้วลองใหม่)",
      );
      return;
    }

    if (week.status !== "open") {
      setErrorText(
        "This fantasy week is not open for saving. (สัปดาห์แฟนตาซีนี้ยังไม่เปิดให้บันทึก)",
      );
      return;
    }

    const lineupPlayers = readSelectedLineupPlayers(selections);
    if (lineupPlayers.length !== PLAYER_LIMIT) {
      setErrorText(
        "Team is not valid yet. Fill all 11 slots before saving. (กรุณาเลือกผู้เล่นให้ครบ 11 ช่องก่อนบันทึก)",
      );
      return;
    }

    setIsSaving(true);

    const { data: lineup, error: lineupError } = await supabaseBrowser
      .from("arena_weekly_lineups")
      .upsert(
        {
          week_id: week.id,
          profile_id: profileId,
          status: "draft",
          submitted_at: null,
        },
        { onConflict: "week_id,profile_id" },
      )
      .select("id")
      .single();

    if (lineupError || !lineup) {
      setIsSaving(false);
      setErrorText(lineupError?.message || "Could not save lineup draft.");
      return;
    }

    const { error: deleteError } = await supabaseBrowser
      .from("arena_lineup_players")
      .delete()
      .eq("lineup_id", lineup.id);

    if (deleteError) {
      setIsSaving(false);
      setErrorText(deleteError.message);
      return;
    }

    const { error: insertError } = await supabaseBrowser
      .from("arena_lineup_players")
      .insert(
        lineupPlayers.map((player) => ({
          lineup_id: lineup.id,
          season_player_id: player.season_player_id,
          slot_number: player.slot_number,
        })),
      );

    if (insertError) {
      setIsSaving(false);
      setErrorText(insertError.message);
      return;
    }

    const { error: submitError } = await supabaseBrowser
      .from("arena_weekly_lineups")
      .update({
        status: "submitted",
        submitted_at: new Date().toISOString(),
      })
      .eq("id", lineup.id)
      .eq("profile_id", profileId);

    if (submitError) {
      setIsSaving(false);
      setErrorText(submitError.message);
      return;
    }

    setLineupStatus("submitted");
    setIsSaving(false);
    setMessage("Team saved successfully. (บันทึกทีมสำเร็จ)");
  }

  if (state === "loading") {
    return (
      <main className="min-h-screen bg-[#05070d] px-5 py-10 text-zinc-300">
        <div className="mx-auto max-w-7xl border border-white/10 bg-zinc-950 p-6">
          Loading fantasy pitch builder... (กำลังโหลดตัวจัดทีมแฟนตาซี)
        </div>
      </main>
    );
  }

  if (state === "unauthenticated") {
    return (
      <main className="min-h-screen bg-[#05070d] px-5 py-10 text-white">
        <section className="mx-auto max-w-6xl border border-white/10 bg-zinc-950 p-6">
          <p className="text-xs font-black uppercase tracking-[0.24em] text-red-300">
            Login Required (ต้องเข้าสู่ระบบ)
          </p>
          <h1 className="mt-3 text-3xl font-black uppercase">
            My Team (ทีมของฉัน)
          </h1>
          <p className="mt-3 text-zinc-400">
            Sign in before creating an Arena Fantasy lineup. (เข้าสู่ระบบก่อนจัดทีมอารีนาแฟนตาซี)
          </p>
        </section>
      </main>
    );
  }

  return (
    <ArenaShell active="team" title="My Team Squad Builder">
      <section className="relative overflow-hidden px-5 pb-8 pt-8 md:px-8 lg:px-12">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_8%,rgba(34,197,94,0.28),transparent_28%),radial-gradient(circle_at_78%_6%,rgba(239,68,68,0.24),transparent_25%),radial-gradient(circle_at_55%_72%,rgba(250,204,21,0.12),transparent_30%),linear-gradient(135deg,#05070d_0%,#07120d_46%,#130711_100%)]" />
        <div className="absolute inset-0 opacity-25 [background:linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(0deg,rgba(255,255,255,0.05)_1px,transparent_1px)] [background-size:42px_42px]" />
        <div className="relative mx-auto max-w-7xl">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.28em] text-emerald-300">
                จัดทีมแฟนตาซี
              </p>
              <h1 className="mt-3 max-w-full break-words text-3xl font-black uppercase leading-tight sm:text-4xl md:text-6xl">
                ทีมของฉัน
              </h1>
              <p className="mt-4 max-w-3xl break-words text-sm leading-7 text-zinc-300 md:text-base">
                เลือกนักเตะให้ครบ 11 คนตามแผน 1-4-4-2 แล้วกดบันทึกทีมเพื่อส่งทีมประจำสัปดาห์
              </p>
            </div>
            <Link
              href="/arena/fantasy"
              className="w-fit border border-white/15 bg-white/10 px-4 py-3 text-sm font-black uppercase tracking-[0.14em] text-zinc-100 hover:border-emerald-300 hover:bg-emerald-400/10"
            >
              กลับ
            </Link>
          </div>
        </div>
      </section>

      <ArenaProgressJourney currentStep={lineupStatus === "submitted" ? 3 : 2} />

      <section className="mx-auto grid max-w-7xl gap-6 px-5 pb-16 md:px-8 lg:grid-cols-[minmax(0,1fr)_360px] lg:px-12">
        <div className="space-y-5">
          {errorText ? (
            <div className="border border-red-500/40 bg-red-950/50 p-4 text-sm font-bold text-red-100 shadow-[0_18px_50px_rgba(127,29,29,0.25)]">
              {errorText}
            </div>
          ) : null}

          {message ? (
            <div className="border border-emerald-400/40 bg-emerald-950/40 p-4 text-sm font-bold text-emerald-100 shadow-[0_18px_50px_rgba(6,78,59,0.25)]">
              {message}
            </div>
          ) : null}

          {!week ? (
            <section className="border border-white/10 bg-zinc-950 p-6 text-zinc-300">
              No Arena Fantasy week is open yet. (ยังไม่มีสัปดาห์อารีนาแฟนตาซีที่เปิดอยู่)
            </section>
          ) : (
            <FootballPitch
              lineupStatus={lineupStatus}
              selections={selections}
              playerById={playerById}
              week={week}
              onOpenSlot={openSelector}
              onRemoveSlot={removeFromSlot}
            />
          )}
        </div>

        <aside className="space-y-5">
          <RulesPanel validation={validation} />
          <section className="relative overflow-hidden border border-emerald-300/20 bg-[#06110d] p-5 shadow-[0_30px_90px_rgba(0,0,0,0.42)]">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_82%_0%,rgba(34,197,94,0.18),transparent_34%)]" />
            <div className="relative">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-zinc-500">
              ภารกิจตอนนี้
            </p>
            <h2 className="mt-2 text-xl font-black text-white">
              {lineupStatus === "submitted" ? "ส่งทีมเรียบร้อย" : "ส่งทีมประจำสัปดาห์"}
            </h2>
            <p className="mt-2 text-sm text-zinc-500">
              แมตช์เดย์: {week?.name || "-"} / สถานะทีม: {lineupStatus}
            </p>
            <p className="mt-2 text-sm font-bold text-emerald-200">
              นักเตะที่เลือกได้: {players.length} คน
            </p>
            {isPreviewMode ? (
              <p className="mt-2 border border-amber-300/30 bg-amber-300/10 px-3 py-2 text-xs font-black uppercase tracking-[0.14em] text-amber-100">
                Dev-only preview
              </p>
            ) : null}
            <button
              type="button"
              onClick={() => void saveTeam()}
              disabled={!week || lineupStatus === "locked" || isSaving}
              className="mt-5 w-full bg-emerald-300 px-5 py-4 text-sm font-black uppercase tracking-[0.16em] text-zinc-950 shadow-[0_0_32px_rgba(110,231,183,0.22)] hover:bg-white disabled:cursor-not-allowed disabled:opacity-45"
            >
              {isSaving ? "กำลังบันทึก..." : "บันทึกและส่งทีม"}
            </button>
            <p className="mt-3 text-xs leading-5 text-zinc-500">
              {isPreviewMode
                ? "โหมด preview ตรวจทีมเท่านั้น ไม่เขียนข้อมูลลงฐานข้อมูล"
                : "เมื่อกดบันทึก ทีมนี้จะถูกส่งสำหรับแมตช์เดย์ที่เปิดอยู่"}
            </p>
            </div>
          </section>
        </aside>
      </section>

      {activeSlot ? (
        <PlayerSelector
          activeSlot={activeSlot}
          players={filteredPlayers}
          positionFilter={positionFilter}
          schoolFilter={schoolFilter}
          canPlacePlayer={(player) => canPlacePlayer(player, activeSlot)}
          onPositionFilter={setPositionFilter}
          onSchoolFilter={setSchoolFilter}
          onClose={() => setActiveSlotId(null)}
          onSelect={selectPlayer}
        />
      ) : null}
    </ArenaShell>
  );
}

function FootballPitch({
  lineupStatus,
  selections,
  playerById,
  week,
  onOpenSlot,
  onRemoveSlot,
}: {
  lineupStatus: string;
  selections: Record<string, string | null>;
  playerById: Map<string, PlayerOption>;
  week: ArenaWeek;
  onOpenSlot: (slot: PitchSlot) => void;
  onRemoveSlot: (slotId: string) => void;
}) {
  return (
    <FantasyPitchV2
      title={week.name}
      subtitle="Tap a slot to select a player. (แตะช่องเพื่อเลือกผู้เล่น)"
      status={lineupStatus}
    >
      <div className="hidden flex-col gap-2 border-b border-white/10 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-black uppercase text-white">
            {week.name}
          </h2>
          <p className="mt-1 text-sm text-zinc-500">
            Tap a slot to select a player. (แตะช่องเพื่อเลือกผู้เล่น)
          </p>
        </div>
        <span className="w-fit border border-emerald-300/30 bg-emerald-300/10 px-3 py-2 text-xs font-black uppercase tracking-[0.16em] text-emerald-200">
          {lineupStatus}
        </span>
      </div>

      <div className="p-3 sm:p-5">
        <div className="relative mx-auto min-h-[720px] max-w-5xl overflow-hidden border border-emerald-200/25 bg-[linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(0deg,rgba(255,255,255,0.06)_1px,transparent_1px),linear-gradient(160deg,#0b3d22,#0f5d2c_45%,#092814)] bg-[length:36px_36px,36px_36px,auto] p-3 sm:min-h-[820px] sm:p-5">
          <div className="absolute inset-4 border border-white/25" />
          <div className="absolute left-1/2 top-1/2 h-32 w-32 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/25" />
          <div className="absolute left-1/2 top-1/2 h-px w-full -translate-x-1/2 bg-white/25" />
          <div className="absolute left-1/2 top-4 h-24 w-44 -translate-x-1/2 border-x border-b border-white/25" />
          <div className="absolute bottom-4 left-1/2 h-24 w-44 -translate-x-1/2 border-x border-t border-white/25" />

          <div className="relative z-10 flex min-h-[690px] flex-col justify-between gap-5 py-5 sm:min-h-[790px]">
            {FORMATION.map((line) => (
              <div key={line.label} className="space-y-3">
                <p className="text-center text-[10px] font-black uppercase tracking-[0.26em] text-white/55">
                  {line.label}
                </p>
                <div
                  className={cx(
                    "grid justify-items-center gap-3",
                    line.slots.length === 1 && "grid-cols-1",
                    line.slots.length === 2 && "grid-cols-2",
                    line.slots.length === 4 && "grid-cols-2 md:grid-cols-4",
                  )}
                >
                  {line.slots.map((slot) => {
                    const playerId = selections[slot.id];
                    const player = playerId ? playerById.get(playerId) : null;

                    return (
                      <PitchSlotCard
                        key={slot.id}
                        slot={slot}
                        player={player || null}
                        locked={lineupStatus === "locked"}
                        onOpen={() => onOpenSlot(slot)}
                        onRemove={() => onRemoveSlot(slot.id)}
                      />
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </FantasyPitchV2>
  );
}

function PitchSlotCard({
  slot,
  player,
  locked,
  onOpen,
  onRemove,
}: {
  slot: PitchSlot;
  player: PlayerOption | null;
  locked: boolean;
  onOpen: () => void;
  onRemove: () => void;
}) {
  if (!player) {
    return (
      <button
        type="button"
        onClick={onOpen}
        disabled={locked}
        className="grid h-36 w-full min-w-0 max-w-[168px] place-items-center border border-dashed border-white/30 bg-black/30 p-3 text-center transition hover:border-emerald-200 hover:bg-emerald-300/10 disabled:opacity-45 sm:h-44"
      >
        <span className="grid h-12 w-12 place-items-center rounded-full border border-white/30 text-3xl font-black text-emerald-200">
          +
        </span>
        <span className="text-xs font-black uppercase tracking-[0.18em] text-white">
          {slot.label}
        </span>
        <span className="text-[11px] text-zinc-400">Empty (ว่าง)</span>
      </button>
    );
  }

  return (
    <div className="relative w-full max-w-[168px]">
      <button
        type="button"
        onClick={onOpen}
        disabled={locked}
        className="block w-full disabled:cursor-default"
      >
        <PlayerCard
          playerName={player.display_name}
          school={player.school_key}
          position={player.fantasy_position}
          rating={player.ovr_rating}
          stars={player.star_rating}
          rarity={player.rarity}
          variant="compact"
          className="scale-[0.82] sm:scale-90 origin-top"
        />
      </button>
      <div className="-mt-8 border border-white/10 bg-black/55 p-2 text-center">
        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-200">
          {slot.label}
        </p>
        <p className="truncate text-[11px] text-zinc-300">
          #{player.shirt_number || "-"} / {player.school_label}
        </p>
        {!locked ? (
          <button
            type="button"
            onClick={onRemove}
            className="mt-2 text-[10px] font-black uppercase tracking-[0.16em] text-red-300 hover:text-red-100"
          >
            Remove (ถอด)
          </button>
        ) : null}
      </div>
    </div>
  );
}

function RulesPanel({
  validation,
}: {
  validation: {
    counts: Record<PositionGroup, number>;
    schoolCounts: Map<ArenaSchoolKey, number>;
    stars: number;
    players: number;
    schoolLimitOk: boolean;
    isValid: boolean;
  };
}) {
  const rows = [
    {
      label: "Players (ผู้เล่น)",
      value: `${validation.players}/${PLAYER_LIMIT}`,
      ok: validation.players === PLAYER_LIMIT,
    },
    {
      label: "Stars (ดาว)",
      value: `${validation.stars}/${STAR_LIMIT}`,
      ok: validation.stars <= STAR_LIMIT,
    },
    {
      label: "GK",
      value: `${validation.counts.GK}/${POSITION_LIMITS.GK}`,
      ok: validation.counts.GK === POSITION_LIMITS.GK,
    },
    {
      label: "DF",
      value: `${validation.counts.DF}/${POSITION_LIMITS.DF}`,
      ok: validation.counts.DF === POSITION_LIMITS.DF,
    },
    {
      label: "MF",
      value: `${validation.counts.MF}/${POSITION_LIMITS.MF}`,
      ok: validation.counts.MF === POSITION_LIMITS.MF,
    },
    {
      label: "FW",
      value: `${validation.counts.FW}/${POSITION_LIMITS.FW}`,
      ok: validation.counts.FW === POSITION_LIMITS.FW,
    },
    {
      label: "School limit max 5 (โรงเรียนละไม่เกิน 5)",
      value: validation.schoolLimitOk ? "OK" : "Over",
      ok: validation.schoolLimitOk,
    },
  ];

  return (
    <section className="relative overflow-hidden border border-white/10 bg-[#080d18] p-5 shadow-[0_30px_90px_rgba(0,0,0,0.35)]">
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-red-400 via-yellow-200 to-emerald-300" />
      <h2 className="text-2xl font-black uppercase text-white">
        Rules (กติกา)
      </h2>
      <div className="mt-5 space-y-3">
        {rows.map((row) => (
          <div
            key={row.label}
            className="flex items-center justify-between gap-3 border-b border-white/10 bg-black/15 px-3 py-3 text-sm"
          >
            <span className="text-zinc-400">{row.label}</span>
            <strong className={ruleStateClass(row.ok)}>{row.value}</strong>
          </div>
        ))}
      </div>

      <div className="mt-5 grid grid-cols-2 gap-2">
        {SCHOOL_KEYS.map((key) => {
          const school = ARENA_SCHOOLS[key];
          const count = validation.schoolCounts.get(key) || 0;
          const style = {
            "--school-accent": school.colors.accent,
          } as CSSProperties;

          return (
            <div
              key={key}
              className="border border-white/10 bg-white/[0.04] p-3"
              style={style}
            >
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[var(--school-accent)]">
                {key}
              </p>
              <p className="mt-1 text-lg font-black text-white">
                {count}/{SCHOOL_LIMIT}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function PlayerSelector({
  activeSlot,
  players,
  positionFilter,
  schoolFilter,
  canPlacePlayer,
  onPositionFilter,
  onSchoolFilter,
  onClose,
  onSelect,
}: {
  activeSlot: PitchSlot;
  players: PlayerOption[];
  positionFilter: FilterPosition;
  schoolFilter: FilterSchool;
  canPlacePlayer: (player: PlayerOption) => { ok: boolean; reason: string };
  onPositionFilter: (position: FilterPosition) => void;
  onSchoolFilter: (school: FilterSchool) => void;
  onClose: () => void;
  onSelect: (player: PlayerOption) => void;
}) {
  return (
    <div className="fixed inset-0 z-50 bg-black/78 p-0 backdrop-blur-sm sm:p-5">
      <div className="ml-auto flex h-full w-full max-w-2xl flex-col border-l border-emerald-300/20 bg-[#06110d] shadow-[0_0_100px_rgba(0,0,0,0.65)]">
        <header className="border-b border-emerald-200/10 bg-black/25 p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-emerald-300">
                Select Player (เลือกผู้เล่น)
              </p>
              <h2 className="mt-2 text-2xl font-black text-white">
                {activeSlot.label}
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="grid h-10 w-10 place-items-center border border-white/15 text-xl font-black text-white hover:bg-white/10"
              aria-label="Close selector"
            >
              x
            </button>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <FilterButtons
              label="Position (ตำแหน่ง)"
              values={["ALL", "GK", "DF", "MF", "FW"]}
              active={positionFilter}
              onChange={(value) => onPositionFilter(value as FilterPosition)}
            />
            <FilterButtons
              label="School (โรงเรียน)"
              values={["ALL", ...SCHOOL_KEYS]}
              active={schoolFilter}
              onChange={(value) => onSchoolFilter(value as FilterSchool)}
            />
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          <div className="grid gap-3">
            {players.map((player) => {
              const availability = canPlacePlayer(player);
              return (
                <button
                  key={player.season_player_id}
                  type="button"
                  onClick={() => onSelect(player)}
                  disabled={!availability.ok}
                  className={cx(
                    "border p-4 text-left transition",
                    availability.ok
                      ? "border-white/10 bg-[#080d18] hover:border-emerald-300 hover:bg-emerald-300/10"
                      : "cursor-not-allowed border-white/5 bg-[#080d18]/45 opacity-45",
                  )}
                >
                  <div className="grid grid-cols-[1fr_auto] gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-base font-black text-white">
                        {player.display_name}
                      </p>
                      <p className="mt-1 text-xs text-zinc-500">
                        #{player.shirt_number || "-"} / {player.school_label} /{" "}
                        {player.team_name}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-black text-emerald-200">
                        {player.ovr_rating}
                      </p>
                      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-zinc-500">
                        OVR
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-black uppercase tracking-[0.14em]">
                    <span className="border border-white/10 bg-white/[0.04] px-2 py-1 text-zinc-300">
                      {player.fantasy_position}
                    </span>
                    <span className="border border-white/10 bg-white/[0.04] px-2 py-1 text-yellow-200">
                      Stars {player.star_rating}/5
                    </span>
                    <span
                      className={cx(
                        "border px-2 py-1",
                        availability.ok
                          ? "border-emerald-300/30 text-emerald-200"
                          : "border-red-300/30 text-red-200",
                      )}
                    >
                      {availability.reason}
                    </span>
                  </div>
                </button>
              );
            })}

            {players.length === 0 ? (
              <div className="border border-white/10 bg-zinc-950 p-6 text-center text-sm text-zinc-400">
                No players match these filters. (ไม่มีผู้เล่นตรงกับตัวกรอง)
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

function FilterButtons({
  label,
  values,
  active,
  onChange,
}: {
  label: string;
  values: readonly string[];
  active: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">
        {label}
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        {values.map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => onChange(value)}
            className={cx(
              "border px-3 py-2 text-[11px] font-black uppercase tracking-[0.14em]",
              active === value
                ? "border-emerald-200 bg-emerald-200 text-zinc-950"
                : "border-white/10 bg-white/[0.04] text-zinc-300 hover:border-emerald-200/50",
            )}
          >
            {value}
          </button>
        ))}
      </div>
    </div>
  );
}
