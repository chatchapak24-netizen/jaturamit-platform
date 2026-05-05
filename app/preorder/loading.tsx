export default function PreorderLoading() {
  return (
    <main className="min-h-screen bg-zinc-950 px-4 py-16 text-white">
      <section className="mx-auto max-w-6xl">
        <div className="h-5 w-40 rounded-full bg-red-300/20" />
        <div className="mt-5 h-12 max-w-xl rounded-2xl bg-white/10" />
        <div className="mt-4 h-5 max-w-2xl rounded-full bg-white/10" />
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((item) => (
            <div
              key={item}
              className="h-80 animate-pulse rounded-2xl border border-white/10 bg-zinc-900"
            />
          ))}
        </div>
      </section>
    </main>
  );
}
