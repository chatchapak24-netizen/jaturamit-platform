import type { CSSProperties } from "react";
import Link from "next/link";
import PlayerCard from "@/components/arena/PlayerCard";
import {
  ARENA_RARITIES,
  ARENA_SCHOOLS,
  type ArenaSchoolKey,
} from "@/src/lib/arena-theme";

const featuredPlayers = [
  {
    playerName: "Krit Narong",
    school: "DARUNA",
    position: "ST",
    rating: 94,
    stars: 5,
    rarity: "legend",
  },
  {
    playerName: "Nawin Chai",
    school: "PHOTHA",
    position: "CAM",
    rating: 91,
    stars: 5,
    rarity: "epic",
  },
  {
    playerName: "Thana Prasert",
    school: "SARASIT",
    position: "CB",
    rating: 89,
    stars: 4,
    rarity: "elite",
  },
  {
    playerName: "Pakin Arun",
    school: "BENJ",
    position: "LW",
    rating: 96,
    stars: 5,
    rarity: "mythic",
  },
] as const;

const gameModes = [
  {
    href: "/arena/fantasy",
    kicker: "Squad Builder",
    title: "Fantasy Football (แฟนตาซีฟุตบอล)",
    description:
      "Build your weekly lineup and chase points from real Jaturamit match action. (จัดทีมรายสัปดาห์และลุ้นคะแนนจากผลงานจริงในสนาม)",
    accent: "#22c55e",
    status: "Live",
  },
  {
    href: "/arena/collection",
    kicker: "Club Inventory",
    title: "My Collection (คลังการ์ดของฉัน)",
    description:
      "View your claimed Arena cards and grow the squad around your school identity. (ดูการ์ดอารีนาที่รับแล้วและสะสมทีมตามตัวตนของโรงเรียน)",
    accent: "#38bdf8",
    status: "Live",
  },
  {
    href: "/arena/claim",
    kicker: "Pack Drop",
    title: "Claim Card (รับการ์ด)",
    description:
      "Enter a claim code, preview the collectible, and attach it to your Arena profile. (กรอกรหัส ดูตัวอย่างการ์ด และเชื่อมเข้ากับโปรไฟล์อารีนา)",
    accent: "#f59e0b",
    status: "Live",
  },
  {
    href: "/arena/ranking",
    kicker: "Broadcast Table",
    title: "Vote Ranking (อันดับโหวต)",
    description:
      "Track the live campaign table with a sports broadcast scoreboard feel. (ติดตามอันดับแคมเปญแบบกราฟิกถ่ายทอดสดกีฬา)",
    accent: "#ef4444",
    status: "Live",
  },
  {
    href: "/arena/vote",
    kicker: "Fan Campaign",
    title: "Vote Campaign (แคมเปญโหวต)",
    description:
      "Choose your side and push your favorite Arena entry up the table. (เลือกฝั่งของคุณและดันรายการโปรดขึ้นอันดับ)",
    accent: "#c084fc",
    status: "Live",
  },
  {
    href: "/arena/school-battle",
    kicker: "Territory Mode",
    title: "School Battle (ศึกโรงเรียน)",
    description:
      "A future house-vs-house mode for school pride, streaks, and weekly domination. (โหมดศึกศักดิ์ศรีโรงเรียนสำหรับอนาคต)",
    accent: "#fb7185",
    status: "Coming Soon",
    disabled: true,
  },
] as const;

const schoolBattle = [
  { school: "DARUNA", power: 92, form: "W-W-D", score: "12.4K" },
  { school: "PHOTHA", power: 88, form: "W-L-W", score: "11.7K" },
  { school: "SARASIT", power: 90, form: "D-W-W", score: "12.1K" },
  { school: "BENJ", power: 95, form: "W-W-W", score: "13.6K" },
] as const;

const broadcastRanking = [
  {
    rank: 1,
    player: "Pakin Arun",
    school: "BENJ",
    rarity: "Mythic",
    points: "13,620",
    change: "+420",
  },
  {
    rank: 2,
    player: "Krit Narong",
    school: "DARUNA",
    rarity: "Legend",
    points: "12,980",
    change: "+310",
  },
  {
    rank: 3,
    player: "Thana Prasert",
    school: "SARASIT",
    rarity: "Elite",
    points: "12,140",
    change: "+280",
  },
  {
    rank: 4,
    player: "Nawin Chai",
    school: "PHOTHA",
    rarity: "Epic",
    points: "11,770",
    change: "+190",
  },
] as const;

function sectionLabel(label: string, subLabel: string) {
  return (
    <div>
      <p className="text-xs font-black uppercase tracking-[0.28em] text-red-300">
        {label}
      </p>
      <h2 className="mt-2 text-2xl font-black uppercase tracking-wide text-white md:text-3xl">
        {subLabel}
      </h2>
    </div>
  );
}

