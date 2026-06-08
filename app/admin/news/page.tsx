"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase-browser";

type NewsItem = {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  cover_image_url: string | null;
  content: string | null;
  status: string | null;
  published_at: string | null;
};

function makeSlug(text: string) {
  return text
    .trim()
    .toLowerCase()
    .replace(/[^\u0E00-\u0E7Fa-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function toDatetimeLocal(value: string | null) {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const offset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - offset * 60 * 1000);

  return localDate.toISOString().slice(0, 16);
}

function fromDatetimeLocal(value: string) {
  if (!value) return null;
  return new Date(value).toISOString();
}

export default function AdminNewsPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [news, setNews] = useState<NewsItem[]>([]);
  const [editingNewsId, setEditingNewsId] = useState("");

  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [coverImageUrl, setCoverImageUrl] = useState("");
  const [content, setContent] = useState("");
  const [status, setStatus] = useState("draft");
  const [publishedAt, setPublishedAt] = useState("");

  const [message, setMessage] = useState("");
  const [errorText, setErrorText] = useState("");

  const isEditing = Boolean(editingNewsId);

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

  async function loadNews() {
    const { data, error } = await supabaseBrowser
      .from("news")
      .select(`
        id,
        title,
        slug,
        excerpt,
        cover_image_url,
        content,
        status,
        published_at
      `)
      .order("published_at", { ascending: false, nullsFirst: false })
      .order("title", { ascending: true });

    if (error) {
      setErrorText(error.message);
      return;
    }

    setNews((data || []) as NewsItem[]);
  }

  useEffect(() => {
    async function init() {
      setLoading(true);

      const isAdmin = await checkAdmin();
      if (!isAdmin) return;

      await loadNews();
      setLoading(false);
    }

    init();
  }, [checkAdmin]);

  function resetForm() {
    setEditingNewsId("");
    setTitle("");
    setSlug("");
    setExcerpt("");
    setCoverImageUrl("");
    setContent("");
    setStatus("draft");
    setPublishedAt("");
  }

  function startEdit(item: NewsItem) {
    setMessage("");
    setErrorText("");

    setEditingNewsId(item.id);
    setTitle(item.title || "");
    setSlug(item.slug || "");
    setExcerpt(item.excerpt || "");
    setCoverImageUrl(item.cover_image_url || "");
    setContent(item.content || "");
    setStatus(item.status || "draft");
    setPublishedAt(toDatetimeLocal(item.published_at));

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function validateForm() {
    if (!title.trim()) {
      setErrorText("กรุณาใส่หัวข้อข่าว");
      return false;
    }

    const finalSlug = slug || makeSlug(title);

    if (!finalSlug.trim()) {
      setErrorText("กรุณาใส่ slug");
      return false;
    }

    if (!content.trim()) {
      setErrorText("กรุณาใส่เนื้อหาข่าว");
      return false;
    }

    return true;
  }

  async function saveNews(e: React.FormEvent) {
    e.preventDefault();

    setMessage("");
    setErrorText("");

    if (!validateForm()) return;

    const finalSlug = slug || makeSlug(title);

    const finalPublishedAt =
      status === "published"
        ? fromDatetimeLocal(publishedAt) || new Date().toISOString()
        : fromDatetimeLocal(publishedAt);

    const payload = {
      title: title.trim(),
      slug: finalSlug.trim(),
      excerpt: excerpt || null,
      cover_image_url: coverImageUrl || null,
      content: content || null,
      status,
      published_at: finalPublishedAt,
    };

    setSaving(true);

    if (isEditing) {
      const { error } = await supabaseBrowser
        .from("news")
        .update(payload)
        .eq("id", editingNewsId);

      if (error) {
        setErrorText(error.message);
        setSaving(false);
        return;
      }

      await loadNews();
      resetForm();

      setMessage("แก้ไขข่าวเรียบร้อยแล้ว");
      setSaving(false);
      return;
    }

    const { error } = await supabaseBrowser.from("news").insert(payload);

    if (error) {
      setErrorText(error.message);
      setSaving(false);
      return;
    }

    await loadNews();
    resetForm();

    setMessage("เพิ่มข่าวใหม่เรียบร้อยแล้ว");
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
          Admin / News
        </p>

        <h1 className="mt-2 text-4xl font-black">ข่าว / ประกาศ</h1>

        <p className="mt-3 text-zinc-400">
          เพิ่มและแก้ไขข่าวประชาสัมพันธ์ ประกาศโปรแกรม และบทความของรายการ
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
              {isEditing ? "แก้ไขข่าว" : "เพิ่มข่าวใหม่"}
            </h2>
            <p className="mt-2 text-sm text-zinc-400">
              {isEditing
                ? "กำลังแก้ไขข่าวเดิม"
                : "สร้างข่าวหรือประกาศใหม่เข้าสู่ระบบ"}
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

        <form onSubmit={saveNews} className="grid gap-4">
          <div>
            <label className="mb-2 block text-sm text-zinc-400">
              หัวข้อข่าว
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (!slug) setSlug(makeSlug(e.target.value));
              }}
              placeholder="เช่น เปิดโปรแกรมการแข่งขันจตุรมิตรราชบุรี ครั้งที่ 2"
              className="w-full rounded-2xl border border-white/10 bg-zinc-950 px-4 py-3 text-white outline-none focus:border-red-400"
              required
            />
          </div>

          <div>
            <label className="mb-2 block text-sm text-zinc-400">Slug</label>
            <input
              type="text"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="open-fixtures-jaturamit-2"
              className="w-full rounded-2xl border border-white/10 bg-zinc-950 px-4 py-3 text-white outline-none focus:border-red-400"
              required
            />
            <p className="mt-2 text-xs text-zinc-500">
              ใช้ใน URL เช่น /news/open-fixtures-jaturamit-2
            </p>
          </div>

          <div>
            <label className="mb-2 block text-sm text-zinc-400">คำโปรยสั้น</label>
            <input
              type="text"
              value={excerpt}
              onChange={(e) => setExcerpt(e.target.value)}
              placeholder="สรุปข่าวสั้น ๆ สำหรับหน้าแรก"
              className="w-full rounded-2xl border border-white/10 bg-zinc-950 px-4 py-3 text-white outline-none focus:border-red-400"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm text-zinc-400">URL รูปปก</label>
            <input
              type="text"
              value={coverImageUrl}
              onChange={(e) => setCoverImageUrl(e.target.value)}
              placeholder="https://..."
              className="w-full rounded-2xl border border-white/10 bg-zinc-950 px-4 py-3 text-white outline-none focus:border-red-400"
            />
          </div>

          {coverImageUrl && (
            <div className="rounded-2xl border border-white/10 bg-zinc-950 p-4">
              <p className="mb-3 text-sm font-bold text-zinc-300">
                Preview รูปปก
              </p>

              <img
                src={coverImageUrl}
                alt="preview"
                className="h-64 w-full rounded-2xl bg-zinc-900 object-cover"
              />

              <p className="mt-3 text-xs text-zinc-500">
                ถ้ารูปไม่ขึ้น แปลว่า URL ไม่ถูก หรือ bucket ยังไม่ public
              </p>
            </div>
          )}

          <div>
            <label className="mb-2 block text-sm text-zinc-400">เนื้อหา</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={9}
              placeholder="เขียนเนื้อหาข่าว..."
              className="w-full rounded-2xl border border-white/10 bg-zinc-950 px-4 py-3 text-white outline-none focus:border-red-400"
              required
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm text-zinc-400">สถานะ</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-zinc-950 px-4 py-3 text-white outline-none focus:border-red-400"
              >
                <option value="draft">draft</option>
                <option value="published">published</option>
                <option value="archived">archived</option>
              </select>
              <p className="mt-2 text-xs text-zinc-500">
                ถ้าต้องการให้ขึ้นหน้าแรก ให้เลือก published
              </p>
            </div>

            <div>
              <label className="mb-2 block text-sm text-zinc-400">
                วันเวลาเผยแพร่
              </label>
              <input
                type="datetime-local"
                value={publishedAt}
                onChange={(e) => setPublishedAt(e.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-zinc-950 px-4 py-3 text-white outline-none focus:border-red-400"
              />
              <p className="mt-2 text-xs text-zinc-500">
                ถ้าเว้นว่างและเลือก published ระบบจะใช้เวลาปัจจุบัน
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={saving}
              className="rounded-2xl bg-red-600 px-6 py-3 font-black text-white hover:bg-red-500 disabled:opacity-50"
            >
              {saving
                ? "กำลังบันทึก..."
                : isEditing
                ? "บันทึกการแก้ไขข่าว"
                : "เพิ่มข่าว"}
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
        <h2 className="text-2xl font-black">ข่าวทั้งหมด</h2>

        <div className="mt-6 grid gap-5">
          {news.map((item) => (
            <article
              key={item.id}
              className={`overflow-hidden rounded-3xl border ${
                editingNewsId === item.id
                  ? "border-red-400 bg-red-950/30"
                  : "border-white/10 bg-zinc-950"
              }`}
            >
              <div className="grid gap-0 md:grid-cols-[260px_1fr]">
                <div className="flex min-h-[180px] items-center justify-center bg-zinc-900">
                  {item.cover_image_url ? (
                    <img
                      src={item.cover_image_url}
                      alt={item.title}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="text-xs font-bold uppercase tracking-[0.25em] text-zinc-500">
                      No Cover
                    </div>
                  )}
                </div>

                <div className="p-5">
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.25em] text-red-300">
                        {item.status || "draft"}
                      </p>

                      <h3 className="mt-2 text-2xl font-black">
                        {item.title}
                      </h3>

                      <p className="mt-1 text-sm text-zinc-500">
                        /news/{item.slug}
                      </p>

                      {item.excerpt && (
                        <p className="mt-3 text-sm leading-6 text-zinc-400">
                          {item.excerpt}
                        </p>
                      )}

                      <p className="mt-3 text-xs text-zinc-500">
                        เผยแพร่:{" "}
                        {item.published_at
                          ? new Date(item.published_at).toLocaleString("th-TH")
                          : "-"}
                      </p>
                    </div>

                    <div className="flex shrink-0 flex-wrap gap-2">
                      <a
                        href={`/news/${item.slug}`}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-xl border border-white/10 px-4 py-2 text-sm font-bold text-zinc-300 hover:bg-white/10"
                      >
                        ดูหน้าเว็บ
                      </a>

                      <button
                        type="button"
                        onClick={() => startEdit(item)}
                        className="rounded-xl border border-white/10 px-4 py-2 text-sm font-bold text-zinc-300 hover:bg-white/10"
                      >
                        แก้ไข
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </article>
          ))}

          {news.length === 0 && (
            <div className="rounded-3xl border border-dashed border-white/15 p-10 text-center text-zinc-500">
              ยังไม่มีข่าวในระบบ
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
