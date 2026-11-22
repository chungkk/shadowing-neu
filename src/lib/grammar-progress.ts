"use client";

import { useCallback, useSyncExternalStore } from "react";

const STORAGE_KEY = "hallovn_grammar_done";
const EVENT_NAME = "hallovn:grammar-progress";
const EMPTY: string[] = [];

let cachedRaw: string | null = null;
let cachedParsed: string[] = EMPTY;

function readSnapshot(): string[] {
  if (typeof window === "undefined") return EMPTY;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw === cachedRaw) return cachedParsed;
    cachedRaw = raw;
    if (!raw) {
      cachedParsed = EMPTY;
      return EMPTY;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      cachedParsed = parsed.filter((x): x is string => typeof x === "string");
      return cachedParsed;
    }
  } catch {
    // Bỏ qua lỗi bộ nhớ trình duyệt (chế độ riêng tư / JSON hỏng)
  }
  cachedParsed = EMPTY;
  return EMPTY;
}

function getServerSnapshot(): string[] {
  return EMPTY;
}

function subscribe(listener: () => void) {
  if (typeof window === "undefined") return () => {};
  const onStorage = (e: StorageEvent) => {
    if (!e.key || e.key === STORAGE_KEY) listener();
  };
  const onCustom = () => listener();
  window.addEventListener("storage", onStorage);
  window.addEventListener(EVENT_NAME, onCustom);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(EVENT_NAME, onCustom);
  };
}

function writeSlugs(slugs: string[]) {
  if (typeof window === "undefined") return;
  try {
    const unique = Array.from(new Set(slugs));
    const raw = JSON.stringify(unique);
    window.localStorage.setItem(STORAGE_KEY, raw);
    cachedRaw = raw;
    cachedParsed = unique;
    window.dispatchEvent(new Event(EVENT_NAME));
  } catch {
    // Bỏ qua nếu localStorage bị chặn
  }
}

export function useGrammarDone() {
  const doneSlugs = useSyncExternalStore(subscribe, readSnapshot, getServerSnapshot);

  const isDone = useCallback((slug: string) => doneSlugs.includes(slug), [doneSlugs]);

  const toggleDone = useCallback((slug: string) => {
    const current = readSnapshot();
    const next = current.includes(slug)
      ? current.filter((s) => s !== slug)
      : [...current, slug];
    writeSlugs(next);
  }, []);

  const markDone = useCallback((slug: string) => {
    const current = readSnapshot();
    if (current.includes(slug)) return;
    writeSlugs([...current, slug]);
  }, []);

  return { doneSlugs, isDone, toggleDone, markDone };
}
