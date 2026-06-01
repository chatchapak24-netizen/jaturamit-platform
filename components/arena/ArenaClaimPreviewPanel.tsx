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

type ClaimCardResponse = {
  success: boolean;
  message: string;
  printed_card_id: string | null;
  user_card_id: string | null;
};

type ArenaClaimPreviewPanelProps = {
  initialCode?: string;
};

const CLAIM_FINGERPRINT_KEY = "arena-claim-fingerprint";

function formatRarity(rarity: string | null) {
  if (!rarity) {
    return null;
  }

  return rarity
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function getOrCreateClaimFingerprint() {
  const existingFingerprint = window.localStorage.getItem(CLAIM_FINGERPRINT_KEY);

  if (existingFingerprint) {
    return existingFingerprint;
  }

  const nextFingerprint =
    typeof window.crypto.randomUUID === "function"
      ? window.crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

  window.localStorage.setItem(CLAIM_FINGERPRINT_KEY, nextFingerprint);
  return nextFingerprint;
}

export default function ArenaClaimPreviewPanel({
  initialCode = "",
}: ArenaClaimPreviewPanelProps) {
  const [claimCode, setClaimCode] = useState(initialCode);
  const [preview, setPreview] = useState<ClaimPreviewRow | null>(null);
  const [message, setMessage] = useState("");
  const [claimMessage, setClaimMessage] = useState("");
  const [claimResult, setClaimResult] = useState<ClaimCardResponse | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const loadingRef = useRef(false);
  const claimingRef = useRef(false);
  const autoPreviewedCodeRef = useRef("");

  const normalizedCode = useMemo(() => claimCode.trim(), [claimCode]);
  const safeFields = useMemo(() => {
    if (!preview?.success) {
      return [];
    }

    return [
      ["Edition (รุ่น)", preview.edition_name],
      ["Rarity (ระดับความหายาก)", formatRarity(preview.rarity)],
      ["Serial (หมายเลข)", preview.serial_label],
      ["Player (ผู้เล่น)", preview.player_label],
      ["School (โรงเรียน)", preview.school_label],
      ["Season (ซีซั่น)", preview.season_label],
      ["Position (ตำแหน่ง)", preview.position_label],
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
    setClaimMessage("");
    setClaimResult(null);
    setIsAuthenticated(false);
    setPreview(null);

    const { data, error } = await supabaseBrowser.rpc("preview_claim_card", {
      p_claim_code: code,
    });

    if (error) {
      setMessage("Card preview is not available right now. Please try again. (ไม่สามารถดูตัวอย่างการ์ดได้ในขณะนี้ กรุณาลองใหม่)");
      loadingRef.current = false;
      setLoading(false);
      return;
    }

    const response = Array.isArray(data)
      ? (data[0] as ClaimPreviewRow | undefined)
      : undefined;

    if (!response) {
      setMessage("Card preview was not found. (ไม่พบตัวอย่างการ์ด)");
      loadingRef.current = false;
      setLoading(false);
      return;
    }

    setPreview(response);
    setMessage(response.message || "");

    if (response.success) {
      const { data: userData } = await supabaseBrowser.auth.getUser();
      const hasUser = Boolean(userData.user);

      setIsAuthenticated(hasUser);

      if (!hasUser) {
        setClaimMessage("Sign in before claiming this Arena card. (เข้าสู่ระบบก่อนรับการ์ดอารีนาใบนี้)");
      }
    }

    loadingRef.current = false;
    setLoading(false);
  }, []);

  const claimPreviewedCard = useCallback(async () => {
    const code = claimCode.trim();

    if (!code || !preview?.success || !isAuthenticated || claimingRef.current) {
      return;
    }

    claimingRef.current = true;
    setClaiming(true);
    setClaimMessage("");
    setClaimResult(null);

    const { data, error } = await supabaseBrowser.rpc("claim_card", {
      p_claim_code: code,
      p_request_fingerprint: getOrCreateClaimFingerprint(),
      p_user_agent: window.navigator.userAgent,
    });

    if (error) {
      setClaimMessage("Card claim is not available right now. Please try again. (ยังรับการ์ดไม่ได้ในขณะนี้ กรุณาลองใหม่)");
      claimingRef.current = false;
      setClaiming(false);
      return;
    }

    const response = Array.isArray(data)
      ? (data[0] as ClaimCardResponse | undefined)
      : undefined;

    if (!response) {
      setClaimMessage("Card claim result was not returned. (ระบบไม่ได้ส่งผลการรับการ์ดกลับมา)");
      claimingRef.current = false;
      setClaiming(false);
      return;
    }

    setClaimResult(response);
    setClaimMessage(response.message || "");
    claimingRef.current = false;
    setClaiming(false);
  }, [claimCode, isAuthenticated, preview]);

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
          Claim Code (รหัสรับการ์ด)
        </p>
        <h2 className="mt-2 text-2xl font-black">Check card preview (ตรวจดูตัวอย่างการ์ด)</h2>
        <p className="mt-2 text-sm leading-6 text-zinc-400">
          This preview only checks safe public card details. It does not claim
          the card. (ตัวอย่างนี้ตรวจเฉพาะข้อมูลการ์ดสาธารณะที่ปลอดภัย และยังไม่ใช่การรับการ์ด)
        </p>

        <label
          htmlFor="arena-claim-code"
          className="mt-6 block text-sm font-bold text-zinc-200"
        >
          Code (รหัส)
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
          {loading ? "Checking preview... (กำลังตรวจตัวอย่าง)" : "Preview card (ดูตัวอย่างการ์ด)"}
        </button>

        {message ? (
          <p className="mt-4 rounded-xl border border-white/10 bg-zinc-950 p-4 text-sm text-zinc-200">
            {message}
          </p>
        ) : null}
      </form>

      <div className="rounded-2xl border border-white/10 bg-zinc-900 p-5 md:p-7">
        <p className="text-xs font-bold uppercase tracking-[0.24em] text-red-300">
          Public Preview (ตัวอย่างสาธารณะ)
        </p>

        {preview?.success ? (
          <div className="mt-5">
            <h2 className="text-3xl font-black">
              {preview.card_name || "Arena card (การ์ดอารีนา)"}
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

            {isAuthenticated ? (
              <button
                type="button"
                onClick={() => void claimPreviewedCard()}
                disabled={claiming || Boolean(claimResult?.success)}
                className="mt-5 w-full rounded-xl bg-red-600 px-5 py-4 text-base font-black text-white transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {claimResult?.success
                  ? "Card claimed (รับการ์ดแล้ว)"
                  : claiming
                    ? "Claiming card... (กำลังรับการ์ด)"
                    : "Claim card (รับการ์ด)"}
              </button>
            ) : null}

            {claimMessage ? (
              <p className="mt-4 rounded-xl border border-white/10 bg-zinc-950 p-4 text-sm text-zinc-200">
                {claimMessage}
              </p>
            ) : null}

            {claimResult?.success ? (
              <div className="mt-4 grid gap-3">
                {claimResult.printed_card_id ? (
                  <div className="flex items-center justify-between gap-4 rounded-xl border border-white/10 bg-zinc-950 p-4">
                    <span className="text-xs font-black uppercase tracking-[0.2em] text-zinc-500">
                      Printed Card (การ์ดที่พิมพ์)
                    </span>
                    <span className="break-all text-right font-mono text-xs text-zinc-100">
                      {claimResult.printed_card_id}
                    </span>
                  </div>
                ) : null}
                {claimResult.user_card_id ? (
                  <div className="flex items-center justify-between gap-4 rounded-xl border border-white/10 bg-zinc-950 p-4">
                    <span className="text-xs font-black uppercase tracking-[0.2em] text-zinc-500">
                      User Card (การ์ดผู้ใช้)
                    </span>
                    <span className="break-all text-right font-mono text-xs text-zinc-100">
                      {claimResult.user_card_id}
                    </span>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : (
          <div className="mt-5 rounded-xl border border-white/10 bg-zinc-950 p-5 text-sm leading-6 text-zinc-400">
            Enter a claim code to preview the card details that are safe to show
            before login. (กรอกรหัสรับการ์ดเพื่อดูรายละเอียดการ์ดที่ปลอดภัยก่อนเข้าสู่ระบบ)
          </div>
        )}
      </div>
    </section>
  );
}
