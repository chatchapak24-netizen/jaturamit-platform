import Link from "next/link";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

type ArenaWeek = {
  id: string;
  name: string;
  status: string;
  lineup_locks_at: string | null;
};

export default async function ArenaFantasyPage() {
  const { data: weeks, error } = await supabase
    .from("arena_weeks")
    .select("id, name, status, lineup_locks_at")
    .in("status", ["open", "locked", "scoring", "final"])
    .order("week_number", { ascending: false })
    .limit(3);

  const visibleWeeks = (weeks || []) as ArenaWeek[];

  return (
    <main className="mx-auto max-w-7xl px-6 py-10">
      <section className="mb-8 rounded-3xl border border-white/10 bg-gradient-to-br from-red-950/60 via-zinc-900 to-zinc-950 p-6 md:p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-red-300">
          Jaturamit Arena Fantasy (จตุรมิตร อารีนา แฟนตาซี)
        </p>
        <div className="mt-3 grid gap-6 lg:grid-cols-[1fr_320px] lg:items-end">
          <div>
            <h1 className="text-4xl font-black">Pick Lineup (เลือกทีม)</h1>
            <p className="mt-3 max-w-3xl text-zinc-300">
              Build an 11-player Jaturamit lineup from real season players. Phase
              1A uses the existing Arena weekly lineup foundation without coins,
              budget, marketplace, or trading. (จัดทีมจตุรมิตร 11 คนจากนักเตะจริงของซีซั่น โดยเฟส 1A ยังไม่มีเหรียญ งบประมาณ ตลาด หรือการเทรด)
            </p>
          </div>
          <div className="flex flex-wrap gap-3 lg:justify-end">
            <Link
              href="/arena/fantasy/my-team"
              className="rounded-xl bg-red-600 px-4 py-3 text-sm font-black text-white hover:bg-red-500"
            >
              My Team (ทีมของฉัน)
            </Link>
            <Link
              href="/arena/fantasy/leaderboard"
              className="rounded-xl border border-white/10 px-4 py-3 text-sm font-black text-zinc-100 hover:bg-white/10"
            >
              Leaderboard (ตารางอันดับ)
            </Link>
          </div>
        </div>
      </section>

      {error ? (
        <section className="rounded-2xl border border-amber-300/30 bg-amber-300/10 p-5 text-amber-100">
          {error.message}
        </section>
      ) : (
        <section className="grid gap-5 md:grid-cols-3">
          <article className="rounded-2xl border border-white/10 bg-zinc-900 p-5">
            <p className="text-xs font-black uppercase tracking-[0.24em] text-red-300">
              Formation (แผนการเล่น)
            </p>
            <h2 className="mt-3 text-2xl font-black">1-4-4-2</h2>
            <p className="mt-2 text-sm text-zinc-400">
              GK 1, DF 4, MF 4, FW 2. (ผู้รักษาประตู 1, กองหลัง 4, กองกลาง 4, กองหน้า 2)
            </p>
          </article>
          <article className="rounded-2xl border border-white/10 bg-zinc-900 p-5">
            <p className="text-xs font-black uppercase tracking-[0.24em] text-red-300">
              Rules (กติกา)
            </p>
            <h2 className="mt-3 text-2xl font-black">38 stars (38 ดาว)</h2>
            <p className="mt-2 text-sm text-zinc-400">
              Maximum 5 players from the same school/team. (เลือกผู้เล่นจากโรงเรียน/ทีมเดียวกันได้สูงสุด 5 คน)
            </p>
          </article>
          <article className="rounded-2xl border border-white/10 bg-zinc-900 p-5">
            <p className="text-xs font-black uppercase tracking-[0.24em] text-red-300">
              Active Weeks (สัปดาห์ที่ใช้งาน)
            </p>
            <h2 className="mt-3 text-2xl font-black">{visibleWeeks.length}</h2>
            <p className="mt-2 text-sm text-zinc-400">
              Existing Arena weeks are reused as fantasy matchdays. (ใช้สัปดาห์อารีนาเดิมเป็นแมตช์เดย์แฟนตาซี)
            </p>
          </article>
        </section>
      )}

      <section className="mt-8 rounded-2xl border border-white/10 bg-zinc-900 p-6">
        <h2 className="text-2xl font-black">Matchdays (แมตช์เดย์)</h2>
        <div className="mt-5 grid gap-3">
          {visibleWeeks.map((week) => (
            <div
              key={week.id}
              className="flex flex-col gap-2 rounded-xl border border-white/10 bg-zinc-950 p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="font-black">{week.name}</p>
                <p className="text-sm text-zinc-500">
                  Lock (เวลาล็อก): {week.lineup_locks_at || "not set (ยังไม่ตั้งค่า)"}
                </p>
              </div>
              <span className="w-fit rounded-full border border-red-300/30 px-3 py-1 text-xs font-black uppercase text-red-200">
                {week.status}
              </span>
            </div>
          ))}
          {visibleWeeks.length === 0 && !error ? (
            <p className="text-zinc-400">
              No fantasy week is open yet. (ยังไม่มีสัปดาห์แฟนตาซีที่เปิดอยู่)
            </p>
          ) : null}
        </div>
      </section>
    </main>
  );
}
