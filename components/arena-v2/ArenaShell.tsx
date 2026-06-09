import type { ReactNode } from "react";
import Link from "next/link";

type ArenaShellProps = {
  title?: string;
  active?: "arena" | "fantasy" | "collection" | "rankings" | "team";
  children: ReactNode;
};

const navItems = [
  { key: "arena", label: "อารีนา", href: "/arena" },
  { key: "fantasy", label: "จัดทีม", href: "/arena/fantasy" },
  { key: "collection", label: "คลังการ์ด", href: "/arena/collection" },
  { key: "rankings", label: "ตารางคะแนน", href: "/arena/fantasy/leaderboard" },
] as const;

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export default function ArenaShell({
  title = "Jaturamit Arena",
  active = "arena",
  children,
}: ArenaShellProps) {
  return (
    <main className="min-h-screen overflow-hidden bg-[#02050b] text-white">
      <div className="fixed inset-0 -z-10 bg-[radial-gradient(circle_at_18%_0%,rgba(138,43,226,0.22),transparent_28%),radial-gradient(circle_at_84%_4%,rgba(0,229,255,0.16),transparent_28%),radial-gradient(circle_at_50%_92%,rgba(0,255,106,0.12),transparent_34%),linear-gradient(180deg,#02050b_0%,#08101a_48%,#02050b_100%)]" />
      <div className="fixed inset-0 -z-10 opacity-25 [background:linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(0deg,rgba(255,255,255,0.05)_1px,transparent_1px)] [background-size:44px_44px]" />
      <div className="fixed inset-x-0 top-0 -z-10 h-44 bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,0.18),transparent_58%)]" />

      <div className="mx-auto max-w-[1600px] px-3 py-3 sm:px-4 lg:px-5">
        <div className="overflow-hidden rounded-[18px] border border-white/12 bg-black/45 shadow-[0_0_0_1px_rgba(255,255,255,0.04),0_34px_120px_rgba(0,0,0,0.62)] backdrop-blur">
          <header className="sticky top-0 z-30 border-b border-white/10 bg-[#050912]/88 px-4 py-3 backdrop-blur-md">
            <div className="flex items-center justify-between gap-4">
              <Link href="/arena" className="flex items-center gap-3">
                <span className="grid h-8 w-8 place-items-center rounded-full border border-yellow-300/30 bg-yellow-300/10 text-yellow-200">
                  A
                </span>
                <span className="leading-none">
                  <span className="block text-[10px] font-black uppercase tracking-[0.24em] text-zinc-500">
                    Jaturamit
                  </span>
                  <span className="block text-xl font-black uppercase text-yellow-200">
                    Arena
                  </span>
                </span>
              </Link>

              <nav className="hidden items-center gap-1 md:flex">
                {navItems.map((item) => (
                  <Link
                    key={item.key}
                    href={item.href}
                    className={cx(
                      "px-4 py-2 text-[11px] font-black uppercase tracking-[0.16em] transition",
                      active === item.key
                        ? "bg-white text-zinc-950"
                        : "text-zinc-400 hover:bg-white/10 hover:text-white",
                    )}
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>

              <div className="flex items-center gap-2">
                <span className="hidden h-2 w-2 rounded-full bg-red-400 shadow-[0_0_18px_rgba(248,113,113,0.95)] sm:block" />
                <span className="grid h-9 w-9 place-items-center rounded-full border border-emerald-300/30 bg-emerald-300/10 text-xs font-black text-emerald-100">
                  JP
                </span>
              </div>
            </div>
            <div className="mt-3 flex gap-2 overflow-x-auto md:hidden">
              {navItems.map((item) => (
                <Link
                  key={item.key}
                  href={item.href}
                  className={cx(
                    "shrink-0 px-3 py-2 text-[10px] font-black uppercase tracking-[0.14em]",
                    active === item.key
                      ? "bg-white text-zinc-950"
                      : "border border-white/10 text-zinc-400",
                  )}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </header>

          <div aria-label={title}>{children}</div>
        </div>
      </div>
    </main>
  );
}
