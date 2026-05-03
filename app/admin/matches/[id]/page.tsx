export default async function MatchDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <h1 className="text-4xl font-black">รายละเอียดแมตช์</h1>
      <p className="mt-4 text-zinc-400">Match ID: {id}</p>
    </main>
  );
}