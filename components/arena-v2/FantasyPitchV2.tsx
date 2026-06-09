import type { ReactNode } from "react";

export default function FantasyPitchV2({
  title,
  subtitle,
  status,
  children,
}: {
  title: string;
  subtitle: string;
  status: string;
  children: ReactNode;
}) {
  return (
    <section className="relative overflow-hidden rounded-[14px] border border-emerald-300/20 bg-[#04100b] shadow-[0_0_70px_rgba(34,197,94,0.12),0_34px_100px_rgba(0,0,0,0.55)]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(34,197,94,0.18),transparent_36%),linear-gradient(140deg,#04100b_0%,#071727_58%,#031008_100%)]" />
      <div className="relative flex flex-col gap-3 border-b border-emerald-200/10 bg-black/35 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.24em] text-emerald-300">
            My Team (Squad Builder)
          </p>
          <h2 className="mt-2 text-3xl font-black uppercase leading-none text-white md:text-5xl">
            {title}
          </h2>
          <p className="mt-2 text-sm text-zinc-400">{subtitle}</p>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center">
          <HudStat label="Status" value={status} tone="emerald" />
          <HudStat label="Mode" value="Matchday" tone="sky" />
          <HudStat label="Rules" value="Live" tone="yellow" />
        </div>
      </div>
      <div className="relative p-3 sm:p-5">
        <div className="absolute inset-x-10 top-8 h-20 bg-emerald-300/12 blur-3xl" />
        {children}
      </div>
    </section>
  );
}

function HudStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "emerald" | "sky" | "yellow";
}) {
  const color =
    tone === "emerald"
      ? "text-emerald-200"
      : tone === "sky"
        ? "text-sky-200"
        : "text-yellow-200";

  return (
    <div className="min-w-20 rounded-[8px] border border-white/10 bg-white/[0.04] px-3 py-2">
      <p className={`truncate text-sm font-black uppercase ${color}`}>{value}</p>
      <p className="mt-1 text-[9px] font-black uppercase tracking-[0.16em] text-zinc-500">
        {label}
      </p>
    </div>
  );
}
