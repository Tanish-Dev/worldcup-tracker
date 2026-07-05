"use client";

import { useEffect, useRef } from "react";

const PREFIX = "< Code by ";
const NAME = "Tanish";
const SUFFIX = " />";
const NAME_URL = "https://tanishbhavsar.netlify.app";
const FULL_TEXT = PREFIX + NAME + SUFFIX;
const TYPING_SPEED = 100;
const DELETING_SPEED = 50;
const PAUSE_DELAY = 2000;

export default function DeveloperSignature() {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let animationActive = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let resizeTimer: ReturnType<typeof setTimeout> | null = null;
    let i = 0;
    let isDeleting = false;

    const animateText = () => {
      if (i === 0 && !isDeleting) {
        el.innerHTML = "";
        el.classList.add("typing");
      }

      if (!isDeleting) {
        if (i === PREFIX.length) {
          const nameLink = document.createElement("a");
          nameLink.className = "developer-name";
          nameLink.href = NAME_URL;
          nameLink.target = "_blank";
          nameLink.rel = "noopener noreferrer";
          el.appendChild(nameLink);
        }

        const currentChar = FULL_TEXT.charAt(i);
        if (i >= PREFIX.length && i < PREFIX.length + NAME.length) {
          const nameEl = el.querySelector(".developer-name");
          if (nameEl) nameEl.textContent += currentChar;
        } else {
          el.appendChild(document.createTextNode(currentChar));
        }

        i++;
        if (i === FULL_TEXT.length) {
          isDeleting = true;
          el.classList.remove("typing");
          timer = setTimeout(animateText, PAUSE_DELAY);
          return;
        }
      } else {
        i--;
        if (i >= PREFIX.length && i < PREFIX.length + NAME.length) {
          const nameEl = el.querySelector(".developer-name");
          if (nameEl) {
            nameEl.textContent = NAME.substring(0, i - PREFIX.length);
            if (i === PREFIX.length) el.removeChild(nameEl);
          }
        } else if (el.childNodes.length > 0) {
          const lastNode = el.childNodes[el.childNodes.length - 1];
          if (lastNode.nodeType === Node.TEXT_NODE) {
            lastNode.nodeValue = (lastNode.nodeValue ?? "").slice(0, -1);
            if (lastNode.nodeValue === "") el.removeChild(lastNode);
          }
        }

        if (i === 0) {
          isDeleting = false;
          timer = setTimeout(animateText, 500);
          return;
        }
      }

      if (timer) clearTimeout(timer);
      timer = setTimeout(animateText, isDeleting ? DELETING_SPEED : TYPING_SPEED);
    };

    const start = () => {
      if (animationActive) return;
      animationActive = true;
      i = 0;
      isDeleting = false;
      el.textContent = "";
      animateText();
    };

    const stop = () => {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      animationActive = false;
    };

    const isVisible = () => {
      const rect = el.getBoundingClientRect();
      return (
        rect.top >= -rect.height &&
        rect.left >= -rect.width &&
        rect.bottom <= window.innerHeight + rect.height &&
        rect.right <= window.innerWidth + rect.width
      );
    };

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) start();
          else stop();
        }
      },
      { threshold: 0.1, rootMargin: "0px 0px 100px 0px" },
    );
    observer.observe(el);

    const onVisibilityChange = () => {
      if (document.hidden) stop();
      else if (isVisible()) start();
    };
    document.addEventListener("visibilitychange", onVisibilityChange);

    const onResize = () => {
      if (resizeTimer) clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        if (isVisible()) {
          stop();
          start();
        }
      }, 250);
    };
    window.addEventListener("resize", onResize);

    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("resize", onResize);
      stop();
      if (resizeTimer) clearTimeout(resizeTimer);
    };
  }, []);

  return (
    <div className="developer-signature">
      <span ref={ref} className="typewriter" />
    </div>
  );
}
