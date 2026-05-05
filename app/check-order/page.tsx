"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";

type SafeOrder = {
  order_code: string | null;
  team: string | null;
  size: string | null;
  shirt_name: string | null;
  shirt_number: string | null;
  quantity: number | null;
  delivery_method: string | null;
  status: string | null;
  created_at: string | null;
  updated_at: string | null;
};

const teamLabels: Record<string, string> = {
  photha: "โพธา",
  benjamarachutit: "เบญจมราชูทิศ",
  daruna: "ดรุณาราชบุรี",
  sarasit: "สารสิทธิ์พิทยาลัย",
};

const deliveryLabels: Record<string, string> = {
  pickup: "รับเอง",
  shipping: "จัดส่ง",
};

const statusLabels: Record<string, string> = {
  pending: "รอตรวจสอบ",
  paid: "ชำระแล้ว",
  confirmed: "ยืนยันแล้ว",
  production: "กำลังผลิต",
  ready: "พร้อมรับ/ส่ง",
  shipped: "จัดส่งแล้ว",
  cancelled: "ยกเลิก",
};

function formatDate(value: string | null) {
  if (!value) return "-";

  return new Intl.DateTimeFormat("th-TH", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function labelFromMap(map: Record<string, string>, value: string | null) {
  if (!value) return "-";

  return map[value] || value;
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

export default function CheckOrderPage() {
  const [orderCode, setOrderCode] = useState("");
  const [phone, setPhone] = useState("");
  const [order, setOrder] = useState<SafeOrder | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorText, setErrorText] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorText("");
    setOrder(null);

    const cleanOrderCode = orderCode.trim();
    const cleanPhone = phone.trim();

    if (!cleanOrderCode || !cleanPhone) {
      setErrorText("กรุณากรอกเลขออเดอร์และเบอร์โทร");
      return;
    }

    setLoading(true);

    const response = await fetch("/api/check-order", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        order_code: cleanOrderCode,
        phone: cleanPhone,
      }),
    });
    const result = (await response.json()) as {
      order?: SafeOrder;
      error?: string;
    };

    if (!response.ok || !result.order) {
      setErrorText(result.error || "ไม่สามารถตรวจสอบออเดอร์ได้");
      setLoading(false);
      return;
    }

    setOrder(result.order);
    setLoading(false);
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <section className="mx-auto grid max-w-6xl gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:py-14">
        <div className="flex flex-col justify-between rounded-[2rem] border border-white/10 bg-zinc-900 p-6 sm:p-8">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-red-300">
              Preorder Status
            </p>
            <h1 className="mt-4 text-4xl font-black leading-tight sm:text-5xl">
              เช็กสถานะออเดอร์เสื้อ
            </h1>
            <p className="mt-4 text-zinc-400">
              กรอกเลขออเดอร์และเบอร์โทรที่ใช้สั่งซื้อ ระบบจะแสดงเฉพาะข้อมูลออเดอร์ที่ตรงกันเท่านั้น
            </p>
          </div>

          <div className="mt-8 grid gap-3 text-sm text-zinc-300">
            <div className="rounded-2xl border border-white/10 bg-zinc-950 p-4">
              ต้องใช้ทั้งเลขออเดอร์และเบอร์โทร ไม่สามารถค้นด้วยเบอร์โทรอย่างเดียวได้
            </div>
            <div className="rounded-2xl border border-white/10 bg-zinc-950 p-4">
              หน้านี้ไม่แสดงที่อยู่เต็มหรือข้อมูลการชำระเงินแบบละเอียด
            </div>
          </div>

          <Link
            href="/preorder"
            className="mt-8 inline-flex w-fit rounded-2xl border border-white/10 px-5 py-3 text-sm font-bold text-zinc-200 hover:bg-white/10"
          >
            ไปหน้าสั่งซื้อ
          </Link>
        </div>

        <div className="rounded-[2rem] border border-white/10 bg-zinc-900 p-5 shadow-2xl sm:p-8">
          <form onSubmit={handleSubmit} className="grid gap-4">
            <label className="block">
              <span className="text-sm font-bold text-zinc-200">เลขออเดอร์</span>
              <input
                value={orderCode}
                onChange={(event) => setOrderCode(event.target.value)}
                placeholder="เช่น PRE-0001"
                className="mt-2 w-full rounded-2xl border border-white/10 bg-zinc-950 px-4 py-4 text-white outline-none focus:border-red-400"
              />
            </label>

            <label className="block">
              <span className="text-sm font-bold text-zinc-200">เบอร์โทร</span>
              <input
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                placeholder="เบอร์โทรที่ใช้สั่งซื้อ"
                className="mt-2 w-full rounded-2xl border border-white/10 bg-zinc-950 px-4 py-4 text-white outline-none focus:border-red-400"
              />
            </label>

            {errorText && (
              <div className="rounded-2xl border border-red-500/40 bg-red-950/40 p-4 text-sm text-red-100">
                {errorText}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="rounded-2xl bg-red-600 px-6 py-4 font-black text-white hover:bg-red-500 disabled:opacity-60"
            >
              {loading ? "กำลังตรวจสอบ..." : "ตรวจสอบออเดอร์"}
            </button>
          </form>

          {order && (
            <section className="mt-8 rounded-3xl border border-white/10 bg-zinc-950 p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.25em] text-zinc-500">
                    Order
                  </p>
                  <h2 className="mt-2 text-3xl font-black">
                    {order.order_code || "-"}
                  </h2>
                </div>
                <span
                  className={`inline-flex w-fit rounded-full border px-4 py-2 text-sm font-black ${statusClass(
                    order.status,
                  )}`}
                >
                  {labelFromMap(statusLabels, order.status)}
                </span>
              </div>

              <dl className="mt-6 grid gap-4 sm:grid-cols-2">
                <div>
                  <dt className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-500">
                    Team
                  </dt>
                  <dd className="mt-2 text-zinc-100">
                    {labelFromMap(teamLabels, order.team)}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-500">
                    Size
                  </dt>
                  <dd className="mt-2 text-zinc-100">{order.size || "-"}</dd>
                </div>
                <div>
                  <dt className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-500">
                    Shirt Name
                  </dt>
                  <dd className="mt-2 text-zinc-100">
                    {order.shirt_name || "-"}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-500">
                    Shirt Number
                  </dt>
                  <dd className="mt-2 text-zinc-100">
                    {order.shirt_number || "-"}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-500">
                    Quantity
                  </dt>
                  <dd className="mt-2 text-zinc-100">{order.quantity || 0}</dd>
                </div>
                <div>
                  <dt className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-500">
                    Delivery
                  </dt>
                  <dd className="mt-2 text-zinc-100">
                    {labelFromMap(deliveryLabels, order.delivery_method)}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-500">
                    Created
                  </dt>
                  <dd className="mt-2 text-zinc-100">
                    {formatDate(order.created_at)}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-500">
                    Updated
                  </dt>
                  <dd className="mt-2 text-zinc-100">
                    {formatDate(order.updated_at)}
                  </dd>
                </div>
              </dl>
            </section>
          )}
        </div>
      </section>
    </main>
  );
}
