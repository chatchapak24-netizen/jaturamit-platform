import Link from "next/link";
import { supabase } from "@/lib/supabase";

type SupabaseRelation<T> = T | T[] | null;

type Season = {
  id: string;
  name: string;
  year: number | null;
  status: string | null;
  competition: {
    name: string;
    slug: string;
  } | null;
};

type SeasonQueryRow = Omit<Season, "competition"> & {
  competition: SupabaseRelation<{ name: string | null; slug: string | null }>;
};

type Team = {
  id: string;
  name: string;
  short_name: string | null;
  slug: string;
  logo_url: string | null;
};

type Player = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  nickname: string | null;
  photo_url: string | null;
};

type SeasonPlayer = {
  id: string;
  season_id: string;
  team_id: string;
  shirt_number: number | null;
  position: string | null;
  status: string | null;
  team: Team | null;
  player: Player | null;
};

type SeasonPlayerQueryRow = Omit<SeasonPlayer, "team" | "player"> & {
  team: SupabaseRelation<Team>;
  player: SupabaseRelation<Player>;
};

function normalizeRelation<T>(relation: SupabaseRelation<T>): T | null {
  return Array.isArray(relation) ? relation[0] || null : relation;
}

function normalizeSeasonCompetition(
  competition: SeasonQueryRow["competition"]
): Season["competition"] {
  const value = normalizeRelation(competition);

  if (!value?.name || !value.slug) {
    return null;
  }

  return { name: value.name, slug: value.slug };
}

function playerName(player: SeasonPlayer["player"]) {
  if (!player) return "ไม่ระบุชื่อ";

  const fullName = [player.first_name, player.last_name]
    .filter(Boolean)
    .join(" ");

  return player.nickname || fullName || "ไม่ระบุชื่อ";
}

function playerFullName(player: SeasonPlayer["player"]) {
  if (!player) return "-";

  return (
    [player.first_name, player.last_name].filter(Boolean).join(" ") || "-"
  );
}

function positionLabel(position: string | null) {
  const labels: Record<string, string> = {
    GK: "ผู้รักษาประตู",
    DF: "กองหลัง",
    MF: "กองกลาง",
    FW: "กองหน้า",
  };

  return labels[position || ""] || position || "-";
}

