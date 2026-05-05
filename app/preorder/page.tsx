import PreorderForm, { type TeamValue } from "@/components/preorder/PreorderForm";
import { supabase } from "@/lib/supabase";

const PRODUCTS: Array<{
  key: TeamValue;
  label: string;
  shortName: string;
  accent: string;
}> = [
  {
    key: "photha",
    label: "เสื้อจตุรมิตร - โพธา",
    shortName: "โพธา",
    accent: "from-red-600 via-rose-700 to-zinc-950",
  },
  {
    key: "benjamarachutit",
    label: "เสื้อจตุรมิตร - เบญจมราชูทิศ",
    shortName: "เบญจมราชูทิศ",
    accent: "from-sky-500 via-blue-700 to-zinc-950",
  },
  {
    key: "daruna",
    label: "เสื้อจตุรมิตร - ดรุณาราชบุรี",
    shortName: "ดรุณาราชบุรี",
    accent: "from-emerald-500 via-green-700 to-zinc-950",
  },
  {
    key: "sarasit",
    label: "เสื้อจตุรมิตร - สารสิทธิ์พิทยาลัย",
    shortName: "สารสิทธิ์พิทยาลัย",
    accent: "from-amber-400 via-orange-600 to-zinc-950",
  },
];

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

function isTeamValue(value: unknown): value is TeamValue {
  return PRODUCTS.some((product) => product.key === value);
}

async function getPreorderCustomFieldsEnabled() {
  const { data, error } = await supabase
    .from("site_settings")
    .select("value")
    .eq("key", "preorder_custom_fields_enabled")
    .maybeSingle();

  if (error) {
    return true;
  }

  return data?.value !== "false";
}

export default async function PreorderPage({
  searchParams,
}: {
  searchParams: Promise<{ team?: string | string[] | undefined }>;
}) {
  const customFieldsEnabled = await getPreorderCustomFieldsEnabled();
  const teamParam = (await searchParams).team;
  const requestedTeam = Array.isArray(teamParam) ? teamParam[0] : teamParam;
  const selectedTeam: TeamValue = isTeamValue(requestedTeam)
    ? requestedTeam
    : "photha";

  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <section className="mx-auto grid max-w-6xl gap-8 px-4 py-8 md:px-6 md:py-12 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
        <div className="py-3">
          <p className="text-xs font-bold uppercase tracking-[0.28em] text-red-300">
            Preorder 2026
          </p>
          <h1 className="mt-4 text-3xl font-black leading-tight md:text-5xl">
            พรีออเดอร์เสื้อจตุรมิตรราชบุรี ครั้งที่ 2
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-zinc-300">
            ผลิตโดย ลิงชิงบอล สปอร์ต ใส่ชื่อและเบอร์หลังเสื้อฟรี
            เลือกทีมได้ครบ 4 โรงเรียนในรายการจตุรมิตรราชบุรี
          </p>
          <div className="mt-6 flex flex-wrap gap-3 text-sm font-bold">
            <span className="rounded-full border border-red-400/40 bg-red-500/10 px-4 py-2 text-red-100">
              ราคา 390 บาท
            </span>
            <span className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-zinc-100">
              ผลิตตามออเดอร์
            </span>
            <span className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-zinc-100">
              ชื่อและเบอร์ฟรี
            </span>
          </div>
        </div>

        <div className="overflow-hidden rounded-[28px] border border-white/10 bg-zinc-900 shadow-2xl shadow-red-950/30">
          <div className="bg-gradient-to-br from-red-600 via-zinc-900 to-amber-500 p-6">
            <div className="aspect-[4/3] rounded-2xl border border-white/20 bg-black/25 p-5 backdrop-blur-sm">
              <div className="flex h-full flex-col justify-between rounded-xl border border-white/20 bg-zinc-950/75 p-5">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.24em] text-amber-200">
                    Jaturamit Ratchaburi
                  </p>
                  <p className="mt-3 text-4xl font-black">02</p>
                </div>
                <div>
                  <div className="h-2 w-24 rounded-full bg-red-500" />
                  <p className="mt-3 text-sm font-semibold text-zinc-200">
                    Custom name and number
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-8 md:px-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {PRODUCTS.map((product) => (
            <a
              key={product.key}
              href={`/preorder?team=${product.key}#preorder-form`}
              className="group overflow-hidden rounded-2xl border border-white/10 bg-zinc-900 transition hover:-translate-y-0.5 hover:border-red-300/70 hover:bg-zinc-800"
            >
              <div className={`h-24 bg-gradient-to-br ${product.accent}`} />
              <div className="p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
                  {product.shortName}
                </p>
                <h2 className="mt-2 min-h-14 text-lg font-black leading-snug">
                  {product.label}
                </h2>
                <div className="mt-4 flex items-center justify-between gap-3">
                  <span className="text-sm font-black text-red-200">
                    390 บาท
                  </span>
                  <span className="rounded-full border border-white/15 px-3 py-1 text-xs font-bold text-zinc-200 group-hover:border-red-300/60 group-hover:text-red-100">
                    เลือกทีม
                  </span>
                </div>
              </div>
            </a>
          ))}
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-5 px-4 pb-8 md:px-6 lg:grid-cols-[0.9fr_1.1fr]">
        <article className="rounded-2xl border border-white/10 bg-zinc-900 p-5 md:p-6">
          <h2 className="text-xl font-black">รายละเอียดสินค้า</h2>
          <ul className="mt-4 space-y-3 text-sm leading-6 text-zinc-300">
            <li>เสื้อผลิตตามออเดอร์ ไม่มีสต็อกพร้อมส่ง</li>
            <li>ใส่ชื่อและเบอร์ฟรี</li>
            <li>เหมาะสำหรับใส่เชียร์ ใส่ซ้อม หรือสะสม</li>
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

      <section id="preorder-form" className="mx-auto max-w-6xl scroll-mt-24 px-4 pb-14 md:px-6">
        <PreorderForm
          key={`${selectedTeam}-${customFieldsEnabled}`}
          customFieldsEnabled={customFieldsEnabled}
          initialTeam={selectedTeam}
        />
      </section>
    </main>
  );
}
