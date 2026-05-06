"use client";

import type { FormEvent, ReactNode } from "react";
import { useMemo, useState } from "react";
import Link from "next/link";
import { supabaseBrowser } from "@/lib/supabase-browser";
import type { PreorderCampaign, PreorderProduct } from "@/components/preorder/types";

const SIZE_OPTIONS = ["S", "M", "L", "XL", "2XL", "3XL", "4XL", "5XL"] as const;
const LINE_OA_URL = "https://lin.ee/0dRHmzW";
const SLIP_BUCKET = "preorder-slips";
const MAX_SLIP_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_SLIP_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

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

type CreateOrderResponse = {
  success?: boolean;
  order_id?: string;
  order_code?: string | null;
  total_amount?: number | null;
};

type SlipStatus = "uploaded" | "missing" | "failed";

type SuccessState = {
  orderCode: string | null;
  totalAmount: number | null;
  phone: string;
  slipStatus: SlipStatus;
};

const inputClass =
  "w-full rounded-xl border border-white/10 bg-zinc-950 px-4 py-3 text-white outline-none transition placeholder:text-zinc-600 focus:border-red-300";

const DEFAULT_PAYMENT = {
  bankName: "ออมสิน",
  accountName: "นางวาสนา เรื่องแตง\nบัญชีร้านลิงชิงบอล สปอร์ต",
  accountNumber: "020477888224",
};

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
  const [slipFile, setSlipFile] = useState<File | null>(null);
  const [slipError, setSlipError] = useState("");
  const [slipInputKey, setSlipInputKey] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [errorText, setErrorText] = useState("");
  const [successData, setSuccessData] = useState<SuccessState | null>(null);
  const [copyMessage, setCopyMessage] = useState("");

  const paymentInfo = {
    bankName: campaign.payment_bank_name || DEFAULT_PAYMENT.bankName,
    accountName: campaign.payment_account_name || DEFAULT_PAYMENT.accountName,
    accountNumber:
      campaign.payment_account_number || DEFAULT_PAYMENT.accountNumber,
  };

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
    setSuccessData(null);
  }

  function validateDraft(product: PreorderProduct | null) {
    if (!product) return "กรุณาเลือกสินค้า";
    if (!draft.quantity || draft.quantity <= 0) {
      return "จำนวนต้องมากกว่า 0";
    }
    if (product.requires_size && !draft.size) {
      return "กรุณาเลือกไซส์";
    }
    if (draft.custom_name && !/^[A-Z]+$/.test(draft.custom_name)) {
      return "ชื่อบนเสื้อต้องเป็นภาษาอังกฤษตัวพิมพ์ใหญ่ A-Z เท่านั้น";
    }
    if (draft.custom_number && !/^[0-9]+$/.test(draft.custom_number)) {
      return "เบอร์เสื้อต้องเป็นตัวเลขเท่านั้น";
    }
    return "";
  }

  function addItemToCart() {
    const validationError = validateDraft(selectedProduct);

    setErrorText("");
    setSuccessData(null);

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
    setSuccessData(null);
  }

  function updateSlipFile(file: File | null) {
    const validationError = validateSlipFile(file);

    setSlipFile(validationError ? null : file);
    setSlipError(validationError);
    if (validationError) {
      setSlipInputKey((currentKey) => currentKey + 1);
    }
    setErrorText("");
    setSuccessData(null);
  }

  async function uploadAndAttachSlip({
    file,
    orderCode,
    orderId,
    phone,
  }: {
    file: File;
    orderCode: string | null;
    orderId: string | null;
    phone: string;
  }) {
    if (!orderCode) {
      return false;
    }

    const folderName = orderCode || orderId || `order-${Date.now()}`;
    const slipPath = `${folderName}/${Date.now()}-${safeSlipFileName(file.name)}`;
    const { error: uploadError } = await supabaseBrowser.storage
      .from(SLIP_BUCKET)
      .upload(slipPath, file, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      return false;
    }

    const { error: attachError } = await supabaseBrowser.rpc(
      "attach_preorder_slip",
      {
        p_order_code: orderCode,
        p_phone: phone,
        p_slip_path: slipPath,
      },
    );

    return !attachError;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorText("");
    setSuccessData(null);

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

    const slipValidationError = validateSlipFile(slipFile);
    if (slipValidationError) {
      setSlipError(slipValidationError);
      return;
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

      const responseRow = Array.isArray(data)
        ? (data[0] as CreateOrderResponse | undefined)
        : undefined;
      const cleanPhone = customerForm.phone.trim();
      const orderCode = responseRow?.order_code || null;
      const orderId = responseRow?.order_id || null;
      let slipStatus: SlipStatus = slipFile ? "failed" : "missing";

      if (slipFile) {
        const slipAttached = await uploadAndAttachSlip({
          file: slipFile,
          orderCode,
          orderId,
          phone: cleanPhone,
        });

        slipStatus = slipAttached ? "uploaded" : "failed";
      }

      setSuccessData({
        orderCode,
        totalAmount: responseRow?.total_amount ?? cartTotal,
        phone: cleanPhone,
        slipStatus,
      });
      setCustomerForm(createInitialCustomerForm());
      setCartItems([]);
      setSlipFile(null);
      setSlipError("");
      setSlipInputKey((currentKey) => currentKey + 1);
      setDraft(createDraft(selectedProduct));
    } catch {
      setErrorText("ไม่สามารถส่งคำสั่งซื้อได้ กรุณาลองใหม่อีกครั้ง");
    } finally {
      setSubmitting(false);
    }
  }

  async function copyAccountNumber() {
    try {
      await navigator.clipboard.writeText(paymentInfo.accountNumber);
      setCopyMessage("คัดลอกเลขบัญชีแล้ว");
    } catch {
      setCopyMessage("คัดลอกไม่สำเร็จ กรุณาคัดลอกด้วยตนเอง");
    }
  }

  async function copyOrderCode(orderCode: string) {
    try {
      await navigator.clipboard.writeText(orderCode);
      setCopyMessage("คัดลอกรหัสออเดอร์แล้ว");
    } catch {
      setCopyMessage("คัดลอกไม่สำเร็จ กรุณาคัดลอกด้วยตนเอง");
    }
  }

  function openLineOA() {
    window.open(LINE_OA_URL, "_blank", "noopener,noreferrer");
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
            <Field label="ชื่อบนเสื้อ">
              <input
                className={inputClass}
                value={draft.custom_name}
                onChange={(event) =>
                  setDraft({
                    ...draft,
                    custom_name: event.target.value
                      .toUpperCase()
                      .replace(/[^A-Z]/g, ""),
                  })
                }
                inputMode="text"
                pattern="[A-Z]*"
              />
            </Field>
          ) : null}

          {selectedProduct?.allows_custom_number ? (
            <Field label="เบอร์เสื้อ">
              <input
                className={inputClass}
                inputMode="numeric"
                pattern="[0-9]*"
                value={draft.custom_number}
                onChange={(event) =>
                  setDraft({
                    ...draft,
                    custom_number: event.target.value.replace(/\D/g, ""),
                  })
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

        <SlipUploadPanel
          slipInputKey={slipInputKey}
          slipError={slipError}
          slipFile={slipFile}
          onSlipFileChange={updateSlipFile}
          onOpenLineOA={openLineOA}
        />

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

        {successData ? (
          <SuccessCard
            successData={successData}
            paymentInfo={paymentInfo}
            copyMessage={copyMessage}
            onCopyAccountNumber={copyAccountNumber}
            onCopyOrderCode={copyOrderCode}
            onOrderMore={() => {
              setSuccessData(null);
              setCopyMessage("");
            }}
          />
        ) : null}

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

function SlipUploadPanel({
  slipInputKey,
  slipError,
  slipFile,
  onSlipFileChange,
  onOpenLineOA,
}: {
  slipInputKey: number;
  slipError: string;
  slipFile: File | null;
  onSlipFileChange: (file: File | null) => void;
  onOpenLineOA: () => void;
}) {
  return (
    <div className="mt-5 rounded-2xl border border-emerald-300/20 bg-emerald-300/5 p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="font-black text-white">แนบสลิปการโอนเงิน</h3>
          <p className="mt-1 text-xs leading-5 text-zinc-500">
            แนบสลิปพร้อมรายการสั่งซื้อ หรือส่งสลิปทาง LINE OA ภายหลังได้
          </p>
        </div>
        <button
          type="button"
          onClick={onOpenLineOA}
          className="rounded-xl border border-emerald-300/30 px-4 py-3 text-sm font-black text-emerald-50 hover:bg-emerald-300/10"
        >
          ส่งผ่าน LINE OA
        </button>
      </div>

      <div className="mt-4 space-y-2">
        <input
          key={slipInputKey}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={(event) => onSlipFileChange(event.target.files?.[0] || null)}
          className="w-full rounded-xl border border-dashed border-white/15 bg-zinc-950 px-4 py-3 text-sm text-zinc-300 file:mr-4 file:rounded-lg file:border-0 file:bg-red-600 file:px-4 file:py-2 file:text-sm file:font-bold file:text-white hover:file:bg-red-500"
        />
        <p className="text-xs leading-5 text-zinc-500">
          รองรับไฟล์ JPG, PNG, WEBP ขนาดไม่เกิน 5MB ถ้าแนบไม่ได้ สามารถส่งสลิปทาง LINE OA ได้ภายหลัง
        </p>
        {slipError ? (
          <p className="text-xs font-bold text-red-200">{slipError}</p>
        ) : null}
        {slipFile ? (
          <p className="text-xs font-bold text-emerald-200">
            เลือกไฟล์แล้ว: {slipFile.name}
          </p>
        ) : null}
      </div>
    </div>
  );
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

function SuccessCard({
  successData,
  paymentInfo,
  copyMessage,
  onCopyAccountNumber,
  onCopyOrderCode,
  onOrderMore,
}: {
  successData: SuccessState;
  paymentInfo: {
    bankName: string;
    accountName: string;
    accountNumber: string;
  };
  copyMessage: string;
  onCopyAccountNumber: () => void;
  onCopyOrderCode: (orderCode: string) => void;
  onOrderMore: () => void;
}) {
  const checkOrderHref =
    successData.orderCode && successData.phone
      ? `/check-order?order_code=${encodeURIComponent(
          successData.orderCode,
        )}&phone=${encodeURIComponent(successData.phone)}`
      : "/check-order";

  return (
    <div className="mt-5 rounded-2xl border border-emerald-400/40 bg-emerald-950/30 p-5 text-emerald-50 shadow-2xl shadow-emerald-950/20">
      <p className="text-xs font-bold uppercase tracking-[0.24em] text-emerald-200">
        Order Submitted
      </p>
      <h3 className="mt-2 text-2xl font-black">
        ส่งคำสั่งซื้อเรียบร้อยแล้ว
      </h3>
      <p className="mt-3 text-sm leading-6 text-emerald-50/90">
        ระบบได้รับข้อมูลการสั่งซื้อของคุณแล้ว กรุณาโอนเงินและส่งสลิปทาง LINE
        OA ลิงชิงบอล สปอร์ต พร้อมแจ้งชื่อผู้สั่งซื้อและเบอร์โทร
      </p>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {successData.orderCode ? (
          <div className="rounded-xl border border-white/10 bg-zinc-950/70 p-4">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-zinc-500">
              รหัสออเดอร์
            </p>
            <p className="mt-2 text-xl font-black text-white">
              {successData.orderCode}
            </p>
          </div>
        ) : null}
        {successData.totalAmount !== null ? (
          <div className="rounded-xl border border-white/10 bg-zinc-950/70 p-4">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-zinc-500">
              ยอดชำระ
            </p>
            <p className="mt-2 text-xl font-black text-white">
              {successData.totalAmount.toLocaleString("th-TH")} บาท
            </p>
          </div>
        ) : null}
        <div className="rounded-xl border border-white/10 bg-zinc-950/70 p-4">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-zinc-500">
            สถานะสลิป
          </p>
          <p className="mt-2 text-sm font-black text-white">
            {successData.slipStatus === "uploaded"
              ? "ได้รับสลิปแล้ว"
              : successData.slipStatus === "failed"
                ? "แนบสลิปไม่สำเร็จ กรุณาส่งสลิปทาง LINE OA"
                : "ยังไม่ได้แนบสลิป กรุณาส่งสลิปทาง LINE OA"}
          </p>
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-white/10 bg-zinc-950/70 p-4">
        <p className="text-sm font-black text-white">ข้อมูลชำระเงิน</p>
        <dl className="mt-3 grid gap-2 text-sm text-zinc-300">
          <div className="flex justify-between gap-3">
            <dt>ธนาคาร</dt>
            <dd className="font-bold text-white">{paymentInfo.bankName}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt>ชื่อบัญชี</dt>
            <dd className="whitespace-pre-line text-right font-bold text-white">
              {paymentInfo.accountName}
            </dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt>เลขที่บัญชี</dt>
            <dd className="font-black text-red-100">
              {paymentInfo.accountNumber}
            </dd>
          </div>
        </dl>
      </div>

      <p className="mt-4 rounded-xl border border-amber-300/30 bg-amber-300/10 p-4 text-sm leading-6 text-amber-100">
        สถานะเริ่มต้นของออเดอร์คือ รอตรวจสอบยอด
        แอดมินจะอัปเดตสถานะหลังตรวจสอบสลิป
      </p>

      <p className="mt-3 rounded-xl border border-emerald-300/20 bg-emerald-300/10 p-4 text-sm leading-6 text-emerald-50">
        หากแนบสลิปในเว็บไม่ได้ กรุณาส่งสลิปทาง LINE OA พร้อมแจ้งรหัสออเดอร์
        ชื่อผู้สั่งซื้อ และเบอร์โทร
      </p>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <button
          type="button"
          onClick={onCopyAccountNumber}
          className="rounded-xl border border-white/10 px-4 py-3 text-sm font-black text-white hover:bg-white/10"
        >
          คัดลอกเลขบัญชี
        </button>
        {successData.orderCode ? (
          <button
            type="button"
            onClick={() => onCopyOrderCode(successData.orderCode || "")}
            className="rounded-xl border border-white/10 px-4 py-3 text-sm font-black text-white hover:bg-white/10"
          >
            คัดลอกรหัสออเดอร์
          </button>
        ) : null}
        <a
          href={LINE_OA_URL}
          onClick={(event) => {
            event.preventDefault();
            window.open(LINE_OA_URL, "_blank", "noopener,noreferrer");
          }}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-xl border border-emerald-300/30 bg-emerald-300/10 px-4 py-3 text-center text-sm font-black text-emerald-50 hover:bg-emerald-300/20"
        >
          ส่งสลิป / ติดต่อ LINE OA
        </a>
        <Link
          href={checkOrderHref}
          className="rounded-xl bg-red-600 px-4 py-3 text-center text-sm font-black text-white hover:bg-red-500"
        >
          ตรวจสอบสถานะออเดอร์
        </Link>
        <button
          type="button"
          onClick={onOrderMore}
          className="rounded-xl border border-white/10 px-4 py-3 text-sm font-black text-white hover:bg-white/10"
        >
          สั่งเพิ่ม
        </button>
      </div>

      {copyMessage ? (
        <p className="mt-3 text-sm font-bold text-emerald-100">{copyMessage}</p>
      ) : null}
    </div>
  );
}
