"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase-browser";
import {
  emptyToNull,
  Field,
  FormMessage,
  friendlySupabaseError,
  inputClass,
  numberValue,
  PageHeader,
  PreviewImage,
  textareaClass,
  ToggleRow,
  useRequireActiveAdmin,
} from "@/components/admin/preorder/shared";

type PreorderCampaign = {
  id: string;
  slug: string;
  name: string;
  is_active: boolean;
};

type PreorderTeam = {
  id: string;
  slug: string;
  name: string;
  short_name: string | null;
  is_active: boolean;
};

type ProductType =
  | "jersey"
  | "shorts"
  | "socks"
  | "training_shirt"
  | "scarf"
  | "souvenir"
  | "other";

type PreorderProduct = {
  id: string;
  campaign_id: string | null;
  team_id: string | null;
  product_type: ProductType;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  requires_size: boolean;
  allows_custom_name: boolean;
  requires_custom_name: boolean;
  allows_custom_number: boolean;
  requires_custom_number: boolean;
  is_active: boolean;
  sort_order: number;
};

type ProductForm = {
  campaign_id: string;
  team_id: string;
  product_type: ProductType;
  name: string;
  description: string;
  price: string;
  image_url: string;
  requires_size: boolean;
  allows_custom_name: boolean;
  requires_custom_name: boolean;
  allows_custom_number: boolean;
  requires_custom_number: boolean;
  is_active: boolean;
  sort_order: string;
};

const productTypeOptions: Array<{ value: ProductType; label: string }> = [
  { value: "jersey", label: "เสื้อแข่ง" },
  { value: "shorts", label: "กางเกง" },
  { value: "socks", label: "ถุงเท้า" },
  { value: "training_shirt", label: "เสื้อซ้อม" },
  { value: "scarf", label: "ผ้าพันคอ" },
  { value: "souvenir", label: "ของที่ระลึก" },
  { value: "other", label: "อื่น ๆ" },
];

const emptyForm: ProductForm = {
  campaign_id: "",
  team_id: "",
  product_type: "jersey",
  name: "",
  description: "",
  price: "350",
  image_url: "",
  requires_size: true,
  allows_custom_name: true,
  requires_custom_name: true,
  allows_custom_number: true,
  requires_custom_number: true,
  is_active: true,
  sort_order: "0",
};

function productToForm(product: PreorderProduct): ProductForm {
  return {
    campaign_id: product.campaign_id || "",
    team_id: product.team_id || "",
    product_type: product.product_type,
    name: product.name || "",
    description: product.description || "",
    price: String(product.price ?? 350),
    image_url: product.image_url || "",
    requires_size: product.requires_size,
    allows_custom_name: product.allows_custom_name,
    requires_custom_name: product.requires_custom_name,
    allows_custom_number: product.allows_custom_number,
    requires_custom_number: product.requires_custom_number,
    is_active: product.is_active,
    sort_order: String(product.sort_order ?? 0),
  };
}

function productTypeLabel(value: string) {
  return productTypeOptions.find((option) => option.value === value)?.label || value;
}

