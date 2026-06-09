import type { CSSProperties } from "react";
import Link from "next/link";
import ArenaAuthActions from "@/components/arena/ArenaAuthActions";
import ArenaLineupStatusCard from "@/components/arena-v2/ArenaLineupStatusCard";
import ArenaProgressJourney from "@/components/arena-v2/ArenaProgressJourney";
import ArenaShell from "@/components/arena-v2/ArenaShell";
import PlayerCard from "@/components/arena/PlayerCard";

type ModeCard = {
  href: string;
  title: string;
  helper: string;
  accent: string;
  featured?: boolean;
};

const featuredPlayer = {
  playerName: "Phoom",
  school: "DARUNA",
  position: "MF",
  rating: 92,
  stars: 5,
  rarity: "legend",
};

const gameModes: ModeCard[] = [
  {
    href: "/arena/fantasy",
    title: "จัดทีมแฟนตาซี",
    helper: "เริ่มเล่นที่นี่",
    accent: "#22c55e",
    featured: true,
  },
  {
    href: "/arena/collection",
    title: "คลังการ์ด",
    helper: "ดูการ์ดของฉัน",
    accent: "#f59e0b",
  },
  {
    href: "/arena/fantasy/leaderboard",
    title: "ตารางคะแนน",
    helper: "ดูอันดับ",
    accent: "#38bdf8",
  },
  {
    href: "/arena/ranking",
    title: "สงคราม 4 โรงเรียน",
    helper: "เชียร์โรงเรียน",
    accent: "#ef4444",
  },
];

function ModeCard({ mode }: { mode: ModeCard }) {
  const style = { "--mode-accent": mode.accent } as CSSProperties;

  return (
    <Link
      href={mode.href}
      className={[
        "group relative overflow-hidden rounded-[12px] border p-4 transition hover:-translate-y-0.5",
        mode.featured
          ? "min-h-44 border-emerald-300/50 bg-emerald-300/12 shadow-[0_0_34px_rgba(34,197,94,0.22)]"
          : "min-h-36 border-white/10 bg-white/[0.04] hover:border-[color:var(--mode-accent)]",
      ].join(" ")}
      style={style}
    >
      <div className="absolute inset-x-0 top-0 h-px bg-[var(--mode-accent)] shadow-[0_0_18px_var(--mode-accent)]" />
      <div className="absolute -right-10 -top-10 h-28 w-28 rounded-full bg-[var(--mode-accent)] opacity-20 blur-2xl" />
      <div className="relative flex h-full flex-col justify-between gap-5">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[var(--mode-accent)]">
            {mode.helper}
          </p>
          <h3 className="mt-3 text-2xl font-black text-white">{mode.title}</h3>
        </div>
        <p className="text-xs font-black uppercase tracking-[0.16em] text-zinc-500 group-hover:text-white">
          เข้าโหมด
        </p>
      </div>
    </Link>
  );
}

export default function ArenaPage() {
  return (
    <ArenaShell active="arena" title="Jaturamit Arena">
      <section className="grid gap-6 border-b border-white/10 bg-[#050814] p-4 sm:p-6 lg:grid-cols-[minmax(0,1fr)_330px] lg:items-center lg:p-8">
        <div className="py-4 sm:py-8">
          <p className="text-xs font-black uppercase tracking-[0.24em] text-emerald-300">
            เกมฟุตบอลแฟนตาซีจตุรมิตรราชบุรี
          </p>
          <h1 className="mt-4 max-w-4xl text-5xl font-black uppercase leading-[0.88] text-white [text-shadow:0_0_28px_rgba(250,204,21,0.26)] sm:text-7xl lg:text-8xl">
            <span className="block">JATURAMIT</span>
            <span className="block">ARENA</span>
          </h1>
          <div className="mt-5 grid max-w-xl grid-cols-2 gap-2 text-sm font-black text-yellow-100 sm:grid-cols-4">
            <span>เลือกนักเตะ</span>
            <span>จัดทีม</span>
            <span>ส่งทีม</span>
            <span>ลุ้นคะแนนประจำสัปดาห์</span>
          </div>
          <p className="mt-5 max-w-2xl text-sm leading-7 text-zinc-300">
            เลือกผู้เล่น 11 คน ส่งทีมก่อนแข่ง แล้วรอดูคะแนนจากผลงานจริง
          </p>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/arena/fantasy/my-team"
              className="rounded-[10px] border border-emerald-200 bg-emerald-500 px-6 py-4 text-center text-sm font-black text-white shadow-[0_0_32px_rgba(52,211,153,0.32)] hover:bg-emerald-400"
            >
              เริ่มจัดทีม
            </Link>
            <Link
              href="/arena/collection"
              className="rounded-[10px] border border-yellow-300/40 bg-yellow-300/10 px-6 py-4 text-center text-sm font-black text-yellow-100 hover:bg-yellow-300/20"
            >
              ดูคลังการ์ด
            </Link>
          </div>
          <ArenaAuthActions className="mt-3" nextPath="/arena/fantasy/my-team" />
        </div>

        <div className="mx-auto w-full max-w-[300px] pb-4 lg:pb-0">
          <PlayerCard
            playerName={featuredPlayer.playerName}
            school={featuredPlayer.school}
            position={featuredPlayer.position}
            rating={featuredPlayer.rating}
            stars={featuredPlayer.stars}
            rarity={featuredPlayer.rarity}
            className="mx-auto"
          />
        </div>
      </section>

      <ArenaProgressJourney currentStep={1} />

      <section className="space-y-6 p-4 sm:p-6 lg:p-8">
        <ArenaLineupStatusCard variant="mission" />

        <div>
          <div className="mb-4">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-yellow-200">
              เลือกโหมด
            </p>
            <h2 className="mt-1 text-2xl font-black text-white">
              เริ่มจากจัดทีมแฟนตาซี
            </h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {gameModes.map((mode) => (
              <ModeCard key={mode.title} mode={mode} />
            ))}
          </div>
        </div>
      </section>
    </ArenaShell>
  );
}
