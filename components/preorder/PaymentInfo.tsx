"use client";

import { useState } from "react";

export default function PaymentInfo({
  bankName,
  accountName,
  accountNumber,
  paymentNote,
}: {
  bankName: string;
  accountName: string;
  accountNumber: string;
  paymentNote: string;
}) {
  const [copied, setCopied] = useState(false);

  async function copyAccountNumber() {
    try {
      await navigator.clipboard.writeText(accountNumber);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  return (
    <article className="rounded-2xl border border-emerald-300/20 bg-emerald-300/5 p-5 text-emerald-50 md:p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="text-xl font-black">ข้อมูลการชำระเงิน</h2>
          <p className="mt-2 text-sm leading-6 text-emerald-100/90">
            {paymentNote}
          </p>
        </div>
        <button
          type="button"
          onClick={copyAccountNumber}
          className="rounded-xl border border-emerald-300/30 px-4 py-3 text-sm font-black text-emerald-50 hover:bg-emerald-300/10"
        >
          {copied ? "คัดลอกแล้ว" : "คัดลอกเลขบัญชี"}
        </button>
      </div>

      <dl className="mt-5 grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-white/10 bg-zinc-950/60 p-4">
          <dt className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-200/70">
            ธนาคาร
          </dt>
          <dd className="mt-2 font-black text-white">{bankName}</dd>
        </div>
        <div className="rounded-xl border border-white/10 bg-zinc-950/60 p-4">
          <dt className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-200/70">
            ชื่อบัญชี
          </dt>
          <dd className="mt-2 whitespace-pre-line font-black text-white">
            {accountName}
          </dd>
        </div>
        <div className="rounded-xl border border-white/10 bg-zinc-950/60 p-4">
          <dt className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-200/70">
            เลขบัญชี
          </dt>
          <dd className="mt-2 font-black text-white">{accountNumber}</dd>
        </div>
      </dl>
    </article>
  );
}
