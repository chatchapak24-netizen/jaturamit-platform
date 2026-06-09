"use client";

import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase-browser";

type ArenaAuthRequiredProps = {
  children: ReactNode;
  nextPath: string;
};

export default function ArenaAuthRequired({
  children,
  nextPath,
}: ArenaAuthRequiredProps) {
  const router = useRouter();
  const [state, setState] = useState<"checking" | "ready">("checking");

  useEffect(() => {
    let mounted = true;

    async function checkAuth() {
      const { data, error } = await supabaseBrowser.auth.getUser();

      if (!mounted) {
        return;
      }

      if (error || !data.user) {
        router.replace(`/arena/login?next=${encodeURIComponent(nextPath)}`);
        return;
      }

      setState("ready");
    }

    void checkAuth();

    return () => {
      mounted = false;
    };
  }, [nextPath, router]);

  if (state === "checking") {
    return (
      <main className="min-h-screen bg-[#05070d] px-5 py-10 text-zinc-300">
        <section className="mx-auto max-w-5xl border border-white/10 bg-zinc-950 p-6">
          Checking Arena login... (กำลังตรวจสอบการเข้าสู่ระบบ)
        </section>
      </main>
    );
  }

  return children;
}
