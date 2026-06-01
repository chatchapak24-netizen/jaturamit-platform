"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { supabaseBrowser } from "@/lib/supabase-browser";
import type { ArenaContest, ArenaRankingEntry } from "@/lib/arena";

type VoteResponse = {
  success: boolean;
  message: string;
  entry_id: string | null;
  total_votes: number | string | null;
};

type ArenaVotePanelProps = {
  contest: ArenaContest;
  initialRanking: ArenaRankingEntry[];
};

function storageKey(contestId: string) {
  return `arena-vote-token:${contestId}`;
}

function votedKey(contestId: string) {
  return `arena-voted-entry:${contestId}`;
}

function getOrCreateVoteToken(contestId: string) {
  const key = storageKey(contestId);
  const existingToken = window.localStorage.getItem(key);

  if (existingToken) {
    return existingToken;
  }

  const nextToken = window.crypto.randomUUID();
  window.localStorage.setItem(key, nextToken);
  return nextToken;
}

export default function ArenaVotePanel({
  contest,
  initialRanking,
}: ArenaVotePanelProps) {
  const [ranking, setRanking] = useState(initialRanking);
  const [selectedEntryId, setSelectedEntryId] = useState(
    initialRanking[0]?.entry_id || "",
  );
  const [votedEntryId, setVotedEntryId] = useState(() => {
    if (typeof window === "undefined") {
      return "";
    }

    return window.localStorage.getItem(votedKey(contest.id)) || "";
  });
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  const selectedEntry = useMemo(
    () => ranking.find((entry) => entry.entry_id === selectedEntryId) || null,
    [ranking, selectedEntryId],
  );
  const totalVotes = useMemo(
    () => ranking.reduce((sum, entry) => sum + entry.vote_count, 0),
    [ranking],
  );

  async function refreshRanking() {
    const { data } = await supabaseBrowser.rpc("get_arena_ranking", {
      p_contest_id: contest.id,
    });

    const nextRanking = ((data || []) as ArenaRankingEntry[]).map((entry) => ({
      ...entry,
      vote_count: Number(entry.vote_count || 0),
      rank_position: Number(entry.rank_position || 0),
    }));

    if (nextRanking.length > 0) {
      setRanking(nextRanking);
    }
  }

  async function submitVote() {
    if (!selectedEntryId || submitting || votedEntryId) {
      return;
    }

    setSubmitting(true);
    setMessage("");

    const token = getOrCreateVoteToken(contest.id);
    const { data, error } = await supabaseBrowser.rpc("cast_arena_vote", {
      p_contest_id: contest.id,
      p_entry_id: selectedEntryId,
      p_voter_token: token,
      p_voter_label: null,
    });

    if (error) {
      setMessage("Vote could not be submitted. Please try again. (ส่งโหวตไม่สำเร็จ กรุณาลองใหม่)");
      setSubmitting(false);
      return;
    }

    const response = Array.isArray(data)
      ? (data[0] as VoteResponse | undefined)
      : undefined;

    if (response?.success) {
      window.localStorage.setItem(votedKey(contest.id), selectedEntryId);
      setVotedEntryId(selectedEntryId);
      setMessage("Your arena vote has been counted. (นับโหวตอารีนาของคุณแล้ว)");
      await refreshRanking();
      setSubmitting(false);
      return;
    }

    setMessage(response?.message || "This arena vote was not counted. (โหวตอารีนานี้ไม่ถูกนับ)");
    await refreshRanking();
    setSubmitting(false);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
      <section className="rounded-2xl border border-white/10 bg-zinc-900 p-5 md:p-7">
        <p className="text-xs font-bold uppercase tracking-[0.24em] text-red-300">
          Arena Vote (โหวตอารีนา)
        </p>
        <h2 className="mt-2 text-2xl font-black">Choose your side (เลือกฝั่งของคุณ)</h2>
        <p className="mt-2 text-sm leading-6 text-zinc-400">
          One vote is counted per device for this arena. The ranking updates
          after your vote is accepted. (หนึ่งอุปกรณ์โหวตได้หนึ่งครั้งสำหรับอารีนานี้ และอันดับจะอัปเดตหลังระบบรับโหวต)
        </p>

        <div className="mt-6 grid gap-3">
          {ranking.map((entry) => {
            const isSelected = entry.entry_id === selectedEntryId;
            const isVoted = entry.entry_id === votedEntryId;

            return (
              <button
                key={entry.entry_id}
                type="button"
                onClick={() => setSelectedEntryId(entry.entry_id)}
                disabled={Boolean(votedEntryId)}
                className={`rounded-xl border p-4 text-left transition ${
                  isSelected
                    ? "border-red-300 bg-red-950/40"
                    : "border-white/10 bg-zinc-950 hover:border-red-300/60"
                } ${votedEntryId ? "cursor-default" : ""}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-lg font-black">{entry.display_name}</p>
                    <p className="mt-1 text-sm text-zinc-400">
                      {entry.short_name || entry.slug}
                      {entry.color_label ? ` / ${entry.color_label}` : ""}
                    </p>
                  </div>
                  <span className="rounded-full border border-white/10 px-3 py-1 text-xs font-black text-red-100">
                    #{entry.rank_position || "-"}
                  </span>
                </div>
                {isVoted ? (
                  <p className="mt-3 text-xs font-bold uppercase tracking-[0.18em] text-emerald-200">
                    Your vote (โหวตของคุณ)
                  </p>
                ) : null}
              </button>
            );
          })}
        </div>

        {message ? (
          <p className="mt-4 rounded-xl border border-white/10 bg-zinc-950 p-4 text-sm text-zinc-200">
            {message}
          </p>
        ) : null}

        <button
          type="button"
          onClick={submitVote}
          disabled={submitting || !selectedEntry || Boolean(votedEntryId)}
          className="mt-5 w-full rounded-xl bg-red-600 px-5 py-4 text-base font-black text-white transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {votedEntryId
            ? "Vote submitted (ส่งโหวตแล้ว)"
            : submitting
              ? "Submitting vote... (กำลังส่งโหวต)"
              : "Submit arena vote (ส่งโหวตอารีนา)"}
        </button>
      </section>

      <section className="rounded-2xl border border-white/10 bg-zinc-900 p-5 md:p-7">
        <div className="flex flex-col gap-2 border-b border-white/10 pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-red-300">
              Live Ranking (อันดับสด)
            </p>
            <h2 className="mt-2 text-2xl font-black">Arena leaderboard (ตารางอันดับอารีนา)</h2>
          </div>
          <p className="text-sm font-bold text-zinc-400">
            {totalVotes.toLocaleString("th-TH")} votes (โหวต)
          </p>
        </div>

        <div className="mt-5 grid gap-3">
          {ranking.map((entry) => {
            const percent =
              totalVotes > 0 ? Math.round((entry.vote_count / totalVotes) * 100) : 0;

            return (
              <div
                key={entry.entry_id}
                className="rounded-xl border border-white/10 bg-zinc-950 p-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.22em] text-red-300">
                      Rank (อันดับ) {entry.rank_position}
                    </p>
                    <p className="mt-1 font-black">{entry.display_name}</p>
                  </div>
                  <p className="text-right text-lg font-black">
                    {entry.vote_count.toLocaleString("th-TH")}
                  </p>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-red-500"
                    style={{ width: `${percent}%` }}
                  />
                </div>
                <p className="mt-2 text-xs text-zinc-500">
                  {percent}% share (สัดส่วน)
                </p>
              </div>
            );
          })}
        </div>

        <Link
          href="/arena/ranking"
          className="mt-5 inline-flex rounded-xl border border-white/10 px-4 py-3 text-sm font-black text-zinc-200 hover:bg-white/10"
        >
          Open full ranking (เปิดตารางอันดับทั้งหมด)
        </Link>
      </section>
    </div>
  );
}
