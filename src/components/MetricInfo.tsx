"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

export function MetricInfo({ label, note }: { label: string; note: string }) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [pinned, setPinned] = useState(false);
  const [box, setBox] = useState<{ top: number; left: number; lift: boolean } | null>(
    null
  );
  const shown = open || pinned;

  useLayoutEffect(() => {
    if (!shown) return;
    const place = () => {
      const rect = buttonRef.current?.getBoundingClientRect();
      if (!rect) return;
      const width = 240;
      const left = Math.min(
        Math.max(8, rect.left + rect.width / 2 - width / 2),
        window.innerWidth - width - 8
      );
      const lift = rect.bottom + 112 > window.innerHeight;
      setBox({
        top: lift ? rect.top - 8 : rect.bottom + 8,
        left,
        lift,
      });
    };
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [shown]);

  useLayoutEffect(() => {
    if (!pinned) return;
    const onPointer = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (buttonRef.current?.contains(target)) return;
      setPinned(false);
      setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setPinned(false);
      setOpen(false);
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [pinned]);

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        aria-label={`About ${label}`}
        aria-expanded={shown}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onClick={(event) => {
          event.stopPropagation();
          setPinned((value) => !value);
          setOpen(false);
        }}
        className="inline-flex size-4 shrink-0 items-center justify-center rounded-full border border-[var(--wr-dim)] font-mono text-[9px] leading-none text-[var(--wr-muted)] hover:border-[var(--wr-fg)] hover:text-[var(--wr-fg)]"
      >
        i
      </button>
      {shown && box
        ? createPortal(
            <div
              role="tooltip"
              style={{
                top: box.top,
                left: box.left,
                transform: box.lift ? "translateY(-100%)" : undefined,
              }}
              className="fixed z-[80] w-60 bg-[var(--wr-panel)] px-3 py-2 font-mono text-[11px] leading-snug text-[var(--wr-fg)] shadow-lg"
            >
              {note}
            </div>,
            document.body
          )
        : null}
    </>
  );
}
