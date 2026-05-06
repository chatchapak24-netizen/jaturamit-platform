"use client";

import type { FormEvent, ReactNode } from "react";
import { useMemo, useState } from "react";
import Link from "next/link";
import { supabaseBrowser } from "@/lib/supabase-browser";
import type { PreorderCampaign, PreorderProduct } from "@/components/preorder/types";

const SIZE_OPTIONS = ["S", "M", "L", "XL", "2XL", "3XL", "4XL", "5XL"] as const;
const LINE_OA_URL = "https://lin.ee/YmJhMlp";
const SLIP_BUCKET = "preorder-slips";
const MAX_SLIP_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_SLIP_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
const PHONE_ERROR = "กรุณากรอกเบอร์โทรให้ถูกต้อง 10 หลัก เช่น 0812345678";

const DELIVERY_OPTIONS = [
  { value: "pickup", label: "รับที่หน้างาน" },
  { value: "shipping", label: "จัดส่ง" },
] as const;

type SizeValue = (typeof SIZE_OPTIONS)[number];
type DeliveryValue = (typeof DELIVERY_OPTIONS)[number]["value"];
type SlipStatus = "uploaded" | "missing" | "failed";

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

type SuccessState = {
  orderCode: string | null;
  totalAmount: number | null;
  phone: string;
  fullName: string;
  campaignName: string;
  slipStatus: SlipStatus;
};

type PromptPayPayment = {
  charge_id: string | null;
  status: string | null;
  amount: number | null;
  currency: string | null;
  qr_code_uri: string | null;
  expires_at: string | null;
  has_qr?: boolean;
};

