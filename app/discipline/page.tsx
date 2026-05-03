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

type CardPlayer = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  nickname: string | null;
  photo_url: string | null;
};

type CardTeam = {
  id: string;
  name: string;
  short_name: string | null;
  logo_url: string | null;
};

type CardEvent = {
  id: string;
  event_type: string;
  player_id: string | null;
  team_id: string | null;
  player: CardPlayer | null;
  team: CardTeam | null;
  match: {
    season_id: string;
  } | null;
};

type CardEventQueryRow = Omit<CardEvent, "player" | "team" | "match"> & {
  player: SupabaseRelation<CardPlayer>;
  team: SupabaseRelation<CardTeam>;
  match: SupabaseRelation<{ season_id: string }>;
};

type SeasonPlayer = {
  player_id: string;
  team_id: string;
  shirt_number: number | null;
  position: string | null;
};

type DisciplineRow = {
  player_id: string;
  team_id: string;
  yellow_cards: number;
  red_cards: number;
  total_cards: number;
  shirt_number: number | null;
  position: string | null;
  player: {
    first_name: string | null;
    last_name: string | null;
    nickname: string | null;
    photo_url: string | null;
  } | null;
  team: {
    name: string;
    short_name: string | null;
    logo_url: string | null;
  } | null;
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

function playerName(player: DisciplineRow["player"]) {
  if (!player) return "ไม่ระบุชื่อ";

  const fullName = [player.first_name, player.last_name]
    .filter(Boolean)
    .join(" ");

  return player.nickname || fullName || "ไม่ระบุชื่อ";
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

export default async function DisciplinePage({
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

  const [
    { data: cardData, error: cardError },
    { data: rosterData, error: rosterError },
  ] = selectedSeasonId
    ? await Promise.all([
        supabase
          .from("match_events")
          .select(`
            id,
            event_type,
            player_id,
            team_id,
            player:player_id(
              id,
              first_name,
              last_name,
              nickname,
              photo_url
            ),
            team:team_id(
              id,
              name,
              short_name,
              logo_url
            ),
            match:match_id!inner(
              season_id
            )
          `)
          .in("event_type", ["yellow_card", "red_card"])
          .eq("match.season_id", selectedSeasonId),

        supabase
          .from("season_players")
          .select(`
            player_id,
            team_id,
            shirt_number,
            position
          `)
          .eq("season_id", selectedSeasonId),
      ])
    : [
        { data: [], error: null },
        { data: [], error: null },
      ];

  const cardEvents: CardEvent[] = ((cardData || []) as CardEventQueryRow[]).map(
    (event) => ({
      ...event,
      player: normalizeRelation(event.player),
      team: normalizeRelation(event.team),
      match: normalizeRelation(event.match),
    })
  );
  const roster = (rosterData || []) as SeasonPlayer[];

  const disciplineMap = new Map<string, DisciplineRow>();

  cardEvents.forEach((event) => {
    if (!event.player_id || !event.team_id) return;

    const key = `${event.player_id}-${event.team_id}`;
    const rosterInfo = roster.find(
      (item) =>
        item.player_id === event.player_id && item.team_id === event.team_id
    );

    const existing = disciplineMap.get(key);

    if (existing) {
      if (event.event_type === "yellow_card") existing.yellow_cards += 1;
      if (event.event_type === "red_card") existing.red_cards += 1;
      existing.total_cards = existing.yellow_cards + existing.red_cards;
      return;
    }

    disciplineMap.set(key, {
      player_id: event.player_id,
      team_id: event.team_id,
      yellow_cards: event.event_type === "yellow_card" ? 1 : 0,
      red_cards: event.event_type === "red_card" ? 1 : 0,
      total_cards: 1,
      shirt_number: rosterInfo?.shirt_number ?? null,
      position: rosterInfo?.position ?? null,
      player: event.player
        ? {
            first_name: event.player.first_name,
            last_name: event.player.last_name,
            nickname: event.player.nickname,
            photo_url: event.player.photo_url,
          }
        : null,
      team: event.team
        ? {
            name: event.team.name,
            short_name: event.team.short_name,
            logo_url: event.team.logo_url,
          }
        : null,
    });
  });

  const disciplineRows = Array.from(disciplineMap.values()).sort((a, b) => {
    if (b.red_cards !== a.red_cards) return b.red_cards - a.red_cards;
    if (b.yellow_cards !== a.yellow_cards) return b.yellow_cards - a.yellow_cards;
    return (a.shirt_number || 999) - (b.shirt_number || 999);
  });

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <div className="mb-8">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-red-300">
          Discipline
        </p>

        <h1 className="mt-2 text-4xl font-black">วินัยนักเตะ</h1>

        <p className="mt-3 text-zinc-400">
          {selectedSeason?.competition?.name || "รายการแข่งขัน"} ·{" "}
          {selectedSeason?.name || "ซีซั่น"}{" "}
          {selectedSeason?.year ? `· ${selectedSeason.year}` : ""}
        </p>
      </div>

      {(seasonError || cardError || rosterError) && (
        <div className="mb-6 rounded-2xl border border-red-500/40 bg-red-950/40 p-4 text-red-200">
          {seasonError?.message || cardError?.message || rosterError?.message}
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
                href={`/discipline?season=${season.id}`}
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
          <h2 className="text-2xl font-black">สรุปใบเหลือง / ใบแดง</h2>
          <p className="text-sm text-zinc-500">
            นับเฉพาะเหตุการณ์ในซีซั่นที่เลือก
          </p>
        </div>

        <div className="grid gap-4">
          {disciplineRows.map((row, index) => (
            <article
              key={`${row.player_id}-${row.team_id}`}
              className="rounded-3xl border border-white/10 bg-zinc-950 p-5"
            >
              <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white text-xl font-black text-zinc-950">
                    {index + 1}
                  </div>

                  {row.player?.photo_url ? (
                    <img
                      src={row.player.photo_url}
                      alt={playerName(row.player)}
                      className="h-16 w-16 rounded-2xl bg-white object-cover"
                    />
                  ) : (
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10 text-sm font-black text-zinc-500">
                      {row.shirt_number ?? "-"}
                    </div>
                  )}

                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.25em] text-red-300">
                      {row.team?.short_name || row.team?.name}
                    </p>

                    <Link
                      href={`/players/${row.player_id}`}
                      className="mt-1 block text-2xl font-black hover:text-red-200"
                    >
                      {row.shirt_number ? `#${row.shirt_number} ` : ""}
                      {playerName(row.player)}
                    </Link>

                    <p className="mt-1 text-sm text-zinc-500">
                      {positionLabel(row.position)}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="rounded-2xl border border-white/10 bg-white/5 px-5 py-4">
                    <p className="text-xs text-zinc-500">รวม</p>
                    <p className="mt-1 text-3xl font-black text-zinc-100">
                      {row.total_cards}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-yellow-500/30 bg-yellow-950/20 px-5 py-4">
                    <p className="text-xs text-yellow-200">เหลือง</p>
                    <p className="mt-1 text-3xl font-black text-yellow-300">
                      {row.yellow_cards}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-red-500/30 bg-red-950/20 px-5 py-4">
                    <p className="text-xs text-red-200">แดง</p>
                    <p className="mt-1 text-3xl font-black text-red-400">
                      {row.red_cards}
                    </p>
                  </div>
                </div>
              </div>
            </article>
          ))}

          {disciplineRows.length === 0 && (
            <div className="rounded-3xl border border-dashed border-white/15 p-10 text-center text-zinc-500">
              ยังไม่มีข้อมูลใบเหลือง/ใบแดงในซีซั่นนี้
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
