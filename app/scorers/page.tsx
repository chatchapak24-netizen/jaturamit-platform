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

type GoalPlayer = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  nickname: string | null;
  photo_url: string | null;
};

type GoalTeam = {
  id: string;
  name: string;
  short_name: string | null;
  logo_url: string | null;
};

type GoalEvent = {
  id: string;
  event_type: string;
  player_id: string | null;
  team_id: string | null;
  player: GoalPlayer | null;
  team: GoalTeam | null;
  match: {
    season_id: string;
  } | null;
};

type GoalEventQueryRow = Omit<GoalEvent, "player" | "team" | "match"> & {
  player: SupabaseRelation<GoalPlayer>;
  team: SupabaseRelation<GoalTeam>;
  match: SupabaseRelation<{ season_id: string }>;
};

type SeasonPlayer = {
  player_id: string;
  team_id: string;
  shirt_number: number | null;
  position: string | null;
};

type ScorerRow = {
  player_id: string;
  team_id: string;
  goals: number;
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

function playerName(player: ScorerRow["player"]) {
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

export default async function ScorersPage({
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
    { data: goalData, error: goalError },
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
          .eq("event_type", "goal")
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

  const goals: GoalEvent[] = ((goalData || []) as GoalEventQueryRow[]).map(
    (goal) => ({
      ...goal,
      player: normalizeRelation(goal.player),
      team: normalizeRelation(goal.team),
      match: normalizeRelation(goal.match),
    })
  );
  const roster = (rosterData || []) as SeasonPlayer[];

  const scorerMap = new Map<string, ScorerRow>();

  goals.forEach((goal) => {
    if (!goal.player_id || !goal.team_id) return;

    const key = `${goal.player_id}-${goal.team_id}`;
    const rosterInfo = roster.find(
      (item) =>
        item.player_id === goal.player_id && item.team_id === goal.team_id
    );

    const existing = scorerMap.get(key);

    if (existing) {
      existing.goals += 1;
      return;
    }

    scorerMap.set(key, {
      player_id: goal.player_id,
      team_id: goal.team_id,
      goals: 1,
      shirt_number: rosterInfo?.shirt_number ?? null,
      position: rosterInfo?.position ?? null,
      player: goal.player
        ? {
            first_name: goal.player.first_name,
            last_name: goal.player.last_name,
            nickname: goal.player.nickname,
            photo_url: goal.player.photo_url,
          }
        : null,
      team: goal.team
        ? {
            name: goal.team.name,
            short_name: goal.team.short_name,
            logo_url: goal.team.logo_url,
          }
        : null,
    });
  });

  const scorers = Array.from(scorerMap.values()).sort((a, b) => {
    if (b.goals !== a.goals) return b.goals - a.goals;
    return (a.shirt_number || 999) - (b.shirt_number || 999);
  });

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <div className="mb-8">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-red-300">
          Top Scorers
        </p>

        <h1 className="mt-2 text-4xl font-black">ดาวซัลโว</h1>

        <p className="mt-3 text-zinc-400">
          {selectedSeason?.competition?.name || "รายการแข่งขัน"} ·{" "}
          {selectedSeason?.name || "ซีซั่น"}{" "}
          {selectedSeason?.year ? `· ${selectedSeason.year}` : ""}
        </p>
      </div>

      {(seasonError || goalError || rosterError) && (
        <div className="mb-6 rounded-2xl border border-red-500/40 bg-red-950/40 p-4 text-red-200">
          {seasonError?.message || goalError?.message || rosterError?.message}
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
                href={`/scorers?season=${season.id}`}
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
          <h2 className="text-2xl font-black">อันดับผู้ทำประตู</h2>
          <p className="text-sm text-zinc-500">
            นับจากเหตุการณ์ประเภท “ประตู” ในแมตช์ของซีซั่นนี้
          </p>
        </div>

        <div className="grid gap-4">
          {scorers.map((row, index) => (
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

                    <h3 className="mt-1 text-2xl font-black">
                      {row.shirt_number ? `#${row.shirt_number} ` : ""}
                      {playerName(row.player)}
                    </h3>

                    <p className="mt-1 text-sm text-zinc-500">
                      {positionLabel(row.position)}
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <p className="text-4xl font-black text-red-300">
                    {row.goals}
                  </p>
                  <p className="text-sm text-zinc-500">ประตู</p>
                </div>
              </div>
            </article>
          ))}

          {scorers.length === 0 && (
            <div className="rounded-3xl border border-dashed border-white/15 p-10 text-center text-zinc-500">
              ยังไม่มีข้อมูลผู้ทำประตูในซีซั่นนี้
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
