"use client";

import type { FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase-browser";

type ArenaUserAuthMode = "login" | "signup" | "forgot" | "reset";

type ArenaUserAuthPanelProps = {
  mode: ArenaUserAuthMode;
};

const DEFAULT_NEXT_PATH = "/arena/fantasy/my-team";

const copyByMode = {
  login: {
    eyebrow: "Arena Account (บัญชีอารีนา)",
    title: "Login (เข้าสู่ระบบ)",
    body: "Use your Arena player account to build and save your fantasy lineup. (ใช้บัญชีอารีนาเพื่อจัดทีมและบันทึกทีมแฟนตาซี)",
    submit: "Login (เข้าสู่ระบบ)",
    loading: "Logging in... (กำลังเข้าสู่ระบบ)",
  },
  signup: {
    eyebrow: "Join Arena (สมัครอารีนา)",
    title: "Sign Up (สมัครสมาชิก)",
    body: "Create a student player account for Jaturamit Arena Fantasy. (สร้างบัญชีผู้เล่นสำหรับจตุรมิตรอารีนาแฟนตาซี)",
    submit: "Sign Up (สมัครสมาชิก)",
    loading: "Creating account... (กำลังสมัครสมาชิก)",
  },
  forgot: {
    eyebrow: "Password Help (ช่วยเหลือรหัสผ่าน)",
    title: "Forgot Password (ลืมรหัสผ่าน)",
    body: "Enter your email and we will send a secure reset link. (กรอกอีเมลเพื่อรับลิงก์ตั้งรหัสผ่านใหม่)",
    submit: "Send Reset Link (ส่งลิงก์รีเซ็ต)",
    loading: "Sending email... (กำลังส่งอีเมล)",
  },
  reset: {
    eyebrow: "New Password (ตั้งรหัสผ่านใหม่)",
    title: "Reset Password (รีเซ็ตรหัสผ่าน)",
    body: "Set a new password for your Arena player account. (ตั้งรหัสผ่านใหม่สำหรับบัญชีอารีนา)",
    submit: "Update Password (อัปเดตรหัสผ่าน)",
    loading: "Updating password... (กำลังอัปเดตรหัสผ่าน)",
  },
} satisfies Record<
  ArenaUserAuthMode,
  {
    eyebrow: string;
    title: string;
    body: string;
    submit: string;
    loading: string;
  }
>;

function safeNextPath(rawNext: string | null) {
  if (!rawNext || !rawNext.startsWith("/arena") || rawNext.startsWith("//")) {
    return DEFAULT_NEXT_PATH;
  }

  return rawNext;
}

export default function ArenaUserAuthPanel({ mode }: ArenaUserAuthPanelProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = useMemo(
    () => safeNextPath(searchParams.get("next")),
    [searchParams],
  );
  const copy = copyByMode[mode];

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorText, setErrorText] = useState("");
  const [noticeText, setNoticeText] = useState("");

  async function upsertArenaProfile(authUserId: string) {
    const { error } = await supabaseBrowser
      .from("arena_profiles")
      .upsert({ auth_user_id: authUserId }, { onConflict: "auth_user_id" })
      .select("id")
      .single();

    return error;
  }

  async function handleLogin() {
    const { data, error } = await supabaseBrowser.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setErrorText(error.message);
      return;
    }

    if (!data.user) {
      setErrorText("Login failed. Please try again. (เข้าสู่ระบบไม่สำเร็จ กรุณาลองใหม่)");
      return;
    }

    const profileError = await upsertArenaProfile(data.user.id);

    if (profileError) {
      setErrorText(profileError.message);
      return;
    }

    router.push(nextPath);
    router.refresh();
  }

  async function handleSignup() {
    if (password.length < 8) {
      setErrorText("Password must be at least 8 characters. (รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร)");
      return;
    }

    if (password !== confirmPassword) {
      setErrorText("Passwords do not match. (รหัสผ่านไม่ตรงกัน)");
      return;
    }

    const { data, error } = await supabaseBrowser.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/arena/login`,
      },
    });

    if (error) {
      setErrorText(error.message);
      return;
    }

    if (!data.user) {
      setErrorText("Sign up failed. Please try again. (สมัครสมาชิกไม่สำเร็จ กรุณาลองใหม่)");
      return;
    }

    if (!data.session) {
      setNoticeText(
        "Account created. Check your email, then login to start building your team. (สร้างบัญชีแล้ว กรุณาตรวจอีเมล แล้วเข้าสู่ระบบเพื่อจัดทีม)",
      );
      return;
    }

    const profileError = await upsertArenaProfile(data.user.id);

    if (profileError) {
      setErrorText(profileError.message);
      return;
    }

    router.push(nextPath);
    router.refresh();
  }

  async function handleForgotPassword() {
    const { error } = await supabaseBrowser.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/arena/reset-password`,
    });

    if (error) {
      setErrorText(error.message);
      return;
    }

    setNoticeText("Password reset email sent. Check your inbox. (ส่งอีเมลรีเซ็ตรหัสผ่านแล้ว กรุณาตรวจกล่องข้อความ)");
  }

  async function handleResetPassword() {
    if (password.length < 8) {
      setErrorText("Password must be at least 8 characters. (รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร)");
      return;
    }

    if (password !== confirmPassword) {
      setErrorText("Passwords do not match. (รหัสผ่านไม่ตรงกัน)");
      return;
    }

    const { error } = await supabaseBrowser.auth.updateUser({ password });

    if (error) {
      setErrorText(error.message);
      return;
    }

    setNoticeText("Password updated. Redirecting to login. (อัปเดตรหัสผ่านแล้ว กำลังกลับไปหน้าเข้าสู่ระบบ)");
    window.setTimeout(() => {
      router.push("/arena/login");
      router.refresh();
    }, 1000);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorText("");
    setNoticeText("");
    setLoading(true);

    if (mode === "login") {
      await handleLogin();
    } else if (mode === "signup") {
      await handleSignup();
    } else if (mode === "forgot") {
      await handleForgotPassword();
    } else {
      await handleResetPassword();
    }

    setLoading(false);
  }

  const showEmail = mode !== "reset";
  const showPassword = mode !== "forgot";
  const showConfirmPassword = mode === "signup" || mode === "reset";

  return (
    <main className="min-h-screen bg-[#02050b] px-5 py-8 text-white">
      <section className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-6xl items-center gap-8 lg:grid-cols-[1fr_0.82fr]">
        <div className="max-w-2xl">
          <p className="text-xs font-black uppercase tracking-[0.28em] text-emerald-300">
            Jaturamit Arena
          </p>
          <h1 className="mt-4 text-4xl font-black uppercase leading-none sm:text-6xl">
            Build Your Team (จัดทีมของคุณ)
          </h1>
          <p className="mt-5 max-w-xl text-base leading-7 text-zinc-300">
            Login once, pick 11 players, save your lineup, and come back after the matchday for points. (เข้าสู่ระบบครั้งเดียว เลือกผู้เล่น 11 คน บันทึกทีม แล้วกลับมาลุ้นคะแนนหลังแข่ง)
          </p>
          <div className="mt-8 grid gap-3 text-sm font-bold text-zinc-300 sm:grid-cols-3">
            <span className="border border-emerald-300/20 bg-emerald-300/10 px-4 py-3 text-emerald-100">
              1. Pick players (เลือกนักเตะ)
            </span>
            <span className="border border-yellow-300/20 bg-yellow-300/10 px-4 py-3 text-yellow-100">
              2. Save lineup (ส่งทีม)
            </span>
            <span className="border border-sky-300/20 bg-sky-300/10 px-4 py-3 text-sky-100">
              3. Chase points (ลุ้นคะแนน)
            </span>
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="border border-white/10 bg-zinc-950/88 p-6 shadow-[0_24px_90px_rgba(0,0,0,0.45)] backdrop-blur sm:p-8"
        >
          <p className="text-xs font-black uppercase tracking-[0.24em] text-yellow-200">
            {copy.eyebrow}
          </p>
          <h2 className="mt-3 text-3xl font-black">{copy.title}</h2>
          <p className="mt-3 text-sm leading-6 text-zinc-400">{copy.body}</p>

          <div className="mt-7 space-y-4">
            {showEmail ? (
              <label className="block">
                <span className="text-sm font-bold text-zinc-300">
                  Email (อีเมล)
                </span>
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  autoComplete="email"
                  required
                  className="mt-2 w-full border border-white/10 bg-[#05070d] px-4 py-3 text-white outline-none transition placeholder:text-zinc-600 focus:border-emerald-300"
                  placeholder="student@example.com"
                />
              </label>
            ) : null}

            {showPassword ? (
              <label className="block">
                <span className="text-sm font-bold text-zinc-300">
                  Password (รหัสผ่าน)
                </span>
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                  minLength={8}
                  required
                  className="mt-2 w-full border border-white/10 bg-[#05070d] px-4 py-3 text-white outline-none transition placeholder:text-zinc-600 focus:border-emerald-300"
                  placeholder="At least 8 characters"
                />
              </label>
            ) : null}

            {showConfirmPassword ? (
              <label className="block">
                <span className="text-sm font-bold text-zinc-300">
                  Confirm Password (ยืนยันรหัสผ่าน)
                </span>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  autoComplete="new-password"
                  minLength={8}
                  required
                  className="mt-2 w-full border border-white/10 bg-[#05070d] px-4 py-3 text-white outline-none transition placeholder:text-zinc-600 focus:border-emerald-300"
                  placeholder="Repeat password"
                />
              </label>
            ) : null}
          </div>

          {errorText ? (
            <div className="mt-5 border border-red-400/30 bg-red-500/10 p-4 text-sm text-red-100">
              {errorText}
            </div>
          ) : null}

          {noticeText ? (
            <div className="mt-5 border border-emerald-300/30 bg-emerald-300/10 p-4 text-sm text-emerald-100">
              {noticeText}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={loading}
            className="mt-6 w-full bg-emerald-400 px-5 py-4 text-sm font-black uppercase tracking-[0.14em] text-zinc-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? copy.loading : copy.submit}
          </button>

          <div className="mt-5 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-sm font-bold text-zinc-400">
            {mode !== "login" ? (
              <Link href={`/arena/login?next=${encodeURIComponent(nextPath)}`} className="hover:text-white">
                Login (เข้าสู่ระบบ)
              </Link>
            ) : null}
            {mode !== "signup" ? (
              <Link href={`/arena/signup?next=${encodeURIComponent(nextPath)}`} className="hover:text-white">
                Sign Up (สมัครสมาชิก)
              </Link>
            ) : null}
            {mode !== "forgot" && mode !== "reset" ? (
              <Link href="/arena/forgot-password" className="hover:text-white">
                Forgot Password (ลืมรหัสผ่าน)
              </Link>
            ) : null}
          </div>
        </form>
      </section>
    </main>
  );
}
