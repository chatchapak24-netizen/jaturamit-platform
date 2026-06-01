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

type StandingTeam = {
  name: string;
  short_name: string | null;
  logo_url: string | null;
};

type Standing = {
  id: string;
  season_id: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goals_for: number;
  goals_against: number;
  goal_difference: number;
  points: number;
  team: StandingTeam | null;
};

type StandingQueryRow = Omit<Standing, "team"> & {
  team: SupabaseRelation<StandingTeam>;
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

export default async function StandingsPage({
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
        .from("standings")
        .select(`
          id,
          season_id,
          played,
          won,
          drawn,
          lost,
          goals_for,
          goals_against,
          goal_difference,
          points,
          team:team_id(
            name,
            short_name,
            logo_url
          )
        `)
        .eq("season_id", selectedSeasonId)
        .order("points", { ascending: false })
        .order("goal_difference", { ascending: false })
        .order("goals_for", { ascending: false })
    : { data: [], error: null };

  const standings: Standing[] = ((data || []) as StandingQueryRow[]).map(
    (standing) => ({
      ...standing,
      team: normalizeRelation(standing.team),
    })
  );

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <div className="mb-8">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-red-300">
          Standings
        </p>

        <h1 className="mt-2 text-4xl font-black">ตารางคะแนน</h1>

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
                href={`/standings?season=${season.id}`}
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
          <h2 className="text-2xl font-black">อันดับทีม</h2>
          <p className="text-sm text-zinc-500">
            เรียงตาม แต้ม / ผลต่างประตู / ประตูได้
          </p>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-white/10">
          <table className="w-full min-w-[900px] text-sm">
            <thead className="bg-white/10 text-zinc-300">
              <tr>
                <th className="px-4 py-3 text-center">อันดับ</th>
                <th className="px-4 py-3 text-left">ทีม</th>
                <th className="px-4 py-3 text-center">แข่ง</th>
                <th className="px-4 py-3 text-center">ชนะ</th>
                <th className="px-4 py-3 text-center">เสมอ</th>
                <th className="px-4 py-3 text-center">แพ้</th>
                <th className="px-4 py-3 text-center">ได้</th>
                <th className="px-4 py-3 text-center">เสีย</th>
                <th className="px-4 py-3 text-center">ได้เสีย</th>
                <th className="px-4 py-3 text-center">แต้ม</th>
              </tr>
            </thead>

            <tbody>
              {standings.map((row, index) => (
                <tr key={row.id} className="border-t border-white/10">
                  <td className="px-4 py-4 text-center font-black text-red-300">
                    {index + 1}
                  </td>

                  <td className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      {row.team?.logo_url ? (
                        <img
                          src={row.team.logo_url}
                          alt={row.team.name}
                          className="h-10 w-10 rounded-full bg-white object-contain p-1"
                        />
                      ) : (
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-xs text-zinc-500">
                          {row.team?.short_name?.slice(0, 2) || "TM"}
                        </div>
                      )}

                      <div>
                        <p className="font-black">
                          {row.team?.short_name || row.team?.name}
                        </p>
                        <p className="text-xs text-zinc-500">
                          {row.team?.name}
                        </p>
                      </div>
                    </div>
                  </td>

                  <td className="px-4 py-4 text-center">{row.played}</td>
                  <td className="px-4 py-4 text-center">{row.won}</td>
                  <td className="px-4 py-4 text-center">{row.drawn}</td>
                  <td className="px-4 py-4 text-center">{row.lost}</td>
                  <td className="px-4 py-4 text-center">{row.goals_for}</td>
                  <td className="px-4 py-4 text-center">{row.goals_against}</td>
                  <td className="px-4 py-4 text-center">
                    {row.goal_difference}
                  </td>
                  <td className="px-4 py-4 text-center text-xl font-black text-red-300">
                    {row.points}
                  </td>
                </tr>
              ))}

              {standings.length === 0 && (
                <tr>
                  <td
                    colSpan={10}
                    className="px-4 py-10 text-center text-zinc-500"
                  >
                    ยังไม่มีตารางคะแนนในซีซั่นนี้
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
