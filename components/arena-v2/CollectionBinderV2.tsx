import type { ReactNode } from "react";

export default function CollectionBinderV2({
  title,
  subtitle,
  owned,
  locked,
  children,
}: {
  title: string;
  subtitle: string;
  owned: number;
  locked: number;
  children: ReactNode;
}) {
  return (
    <section className="relative overflow-hidden bg-[#04070d] text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_10%_0%,rgba(250,204,21,0.16),transparent_30%),radial-gradient(circle_at_88%_8%,rgba(168,85,247,0.18),transparent_30%)]" />
      <div className="relative mx-auto max-w-[1500px] px-4 py-6 sm:px-6 lg:px-8">
        <div className="grid gap-5 rounded-[16px] border border-white/10 bg-black/35 p-4 shadow-[inset_18px_0_28px_rgba(0,0,0,0.55)] md:grid-cols-[250px_1fr]">
          <aside className="relative overflow-hidden rounded-[12px] border border-white/10 bg-[#070a12] p-4">
            <div className="absolute inset-y-0 right-0 w-px bg-yellow-200/40 shadow-[0_0_24px_rgba(250,204,21,0.8)]" />
            <p className="text-xs font-black uppercase tracking-[0.22em] text-yellow-200">
              My Collection
            </p>
            <h1 className="mt-3 text-3xl font-black uppercase leading-none text-white">
              {title}
            </h1>
            <p className="mt-4 text-sm leading-6 text-zinc-400">{subtitle}</p>
            <div className="mt-6 space-y-3">
              <BinderStat label="Owned" value={`${owned} / 120`} tone="yellow" />
              <BinderStat label="Locked preview" value={String(locked)} tone="sky" />
              <BinderStat label="Mode" value="Binder" tone="emerald" />
            </div>
          </aside>
          <div className="min-w-0">{children}</div>
        </div>
      </div>
    </section>
  );
}

function BinderStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "yellow" | "sky" | "emerald";
}) {
  const color =
    tone === "yellow"
      ? "text-yellow-200"
      : tone === "sky"
        ? "text-sky-200"
        : "text-emerald-200";

  return (
    <div className="rounded-[9px] border border-white/10 bg-white/[0.04] p-3">
      <p className={`text-2xl font-black ${color}`}>{value}</p>
      <p className="mt-1 text-[10px] font-black uppercase tracking-[0.16em] text-zinc-500">
        {label}
      </p>
    </div>
  );
}
