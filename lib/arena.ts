import { supabase } from "@/lib/supabase";

export type ArenaContest = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  status: "draft" | "active" | "closed";
  starts_at: string | null;
  ends_at: string | null;
};

export type ArenaRankingEntry = {
  entry_id: string;
  slug: string;
  display_name: string;
  short_name: string | null;
  description: string | null;
  color_label: string | null;
  image_url: string | null;
  vote_count: number;
  rank_position: number;
};

type ArenaRankingRow = Omit<ArenaRankingEntry, "vote_count" | "rank_position"> & {
  vote_count: number | string | null;
  rank_position: number | string | null;
};

export async function getVisibleArenaContest() {
  const { data, error } = await supabase
    .from("arena_contests")
    .select("id, slug, title, description, status, starts_at, ends_at")
    .in("status", ["active", "closed"])
    .order("status", { ascending: true })
    .order("sort_order", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    return { contest: null, error: error?.message || null };
  }

  return { contest: data as ArenaContest, error: null };
}

export async function getArenaRanking(contestId: string | null) {
  if (!contestId) {
    return { ranking: [] as ArenaRankingEntry[], error: null };
  }

  const { data, error } = await supabase.rpc("get_arena_ranking", {
    p_contest_id: contestId,
  });

  if (error) {
    return { ranking: [] as ArenaRankingEntry[], error: error.message };
  }

  const ranking = ((data || []) as ArenaRankingRow[]).map((entry) => ({
    ...entry,
    vote_count: Number(entry.vote_count || 0),
    rank_position: Number(entry.rank_position || 0),
  }));

  return { ranking, error: null };
}
