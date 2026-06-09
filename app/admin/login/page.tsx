"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase-browser";

export default function AdminLoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [errorText, setErrorText] = useState("");
  const [noticeText, setNoticeText] = useState("");

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErrorText("");
    setNoticeText("");

    const { data, error } = await supabaseBrowser.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setErrorText(error.message);
      setLoading(false);
      return;
    }

    if (!data.user) {
      setErrorText("Login failed. Please try again.");
      setLoading(false);
      return;
    }

    const { data: adminProfile, error: adminError } = await supabaseBrowser
      .from("admin_users")
      .select("id")
      .eq("auth_user_id", data.user.id)
      .eq("status", "active")
      .maybeSingle();

    if (adminError || !adminProfile) {
      await supabaseBrowser.auth.signOut();
      setErrorText(
        adminError?.message ||
          "Login succeeded, but this user is not an active admin.",
      );
      setLoading(false);
      return;
    }

    router.push("/admin");
    router.refresh();
  }

  async function handlePasswordReset() {
    setErrorText("");
    setNoticeText("");

    if (!email) {
      setErrorText("Enter your admin email first, then request a password reset.");
      return;
    }

    setResetLoading(true);

    const { error } = await supabaseBrowser.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/admin/reset-password`,
    });

    if (error) {
      setErrorText(error.message);
      setResetLoading(false);
      return;
    }

    setNoticeText("Password reset email sent. Check your inbox.");
    setResetLoading(false);
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

        {noticeText && (
          <div className="mt-5 rounded-2xl border border-emerald-500/40 bg-emerald-950/40 p-4 text-sm text-emerald-200">
            {noticeText}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="mt-6 w-full rounded-2xl bg-red-600 px-5 py-3 font-bold text-white hover:bg-red-500 disabled:opacity-50"
        >
          {loading ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
        </button>

        <button
          type="button"
          disabled={resetLoading}
          onClick={() => void handlePasswordReset()}
          className="mt-4 w-full rounded-2xl border border-white/10 px-5 py-3 text-sm font-bold text-zinc-300 hover:bg-white/10 disabled:opacity-50"
        >
          {resetLoading ? "Sending reset email..." : "Forgot password? Send reset email"}
        </button>
      </form>
    </main>
  );
}
