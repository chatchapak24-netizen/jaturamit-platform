"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase-browser";

export default function AdminResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorText, setErrorText] = useState("");
  const [noticeText, setNoticeText] = useState("");

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();
    setErrorText("");
    setNoticeText("");

    if (password.length < 8) {
      setErrorText("Password must be at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setErrorText("Passwords do not match.");
      return;
    }

    setLoading(true);

    const { error } = await supabaseBrowser.auth.updateUser({ password });

    if (error) {
      setErrorText(error.message);
      setLoading(false);
      return;
    }

    setNoticeText("Password updated. Redirecting to admin login...");
    setLoading(false);

    window.setTimeout(() => {
      router.push("/admin/login");
      router.refresh();
    }, 1200);
  }

  return (
    <main className="mx-auto flex min-h-[80vh] max-w-md items-center px-6">
      <form
        onSubmit={handleResetPassword}
        className="w-full rounded-3xl border border-white/10 bg-zinc-900 p-8"
      >
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-red-300">
          Admin Password Reset
        </p>

        <h1 className="mt-3 text-3xl font-black">Set new password</h1>

        <div className="mt-8 space-y-4">
          <div>
            <label className="mb-2 block text-sm text-zinc-400">
              New password
            </label>
            <input
              type="password"
              className="w-full rounded-2xl border border-white/10 bg-zinc-950 px-4 py-3 text-white outline-none focus:border-red-400"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={8}
              required
            />
          </div>

          <div>
            <label className="mb-2 block text-sm text-zinc-400">
              Confirm password
            </label>
            <input
              type="password"
              className="w-full rounded-2xl border border-white/10 bg-zinc-950 px-4 py-3 text-white outline-none focus:border-red-400"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              minLength={8}
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
          {loading ? "Updating password..." : "Update password"}
        </button>

        <Link
          href="/admin/login"
          className="mt-4 block rounded-2xl border border-white/10 px-5 py-3 text-center text-sm font-bold text-zinc-300 hover:bg-white/10"
        >
          Back to login
        </Link>
      </form>
    </main>
  );
}
