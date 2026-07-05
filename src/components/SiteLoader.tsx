"use client";

import { useEffect, useState } from "react";

const MIN_VISIBLE_MS = 500;
const SAFETY_TIMEOUT_MS = 10000;
// only images near the initial viewport count — off-screen lazy images
// aren't part of what the visitor is actually waiting to see.
const VIEWPORT_REACH = 1.5;

export default function SiteLoader() {
  const [visible, setVisible] = useState(true);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    const start = Date.now();
    const tracked = new WeakSet<HTMLImageElement>();
    let pending = 0;
    let settled = false;

    const finish = () => {
      if (settled) return;
      settled = true;
      observer.disconnect();
      clearTimeout(safetyTimer);
      const wait = Math.max(0, MIN_VISIBLE_MS - (Date.now() - start));
      setTimeout(() => {
        setFading(true);
        setTimeout(() => setVisible(false), 400);
      }, wait);
    };

    const onSettle = () => {
      pending -= 1;
      if (pending <= 0) finish();
    };

    const track = (img: HTMLImageElement) => {
      if (tracked.has(img)) return;
      if (img.getBoundingClientRect().top > window.innerHeight * VIEWPORT_REACH) return;
      tracked.add(img);
      if (img.complete) return;
      pending += 1;
      img.addEventListener("load", onSettle, { once: true });
      img.addEventListener("error", onSettle, { once: true });
    };

    // the stadium backdrop is a CSS background-image, not an <img>, so it
    // needs its own explicit load check.
    pending += 1;
    const bg = new Image();
    bg.addEventListener("load", onSettle, { once: true });
    bg.addEventListener("error", onSettle, { once: true });
    bg.src = "/world-cup-bg.png";

    document.querySelectorAll("img").forEach(track);

    const observer = new MutationObserver(() => {
      document.querySelectorAll("img").forEach(track);
    });
    observer.observe(document.body, { childList: true, subtree: true });

    const safetyTimer = setTimeout(finish, SAFETY_TIMEOUT_MS);

    return () => {
      observer.disconnect();
      clearTimeout(safetyTimer);
    };
  }, []);

  if (!visible) return null;

  return (
    <div
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center gap-10 bg-white transition-opacity duration-[400ms] ${
        fading ? "pointer-events-none opacity-0" : "opacity-100"
      }`}
    >
      <img
        src="/2026_FIFA_World_Cup_emblem.svg.png"
        alt="FIFA World Cup 2026"
        className="h-28 w-auto object-contain"
      />
      <div className="loader-ball-wrap">
        <svg viewBox="0 0 48 48" width="30" height="30" className="loader-ball">
          <circle cx="24" cy="24" r="18" fill="#fff" stroke="#0b0b0b" strokeWidth="2" />
          <polygon
            points="24,17 30.66,21.84 28.11,29.66 19.89,29.66 17.34,21.84"
            fill="#0b0b0b"
          />
          <g stroke="#0b0b0b" strokeWidth="1.6" strokeLinecap="round">
            <line x1="24" y1="17" x2="24" y2="8" />
            <line x1="30.66" y1="21.84" x2="39.22" y2="19.06" />
            <line x1="28.11" y1="29.66" x2="33.4" y2="36.94" />
            <line x1="19.89" y1="29.66" x2="14.6" y2="36.94" />
            <line x1="17.34" y1="21.84" x2="8.78" y2="19.06" />
          </g>
        </svg>
        <div className="loader-shadow" />
      </div>
    </div>
  );
}
