"use client";

import { useState, useSyncExternalStore } from "react";
import { pickSaying } from "@/lib/sayings";
import type { VerdictWord } from "@/lib/verdict";

const TONE: Record<VerdictWord, string> = {
  CHEAP: "text-[#34d399]",
  FINE: "text-[#d5dde8]",
  HOT: "text-[#fbbf24]",
  COOKED: "text-[#fb4d5a]",
};

const SLOT = "h-10 w-full shrink-0";

function subscribe() {
  return () => {};
}

function clientTrue() {
  return true;
}

function serverFalse() {
  return false;
}

export function SayingLine({
  band,
  ready,
}: {
  band: VerdictWord | null;
  ready: boolean;
}) {
  const isClient = useSyncExternalStore(subscribe, clientTrue, serverFalse);
  const [nonce, setNonce] = useState(0);
  const [picked, setPicked] = useState<{ key: string; line: string }>({
    key: "",
    line: "",
  });

  // New draw when the band settles, and again on tap. Adjusted in render so
  // the browser picks the line without a hydration mismatch.
  const key = isClient && ready ? `${band ?? "COOKED"}:${nonce}` : "";
  if (picked.key !== key) {
    setPicked({
      key,
      line: key.length > 0 ? pickSaying(band, picked.line) : "",
    });
  }

  const line = picked.key === key ? picked.line : "";

  if (line.length === 0) {
    return <div aria-hidden className={SLOT} />;
  }

  return (
    <button
      type="button"
      onClick={() => setNonce((current) => current + 1)}
      title="Tap for another"
      aria-live="polite"
      className={`${SLOT} flex cursor-pointer items-center px-4 text-left font-mono text-[12px] leading-4 opacity-90 hover:opacity-100 focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-[var(--wr-border-bright)] active:opacity-60 sm:px-6 sm:text-[13px] sm:leading-5 ${TONE[band ?? "COOKED"]}`}
    >
      <span className="line-clamp-2 min-w-0">{line}</span>
    </button>
  );
}
