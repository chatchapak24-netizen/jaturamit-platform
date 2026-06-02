import type { CSSProperties } from "react";
import Image from "next/image";
import {
  ARENA_RARITIES,
  ARENA_SCHOOLS,
  type ArenaRarityKey,
  type ArenaSchoolKey,
  getArenaRarityTheme,
  getArenaSchoolTheme,
} from "@/src/lib/arena-theme";

type PlayerCardVariant = "compact" | "full";

export type PlayerCardProps = {
  playerName: string;
  school: ArenaSchoolKey | string;
  position: string;
  rating: number;
  stars: number;
  rarity: ArenaRarityKey | string;
  imageUrl?: string | null;
  variant?: PlayerCardVariant;
  className?: string;
};

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function clampRating(rating: number) {
  return Math.max(0, Math.min(99, Math.round(rating)));
}

function clampStars(stars: number) {
  return Math.max(0, Math.min(5, Math.round(stars)));
}

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

export default function PlayerCard({
  playerName,
  school,
  position,
  rating,
  stars,
  rarity,
  imageUrl,
  variant = "full",
  className,
}: PlayerCardProps) {
  const schoolTheme = getArenaSchoolTheme(school);
  const rarityTheme = getArenaRarityTheme(rarity);
  const safeRating = clampRating(rating);
  const safeStars = clampStars(stars);
  const isCompact = variant === "compact";

  const cardStyle = {
    "--arena-school-primary": schoolTheme.colors.primary,
    "--arena-school-secondary": schoolTheme.colors.secondary,
    "--arena-school-accent": schoolTheme.colors.accent,
    "--arena-school-dark": schoolTheme.colors.dark,
    "--arena-card-ink": schoolTheme.colors.ink,
    "--arena-rarity-accent": rarityTheme.accent,
    "--arena-rarity-foil": rarityTheme.foil,
    "--arena-card-glow": rarityTheme.glow,
    backgroundImage: `${rarityTheme.frame}, ${schoolTheme.gradient}`,
    boxShadow: `0 22px 60px ${schoolTheme.glow}, inset 0 1px 0 rgba(255,255,255,0.45)`,
  } as CSSProperties;

  return (
    <article
      className={cx(
        "group relative isolate overflow-hidden rounded-[1.65rem] p-[3px] text-white",
        "transition duration-300 hover:-translate-y-1 hover:scale-[1.01]",
        isCompact ? "w-[168px]" : "w-full max-w-[286px]",
        className,
      )}
      style={cardStyle}
      aria-label={`${playerName} Arena player card`}
    >
      <div className="absolute inset-0 opacity-70 mix-blend-screen [background:radial-gradient(circle_at_20%_12%,rgba(255,255,255,0.95),transparent_18%),radial-gradient(circle_at_80%_8%,var(--arena-rarity-accent),transparent_24%),linear-gradient(115deg,transparent_0%,rgba(255,255,255,0.34)_42%,transparent_54%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,0.16)_1px,transparent_1px),linear-gradient(0deg,rgba(255,255,255,0.12)_1px,transparent_1px)] bg-[length:18px_18px] opacity-20" />

      <div
        className={cx(
          "relative flex flex-col overflow-hidden rounded-[1.45rem] border border-white/35",
          "bg-zinc-950/88 shadow-[inset_0_0_42px_rgba(255,255,255,0.08)]",
          isCompact ? "min-h-[246px] p-3" : "min-h-[402px] p-4",
        )}
      >
        <div className="absolute inset-x-4 top-3 h-16 rounded-full bg-[var(--arena-card-glow)] blur-2xl" />
        <div className="absolute -right-10 top-12 h-28 w-28 rounded-full border border-white/20" />
        <div className="absolute -left-10 bottom-20 h-24 w-24 rounded-full border border-white/15" />

        <header className="relative z-10 flex items-start justify-between gap-3">
          <div>
            <div
              className={cx(
                "font-black leading-none tracking-tight text-[var(--arena-school-accent)]",
                isCompact ? "text-4xl" : "text-6xl",
              )}
            >
              {safeRating}
            </div>
            <div
              className={cx(
                "mt-1 font-black uppercase tracking-[0.18em] text-white",
                isCompact ? "text-[10px]" : "text-xs",
              )}
            >
              OVR
            </div>
          </div>

          <div className="text-right">
            <div
              className={cx(
                "rounded-full border border-white/30 bg-black/35 px-2 py-1 font-black uppercase tracking-[0.16em] text-[var(--arena-card-ink)]",
                isCompact ? "text-[9px]" : "text-[10px]",
              )}
            >
              {position}
            </div>
            <div
              className={cx(
                "mt-2 font-black uppercase tracking-[0.15em] text-[var(--arena-rarity-accent)]",
                isCompact ? "text-[8px]" : "text-[10px]",
              )}
            >
              {rarityTheme.label}
            </div>
          </div>
        </header>

        <div
          className={cx(
            "relative z-10 mx-auto mt-2 grid place-items-center overflow-hidden rounded-[1.15rem]",
            "border border-white/20 bg-[radial-gradient(circle_at_50%_8%,rgba(255,255,255,0.26),transparent_34%),linear-gradient(160deg,var(--arena-school-primary),var(--arena-school-dark))]",
            isCompact ? "h-28 w-full" : "h-56 w-full",
          )}
        >
          <div className="absolute inset-x-6 bottom-0 h-16 bg-[linear-gradient(to_top,var(--arena-school-accent),transparent)] opacity-35 blur-xl" />
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt={`${playerName} player portrait`}
              fill
              sizes={isCompact ? "168px" : "286px"}
              unoptimized
              className="relative z-10 h-full w-full object-cover object-top saturate-125"
            />
          ) : (
            <div className="relative z-10 grid h-full w-full place-items-center">
              <div
                className={cx(
                  "grid place-items-center rounded-full border border-white/35 bg-black/35 font-black text-[var(--arena-card-ink)] shadow-2xl",
                  isCompact ? "h-16 w-16 text-2xl" : "h-28 w-28 text-5xl",
                )}
              >
                {getInitials(playerName)}
              </div>
            </div>
          )}
        </div>

        <div className="relative z-10 mt-auto pt-3">
          <div className="flex items-center justify-between gap-2 border-y border-white/20 py-2">
            <div className="min-w-0">
              <h3
                className={cx(
                  "truncate font-black uppercase leading-tight text-white",
                  isCompact ? "text-sm" : "text-xl",
                )}
              >
                {playerName}
              </h3>
              <p
                className={cx(
                  "mt-1 truncate font-bold text-[var(--arena-card-ink)]",
                  isCompact ? "text-[10px]" : "text-xs",
                )}
              >
                {schoolTheme.kingdomLabel}
              </p>
            </div>
            <div className="shrink-0 text-right">
              <div
                className={cx(
                  "font-black uppercase tracking-[0.2em] text-[var(--arena-school-accent)]",
                  isCompact ? "text-[9px]" : "text-[10px]",
                )}
              >
                {schoolTheme.shortLabel}
              </div>
            </div>
          </div>

          <div className="mt-2 flex items-center justify-between gap-3">
            <div
              className={cx(
                "flex text-[var(--arena-school-accent)] drop-shadow",
                isCompact ? "gap-0.5 text-xs" : "gap-1 text-base",
              )}
              aria-label={`${safeStars} star rating`}
            >
              {Array.from({ length: 5 }, (_, index) => (
                <span
                  key={index}
                  className={index < safeStars ? "opacity-100" : "opacity-25"}
                  aria-hidden="true"
                >
                  *
                </span>
              ))}
            </div>
            <div
              className={cx(
                "rounded-full bg-white px-2 py-1 font-black uppercase tracking-[0.16em] text-zinc-950",
                isCompact ? "text-[8px]" : "text-[10px]",
              )}
            >
              Arena
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}

export { ARENA_RARITIES, ARENA_SCHOOLS };
