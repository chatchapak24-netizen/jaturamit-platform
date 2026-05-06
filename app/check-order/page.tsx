"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase-browser";

const LINE_OA_URL = "https://lin.ee/YmJhMlp";
const SLIP_BUCKET = "preorder-slips";
const MAX_SLIP_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_SLIP_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
const PHONE_ERROR = "กรุณากรอกเบอร์โทรให้ถูกต้อง 10 หลัก เช่น 0812345678";

type LookupOrder = {
  order_code: string | null;
  status: string | null;
  created_at: string | null;
  updated_at: string | null;
  total_amount: number | null;
  delivery_method: string | null;
  has_shipping_address?: boolean | null;
  has_slip?: boolean | null;
  payment_status?: string | null;
  payment_method?: string | null;
  payment_paid_at?: string | null;
};

type LookupItem = {
  product_name_snapshot: string | null;
  team_name_snapshot: string | null;
  product_type_snapshot: string | null;
  size: string | null;
  custom_name: string | null;
  custom_number: string | null;
  quantity: number | null;
  line_total: number | null;
};

type LookupResult = {
  order: LookupOrder;
  items: LookupItem[];
};

const statusLabels: Record<string, string> = {
  pending: "รอตรวจสอบยอด",
  paid: "ชำระเงินแล้ว",
  confirmed: "ยืนยันออเดอร์แล้ว",
  production: "กำลังผลิต",
  ready: "พร้อมรับสินค้า",
  shipped: "จัดส่งแล้ว",
  cancelled: "ยกเลิก",
};

const deliveryLabels: Record<string, string> = {
  pickup: "รับที่หน้างาน",
  shipping: "จัดส่ง",
};

const productTypeLabels: Record<string, string> = {
  jersey: "เสื้อแข่ง",
  shorts: "กางเกง",
  socks: "ถุงเท้า",
  training_shirt: "เสื้อซ้อม",
  scarf: "ผ้าพันคอ",
  souvenir: "ของที่ระลึก",
  other: "อื่น ๆ",
};

function statusLabel(status: string | null) {
  return status ? statusLabels[status] || status : "-";
}

function deliveryLabel(method: string | null) {
  return method ? deliveryLabels[method] || method : "-";
}

function productTypeLabel(type: string | null) {
  return type ? productTypeLabels[type] || type : "-";
}

function paymentStatusLabel(status: string | null) {
  if (status === "successful") return "ชำระเงินแล้ว";
  if (status === "pending") return "รอชำระเงิน";
  if (status === "failed") return "ชำระไม่สำเร็จ";
  if (status === "expired") return "QR หมดอายุ";
  if (status === "cancelled") return "ยกเลิก";
  return "ยังไม่มีรายการชำระผ่าน PromptPay";
}

