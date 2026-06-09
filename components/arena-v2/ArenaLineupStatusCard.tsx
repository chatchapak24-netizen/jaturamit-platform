"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase-browser";

type LineupState = "loading" | "not_submitted" | "submitted";

type ArenaLineupStatusCardProps = {
  variant?: "mission" | "tile";
};

async function loadLineupState(): Promise<LineupState> {
  const { data: userData } = await supabaseBrowser.auth.getUser();

  if (!userData.user) return "not_submitted";

  const { data: profile } = await supabaseBrowser
    .from("arena_profiles")
    .select("id")
    .eq("auth_user_id", userData.user.id)
    .maybeSingle();

  if (!profile) return "not_submitted";

  const { data: week } = await supabaseBrowser
    .from("arena_weeks")
    .select("id")
    .in("status", ["open", "locked", "scoring", "final"])
    .order("week_number", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!week) return "not_submitted";

  const { data: lineup } = await supabaseBrowser
    .from("arena_weekly_lineups")
    .select("status")
    .eq("week_id", week.id)
    .eq("profile_id", profile.id)
    .maybeSingle();

  return lineup?.status === "submitted" ? "submitted" : "not_submitted";
}

export default function ArenaLineupStatusCard({
  variant = "tile",
}: ArenaLineupStatusCardProps) {
  const [state, setState] = useState<LineupState>("loading");

  useEffect(() => {
    let active = true;

    loadLineupState()
      .then((nextState) => {
        if (active) setState(nextState);
      })
      .catch(() => {
        if (active) setState("not_submitted");
      });

    return () => {
      active = false;
    };
  }, []);

  const submitted = state === "submitted";
  const loading = state === "loading";
  const statusLabel = loading
    ? "กำลังตรวจสอบ"
    : submitted
      ? "ส่งทีมแล้ว"
      : "ยังไม่ได้ส่งทีม";

  if (variant === "mission") {
    return (
      <section className="rounded-[14px] border border-yellow-200/20 bg-[#090b12] p-5">
        <p className="text-xs font-black uppercase tracking-[0.22em] text-yellow-200">
          ภารกิจประจำสัปดาห์
        </p>
        <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-2xl font-black text-white">
              {submitted ? "✅ ส่งทีมเรียบร้อย" : "❌ ยังไม่ได้ส่งทีม"}
            </p>
            <p className="mt-2 text-sm text-zinc-400">
              {submitted
                ? "รอการแข่งขัน แล้วกลับมาดูคะแนน"
                : "จัดทีม 11 คน แล้วกดส่งทีมก่อนเริ่มแข่งขัน"}
            </p>
          </div>
          <Link
            href="/arena/fantasy/my-team"
            className="rounded-[10px] border border-emerald-200 bg-emerald-500 px-5 py-4 text-center text-sm font-black text-white hover:bg-emerald-400"
          >
            {submitted ? "ดูทีมของฉัน" : "จัดทีมตอนนี้"}
          </Link>
        </div>
      </section>
    );
  }

  return (
    <div className="rounded-[12px] border border-white/10 bg-black/30 p-4">
      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-500">
        สถานะทีม
      </p>
      <p
        className={[
          "mt-2 text-2xl font-black",
          submitted ? "text-emerald-200" : "text-yellow-200",
        ].join(" ")}
      >
        {statusLabel}
      </p>
    </div>
  );
}
