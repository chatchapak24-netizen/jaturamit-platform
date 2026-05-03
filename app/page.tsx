import Link from "next/link";
import { supabase } from "@/lib/supabase";
import HomeNewsSlider from "@/components/HomeNewsSlider";

type SupabaseRelation<T> = T | T[] | null;

type Season = {
  id: string;
  name: string;
  year: number | null;
  status: string | null;
  cover_image_url: string | null;
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
  nickname: string | null;
  logo_url: string | null;
  primary_color: string | null;
};

type SeasonTeam = {
  id: string;
  team: Team | null;
};

type SeasonTeamQueryRow = Omit<SeasonTeam, "team"> & {
  team: SupabaseRelation<Team>;
};

type MatchTeam = {
  name: string;
  short_name: string | null;
};

type Match = {
  id: string;
  match_date: string;
  kickoff_time: string;
  venue: string | null;
  round: string | null;
  matchday: number | null;
  status: string | null;
  home_score: number | null;
  away_score: number | null;
  home_team: MatchTeam | null;
  away_team: MatchTeam | null;
};

type MatchQueryRow = Omit<Match, "home_team" | "away_team"> & {
  home_team: SupabaseRelation<MatchTeam>;
  away_team: SupabaseRelation<MatchTeam>;
};

type TeamMini = {
  name: string;
  short_name: string | null;
  logo_url: string | null;
};

type Standing = {
  id: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goals_for: number;
  goals_against: number;
  goal_difference: number;
  points: number;
  team: TeamMini | null;
};

type StandingQueryRow = Omit<Standing, "team"> & {
  team: SupabaseRelation<TeamMini>;
};

type NewsItem = {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  cover_image_url: string | null;
  published_at: string | null;
};

type Sponsor = {
  id: string;
  name: string;
  logo_url: string | null;
  website_url: string | null;
  sponsor_tier: string | null;
  display_order: number | null;
};

type Lineup = {
  player_id: string;
  team_id: string;
  is_starter: boolean;
  minutes_played: number | null;
  shirt_number: number | null;
  position: string | null;
  player: PlayerMini | null;
  team: TeamMini | null;
};

type PlayerMini = {
  first_name: string | null;
  last_name: string | null;
  nickname: string | null;
  photo_url: string | null;
};

type LineupQueryRow = Omit<Lineup, "player" | "team"> & {
  player: SupabaseRelation<PlayerMini>;
  team: SupabaseRelation<TeamMini>;
};

type MatchEvent = {
  id: string;
  player_id: string | null;
  team_id: string | null;
  event_type: string;
  player: PlayerMini | null;
  team: TeamMini | null;
};

type MatchEventQueryRow = Omit<MatchEvent, "player" | "team"> & {
  player: SupabaseRelation<PlayerMini>;
  team: SupabaseRelation<TeamMini>;
};