function formatDate(value: string | null) {
  if (!value) return "-";

  return new Intl.DateTimeFormat("th-TH", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatMoney(value: number | null) {
  return new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency: "THB",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function statusClass(status: string | null) {
  switch (status) {
    case "paid":
    case "confirmed":
      return "border-emerald-400/40 bg-emerald-500/10 text-emerald-200";
    case "production":
    case "ready":
      return "border-amber-400/40 bg-amber-500/10 text-amber-200";
    case "shipped":
      return "border-blue-400/40 bg-blue-500/10 text-blue-200";
    case "cancelled":
      return "border-zinc-500/40 bg-zinc-700/30 text-zinc-300";
    default:
      return "border-red-400/40 bg-red-500/10 text-red-200";
  }
}

function safeText(value: string | null) {
  return value?.trim() || "-";
}

function queryParam(name: string) {
  if (typeof window === "undefined") return "";

  return new URLSearchParams(window.location.search).get(name) || "";
}

function isValidThaiPhone(phone: string) {
  return /^0\d{9}$/.test(phone);
}

function validateSlipFile(file: File | null) {
  if (!file) return "";
  if (!ALLOWED_SLIP_TYPES.includes(file.type as (typeof ALLOWED_SLIP_TYPES)[number])) {
    return "รองรับเฉพาะไฟล์ JPG, PNG หรือ WEBP เท่านั้น";
  }
  if (file.size > MAX_SLIP_SIZE_BYTES) {
    return "ไฟล์สลิปต้องมีขนาดไม่เกิน 5MB";
  }

  return "";
}

function safeSlipFileName(fileName: string) {
  const cleaned = fileName
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^A-Za-z0-9._-]/g, "");

  return cleaned || "payment-slip";
}

export default function CheckOrderPage() {
  const [orderCode, setOrderCode] = useState(() => queryParam("order_code"));
  const [phone, setPhone] = useState(() =>
    queryParam("phone").replace(/\D/g, "").slice(0, 10),
  );
  const [result, setResult] = useState<LookupResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [notFound, setNotFound] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setNotFound(false);
    setResult(null);

    const cleanOrderCode = orderCode.trim();
    const cleanPhone = phone.trim();

    if (!cleanOrderCode || !cleanPhone) {
      setMessage("กรุณากรอกรหัสออเดอร์และเบอร์โทรให้ครบ");
      return;
    }

    if (!isValidThaiPhone(cleanPhone)) {
      setMessage(PHONE_ERROR);
      return;
    }

    setLoading(true);

    const { data, error } = await supabaseBrowser.rpc("lookup_preorder_status", {
      p_order_code: cleanOrderCode,
      p_phone: cleanPhone,
    });

    setLoading(false);

    if (error) {
      setMessage("ไม่สามารถตรวจสอบออเดอร์ได้ กรุณาลองใหม่อีกครั้ง");
      return;
    }

    if (!data) {
      setNotFound(true);
      return;
    }

    const lookupResult = data as LookupResult;

    try {
      const params = new URLSearchParams({
        order_code: cleanOrderCode,
        phone: cleanPhone,
      });
      const paymentResponse = await fetch(`/api/payments/omise/status?${params}`);
      const paymentData = (await paymentResponse.json()) as {
        payment_status?: string | null;
        payment_method?: string | null;
        paid_at?: string | null;
      };

      if (paymentResponse.ok) {
        lookupResult.order.payment_status = paymentData.payment_status || null;
        lookupResult.order.payment_method = paymentData.payment_method || null;
        lookupResult.order.payment_paid_at = paymentData.paid_at || null;
      }
    } catch {
      // Payment status is optional in this foundation PR; order lookup should still work.
    }

    setResult(lookupResult);
  }

  function markSlipAttached() {
    setResult((current) =>
      current
        ? {
            ...current,
            order: {
              ...current.order,
              has_slip: true,
            },
          }
        : current,
    );
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <section className="mx-auto grid max-w-6xl gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:py-14">
        <div className="rounded-[2rem] border border-white/10 bg-zinc-900 p-6 shadow-2xl sm:p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.35em] text-red-300">
            Order Status
          </p>
          <h1 className="mt-4 text-4xl font-black leading-tight sm:text-5xl">
            ตรวจสอบสถานะออเดอร์
          </h1>
          <p className="mt-4 text-sm leading-7 text-zinc-400 sm:text-base">
            กรอกรหัสออเดอร์และเบอร์โทรที่ใช้สั่งซื้อ ระบบจะแสดงเฉพาะออเดอร์ที่ข้อมูลทั้งสองรายการตรงกันเท่านั้น
          </p>

          <div className="mt-8 grid gap-3 text-sm text-zinc-300">
            <div className="rounded-2xl border border-white/10 bg-zinc-950 p-4">
              ไม่สามารถค้นหาด้วยเบอร์โทรอย่างเดียว หรือรหัสออเดอร์อย่างเดียวได้
            </div>
            <div className="rounded-2xl border border-white/10 bg-zinc-950 p-4">
              หน้านี้ไม่แสดงที่อยู่เต็ม รายละเอียดการชำระเงิน หรือไฟล์สลิป เพื่อปกป้องข้อมูลลูกค้า
            </div>
          </div>

          <Link
            href="/preorder"
            className="mt-8 inline-flex rounded-2xl border border-white/10 px-5 py-3 text-sm font-bold text-zinc-200 hover:bg-white/10"
          >
            กลับไปหน้าพรีออเดอร์
          </Link>
        </div>

        <div className="rounded-[2rem] border border-white/10 bg-zinc-900 p-5 shadow-2xl sm:p-8">
          <form onSubmit={handleSubmit} className="grid gap-4" noValidate>
            <label className="block">
              <span className="text-sm font-bold text-zinc-200">
                รหัสออเดอร์
              </span>
              <input
                value={orderCode}
                onChange={(event) => setOrderCode(event.target.value)}
                placeholder="เช่น JR2026-0001"
                className="mt-2 w-full rounded-2xl border border-white/10 bg-zinc-950 px-4 py-4 text-white outline-none transition placeholder:text-zinc-600 focus:border-red-400"
              />
            </label>

            <label className="block">
              <span className="text-sm font-bold text-zinc-200">เบอร์โทร</span>
              <input
                value={phone}
                onChange={(event) =>
                  setPhone(event.target.value.replace(/\D/g, "").slice(0, 10))
                }
                placeholder="0812345678"
                inputMode="tel"
                className="mt-2 w-full rounded-2xl border border-white/10 bg-zinc-950 px-4 py-4 text-white outline-none transition placeholder:text-zinc-600 focus:border-red-400"
              />
            </label>

            {message ? (
              <div className="rounded-2xl border border-red-500/40 bg-red-950/40 p-4 text-sm text-red-100">
                {message}
              </div>
            ) : null}

            {notFound ? (
              <div className="rounded-2xl border border-amber-500/40 bg-amber-950/40 p-4 text-sm text-amber-100">
                ไม่พบออเดอร์ กรุณาตรวจสอบรหัสออเดอร์และเบอร์โทรอีกครั้ง
              </div>
            ) : null}

            <button
              type="submit"
              disabled={loading}
              className="rounded-2xl bg-red-600 px-6 py-4 font-black text-white hover:bg-red-500 disabled:opacity-60"
            >
              {loading ? "กำลังตรวจสอบ..." : "ตรวจสอบออเดอร์"}
            </button>
          </form>

          {result ? (
            <LookupResultCard
              result={result}
              lookupPhone={phone.trim()}
              onSlipAttached={markSlipAttached}
            />
          ) : null}
        </div>
      </section>
    </main>
  );
}

