"use client";

import type { FormEvent, ReactNode } from "react";
import { useMemo, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase-browser";
import type { PreorderCampaign, PreorderProduct } from "@/components/preorder/types";

const SIZE_OPTIONS = ["S", "M", "L", "XL", "2XL", "3XL", "4XL", "5XL"] as const;

const DELIVERY_OPTIONS = [
  { value: "pickup", label: "รับที่หน้างาน" },
  { value: "shipping", label: "จัดส่ง" },
] as const;

type SizeValue = (typeof SIZE_OPTIONS)[number];
type DeliveryValue = (typeof DELIVERY_OPTIONS)[number]["value"];

type FormState = {
  full_name: string;
  phone: string;
  product_id: string;
  size: SizeValue | "";
  shirt_name: string;
  shirt_number: string;
  quantity: number;
  delivery_method: DeliveryValue;
  address: string;
  note: string;
  payment_note: string;
};

const inputClass =
  "w-full rounded-xl border border-white/10 bg-zinc-950 px-4 py-3 text-white outline-none transition placeholder:text-zinc-600 focus:border-red-300";

function createInitialState(productId: string): FormState {
  return {
    full_name: "",
    phone: "",
    product_id: productId,
    size: "M",
    shirt_name: "",
    shirt_number: "",
    quantity: 1,
    delivery_method: "pickup",
    address: "",
    note: "",
    payment_note: "",
  };
}

export default function PreorderForm({
  campaign,
  products,
  initialProductId,
}: {
  campaign: PreorderCampaign;
  products: PreorderProduct[];
  initialProductId?: string;
}) {
  const firstProductId = products[0]?.id || "";
  const safeInitialProductId =
    products.some((product) => product.id === initialProductId)
      ? initialProductId || firstProductId
      : firstProductId;
  const [form, setForm] = useState<FormState>(
    createInitialState(safeInitialProductId),
  );
  const [submitting, setSubmitting] = useState(false);
  const [errorText, setErrorText] = useState("");
  const [successText, setSuccessText] = useState("");

  const selectedProduct = useMemo(
    () => products.find((product) => product.id === form.product_id) || null,
    [form.product_id, products],
  );
  const selectedTeam = selectedProduct?.team || null;
  const centralProductDisabled = Boolean(selectedProduct && !selectedTeam);
  const totalPreview = useMemo(
    () => (selectedProduct?.price || 0) * form.quantity,
    [form.quantity, selectedProduct?.price],
  );

  function updateSelectedProduct(productId: string) {
    const nextProduct = products.find((product) => product.id === productId);

    setForm({
      ...form,
      product_id: productId,
      size: nextProduct?.requires_size ? form.size || "M" : "",
      shirt_name: nextProduct?.allows_custom_name ? form.shirt_name : "",
      shirt_number: nextProduct?.allows_custom_number ? form.shirt_number : "",
    });
    setErrorText("");
    setSuccessText("");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorText("");
    setSuccessText("");

    if (!form.full_name.trim()) return setErrorText("กรุณากรอกชื่อ-นามสกุล");
    if (!form.phone.trim()) return setErrorText("กรุณากรอกเบอร์โทร");
    if (!selectedProduct) return setErrorText("กรุณาเลือกสินค้า");
    if (!selectedTeam) {
      return setErrorText(
        "สินค้ากลางยังไม่เปิดให้สั่งซื้อในรอบนี้ กรุณาเลือกสินค้าที่ผูกทีม",
      );
    }
    if (selectedProduct.requires_size && !form.size) {
      return setErrorText("กรุณาเลือกไซส์");
    }
    if (
      selectedProduct.allows_custom_name &&
      selectedProduct.requires_custom_name &&
      !form.shirt_name.trim()
    ) {
      return setErrorText("กรุณากรอกชื่อบนเสื้อ");
    }
    if (
      selectedProduct.allows_custom_number &&
      selectedProduct.requires_custom_number &&
      !form.shirt_number.trim()
    ) {
      return setErrorText("กรุณากรอกเบอร์เสื้อ");
    }
    if (!form.quantity || form.quantity <= 0) {
      return setErrorText("จำนวนต้องมากกว่า 0");
    }
    if (!form.delivery_method) return setErrorText("กรุณาเลือกวิธีรับสินค้า");
    if (form.delivery_method === "shipping" && !form.address.trim()) {
      return setErrorText("กรุณากรอกที่อยู่จัดส่ง");
    }

    setSubmitting(true);

    try {
      const { error } = await supabaseBrowser.rpc("create_preorder_order", {
        p_campaign_id: campaign.id,
        p_product_id: selectedProduct.id,
        p_full_name: form.full_name.trim(),
        p_phone: form.phone.trim(),
        p_size: selectedProduct.requires_size ? form.size : null,
        p_shirt_name: selectedProduct.allows_custom_name
          ? form.shirt_name.trim()
          : "",
        p_shirt_number: selectedProduct.allows_custom_number
          ? form.shirt_number.trim()
          : "",
        p_quantity: form.quantity,
        p_delivery_method: form.delivery_method,
        p_address:
          form.delivery_method === "shipping" ? form.address.trim() : null,
        p_note: form.note.trim() || null,
        p_payment_note: form.payment_note.trim() || null,
      });

      if (error) {
        setErrorText("ไม่สามารถส่งคำสั่งซื้อได้ กรุณาตรวจสอบข้อมูลและลองใหม่");
        return;
      }

      setSuccessText(
        "ระบบได้รับข้อมูลการสั่งซื้อเรียบร้อยแล้ว กรุณาส่งสลิปทาง LINE OA ลิงชิงบอล สปอร์ต พร้อมแจ้งชื่อและเบอร์โทร แอดมินจะตรวจสอบยอดและยืนยันออเดอร์อีกครั้ง",
      );
      setForm(createInitialState(form.product_id));
    } catch {
      setErrorText("ไม่สามารถส่งคำสั่งซื้อได้ กรุณาลองใหม่อีกครั้ง");
    } finally {
      setSubmitting(false);
    }
  }

  if (products.length === 0) {
    return (
      <div className="rounded-2xl border border-white/10 bg-zinc-900 p-5 text-zinc-300 md:p-7">
        ยังไม่มีสินค้าที่เปิดรับพรีออเดอร์
      </div>
    );
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
          ราคา {selectedProduct?.price || 0} บาท/ชิ้น รวม {totalPreview} บาท
        </div>
      </div>

      {centralProductDisabled ? (
        <p className="mt-5 rounded-xl border border-amber-400/40 bg-amber-950/40 p-4 text-sm text-amber-100">
          สินค้ากลางแสดงได้แล้ว แต่ยังไม่เปิดให้ submit ใน PR นี้เพื่อรักษา compatibility กับ field team เดิม
        </p>
      ) : null}

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <Field label="สินค้า" required>
          <select
            className={inputClass}
            value={form.product_id}
            onChange={(event) => updateSelectedProduct(event.target.value)}
            required
          >
            {products.map((product) => (
              <option key={product.id} value={product.id}>
                {product.name} - {product.price} บาท
              </option>
            ))}
          </select>
        </Field>

        <Field label="ทีม">
          <input
            className={inputClass}
            value={selectedTeam?.short_name || selectedTeam?.name || "สินค้ากลาง"}
            readOnly
          />
        </Field>

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

        {selectedProduct?.requires_size ? (
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
        ) : null}

        {selectedProduct?.allows_custom_name ? (
          <Field
            label="ชื่อบนเสื้อ"
            required={selectedProduct.requires_custom_name}
          >
            <input
              className={inputClass}
              value={form.shirt_name}
              onChange={(event) =>
                setForm({ ...form, shirt_name: event.target.value })
              }
              required={selectedProduct.requires_custom_name}
            />
          </Field>
        ) : null}

        {selectedProduct?.allows_custom_number ? (
          <Field
            label="เบอร์เสื้อ"
            required={selectedProduct.requires_custom_number}
          >
            <input
              className={inputClass}
              inputMode="numeric"
              value={form.shirt_number}
              onChange={(event) =>
                setForm({ ...form, shirt_number: event.target.value })
              }
              required={selectedProduct.requires_custom_number}
            />
          </Field>
        ) : null}

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
        <Field
          label="ที่อยู่จัดส่ง (กรอกเมื่อเลือกจัดส่ง)"
          required={form.delivery_method === "shipping"}
        >
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
        disabled={submitting || centralProductDisabled}
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
