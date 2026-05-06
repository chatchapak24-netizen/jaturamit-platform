import { createClient } from "@supabase/supabase-js";
import PaymentInfo from "@/components/preorder/PaymentInfo";
import PreorderForm from "@/components/preorder/PreorderForm";
import type {
  PreorderCampaign,
  PreorderProduct,
  PreorderProductType,
  PreorderTeam,
} from "@/components/preorder/types";
import { productTypeLabels } from "@/components/preorder/types";
import { normalizePreorderConfig } from "@/lib/preorder-config";

export const dynamic = "force-dynamic";

const DEFAULT_HERO_TITLE = "พรีออเดอร์เสื้อจตุรมิตรราชบุรี ครั้งที่ 2";
const DEFAULT_HERO_SUBTITLE =
  "ผลิตโดย ลิงชิงบอล สปอร์ต ใส่ชื่อและเบอร์หลังเสื้อฟรี";
const DEFAULT_DESCRIPTION =
  "เลือกสินค้าที่เปิดรับพรีออเดอร์ ผลิตตามรายการสั่งซื้อโดย ลิงชิงบอล สปอร์ต";
const DEFAULT_PAYMENT = {
  bankName: "ออมสิน",
  accountName: "นางวาสนา เรื่องแตง\nบัญชีร้านลิงชิงบอล สปอร์ต",
  accountNumber: "020477888224",
  note: "หลังโอนเงิน กรุณาส่งสลิปทาง LINE OA ลิงชิงบอล สปอร์ต พร้อมแจ้งชื่อผู้สั่งซื้อและเบอร์โทร",
};

const SIZE_CHART = [
  ["S", "36", "26"],
  ["M", "38", "27"],
  ["L", "40", "28"],
  ["XL", "42", "29"],
  ["2XL", "44", "30"],
  ["3XL", "46", "31"],
  ["4XL", "48", "32"],
  ["5XL", "50", "33"],
] as const;

const DEFAULT_TERMS = [
  "สินค้าเป็นงานพรีออเดอร์ ผลิตตามรายการสั่งซื้อ",
  "ตรวจสอบไซส์ ชื่อ และเบอร์ก่อนยืนยัน",
  "หลังปิดรอบพรีออเดอร์ไม่สามารถแก้ไขได้",
  "ไม่รับเปลี่ยนคืนกรณีเลือกไซส์ผิด",
] as const;

type CampaignRow = PreorderCampaign & {
  created_at: string;
  sort_order: number;
};

type ProductRow = Omit<PreorderProduct, "team"> & {
  created_at: string;
};

type VisualConfig = {
  coverImageUrl: string;
  teamImageUrls: Record<string, string>;
};

type PreorderPageData =
  | {
      status: "ready";
      campaign: PreorderCampaign;
      products: PreorderProduct[];
      visualConfig: VisualConfig;
    }
  | { status: "empty-campaign" }
  | { status: "empty-products"; campaign: PreorderCampaign }
  | { status: "error"; message: string };

function createPublicSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return null;
  }

  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

async function getPreorderPageData(): Promise<PreorderPageData> {
  const supabase = createPublicSupabaseClient();

  if (!supabase) {
    return {
      status: "error",
      message: "ระบบยังไม่พร้อมใช้งาน กรุณาตั้งค่า Supabase environment",
    };
  }

  const { data: campaigns, error: campaignError } = await supabase
    .from("preorder_campaigns")
    .select(
      "id, name, description, hero_title, hero_subtitle, terms, payment_bank_name, payment_account_name, payment_account_number, payment_note, sort_order, created_at",
    )
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false })
    .limit(1);

  if (campaignError) {
    return {
      status: "error",
      message: "ไม่สามารถโหลดข้อมูลแคมเปญพรีออเดอร์ได้",
    };
  }

  const campaign = (campaigns || [])[0] as CampaignRow | undefined;

  if (!campaign) {
    return { status: "empty-campaign" };
  }

  const { data: products, error: productError } = await supabase
    .from("preorder_products")
    .select(
      "id, campaign_id, team_id, product_type, name, description, price, image_url, requires_size, allows_custom_name, requires_custom_name, allows_custom_number, requires_custom_number, sort_order, created_at",
    )
    .eq("campaign_id", campaign.id)
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (productError) {
    return {
      status: "error",
      message: "ไม่สามารถโหลดรายการสินค้า preorder ได้",
    };
  }

  const productRows = (products || []) as ProductRow[];

  if (productRows.length === 0) {
    return { status: "empty-products", campaign };
  }

  const teamIds = Array.from(
    new Set(productRows.map((product) => product.team_id).filter(Boolean)),
  ) as string[];
  const teamMap = new Map<string, PreorderTeam>();

  if (teamIds.length > 0) {
    const { data: teams, error: teamError } = await supabase
      .from("preorder_teams")
      .select("id, slug, name, short_name, colors, logo_url")
      .in("id", teamIds)
      .eq("is_active", true);

    if (teamError) {
      return {
        status: "error",
        message: "ไม่สามารถโหลดข้อมูลทีมของสินค้าได้",
      };
    }

    ((teams || []) as PreorderTeam[]).forEach((team) => {
      teamMap.set(team.id, team);
    });
  }

  const visualConfig = await getPreorderVisualConfig(supabase);

  return {
    status: "ready",
    campaign,
    products: productRows.map((product) => ({
      ...product,
      image_url:
        product.image_url ||
        (product.team_id
          ? visualConfig.teamImageUrls[teamMap.get(product.team_id)?.slug || ""]
          : "") ||
        null,
      team: product.team_id ? teamMap.get(product.team_id) || null : null,
    })),
    visualConfig,
  };
}

