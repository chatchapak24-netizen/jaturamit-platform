import ArenaAuthRequired from "@/components/arena/ArenaAuthRequired";
import ArenaClaimPreviewPanel from "@/components/arena/ArenaClaimPreviewPanel";

export const dynamic = "force-dynamic";

type ArenaClaimPageProps = {
  searchParams: Promise<{
    code?: string | string[];
  }>;
};

export default async function ArenaClaimPage({
  searchParams,
}: ArenaClaimPageProps) {
  const params = await searchParams;
  const initialCode = Array.isArray(params.code)
    ? params.code[0] || ""
    : params.code || "";

  return (
    <ArenaAuthRequired nextPath="/arena/claim">
      <main className="mx-auto max-w-5xl px-6 py-10">
      <section className="mb-8 rounded-3xl border border-white/10 bg-gradient-to-br from-red-950/60 via-zinc-900 to-zinc-950 p-6 md:p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-red-300">
          Arena Claim (รับการ์ดอารีนา)
        </p>
        <h1 className="mt-3 text-4xl font-black">
          Preview your Arena card (ดูตัวอย่างการ์ดอารีนา)
        </h1>
        <p className="mt-3 max-w-3xl text-zinc-300">
          Enter the claim code from your card to check the public preview before
          claiming is enabled. (กรอกรหัสจากการ์ดเพื่อตรวจดูตัวอย่างสาธารณะก่อนเปิดรับการ์ด)
        </p>
      </section>

        <ArenaClaimPreviewPanel initialCode={initialCode} />
      </main>
    </ArenaAuthRequired>
  );
}
