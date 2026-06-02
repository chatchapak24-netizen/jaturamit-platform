import ArenaCollectionPanel from "@/components/arena/ArenaCollectionPanel";

export const dynamic = "force-dynamic";

export default function ArenaCollectionPage() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#05070d] text-white">
      <section className="relative px-5 pb-10 pt-10 md:px-8 lg:px-12">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_12%,rgba(239,68,68,0.26),transparent_28%),radial-gradient(circle_at_82%_8%,rgba(250,204,21,0.18),transparent_24%),linear-gradient(135deg,#05070d_0%,#090d18_48%,#140716_100%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,0.07)_1px,transparent_1px),linear-gradient(0deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[length:42px_42px] opacity-30" />

        <div className="relative mx-auto max-w-7xl">
          <div className="inline-flex border border-yellow-200/30 bg-yellow-200/10 px-4 py-2 text-xs font-black uppercase tracking-[0.24em] text-yellow-100">
            Digital Card Binder
          </div>
          <h1 className="mt-6 text-5xl font-black uppercase leading-none tracking-normal md:text-7xl">
            Card Collection (คลังการ์ด)
          </h1>
          <p className="mt-5 max-w-3xl text-base leading-8 text-zinc-300 md:text-lg">
            Build your Jaturamit Arena album, complete school sets, and track
            owned or locked cards like a football collectible binder. (สะสมอัลบั้มจตุรมิตร อารีนา เติมเซ็ตโรงเรียน และติดตามการ์ดที่มีหรือยังล็อกอยู่)
          </p>
        </div>
      </section>

      <ArenaCollectionPanel />
    </main>
  );
}
