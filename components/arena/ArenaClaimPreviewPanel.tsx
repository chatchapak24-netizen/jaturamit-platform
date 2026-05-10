"use client";

import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { supabaseBrowser } from "@/lib/supabase-browser";

type ClaimPreviewRow = {
  success: boolean;
  message: string;
  card_name: string | null;
  edition_name: string | null;
  rarity: string | null;
  serial_label: string | null;
  player_label: string | null;
  school_label: string | null;
  season_label: string | null;
  position_label: string | null;
};

type ArenaClaimPreviewPanelProps = {
  initialCode?: string;
};

function formatRarity(rarity: string | null) {
  if (!rarity) {
    return null;
  }

  return rarity
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export default function ArenaClaimPreviewPanel({
  initialCode = "",
}: ArenaClaimPreviewPanelProps) {
  const [claimCode, setClaimCode] = useState(initialCode);
  const [preview, setPreview] = useState<ClaimPreviewRow | null>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const loadingRef = useRef(false);
  const autoPreviewedCodeRef = useRef("");

  const normalizedCode = useMemo(() => claimCode.trim(), [claimCode]);
  const safeFields = useMemo(() => {
    if (!preview?.success) {
      return [];
    }

    return [
      ["Edition", preview.edition_name],
      ["Rarity", formatRarity(preview.rarity)],
      ["Serial", preview.serial_label],
      ["Player", preview.player_label],
      ["School", preview.school_label],
      ["Season", preview.season_label],
      ["Position", preview.position_label],
    ].filter(([, value]) => Boolean(value));
  }, [preview]);

  const previewClaimCode = useCallback(async (nextCode: string) => {
    const code = nextCode.trim();

    if (!code || loadingRef.current) {
      return;
    }

    loadingRef.current = true;
    setLoading(true);
    setMessage("");
    setPreview(null);

    const { data, error } = await supabaseBrowser.rpc("preview_claim_card", {
      p_claim_code: code,
    });

    if (error) {
      setMessage("Card preview is not available right now. Please try again.");
      loadingRef.current = false;
      setLoading(false);
      return;
    }

    const response = Array.isArray(data)
      ? (data[0] as ClaimPreviewRow | undefined)
      : undefined;

    if (!response) {
      setMessage("Card preview was not found.");
      loadingRef.current = false;
      setLoading(false);
      return;
    }

    setPreview(response);
    setMessage(response.message || "");
    loadingRef.current = false;
    setLoading(false);
  }, []);

  function submitPreview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void previewClaimCode(normalizedCode);
  }

  useEffect(() => {
    const code = initialCode.trim();

    if (code && autoPreviewedCodeRef.current !== code) {
      autoPreviewedCodeRef.current = code;
      queueMicrotask(() => {
        void previewClaimCode(code);
      });
    }
  }, [initialCode, previewClaimCode]);

  return (
    <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
      <form
        onSubmit={submitPreview}
        className="rounded-2xl border border-white/10 bg-zinc-900 p-5 md:p-7"
      >
        <p className="text-xs font-bold uppercase tracking-[0.24em] text-red-300">
          Claim Code
        </p>
        <h2 className="mt-2 text-2xl font-black">Check card preview</h2>
        <p className="mt-2 text-sm leading-6 text-zinc-400">
          This preview only checks safe public card details. It does not claim
          the card.
        </p>

        <label
          htmlFor="arena-claim-code"
          className="mt-6 block text-sm font-bold text-zinc-200"
        >
          Code
        </label>
        <input
          id="arena-claim-code"
          value={claimCode}
          onChange={(event) => setClaimCode(event.target.value)}
          placeholder="JR26-ABCD-1234"
          autoComplete="off"
          className="mt-2 w-full rounded-xl border border-white/10 bg-zinc-950 px-4 py-3 font-mono text-base text-white outline-none transition placeholder:text-zinc-600 focus:border-red-300"
        />

        <button
          type="submit"
          disabled={loading || !normalizedCode}
          className="mt-5 w-full rounded-xl bg-red-600 px-5 py-4 text-base font-black text-white transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Checking preview..." : "Preview card"}
        </button>

        {message ? (
          <p className="mt-4 rounded-xl border border-white/10 bg-zinc-950 p-4 text-sm text-zinc-200">
            {message}
          </p>
        ) : null}
      </form>

      <div className="rounded-2xl border border-white/10 bg-zinc-900 p-5 md:p-7">
        <p className="text-xs font-bold uppercase tracking-[0.24em] text-red-300">
          Public Preview
        </p>

        {preview?.success ? (
          <div className="mt-5">
            <h2 className="text-3xl font-black">
              {preview.card_name || "Arena card"}
            </h2>
            <div className="mt-5 grid gap-3">
              {safeFields.map(([label, value]) => (
                <div
                  key={label}
                  className="flex items-center justify-between gap-4 rounded-xl border border-white/10 bg-zinc-950 p-4"
                >
                  <span className="text-xs font-black uppercase tracking-[0.2em] text-zinc-500">
                    {label}
                  </span>
                  <span className="text-right text-sm font-bold text-zinc-100">
                    {value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="mt-5 rounded-xl border border-white/10 bg-zinc-950 p-5 text-sm leading-6 text-zinc-400">
            Enter a claim code to preview the card details that are safe to show
            before login.
          </div>
        )}
      </div>
    </section>
  );
}
