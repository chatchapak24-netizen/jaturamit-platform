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

type CustomerFormState = {
  full_name: string;
  phone: string;
  delivery_method: DeliveryValue;
  address: string;
  note: string;
  payment_note: string;
};

type ItemDraft = {
  product_id: string;
  size: SizeValue | "";
  custom_name: string;
  custom_number: string;
  quantity: number;
};

type CartItem = ItemDraft & {
  id: string;
  product: PreorderProduct;
};

const inputClass =
  "w-full rounded-xl border border-white/10 bg-zinc-950 px-4 py-3 text-white outline-none transition placeholder:text-zinc-600 focus:border-red-300";

function createInitialCustomerForm(): CustomerFormState {
  return {
    full_name: "",
    phone: "",
    delivery_method: "pickup",
    address: "",
    note: "",
    payment_note: "",
  };
}

function createDraft(product: PreorderProduct | null): ItemDraft {
  return {
    product_id: product?.id || "",
    size: product?.requires_size ? "M" : "",
    custom_name: "",
    custom_number: "",
    quantity: 1,
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
  const firstProduct = products[0] || null;
  const initialProduct =
    products.find((product) => product.id === initialProductId) || firstProduct;

  const [customerForm, setCustomerForm] = useState<CustomerFormState>(
    createInitialCustomerForm(),
  );
  const [draft, setDraft] = useState<ItemDraft>(createDraft(initialProduct));
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [errorText, setErrorText] = useState("");
  const [successText, setSuccessText] = useState("");

  const selectedProduct = useMemo(
    () => products.find((product) => product.id === draft.product_id) || null,
    [draft.product_id, products],
  );

  const cartTotal = useMemo(
    () =>
      cartItems.reduce(
        (sum, item) => sum + item.product.price * item.quantity,
        0,
      ),
    [cartItems],
  );

  const cartQuantity = useMemo(
    () => cartItems.reduce((sum, item) => sum + item.quantity, 0),
    [cartItems],
  );

  function updateSelectedProduct(productId: string) {
    const nextProduct = products.find((product) => product.id === productId) || null;

    setDraft(createDraft(nextProduct));
    setErrorText("");
    setSuccessText("");
  }

  function validateDraft(product: PreorderProduct | null) {
    if (!product) return "กรุณาเลือกสินค้า";
    if (!draft.quantity || draft.quantity <= 0) {
      return "จำนวนต้องมากกว่า 0";
    }
    if (product.requires_size && !draft.size) {
      return "กรุณาเลือกไซส์";
    }
    if (product.requires_custom_name && !draft.custom_name.trim()) {
      return "กรุณากรอกชื่อบนเสื้อ";
    }
    if (product.requires_custom_number && !draft.custom_number.trim()) {
      return "กรุณากรอกเบอร์เสื้อ";
    }

    return "";
  }

  function addItemToCart() {
    const validationError = validateDraft(selectedProduct);

    setErrorText("");
    setSuccessText("");

    if (validationError) {
      setErrorText(validationError);
      return;
    }

    if (!selectedProduct) return;

    setCartItems((currentItems) => [
      ...currentItems,
      {
        ...draft,
        id: `${selectedProduct.id}-${Date.now()}-${currentItems.length}`,
        size: selectedProduct.requires_size ? draft.size : "",
        custom_name: selectedProduct.allows_custom_name
          ? draft.custom_name.trim()
          : "",
        custom_number: selectedProduct.allows_custom_number
          ? draft.custom_number.trim()
          : "",
        product: selectedProduct,
      },
    ]);
    setDraft(createDraft(selectedProduct));
  }

  function removeCartItem(itemId: string) {
    setCartItems((currentItems) =>
      currentItems.filter((item) => item.id !== itemId),
    );
    setErrorText("");
    setSuccessText("");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorText("");
    setSuccessText("");

    if (cartItems.length === 0) {
      return setErrorText("กรุณาเพิ่มสินค้าอย่างน้อย 1 รายการ");
    }
    if (!customerForm.full_name.trim()) {
      return setErrorText("กรุณากรอกชื่อ-นามสกุล");
    }
    if (!customerForm.phone.trim()) {
      return setErrorText("กรุณากรอกเบอร์โทร");
    }
    if (!customerForm.delivery_method) {
      return setErrorText("กรุณาเลือกวิธีรับสินค้า");
    }
    if (
      customerForm.delivery_method === "shipping" &&
      !customerForm.address.trim()
    ) {
      return setErrorText("กรุณากรอกที่อยู่จัดส่ง");
    }

    const rpcItems = cartItems.map((item) => ({
      product_id: item.product.id,
      quantity: item.quantity,
      size: item.product.requires_size ? item.size : null,
      custom_name: item.product.allows_custom_name
        ? item.custom_name || null
        : null,
      custom_number: item.product.allows_custom_number
        ? item.custom_number || null
        : null,
    }));

    setSubmitting(true);

    try {
      const { data, error } = await supabaseBrowser.rpc("create_preorder_order", {
        p_campaign_id: campaign.id,
        p_full_name: customerForm.full_name.trim(),
        p_phone: customerForm.phone.trim(),
        p_delivery_method: customerForm.delivery_method,
        p_address:
          customerForm.delivery_method === "shipping"
            ? customerForm.address.trim()
            : null,
        p_note: customerForm.note.trim() || null,
        p_payment_note: customerForm.payment_note.trim() || null,
        p_items: rpcItems,
      });

      if (error) {
        setErrorText("ไม่สามารถส่งคำสั่งซื้อได้ กรุณาตรวจสอบข้อมูลและลองใหม่");
        return;
      }

      const orderCode =
        Array.isArray(data) && data[0]?.order_code
          ? ` เลขออเดอร์ ${data[0].order_code}`
          : "";

      setSuccessText(
        `ระบบได้รับข้อมูลการสั่งซื้อเรียบร้อยแล้ว${orderCode} กรุณาส่งสลิปทาง LINE OA ลิงชิงบอล สปอร์ต พร้อมแจ้งชื่อและเบอร์โทร แอดมินจะตรวจสอบยอดและยืนยันออเดอร์อีกครั้ง`,
      );
      setCustomerForm(createInitialCustomerForm());
      setCartItems([]);
      setDraft(createDraft(selectedProduct));
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
      noValidate
      className="grid gap-5 lg:grid-cols-[0.95fr_1.05fr]"
    >
      <section className="rounded-2xl border border-white/10 bg-zinc-900 p-5 shadow-2xl shadow-black/30 md:p-7">
        <div className="border-b border-white/10 pb-5">
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-red-300">
            Cart Builder
          </p>
          <h2 className="mt-2 text-2xl font-black">เพิ่มสินค้าในออเดอร์</h2>
          <p className="mt-2 text-sm leading-6 text-zinc-400">
            เลือกสินค้า กำหนดไซส์/ชื่อ/เบอร์ แล้วเพิ่มลงรายการได้หลายชิ้น
          </p>
        </div>

        <div className="mt-5 grid gap-4">
          <Field label="สินค้า" required>
            <select
              className={inputClass}
              value={draft.product_id}
              onChange={(event) => updateSelectedProduct(event.target.value)}
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
              value={
                selectedProduct?.team?.short_name ||
                selectedProduct?.team?.name ||
                "สินค้ากลาง"
              }
              readOnly
            />
          </Field>

          {selectedProduct?.requires_size ? (
            <Field label="ไซส์" required>
              <select
                className={inputClass}
                value={draft.size}
                onChange={(event) =>
                  setDraft({
                    ...draft,
                    size: event.target.value as SizeValue,
                  })
                }
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
                value={draft.custom_name}
                onChange={(event) =>
                  setDraft({ ...draft, custom_name: event.target.value })
                }
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
                value={draft.custom_number}
                onChange={(event) =>
                  setDraft({ ...draft, custom_number: event.target.value })
                }
              />
            </Field>
          ) : null}

          <Field label="จำนวน" required>
            <input
              type="number"
              min={1}
              className={inputClass}
              value={draft.quantity}
              onChange={(event) =>
                setDraft({
                  ...draft,
                  quantity: Number(event.target.value) || 1,
                })
              }
            />
          </Field>

          <div className="rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-100">
            ยอดรายการนี้{" "}
            {(selectedProduct?.price || 0) * draft.quantity} บาท
          </div>

          <button
            type="button"
            onClick={addItemToCart}
            className="rounded-xl bg-red-600 px-5 py-4 text-base font-black text-white transition hover:bg-red-500"
          >
            เพิ่มลงรายการ
          </button>
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-zinc-900 p-5 shadow-2xl shadow-black/30 md:p-7">
        <div className="flex flex-col gap-3 border-b border-white/10 pb-5 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-red-300">
              Order Summary
            </p>
            <h2 className="mt-2 text-2xl font-black">รายการสั่งซื้อ</h2>
          </div>
          <div className="rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-100">
            {cartQuantity} ชิ้น / {cartTotal} บาท
          </div>
        </div>

        <div className="mt-5 space-y-3">
          {cartItems.length === 0 ? (
            <div className="rounded-xl border border-dashed border-white/15 bg-zinc-950 p-5 text-sm text-zinc-400">
              ยังไม่มีสินค้าในรายการ
            </div>
          ) : (
            cartItems.map((item) => (
              <div
                key={item.id}
                className="rounded-xl border border-white/10 bg-zinc-950 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-black text-white">{item.product.name}</p>
                    <p className="mt-1 text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">
                      {item.product.team?.short_name ||
                        item.product.team?.name ||
                        "สินค้ากลาง"}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeCartItem(item.id)}
                    className="rounded-full border border-white/15 px-3 py-1 text-xs font-bold text-zinc-300 hover:border-red-300 hover:text-red-100"
                  >
                    ลบ
                  </button>
                </div>
                <div className="mt-3 grid gap-2 text-sm text-zinc-300 sm:grid-cols-2">
                  <p>จำนวน {item.quantity}</p>
                  <p>ราคา {item.product.price} บาท/ชิ้น</p>
                  {item.size ? <p>ไซส์ {item.size}</p> : null}
                  {item.custom_name ? <p>ชื่อ {item.custom_name}</p> : null}
                  {item.custom_number ? <p>เบอร์ {item.custom_number}</p> : null}
                  <p className="font-bold text-red-100">
                    รวม {item.product.price * item.quantity} บาท
                  </p>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <Field label="ชื่อ-นามสกุล" required>
            <input
              className={inputClass}
              value={customerForm.full_name}
              onChange={(event) =>
                setCustomerForm({
                  ...customerForm,
                  full_name: event.target.value,
                })
              }
            />
          </Field>

          <Field label="เบอร์โทร" required>
            <input
              className={inputClass}
              inputMode="tel"
              value={customerForm.phone}
              onChange={(event) =>
                setCustomerForm({
                  ...customerForm,
                  phone: event.target.value,
                })
              }
            />
          </Field>

          <Field label="วิธีรับสินค้า" required>
            <select
              className={inputClass}
              value={customerForm.delivery_method}
              onChange={(event) =>
                setCustomerForm({
                  ...customerForm,
                  delivery_method: event.target.value as DeliveryValue,
                })
              }
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
            required={customerForm.delivery_method === "shipping"}
          >
            <textarea
              className={`${inputClass} min-h-24`}
              value={customerForm.address}
              onChange={(event) =>
                setCustomerForm({
                  ...customerForm,
                  address: event.target.value,
                })
              }
            />
          </Field>

          <Field label="หมายเหตุ">
            <textarea
              className={`${inputClass} min-h-20`}
              value={customerForm.note}
              onChange={(event) =>
                setCustomerForm({ ...customerForm, note: event.target.value })
              }
            />
          </Field>

          <Field label="หมายเหตุการชำระเงิน">
            <textarea
              className={`${inputClass} min-h-20`}
              value={customerForm.payment_note}
              onChange={(event) =>
                setCustomerForm({
                  ...customerForm,
                  payment_note: event.target.value,
                })
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
          disabled={submitting || cartItems.length === 0}
          className="mt-5 w-full rounded-xl bg-red-600 px-5 py-4 text-base font-black text-white transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? "กำลังส่งคำสั่งซื้อ..." : "ยืนยันการสั่งซื้อ"}
        </button>

        <p className="mt-3 text-xs leading-5 text-zinc-500">
          ยอดรวมบนหน้านี้ใช้แสดงให้ตรวจสอบเท่านั้น ระบบจะคำนวณราคาจริงจากฐานข้อมูลอีกครั้งตอนบันทึกออเดอร์
        </p>
      </section>
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
