import ArenaCollectionPanel from "@/components/arena/ArenaCollectionPanel";

export const dynamic = "force-dynamic";

export default function ArenaCollectionPage() {
  return (
    <main className="mx-auto max-w-7xl px-6 py-10">
      <section className="mb-8 rounded-3xl border border-white/10 bg-gradient-to-br from-red-950/60 via-zinc-900 to-zinc-950 p-6 md:p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-red-300">
          Arena Collection (คอลเลกชันอารีนา)
        </p>
        <h1 className="mt-3 text-4xl font-black">
          Your Arena cards (การ์ดอารีนาของคุณ)
        </h1>
        <p className="mt-3 max-w-3xl text-zinc-300">
          View the cards currently connected to your Arena profile. (ดูการ์ดที่เชื่อมกับโปรไฟล์อารีนาของคุณ)
        </p>
      </section>

      <ArenaCollectionPanel />
    </main>
  );
}
