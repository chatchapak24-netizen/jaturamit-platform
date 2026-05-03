import Link from "next/link";
import { notFound } from "next/navigation";
import { supabase } from "@/lib/supabase";

type NewsItem = {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string | null;
  cover_image_url: string | null;
  published_at: string | null;
  created_at: string | null;
  status: string | null;
};

export default async function NewsDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const { data, error } = await supabase
    .from("news")
    .select(`
      id,
      title,
      slug,
      excerpt,
      content,
      cover_image_url,
      published_at,
      created_at,
      status
    `)
    .eq("slug", slug)
    .eq("status", "published")
    .single();

  if (error || !data) {
    notFound();
  }

  const item = data as NewsItem;

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <Link href="/news" className="text-sm font-bold text-red-300 hover:text-red-200">
        ← กลับไปหน้าข่าว
      </Link>

      <article className="mt-8 overflow-hidden rounded-3xl border border-white/10 bg-zinc-900">
        {item.cover_image_url ? (
          <img
            src={item.cover_image_url}
            alt={item.title}
            className="h-[360px] w-full bg-zinc-950 object-cover"
          />
        ) : (
          <div className="flex h-[300px] w-full items-center justify-center bg-gradient-to-br from-red-950 via-zinc-900 to-zinc-950 text-sm font-bold uppercase tracking-[0.3em] text-red-300">
            Jaturamit Ratchaburi
          </div>
        )}

        <div className="p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-red-300">
            {item.published_at
              ? new Date(item.published_at).toLocaleDateString("th-TH")
              : "ประกาศ"}
          </p>

          <h1 className="mt-4 text-4xl font-black leading-tight">
            {item.title}
          </h1>

          {item.excerpt && (
            <p className="mt-5 text-lg leading-8 text-zinc-300">
              {item.excerpt}
            </p>
          )}

          <div className="mt-8 whitespace-pre-line border-t border-white/10 pt-8 text-base leading-8 text-zinc-200">
            {item.content || "ยังไม่มีเนื้อหาข่าว"}
          </div>
        </div>
      </article>
    </main>
  );
}