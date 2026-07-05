"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshIcon } from "./icons";

function relativeTime(fromIso: string, now: number): string {
  const diffSec = Math.max(0, Math.round((now - new Date(fromIso).getTime()) / 1000));
  if (diffSec < 5) return "just now";
  if (diffSec < 60) return `${diffSec}s ago`;
  const min = Math.floor(diffSec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  return `${hr}h ago`;
}

export default function LastUpdated({ fetchedAt }: { fetchedAt: string }) {
  const [now, setNow] = useState(() => Date.now());
  const router = useRouter();

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <button
      type="button"
      onClick={() => router.refresh()}
      title="Refresh live data"
      className="glass-chip inline-flex items-center gap-1.5 self-start rounded-full px-2.5 py-1 text-xs text-white/60 transition hover:text-white"
    >
      <RefreshIcon className="h-3 w-3" />
      Updated {relativeTime(fetchedAt, now)}
    </button>
  );
}
