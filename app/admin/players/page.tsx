"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase-browser";

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

type Team = {
  id: string;
  name: string;
  short_name: string | null;
};

type SeasonTeam = {
  id: string;
  season_id: string;
  team_id: string;
  team: Team | null;
};

type SeasonTeamQueryRow = Omit<SeasonTeam, "team"> & {
  team: SupabaseRelation<Team>;
};

type RosterTeam = {
  name: string;
  short_name: string | null;
};

type Player = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  nickname: string | null;
  photo_url: string | null;
};

type RosterPlayer = {
  id: string;
  season_id: string;
  team_id: string;
  player_id: string;
  shirt_number: number | null;
  position: string | null;
  status: string | null;
  team: RosterTeam | null;
  player: Player | null;
};

type RosterPlayerQueryRow = Omit<RosterPlayer, "team" | "player"> & {
  team: SupabaseRelation<RosterTeam>;
  player: SupabaseRelation<Player>;
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

function playerFullName(player: RosterPlayer["player"]) {
  if (!player) return "-";
  return [player.first_name, player.last_name].filter(Boolean).join(" ") || "-";
}

export default function AdminPlayersPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [seasons, setSeasons] = useState<Season[]>([]);
  const [seasonTeams, setSeasonTeams] = useState<SeasonTeam[]>([]);
  const [roster, setRoster] = useState<RosterPlayer[]>([]);

  const [selectedSeasonId, setSelectedSeasonId] = useState("");
  const [teamId, setTeamId] = useState("");

  const [shirtNumber, setShirtNumber] = useState("");
  const [nickname, setNickname] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [position, setPosition] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");

  const [editingRosterId, setEditingRosterId] = useState("");
  const [editingPlayerId, setEditingPlayerId] = useState("");

  const [message, setMessage] = useState("");
  const [errorText, setErrorText] = useState("");

  const isEditing = Boolean(editingRosterId && editingPlayerId);

  const teamsInSelectedSeason = useMemo(() => {
    return seasonTeams
      .filter((item) => item.season_id === selectedSeasonId)
      .map((item) => item.team)
      .filter(Boolean) as Team[];
  }, [seasonTeams, selectedSeasonId]);

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
    const [seasonsResult, seasonTeamsResult] = await Promise.all([
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
        .from("season_teams")
        .select(`
          id,
          season_id,
          team_id,
          team:team_id(id, name, short_name)
        `),
    ]);

    if (seasonsResult.error) {
      setErrorText(seasonsResult.error.message);
      return "";
    }

    if (seasonTeamsResult.error) {
      setErrorText(seasonTeamsResult.error.message);
      return "";
    }

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

    setSeasons(loadedSeasons);
    setSeasonTeams(loadedSeasonTeams);

    const activeSeason =
      loadedSeasons.find((season) => season.status === "active") ||
      loadedSeasons[0];

    if (activeSeason) {
      setSelectedSeasonId(activeSeason.id);
      return activeSeason.id;
    }

    return "";
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
        player_id,
        shirt_number,
        position,
        status,
        team:team_id(name, short_name),
        player:player_id(
          id,
          first_name,
          last_name,
          nickname,
          photo_url
        )
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
      team: normalizeRelation(item.team),
      player: normalizeRelation(item.player),
    }));

    setRoster(loadedRoster);
  }

  useEffect(() => {
    async function init() {
      setLoading(true);

      const isAdmin = await checkAdmin();
      if (!isAdmin) return;

      const defaultSeasonId = await loadBaseData();
      await loadRoster(defaultSeasonId);

      setLoading(false);
    }

    init();
  }, []);

  async function handleSeasonChange(seasonId: string) {
    setSelectedSeasonId(seasonId);
    setTeamId("");
    setMessage("");
    setErrorText("");
    cancelEdit();
    await loadRoster(seasonId);
  }

  function resetForm() {
    setTeamId("");
    setShirtNumber("");
    setNickname("");
    setFirstName("");
    setLastName("");
    setPosition("");
    setPhotoUrl("");
  }

  function cancelEdit() {
    setEditingRosterId("");
    setEditingPlayerId("");
    resetForm();
  }

  function startEdit(item: RosterPlayer) {
    setMessage("");
    setErrorText("");

    setEditingRosterId(item.id);
    setEditingPlayerId(item.player?.id || item.player_id);

    setTeamId(item.team_id || "");
    setShirtNumber(
      item.shirt_number === null || item.shirt_number === undefined
        ? ""
        : String(item.shirt_number)
    );
    setNickname(item.player?.nickname || "");
    setFirstName(item.player?.first_name || "");
    setLastName(item.player?.last_name || "");
    setPosition(item.position || "");
    setPhotoUrl(item.player?.photo_url || "");

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function validateForm() {
    if (!selectedSeasonId) {
      setErrorText("กรุณาเลือกซีซั่น");
      return false;
    }

    if (!teamId) {
      setErrorText("กรุณาเลือกทีม");
      return false;
    }

    if (!nickname && !firstName && !lastName) {
      setErrorText("กรุณาใส่ชื่อเล่น หรือชื่อจริงนักเตะ");
      return false;
    }

    const parsedShirtNumber =
      shirtNumber.trim() === "" ? null : Number(shirtNumber);

    if (
      parsedShirtNumber !== null &&
      (Number.isNaN(parsedShirtNumber) || parsedShirtNumber < 0)
    ) {
      setErrorText("เบอร์เสื้อต้องเป็นตัวเลข 0 ขึ้นไป");
      return false;
    }

    return true;
  }

  async function addPlayer(e: React.FormEvent) {
    e.preventDefault();

    setMessage("");
    setErrorText("");

    if (!validateForm()) return;

    const parsedShirtNumber =
      shirtNumber.trim() === "" ? null : Number(shirtNumber);

    setSaving(true);

    const { data: playerData, error: playerError } = await supabaseBrowser
      .from("players")
      .insert({
        first_name: firstName || null,
        last_name: lastName || null,
        nickname: nickname || null,
        photo_url: photoUrl || null,
      })
      .select("id")
      .single();

    if (playerError || !playerData) {
      setErrorText(playerError?.message || "เพิ่มนักเตะไม่สำเร็จ");
      setSaving(false);
      return;
    }

    const { error: rosterError } = await supabaseBrowser
      .from("season_players")
      .insert({
        season_id: selectedSeasonId,
        team_id: teamId,
        player_id: playerData.id,
        shirt_number: parsedShirtNumber,
        position: position || null,
        status: "active",
      });

    if (rosterError) {
      setErrorText(rosterError.message);
      setSaving(false);
      return;
    }

    await loadRoster(selectedSeasonId);
    resetForm();

    setMessage("เพิ่มนักเตะเรียบร้อยแล้ว");
    setSaving(false);
  }

  async function updatePlayer(e: React.FormEvent) {
    e.preventDefault();

    setMessage("");
    setErrorText("");

    if (!editingRosterId || !editingPlayerId) {
      setErrorText("ไม่พบข้อมูลนักเตะที่จะแก้ไข");
      return;
    }

    if (!validateForm()) return;

    const parsedShirtNumber =
      shirtNumber.trim() === "" ? null : Number(shirtNumber);

    setSaving(true);

    const { error: playerError } = await supabaseBrowser
      .from("players")
      .update({
        first_name: firstName || null,
        last_name: lastName || null,
        nickname: nickname || null,
        photo_url: photoUrl || null,
      })
      .eq("id", editingPlayerId);

    if (playerError) {
      setErrorText(playerError.message);
      setSaving(false);
      return;
    }

    const { error: rosterError } = await supabaseBrowser
      .from("season_players")
      .update({
        team_id: teamId,
        shirt_number: parsedShirtNumber,
        position: position || null,
        status: "active",
      })
      .eq("id", editingRosterId);

    if (rosterError) {
      setErrorText(rosterError.message);
      setSaving(false);
      return;
    }

    await loadRoster(selectedSeasonId);
    cancelEdit();

    setMessage("แก้ไขข้อมูลนักเตะเรียบร้อยแล้ว");
    setSaving(false);
  }

  async function removeRosterPlayer(rosterId: string) {
    const confirmDelete = window.confirm(
      "ต้องการลบนักเตะคนนี้ออกจากรายชื่อซีซั่นนี้ใช่ไหม?"
    );

    if (!confirmDelete) return;

    setMessage("");
    setErrorText("");

    const { error } = await supabaseBrowser
      .from("season_players")
      .delete()
      .eq("id", rosterId);

    if (error) {
      setErrorText(error.message);
      return;
    }

    await loadRoster(selectedSeasonId);

    if (editingRosterId === rosterId) {
      cancelEdit();
    }

    setMessage("ลบรายชื่อนักเตะเรียบร้อยแล้ว");
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
          Admin / Players
        </p>
        <h1 className="mt-2 text-4xl font-black">จัดการนักเตะ</h1>
        <p className="mt-3 text-zinc-400">
          เพิ่มและแก้ไขรายชื่อนักเตะ เบอร์เสื้อ ตำแหน่ง รูปภาพ และทีมตามซีซั่นที่เลือก
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
        <h2 className="text-2xl font-black">เลือกซีซั่น</h2>

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
                {season.competition?.name} — {season.name} —{" "}
                {season.year || "-"} — {season.status}
              </option>
            ))}
          </select>
        </div>
      </section>

      <section className="rounded-3xl border border-white/10 bg-zinc-900 p-6">
        <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-2xl font-black">
              {isEditing ? "แก้ไขนักเตะ" : "เพิ่มนักเตะ"}
            </h2>
            <p className="mt-2 text-sm text-zinc-400">
              {isEditing
                ? "กำลังแก้ไขข้อมูลนักเตะเดิม"
                : "เพิ่มนักเตะใหม่เข้าสู่ซีซั่นนี้"}
            </p>
          </div>

          {isEditing && (
            <button
              type="button"
              onClick={cancelEdit}
              className="rounded-2xl border border-white/10 px-5 py-3 text-sm font-bold text-zinc-300 hover:bg-white/10"
            >
              ยกเลิกการแก้ไข
            </button>
          )}
        </div>

        <form
          onSubmit={isEditing ? updatePlayer : addPlayer}
          className="grid gap-4 md:grid-cols-2"
        >
          <div>
            <label className="mb-2 block text-sm text-zinc-400">ทีม</label>
            <select
              value={teamId}
              onChange={(e) => setTeamId(e.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-zinc-950 px-4 py-3 text-white outline-none focus:border-red-400"
              required
            >
              <option value="">เลือกทีมในซีซั่นนี้</option>
              {teamsInSelectedSeason.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.short_name || team.name} — {team.name}
                </option>
              ))}
            </select>

            {selectedSeasonId && teamsInSelectedSeason.length === 0 && (
              <p className="mt-2 text-sm text-red-300">
                ยังไม่มีทีมในซีซั่นนี้ ให้ไปเพิ่มทีมที่ /admin/tournaments ก่อน
              </p>
            )}
          </div>

          <div>
            <label className="mb-2 block text-sm text-zinc-400">เบอร์เสื้อ</label>
            <input
              type="number"
              min="0"
              value={shirtNumber}
              onChange={(e) => setShirtNumber(e.target.value)}
              placeholder="เช่น 10"
              className="w-full rounded-2xl border border-white/10 bg-zinc-950 px-4 py-3 text-white outline-none focus:border-red-400"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm text-zinc-400">ชื่อเล่น</label>
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="เช่น FLUK"
              className="w-full rounded-2xl border border-white/10 bg-zinc-950 px-4 py-3 text-white outline-none focus:border-red-400"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm text-zinc-400">ตำแหน่ง</label>
            <select
              value={position}
              onChange={(e) => setPosition(e.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-zinc-950 px-4 py-3 text-white outline-none focus:border-red-400"
            >
              <option value="">ไม่ระบุ</option>
              <option value="GK">GK - ผู้รักษาประตู</option>
              <option value="DF">DF - กองหลัง</option>
              <option value="MF">MF - กองกลาง</option>
              <option value="FW">FW - กองหน้า</option>
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm text-zinc-400">ชื่อจริง</label>
            <input
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="ชื่อจริง"
              className="w-full rounded-2xl border border-white/10 bg-zinc-950 px-4 py-3 text-white outline-none focus:border-red-400"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm text-zinc-400">นามสกุล</label>
            <input
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="นามสกุล"
              className="w-full rounded-2xl border border-white/10 bg-zinc-950 px-4 py-3 text-white outline-none focus:border-red-400"
            />
          </div>

          <div className="md:col-span-2">
            <label className="mb-2 block text-sm text-zinc-400">
              URL รูปนักกีฬา
            </label>
            <input
              type="text"
              value={photoUrl}
              onChange={(e) => setPhotoUrl(e.target.value)}
              placeholder="https://..."
              className="w-full rounded-2xl border border-white/10 bg-zinc-950 px-4 py-3 text-white outline-none focus:border-red-400"
            />

            {photoUrl && (
              <div className="mt-4 flex items-center gap-4 rounded-2xl border border-white/10 bg-zinc-950 p-4">
                <img
                  src={photoUrl}
                  alt="preview"
                  className="h-20 w-20 rounded-2xl bg-white object-cover"
                />
                <div>
                  <p className="font-bold">Preview รูปนักกีฬา</p>
                  <p className="mt-1 text-sm text-zinc-500">
                    ถ้ารูปไม่ขึ้น แปลว่า URL ไม่ถูก หรือ bucket ยังไม่เป็น public
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="md:col-span-2 flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={saving}
              className="rounded-2xl bg-red-600 px-6 py-3 font-black text-white hover:bg-red-500 disabled:opacity-50"
            >
              {saving
                ? "กำลังบันทึก..."
                : isEditing
                ? "บันทึกการแก้ไข"
                : "เพิ่มนักเตะ"}
            </button>

            {isEditing && (
              <button
                type="button"
                onClick={cancelEdit}
                className="rounded-2xl border border-white/10 px-6 py-3 font-black text-zinc-300 hover:bg-white/10"
              >
                ยกเลิก
              </button>
            )}
          </div>
        </form>
      </section>

      <section className="mt-8 rounded-3xl border border-white/10 bg-zinc-900 p-6">
        <h2 className="text-2xl font-black">รายชื่อนักเตะในซีซั่นนี้</h2>

        <div className="mt-6 overflow-x-auto rounded-2xl border border-white/10">
          <table className="w-full min-w-[900px] text-sm">
            <thead className="bg-white/10 text-zinc-300">
              <tr>
                <th className="px-4 py-3 text-left">รูป</th>
                <th className="px-4 py-3 text-left">ทีม</th>
                <th className="px-4 py-3 text-center">เบอร์</th>
                <th className="px-4 py-3 text-left">ชื่อเล่น</th>
                <th className="px-4 py-3 text-left">ชื่อจริง</th>
                <th className="px-4 py-3 text-center">ตำแหน่ง</th>
                <th className="px-4 py-3 text-right">จัดการ</th>
              </tr>
            </thead>

            <tbody>
              {roster.map((item) => (
                <tr
                  key={item.id}
                  className={`border-t border-white/10 ${
                    editingRosterId === item.id ? "bg-red-950/30" : ""
                  }`}
                >
                  <td className="px-4 py-3">
                    {item.player?.photo_url ? (
                      <img
                        src={item.player.photo_url}
                        alt={item.player?.nickname || "player"}
                        className="h-12 w-12 rounded-xl bg-white object-cover"
                      />
                    ) : (
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/10 text-xs text-zinc-500">
                        NO IMG
                      </div>
                    )}
                  </td>

                  <td className="px-4 py-3 font-bold">
                    {item.team?.short_name || item.team?.name}
                  </td>

                  <td className="px-4 py-3 text-center">
                    {item.shirt_number ?? "-"}
                  </td>

                  <td className="px-4 py-3">{item.player?.nickname || "-"}</td>

                  <td className="px-4 py-3">{playerFullName(item.player)}</td>

                  <td className="px-4 py-3 text-center">
                    {item.position || "-"}
                  </td>

                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-3">
                      <button
                        onClick={() => startEdit(item)}
                        className="text-sm font-bold text-zinc-300 hover:text-white"
                      >
                        แก้ไข
                      </button>

                      <button
                        onClick={() => removeRosterPlayer(item.id)}
                        className="text-sm font-bold text-red-300 hover:text-red-200"
                      >
                        ลบ
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {roster.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-8 text-center text-zinc-500"
                  >
                    ยังไม่มีรายชื่อนักเตะในซีซั่นนี้
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