type PaymentInfoValue = {
  bankName: string;
  accountName: string;
  accountNumber: string;
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

  async function uploadAndAttachSlip({
    file,
    orderCode,
    phone,
  }: {
    file: File;
    orderCode: string | null;
    phone: string;
  }) {
    if (!orderCode || !isValidThaiPhone(phone)) {
      return false;
    }

    const validationError = validateSlipFile(file);
    if (validationError) {
      return false;
    }

    const slipPath = `${orderCode}/${Date.now()}-${safeSlipFileName(file.name)}`;
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

    const cleanFullName = customerForm.full_name.trim();
    const cleanPhone = customerForm.phone.trim();

    if (cartItems.length === 0) {
      return setErrorText("กรุณาเพิ่มสินค้าอย่างน้อย 1 รายการ");
    }
    if (!cleanFullName) {
      return setErrorText("กรุณากรอกชื่อ-นามสกุล");
    }
    if (!isValidThaiPhone(cleanPhone)) {
      return setErrorText(PHONE_ERROR);
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
        p_full_name: cleanFullName,
        p_phone: cleanPhone,
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
        setErrorText(
          "ไม่สามารถส่งคำสั่งซื้อได้ กรุณาตรวจสอบข้อมูลและลองใหม่",
        );
        return;
      }

      const responseRow = Array.isArray(data)
        ? (data[0] as CreateOrderResponse | undefined)
        : undefined;

      setSuccessData({
        orderCode: responseRow?.order_code || null,
        totalAmount: responseRow?.total_amount ?? cartTotal,
        phone: cleanPhone,
        fullName: cleanFullName,
        campaignName: campaign.name,
        slipStatus: "missing",
      });
      setCustomerForm(createInitialCustomerForm());
      setCartItems([]);
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

          <div className="rounded-xl border border-red-300/30 bg-red-950/30 p-4 text-sm font-black text-red-50">
            ยอดรายการนี้{" "}
            {selectedProduct
              ? (selectedProduct.price * draft.quantity).toLocaleString("th-TH")
              : 0}{" "}
            บาท
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
        <div className="flex flex-col gap-2 border-b border-white/10 pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-red-300">
              Order Summary
            </p>
            <h2 className="mt-2 text-2xl font-black">สรุปคำสั่งซื้อ</h2>
          </div>
          <div className="text-sm text-zinc-400">
            {cartQuantity} ชิ้น / {cartTotal.toLocaleString("th-TH")} บาท
          </div>
        </div>

        <div className="mt-5 space-y-3">
          {cartItems.length === 0 ? (
            <div className="rounded-xl border border-white/10 bg-zinc-950 p-4 text-sm text-zinc-400">
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
                  phone: event.target.value.replace(/\D/g, "").slice(0, 10),
                })
              }
              placeholder="0812345678"
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
            key={successData.orderCode || "success"}
            successData={successData}
            paymentInfo={paymentInfo}
            copyMessage={copyMessage}
            onCopyAccountNumber={copyAccountNumber}
            onCopyOrderCode={copyOrderCode}
            onAttachSlip={uploadAndAttachSlip}
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

function slipStatusLabel(status: SlipStatus) {
  if (status === "uploaded") return "ได้รับสลิปแล้ว";
  if (status === "failed") return "แนบสลิปไม่สำเร็จ";
  return "ยังไม่ได้แนบสลิป";
}

function promptPayStatusLabel(status: string | null) {
  if (status === "successful") return "ชำระเงินแล้ว";
  if (status === "failed") return "ชำระไม่สำเร็จ";
  if (status === "expired") return "QR หมดอายุ";
  if (status === "cancelled") return "ยกเลิก";
  return "รอชำระเงิน";
}

function successMessage(status: SlipStatus) {
  if (status === "uploaded") {
    return "ระบบได้รับคำสั่งซื้อและสลิปการโอนเงินเรียบร้อยแล้ว แอดมินจะตรวจสอบยอดชำระและอัปเดตสถานะออเดอร์ภายหลัง";
  }
  if (status === "failed") {
    return "ระบบได้รับคำสั่งซื้อเรียบร้อยแล้ว แต่ยังแนบสลิปไม่สำเร็จ กรุณาส่งสลิปทาง LINE OA พร้อมแจ้งรหัสออเดอร์ ชื่อผู้สั่งซื้อ และเบอร์โทร";
  }

  return "ระบบได้รับคำสั่งซื้อเรียบร้อยแล้ว กรุณาโอนเงินตามยอดชำระ แล้วแนบสลิปในเว็บ หรือส่งสลิปทาง LINE OA พร้อมแจ้งรหัสออเดอร์ ชื่อผู้สั่งซื้อ และเบอร์โทร";
}

function SuccessCard({
  successData,
  paymentInfo,
  copyMessage,
  onCopyAccountNumber,
  onCopyOrderCode,
  onAttachSlip,
  onOrderMore,
}: {
  successData: SuccessState;
  paymentInfo: PaymentInfoValue;
  copyMessage: string;
  onCopyAccountNumber: () => void;
  onCopyOrderCode: (orderCode: string) => void;
  onAttachSlip: ({
    file,
    orderCode,
    phone,
  }: {
    file: File;
    orderCode: string | null;
    phone: string;
  }) => Promise<boolean>;
  onOrderMore: () => void;
}) {
  const [slipStatus, setSlipStatus] = useState<SlipStatus>(
    successData.slipStatus,
  );
  const [slipFile, setSlipFile] = useState<File | null>(null);
  const [slipError, setSlipError] = useState("");
  const [slipUploading, setSlipUploading] = useState(false);
  const [slipInputKey, setSlipInputKey] = useState(0);
  const [promptPayPayment, setPromptPayPayment] =
    useState<PromptPayPayment | null>(null);
  const [promptPayLoading, setPromptPayLoading] = useState(false);
  const [promptPayMessage, setPromptPayMessage] = useState("");

  const checkOrderHref =
    successData.orderCode && successData.phone
      ? `/check-order?order_code=${encodeURIComponent(
          successData.orderCode,
        )}&phone=${encodeURIComponent(successData.phone)}`
      : "/check-order";

  function updateSlipFile(file: File | null) {
    const validationError = validateSlipFile(file);

    setSlipFile(validationError ? null : file);
    setSlipError(validationError);
    if (validationError) {
      setSlipInputKey((currentKey) => currentKey + 1);
    }
  }

  async function attachSlip() {
    if (!successData.orderCode) {
      setSlipError("ไม่พบรหัสออเดอร์ กรุณาส่งสลิปทาง LINE OA");
      setSlipStatus("failed");
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

    const attached = await onAttachSlip({
      file: slipFile,
      orderCode: successData.orderCode,
      phone: successData.phone,
    });

    setSlipUploading(false);

    if (attached) {
      setSlipStatus("uploaded");
      setSlipFile(null);
      setSlipInputKey((currentKey) => currentKey + 1);
      return;
    }

    setSlipStatus("failed");
    setSlipError("แนบสลิปไม่สำเร็จ กรุณาส่งสลิปทาง LINE OA");
  }

  async function createPromptPayQr() {
    if (!successData.orderCode) {
      setPromptPayMessage("ไม่พบรหัสออเดอร์ กรุณาใช้การแนบสลิปหรือ LINE OA");
      return;
    }

    setPromptPayLoading(true);
    setPromptPayMessage("");

    try {
      const response = await fetch("/api/payments/omise/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          order_code: successData.orderCode,
          phone: successData.phone,
        }),
      });
      const data = (await response.json()) as
        | (PromptPayPayment & { error?: string })
        | { error?: string };

      if (!response.ok || "error" in data) {
        setPromptPayMessage(
          data.error || "สร้าง QR พร้อมเพย์ไม่สำเร็จ กรุณาใช้การแนบสลิปหรือ LINE OA",
        );
        return;
      }

      setPromptPayPayment(data as PromptPayPayment);
      setPromptPayMessage(
        (data as PromptPayPayment).qr_code_uri
          ? "สร้าง QR พร้อมเพย์โหมดทดสอบแล้ว"
          : "สร้างรายการ PromptPay แล้ว แต่ยังไม่พบรูป QR จาก Omise กรุณาใช้การแนบสลิปหรือ LINE OA ก่อน",
      );
    } catch {
      setPromptPayMessage("สร้าง QR พร้อมเพย์ไม่สำเร็จ กรุณาใช้การแนบสลิปหรือ LINE OA");
    } finally {
      setPromptPayLoading(false);
    }
  }

  async function refreshPromptPayStatus() {
    if (!successData.orderCode) return;

    setPromptPayLoading(true);
    setPromptPayMessage("");

    try {
      const params = new URLSearchParams({
        order_code: successData.orderCode,
        phone: successData.phone,
      });
      const response = await fetch(`/api/payments/omise/status?${params}`);
      const data = (await response.json()) as {
        payment_status?: string | null;
        amount?: number | null;
        currency?: string | null;
        paid_at?: string | null;
        error?: string;
      };

      if (!response.ok || data.error) {
        setPromptPayMessage(
          data.error || "ตรวจสอบสถานะการชำระเงินไม่สำเร็จ",
        );
        return;
      }

      setPromptPayPayment((current) => ({
        charge_id: current?.charge_id || null,
        status: data.payment_status || current?.status || null,
        amount: data.amount || current?.amount || null,
        currency: data.currency || current?.currency || "THB",
        qr_code_uri: current?.qr_code_uri || null,
        expires_at: current?.expires_at || null,
      }));
      setPromptPayMessage(
        `สถานะล่าสุด: ${promptPayStatusLabel(data.payment_status || null)}`,
      );
    } catch {
      setPromptPayMessage("ตรวจสอบสถานะการชำระเงินไม่สำเร็จ");
    } finally {
      setPromptPayLoading(false);
    }
  }

  function downloadOrderSummaryImage() {
    const canvas = document.createElement("canvas");
    canvas.width = 1080;
    canvas.height = 1350;
    const context = canvas.getContext("2d");
    if (!context) return;

    context.fillStyle = "#09090b";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = "#ef4444";
    context.fillRect(0, 0, canvas.width, 18);

    context.fillStyle = "#ffffff";
    context.font = "700 54px sans-serif";
    context.fillText("สรุปคำสั่งซื้อพรีออเดอร์", 72, 120);

    context.fillStyle = "#fca5a5";
    context.font = "700 30px sans-serif";
    context.fillText(successData.campaignName, 72, 172);

    const rows = [
      ["รหัสออเดอร์", successData.orderCode || "-"],
      ["ชื่อผู้สั่งซื้อ", successData.fullName || "-"],
      ["เบอร์โทร", successData.phone || "-"],
      [
        "ยอดชำระ",
        successData.totalAmount !== null
          ? `${successData.totalAmount.toLocaleString("th-TH")} บาท`
          : "-",
      ],
      ["สถานะออเดอร์", "รอตรวจสอบยอด"],
      ["สถานะสลิป", slipStatusLabel(slipStatus)],
      ["ธนาคาร", paymentInfo.bankName],
      ["ชื่อบัญชี", paymentInfo.accountName.replace(/\n/g, " / ")],
      ["เลขบัญชี", paymentInfo.accountNumber],
    ];

    let y = 270;
    rows.forEach(([label, value]) => {
      context.fillStyle = "#a1a1aa";
      context.font = "700 28px sans-serif";
      context.fillText(label, 72, y);
      context.fillStyle = "#ffffff";
      context.font = "700 36px sans-serif";
      context.fillText(value, 72, y + 48);
      y += 118;
    });

    context.fillStyle = "#fee2e2";
    context.font = "700 30px sans-serif";
    context.fillText(
      "หากยังไม่ได้แนบสลิป กรุณาส่งสลิปทาง LINE OA พร้อมรูปสรุปออเดอร์นี้",
      72,
      1260,
    );

    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `preorder-${successData.orderCode || Date.now()}.png`;
      link.click();
      URL.revokeObjectURL(url);
    }, "image/png");
  }

  return (
    <div className="mt-5 rounded-2xl border border-emerald-400/40 bg-emerald-950/30 p-5 text-emerald-50 shadow-2xl shadow-emerald-950/20">
      <p className="text-xs font-bold uppercase tracking-[0.24em] text-emerald-200">
        Order Submitted
      </p>
      <h3 className="mt-2 text-2xl font-black">ส่งคำสั่งซื้อเรียบร้อยแล้ว</h3>
      <p className="mt-3 text-sm leading-6 text-emerald-50/90">
        {successMessage(slipStatus)}
      </p>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {successData.orderCode ? (
          <SummaryBox label="รหัสออเดอร์" value={successData.orderCode} />
        ) : null}
        {successData.totalAmount !== null ? (
          <SummaryBox
            label="ยอดชำระ"
            value={`${successData.totalAmount.toLocaleString("th-TH")} บาท`}
          />
        ) : null}
        <SummaryBox label="สถานะสลิป" value={slipStatusLabel(slipStatus)} />
      </div>

      <div className="mt-4 rounded-xl border border-white/10 bg-zinc-950/70 p-4">
        <p className="text-sm font-black text-white">ข้อมูลชำระเงิน</p>
        <dl className="mt-3 grid gap-2 text-sm text-zinc-300">
          <PaymentRow label="ธนาคาร" value={paymentInfo.bankName} />
          <PaymentRow label="ชื่อบัญชี" value={paymentInfo.accountName} multiline />
          <PaymentRow label="เลขที่บัญชี" value={paymentInfo.accountNumber} highlight />
        </dl>
      </div>

      <div className="mt-4 rounded-xl border border-sky-300/20 bg-sky-300/5 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="font-black text-white">ชำระด้วย PromptPay QR</p>
            <p className="mt-1 text-xs font-bold text-sky-200">
              โหมดทดสอบ: ยังไม่มีการชำระเงินจริง
            </p>
            <p className="mt-1 text-xs leading-5 text-zinc-400">
              ระบบสร้าง QR จากยอดออเดอร์ในฐานข้อมูลเท่านั้น ถ้าสร้าง QR ไม่สำเร็จยังสามารถแนบสลิปหรือส่งผ่าน LINE OA ได้
            </p>
          </div>
          <button
            type="button"
            onClick={createPromptPayQr}
            disabled={promptPayLoading}
            className="rounded-xl bg-sky-500 px-4 py-3 text-sm font-black text-zinc-950 hover:bg-sky-400 disabled:opacity-60"
          >
            {promptPayLoading ? "กำลังสร้าง QR..." : "สร้าง QR พร้อมเพย์"}
          </button>
        </div>

        {promptPayPayment ? (
          <div className="mt-4 grid gap-4 sm:grid-cols-[180px_1fr]">
            {promptPayPayment.qr_code_uri ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={promptPayPayment.qr_code_uri}
                alt="PromptPay QR test mode"
                className="h-44 w-44 rounded-xl border border-white/10 bg-white object-contain p-2"
              />
            ) : (
              <div className="flex h-44 w-44 items-center justify-center rounded-xl border border-white/10 bg-zinc-950 p-4 text-center text-xs text-zinc-500">
                ไม่พบรูป QR จาก Omise
              </div>
            )}
            <div className="rounded-xl border border-white/10 bg-zinc-950/70 p-4 text-sm">
              <p className="font-black text-white">
                {promptPayStatusLabel(promptPayPayment.status)}
              </p>
              <p className="mt-2 text-zinc-300">
                ยอดชำระ:{" "}
                {(promptPayPayment.amount || successData.totalAmount || 0).toLocaleString(
                  "th-TH",
                )}{" "}
                บาท
              </p>
              {promptPayPayment.expires_at ? (
                <p className="mt-1 text-zinc-400">
                  หมดอายุ:{" "}
                  {new Intl.DateTimeFormat("th-TH", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  }).format(new Date(promptPayPayment.expires_at))}
                </p>
              ) : null}
              <button
                type="button"
                onClick={refreshPromptPayStatus}
                disabled={promptPayLoading}
                className="mt-3 rounded-xl border border-sky-300/30 px-4 py-3 text-sm font-black text-sky-100 hover:bg-sky-300/10 disabled:opacity-60"
              >
                ตรวจสอบสถานะการชำระเงิน
              </button>
            </div>
          </div>
        ) : null}

        {promptPayMessage ? (
          <p className="mt-3 rounded-xl border border-sky-300/20 bg-zinc-950/60 p-3 text-xs font-bold text-sky-100">
            {promptPayMessage}
          </p>
        ) : null}
      </div>

      {slipStatus !== "uploaded" ? (
        <div className="mt-4 rounded-xl border border-emerald-300/20 bg-zinc-950/70 p-4">
          <p className="font-black text-white">แนบสลิปในเว็บ</p>
          <p className="mt-1 text-xs leading-5 text-zinc-400">
            แนบหลังจากได้รหัสออเดอร์แล้ว ระบบจะผูกสลิปกับออเดอร์นี้ให้อัตโนมัติ
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
          <button
            type="button"
            onClick={attachSlip}
            disabled={slipUploading}
            className="mt-3 w-full rounded-xl bg-emerald-500 px-4 py-3 text-sm font-black text-zinc-950 hover:bg-emerald-400 disabled:opacity-60"
          >
            {slipUploading ? "กำลังแนบสลิป..." : "แนบสลิปกับออเดอร์นี้"}
          </button>
        </div>
      ) : null}

      <p className="mt-4 rounded-xl border border-amber-300/30 bg-amber-300/10 p-4 text-sm leading-6 text-amber-100">
        สถานะเริ่มต้นของออเดอร์คือ รอตรวจสอบยอด แอดมินจะอัปเดตสถานะหลังตรวจสอบสลิป
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
        <button
          type="button"
          onClick={downloadOrderSummaryImage}
          className="rounded-xl border border-white/10 px-4 py-3 text-sm font-black text-white hover:bg-white/10"
        >
          บันทึกรูปออเดอร์
        </button>
        <a
          href={LINE_OA_URL}
          target="_blank"
          rel="noopener noreferrer"
          className={`rounded-xl px-4 py-3 text-center text-sm font-black ${
            slipStatus === "uploaded"
              ? "border border-emerald-300/30 bg-emerald-300/10 text-emerald-50 hover:bg-emerald-300/20"
              : "bg-emerald-500 text-zinc-950 hover:bg-emerald-400"
          }`}
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
          สั่งซื้อเพิ่ม
        </button>
      </div>

      {copyMessage ? (
        <p className="mt-3 text-sm font-bold text-emerald-100">{copyMessage}</p>
      ) : null}
    </div>
  );
}

function SummaryBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-zinc-950/70 p-4">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-zinc-500">
        {label}
      </p>
      <p className="mt-2 text-xl font-black text-white">{value}</p>
    </div>
  );
}

function PaymentRow({
  label,
  value,
  multiline,
  highlight,
}: {
  label: string;
  value: string;
  multiline?: boolean;
  highlight?: boolean;
}) {
  return (
    <div className="flex justify-between gap-3">
      <dt>{label}</dt>
      <dd
        className={`${multiline ? "whitespace-pre-line" : ""} text-right font-bold ${
          highlight ? "text-red-100" : "text-white"
        }`}
      >
        {value}
      </dd>
    </div>
  );
}
