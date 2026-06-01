import Link from "next/link";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

type Sponsor = {
  id: string;
  name: string;
  logo_url: string | null;
  website_url: string | null;
  sponsor_tier: string | null;
  display_order: number | null;
};

function tierLabel(tier: string | null) {
  const labels: Record<string, string> = {
    main: "Main Sponsor",
    co: "Co Sponsor",
    official: "Official Partner",
    supporter: "Supporter",
    media: "Media Partner",
  };

  return labels[tier || "supporter"] || "Supporter";
}

export default async function SponsorsPage() {
  const { data, error } = await supabase
    .from("sponsors")
    .select("id, name, logo_url, website_url, sponsor_tier, display_order")
    .eq("status", "active")
    .order("display_order", { ascending: true })
    .order("name", { ascending: true });

  const sponsors = (data || []) as Sponsor[];

  const mainSponsors = sponsors.filter((item) => item.sponsor_tier === "main");
  const otherSponsors = sponsors.filter((item) => item.sponsor_tier !== "main");

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <div className="mb-8">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-red-300">
          Sponsors
        </p>
        <h1 className="mt-2 text-4xl font-black">ผู้สนับสนุนรายการ</h1>
        <p className="mt-3 text-zinc-400">
          พาร์ทเนอร์และผู้สนับสนุนการแข่งขันจตุรมิตรราชบุรี ครั้งที่ 2
        </p>
      </div>

      {error && (
        <div className="mb-6 rounded-2xl border border-red-500/40 bg-red-950/40 p-4 text-red-200">
          {error.message}
        </div>
      )}

      <section className="rounded-3xl border border-white/10 bg-gradient-to-br from-red-950/50 via-zinc-900 to-zinc-950 p-6">
        <h2 className="text-2xl font-black">Main Sponsor</h2>

        <div className="mt-6 grid gap-5 md:grid-cols-2">
          {mainSponsors.length === 0 && (
            <div className="rounded-2xl border border-dashed border-white/15 p-8 text-center text-zinc-500 md:col-span-2">
              ยังไม่มี Main Sponsor
            </div>
          )}

          {mainSponsors.map((item) => (
            <SponsorCard key={item.id} sponsor={item} large />
          ))}
        </div>
      </section>

      <section className="mt-8 rounded-3xl border border-white/10 bg-zinc-900 p-6">
        <h2 className="text-2xl font-black">Official Partners</h2>

        <div className="mt-6 grid gap-5 md:grid-cols-3">
          {otherSponsors.length === 0 && (
            <div className="rounded-2xl border border-dashed border-white/15 p-8 text-center text-zinc-500 md:col-span-3">
              ยังไม่มีผู้สนับสนุนอื่น ๆ
            </div>
          )}

          {otherSponsors.map((item) => (
            <SponsorCard key={item.id} sponsor={item} />
          ))}
        </div>
      </section>
    </main>
  );
}

function SponsorCard({
  sponsor,
  large = false,
}: {
  sponsor: Sponsor;
  large?: boolean;
}) {
  const content = (
    <div
      className={`group rounded-3xl border border-white/10 bg-zinc-950 p-6 transition hover:border-red-400/50 hover:bg-zinc-800 ${
        large ? "md:p-8" : ""
      }`}
    >
      <div
        className={`flex items-center justify-center rounded-2xl bg-white p-4 ${
          large ? "h-36" : "h-28"
        }`}
      >
        {sponsor.logo_url ? (
          <img
            src={sponsor.logo_url}
            alt={sponsor.name}
            className="max-h-full max-w-full object-contain"
          />
        ) : (
          <span className="text-sm font-black uppercase tracking-[0.25em] text-zinc-400">
            Logo
          </span>
        )}
      </div>

      <div className="mt-5">
        <p className="text-xs font-bold uppercase tracking-[0.25em] text-red-300">
          {tierLabel(sponsor.sponsor_tier)}
        </p>
        <h3 className={large ? "mt-2 text-2xl font-black" : "mt-2 text-xl font-black"}>
          {sponsor.name}
        </h3>

        {sponsor.website_url && (
          <p className="mt-3 text-sm font-bold text-zinc-500 group-hover:text-zinc-300">
            เยี่ยมชม →
          </p>
        )}
      </div>
    </div>
  );

  if (sponsor.website_url) {
    return (
      <Link href={sponsor.website_url} target="_blank" rel="noreferrer">
        {content}
      </Link>
    );
  }

  return content;
}
