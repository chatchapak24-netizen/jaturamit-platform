"use client";

import type { CSSProperties } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import PlayerCard from "@/components/arena/PlayerCard";
import { supabaseBrowser } from "@/lib/supabase-browser";
import {
  ARENA_RARITIES,
  ARENA_SCHOOLS,
  type ArenaSchoolKey,
  getArenaRarityTheme,
  getArenaSchoolTheme,
} from "@/src/lib/arena-theme";

type ArenaCollectionCard = {
  user_card_id: string;
  printed_card_id: string;
  card_name: string | null;
  edition_name: string | null;
  rarity: string | null;
  serial_label: string | null;
  player_label: string | null;
  school_label: string | null;
  season_label: string | null;
  position_label: string | null;
  ownership_status: string | null;
  acquired_at: string | null;
};

type LoadState = "loading" | "unauthenticated" | "ready" | "error";

const SCHOOL_KEYS = ["DARUNA", "PHOTHA", "SARASIT", "BENJ"] as const;
const SET_TARGET = 12;
const LOCKED_SLOTS = [
  { school: "DARUNA", position: "GK", rarity: "rare" },
  { school: "PHOTHA", position: "RB", rarity: "elite" },
  { school: "SARASIT", position: "CM", rarity: "epic" },
  { school: "BENJ", position: "ST", rarity: "legend" },
] as const;

