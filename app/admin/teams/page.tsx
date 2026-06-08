"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase-browser";

type Team = {
  id: string;
  name: string;
  short_name: string | null;
  slug: string;
  school_name: string | null;
  nickname: string | null;
  logo_url: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  description: string | null;
};

function makeSlug(text: string) {
  return text
    .trim()
    .toLowerCase()
    .replace(/[^\u0E00-\u0E7Fa-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export default function AdminTeamsPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [teams, setTeams] = useState<Team[]>([]);

  const [editingTeamId, setEditingTeamId] = useState("");

  const [name, setName] = useState("");
  const [shortName, setShortName] = useState("");
  const [slug, setSlug] = useState("");
  const [schoolName, setSchoolName] = useState("");
  const [nickname, setNickname] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#ffffff");
  const [secondaryColor, setSecondaryColor] = useState("#000000");
  const [description, setDescription] = useState("");

  const [message, setMessage] = useState("");
  const [errorText, setErrorText] = useState("");

  const isEditing = Boolean(editingTeamId);

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

  async function loadTeams() {
    const { data, error } = await supabaseBrowser
      .from("teams")
      .select(`
        id,
        name,
        short_name,
        slug,
        school_name,
        nickname,
        logo_url,
        primary_color,
        secondary_color,
        description
      `)
      .order("short_name", { ascending: true });

    if (error) {
      setErrorText(error.message);
      return;
    }

    setTeams((data || []) as Team[]);
  }

  useEffect(() => {
    async function init() {
      setLoading(true);

      const isAdmin = await checkAdmin();
      if (!isAdmin) return;

      await loadTeams();
      setLoading(false);
    }

    init();
  }, [checkAdmin]);

  function resetForm() {
    setEditingTeamId("");
    setName("");
    setShortName("");
    setSlug("");
    setSchoolName("");
    setNickname("");
    setLogoUrl("");
    setPrimaryColor("#ffffff");
    setSecondaryColor("#000000");
    setDescription("");
  }

  function startEdit(team: Team) {
    setMessage("");
    setErrorText("");

    setEditingTeamId(team.id);
    setName(team.name || "");
    setShortName(team.short_name || "");
    setSlug(team.slug || "");
    setSchoolName(team.school_name || "");
    setNickname(team.nickname || "");
    setLogoUrl(team.logo_url || "");
    setPrimaryColor(team.primary_color || "#ffffff");
    setSecondaryColor(team.secondary_color || "#000000");
    setDescription(team.description || "");

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function validateForm() {
    if (!name.trim()) {
      setErrorText("กรุณาใส่ชื่อทีม");
      return false;
    }

    const finalSlug = slug || makeSlug(name);

    if (!finalSlug.trim()) {
      setErrorText("กรุณาใส่ slug");
      return false;
    }

    return true;
  }

  async function saveTeam(e: React.FormEvent) {
    e.preventDefault();

    setMessage("");
    setErrorText("");

    if (!validateForm()) return;

    const finalSlug = slug || makeSlug(name);

    setSaving(true);

    const payload = {
      name: name.trim(),
      short_name: shortName || null,
      slug: finalSlug.trim(),
      school_name: schoolName || null,
      nickname: nickname || null,
      logo_url: logoUrl || null,
      primary_color: primaryColor || null,
      secondary_color: secondaryColor || null,
      description: description || null,
    };

    if (isEditing) {
      const { error } = await supabaseBrowser
        .from("teams")
        .update(payload)
        .eq("id", editingTeamId);

      if (error) {
        setErrorText(error.message);
        setSaving(false);
        return;
      }

      await loadTeams();
      resetForm();

      setMessage("แก้ไขทีมเรียบร้อยแล้ว");
      setSaving(false);
      return;
    }

    const { error } = await supabaseBrowser.from("teams").insert(payload);

    if (error) {
      setErrorText(error.message);
      setSaving(false);
      return;
    }

    await loadTeams();
    resetForm();

    setMessage("เพิ่มทีมใหม่เรียบร้อยแล้ว");
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
          Admin / Teams
        </p>

        <h1 className="mt-2 text-4xl font-black">จัดการทีม</h1>

        <p className="mt-3 text-zinc-400">
          เพิ่มและแก้ไขข้อมูลทีม โลโก้ สีประจำทีม ฉายา และคำอธิบาย
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
        <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-2xl font-black">
              {isEditing ? "แก้ไขทีม" : "เพิ่มทีมใหม่"}
            </h2>
            <p className="mt-2 text-sm text-zinc-400">
              {isEditing
                ? "กำลังแก้ไขข้อมูลทีมเดิม"
                : "สร้างทีมใหม่ในระบบ ก่อนนำไปผูกกับซีซั่น"}
            </p>
          </div>

          {isEditing && (
            <button
              type="button"
              onClick={resetForm}
              className="rounded-2xl border border-white/10 px-5 py-3 text-sm font-bold text-zinc-300 hover:bg-white/10"
            >
              ยกเลิกการแก้ไข
            </button>
          )}
        </div>

        <form onSubmit={saveTeam} className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm text-zinc-400">ชื่อทีม</label>
            <input
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (!slug) setSlug(makeSlug(e.target.value));
              }}
              placeholder="เช่น ดรุณาราชบุรี"
              className="w-full rounded-2xl border border-white/10 bg-zinc-950 px-4 py-3 text-white outline-none focus:border-red-400"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm text-zinc-400">ชื่อย่อ</label>
            <input
              type="text"
              value={shortName}
              onChange={(e) => setShortName(e.target.value)}
              placeholder="เช่น DARUNA"
              className="w-full rounded-2xl border border-white/10 bg-zinc-950 px-4 py-3 text-white outline-none focus:border-red-400"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm text-zinc-400">Slug</label>
            <input
              type="text"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="daruna"
              className="w-full rounded-2xl border border-white/10 bg-zinc-950 px-4 py-3 text-white outline-none focus:border-red-400"
            />
            <p className="mt-2 text-xs text-zinc-500">
              ใช้ใน URL เช่น /teams/daruna
            </p>
          </div>

          <div>
            <label className="mb-2 block text-sm text-zinc-400">
              ชื่อโรงเรียน
            </label>
            <input
              type="text"
              value={schoolName}
              onChange={(e) => setSchoolName(e.target.value)}
              placeholder="เช่น โรงเรียนดรุณาราชบุรี"
              className="w-full rounded-2xl border border-white/10 bg-zinc-950 px-4 py-3 text-white outline-none focus:border-red-400"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm text-zinc-400">ฉายาทีม</label>
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="เช่น มัธยมโครเอเชีย"
              className="w-full rounded-2xl border border-white/10 bg-zinc-950 px-4 py-3 text-white outline-none focus:border-red-400"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm text-zinc-400">URL โลโก้</label>
            <input
              type="text"
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
              placeholder="https://..."
              className="w-full rounded-2xl border border-white/10 bg-zinc-950 px-4 py-3 text-white outline-none focus:border-red-400"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm text-zinc-400">สีหลัก</label>
            <div className="flex gap-3">
              <input
                type="color"
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                className="h-12 w-16 rounded-xl border border-white/10 bg-zinc-950"
              />
              <input
                type="text"
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                placeholder="#ffffff"
                className="w-full rounded-2xl border border-white/10 bg-zinc-950 px-4 py-3 text-white outline-none focus:border-red-400"
              />
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm text-zinc-400">สีรอง</label>
            <div className="flex gap-3">
              <input
                type="color"
                value={secondaryColor}
                onChange={(e) => setSecondaryColor(e.target.value)}
                className="h-12 w-16 rounded-xl border border-white/10 bg-zinc-950"
              />
              <input
                type="text"
                value={secondaryColor}
                onChange={(e) => setSecondaryColor(e.target.value)}
                placeholder="#000000"
                className="w-full rounded-2xl border border-white/10 bg-zinc-950 px-4 py-3 text-white outline-none focus:border-red-400"
              />
            </div>
          </div>

          <div className="md:col-span-2">
            <label className="mb-2 block text-sm text-zinc-400">
              คำอธิบายทีม
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              placeholder="รายละเอียดทีม ประวัติ จุดเด่น หรือคอนเซปต์"
              className="w-full rounded-2xl border border-white/10 bg-zinc-950 px-4 py-3 text-white outline-none focus:border-red-400"
            />
          </div>

          {logoUrl && (
            <div className="md:col-span-2">
              <div className="flex items-center gap-4 rounded-2xl border border-white/10 bg-zinc-950 p-4">
                <img
                  src={logoUrl}
                  alt="preview"
                  className="h-20 w-20 rounded-2xl bg-white object-contain p-2"
                />

                <div>
                  <p className="font-bold">Preview โลโก้</p>
                  <p className="mt-1 text-sm text-zinc-500">
                    ถ้ารูปไม่ขึ้น แปลว่า URL ไม่ถูก หรือ bucket ยังไม่ public
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="md:col-span-2 flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={saving}
              className="rounded-2xl bg-red-600 px-6 py-3 font-black text-white hover:bg-red-500 disabled:opacity-50"
            >
              {saving
                ? "กำลังบันทึก..."
                : isEditing
                ? "บันทึกการแก้ไขทีม"
                : "เพิ่มทีม"}
            </button>

            {isEditing && (
              <button
                type="button"
                onClick={resetForm}
                className="rounded-2xl border border-white/10 px-6 py-3 font-black text-zinc-300 hover:bg-white/10"
              >
                ยกเลิก
              </button>
            )}
          </div>
        </form>
      </section>

      <section className="mt-8 rounded-3xl border border-white/10 bg-zinc-900 p-6">
        <h2 className="text-2xl font-black">ทีมทั้งหมดในระบบ</h2>

        <div className="mt-6 grid gap-5 md:grid-cols-2">
          {teams.map((team) => (
            <article
              key={team.id}
              className={`rounded-3xl border p-6 ${
                editingTeamId === team.id
                  ? "border-red-400 bg-red-950/30"
                  : "border-white/10 bg-zinc-950"
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.25em] text-red-300">
                    {team.short_name || "TEAM"}
                  </p>

                  <h3 className="mt-2 text-2xl font-black">{team.name}</h3>

                  <p className="mt-1 text-sm text-zinc-500">
                    slug: {team.slug}
                  </p>

                  {team.school_name && (
                    <p className="mt-3 text-sm text-zinc-400">
                      {team.school_name}
                    </p>
                  )}

                  {team.nickname && (
                    <p className="mt-4 inline-flex rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-zinc-300">
                      {team.nickname}
                    </p>
                  )}
                </div>

                {team.logo_url ? (
                  <img
                    src={team.logo_url}
                    alt={team.name}
                    className="h-16 w-16 shrink-0 rounded-2xl bg-white object-contain p-2"
                  />
                ) : (
                  <div
                    className="h-16 w-16 shrink-0 rounded-2xl border border-white/20"
                    style={{ background: team.primary_color || "#ffffff" }}
                  />
                )}
              </div>

              {team.description && (
                <p className="mt-5 line-clamp-3 text-sm leading-6 text-zinc-400">
                  {team.description}
                </p>
              )}

              <div className="mt-5 flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2 text-sm text-zinc-400">
                  <span>สีหลัก</span>
                  <span
                    className="h-5 w-5 rounded-full border border-white/20"
                    style={{ background: team.primary_color || "#ffffff" }}
                  />
                </div>

                <div className="flex items-center gap-2 text-sm text-zinc-400">
                  <span>สีรอง</span>
                  <span
                    className="h-5 w-5 rounded-full border border-white/20"
                    style={{ background: team.secondary_color || "#000000" }}
                  />
                </div>
              </div>

              <button
                onClick={() => startEdit(team)}
                className="mt-6 rounded-xl border border-white/10 px-4 py-2 text-sm font-bold text-zinc-300 hover:bg-white/10"
              >
                แก้ไขทีม
              </button>
            </article>
          ))}

          {teams.length === 0 && (
            <div className="rounded-3xl border border-dashed border-white/15 p-10 text-center text-zinc-500 md:col-span-2">
              ยังไม่มีทีมในระบบ
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
