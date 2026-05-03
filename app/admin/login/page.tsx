"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase-browser";

export default function AdminLoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorText, setErrorText] = useState("");

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErrorText("");

    const { error } = await supabaseBrowser.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setErrorText(error.message);
      setLoading(false);
      return;
    }

    router.push("/admin");
    router.refresh();
  }

  return (
    <main className="mx-auto flex min-h-[80vh] max-w-md items-center px-6">
      <form
        onSubmit={handleLogin}
        className="w-full rounded-3xl border border-white/10 bg-zinc-900 p-8"
      >
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-red-300">
          Admin Login
        </p>

        <h1 className="mt-3 text-3xl font-black">เข้าสู่ระบบหลังบ้าน</h1>

        <div className="mt-8 space-y-4">
          <div>
            <label className="mb-2 block text-sm text-zinc-400">Email</label>
            <input
              type="email"
              className="w-full rounded-2xl border border-white/10 bg-zinc-950 px-4 py-3 text-white outline-none focus:border-red-400"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@email.com"
              required
            />
          </div>

          <div>
            <label className="mb-2 block text-sm text-zinc-400">Password</label>
            <input
              type="password"
              className="w-full rounded-2xl border border-white/10 bg-zinc-950 px-4 py-3 text-white outline-none focus:border-red-400"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>
        </div>

        {errorText && (
          <div className="mt-5 rounded-2xl border border-red-500/40 bg-red-950/40 p-4 text-sm text-red-200">
            {errorText}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="mt-6 w-full rounded-2xl bg-red-600 px-5 py-3 font-bold text-white hover:bg-red-500 disabled:opacity-50"
        >
          {loading ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
        </button>
      </form>
    </main>
  );
}