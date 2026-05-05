"use client";

import { useState } from "react";
import PreorderForm from "@/components/preorder/PreorderForm";

const products = [
  { key: "photha", name: "เสื้อจตุรมิตร - โพธา", accent: "from-rose-600 to-rose-800" },
  { key: "benjamarachutit", name: "เสื้อจตุรมิตร - เบญจมราชูทิศ", accent: "from-sky-600 to-indigo-800" },
  { key: "daruna", name: "เสื้อจตุรมิตร - ดรุณาราชบุรี", accent: "from-emerald-600 to-green-800" },
  { key: "sarasit", name: "เสื้อจตุรมิตร - สารสิทธิ์พิทยาลัย", accent: "from-amber-500 to-orange-700" },
] as const;

const sizeChart = [["S", "36", "26"], ["M", "38", "27"], ["L", "40", "28"], ["XL", "42", "29"], ["2XL", "44", "30"], ["3XL", "46", "31"], ["4XL", "48", "32"], ["5XL", "50", "33"]] as const;

export default function PreorderPage() {
  const [selectedTeam, setSelectedTeam] = useState("");

  const selectTeam = (team: string) => {
    setSelectedTeam(team);
    document.getElementById("preorder-form")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <section className="mx-auto max-w-6xl px-4 py-14 md:py-20">
        <div className="rounded-3xl border border-white/15 bg-gradient-to-br from-slate-900 to-slate-800 p-8 md:p-12">
          <p className="text-sm uppercase tracking-[0.2em] text-amber-300">Preorder รอบที่ 2</p>
          <h1 className="mt-3 text-3xl font-extrabold md:text-5xl">พรีออเดอร์เสื้อจตุรมิตรราชบุรี ครั้งที่ 2</h1>
          <p className="mt-4 max-w-3xl text-slate-300">ผลิตโดย ลิงชิงบอล สปอร์ต • ใส่ชื่อและเบอร์หลังเสื้อฟรี • เลือกทีมได้ 4 โรงเรียน</p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-10">
        <h2 className="mb-4 text-2xl font-bold">ทีมที่เปิดสั่งซื้อ</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {products.map((product) => (
            <article key={product.key} className="rounded-2xl border border-white/15 bg-slate-900/70 p-4">
              <div className={`mb-4 h-28 rounded-xl bg-gradient-to-br ${product.accent}`} />
              <h3 className="text-lg font-semibold">{product.name}</h3>
              <p className="mt-1 text-sm text-slate-300">ราคา 390 บาท • ใส่ชื่อและเบอร์ฟรี</p>
              <button type="button" onClick={() => selectTeam(product.key)} className="mt-3 w-full rounded-lg bg-amber-400 px-3 py-2 text-sm font-semibold text-black">เลือกทีมนี้</button>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-6 px-4 pb-10 lg:grid-cols-2">
        <article className="rounded-2xl border border-white/15 bg-white/5 p-6">
          <h2 className="mb-4 text-2xl font-bold">รายละเอียดสินค้า</h2>
          <ul className="list-disc space-y-2 pl-6 text-slate-200">
            <li>เสื้อผลิตตามออเดอร์ ไม่มีสต็อกพร้อมส่ง</li>
            <li>ใส่ชื่อและเบอร์ฟรี</li>
            <li>เหมาะสำหรับใส่เชียร์ ใส่ซ้อม หรือสะสม</li>
            <li>ผลิตโดย ลิงชิงบอล สปอร์ต</li>
          </ul>
        </article>

        <article className="rounded-2xl border border-white/15 bg-white/5 p-6">
          <h2 className="mb-4 text-2xl font-bold">ตารางไซส์</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead><tr className="border-b border-white/15 text-slate-300"><th className="py-2">ไซส์</th><th className="py-2">รอบอก (นิ้ว)</th><th className="py-2">ความยาว (นิ้ว)</th></tr></thead>
              <tbody>{sizeChart.map(([size, chest, length]) => <tr key={size} className="border-b border-white/10"><td className="py-2 font-medium">{size}</td><td className="py-2">{chest}</td><td className="py-2">{length}</td></tr>)}</tbody>
            </table>
          </div>
        </article>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-10">
        <PreorderForm key={selectedTeam || "default"} selectedTeam={selectedTeam} />
      </section>
    </main>
  );
}
