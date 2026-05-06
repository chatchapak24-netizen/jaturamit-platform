"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase-browser";

type LookupOrder = {
  order_code: string | null;
  status: string | null;
  created_at: string | null;
  updated_at: string | null;
  total_amount: number | null;
  delivery_method: string | null;
  has_shipping_address?: boolean | null;
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

export default function CheckOrderPage() {
  const [orderCode, setOrderCode] = useState(() => queryParam("order_code"));
  const [phone, setPhone] = useState(() => queryParam("phone"));
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

    setResult(data as LookupResult);
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
            กรอกรหัสออเดอร์และเบอร์โทรที่ใช้สั่งซื้อ ระบบจะแสดงเฉพาะออเดอร์
            ที่ข้อมูลทั้งสองรายการตรงกันเท่านั้น
          </p>

          <div className="mt-8 grid gap-3 text-sm text-zinc-300">
            <div className="rounded-2xl border border-white/10 bg-zinc-950 p-4">
              ไม่สามารถค้นหาด้วยเบอร์โทรอย่างเดียว หรือรหัสออเดอร์อย่างเดียวได้
            </div>
            <div className="rounded-2xl border border-white/10 bg-zinc-950 p-4">
              หน้านี้ไม่แสดงที่อยู่เต็มหรือรายละเอียดการชำระเงิน เพื่อปกป้องข้อมูลลูกค้า
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
                placeholder="เช่น PRE-0001"
                className="mt-2 w-full rounded-2xl border border-white/10 bg-zinc-950 px-4 py-4 text-white outline-none transition placeholder:text-zinc-600 focus:border-red-400"
              />
            </label>

            <label className="block">
              <span className="text-sm font-bold text-zinc-200">เบอร์โทร</span>
              <input
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                placeholder="เบอร์โทรที่ใช้สั่งซื้อ"
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

          {result ? <LookupResultCard result={result} /> : null}
        </div>
      </section>
    </main>
  );
}

function LookupResultCard({ result }: { result: LookupResult }) {
  const order = result.order;

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
      </dl>

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
