import Link from "next/link";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

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
  school_name: string | null;
  nickname: string | null;
  logo_url: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  description: string | null;
};

type SeasonTeam = {
  id: string;
  season_id: string;
  team: Team | null;
};

type SeasonTeamQueryRow = Omit<SeasonTeam, "team"> & {
  team: SupabaseRelation<Team>;
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

export default async function TeamsPage({
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
        .from("season_teams")
        .select(`
          id,
          season_id,
          team:team_id(
            id,
            name,
            short_name,
            slug,
            school_name,
            nickname,
            logo_url,
            primary_color,
            secondary_color,
            description
          )
        `)
        .eq("season_id", selectedSeasonId)
        .order("id", { ascending: true })
    : { data: [], error: null };

  const seasonTeams: SeasonTeam[] = (
    (data || []) as SeasonTeamQueryRow[]
  ).map((seasonTeam) => ({
    ...seasonTeam,
    team: normalizeRelation(seasonTeam.team),
  }));

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <div className="mb-8">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-red-300">
          Teams
        </p>

        <h1 className="mt-2 text-4xl font-black">ทีมเข้าร่วม</h1>

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
                href={`/teams?season=${season.id}`}
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

      <div className="grid gap-5 md:grid-cols-2">
        {seasonTeams.map((item) => {
          const team = item.team;
          if (!team) return null;

          return (
            <Link
              key={item.id}
              href={`/teams/${team.slug}?season=${selectedSeasonId}`}
              className="group rounded-3xl border border-white/10 bg-zinc-900 p-6 transition hover:border-red-400/50 hover:bg-zinc-800"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-red-300">
                    {team.short_name}
                  </p>

                  <h2 className="mt-2 text-2xl font-black">{team.name}</h2>

                  <p className="mt-1 text-sm text-zinc-400">
                    {team.school_name}
                  </p>

                  {team.nickname && (
                    <p className="mt-4 inline-flex rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-zinc-300">
                      {team.nickname}
                    </p>
                  )}
                </div>

               {team.logo_url ? (
  <img
    src={team.logo_url}
    alt={team.name}
    className="h-50 w-50 object-contain drop-shadow-[0_0_10px_rgba(255,255,255,0.15)]"
  />
) : (
                  <div
                    className="h-16 w-16 shrink-0 rounded-2xl border border-white/20"
                    style={{ background: team.primary_color || "#ffffff" }}
                  />
                )}
              </div>

              {team.description && (
                <p className="mt-5 line-clamp-2 text-sm leading-6 text-zinc-500 group-hover:text-zinc-300">
                  {team.description}
                </p>
              )}

              <p className="mt-6 text-sm font-bold text-zinc-500 group-hover:text-zinc-300">
                ดูรายละเอียดทีม →
              </p>
            </Link>
          );
        })}

        {seasonTeams.length === 0 && (
          <div className="rounded-3xl border border-dashed border-white/15 p-10 text-center text-zinc-500 md:col-span-2">
            ยังไม่มีทีมในซีซั่นนี้
          </div>
        )}
      </div>
    </main>
  );
}
