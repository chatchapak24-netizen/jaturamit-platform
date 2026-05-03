import Link from "next/link";
import { supabase } from "@/lib/supabase";

type NewsItem = {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  cover_image_url: string | null;
  published_at: string | null;
  created_at: string | null;
};

export default async function NewsPage() {
  const { data, error } = await supabase
    .from("news")
    .select(`
      id,
      title,
      slug,
      excerpt,
      cover_image_url,
      published_at,
      created_at
    `)
    .eq("status", "published")
    .order("published_at", { ascending: false });

  const news = (data || []) as NewsItem[];

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <div className="mb-8">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-red-300">
          News
        </p>
        <h1 className="mt-2 text-4xl font-black">ข่าว / ประกาศ</h1>
        <p className="mt-3 text-zinc-400">
          ข่าวสาร ประกาศ และความเคลื่อนไหวของจตุรมิตรราชบุรี ครั้งที่ 2
        </p>
      </div>

      {error && (
        <div className="mb-6 rounded-2xl border border-red-500/40 bg-red-950/40 p-4 text-red-200">
          {error.message}
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {news.map((item) => (
          <Link
            key={item.id}
            href={`/news/${item.slug}`}
            className="group overflow-hidden rounded-3xl border border-white/10 bg-zinc-900 transition hover:border-red-400/50 hover:bg-zinc-800"
          >
            {item.cover_image_url ? (
              <img
                src={item.cover_image_url}
                alt={item.title}
                className="h-56 w-full bg-zinc-950 object-cover"
              />
            ) : (
              <div className="flex h-56 w-full items-center justify-center bg-gradient-to-br from-red-950 via-zinc-900 to-zinc-950 text-sm font-bold uppercase tracking-[0.3em] text-red-300">
                Jaturamit
              </div>
            )}

            <div className="p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-red-300">
                {item.published_at
                  ? new Date(item.published_at).toLocaleDateString("th-TH")
                  : "ประกาศ"}
              </p>

              <h2 className="mt-3 text-2xl font-black group-hover:text-red-200">
                {item.title}
              </h2>

              {item.excerpt && (
                <p className="mt-3 text-sm leading-6 text-zinc-400">
                  {item.excerpt}
                </p>
              )}

              <p className="mt-5 text-sm font-bold text-zinc-500 group-hover:text-zinc-300">
                อ่านต่อ →
              </p>
            </div>
          </Link>
        ))}

        {news.length === 0 && (
          <div className="rounded-3xl border border-dashed border-white/15 p-10 text-center text-zinc-500 md:col-span-2">
            ยังไม่มีข่าวที่เผยแพร่
          </div>
        )}
      </div>
    </main>
  );
}