function formatLabel(value: string | null) {
  if (!value) {
    return null;
  }

  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatDate(value: string | null) {
  if (!value) {
    return null;
  }

  return new Intl.DateTimeFormat("th-TH", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function cardSchoolKey(card: ArenaCollectionCard): ArenaSchoolKey {
  return getArenaSchoolTheme(card.school_label || "").key;
}

function cardRarity(card: ArenaCollectionCard) {
  return getArenaRarityTheme(card.rarity || "common").key;
}

function cardRating(card: ArenaCollectionCard) {
  const rarityScore = {
    common: 66,
    rare: 74,
    elite: 82,
    epic: 88,
    legend: 93,
    mythic: 96,
  }[cardRarity(card)];

  const serialBonus = card.serial_label?.match(/\d+/)?.[0]
    ? Number(card.serial_label.match(/\d+/)?.[0]) % 4
    : 0;

  return Math.min(99, rarityScore + serialBonus);
}

function cardStars(card: ArenaCollectionCard) {
  const rarityStars = {
    common: 2,
    rare: 3,
    elite: 4,
    epic: 4,
    legend: 5,
    mythic: 5,
  }[cardRarity(card)];

  return rarityStars;
}

function FilterGroup({
  title,
  values,
}: {
  title: string;
  values: string[];
}) {
  return (
    <div>
      <p className="text-[10px] font-black uppercase tracking-[0.22em] text-zinc-500">
        {title}
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        {values.map((value, index) => (
          <span
            key={value}
            className={
              index === 0
                ? "border border-yellow-200 bg-yellow-200 px-3 py-2 text-xs font-black uppercase tracking-[0.14em] text-zinc-950"
                : "border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-black uppercase tracking-[0.14em] text-zinc-300"
            }
          >
            {value}
          </span>
        ))}
      </div>
    </div>
  );
}

function SchoolSetProgress({
  cards,
}: {
  cards: ArenaCollectionCard[];
}) {
  const counts = useMemo(() => {
    return SCHOOL_KEYS.reduce<Record<ArenaSchoolKey, number>>(
      (acc, key) => {
        acc[key] = cards.filter((card) => cardSchoolKey(card) === key).length;
        return acc;
      },
      { DARUNA: 0, PHOTHA: 0, SARASIT: 0, BENJ: 0 },
    );
  }, [cards]);

  return (
    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {SCHOOL_KEYS.map((key) => {
        const school = ARENA_SCHOOLS[key];
        const owned = counts[key];
        const percent = Math.min(100, Math.round((owned / SET_TARGET) * 100));
        const style = {
          "--school-accent": school.colors.accent,
          "--school-primary": school.colors.primary,
          background: school.gradient,
        } as CSSProperties;

        return (
          <article
            key={key}
            className="relative min-h-44 overflow-hidden border border-white/15 p-5 shadow-[0_24px_70px_rgba(0,0,0,0.35)]"
            style={style}
          >
            <div className="absolute inset-0 bg-zinc-950/50" />
            <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-[var(--school-accent)] opacity-35 blur-2xl" />
            <div className="relative">
              <p className="text-xs font-black uppercase tracking-[0.22em] text-[var(--school-accent)]">
                {school.kingdom}
              </p>
              <h2 className="mt-3 text-2xl font-black uppercase text-white">
                {key} SET
              </h2>
              <div className="mt-6 flex items-end justify-between">
                <p className="text-3xl font-black text-white">
                  {owned}/{SET_TARGET}
                </p>
                <p className="text-sm font-black text-white/75">{percent}%</p>
              </div>
              <div className="mt-3 h-2 overflow-hidden bg-black/35">
                <div
                  className="h-full bg-[var(--school-accent)]"
                  style={{ width: `${percent}%` }}
                />
              </div>
            </div>
          </article>
        );
      })}
    </section>
  );
}

function CollectionBinderCard({ card }: { card: ArenaCollectionCard }) {
  const playerName =
    card.player_label || card.card_name || "Arena Player (ผู้เล่นอารีนา)";
  const school = card.school_label || cardSchoolKey(card);
  const position = card.position_label || "SUB";
  const rarity = card.rarity || "common";

  return (
    <article className="relative">
      <div className="absolute inset-x-5 -top-2 h-5 rounded-full bg-black/40 blur-xl" />
      <PlayerCard
        playerName={playerName}
        school={school}
        position={position}
        rating={cardRating(card)}
        stars={cardStars(card)}
        rarity={rarity}
        variant="full"
        className="mx-auto"
      />
      <div className="mx-auto mt-3 max-w-[286px] border border-white/10 bg-black/35 p-3">
        <div className="flex items-center justify-between gap-3">
          <p className="truncate text-xs font-black uppercase tracking-[0.18em] text-zinc-500">
            {formatLabel(card.ownership_status) || "Owned"}
          </p>
          <p className="text-xs font-black text-emerald-300">Owned</p>
        </div>
        <p className="mt-2 truncate font-mono text-[11px] text-zinc-300">
          {card.serial_label || card.printed_card_id}
        </p>
        <p className="mt-1 truncate text-[11px] text-zinc-500">
          {card.edition_name || "Arena Edition"} /{" "}
          {formatDate(card.acquired_at) || "Recently acquired"}
        </p>
      </div>
    </article>
  );
}

function LockedCard({
  school,
  position,
  rarity,
}: {
  school: ArenaSchoolKey;
  position: string;
  rarity: keyof typeof ARENA_RARITIES;
}) {
  const schoolTheme = ARENA_SCHOOLS[school];
  const rarityTheme = ARENA_RARITIES[rarity];
  const style = {
    "--locked-accent": schoolTheme.colors.accent,
    "--locked-primary": schoolTheme.colors.primary,
    "--locked-glow": rarityTheme.glow,
    backgroundImage: `${rarityTheme.frame}, ${schoolTheme.gradient}`,
  } as CSSProperties;

  return (
    <article
      className="mx-auto w-full max-w-[286px] overflow-hidden rounded-[1.65rem] p-[3px] opacity-80"
      style={style}
    >
      <div className="relative grid min-h-[402px] place-items-center overflow-hidden rounded-[1.45rem] border border-dashed border-white/25 bg-zinc-950/90 p-5 text-center shadow-[inset_0_0_42px_rgba(255,255,255,0.06)]">
        <div className="absolute inset-0 bg-[linear-gradient(120deg,transparent_0%,rgba(255,255,255,0.12)_44%,transparent_58%)] opacity-50" />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(0deg,rgba(255,255,255,0.06)_1px,transparent_1px)] bg-[length:20px_20px] opacity-25" />
        <div className="relative">
          <div className="mx-auto grid h-24 w-24 place-items-center rounded-full border border-white/20 bg-black/35 text-4xl font-black text-[var(--locked-accent)]">
            ?
          </div>
          <p className="mt-6 text-xs font-black uppercase tracking-[0.22em] text-[var(--locked-accent)]">
            Locked Slot
          </p>
          <h3 className="mt-3 text-2xl font-black uppercase text-white">
            {school} {position}
          </h3>
          <p className="mt-2 text-sm font-bold text-zinc-400">
            {rarityTheme.label}
          </p>
          <p className="mt-6 text-xs leading-5 text-zinc-500">
            Claim more Arena cards to reveal this binder page. (รับการ์ดอารีนาเพิ่มเพื่อปลดล็อกช่องนี้)
          </p>
        </div>
      </div>
    </article>
  );
}

function BinderControls() {
  return (
    <section className="border border-white/10 bg-zinc-950/70 p-5 shadow-[0_24px_70px_rgba(0,0,0,0.3)]">
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <FilterGroup
          title="School"
          values={["All", "DARUNA", "PHOTHA", "SARASIT", "BENJ"]}
        />
        <FilterGroup
          title="Rarity"
          values={["All", "Common", "Rare", "Elite", "Epic", "Legend", "Mythic"]}
        />
        <FilterGroup
          title="Position"
          values={["All", "GK", "DF", "MF", "FW"]}
        />
        <FilterGroup
          title="Owned / Locked"
          values={["All", "Owned", "Locked"]}
        />
      </div>
    </section>
  );
}

function BinderEmptyState() {
  return (
    <section className="relative overflow-hidden border border-white/10 bg-zinc-950 p-8 text-center shadow-[0_24px_70px_rgba(0,0,0,0.45)]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(250,204,21,0.18),transparent_36%)]" />
      <div className="relative mx-auto max-w-3xl">
        <p className="text-xs font-black uppercase tracking-[0.28em] text-yellow-200">
          Empty Binder (อัลบั้มยังว่าง)
        </p>
        <h2 className="mt-4 text-3xl font-black uppercase text-white">
          Your first card page is waiting (หน้าแรกของอัลบั้มรอการ์ดใบแรก)
        </h2>
        <p className="mt-4 text-sm leading-7 text-zinc-400">
          Claimed cards will slide into this binder as owned collectibles. Until
          then, locked slots show the sets still waiting to be completed. (การ์ดที่รับแล้วจะเข้ามาอยู่ในอัลบั้มนี้ ส่วนช่องล็อกจะแสดงเซ็ตที่ยังรอสะสม)
        </p>
      </div>
      <div className="relative mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {LOCKED_SLOTS.map((slot) => (
          <LockedCard
            key={`${slot.school}-${slot.position}`}
            school={slot.school}
            position={slot.position}
            rarity={slot.rarity}
          />
        ))}
      </div>
    </section>
  );
}

