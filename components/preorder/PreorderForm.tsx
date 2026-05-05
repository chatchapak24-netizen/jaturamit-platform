"use client";

import type { FormEvent, ReactNode } from "react";
import { useMemo, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase-browser";

const TEAM_OPTIONS = [
  { value: "photha", label: "เสื้อจตุรมิตร - โพธา" },
  { value: "benjamarachutit", label: "เสื้อจตุรมิตร - เบญจมราชูทิศ" },
  { value: "daruna", label: "เสื้อจตุรมิตร - ดรุณาราชบุรี" },
  { value: "sarasit", label: "เสื้อจตุรมิตร - สารสิทธิ์พิทยาลัย" },
] as const;

const SIZE_OPTIONS = ["S", "M", "L", "XL", "2XL", "3XL", "4XL", "5XL"] as const;

const DELIVERY_OPTIONS = [
  { value: "pickup", label: "รับที่หน้างาน" },
  { value: "shipping", label: "จัดส่ง" },
] as const;

const UNIT_PRICE = 390;

export type TeamValue = (typeof TEAM_OPTIONS)[number]["value"];
type SizeValue = (typeof SIZE_OPTIONS)[number];
type DeliveryValue = (typeof DELIVERY_OPTIONS)[number]["value"];

type FormState = {
  full_name: string;
  phone: string;
  team: TeamValue;
  size: SizeValue;
  shirt_name: string;
  shirt_number: string;
  quantity: number;
  delivery_method: DeliveryValue;
  address: string;
  note: string;
  payment_note: string;
};

const initialState: FormState = {
  full_name: "",
  phone: "",
  team: "photha",
  size: "M",
  shirt_name: "",
  shirt_number: "",
  quantity: 1,
  delivery_method: "pickup",
  address: "",
  note: "",
  payment_note: "",
};

const inputClass =
  "w-full rounded-xl border border-white/10 bg-zinc-950 px-4 py-3 text-white outline-none transition placeholder:text-zinc-600 focus:border-red-300";

export default function PreorderForm({
  customFieldsEnabled = true,
  initialTeam = initialState.team,
}: {
  customFieldsEnabled?: boolean;
  initialTeam?: TeamValue;
}) {
  const [form, setForm] = useState<FormState>({
    ...initialState,
    team: initialTeam,
  });
  const [submitting, setSubmitting] = useState(false);
  const [errorText, setErrorText] = useState("");
  const [successText, setSuccessText] = useState("");

  const totalPreview = useMemo(() => form.quantity * UNIT_PRICE, [form.quantity]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorText("");
    setSuccessText("");

    if (!form.full_name.trim()) return setErrorText("กรุณากรอกชื่อ-นามสกุล");
    if (!form.phone.trim()) return setErrorText("กรุณากรอกเบอร์โทร");
    if (!form.team) return setErrorText("กรุณาเลือกทีม");
    if (!form.size) return setErrorText("กรุณาเลือกไซส์");
    if (customFieldsEnabled && !form.shirt_name.trim()) {
      return setErrorText("กรุณากรอกชื่อบนเสื้อ");
    }
    if (customFieldsEnabled && !form.shirt_number.trim()) {
      return setErrorText("กรุณากรอกเบอร์เสื้อ");
    }
    if (!form.quantity || form.quantity <= 0) {
      return setErrorText("จำนวนต้องมากกว่า 0");
    }
    if (!form.delivery_method) return setErrorText("กรุณาเลือกวิธีรับสินค้า");
    if (form.delivery_method === "shipping" && !form.address.trim()) {
      return setErrorText("กรุณากรอกที่อยู่จัดส่ง");
    }

    const payload = {
      full_name: form.full_name.trim(),
      phone: form.phone.trim(),
      team: form.team,
      size: form.size,
      shirt_name: customFieldsEnabled ? form.shirt_name.trim() : "",
      shirt_number: customFieldsEnabled ? form.shirt_number.trim() : "",
      quantity: form.quantity,
      delivery_method: form.delivery_method,
      address: form.delivery_method === "shipping" ? form.address.trim() : null,
      note: form.note.trim() || null,
      payment_note: form.payment_note.trim() || null,
      unit_price: UNIT_PRICE,
    };

    setSubmitting(true);

    try {
      const { error } = await supabaseBrowser.from("preorders").insert(payload);

      if (error) {
        setErrorText(error.message);
        return;
      }

      setSuccessText(
        "ระบบได้รับข้อมูลการสั่งซื้อเรียบร้อยแล้ว แอดมินจะตรวจสอบและติดต่อกลับ"
      );
      setForm({ ...initialState, team: initialTeam });
    } catch {
      setErrorText("ไม่สามารถส่งคำสั่งซื้อได้ กรุณาลองใหม่อีกครั้ง");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border border-white/10 bg-zinc-900 p-5 shadow-2xl shadow-black/30 md:p-7"
    >
      <div className="flex flex-col gap-3 border-b border-white/10 pb-5 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-red-300">
            Order Form
          </p>
          <h2 className="mt-2 text-2xl font-black">ฟอร์มสั่งซื้อ</h2>
        </div>
        <div className="rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-100">
          ราคา {UNIT_PRICE} บาท/ตัว รวม {totalPreview} บาท
        </div>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <Field label="ชื่อ-นามสกุล" required>
          <input
            className={inputClass}
            value={form.full_name}
            onChange={(event) =>
              setForm({ ...form, full_name: event.target.value })
            }
            required
          />
        </Field>

        <Field label="เบอร์โทร" required>
          <input
            className={inputClass}
            inputMode="tel"
            value={form.phone}
            onChange={(event) => setForm({ ...form, phone: event.target.value })}
            required
          />
        </Field>

        <Field label="ทีม" required>
          <select
            className={inputClass}
            value={form.team}
            onChange={(event) =>
              setForm({ ...form, team: event.target.value as TeamValue })
            }
            required
          >
            {TEAM_OPTIONS.map((team) => (
              <option key={team.value} value={team.value}>
                {team.label}
              </option>
            ))}
          </select>
        </Field>

        <Field label="ไซส์" required>
          <select
            className={inputClass}
            value={form.size}
            onChange={(event) =>
              setForm({ ...form, size: event.target.value as SizeValue })
            }
            required
          >
            {SIZE_OPTIONS.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </Field>

        {customFieldsEnabled ? (
          <>
            <Field label="ชื่อบนเสื้อ" required>
              <input
                className={inputClass}
                value={form.shirt_name}
                onChange={(event) =>
                  setForm({ ...form, shirt_name: event.target.value })
                }
                required
              />
            </Field>

            <Field label="เบอร์เสื้อ" required>
              <input
                className={inputClass}
                inputMode="numeric"
                value={form.shirt_number}
                onChange={(event) =>
                  setForm({ ...form, shirt_number: event.target.value })
                }
                required
              />
            </Field>
          </>
        ) : (
          <div className="rounded-xl border border-white/10 bg-zinc-950 p-4 text-sm leading-6 text-zinc-300 md:col-span-2">
            ตอนนี้ปิดการกรอกชื่อและเบอร์หลังเสื้อจากหลังบ้าน
          </div>
        )}

        <Field label="จำนวน" required>
          <input
            type="number"
            min={1}
            className={inputClass}
            value={form.quantity}
            onChange={(event) =>
              setForm({ ...form, quantity: Number(event.target.value) || 1 })
            }
            required
          />
        </Field>

        <Field label="วิธีรับสินค้า" required>
          <select
            className={inputClass}
            value={form.delivery_method}
            onChange={(event) =>
              setForm({
                ...form,
                delivery_method: event.target.value as DeliveryValue,
              })
            }
            required
          >
            {DELIVERY_OPTIONS.map((delivery) => (
              <option key={delivery.value} value={delivery.value}>
                {delivery.label}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <div className="mt-4 grid gap-4">
        <Field label="ที่อยู่จัดส่ง (กรอกเมื่อเลือกจัดส่ง)">
          <textarea
            className={`${inputClass} min-h-24`}
            value={form.address}
            onChange={(event) =>
              setForm({ ...form, address: event.target.value })
            }
          />
        </Field>

        <Field label="หมายเหตุ">
          <textarea
            className={`${inputClass} min-h-20`}
            value={form.note}
            onChange={(event) => setForm({ ...form, note: event.target.value })}
          />
        </Field>

        <Field label="หมายเหตุการชำระเงิน">
          <textarea
            className={`${inputClass} min-h-20`}
            value={form.payment_note}
            onChange={(event) =>
              setForm({ ...form, payment_note: event.target.value })
            }
          />
        </Field>
      </div>

      {errorText && (
        <p className="mt-5 rounded-xl border border-red-500/40 bg-red-950/50 p-4 text-sm text-red-100">
          {errorText}
        </p>
      )}

      {successText && (
        <p className="mt-5 rounded-xl border border-emerald-500/40 bg-emerald-950/50 p-4 text-sm text-emerald-100">
          {successText}
        </p>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="mt-5 w-full rounded-xl bg-red-600 px-5 py-4 text-base font-black text-white transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {submitting ? "กำลังส่งคำสั่งซื้อ..." : "ยืนยันการสั่งซื้อ"}
      </button>
    </form>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <label className="block space-y-2 text-sm">
      <span className="font-semibold text-zinc-300">
        {label}
        {required ? " *" : ""}
      </span>
      {children}
    </label>
  );
}
