import Link from "next/link";
import ArenaLineupStatusCard from "@/components/arena-v2/ArenaLineupStatusCard";
import ArenaProgressJourney from "@/components/arena-v2/ArenaProgressJourney";
import ArenaShell from "@/components/arena-v2/ArenaShell";
import PlayerCard from "@/components/arena/PlayerCard";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

type ArenaWeek = {
  id: string;
  season_id: string;
  name: string;
  status: string;
  lineup_locks_at: string | null;
};

const topPlayers = [
  { playerName: "Phoom", school: "DARUNA", position: "MF", rating: 92, stars: 5, rarity: "legend" },
  { playerName: "Fluk", school: "BENJ", position: "FW", rating: 90, stars: 5, rarity: "epic" },
  { playerName: "Nuttapong", school: "SARASIT", position: "DF", rating: 88, stars: 4, rarity: "rare" },
  { playerName: "Korn", school: "PHOTHA", position: "FW", rating: 87, stars: 4, rarity: "elite" },
];

function StatTile({
  label,
  value,
  tone = "text-white",
}: {
  label: string;
  value: string;
  tone?: string;
}) {
  return (
    <div className="rounded-[12px] border border-white/10 bg-black/30 p-4">
      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-500">
        {label}
      </p>
      <p className={`mt-2 text-2xl font-black ${tone}`}>{value}</p>
    </div>
  );
}

export default async function ArenaFantasyPage() {
  const { data: weeks, error } = await supabase
    .from("arena_weeks")
    .select("id, season_id, name, status, lineup_locks_at")
    .in("status", ["open", "locked", "scoring", "final"])
    .order("week_number", { ascending: false })
    .limit(1);

  const currentWeek = ((weeks || []) as ArenaWeek[])[0] || null;
  const playerCountResult = currentWeek
    ? await supabase
        .from("season_players")
        .select("id", { count: "exact", head: true })
        .eq("season_id", currentWeek.season_id)
        .eq("status", "active")
    : { count: 0 };

  const playerCount = playerCountResult.count || 72;
  const matchdayLabel = currentWeek?.name || "MATCHDAY 1";

  return (
    <ArenaShell active="fantasy" title="จัดทีมแฟนตาซี">
      <section className="border-b border-white/10 bg-[#05100c] p-4 sm:p-6 lg:p-8">
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-end">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.24em] text-emerald-300">
              จัดทีมแฟนตาซี
            </p>
            <h1 className="mt-3 text-4xl font-black uppercase leading-none text-white sm:text-6xl">
              {matchdayLabel}
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-zinc-300">
              เลือกนักเตะ 11 คน ส่งทีม แล้วรอคะแนนหลังการแข่งขัน
            </p>
            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <StatTile
                label="นักเตะที่เลือกได้"
                value={`${playerCount} คน`}
                tone="text-emerald-200"
              />
              <ArenaLineupStatusCard />
              <StatTile
                label="แมตช์เดย์"
                value={currentWeek?.status || "open"}
                tone="text-sky-200"
              />
            </div>
            {error ? (
              <p className="mt-4 rounded-[10px] border border-amber-300/30 bg-amber-300/10 p-3 text-sm text-amber-100">
                ยังโหลดข้อมูลแมตช์เดย์ไม่ได้ แต่ยังเข้าไปดูหน้าจัดทีมได้
              </p>
            ) : null}
          </div>

          <div className="rounded-[14px] border border-emerald-300/25 bg-[#07140f] p-4 shadow-[0_0_34px_rgba(52,211,153,0.12)]">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-200">
              ปุ่มหลัก
            </p>
            <Link
              href="/arena/fantasy/my-team"
              className="mt-4 block rounded-[10px] border border-emerald-200 bg-emerald-500 px-6 py-4 text-center text-sm font-black text-white shadow-[0_0_34px_rgba(52,211,153,0.30)] hover:bg-emerald-400"
            >
              จัดทีมของฉัน
            </Link>
            <p className="mt-3 text-xs leading-5 text-zinc-400">
              กดปุ่มนี้เพื่อเลือกผู้เล่นและส่งทีม
            </p>
          </div>
        </div>
      </section>

      <ArenaProgressJourney currentStep={1} />

      <section className="space-y-6 p-4 sm:p-6 lg:p-8">
        <div className="rounded-[14px] border border-white/10 bg-[#070b12] p-4">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-yellow-200">
            กติกาง่าย ๆ
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <StatTile label="ผู้เล่น" value="11 คน" />
            <StatTile label="ตำแหน่ง" value="GK 1" />
            <StatTile label="กองหลัง" value="DF 4" />
            <StatTile label="กองกลาง" value="MF 4" />
            <StatTile label="กองหน้า" value="FW 2" />
            <StatTile label="เพดานทีม" value="38 ดาว / โรงเรียนละไม่เกิน 5 คน" />
          </div>
        </div>

        <div>
          <div className="mb-4">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-yellow-200">
              นักเตะแนะนำ
            </p>
            <h2 className="mt-1 text-2xl font-black text-white">
              ดูตัวอย่างก่อนจัดทีม
            </h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {topPlayers.map((player) => (
              <div key={player.playerName} className="mx-auto w-full max-w-[286px]">
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
    </ArenaShell>
  );
}
