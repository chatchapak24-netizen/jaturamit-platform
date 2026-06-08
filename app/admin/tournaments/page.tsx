"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase-browser";

type Competition = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  status: string | null;
};

type SupabaseRelation<T> = T | T[] | null;

type Season = {
  id: string;
  competition_id: string;
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

type Team = {
  id: string;
  name: string;
  short_name: string | null;
};

type SeasonTeam = {
  id: string;
  season_id: string;
  team_id: string;
  team: SeasonTeamTeam | null;
};

type SeasonTeamTeam = {
  name: string;
  short_name: string | null;
};

type SeasonTeamQueryRow = Omit<SeasonTeam, "team"> & {
  team: SupabaseRelation<SeasonTeamTeam>;
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

function makeSlug(text: string) {
  return text
    .trim()
    .toLowerCase()
    .replace(/[^\u0E00-\u0E7Fa-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export default function AdminTournamentsPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [seasonTeams, setSeasonTeams] = useState<SeasonTeam[]>([]);

  const [competitionName, setCompetitionName] = useState("");
  const [competitionSlug, setCompetitionSlug] = useState("");
  const [competitionDescription, setCompetitionDescription] = useState("");

  const [editingCompetitionId, setEditingCompetitionId] = useState("");
  const [editCompetitionName, setEditCompetitionName] = useState("");
  const [editCompetitionSlug, setEditCompetitionSlug] = useState("");
  const [editCompetitionDescription, setEditCompetitionDescription] =
    useState("");
  const [editCompetitionStatus, setEditCompetitionStatus] = useState("active");

  const [seasonCompetitionId, setSeasonCompetitionId] = useState("");
  const [seasonName, setSeasonName] = useState("");
  const [seasonYear, setSeasonYear] = useState("2026");
  const [seasonStatus, setSeasonStatus] = useState("draft");

  const [editingSeasonId, setEditingSeasonId] = useState("");
  const [editSeasonCompetitionId, setEditSeasonCompetitionId] = useState("");
  const [editSeasonName, setEditSeasonName] = useState("");
  const [editSeasonYear, setEditSeasonYear] = useState("");
  const [editSeasonStatus, setEditSeasonStatus] = useState("draft");

  const [selectedSeasonId, setSelectedSeasonId] = useState("");
  const [selectedTeamId, setSelectedTeamId] = useState("");

  const [message, setMessage] = useState("");
  const [errorText, setErrorText] = useState("");

  const selectedSeasonTeams = useMemo(() => {
    return seasonTeams.filter((item) => item.season_id === selectedSeasonId);
  }, [seasonTeams, selectedSeasonId]);

  const isEditingCompetition = Boolean(editingCompetitionId);
  const isEditingSeason = Boolean(editingSeasonId);

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

  const loadData = useCallback(async () => {
    const [competitionsResult, seasonsResult, teamsResult, seasonTeamsResult] =
      await Promise.all([
        supabaseBrowser
          .from("competitions")
          .select("id, name, slug, description, status")
          .order("name", { ascending: true }),

        supabaseBrowser
          .from("seasons")
          .select(`
            id,
            competition_id,
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
          .order("short_name", { ascending: true }),

        supabaseBrowser
          .from("season_teams")
          .select(`
            id,
            season_id,
            team_id,
            team:team_id(name, short_name)
          `),
      ]);

    if (competitionsResult.error) {
      setErrorText(competitionsResult.error.message);
      return;
    }

    if (seasonsResult.error) {
      setErrorText(seasonsResult.error.message);
      return;
    }

    if (teamsResult.error) {
      setErrorText(teamsResult.error.message);
      return;
    }

    if (seasonTeamsResult.error) {
      setErrorText(seasonTeamsResult.error.message);
      return;
    }

    const loadedCompetitions = (competitionsResult.data ||
      []) as Competition[];
    const loadedSeasons: Season[] = (
      (seasonsResult.data || []) as SeasonQueryRow[]
    ).map((season) => ({
      ...season,
      competition: normalizeSeasonCompetition(season.competition),
    }));
    const loadedSeasonTeams: SeasonTeam[] = (
      (seasonTeamsResult.data || []) as SeasonTeamQueryRow[]
    ).map((seasonTeam) => ({
      ...seasonTeam,
      team: normalizeRelation(seasonTeam.team),
    }));

    setCompetitions(loadedCompetitions);
    setSeasons(loadedSeasons);
    setTeams((teamsResult.data || []) as Team[]);
    setSeasonTeams(loadedSeasonTeams);

    if (!seasonCompetitionId && loadedCompetitions[0]?.id) {
      setSeasonCompetitionId(loadedCompetitions[0].id);
    }

    if (!selectedSeasonId && loadedSeasons[0]?.id) {
      setSelectedSeasonId(loadedSeasons[0].id);
    }
  }, [seasonCompetitionId, selectedSeasonId]);

  useEffect(() => {
    async function init() {
      setLoading(true);

      const isAdmin = await checkAdmin();
      if (!isAdmin) return;

      await loadData();
      setLoading(false);
    }

    init();
  }, [checkAdmin, loadData]);

  function resetCompetitionForm() {
    setCompetitionName("");
    setCompetitionSlug("");
    setCompetitionDescription("");
  }

  function resetSeasonForm() {
    setSeasonName("");
    setSeasonYear("2026");
    setSeasonStatus("draft");
  }

  function cancelEditCompetition() {
    setEditingCompetitionId("");
    setEditCompetitionName("");
    setEditCompetitionSlug("");
    setEditCompetitionDescription("");
    setEditCompetitionStatus("active");
  }

  function cancelEditSeason() {
    setEditingSeasonId("");
    setEditSeasonCompetitionId("");
    setEditSeasonName("");
    setEditSeasonYear("");
    setEditSeasonStatus("draft");
  }

  function startEditCompetition(competition: Competition) {
    setMessage("");
    setErrorText("");

    setEditingCompetitionId(competition.id);
    setEditCompetitionName(competition.name || "");
    setEditCompetitionSlug(competition.slug || "");
    setEditCompetitionDescription(competition.description || "");
    setEditCompetitionStatus(competition.status || "active");

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function startEditSeason(season: Season) {
    setMessage("");
    setErrorText("");

    setEditingSeasonId(season.id);
    setEditSeasonCompetitionId(season.competition_id || "");
    setEditSeasonName(season.name || "");
    setEditSeasonYear(
      season.year === null || season.year === undefined
        ? ""
        : String(season.year)
    );
    setEditSeasonStatus(season.status || "draft");

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function addCompetition(e: React.FormEvent) {
    e.preventDefault();

    setMessage("");
    setErrorText("");

    const finalSlug = competitionSlug || makeSlug(competitionName);

    if (!competitionName.trim()) {
      setErrorText("กรุณาใส่ชื่อรายการแข่งขัน");
      return;
    }

    if (!finalSlug.trim()) {
      setErrorText("กรุณาใส่ slug");
      return;
    }

    setSaving(true);

    const { error } = await supabaseBrowser.from("competitions").insert({
      name: competitionName.trim(),
      slug: finalSlug.trim(),
      description: competitionDescription || null,
      status: "active",
    });

    if (error) {
      setErrorText(error.message);
      setSaving(false);
      return;
    }

    resetCompetitionForm();
    await loadData();

    setMessage("สร้างรายการแข่งขันเรียบร้อยแล้ว");
    setSaving(false);
  }

  async function updateCompetition(e: React.FormEvent) {
    e.preventDefault();

    setMessage("");
    setErrorText("");

    if (!editingCompetitionId) {
      setErrorText("ไม่พบรายการแข่งขันที่จะแก้ไข");
      return;
    }

    const finalSlug = editCompetitionSlug || makeSlug(editCompetitionName);

    if (!editCompetitionName.trim()) {
      setErrorText("กรุณาใส่ชื่อรายการแข่งขัน");
      return;
    }

    if (!finalSlug.trim()) {
      setErrorText("กรุณาใส่ slug");
      return;
    }

    setSaving(true);

    const { error } = await supabaseBrowser
      .from("competitions")
      .update({
        name: editCompetitionName.trim(),
        slug: finalSlug.trim(),
        description: editCompetitionDescription || null,
        status: editCompetitionStatus || "active",
      })
      .eq("id", editingCompetitionId);

    if (error) {
      setErrorText(error.message);
      setSaving(false);
      return;
    }

    cancelEditCompetition();
    await loadData();

    setMessage("แก้ไขรายการแข่งขันเรียบร้อยแล้ว");
    setSaving(false);
  }

  async function addSeason(e: React.FormEvent) {
    e.preventDefault();

    setMessage("");
    setErrorText("");

    if (!seasonCompetitionId) {
      setErrorText("กรุณาเลือกรายการแข่งขัน");
      return;
    }

    if (!seasonName.trim()) {
      setErrorText("กรุณาใส่ชื่อซีซั่น");
      return;
    }

    const parsedYear = seasonYear === "" ? null : Number(seasonYear);

    if (parsedYear !== null && Number.isNaN(parsedYear)) {
      setErrorText("ปีต้องเป็นตัวเลข");
      return;
    }

    setSaving(true);

    const { error } = await supabaseBrowser.from("seasons").insert({
      competition_id: seasonCompetitionId,
      name: seasonName.trim(),
      year: parsedYear,
      status: seasonStatus,
    });

    if (error) {
      setErrorText(error.message);
      setSaving(false);
      return;
    }

    resetSeasonForm();
    await loadData();

    setMessage("สร้างซีซั่นเรียบร้อยแล้ว");
    setSaving(false);
  }

  async function updateSeason(e: React.FormEvent) {
    e.preventDefault();

    setMessage("");
    setErrorText("");

    if (!editingSeasonId) {
      setErrorText("ไม่พบซีซั่นที่จะแก้ไข");
      return;
    }

    if (!editSeasonCompetitionId) {
      setErrorText("กรุณาเลือกรายการแข่งขัน");
      return;
    }

    if (!editSeasonName.trim()) {
      setErrorText("กรุณาใส่ชื่อซีซั่น");
      return;
    }

    const parsedYear =
      editSeasonYear.trim() === "" ? null : Number(editSeasonYear);

    if (parsedYear !== null && Number.isNaN(parsedYear)) {
      setErrorText("ปีต้องเป็นตัวเลข");
      return;
    }

    setSaving(true);

    const { error } = await supabaseBrowser
      .from("seasons")
      .update({
        competition_id: editSeasonCompetitionId,
        name: editSeasonName.trim(),
        year: parsedYear,
        status: editSeasonStatus,
      })
      .eq("id", editingSeasonId);

    if (error) {
      setErrorText(error.message);
      setSaving(false);
      return;
    }

    cancelEditSeason();
    await loadData();

    setMessage("แก้ไขซีซั่นเรียบร้อยแล้ว");
    setSaving(false);
  }

  async function setActiveSeason(seasonId: string) {
    const ok = window.confirm(
      "ต้องการตั้งซีซั่นนี้เป็น active ใช่ไหม? ระบบจะเปลี่ยนซีซั่นอื่นเป็น draft"
    );

    if (!ok) return;

    setMessage("");
    setErrorText("");

    const { error: resetError } = await supabaseBrowser
      .from("seasons")
      .update({ status: "draft" })
      .neq("id", seasonId);

    if (resetError) {
      setErrorText(resetError.message);
      return;
    }

    const { error: activeError } = await supabaseBrowser
      .from("seasons")
      .update({ status: "active" })
      .eq("id", seasonId);

    if (activeError) {
      setErrorText(activeError.message);
      return;
    }

    await loadData();
    setMessage("ตั้งซีซั่น active เรียบร้อยแล้ว");
  }

  async function addTeamToSeason(e: React.FormEvent) {
    e.preventDefault();

    setMessage("");
    setErrorText("");

    if (!selectedSeasonId) {
      setErrorText("กรุณาเลือกซีซั่น");
      return;
    }

    if (!selectedTeamId) {
      setErrorText("กรุณาเลือกทีม");
      return;
    }

    const duplicated = seasonTeams.some(
      (item) =>
        item.season_id === selectedSeasonId && item.team_id === selectedTeamId
    );

    if (duplicated) {
      setErrorText("ทีมนี้อยู่ในซีซั่นนี้แล้ว");
      return;
    }

    setSaving(true);

    const { error: seasonTeamError } = await supabaseBrowser
      .from("season_teams")
      .insert({
        season_id: selectedSeasonId,
        team_id: selectedTeamId,
      });

    if (seasonTeamError) {
      setErrorText(seasonTeamError.message);
      setSaving(false);
      return;
    }

    const { error: standingError } = await supabaseBrowser
      .from("standings")
      .insert({
        season_id: selectedSeasonId,
        team_id: selectedTeamId,
        played: 0,
        won: 0,
        drawn: 0,
        lost: 0,
        goals_for: 0,
        goals_against: 0,
        goal_difference: 0,
        points: 0,
      });

    if (standingError) {
      setErrorText(standingError.message);
      setSaving(false);
      return;
    }

    setSelectedTeamId("");
    await loadData();

    setMessage("เพิ่มทีมเข้าซีซั่นและสร้างตารางคะแนนเริ่มต้นเรียบร้อยแล้ว");
    setSaving(false);
  }

  async function removeTeamFromSeason(item: SeasonTeam) {
    const ok = window.confirm(
      "ต้องการเอาทีมนี้ออกจากซีซั่นใช่ไหม? ตารางคะแนนของทีมนี้ในซีซั่นนี้จะถูกลบด้วย"
    );

    if (!ok) return;

    setMessage("");
    setErrorText("");

    const { error: standingError } = await supabaseBrowser
      .from("standings")
      .delete()
      .eq("season_id", item.season_id)
      .eq("team_id", item.team_id);

    if (standingError) {
      setErrorText(standingError.message);
      return;
    }

    const { error: seasonTeamError } = await supabaseBrowser
      .from("season_teams")
      .delete()
      .eq("id", item.id);

    if (seasonTeamError) {
      setErrorText(seasonTeamError.message);
      return;
    }

    await loadData();
    setMessage("ลบทีมออกจากซีซั่นเรียบร้อยแล้ว");
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
          Admin / Tournaments
        </p>

        <h1 className="mt-2 text-4xl font-black">ทัวร์นาเมนต์ / ซีซั่น</h1>

        <p className="mt-3 text-zinc-400">
          เปิดรายการใหม่ สร้างซีซั่นใหม่ แก้ไขข้อมูล และเลือกทีมเข้าร่วมแต่ละซีซั่น
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

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-3xl border border-white/10 bg-zinc-900 p-6">
          <div className="mb-6 flex items-start justify-between gap-4">
            <div>
              <h2 className="text-2xl font-black">
                {isEditingCompetition
                  ? "แก้ไขรายการแข่งขัน"
                  : "สร้างรายการแข่งขันใหม่"}
              </h2>

              <p className="mt-2 text-sm text-zinc-400">
                รายการแข่งขันหลัก เช่น จตุรมิตรราชบุรี หรือ Ratchaburi Youth League
              </p>
            </div>

            {isEditingCompetition && (
              <button
                type="button"
                onClick={cancelEditCompetition}
                className="rounded-xl border border-white/10 px-4 py-2 text-sm font-bold text-zinc-300 hover:bg-white/10"
              >
                ยกเลิก
              </button>
            )}
          </div>

          <form
            onSubmit={
              isEditingCompetition ? updateCompetition : addCompetition
            }
            className="grid gap-4"
          >
            <Field
              label="ชื่อรายการแข่งขัน"
              value={
                isEditingCompetition
                  ? editCompetitionName
                  : competitionName
              }
              onChange={(value) => {
                if (isEditingCompetition) {
                  setEditCompetitionName(value);
                  if (!editCompetitionSlug) {
                    setEditCompetitionSlug(makeSlug(value));
                  }
                } else {
                  setCompetitionName(value);
                  if (!competitionSlug) {
                    setCompetitionSlug(makeSlug(value));
                  }
                }
              }}
              placeholder="เช่น จตุรมิตรราชบุรี"
            />

            <Field
              label="Slug"
              value={
                isEditingCompetition
                  ? editCompetitionSlug
                  : competitionSlug
              }
              onChange={
                isEditingCompetition
                  ? setEditCompetitionSlug
                  : setCompetitionSlug
              }
              placeholder="jaturamit-ratchaburi"
            />

            {isEditingCompetition && (
              <div>
                <label className="mb-2 block text-sm text-zinc-400">
                  สถานะรายการ
                </label>
                <select
                  value={editCompetitionStatus}
                  onChange={(e) => setEditCompetitionStatus(e.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-zinc-950 px-4 py-3 text-white outline-none focus:border-red-400"
                >
                  <option value="active">active</option>
                  <option value="draft">draft</option>
                  <option value="archived">archived</option>
                </select>
              </div>
            )}

            <div>
              <label className="mb-2 block text-sm text-zinc-400">
                คำอธิบาย
              </label>
              <textarea
                value={
                  isEditingCompetition
                    ? editCompetitionDescription
                    : competitionDescription
                }
                onChange={(e) =>
                  isEditingCompetition
                    ? setEditCompetitionDescription(e.target.value)
                    : setCompetitionDescription(e.target.value)
                }
                rows={4}
                className="w-full rounded-2xl border border-white/10 bg-zinc-950 px-4 py-3 text-white outline-none focus:border-red-400"
                placeholder="รายละเอียดรายการแข่งขัน"
              />
            </div>

            <button
              type="submit"
              disabled={saving}
              className="rounded-2xl bg-red-600 px-6 py-3 font-black text-white hover:bg-red-500 disabled:opacity-50"
            >
              {saving
                ? "กำลังบันทึก..."
                : isEditingCompetition
                ? "บันทึกการแก้ไขรายการ"
                : "สร้างรายการแข่งขัน"}
            </button>
          </form>
        </div>

        <div className="rounded-3xl border border-white/10 bg-zinc-900 p-6">
          <div className="mb-6 flex items-start justify-between gap-4">
            <div>
              <h2 className="text-2xl font-black">
                {isEditingSeason ? "แก้ไขซีซั่น" : "สร้างซีซั่นใหม่"}
              </h2>

              <p className="mt-2 text-sm text-zinc-400">
                ซีซั่นย่อยของรายการ เช่น ครั้งที่ 2, U15 2026, U18 2026
              </p>
            </div>

            {isEditingSeason && (
              <button
                type="button"
                onClick={cancelEditSeason}
                className="rounded-xl border border-white/10 px-4 py-2 text-sm font-bold text-zinc-300 hover:bg-white/10"
              >
                ยกเลิก
              </button>
            )}
          </div>

          <form
            onSubmit={isEditingSeason ? updateSeason : addSeason}
            className="grid gap-4"
          >
            <div>
              <label className="mb-2 block text-sm text-zinc-400">
                รายการแข่งขัน
              </label>
              <select
                value={
                  isEditingSeason
                    ? editSeasonCompetitionId
                    : seasonCompetitionId
                }
                onChange={(e) =>
                  isEditingSeason
                    ? setEditSeasonCompetitionId(e.target.value)
                    : setSeasonCompetitionId(e.target.value)
                }
                className="w-full rounded-2xl border border-white/10 bg-zinc-950 px-4 py-3 text-white outline-none focus:border-red-400"
              >
                <option value="">เลือกรายการแข่งขัน</option>
                {competitions.map((competition) => (
                  <option key={competition.id} value={competition.id}>
                    {competition.name}
                  </option>
                ))}
              </select>
            </div>

            <Field
              label="ชื่อซีซั่น"
              value={isEditingSeason ? editSeasonName : seasonName}
              onChange={
                isEditingSeason ? setEditSeasonName : setSeasonName
              }
              placeholder="เช่น ครั้งที่ 3 หรือ U15 2026"
            />

            <Field
              label="ปี"
              value={isEditingSeason ? editSeasonYear : seasonYear}
              type="number"
              onChange={isEditingSeason ? setEditSeasonYear : setSeasonYear}
              placeholder="2026"
            />

            <div>
              <label className="mb-2 block text-sm text-zinc-400">
                สถานะ
              </label>
              <select
                value={isEditingSeason ? editSeasonStatus : seasonStatus}
                onChange={(e) =>
                  isEditingSeason
                    ? setEditSeasonStatus(e.target.value)
                    : setSeasonStatus(e.target.value)
                }
                className="w-full rounded-2xl border border-white/10 bg-zinc-950 px-4 py-3 text-white outline-none focus:border-red-400"
              >
                <option value="draft">draft</option>
                <option value="active">active</option>
                <option value="archived">archived</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="rounded-2xl bg-red-600 px-6 py-3 font-black text-white hover:bg-red-500 disabled:opacity-50"
            >
              {saving
                ? "กำลังบันทึก..."
                : isEditingSeason
                ? "บันทึกการแก้ไขซีซั่น"
                : "สร้างซีซั่น"}
            </button>
          </form>
        </div>
      </section>

      <section className="mt-8 rounded-3xl border border-white/10 bg-zinc-900 p-6">
        <h2 className="text-2xl font-black">รายการแข่งขันทั้งหมด</h2>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {competitions.map((competition) => (
            <article
              key={competition.id}
              className={`rounded-2xl border p-5 ${
                editingCompetitionId === competition.id
                  ? "border-red-400 bg-red-950/30"
                  : "border-white/10 bg-zinc-950"
              }`}
            >
              <p className="text-xs font-bold uppercase tracking-[0.25em] text-red-300">
                {competition.status || "active"}
              </p>

              <h3 className="mt-2 text-xl font-black">{competition.name}</h3>

              <p className="mt-1 text-sm text-zinc-500">
                slug: {competition.slug}
              </p>

              {competition.description && (
                <p className="mt-3 text-sm leading-6 text-zinc-400">
                  {competition.description}
                </p>
              )}

              <button
                onClick={() => startEditCompetition(competition)}
                className="mt-4 rounded-xl border border-white/10 px-4 py-2 text-sm font-bold text-zinc-300 hover:bg-white/10"
              >
                แก้ไข
              </button>
            </article>
          ))}

          {competitions.length === 0 && (
            <div className="rounded-2xl border border-dashed border-white/15 p-8 text-center text-zinc-500 md:col-span-2">
              ยังไม่มีรายการแข่งขัน
            </div>
          )}
        </div>
      </section>

      <section className="mt-8 rounded-3xl border border-white/10 bg-zinc-900 p-6">
        <h2 className="text-2xl font-black">รายการซีซั่นทั้งหมด</h2>

        <div className="mt-6 grid gap-4">
          {seasons.map((season) => (
            <article
              key={season.id}
              className={`rounded-2xl border p-5 ${
                editingSeasonId === season.id
                  ? "border-red-400 bg-red-950/30"
                  : "border-white/10 bg-zinc-950"
              }`}
            >
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.25em] text-red-300">
                    {season.status}
                  </p>
                  <h3 className="mt-2 text-xl font-black">{season.name}</h3>
                  <p className="mt-1 text-sm text-zinc-500">
                    {season.competition?.name} · {season.year || "-"}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => startEditSeason(season)}
                    className="rounded-xl border border-white/10 px-4 py-2 text-sm font-bold text-zinc-300 hover:bg-white/10"
                  >
                    แก้ไข
                  </button>

                  <button
                    onClick={() => setActiveSeason(season.id)}
                    disabled={season.status === "active"}
                    className="rounded-xl border border-white/10 px-4 py-2 text-sm font-bold text-zinc-300 hover:bg-white/10 disabled:opacity-40"
                  >
                    ตั้งเป็น Active
                  </button>
                </div>
              </div>
            </article>
          ))}

          {seasons.length === 0 && (
            <div className="rounded-2xl border border-dashed border-white/15 p-8 text-center text-zinc-500">
              ยังไม่มีซีซั่น
            </div>
          )}
        </div>
      </section>

      <section className="mt-8 rounded-3xl border border-white/10 bg-zinc-900 p-6">
        <h2 className="text-2xl font-black">เลือกทีมเข้าร่วมซีซั่น</h2>

        <form
          onSubmit={addTeamToSeason}
          className="mt-6 grid gap-4 md:grid-cols-3"
        >
          <div>
            <label className="mb-2 block text-sm text-zinc-400">ซีซั่น</label>
            <select
              value={selectedSeasonId}
              onChange={(e) => setSelectedSeasonId(e.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-zinc-950 px-4 py-3 text-white outline-none focus:border-red-400"
            >
              <option value="">เลือกซีซั่น</option>
              {seasons.map((season) => (
                <option key={season.id} value={season.id}>
                  {season.competition?.name} — {season.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm text-zinc-400">ทีม</label>
            <select
              value={selectedTeamId}
              onChange={(e) => setSelectedTeamId(e.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-zinc-950 px-4 py-3 text-white outline-none focus:border-red-400"
            >
              <option value="">เลือกทีม</option>
              {teams.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.short_name || team.name} — {team.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              disabled={saving}
              className="w-full rounded-2xl bg-red-600 px-6 py-3 font-black text-white hover:bg-red-500 disabled:opacity-50"
            >
              เพิ่มทีมเข้าซีซั่น
            </button>
          </div>
        </form>

        <div className="mt-8">
          <h3 className="text-xl font-black">ทีมในซีซั่นที่เลือก</h3>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {selectedSeasonTeams.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between rounded-2xl border border-white/10 bg-zinc-950 p-4"
              >
                <div>
                  <p className="font-black">
                    {item.team?.short_name || item.team?.name}
                  </p>
                  <p className="text-sm text-zinc-500">{item.team?.name}</p>
                </div>

                <button
                  onClick={() => removeTeamFromSeason(item)}
                  className="text-sm font-bold text-red-300 hover:text-red-200"
                >
                  ลบ
                </button>
              </div>
            ))}

            {selectedSeasonTeams.length === 0 && (
              <div className="rounded-2xl border border-dashed border-white/15 p-8 text-center text-zinc-500 md:col-span-2">
                ยังไม่มีทีมในซีซั่นนี้
              </div>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: "text" | "number";
}) {
  return (
    <div>
      <label className="mb-2 block text-sm text-zinc-400">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-2xl border border-white/10 bg-zinc-950 px-4 py-3 text-white outline-none focus:border-red-400"
      />
    </div>
  );
}
