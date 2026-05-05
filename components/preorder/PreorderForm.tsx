"use client";

import { FormEvent, useMemo, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase-browser";

type TeamOption = {
  value: string;
  label: string;
};

const TEAM_OPTIONS: TeamOption[] = [
  { value: "photha", label: "เสื้อจตุรมิตร - โพธา" },
  { value: "benjamarachutit", label: "เสื้อจตุรมิตร - เบญจมราชูทิศ" },
  { value: "daruna", label: "เสื้อจตุรมิตร - ดรุณาราชบุรี" },
  { value: "sarasit", label: "เสื้อจตุรมิตร - สารสิทธิ์พิทยาลัย" },
];

const SIZE_OPTIONS = ["S", "M", "L", "XL", "2XL", "3XL"];
const UNIT_PRICE = 390;

export default function PreorderForm() {
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [team, setTeam] = useState("");
  const [size, setSize] = useState("");
  const [shirtName, setShirtName] = useState("");
  const [shirtNumber, setShirtNumber] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [deliveryMethod, setDeliveryMethod] = useState("pickup");
  const [address, setAddress] = useState("");
  const [note, setNote] = useState("");
  const [paymentNote, setPaymentNote] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const totalPrice = useMemo(() => quantity * UNIT_PRICE, [quantity]);

  const resetForm = () => {
    setFullName("");
    setPhone("");
    setTeam("");
    setSize("");
    setShirtName("");
    setShirtNumber("");
    setQuantity(1);
    setDeliveryMethod("pickup");
    setAddress("");
    setNote("");
    setPaymentNote("");
  };

  const validate = () => {
    if (!fullName.trim()) return "กรุณากรอกชื่อ-นามสกุล";
    if (!phone.trim()) return "กรุณากรอกเบอร์โทร";
    if (!team) return "กรุณาเลือกทีม";
    if (!size) return "กรุณาเลือกไซส์";
    if (!shirtName.trim()) return "กรุณากรอกชื่อบนเสื้อ";
    if (!shirtNumber.trim()) return "กรุณากรอกเบอร์เสื้อ";
    if (!Number.isFinite(quantity) || quantity <= 0)
      return "จำนวนสั่งซื้อต้องมากกว่า 0";
    if (!deliveryMethod) return "กรุณาเลือกวิธีรับสินค้า";
    if (deliveryMethod === "shipping" && !address.trim())
      return "กรุณากรอกที่อยู่จัดส่ง";

    return "";
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    const validationError = validate();
    if (validationError) {
      setErrorMessage(validationError);
      return;
    }

    setIsSubmitting(true);

    const { error } = await supabaseBrowser.from("preorders").insert({
      full_name: fullName.trim(),
      phone: phone.trim(),
      team,
      size,
      shirt_name: shirtName.trim(),
      shirt_number: shirtNumber.trim(),
      quantity,
      delivery_method: deliveryMethod,
      address: deliveryMethod === "shipping" ? address.trim() : null,
      note: note.trim() || null,
      payment_note: paymentNote.trim() || null,
      unit_price: UNIT_PRICE,
    });

    setIsSubmitting(false);

    if (error) {
      setErrorMessage(`บันทึกพรีออเดอร์ไม่สำเร็จ: ${error.message}`);
      return;
    }

    setSuccessMessage("ส่งพรีออเดอร์เรียบร้อยแล้ว ทีมงานจะติดต่อกลับตามข้อมูลที่ให้ไว้");
    resetForm();
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4 rounded-2xl border border-white/15 bg-white/5 p-6">
      <h3 className="text-xl font-semibold">ฟอร์มสั่งซื้อ</h3>

      {errorMessage ? <p className="rounded-lg bg-red-500/20 p-3 text-red-200">{errorMessage}</p> : null}
      {successMessage ? <p className="rounded-lg bg-emerald-500/20 p-3 text-emerald-100">{successMessage}</p> : null}

      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-1">
          <span className="text-sm">ชื่อ-นามสกุล *</span>
          <input value={fullName} onChange={(e) => setFullName(e.target.value)} className="w-full rounded-lg border border-white/20 bg-black/30 px-3 py-2" />
        </label>
        <label className="space-y-1">
          <span className="text-sm">เบอร์โทร *</span>
          <input value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full rounded-lg border border-white/20 bg-black/30 px-3 py-2" />
        </label>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-1">
          <span className="text-sm">ทีม *</span>
          <select value={team} onChange={(e) => setTeam(e.target.value)} className="w-full rounded-lg border border-white/20 bg-black/30 px-3 py-2">
            <option value="">-- เลือกทีม --</option>
            {TEAM_OPTIONS.map((item) => (
              <option key={item.value} value={item.value}>{item.label}</option>
            ))}
          </select>
        </label>

        <label className="space-y-1">
          <span className="text-sm">ไซส์ *</span>
          <select value={size} onChange={(e) => setSize(e.target.value)} className="w-full rounded-lg border border-white/20 bg-black/30 px-3 py-2">
            <option value="">-- เลือกไซส์ --</option>
            {SIZE_OPTIONS.map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <label className="space-y-1 md:col-span-2">
          <span className="text-sm">ชื่อบนเสื้อ *</span>
          <input value={shirtName} onChange={(e) => setShirtName(e.target.value)} className="w-full rounded-lg border border-white/20 bg-black/30 px-3 py-2" />
        </label>
        <label className="space-y-1">
          <span className="text-sm">เบอร์เสื้อ *</span>
          <input value={shirtNumber} onChange={(e) => setShirtNumber(e.target.value)} className="w-full rounded-lg border border-white/20 bg-black/30 px-3 py-2" />
        </label>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-1">
          <span className="text-sm">จำนวน *</span>
          <input type="number" min={1} value={quantity} onChange={(e) => setQuantity(Number(e.target.value || 0))} className="w-full rounded-lg border border-white/20 bg-black/30 px-3 py-2" />
        </label>
        <div className="rounded-lg border border-white/20 bg-black/20 px-3 py-2">
          <p className="text-sm text-slate-300">ราคาต่อชิ้น: {UNIT_PRICE} บาท</p>
          <p className="text-lg font-semibold">รวมทั้งหมด: {totalPrice.toLocaleString()} บาท</p>
        </div>
      </div>

      <label className="space-y-1 block">
        <span className="text-sm">วิธีรับสินค้า *</span>
        <select value={deliveryMethod} onChange={(e) => setDeliveryMethod(e.target.value)} className="w-full rounded-lg border border-white/20 bg-black/30 px-3 py-2">
          <option value="pickup">รับหน้างาน</option>
          <option value="shipping">จัดส่ง</option>
        </select>
      </label>

      {deliveryMethod === "shipping" ? (
        <label className="space-y-1 block">
          <span className="text-sm">ที่อยู่จัดส่ง *</span>
          <textarea value={address} onChange={(e) => setAddress(e.target.value)} rows={3} className="w-full rounded-lg border border-white/20 bg-black/30 px-3 py-2" />
        </label>
      ) : null}

      <label className="space-y-1 block">
        <span className="text-sm">หมายเหตุเพิ่มเติม</span>
        <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} className="w-full rounded-lg border border-white/20 bg-black/30 px-3 py-2" />
      </label>

      <label className="space-y-1 block">
        <span className="text-sm">หมายเหตุการชำระเงิน</span>
        <textarea value={paymentNote} onChange={(e) => setPaymentNote(e.target.value)} rows={2} className="w-full rounded-lg border border-white/20 bg-black/30 px-3 py-2" />
      </label>

      <button type="submit" disabled={isSubmitting} className="rounded-xl bg-amber-400 px-5 py-2 font-semibold text-black disabled:cursor-not-allowed disabled:opacity-60">
        {isSubmitting ? "กำลังบันทึก..." : "ส่งคำสั่งซื้อ"}
      </button>
    </form>
  );
}