export default async function PlayersPage({
  searchParams,
}: {
  searchParams: Promise<{ season?: string }>;
}) {
  const params = await searchParams;

  const { data: seasonData, error: seasonError } = await supabase
    .from("seasons")
    .select(`
      id,
      name,
      year,
      status,
      competition:competition_id(
        name,
        slug
      )
    `)
    .order("year", { ascending: false })
    .order("name", { ascending: true });

  const seasons: Season[] = ((seasonData || []) as SeasonQueryRow[]).map(
    (season) => ({
      ...season,
      competition: normalizeSeasonCompetition(season.competition),
    })
  );

  const activeSeason =
    seasons.find((season) => season.status === "active") || seasons[0] || null;

  const selectedSeasonId = params.season || activeSeason?.id || "";

  const selectedSeason =
    seasons.find((season) => season.id === selectedSeasonId) || activeSeason;

  const { data, error } = selectedSeasonId
    ? await supabase
        .from("season_players")
        .select(`
          id,
          season_id,
          team_id,
          shirt_number,
          position,
          status,
          team:team_id(
            id,
            name,
            short_name,
            slug,
            logo_url
          ),
          player:player_id(
            id,
            first_name,
            last_name,
            nickname,
            photo_url
          )
        `)
        .eq("season_id", selectedSeasonId)
        .order("team_id", { ascending: true })
        .order("shirt_number", { ascending: true })
    : { data: [], error: null };

  const players: SeasonPlayer[] = (
    (data || []) as SeasonPlayerQueryRow[]
  ).map((player) => ({
    ...player,
    team: normalizeRelation(player.team),
    player: normalizeRelation(player.player),
  }));

  return (
    <main className="mx-auto max-w-7xl px-6 py-10">
      <div className="mb-8">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-red-300">
          Players
        </p>

        <h1 className="mt-2 text-4xl font-black">รายชื่อนักเตะ</h1>

        <p className="mt-3 text-zinc-400">
          {selectedSeason?.competition?.name || "รายการแข่งขัน"} ·{" "}
          {selectedSeason?.name || "ซีซั่น"}{" "}
          {selectedSeason?.year ? `· ${selectedSeason.year}` : ""}
        </p>
      </div>

      {(seasonError || error) && (
        <div className="mb-6 rounded-2xl border border-red-500/40 bg-red-950/40 p-4 text-red-200">
          {seasonError?.message || error?.message}
        </div>
      )}

      <section className="mb-8 rounded-3xl border border-white/10 bg-zinc-900 p-6">
        <h2 className="text-2xl font-black">เลือกซีซั่น</h2>

        <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {seasons.map((season) => {
            const isActive = season.id === selectedSeasonId;

            return (
              <Link
                key={season.id}
                href={`/players?season=${season.id}`}
                className={`rounded-2xl border p-4 transition ${
                  isActive
                    ? "border-red-400 bg-red-950/40"
                    : "border-white/10 bg-zinc-950 hover:border-red-400/50"
                }`}
              >
                <p className="text-xs font-bold uppercase tracking-[0.25em] text-red-300">
                  {season.status}
                </p>

                <p className="mt-2 font-black">{season.competition?.name}</p>

                <p className="mt-1 text-sm text-zinc-400">
                  {season.name} {season.year ? `· ${season.year}` : ""}
                </p>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="rounded-3xl border border-white/10 bg-zinc-900 p-6">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-2xl font-black">นักเตะในซีซั่นนี้</h2>
          <p className="text-sm text-zinc-500">
            ทั้งหมด {players.length} คน
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {players.map((item) => (
            <Link
              key={item.id}
              href={`/players/${item.player?.id}`}
              className="group overflow-hidden rounded-3xl border border-white/10 bg-zinc-950 transition hover:border-red-400/50 hover:bg-zinc-800"
            >
              <div className="flex h-56 items-center justify-center bg-gradient-to-br from-zinc-800 to-zinc-950">
                {item.player?.photo_url ? (
                  <img
                    src={item.player.photo_url}
                    alt={playerName(item.player)}
                    className="h-full w-full object-cover transition group-hover:scale-105"
                  />
                ) : (
                  <div className="flex h-28 w-28 items-center justify-center rounded-full border border-white/10 bg-white/5 text-4xl font-black text-zinc-500">
                    {item.shirt_number ?? "-"}
                  </div>
                )}
              </div>

              <div className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.25em] text-red-300">
                      {item.team?.short_name || item.team?.name}
                    </p>

                    <h3 className="mt-2 text-2xl font-black group-hover:text-red-200">
                      {playerName(item.player)}
                    </h3>

                    <p className="mt-1 text-sm text-zinc-500">
                      {playerFullName(item.player)}
                    </p>
                  </div>

                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white text-2xl font-black text-zinc-950">
                    {item.shirt_number ?? "-"}
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-2 gap-3 border-t border-white/10 pt-4 text-sm">
                  <div>
                    <p className="text-zinc-500">ตำแหน่ง</p>
                    <p className="mt-1 font-bold text-zinc-200">
                      {positionLabel(item.position)}
                    </p>
                  </div>

                  <div>
                    <p className="text-zinc-500">สถานะ</p>
                    <p className="mt-1 font-bold text-zinc-200">
                      {item.status || "active"}
                    </p>
                  </div>
                </div>

                <div className="mt-5 flex items-center gap-3">
                  {item.team?.logo_url ? (
                    <img
                      src={item.team.logo_url}
                      alt={item.team.name}
                      className="h-8 w-8 rounded-full bg-white object-contain p-1"
                    />
                  ) : (
                    <div className="h-8 w-8 rounded-full bg-white/10" />
                  )}

                  <span className="text-sm text-zinc-400">
                    {item.team?.name}
                  </span>
                </div>
              </div>
            </Link>
          ))}

          {players.length === 0 && (
            <div className="rounded-3xl border border-dashed border-white/15 p-10 text-center text-zinc-500 md:col-span-2 lg:col-span-3">
              ยังไม่มีรายชื่อนักเตะในซีซั่นนี้
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