function GameModeCard({ mode }: { mode: (typeof gameModes)[number] }) {
  const style = {
    "--mode-accent": mode.accent,
  } as CSSProperties;
  const isDisabled = "disabled" in mode && mode.disabled;

  const content = (
    <div
      className="relative flex min-h-56 flex-col justify-between overflow-hidden rounded-2xl border border-white/10 bg-zinc-950/80 p-5 shadow-[0_24px_70px_rgba(0,0,0,0.35)] transition duration-300"
      style={style}
    >
      <div className="absolute inset-x-0 top-0 h-1 bg-[var(--mode-accent)]" />
      <div className="absolute -right-12 top-6 h-28 w-28 rounded-full bg-[var(--mode-accent)] opacity-20 blur-2xl" />
      <div className="relative">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-[var(--mode-accent)]">
            {mode.kicker}
          </p>
          <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-white">
            {mode.status}
          </span>
        </div>
        <h3 className="mt-5 text-2xl font-black leading-tight text-white">
          {mode.title}
        </h3>
        <p className="mt-3 text-sm leading-6 text-zinc-300">
          {mode.description}
        </p>
      </div>
      <div className="relative mt-5 flex items-center justify-between border-t border-white/10 pt-4">
        <span className="text-xs font-black uppercase tracking-[0.2em] text-zinc-500">
          Arena Mode
        </span>
        <span className="text-sm font-black text-[var(--mode-accent)]">
          {isDisabled ? "Locked" : "Enter"}
        </span>
      </div>
    </div>
  );

  if (isDisabled) {
    return <article className="opacity-65 grayscale-[0.25]">{content}</article>;
  }

  return (
    <Link
      href={mode.href}
      className="group block hover:-translate-y-1 hover:[&>div]:border-[var(--mode-accent)]"
    >
      {content}
    </Link>
  );
}

function SchoolBattleCard({ item }: { item: (typeof schoolBattle)[number] }) {
  const school = ARENA_SCHOOLS[item.school as ArenaSchoolKey];
  const style = {
    "--school-primary": school.colors.primary,
    "--school-accent": school.colors.accent,
    "--school-dark": school.colors.dark,
    background: school.gradient,
  } as CSSProperties;

  return (
    <article
      className="relative min-h-52 overflow-hidden rounded-2xl border border-white/15 p-5 shadow-[0_24px_70px_rgba(0,0,0,0.35)]"
      style={style}
    >
      <div className="absolute inset-0 bg-zinc-950/42" />
      <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-[var(--school-accent)] opacity-35 blur-2xl" />
      <div className="relative flex h-full flex-col justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.22em] text-[var(--school-accent)]">
            {school.kingdomLabel}
          </p>
          <h3 className="mt-3 text-3xl font-black text-white">
            {school.shortLabel}
          </h3>
        </div>
        <div className="mt-8 grid grid-cols-3 gap-3 text-center">
          <div className="border-r border-white/15 pr-3">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/60">
              Power
            </p>
            <p className="mt-1 text-2xl font-black text-white">
              {item.power}
            </p>
          </div>
          <div className="border-r border-white/15 pr-3">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/60">
              Form
            </p>
            <p className="mt-2 text-sm font-black text-white">{item.form}</p>
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/60">
              Score
            </p>
            <p className="mt-2 text-sm font-black text-white">{item.score}</p>
          </div>
        </div>
      </div>
    </article>
  );
}

