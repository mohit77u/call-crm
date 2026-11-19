"use client";

import { useEffect, useRef, useState } from "react";
import { Tooltip } from "@mantine/core";

// Table cell text that clamps to `lines` lines and shows a Mantine tooltip
// with the full text ONLY when the content actually overflows.
// - lines=2 (default): two-line clamp with ellipsis (name/address style)
// - lines=1: single-line truncate with ellipsis (email style)
// NOTE: globals.css forces `th, td { white-space: nowrap }` which beats
// normal Tailwind utilities — the clamp span therefore uses `whitespace-normal!`
// (important) and must NOT also carry `block` (it would override the
// -webkit-box display that line-clamp needs).
export function ClampedText({
  text,
  display,
  capitalize = false,
  lines = 2,
  className = "text-slate-600",
}: {
  text?: string | null;
  display?: string | null;
  capitalize?: boolean;
  lines?: 1 | 2;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const [truncated, setTruncated] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const check = () => setTruncated(el.scrollWidth > el.clientWidth + 1 || el.scrollHeight > el.clientHeight + 1);
    check();
    const ro = new ResizeObserver(check);
    ro.observe(el);
    return () => ro.disconnect();
  }, [text, display]);

  if (!text) return <span className="text-sm text-slate-400">-</span>;
  const shown = display ?? text;
  return (
    <Tooltip
      label={<span className={`whitespace-pre-wrap break-words ${capitalize ? "capitalize" : ""}`}>{shown}</span>}
      multiline
      w="auto"
      maw={400}
      position="top"
      withArrow
      openDelay={200}
      disabled={!truncated}
    >
      <span
        ref={ref}
        className={`text-sm ${lines === 1 ? "block truncate" : "line-clamp-2 whitespace-normal! wrap-anywhere"} ${capitalize ? "capitalize" : ""} ${className}`}
      >
        {shown}
      </span>
    </Tooltip>
  );
}