export default function ArenaCollectionPanel() {
  const [state, setState] = useState<LoadState>("loading");
  const [cards, setCards] = useState<ArenaCollectionCard[]>([]);
  const [message, setMessage] = useState("");

  const loadCollection = useCallback(async () => {
    setState("loading");
    setMessage("");

    const { data: userData, error: userError } =
      await supabaseBrowser.auth.getUser();

    if (userError) {
      setState("error");
      setMessage(
        "Arena collection authentication is not available right now. (ระบบยืนยันตัวตนของคอลเลกชันอารีนาไม่พร้อมใช้งานในขณะนี้)",
      );
      return;
    }

    if (!userData.user) {
      setCards([]);
      setState("unauthenticated");
      return;
    }

    const { data, error } = await supabaseBrowser.rpc(
      "get_my_arena_collection",
    );

    if (error) {
      setCards([]);
      setState("error");
      setMessage(
        "Arena collection is not available right now. (คอลเลกชันอารีนาไม่พร้อมใช้งานในขณะนี้)",
      );
      return;
    }

    setCards((data || []) as ArenaCollectionCard[]);
    setState("ready");
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadCollection();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadCollection]);

  if (state === "loading") {
    return (
      <section className="mx-auto max-w-7xl px-5 pb-16 md:px-8 lg:px-12">
        <div className="border border-white/10 bg-zinc-950 p-8 text-zinc-300">
          <p className="text-xs font-black uppercase tracking-[0.24em] text-yellow-200">
            Loading Binder (กำลังโหลดอัลบั้ม)
          </p>
          <div className="mt-6 grid gap-5 md:grid-cols-4">
            {LOCKED_SLOTS.map((slot) => (
              <div
                key={`${slot.school}-loading`}
                className="h-64 border border-white/10 bg-white/[0.03]"
              />
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (state === "unauthenticated") {
    return (
      <section className="mx-auto max-w-7xl px-5 pb-16 md:px-8 lg:px-12">
        <div className="border border-white/10 bg-zinc-950 p-8">
          <p className="text-xs font-black uppercase tracking-[0.24em] text-red-300">
            Login Required (ต้องเข้าสู่ระบบ)
          </p>
          <h2 className="mt-4 text-3xl font-black uppercase text-white">
            Sign in to open your binder (เข้าสู่ระบบเพื่อเปิดอัลบั้ม)
          </h2>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-zinc-400">
            Arena cards are connected to your authenticated Arena profile. Sign
            in before viewing your collection album. (การ์ดอารีนาเชื่อมกับโปรไฟล์อารีนาที่เข้าสู่ระบบแล้ว กรุณาเข้าสู่ระบบก่อนดูอัลบั้มของคุณ)
          </p>
        </div>
      </section>
    );
  }

  if (state === "error") {
    return (
      <section className="mx-auto max-w-7xl px-5 pb-16 md:px-8 lg:px-12">
        <div className="border border-amber-300/30 bg-amber-300/10 p-8 text-amber-100">
          <p className="font-bold">{message}</p>
          <button
            type="button"
            onClick={() => void loadCollection()}
            className="mt-5 border border-amber-200/40 px-5 py-3 text-sm font-black uppercase tracking-[0.14em] hover:bg-amber-200/10"
          >
            Try again (ลองอีกครั้ง)
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-7xl px-5 pb-16 md:px-8 lg:px-12">
      <div className="space-y-8">
        <SchoolSetProgress cards={cards} />
        <BinderControls />

        <div>
          <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.28em] text-red-300">
                Card Binder Grid (หน้าการ์ดในอัลบั้ม)
              </p>
              <h2 className="mt-2 text-3xl font-black uppercase text-white">
                {cards.length} Owned Cards (การ์ดที่มี)
              </h2>
            </div>
            <p className="max-w-xl text-sm leading-6 text-zinc-400">
              Owned cards use your live collection data. Locked cards are visual
              album placeholders only. (การ์ดที่มีใช้ข้อมูลจริงจากคอลเลกชัน ส่วนการ์ดล็อกเป็นช่องตัวอย่างในอัลบั้มเท่านั้น)
            </p>
          </div>

          {cards.length === 0 ? (
            <BinderEmptyState />
          ) : (
            <div className="grid gap-x-5 gap-y-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {cards.map((card) => (
                <CollectionBinderCard key={card.user_card_id} card={card} />
              ))}
              {LOCKED_SLOTS.map((slot) => (
                <LockedCard
                  key={`${slot.school}-${slot.position}`}
                  school={slot.school}
                  position={slot.position}
                  rarity={slot.rarity}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
