import Link from "next/link";

const arenaLinks = [
  {
    href: "/arena/fantasy",
    title: "Fantasy Football (แฟนตาซีฟุตบอล)",
    description:
      "Pick your lineup, follow fantasy matchdays, and compete on the leaderboard. (จัดทีมของคุณ ติดตามแมตช์เดย์แฟนตาซี และแข่งขันบนตารางอันดับ)",
  },
  {
    href: "/arena/claim",
    title: "Claim Card (รับการ์ด)",
    description:
      "Enter a claim code to preview and collect Arena cards. (กรอกรหัสเพื่อดูตัวอย่างและรับการ์ดอารีนา)",
  },
  {
    href: "/arena/collection",
    title: "My Collection (คลังการ์ดของฉัน)",
    description:
      "View the Arena cards connected to your profile. (ดูการ์ดอารีนาที่เชื่อมกับโปรไฟล์ของคุณ)",
  },
  {
    href: "/arena/ranking",
    title: "Vote Ranking (อันดับโหวต)",
    description:
      "See the live ranking from the Arena vote campaign. (ดูอันดับสดจากแคมเปญโหวตอารีนา)",
  },
  {
    href: "/arena/vote",
    title: "Vote Campaign (แคมเปญโหวต)",
    description:
      "Choose your side and submit your Arena vote. (เลือกฝั่งของคุณและส่งโหวตอารีนา)",
  },
];

export default function ArenaPage() {
  return (
    <main className="mx-auto max-w-7xl px-6 py-10">
      <section className="mb-8 rounded-3xl border border-white/10 bg-gradient-to-br from-red-950/60 via-zinc-900 to-zinc-950 p-6 md:p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-red-300">
          Arena (อารีนา)
        </p>
        <h1 className="mt-3 text-4xl font-black">
          Jaturamit Arena (จตุรมิตร อารีนา)
        </h1>
        <p className="mt-3 max-w-3xl text-zinc-300">
          Explore Fantasy Football, card claiming, your collection, vote ranking,
          and the live vote campaign. (รวมแฟนตาซีฟุตบอล การรับการ์ด คลังการ์ดของคุณ
          อันดับโหวต และแคมเปญโหวตสด)
        </p>
      </section>

      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {arenaLinks.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="rounded-2xl border border-white/10 bg-zinc-900 p-5 transition hover:border-red-300/50 hover:bg-zinc-900/80"
          >
            <h2 className="text-2xl font-black">{item.title}</h2>
            <p className="mt-3 text-sm leading-6 text-zinc-400">
              {item.description}
            </p>
          </Link>
        ))}
      </section>
    </main>
  );
}
