"use client";

import type { ReactNode } from "react";
import { useCallback } from "react";
import { supabaseBrowser } from "@/lib/supabase-browser";

export const inputClass =
  "mt-2 w-full rounded-xl border border-white/10 bg-zinc-950 px-4 py-3 text-white outline-none transition placeholder:text-zinc-600 focus:border-red-300";

export const textareaClass = `${inputClass} min-h-28`;

export function useRequireActiveAdmin(router: { push: (href: string) => void }) {
  return useCallback(async () => {
    const { data: userData } = await supabaseBrowser.auth.getUser();

    if (!userData.user) {
      router.push("/admin/login");
      return false;
    }

    const { data: adminProfile } = await supabaseBrowser
      .from("admin_users")
      .select("id")
      .eq("auth_user_id", userData.user.id)
      .eq("status", "active")
      .single();

    if (!adminProfile) {
      await supabaseBrowser.auth.signOut();
      router.push("/admin/login");
      return false;
    }

    return true;
  }, [router]);
}

export function friendlySupabaseError(message: string) {
  const lowerMessage = message.toLowerCase();

  if (lowerMessage.includes("duplicate") || lowerMessage.includes("unique")) {
    return "slug หรือข้อมูลซ้ำกับรายการเดิม กรุณาเปลี่ยนรหัสอ้างอิง";
  }

  if (lowerMessage.includes("row-level security")) {
    return "ไม่มีสิทธิ์บันทึกข้อมูล กรุณาเข้าสู่ระบบหลังบ้านอีกครั้ง";
  }

  if (lowerMessage.includes("violates check constraint")) {
    return "ข้อมูลบางช่องขัดกับเงื่อนไขของระบบ กรุณาตรวจสอบอีกครั้ง";
  }

  return message || "ไม่สามารถทำรายการได้ กรุณาลองใหม่";
}

export function emptyToNull(value: string) {
  const trimmedValue = value.trim();

  return trimmedValue ? trimmedValue : null;
}

export function numberValue(value: string, fallback = 0) {
  const parsedValue = Number(value);

  return Number.isFinite(parsedValue) ? parsedValue : fallback;
}

export function toDateTimeLocal(value: string | null) {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const timezoneOffset = date.getTimezoneOffset() * 60000;

  return new Date(date.getTime() - timezoneOffset).toISOString().slice(0, 16);
}

export function fromDateTimeLocal(value: string) {
  return value ? new Date(value).toISOString() : null;
}

export function PageHeader({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="mb-8">
      <p className="text-sm font-semibold uppercase tracking-[0.3em] text-red-300">
        {eyebrow}
      </p>
      <h1 className="mt-2 text-3xl font-black sm:text-4xl">{title}</h1>
      <p className="mt-3 max-w-3xl text-sm leading-6 text-zinc-400 sm:text-base">
        {description}
      </p>
    </div>
  );
}

export function FormMessage({
  message,
  tone,
}: {
  message: string;
  tone: "success" | "error" | "warning";
}) {
  if (!message) return null;

  const toneClass =
    tone === "success"
      ? "border-emerald-500/40 bg-emerald-950/40 text-emerald-100"
      : tone === "warning"
        ? "border-amber-500/40 bg-amber-950/40 text-amber-100"
        : "border-red-500/40 bg-red-950/40 text-red-100";

  return (
    <div className={`mb-5 rounded-2xl border p-4 text-sm ${toneClass}`}>
      {message}
    </div>
  );
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-sm font-bold text-zinc-200">{label}</span>
      {children}
      {hint ? <span className="mt-2 block text-xs text-zinc-500">{hint}</span> : null}
    </label>
  );
}

export function ToggleRow({
  title,
  description,
  checked,
  disabled,
  onChange,
}: {
  title: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label
      className={`flex items-start gap-3 rounded-2xl border border-white/10 bg-zinc-950 p-4 ${
        disabled ? "opacity-50" : ""
      }`}
    >
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-1 h-5 w-5 accent-red-600"
      />
      <span>
        <span className="block font-bold text-white">{title}</span>
        <span className="mt-1 block text-sm text-zinc-400">{description}</span>
      </span>
    </label>
  );
}

export function PreviewImage({
  imageUrl,
  label,
  className = "aspect-[4/3]",
}: {
  imageUrl: string | null;
  label: string;
  className?: string;
}) {
  return (
    <div
      aria-label={label}
      className={`${className} rounded-2xl border border-white/10 bg-zinc-950 bg-contain bg-center bg-no-repeat`}
      style={imageUrl ? { backgroundImage: `url("${imageUrl}")` } : undefined}
    />
  );
}