function LookupResultCard({
  result,
  lookupPhone,
  onSlipAttached,
}: {
  result: LookupResult;
  lookupPhone: string;
  onSlipAttached: () => void;
}) {
  const order = result.order;
  const [slipFile, setSlipFile] = useState<File | null>(null);
  const [slipError, setSlipError] = useState("");
  const [slipUploading, setSlipUploading] = useState(false);
  const [slipInputKey, setSlipInputKey] = useState(0);
  const [slipMessage, setSlipMessage] = useState("");

  function updateSlipFile(file: File | null) {
    const validationError = validateSlipFile(file);

    setSlipFile(validationError ? null : file);
    setSlipError(validationError);
    setSlipMessage("");
    if (validationError) {
      setSlipInputKey((currentKey) => currentKey + 1);
    }
  }

  async function attachSlip() {
    if (!order.order_code || !isValidThaiPhone(lookupPhone)) {
      setSlipError("ไม่สามารถแนบสลิปได้ กรุณาตรวจสอบออเดอร์ใหม่อีกครั้ง");
      return;
    }
    if (!slipFile) {
      setSlipError("กรุณาเลือกไฟล์สลิป");
      return;
    }

    const validationError = validateSlipFile(slipFile);
    if (validationError) {
      setSlipError(validationError);
      return;
    }

    setSlipUploading(true);
    setSlipError("");
    setSlipMessage("");

    const slipPath = `${order.order_code}/${Date.now()}-${safeSlipFileName(
      slipFile.name,
    )}`;
    const { error: uploadError } = await supabaseBrowser.storage
      .from(SLIP_BUCKET)
      .upload(slipPath, slipFile, {
        contentType: slipFile.type,
        upsert: false,
      });

    if (uploadError) {
      setSlipUploading(false);
      setSlipError("แนบสลิปไม่สำเร็จ กรุณาส่งสลิปทาง LINE OA");
      return;
    }

    const { error: attachError } = await supabaseBrowser.rpc(
      "attach_preorder_slip",
      {
        p_order_code: order.order_code,
        p_phone: lookupPhone,
        p_slip_path: slipPath,
      },
    );

    setSlipUploading(false);

    if (attachError) {
      setSlipError("แนบสลิปไม่สำเร็จ กรุณาส่งสลิปทาง LINE OA");
      return;
    }

    setSlipFile(null);
    setSlipInputKey((currentKey) => currentKey + 1);
    setSlipMessage("ได้รับสลิปแล้ว แอดมินจะตรวจสอบยอดชำระภายหลัง");
    onSlipAttached();
  }

  return (
    <section className="mt-8 rounded-3xl border border-white/10 bg-zinc-950 p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-zinc-500">
            Order
          </p>
          <h2 className="mt-2 text-3xl font-black">
            {safeText(order.order_code)}
          </h2>
        </div>
        <span
          className={`inline-flex w-fit rounded-full border px-4 py-2 text-sm font-black ${statusClass(
            order.status,
          )}`}
        >
          {statusLabel(order.status)}
        </span>
      </div>

      <dl className="mt-6 grid gap-4 sm:grid-cols-2">
        <Detail label="วันที่สั่ง" value={formatDate(order.created_at)} />
        <Detail label="อัปเดตล่าสุด" value={formatDate(order.updated_at)} />
        <Detail label="วิธีรับสินค้า" value={deliveryLabel(order.delivery_method)} />
        <Detail label="ยอดรวม" value={formatMoney(order.total_amount)} />
        {order.delivery_method === "shipping" ? (
          <Detail
            label="ข้อมูลจัดส่ง"
            value={
              order.has_shipping_address
                ? "มีข้อมูลจัดส่งแล้ว"
                : "ยังไม่มีข้อมูลจัดส่ง"
            }
          />
        ) : null}
        <Detail
          label="สถานะสลิป"
          value={
            order.has_slip
              ? "ได้รับสลิปแล้ว"
              : "ยังไม่พบสลิป หากชำระเงินแล้วสามารถแนบสลิปในเว็บหรือส่งทาง LINE OA ได้"
          }
        />
        <Detail
          label="สถานะ PromptPay"
          value={paymentStatusLabel(order.payment_status || null)}
        />
        {order.payment_paid_at ? (
          <Detail label="เวลาชำระเงิน" value={formatDate(order.payment_paid_at)} />
        ) : null}
      </dl>

      {!order.has_slip ? (
        <div className="mt-5 rounded-2xl border border-emerald-300/20 bg-emerald-300/5 p-4">
          <p className="font-black text-white">แนบสลิปสำหรับออเดอร์นี้</p>
          <p className="mt-1 text-xs leading-5 text-zinc-400">
            ระบบจะใช้รหัสออเดอร์และเบอร์โทรที่ค้นหาอยู่ตอนนี้ ไม่ต้องกรอกข้อมูลซ้ำ
          </p>
          <input
            key={slipInputKey}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(event) => updateSlipFile(event.target.files?.[0] || null)}
            className="mt-3 w-full rounded-xl border border-dashed border-white/15 bg-zinc-950 px-4 py-3 text-sm text-zinc-300 file:mr-4 file:rounded-lg file:border-0 file:bg-red-600 file:px-4 file:py-2 file:text-sm file:font-bold file:text-white hover:file:bg-red-500"
          />
          {slipFile ? (
            <p className="mt-2 text-xs font-bold text-emerald-200">
              เลือกไฟล์แล้ว: {slipFile.name}
            </p>
          ) : null}
          {slipError ? (
            <p className="mt-2 text-xs font-bold text-red-200">{slipError}</p>
          ) : null}
          {slipMessage ? (
            <p className="mt-2 text-xs font-bold text-emerald-200">
              {slipMessage}
            </p>
          ) : null}
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={attachSlip}
              disabled={slipUploading}
              className="rounded-xl bg-emerald-500 px-4 py-3 text-sm font-black text-zinc-950 hover:bg-emerald-400 disabled:opacity-60"
            >
              {slipUploading ? "กำลังแนบสลิป..." : "แนบสลิปในเว็บ"}
            </button>
            <a
              href={LINE_OA_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-xl border border-emerald-300/30 bg-emerald-300/10 px-4 py-3 text-center text-sm font-black text-emerald-50 hover:bg-emerald-300/20"
            >
              ส่งสลิป / ติดต่อ LINE OA
            </a>
          </div>
        </div>
      ) : (
        <div className="mt-5 rounded-2xl border border-emerald-300/20 bg-emerald-300/5 p-4">
          <p className="font-black text-emerald-100">ได้รับสลิปแล้ว</p>
          <p className="mt-1 text-sm leading-6 text-zinc-300">
            หากมีปัญหาเพิ่มเติม สามารถติดต่อแอดมินทาง LINE OA ได้
          </p>
          <a
            href={LINE_OA_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex rounded-xl border border-emerald-300/30 px-4 py-3 text-sm font-black text-emerald-50 hover:bg-emerald-300/10"
          >
            ติดต่อ LINE OA
          </a>
        </div>
      )}

      <div className="mt-6 space-y-3">
        <h3 className="text-lg font-black">รายการสินค้า</h3>
        {result.items.map((item, index) => (
          <div
            key={`${item.product_name_snapshot}-${index}`}
            className="rounded-2xl border border-white/10 bg-zinc-900 p-4"
          >
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="font-black text-white">
                  {safeText(item.product_name_snapshot)}
                </p>
                <p className="text-sm text-zinc-400">
                  {safeText(item.team_name_snapshot)} /{" "}
                  {productTypeLabel(item.product_type_snapshot)}
                </p>
              </div>
              <p className="font-bold text-red-100">
                {formatMoney(item.line_total)}
              </p>
            </div>
            <div className="mt-3 grid gap-2 text-sm text-zinc-300 sm:grid-cols-4">
              <span>ไซส์: {safeText(item.size)}</span>
              <span>ชื่อ: {safeText(item.custom_name)}</span>
              <span>เบอร์: {safeText(item.custom_number)}</span>
              <span>จำนวน: {item.quantity || 0}</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-zinc-900 p-4">
      <dt className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-500">
        {label}
      </dt>
      <dd className="mt-2 text-zinc-100">{value}</dd>
    </div>
  );
}