export default function ArenaPage() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#05070d] text-white">
      <section className="relative px-5 pb-16 pt-10 md:px-8 lg:px-12">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_12%,rgba(239,68,68,0.32),transparent_26%),radial-gradient(circle_at_78%_6%,rgba(56,189,248,0.24),transparent_25%),linear-gradient(135deg,#05070d_0%,#090d18_42%,#160611_100%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(0deg,rgba(255,255,255,0.06)_1px,transparent_1px)] bg-[length:44px_44px] opacity-25" />
        <div className="relative mx-auto grid max-w-7xl gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(460px,0.9fr)] lg:items-center">
          <div className="pt-8 md:pt-14">
            <div className="inline-flex items-center gap-3 border border-red-300/30 bg-red-500/10 px-4 py-2 text-xs font-black uppercase tracking-[0.22em] text-red-200">
              4 Schools / 1 Dream
            </div>
            <h1 className="mt-7 max-w-4xl text-5xl font-black uppercase leading-[0.92] tracking-normal text-white md:text-7xl lg:text-8xl">
              JATURAMIT ARENA
            </h1>
            <p className="mt-5 max-w-2xl text-xl font-black uppercase tracking-[0.16em] text-yellow-200">
              Football Gaming Ecosystem
            </p>
            <p className="mt-5 max-w-2xl text-base leading-8 text-zinc-300 md:text-lg">
              A card-first football lobby for fantasy squads, collectible
              players, school pride, and live fan campaigns. (ล็อบบี้ฟุตบอลเกมมิ่งสำหรับทีมแฟนตาซี การ์ดสะสม ศักดิ์ศรีโรงเรียน และแคมเปญโหวตสด)
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/arena/fantasy"
                className="border border-yellow-200 bg-yellow-200 px-5 py-3 text-sm font-black uppercase tracking-[0.14em] text-zinc-950 transition hover:bg-white"
              >
                Build Squad (จัดทีม)
              </Link>
              <Link
                href="/arena/claim"
                className="border border-white/20 bg-white/10 px-5 py-3 text-sm font-black uppercase tracking-[0.14em] text-white transition hover:border-red-300 hover:bg-red-400/15"
              >
                Claim Card (รับการ์ด)
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 sm:gap-5">
            {featuredPlayers.map((player, index) => (
              <div
                key={player.playerName}
                className={index % 2 === 0 ? "lg:translate-y-8" : ""}
              >
                <PlayerCard
                  playerName={player.playerName}
                  school={player.school}
                  position={player.position}
                  rating={player.rating}
                  stars={player.stars}
                  rarity={player.rarity}
                  variant="compact"
                  className="mx-auto"
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="relative mx-auto max-w-7xl px-5 py-12 md:px-8 lg:px-12">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
          {sectionLabel(
            "Game Modes (โหมดเกม)",
            "Choose Your Arena Path (เลือกเส้นทางอารีนา)",
          )}
          <p className="max-w-xl text-sm leading-6 text-zinc-400">
            Existing Arena features stay intact while the lobby becomes the
            launch screen for every mode. (ฟีเจอร์อารีนาเดิมยังอยู่ครบ แต่หน้าแรกกลายเป็นจุดเริ่มต้นของทุกโหมด)
          </p>
        </div>

        <div className="mt-7 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {gameModes.map((mode) => (
            <GameModeCard key={mode.title} mode={mode} />
          ))}
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-8 px-5 py-12 md:px-8 lg:grid-cols-[1fr_0.8fr] lg:px-12">
        <div>
          {sectionLabel(
            "School Battle Preview (ตัวอย่างศึกโรงเรียน)",
            "Kingdoms On The Pitch",
          )}
          <div className="mt-7 grid gap-4 sm:grid-cols-2">
            {schoolBattle.map((item) => (
              <SchoolBattleCard key={item.school} item={item} />
            ))}
          </div>
        </div>

        <aside className="relative overflow-hidden rounded-3xl border border-white/10 bg-zinc-950 p-6 shadow-[0_24px_70px_rgba(0,0,0,0.45)]">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-red-400 via-yellow-200 to-sky-300" />
          <div className="absolute -right-14 top-10 h-36 w-36 rounded-full bg-red-500/25 blur-3xl" />
          <div className="relative">
            {sectionLabel(
              "Broadcast Ranking (อันดับถ่ายทอดสด)",
              "Arena Top 4",
            )}
            <div className="mt-6 space-y-3">
              {broadcastRanking.map((entry) => {
                const school = ARENA_SCHOOLS[entry.school as ArenaSchoolKey];

                return (
                  <div
                    key={entry.rank}
                    className="grid grid-cols-[44px_1fr_auto] items-center gap-3 border border-white/10 bg-white/[0.04] p-3"
                  >
                    <div className="grid h-11 w-11 place-items-center bg-white text-lg font-black text-zinc-950">
                      {entry.rank}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-black uppercase text-white">
                        {entry.player}
                      </p>
                      <p className="mt-1 truncate text-[11px] font-black uppercase tracking-[0.16em] text-zinc-500">
                        {school.shortLabel} / {entry.rarity}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-black text-white">
                        {entry.points}
                      </p>
                      <p className="text-xs font-black text-emerald-300">
                        {entry.change}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-6 border border-white/10 bg-black/25 p-4">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-zinc-500">
                Static Preview Data
              </p>
              <p className="mt-2 text-sm leading-6 text-zinc-300">
                Mock rankings for the lobby only. Live ranking stays in the
                existing vote/ranking routes. (ข้อมูลตัวอย่างสำหรับหน้า Lobby เท่านั้น อันดับจริงยังอยู่ใน route โหวตและอันดับเดิม)
              </p>
            </div>
          </div>
        </aside>
      </section>

      <section className="mx-auto max-w-7xl px-5 pb-16 md:px-8 lg:px-12">
        <div className="grid gap-4 border-y border-white/10 py-6 md:grid-cols-3">
          <div>
            <p className="text-3xl font-black text-white">4</p>
            <p className="mt-1 text-xs font-black uppercase tracking-[0.2em] text-zinc-500">
              Schools (โรงเรียน)
            </p>
          </div>
          <div>
            <p className="text-3xl font-black text-white">
              {Object.keys(ARENA_RARITIES).length}
            </p>
            <p className="mt-1 text-xs font-black uppercase tracking-[0.2em] text-zinc-500">
              Card Rarities (ระดับการ์ด)
            </p>
          </div>
          <div>
            <p className="text-3xl font-black text-white">1</p>
            <p className="mt-1 text-xs font-black uppercase tracking-[0.2em] text-zinc-500">
              Dream (ความฝันเดียว)
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
