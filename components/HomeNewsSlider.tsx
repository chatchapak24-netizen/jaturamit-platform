"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type NewsItem = {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  cover_image_url: string | null;
  published_at: string | null;
};

export default function HomeNewsSlider({ news }: { news: NewsItem[] }) {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (news.length <= 1) return;

    const timer = setInterval(() => {
      setActiveIndex((current) => (current + 1) % news.length);
    }, 5000);

    return () => clearInterval(timer);
  }, [news.length]);

  if (news.length === 0) {
    return (
      <section className="mt-10 rounded-3xl border border-white/10 bg-zinc-900 p-6">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-2xl font-black">ข่าวล่าสุด</h2>
          <Link href="/news" className="text-sm text-red-300 hover:text-red-200">
            ดูข่าวทั้งหมด →
          </Link>
        </div>

        <div className="rounded-2xl border border-dashed border-white/15 p-10 text-center text-zinc-500">
          ยังไม่มีข่าวที่เผยแพร่
        </div>
      </section>
    );
  }

  const activeNews = news[activeIndex];

  return (
    <section className="mt-10 overflow-hidden rounded-3xl border border-white/10 bg-zinc-900">
      <div className="flex items-center justify-between px-6 pt-6">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-red-300">
            Latest News
          </p>
          <h2 className="mt-2 text-2xl font-black">ข่าวล่าสุด</h2>
        </div>

        <Link href="/news" className="text-sm text-red-300 hover:text-red-200">
          ดูข่าวทั้งหมด →
        </Link>
      </div>

      <div className="relative mt-6">
        <Link
          href={`/news/${activeNews.slug}`}
          className="group block"
        >
          <div className="relative min-h-[360px] overflow-hidden">
            {activeNews.cover_image_url ? (
              <img
                src={activeNews.cover_image_url}
                alt={activeNews.title}
                className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-105"
              />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-red-950 via-zinc-900 to-zinc-950" />
            )}

            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent" />

            <div className="relative z-10 flex min-h-[360px] items-end p-6 md:p-10">
              <div className="max-w-3xl">
                <p className="text-xs font-bold uppercase tracking-[0.25em] text-red-300">
                  {activeNews.published_at
                    ? new Date(activeNews.published_at).toLocaleDateString("th-TH")
                    : "ประกาศ"}
                </p>

                <h3 className="mt-4 text-3xl font-black leading-tight md:text-5xl">
                  {activeNews.title}
                </h3>

                {activeNews.excerpt && (
                  <p className="mt-4 max-w-2xl text-sm leading-7 text-zinc-300 md:text-base">
                    {activeNews.excerpt}
                  </p>
                )}

                <div className="mt-6 inline-flex rounded-full bg-red-600 px-5 py-3 text-sm font-black text-white group-hover:bg-red-500">
                  อ่านข่าวนี้
                </div>
              </div>
            </div>
          </div>
        </Link>

        {news.length > 1 && (
          <>
            <button
              type="button"
              onClick={() =>
                setActiveIndex((current) =>
                  current === 0 ? news.length - 1 : current - 1
                )
              }
              className="absolute left-4 top-1/2 z-20 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-black/50 font-black text-white hover:bg-black"
            >
              ‹
            </button>

            <button
              type="button"
              onClick={() =>
                setActiveIndex((current) => (current + 1) % news.length)
              }
              className="absolute right-4 top-1/2 z-20 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-black/50 font-black text-white hover:bg-black"
            >
              ›
            </button>
          </>
        )}
      </div>

      {news.length > 1 && (
        <div className="flex items-center justify-center gap-2 px-6 py-5">
          {news.map((item, index) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveIndex(index)}
              className={`h-2.5 rounded-full transition ${
                activeIndex === index
                  ? "w-8 bg-red-400"
                  : "w-2.5 bg-white/30 hover:bg-white/60"
              }`}
              aria-label={`ไปข่าวที่ ${index + 1}`}
            />
          ))}
        </div>
      )}
    </section>
  );
}