async function getPreorderVisualConfig(
  supabase: NonNullable<ReturnType<typeof createPublicSupabaseClient>>,
): Promise<VisualConfig> {
  const { data, error } = await supabase
    .from("site_settings")
    .select("key, value")
    .in("key", ["preorder_config", "preorder_custom_fields_enabled"]);

  if (error) {
    return { coverImageUrl: "", teamImageUrls: {} };
  }

  const preorderConfig = data?.find((item) => item.key === "preorder_config");
  const legacyCustomFields = data?.find(
    (item) => item.key === "preorder_custom_fields_enabled",
  );
  const config = normalizePreorderConfig(
    preorderConfig?.value,
    legacyCustomFields?.value !== "false",
  );

  return {
    coverImageUrl: config.coverImageUrl,
    teamImageUrls: config.teamImageUrls,
  };
}

function termsFromCampaign(terms: string | null) {
  if (!terms?.trim()) return DEFAULT_TERMS;

  return terms
    .split(/\r?\n/)
    .map((term) => term.trim())
    .filter(Boolean);
}

function productAccent(productType: PreorderProductType, colors?: string | null) {
  if (colors?.includes("แดง")) return "from-red-600 via-rose-700 to-zinc-950";
  if (colors?.includes("ชมพู")) return "from-pink-400 via-blue-700 to-zinc-950";
  if (colors?.includes("เหลือง")) return "from-amber-300 via-yellow-700 to-zinc-950";
  if (colors?.includes("น้ำเงิน")) return "from-sky-500 via-blue-800 to-zinc-950";

  switch (productType) {
    case "shorts":
      return "from-zinc-500 via-zinc-800 to-zinc-950";
    case "socks":
      return "from-slate-300 via-slate-700 to-zinc-950";
    case "training_shirt":
      return "from-emerald-400 via-green-700 to-zinc-950";
    case "scarf":
      return "from-red-500 via-amber-500 to-zinc-950";
    case "souvenir":
      return "from-violet-400 via-fuchsia-700 to-zinc-950";
    default:
      return "from-red-600 via-zinc-800 to-zinc-950";
  }
}

function StateMessage({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <main className="min-h-screen bg-zinc-950 px-4 py-16 text-white">
      <section className="mx-auto max-w-3xl rounded-3xl border border-white/10 bg-zinc-900 p-6 text-center md:p-10">
        <p className="text-sm font-bold uppercase tracking-[0.24em] text-red-300">
          Preorder
        </p>
        <h1 className="mt-3 text-3xl font-black">{title}</h1>
        <p className="mt-4 leading-7 text-zinc-300">{description}</p>
      </section>
    </main>
  );
}