export default function AdminPreorderProductsPage() {
  const router = useRouter();
  const checkAdmin = useRequireActiveAdmin(router);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [products, setProducts] = useState<PreorderProduct[]>([]);
  const [campaigns, setCampaigns] = useState<PreorderCampaign[]>([]);
  const [teams, setTeams] = useState<PreorderTeam[]>([]);
  const [editingId, setEditingId] = useState("");
  const [form, setForm] = useState<ProductForm>(emptyForm);
  const [message, setMessage] = useState("");
  const [errorText, setErrorText] = useState("");

  const isEditing = Boolean(editingId);
  const campaignMap = useMemo(
    () => new Map(campaigns.map((campaign) => [campaign.id, campaign])),
    [campaigns],
  );
  const teamMap = useMemo(
    () => new Map(teams.map((team) => [team.id, team])),
    [teams],
  );

  async function loadData() {
    const [campaignResult, teamResult, productResult] = await Promise.all([
      supabaseBrowser
        .from("preorder_campaigns")
        .select("id, slug, name, is_active")
        .order("sort_order", { ascending: true }),
      supabaseBrowser
        .from("preorder_teams")
        .select("id, slug, name, short_name, is_active")
        .order("sort_order", { ascending: true }),
      supabaseBrowser
        .from("preorder_products")
        .select(
          "id, campaign_id, team_id, product_type, name, description, price, image_url, requires_size, allows_custom_name, requires_custom_name, allows_custom_number, requires_custom_number, is_active, sort_order",
        )
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: false }),
    ]);

    const error =
      campaignResult.error?.message ||
      teamResult.error?.message ||
      productResult.error?.message;

    if (error) {
      setErrorText(friendlySupabaseError(error));
      return;
    }

    setCampaigns((campaignResult.data || []) as PreorderCampaign[]);
    setTeams((teamResult.data || []) as PreorderTeam[]);
    setProducts((productResult.data || []) as PreorderProduct[]);
  }

  useEffect(() => {
    async function init() {
      setLoading(true);
      const isAdmin = await checkAdmin();
      if (!isAdmin) return;

      await loadData();
      setLoading(false);
    }

    init();
  }, [checkAdmin]);

  function resetForm() {
    setEditingId("");
    setForm(emptyForm);
  }

  function startEdit(product: PreorderProduct) {
    setMessage("");
    setErrorText("");
    setEditingId(product.id);
    setForm(productToForm(product));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function updateCustomName(checked: boolean, mode: "allow" | "require") {
    if (mode === "allow") {
      setForm({
        ...form,
        allows_custom_name: checked,
        requires_custom_name: checked ? form.requires_custom_name : false,
      });
      return;
    }

    setForm({
      ...form,
      allows_custom_name: checked ? true : form.allows_custom_name,
      requires_custom_name: checked,
    });
  }

  function updateCustomNumber(checked: boolean, mode: "allow" | "require") {
    if (mode === "allow") {
      setForm({
        ...form,
        allows_custom_number: checked,
        requires_custom_number: checked ? form.requires_custom_number : false,
      });
      return;
    }

    setForm({
      ...form,
      allows_custom_number: checked ? true : form.allows_custom_number,
      requires_custom_number: checked,
    });
  }

  function validateForm() {
    if (!form.name.trim()) {
      setErrorText("กรุณากรอกชื่อสินค้า");
      return false;
    }

    if (!form.product_type) {
      setErrorText("กรุณาเลือกประเภทสินค้า");
      return false;
    }

    if (numberValue(form.price) <= 0) {
      setErrorText("ราคาต้องมากกว่า 0 บาท");
      return false;
    }

    if (form.requires_custom_name && !form.allows_custom_name) {
      setErrorText("ไม่สามารถบังคับชื่อหลังเสื้อได้ หากยังไม่เปิดให้ใส่ชื่อ");
      return false;
    }

    if (form.requires_custom_number && !form.allows_custom_number) {
      setErrorText("ไม่สามารถบังคับเบอร์หลังเสื้อได้ หากยังไม่เปิดให้ใส่เบอร์");
      return false;
    }

    return true;
  }

  async function saveProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setErrorText("");

    if (!validateForm()) return;

    setSaving(true);

    const payload = {
      campaign_id: form.campaign_id || null,
      team_id: form.team_id || null,
      product_type: form.product_type,
      name: form.name.trim(),
      description: emptyToNull(form.description),
      price: numberValue(form.price),
      image_url: emptyToNull(form.image_url),
      requires_size: form.requires_size,
      allows_custom_name: form.allows_custom_name,
      requires_custom_name: form.allows_custom_name ? form.requires_custom_name : false,
      allows_custom_number: form.allows_custom_number,
      requires_custom_number: form.allows_custom_number ? form.requires_custom_number : false,
      is_active: form.is_active,
      sort_order: numberValue(form.sort_order),
    };
    const request = isEditing
      ? supabaseBrowser.from("preorder_products").update(payload).eq("id", editingId)
      : supabaseBrowser.from("preorder_products").insert(payload);
    const { error } = await request;

    if (error) {
      setErrorText(friendlySupabaseError(error.message));
      setSaving(false);
      return;
    }

    await loadData();
    resetForm();
    setMessage(isEditing ? "แก้ไขสินค้าเรียบร้อยแล้ว" : "เพิ่มสินค้าใหม่เรียบร้อยแล้ว");
    setSaving(false);
  }

  if (loading) {
    return (
      <main className="mx-auto max-w-6xl px-6 py-10">
        <p className="text-zinc-400">กำลังโหลดข้อมูล...</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <PageHeader
        eyebrow="Admin / Preorder Products"
        title="จัดการสินค้าพรีออเดอร์"
        description="เพิ่มและแก้ไขสินค้า ราคา รูปภาพ เงื่อนไขไซส์ และกติกาการใส่ชื่อหรือเบอร์หลังเสื้อ"
      />

      <FormMessage message={message} tone="success" />
      <FormMessage message={errorText} tone="error" />

      <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <form
          onSubmit={saveProduct}
          className="rounded-3xl border border-white/10 bg-zinc-900 p-5 sm:p-6"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-2xl font-black">
                {isEditing ? "แก้ไขสินค้า" : "เพิ่มสินค้าใหม่"}
              </h2>
              <p className="mt-2 text-sm text-zinc-400">
                สินค้าจะยังไม่ถูกใช้กับหน้า public จนกว่า milestone ถัดไปจะเชื่อม flow ใหม่
              </p>
            </div>
            {isEditing ? (
              <button
                type="button"
                onClick={resetForm}
                className="rounded-xl border border-white/10 px-3 py-2 text-sm font-bold text-zinc-300 hover:bg-white/10"
              >
                ยกเลิก
              </button>
            ) : null}
          </div>

          <div className="mt-6 grid gap-4">
            <Field label="แคมเปญ">
              <select
                className={inputClass}
                value={form.campaign_id}
                onChange={(event) => setForm({ ...form, campaign_id: event.target.value })}
              >
                <option value="">ไม่ผูกแคมเปญ</option>
                {campaigns.map((campaign) => (
                  <option key={campaign.id} value={campaign.id}>
                    {campaign.name} {campaign.is_active ? "(เปิด)" : "(ปิด)"}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="ทีม">
              <select
                className={inputClass}
                value={form.team_id}
                onChange={(event) => setForm({ ...form, team_id: event.target.value })}
              >
                <option value="">ไม่ผูกทีม / สินค้ากลาง</option>
                {teams.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.short_name || team.name} {team.is_active ? "(เปิด)" : "(ปิด)"}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="ประเภทสินค้า">
              <select
                className={inputClass}
                value={form.product_type}
                onChange={(event) =>
                  setForm({ ...form, product_type: event.target.value as ProductType })
                }
              >
                {productTypeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="ชื่อสินค้า">
              <input
                className={inputClass}
                value={form.name}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
              />
            </Field>
            <Field label="คำอธิบายสินค้า">
              <textarea
                className={textareaClass}
                value={form.description}
                onChange={(event) => setForm({ ...form, description: event.target.value })}
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="ราคา (บาท)">
                <input
                  type="number"
                  min={1}
                  className={inputClass}
                  value={form.price}
                  onChange={(event) => setForm({ ...form, price: event.target.value })}
                />
              </Field>
              <Field label="ลำดับการแสดง">
                <input
                  type="number"
                  className={inputClass}
                  value={form.sort_order}
                  onChange={(event) => setForm({ ...form, sort_order: event.target.value })}
                />
              </Field>
            </div>
            <Field label="Image URL" hint="ไม่บังคับ ถ้ามี URL จะมี preview ด้านขวา">
              <input
                className={inputClass}
                value={form.image_url}
                onChange={(event) => setForm({ ...form, image_url: event.target.value })}
                placeholder="https://..."
              />
            </Field>
          </div>

          <div className="mt-6 grid gap-4">
            <ToggleRow
              title="ต้องเลือกไซส์"
              description="เหมาะกับเสื้อ กางเกง หรือสินค้าที่มีไซส์"
              checked={form.requires_size}
              onChange={(checked) => setForm({ ...form, requires_size: checked })}
            />
            <ToggleRow
              title="เปิดให้ใส่ชื่อหลังเสื้อ"
              description="ถ้าปิด ระบบจะปิดการบังคับชื่อให้อัตโนมัติ"
              checked={form.allows_custom_name}
              onChange={(checked) => updateCustomName(checked, "allow")}
            />
            <ToggleRow
              title="บังคับใส่ชื่อหลังเสื้อ"
              description="ถ้าเปิด ระบบจะเปิดช่องชื่อให้อัตโนมัติ"
              checked={form.requires_custom_name}
              onChange={(checked) => updateCustomName(checked, "require")}
            />
            <ToggleRow
              title="เปิดให้ใส่เบอร์หลังเสื้อ"
              description="ถ้าปิด ระบบจะปิดการบังคับเบอร์ให้อัตโนมัติ"
              checked={form.allows_custom_number}
              onChange={(checked) => updateCustomNumber(checked, "allow")}
            />
            <ToggleRow
              title="บังคับใส่เบอร์หลังเสื้อ"
              description="ถ้าเปิด ระบบจะเปิดช่องเบอร์ให้อัตโนมัติ"
              checked={form.requires_custom_number}
              onChange={(checked) => updateCustomNumber(checked, "require")}
            />
            <ToggleRow
              title="เปิดขาย"
              description="ปิดสินค้าแทนการลบ เพื่อไม่กระทบข้อมูลเดิม"
              checked={form.is_active}
              onChange={(checked) => setForm({ ...form, is_active: checked })}
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="mt-6 rounded-2xl bg-red-600 px-6 py-3 font-black text-white hover:bg-red-500 disabled:opacity-60"
          >
            {saving ? "กำลังบันทึก..." : "บันทึกสินค้า"}
          </button>
        </form>

        <section className="grid gap-5">
          <article className="rounded-3xl border border-white/10 bg-zinc-900 p-5 sm:p-6">
            <h2 className="text-2xl font-black">Preview สินค้า</h2>
            <PreviewImage
              imageUrl={form.image_url || null}
              label="Product image preview"
              className="mt-5 aspect-[4/3]"
            />
            <div className="mt-5">
              <p className="text-sm font-bold text-zinc-400">
                {productTypeLabel(form.product_type)}
              </p>
              <p className="mt-1 text-2xl font-black">{form.name || "ชื่อสินค้า"}</p>
              <p className="mt-2 text-lg font-black text-red-200">
                {numberValue(form.price).toLocaleString("th-TH")} บาท
              </p>
              <p className="mt-2 text-sm text-zinc-400">
                {form.team_id
                  ? teamMap.get(form.team_id)?.short_name || teamMap.get(form.team_id)?.name
                  : "สินค้ากลาง"}
              </p>
            </div>
          </article>

          <article className="rounded-3xl border border-white/10 bg-zinc-900 p-5 sm:p-6">
            <h2 className="text-2xl font-black">รายการสินค้า</h2>
            <div className="mt-5 grid gap-3">
              {products.map((product) => (
                <button
                  type="button"
                  key={product.id}
                  onClick={() => startEdit(product)}
                  className="rounded-2xl border border-white/10 bg-zinc-950 p-4 text-left hover:border-red-300/50"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="font-black text-white">{product.name}</p>
                      <p className="mt-1 text-sm text-zinc-400">
                        {campaignMap.get(product.campaign_id || "")?.name || "ไม่ผูกแคมเปญ"} ·{" "}
                        {teamMap.get(product.team_id || "")?.short_name ||
                          teamMap.get(product.team_id || "")?.name ||
                          "สินค้ากลาง"}
                      </p>
                    </div>
                    <div className="text-left sm:text-right">
                      <p className="font-black text-red-200">
                        {product.price.toLocaleString("th-TH")} บาท
                      </p>
                      <span
                        className={`mt-2 inline-flex rounded-full border px-3 py-1 text-xs font-bold ${
                          product.is_active
                            ? "border-emerald-400/40 bg-emerald-500/10 text-emerald-100"
                            : "border-zinc-500/40 bg-zinc-700/20 text-zinc-300"
                        }`}
                      >
                        {product.is_active ? "เปิดขาย" : "ปิด"}
                      </span>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold text-zinc-300">
                    <span className="rounded-full border border-white/10 px-3 py-1">
                      {productTypeLabel(product.product_type)}
                    </span>
                    {product.requires_size ? (
                      <span className="rounded-full border border-white/10 px-3 py-1">มีไซส์</span>
                    ) : null}
                    {product.allows_custom_name ? (
                      <span className="rounded-full border border-white/10 px-3 py-1">
                        ชื่อ{product.requires_custom_name ? "บังคับ" : "ไม่บังคับ"}
                      </span>
                    ) : null}
                    {product.allows_custom_number ? (
                      <span className="rounded-full border border-white/10 px-3 py-1">
                        เบอร์{product.requires_custom_number ? "บังคับ" : "ไม่บังคับ"}
                      </span>
                    ) : null}
                  </div>
                </button>
              ))}
            </div>
          </article>
        </section>
      </section>
    </main>
  );
}
