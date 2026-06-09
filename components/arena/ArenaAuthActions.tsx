"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase-browser";

type ArenaAuthActionsProps = {
  className?: string;
  nextPath?: string;
  variant?: "hero" | "nav" | "mobile" | "main-nav";
};

type AuthState = "checking" | "signed-out" | "signed-in";

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function safeNextPath(nextPath: string) {
  if (!nextPath.startsWith("/arena") || nextPath.startsWith("//")) {
    return "/arena/fantasy/my-team";
  }

  return nextPath;
}

export default function ArenaAuthActions({
  className,
  nextPath = "/arena/fantasy/my-team",
  variant = "hero",
}: ArenaAuthActionsProps) {
  const [authState, setAuthState] = useState<AuthState>("checking");
  const safeNext = safeNextPath(nextPath);
  const nextQuery = encodeURIComponent(safeNext);
  const isSignedIn = authState === "signed-in";
  const isCompact = variant === "nav";
  const isMobile = variant === "mobile";
  const isMainNav = variant === "main-nav";
  const signedInNavOnly = isCompact || isMobile || isMainNav;

  useEffect(() => {
    let mounted = true;

    async function checkSession() {
      const { data } = await supabaseBrowser.auth.getUser();

      if (mounted) {
        setAuthState(data.user ? "signed-in" : "signed-out");
      }
    }

    void checkSession();

    const {
      data: { subscription },
    } = supabaseBrowser.auth.onAuthStateChange((_event, session) => {
      if (mounted) {
        setAuthState(session?.user ? "signed-in" : "signed-out");
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const wrapperClass = cx(
    "flex gap-2",
    isMobile ? "w-full" : "flex-col sm:flex-row",
    isCompact ? "hidden md:flex" : "",
    isMainNav ? "shrink-0 flex-row" : "",
    authState === "checking" ? "opacity-80" : "",
    className,
  );
  const primaryClass = cx(
    "border text-center font-black transition",
    isCompact || isMainNav
      ? "border-emerald-200 bg-emerald-400 px-4 py-2 text-[11px] uppercase tracking-[0.14em] text-zinc-950 hover:bg-emerald-300"
      : "border-emerald-200 bg-emerald-500 px-6 py-4 text-sm text-white shadow-[0_0_32px_rgba(52,211,153,0.32)] hover:bg-emerald-400",
    isMobile ? "flex-1 px-3 py-3 text-xs" : "",
  );
  const secondaryClass = cx(
    "border text-center font-black transition",
    isCompact || isMainNav
      ? "border-white/15 bg-white/10 px-4 py-2 text-[11px] uppercase tracking-[0.14em] text-white hover:border-yellow-200 hover:bg-yellow-300/10"
      : "border-yellow-300/40 bg-yellow-300/10 px-6 py-4 text-sm text-yellow-100 hover:bg-yellow-300/20",
    isMobile ? "flex-1 px-3 py-3 text-xs" : "",
  );

  if (isSignedIn) {
    return (
      <div className={wrapperClass} aria-label="Arena account actions">
        <Link href="/arena/fantasy/my-team" className={primaryClass}>
          My Team (ทีมของฉัน)
        </Link>
        {signedInNavOnly ? null : (
          <Link href="/arena/fantasy/leaderboard" className={secondaryClass}>
            Leaderboard (ตารางคะแนน)
          </Link>
        )}
      </div>
    );
  }

  return (
    <div className={wrapperClass} aria-label="Arena account actions">
      <Link href={`/arena/login?next=${nextQuery}`} className={primaryClass}>
        Login (เข้าสู่ระบบ)
      </Link>
      <Link href={`/arena/signup?next=${nextQuery}`} className={secondaryClass}>
        Sign Up (สมัครสมาชิก)
      </Link>
    </div>
  );
}
