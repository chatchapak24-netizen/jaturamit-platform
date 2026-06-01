"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase-browser";

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

function CardDetail({
  label,
  value,
}: {
  label: string;
  value: string | null;
}) {
  if (!value) {
    return null;
  }

  return (
    <div className="flex items-center justify-between gap-4 border-t border-white/10 py-3 first:border-t-0">
      <span className="text-xs font-black uppercase tracking-[0.2em] text-zinc-500">
        {label}
      </span>
      <span className="text-right text-sm font-bold text-zinc-100">
        {value}
      </span>
    </div>
  );
}

function CollectionCard({ card }: { card: ArenaCollectionCard }) {
  const details = useMemo(
    (): Array<[string, string | null]> => [
      ["Edition (รุ่น)", card.edition_name],
      ["Serial (หมายเลข)", card.serial_label],
      ["Player (ผู้เล่น)", card.player_label],
      ["School (โรงเรียน)", card.school_label],
      ["Season (ซีซั่น)", card.season_label],
      ["Position (ตำแหน่ง)", card.position_label],
      ["Acquired (ได้รับเมื่อ)", formatDate(card.acquired_at)],
    ],
    [card],
  );

  return (
    <article className="rounded-2xl border border-white/10 bg-zinc-900 p-5">
      <div className="flex min-h-28 flex-col justify-between rounded-xl border border-red-300/20 bg-gradient-to-br from-red-950/70 via-zinc-950 to-zinc-900 p-5">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.24em] text-red-300">
            {formatLabel(card.rarity) || "Arena Card (การ์ดอารีนา)"}
          </p>
          <h2 className="mt-3 text-2xl font-black">
            {card.card_name || "Arena card (การ์ดอารีนา)"}
          </h2>
        </div>
        {card.ownership_status ? (
          <p className="mt-5 text-xs font-black uppercase tracking-[0.2em] text-zinc-400">
            {formatLabel(card.ownership_status)}
          </p>
        ) : null}
      </div>

      <div className="mt-4">
        {details.map(([label, value]) => (
          <CardDetail key={label} label={label} value={value} />
        ))}
      </div>

      <div className="mt-4 rounded-xl border border-white/10 bg-zinc-950 p-3">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-zinc-500">
          Printed Card (การ์ดที่พิมพ์)
        </p>
        <p className="mt-2 break-all font-mono text-xs text-zinc-300">
          {card.printed_card_id}
        </p>
      </div>
    </article>
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
      setMessage("Arena collection authentication is not available right now. (ระบบยืนยันตัวตนของคอลเลกชันอารีนาไม่พร้อมใช้งานในขณะนี้)");
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
      setMessage("Arena collection is not available right now. (คอลเลกชันอารีนาไม่พร้อมใช้งานในขณะนี้)");
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
      <section className="rounded-2xl border border-white/10 bg-zinc-900 p-6 text-zinc-300">
        Loading your Arena collection... (กำลังโหลดคอลเลกชันอารีนาของคุณ)
      </section>
    );
  }

  if (state === "unauthenticated") {
    return (
      <section className="rounded-2xl border border-white/10 bg-zinc-900 p-6">
        <p className="text-xs font-black uppercase tracking-[0.24em] text-red-300">
          Login Required (ต้องเข้าสู่ระบบ)
        </p>
        <h2 className="mt-3 text-2xl font-black">Sign in to view Collection (เข้าสู่ระบบเพื่อดูคอลเลกชัน)</h2>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-400">
          Arena cards are connected to your authenticated Arena profile. Sign in
          before viewing the cards currently attached to your collection. (การ์ดอารีนาเชื่อมกับโปรไฟล์อารีนาที่เข้าสู่ระบบแล้ว กรุณาเข้าสู่ระบบก่อนดูการ์ดในคอลเลกชันของคุณ)
        </p>
      </section>
    );
  }

  if (state === "error") {
    return (
      <section className="rounded-2xl border border-amber-300/30 bg-amber-300/10 p-6 text-amber-100">
        <p className="font-bold">{message}</p>
        <button
          type="button"
          onClick={() => void loadCollection()}
          className="mt-4 rounded-xl border border-amber-200/40 px-4 py-3 text-sm font-black hover:bg-amber-200/10"
        >
          Try again (ลองอีกครั้ง)
        </button>
      </section>
    );
  }

  if (cards.length === 0) {
    return (
      <section className="rounded-2xl border border-white/10 bg-zinc-900 p-6">
        <p className="text-xs font-black uppercase tracking-[0.24em] text-red-300">
          Empty Collection (คอลเลกชันว่าง)
        </p>
        <h2 className="mt-3 text-2xl font-black">No Arena cards yet (ยังไม่มีการ์ดอารีนา)</h2>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-400">
          Cards you successfully claim will appear here once they are connected
          to your Arena profile. (การ์ดที่รับสำเร็จจะแสดงที่นี่เมื่อเชื่อมกับโปรไฟล์อารีนาของคุณแล้ว)
        </p>
      </section>
    );
  }

  return (
    <section>
      <div className="mb-5 flex items-end justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.24em] text-red-300">
            Current Cards (การ์ดปัจจุบัน)
          </p>
          <h2 className="mt-2 text-2xl font-black">
            {cards.length} {cards.length === 1 ? "card (การ์ด)" : "cards (การ์ด)"}
          </h2>
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => (
          <CollectionCard key={card.user_card_id} card={card} />
        ))}
      </div>
    </section>
  );
}