export default async function PreorderPage({
  searchParams,
}: {
  searchParams: Promise<{ product?: string | string[] | undefined }>;
}) {
  const pageData = await getPreorderPageData();

  if (pageData.status === "error") {
    return (
      <StateMessage
        title="โหลดข้อมูลพรีออเดอร์ไม่สำเร็จ"
        description={pageData.message}
      />
    );
  }

  if (pageData.status === "empty-campaign") {
    return (
      <StateMessage
        title="ยังไม่เปิดรับพรีออเดอร์ในขณะนี้"
        description="กรุณาติดตามประกาศจากผู้จัดอีกครั้งเมื่อเปิดรอบพรีออเดอร์"
      />
    );
  }

  if (pageData.status === "empty-products") {
    return (
      <StateMessage
        title="ยังไม่มีสินค้าที่เปิดรับพรีออเดอร์"
        description="แคมเปญพร้อมใช้งานแล้ว แต่ยังไม่มีรายการสินค้าที่เปิดขาย"
      />
    );
  }

  const { campaign, products, visualConfig } = pageData;
  const productParam = (await searchParams).product;
  const requestedProductId = Array.isArray(productParam)
    ? productParam[0]
    : productParam;
  const selectedProductId = products.some(
    (product) => product.id === requestedProductId,
  )
    ? requestedProductId
    : products[0]?.id;
  const heroTitle = campaign.hero_title || DEFAULT_HERO_TITLE;
  const heroSubtitle = campaign.hero_subtitle || DEFAULT_HERO_SUBTITLE;
  const description = campaign.description || DEFAULT_DESCRIPTION;
  const cheapestPrice = Math.min(...products.map((product) => product.price));
  const terms = termsFromCampaign(campaign.terms);
  const paymentBankName = campaign.payment_bank_name || DEFAULT_PAYMENT.bankName;
  const paymentAccountName =
    campaign.payment_account_name || DEFAULT_PAYMENT.accountName;
  const paymentAccountNumber =
    campaign.payment_account_number || DEFAULT_PAYMENT.accountNumber;
  const paymentNote = campaign.payment_note || DEFAULT_PAYMENT.note;
  const heroImage =
    visualConfig.coverImageUrl ||
    products.find((product) => product.image_url)?.image_url;

  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <section className="mx-auto grid max-w-6xl gap-8 px-4 py-8 md:px-6 md:py-12 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
        <div className="py-3">
          <p className="text-xs font-bold uppercase tracking-[0.28em] text-red-300">
            Preorder 2026
          </p>
          <h1 className="mt-4 text-3xl font-black leading-tight md:text-5xl">
            {heroTitle}
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-zinc-300">
            {heroSubtitle}
          </p>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-400">
            {description}
          </p>
          <div className="mt-6 flex flex-wrap gap-3 text-sm font-bold">
            <span className="rounded-full border border-red-400/40 bg-red-500/10 px-4 py-2 text-red-100">
              เริ่มต้น {cheapestPrice} บาท
            </span>
            <span className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-zinc-100">
              ผลิตตามออเดอร์
            </span>
            <span className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-zinc-100">
              {products.length} รายการ
            </span>
          </div>
        </div>

        <div className="group overflow-hidden rounded-[28px] border border-white/10 bg-zinc-900 shadow-2xl shadow-red-950/30 transition duration-300 hover:-translate-y-1 hover:border-red-300/40">
          {heroImage ? (
            <div className="relative bg-gradient-to-br from-zinc-900 via-zinc-950 to-red-950/70 p-2 sm:p-3">
              <div
                aria-label="Preorder product preview"
                className="aspect-[4/3] rounded-2xl border border-white/15 bg-zinc-950 bg-contain bg-center bg-no-repeat transition duration-700 group-hover:scale-[1.035] lg:aspect-[5/4]"
                style={{
                  backgroundImage: `url("${heroImage}")`,
                }}
              />
              <div className="pointer-events-none absolute inset-2 rounded-2xl bg-gradient-to-t from-zinc-950/25 via-transparent to-white/5 sm:inset-3" />
            </div>
          ) : (
            <div className="bg-gradient-to-br from-red-600 via-zinc-900 to-amber-500 p-2 sm:p-3">
              <div className="flex aspect-[4/3] items-end rounded-2xl border border-white/15 bg-zinc-950/45 p-6 lg:aspect-[5/4]">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.24em] text-amber-200">
                    {campaign.name}
                  </p>
                  <p className="mt-3 max-w-xs text-2xl font-black">
                    Dynamic preorder products
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-8 md:px-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {products.map((product) => {
            const teamLabel =
              product.team?.short_name || product.team?.name || "สินค้ากลาง";
            const accent = productAccent(product.product_type, product.team?.colors);

            return (
              <a
                key={product.id}
                href={`/preorder?product=${product.id}#preorder-form`}
                className="group overflow-hidden rounded-2xl border border-white/10 bg-zinc-900 transition duration-300 hover:-translate-y-1 hover:border-red-300/70 hover:bg-zinc-800 hover:shadow-2xl hover:shadow-red-950/30"
              >
                <div className={`relative h-64 overflow-hidden bg-gradient-to-br ${accent} sm:h-72 lg:h-64`}>
                  {product.image_url ? (
                    <div
                      className="absolute inset-3 bg-contain bg-center bg-no-repeat transition duration-700 group-hover:scale-105 sm:inset-4"
                      style={{
                        backgroundImage: `url("${product.image_url}")`,
                      }}
                    />
                  ) : null}
                  <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 via-zinc-900/10 to-white/5" />
                  <div className="absolute left-4 top-4 rounded-full border border-white/20 bg-zinc-950/70 px-3 py-1 text-xs font-black text-white">
                    {productTypeLabels[product.product_type]}
                  </div>
                </div>
                <div className="p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
                    {teamLabel}
                  </p>
                  <h2 className="mt-2 min-h-14 text-lg font-black leading-snug">
                    {product.name}
                  </h2>
                  {product.description ? (
                    <p className="mt-2 line-clamp-2 text-sm leading-6 text-zinc-400">
                      {product.description}
                    </p>
                  ) : null}
                  {product.team?.colors ? (
                    <p className="mt-2 text-xs font-bold text-red-200">
                      {product.team.colors}
                    </p>
                  ) : null}
                  <div className="mt-4 flex items-center justify-between gap-3">
                    <span className="text-sm font-black text-red-200">
                      {product.price} บาท
                    </span>
                    <span className="rounded-full border border-white/15 px-3 py-1 text-xs font-bold text-zinc-200 group-hover:border-red-300/60 group-hover:text-red-100">
                      เพิ่มลงรายการ
                    </span>
                  </div>
                </div>
              </a>
            );
          })}
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-5 px-4 pb-8 md:px-6 lg:grid-cols-[0.9fr_1.1fr]">
        <article className="rounded-2xl border border-white/10 bg-zinc-900 p-5 md:p-6">
          <h2 className="text-xl font-black">รายละเอียดสินค้า</h2>
          <ul className="mt-4 space-y-3 text-sm leading-6 text-zinc-300">
            <li>สินค้าเปิดรับตามรายการที่แอดมินตั้งค่าไว้ในระบบ</li>
            <li>ราคาและกติกาชื่อ/เบอร์หลังเสื้ออ้างอิงจากสินค้าแต่ละรายการ</li>
            <li>เหมาะสำหรับใส่เชียร์ ใส่ซ้อม หรือสะสมตามประเภทสินค้า</li>
            <li>ผลิตโดย ลิงชิงบอล สปอร์ต</li>
          </ul>
        </article>

        <article className="overflow-hidden rounded-2xl border border-white/10 bg-zinc-900">
          <div className="border-b border-white/10 p-5 md:p-6">
            <h2 className="text-xl font-black">ตารางไซส์</h2>
            <p className="mt-1 text-sm text-zinc-400">หน่วยวัดเป็นนิ้ว</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[420px] text-sm">
              <thead className="bg-white/5 text-zinc-300">
                <tr>
                  <th className="px-4 py-3 text-left">ไซส์</th>
                  <th className="px-4 py-3 text-left">รอบอก</th>
                  <th className="px-4 py-3 text-left">ความยาว</th>
                </tr>
              </thead>
              <tbody>
                {SIZE_CHART.map(([size, chest, length]) => (
                  <tr key={size} className="border-t border-white/10">
                    <td className="px-4 py-3 font-black">{size}</td>
                    <td className="px-4 py-3 text-zinc-300">{chest}</td>
                    <td className="px-4 py-3 text-zinc-300">{length}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-8 md:px-6">
        <PaymentInfo
          bankName={paymentBankName}
          accountName={paymentAccountName}
          accountNumber={paymentAccountNumber}
          paymentNote={paymentNote}
        />
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-8 md:px-6">
        <article className="rounded-2xl border border-amber-300/20 bg-amber-300/5 p-5 text-amber-50 md:p-6">
          <h2 className="text-xl font-black">เงื่อนไขการสั่งซื้อ</h2>
          <ul className="mt-4 space-y-3 text-sm leading-6 text-amber-100/90">
            {terms.map((term) => (
              <li key={term}>{term}</li>
            ))}
          </ul>
        </article>
      </section>

      <section
        id="preorder-form"
        className="mx-auto max-w-6xl scroll-mt-24 px-4 pb-14 md:px-6"
      >
        <PreorderForm
          campaign={campaign}
          products={products}
          initialProductId={selectedProductId}
        />
      </section>
    </main>
  );
}