type PlayerMiniStat = {
  player_id: string;
  team_id: string;
  shirt_number: number | null;
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
  goals: number;
  yellow_cards: number;
  red_cards: number;
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

function normalizeSeason(row: SeasonQueryRow): Season {
  return {
    ...row,
    competition: normalizeSeasonCompetition(row.competition),
  };
}

function playerName(player: PlayerMiniStat["player"]) {
  if (!player) return "ไม่ระบุชื่อ";

  const fullName = [player.first_name, player.last_name]
    .filter(Boolean)
    .join(" ");

  return player.nickname || fullName || "ไม่ระบุชื่อ";
}

async function getHomepageSeason() {
  const { data: settingData } = await supabase
    .from("site_settings")
    .select("value")
    .eq("key", "homepage_season_id")
    .single();

  const homepageSeasonId = settingData?.value || "";

  if (homepageSeasonId) {
    const { data: selectedSeasonData } = await supabase
      .from("seasons")
      .select(`
        id,
        name,
        year,
        status,
        cover_image_url,
        competition:competition_id(
          name,
          slug
        )
      `)
      .eq("id", homepageSeasonId)
      .single();

    if (selectedSeasonData) {
      return normalizeSeason(selectedSeasonData as SeasonQueryRow);
    }
  }

  const { data: fallbackSeasonData } = await supabase
    .from("seasons")
    .select(`
      id,
      name,
      year,
      status,
      cover_image_url,
      competition:competition_id(
        name,
        slug
      )
    `)
    .eq("status", "active")
    .single();

  return fallbackSeasonData
    ? normalizeSeason(fallbackSeasonData as SeasonQueryRow)
    : null;
}

export default async function Home() {
  const activeSeason = await getHomepageSeason();
  const seasonId = activeSeason?.id || "";

  const [
    seasonTeamsResult,
    matchesResult,
    standingsResult,
    lineupResult,
    eventResult,
    newsResult,
    sponsorsResult,
  ] = seasonId
    ? await Promise.all([
        supabase
          .from("season_teams")
          .select(`
            id,
            team:team_id(
              id,
              name,
              short_name,
              slug,
              nickname,
              logo_url,
              primary_color
            )
          `)
          .eq("season_id", seasonId),

        supabase
          .from("matches")
          .select(`
            id,
            match_date,
            kickoff_time,
            venue,
            round,
            matchday,
            status,
            home_score,
            away_score,
            home_team:home_team_id(name, short_name),
            away_team:away_team_id(name, short_name)
          `)
          .eq("season_id", seasonId)
          .order("match_date", { ascending: true })
          .order("kickoff_time", { ascending: true }),

        supabase
          .from("standings")
          .select(`
            id,
            played,
            won,
            drawn,
            lost,
            goals_for,
            goals_against,
            goal_difference,
            points,
            team:team_id(name, short_name, logo_url)
          `)
          .eq("season_id", seasonId)
          .order("points", { ascending: false })
          .order("goal_difference", { ascending: false })
          .order("goals_for", { ascending: false }),

        supabase
          .from("match_lineups")
          .select(`
            player_id,
            team_id,
            is_starter,
            minutes_played,
            shirt_number,
            position,
            player:player_id(
              first_name,
              last_name,
              nickname,
              photo_url
            ),
            team:team_id(
              name,
              short_name,
              logo_url
            ),
            match:match_id!inner(
              season_id
            )
          `)
          .eq("match.season_id", seasonId),

        supabase
          .from("match_events")
          .select(`
            id,
            player_id,
            team_id,
            event_type,
            player:player_id(
              first_name,
              last_name,
              nickname,
              photo_url
            ),
            team:team_id(
              name,
              short_name,
              logo_url
            ),
            match:match_id!inner(
              season_id
            )
          `)
          .eq("match.season_id", seasonId),

        supabase
          .from("news")
          .select("id, title, slug, excerpt, cover_image_url, published_at")
          .eq("status", "published")
          .order("published_at", { ascending: false })
          .limit(5),

        supabase
          .from("sponsors")
          .select("id, name, logo_url, website_url, sponsor_tier, display_order")
          .eq("status", "active")
          .order("display_order", { ascending: true })
          .order("name", { ascending: true })
          .limit(8),
      ])
    : [
        { data: [] },
        { data: [] },
        { data: [] },
        { data: [] },
        { data: [] },
        { data: [] },
        { data: [] },
      ];

  const seasonTeams: SeasonTeam[] = (
    (seasonTeamsResult.data || []) as SeasonTeamQueryRow[]
  ).map((seasonTeam) => ({
    ...seasonTeam,
    team: normalizeRelation(seasonTeam.team),
  }));
  const teams = seasonTeams.map((item) => item.team).filter(Boolean) as Team[];

  const matches: Match[] = ((matchesResult.data || []) as MatchQueryRow[]).map(
    (match) => ({
      ...match,
      home_team: normalizeRelation(match.home_team),
      away_team: normalizeRelation(match.away_team),
    })
  );
  const standings: Standing[] = (
    (standingsResult.data || []) as StandingQueryRow[]
  ).map((standing) => ({
    ...standing,
    team: normalizeRelation(standing.team),
  }));
  const lineups: Lineup[] = ((lineupResult.data || []) as LineupQueryRow[]).map(
    (lineup) => ({
      ...lineup,
      player: normalizeRelation(lineup.player),
      team: normalizeRelation(lineup.team),
    })
  );
  const events: MatchEvent[] = (
    (eventResult.data || []) as MatchEventQueryRow[]
  ).map((event) => ({
    ...event,
    player: normalizeRelation(event.player),
    team: normalizeRelation(event.team),
  }));
  const latestNews = (newsResult.data || []) as NewsItem[];
  const sponsors = (sponsorsResult.data || []) as Sponsor[];

  const finishedMatches = matches.filter((match) => match.status === "finished");
  const upcomingMatches = matches.filter((match) => match.status !== "finished");

  const nextMatches = upcomingMatches.slice(0, 2);
  const latestFinishedMatches = finishedMatches.slice(-2).reverse();

  const playerMap = new Map<string, PlayerMiniStat>();

  function ensurePlayer(params: {
    player_id: string;
    team_id: string;
    shirt_number?: number | null;
    player?: PlayerMiniStat["player"];
    team?: PlayerMiniStat["team"];
  }) {
    const key = `${params.player_id}-${params.team_id}`;

    const existing = playerMap.get(key);
    if (existing) return existing;

    const created: PlayerMiniStat = {
      player_id: params.player_id,
      team_id: params.team_id,
      shirt_number: params.shirt_number ?? null,
      player: params.player || null,
      team: params.team || null,
      goals: 0,
      yellow_cards: 0,
      red_cards: 0,
    };

    playerMap.set(key, created);
    return created;
  }

  lineups.forEach((lineup) => {
    if (!lineup.player_id || !lineup.team_id) return;

    ensurePlayer({
      player_id: lineup.player_id,
      team_id: lineup.team_id,
      shirt_number: lineup.shirt_number,
      player: lineup.player,
      team: lineup.team,
    });
  });

  events.forEach((event) => {
    if (!event.player_id || !event.team_id) return;

    const row = ensurePlayer({
      player_id: event.player_id,
      team_id: event.team_id,
      player: event.player,
      team: event.team,
    });

    if (event.event_type === "goal") row.goals += 1;
    if (event.event_type === "yellow_card") row.yellow_cards += 1;
    if (event.event_type === "red_card") row.red_cards += 1;
  });

  const scorers = Array.from(playerMap.values())
    .filter((player) => player.goals > 0)
    .sort((a, b) => b.goals - a.goals)
    .slice(0, 5);

  const discipline = Array.from(playerMap.values())
    .filter((player) => player.yellow_cards > 0 || player.red_cards > 0)
    .sort((a, b) => {
      if (b.red_cards !== a.red_cards) return b.red_cards - a.red_cards;
      return b.yellow_cards - a.yellow_cards;
    })
    .slice(0, 5);

  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <section className="mx-auto max-w-6xl px-6 py-12">
        <section className="relative overflow-hidden rounded-[32px] border border-white/10 shadow-2xl">
          {activeSeason?.cover_image_url ? (
            <img
              src={activeSeason.cover_image_url}
              alt={activeSeason.name || "season cover"}
              className="absolute inset-0 h-full w-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-red-950 via-zinc-900 to-zinc-950" />
          )}

          <div className="absolute inset-0 bg-black/45" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/40 to-black/60" />

          <div className="relative z-10 p-8 md:p-10">
            <p className="text-sm font-semibold uppercase tracking-[0.35em] text-red-200">
              Official Platform
            </p>

            <h1 className="mt-4 text-4xl font-black leading-tight tracking-tight md:text-6xl">
              {activeSeason?.competition?.name || "รายการแข่งขัน"}
            </h1>

            <p className="mt-3 max-w-2xl text-base leading-7 text-zinc-200">
              {activeSeason
                ? `${activeSeason.name}${
                    activeSeason.year ? ` · ${activeSeason.year}` : ""
                  }`
                : "ยังไม่ได้ตั้งค่าซีซั่นสำหรับหน้าแรก"}
            </p>

            <div className="mt-8 grid gap-4 md:grid-cols-4">
              <StatCard label="จำนวนทีม" value={teams.length.toString()} />
              <StatCard label="แมตช์ทั้งหมด" value={matches.length.toString()} />
              <StatCard
                label="แข่งจบแล้ว"
                value={finishedMatches.length.toString()}
              />
              <StatCard
                label="สถานะซีซั่น"
                value={activeSeason?.status || "none"}
              />
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href={`/fixtures?season=${seasonId}`}
                className="rounded-full bg-red-600 px-6 py-3 text-sm font-black text-white hover:bg-red-500"
              >
                ดูโปรแกรมแข่งขัน
              </Link>

              <Link
                href={`/standings?season=${seasonId}`}
                className="rounded-full border border-white/20 bg-black/20 px-6 py-3 text-sm font-black text-zinc-100 hover:bg-white/10"
              >
                ตารางคะแนน
              </Link>

              <Link
                href={`/player-stats?season=${seasonId}`}
                className="rounded-full border border-white/20 bg-black/20 px-6 py-3 text-sm font-black text-zinc-100 hover:bg-white/10"
              >
                สถิตินักเตะ
              </Link>

              <Link
                href="/tournaments"
                className="rounded-full border border-white/20 bg-black/20 px-6 py-3 text-sm font-black text-zinc-100 hover:bg-white/10"
              >
                เลือกทัวร์นาเมนต์
              </Link>
            </div>
          </div>
        </section>

        <HomeNewsSlider news={latestNews} />

        <section className="mt-10 grid gap-6 lg:grid-cols-2">
          <HomePanel title="โปรแกรมถัดไป" href={`/fixtures?season=${seasonId}`}>
            <div className="grid gap-4">
              {nextMatches.length === 0 && (
                <p className="text-sm text-zinc-500">ยังไม่มีโปรแกรมถัดไป</p>
              )}

              {nextMatches.map((match) => (
                <MatchCard key={match.id} match={match} />
              ))}
            </div>
          </HomePanel>

          <HomePanel
            title="ผลการแข่งขันล่าสุด"
            href={`/fixtures?season=${seasonId}`}
          >
            <div className="grid gap-4">
              {latestFinishedMatches.length === 0 && (
                <p className="text-sm text-zinc-500">ยังไม่มีผลการแข่งขัน</p>
              )}

              {latestFinishedMatches.map((match) => (
                <MatchCard key={match.id} match={match} />
              ))}
            </div>
          </HomePanel>
        </section>

        <section className="mt-10 grid gap-6 lg:grid-cols-2">
          <HomePanel title="ตารางคะแนน" href={`/standings?season=${seasonId}`}>
            <div className="overflow-hidden rounded-2xl border border-white/10">
              <table className="w-full text-sm">
                <thead className="bg-white/10 text-zinc-300">
                  <tr>
                    <th className="px-3 py-3 text-left">ทีม</th>
                    <th className="px-3 py-3 text-center">แข่ง</th>
                    <th className="px-3 py-3 text-center">ได้เสีย</th>
                    <th className="px-3 py-3 text-center">แต้ม</th>
                  </tr>
                </thead>

                <tbody>
                  {standings.map((row) => (
                    <tr key={row.id} className="border-t border-white/10">
                      <td className="px-3 py-3 font-semibold">
                        {row.team?.short_name || row.team?.name}
                      </td>
                      <td className="px-3 py-3 text-center">{row.played}</td>
                      <td className="px-3 py-3 text-center">
                        {row.goal_difference}
                      </td>
                      <td className="px-3 py-3 text-center font-black text-red-300">
                        {row.points}
                      </td>
                    </tr>
                  ))}

                  {standings.length === 0 && (
                    <tr>
                      <td
                        colSpan={4}
                        className="px-3 py-8 text-center text-zinc-500"
                      >
                        ยังไม่มีตารางคะแนน
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </HomePanel>

          <HomePanel title="ทีมเข้าร่วม" href={`/teams?season=${seasonId}`}>
            <div className="grid gap-3">
              {teams.map((team) => (
                <Link
                  key={team.id}
                  href={`/teams/${team.slug}?season=${seasonId}`}
                  className="flex items-center justify-between rounded-2xl border border-white/10 bg-zinc-950 p-4 hover:border-red-400/50"
                >
                  <div>
                    <p className="text-sm font-semibold text-red-300">
                      {team.short_name}
                    </p>
                    <p className="font-black">{team.name}</p>
                    {team.nickname && (
                      <p className="mt-1 text-xs text-zinc-500">
                        {team.nickname}
                      </p>
                    )}
                  </div>

                 {team.logo_url ? (
  <img
    src={team.logo_url}
    alt={team.name}
    className="h-12 w-12 object-contain drop-shadow-[0_0_10px_rgba(255,255,255,0.15)]"
  />
) : (
                    <div
                      className="h-10 w-10 rounded-full border border-white/20"
                      style={{ background: team.primary_color || "#ffffff" }}
                    />
                  )}
                </Link>
              ))}

              {teams.length === 0 && (
                <p className="text-sm text-zinc-500">
                  ยังไม่มีทีมในซีซั่นนี้
                </p>
              )}
            </div>
          </HomePanel>
        </section>

        <section className="mt-10 grid gap-6 lg:grid-cols-2">
          <HomePanel title="ดาวซัลโว" href={`/scorers?season=${seasonId}`}>
            <div className="grid gap-3">
              {scorers.length === 0 && (
                <p className="text-sm text-zinc-500">ยังไม่มีข้อมูลผู้ทำประตู</p>
              )}

              {scorers.map((player, index) => (
                <PlayerMiniRow
                  key={`${player.player_id}-${player.team_id}`}
                  rank={index + 1}
                  player={player}
                  value={`${player.goals} ประตู`}
                />
              ))}
            </div>
          </HomePanel>

          <HomePanel title="วินัยนักเตะ" href={`/discipline?season=${seasonId}`}>
            <div className="grid gap-3">
              {discipline.length === 0 && (
                <p className="text-sm text-zinc-500">
                  ยังไม่มีข้อมูลใบเหลือง/แดง
                </p>
              )}

              {discipline.map((player, index) => (
                <PlayerMiniRow
                  key={`${player.player_id}-${player.team_id}`}
                  rank={index + 1}
                  player={player}
                  value={`🟨 ${player.yellow_cards} / 🟥 ${player.red_cards}`}
                />
              ))}
            </div>
          </HomePanel>
        </section>

        <section className="mt-10 rounded-3xl border border-white/10 bg-zinc-900 p-6">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-2xl font-black">ผู้สนับสนุนรายการ</h2>
            <Link
              href="/sponsors"
              className="text-sm text-red-300 hover:text-red-200"
            >
              ดูทั้งหมด →
            </Link>
          </div>

          <div className="grid gap-4 md:grid-cols-4">
            {sponsors.length === 0 && (
              <p className="text-sm text-zinc-500 md:col-span-4">
                ยังไม่มีข้อมูลสปอนเซอร์
              </p>
            )}

            {sponsors.map((sponsor) => (
              <Link
                key={sponsor.id}
                href={sponsor.website_url || "/sponsors"}
                target={sponsor.website_url ? "_blank" : undefined}
                rel={sponsor.website_url ? "noreferrer" : undefined}
                className="group rounded-2xl border border-white/10 bg-zinc-950 p-4 transition hover:border-red-400/50 hover:bg-zinc-800"
              >
                <div className="flex h-24 items-center justify-center rounded-xl bg-white p-3">
                  {sponsor.logo_url ? (
                    <img
                      src={sponsor.logo_url}
                      alt={sponsor.name}
                      className="max-h-full max-w-full object-contain"
                    />
                  ) : (
                    <span className="text-xs font-black uppercase tracking-[0.2em] text-zinc-400">
                      Logo
                    </span>
                  )}
                </div>

                <p className="mt-3 text-center text-sm font-black group-hover:text-red-200">
                  {sponsor.name}
                </p>
              </Link>
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/15 bg-black/25 p-5 backdrop-blur-sm">
      <p className="text-sm text-zinc-300">{label}</p>
      <p className="mt-2 text-3xl font-black text-white">{value}</p>
    </div>
  );
}

function HomePanel({
  title,
  href,
  children,
}: {
  title: string;
  href: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-3xl border border-white/10 bg-zinc-900 p-6">
      <div className="mb-5 flex items-center justify-between">
        <h2 className="text-2xl font-black">{title}</h2>
        <Link href={href} className="text-sm text-red-300 hover:text-red-200">
          ดูทั้งหมด →
        </Link>
      </div>

      {children}
    </div>
  );
}

function MatchCard({ match }: { match: Match }) {
  return (
    <Link
      href={`/matches/${match.id}`}
      className="block rounded-2xl border border-white/10 bg-zinc-950 p-5 transition hover:border-red-400/50 hover:bg-zinc-800"
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 text-sm text-zinc-400">
        <span>
          นัดที่ {match.matchday || "-"} · {match.match_date} ·{" "}
          {match.kickoff_time?.slice(0, 5)} น.
        </span>
        <span>{match.venue}</span>
      </div>

      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4">
        <div className="text-right">
          <p className="font-black">{match.home_team?.short_name}</p>
          <p className="text-xs text-zinc-500">{match.home_team?.name}</p>
        </div>

        <div className="rounded-xl bg-white px-4 py-2 text-center font-black text-zinc-950">
          {match.status === "finished"
            ? `${match.home_score} - ${match.away_score}`
            : "VS"}
        </div>

        <div>
          <p className="font-black">{match.away_team?.short_name}</p>
          <p className="text-xs text-zinc-500">{match.away_team?.name}</p>
        </div>
      </div>
    </Link>
  );
}

function PlayerMiniRow({
  rank,
  player,
  value,
}: {
  rank: number;
  player: PlayerMiniStat;
  value: string;
}) {
  return (
    <Link
      href={`/players/${player.player_id}`}
      className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-zinc-950 p-4 hover:border-red-400/50 hover:bg-zinc-800"
    >
      <div className="flex items-center gap-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-sm font-black text-zinc-950">
          {rank}
        </div>

        {player.player?.photo_url ? (
          <img
            src={player.player.photo_url}
            alt={playerName(player.player)}
            className="h-10 w-10 rounded-xl bg-white object-cover"
          />
        ) : null}

        <div>
          <p className="font-black">
            {player.shirt_number ? `#${player.shirt_number} ` : ""}
            {playerName(player.player)}
          </p>
          <p className="text-xs text-zinc-500">
            {player.team?.short_name || player.team?.name}
          </p>
        </div>
      </div>

      <div className="text-sm font-black text-red-300">{value}</div>
    </Link>
  );
}
