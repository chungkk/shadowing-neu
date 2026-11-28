import * as SecureStore from "expo-secure-store";
import { useEffect, useSyncExternalStore } from "react";

export type ReminderSection = "de" | "laixe" | "lid";
export type ReminderMutes = Partial<Record<ReminderSection, boolean>>;
export type SeenEntry = { day: string; level?: number };
export type SeenMap = Record<string, SeenEntry>;

const LEGACY_MUTES_KEY = "reminder-mutes";
const PRUNE_MS = 60 * 86_400_000;

let activeUid: number | null = null;
const mutesByKey = new Map<string, ReminderMutes>();
const loadedMuteKeys = new Set<string>();
const seenByKey = new Map<string, SeenMap>();
const loadedSeenKeys = new Set<string>();
const EMPTY_MUTES: ReminderMutes = {};
const EMPTY_SEEN: SeenMap = {};
const listeners = new Set<() => void>();

const emit = () => listeners.forEach((l) => l());
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => void listeners.delete(l);
};

const muteKeyFor = (uid?: number | null) => {
  const id = uid === undefined ? activeUid : uid;
  return id != null ? `reminder-mutes-${id}` : LEGACY_MUTES_KEY;
};

const seenKeyFor = (uid?: number | null) => {
  const id = uid === undefined ? activeUid : uid;
  return id != null ? `reminders-seen-${id}` : null;
};

export function setReminderUser(uid: number | null) {
  if (activeUid === uid) return;
  activeUid = uid;
  emit();
}

export function getReminderMutes(uid?: number | null): ReminderMutes {
  return mutesByKey.get(muteKeyFor(uid)) ?? EMPTY_MUTES;
}

export function getReminderSeen(uid?: number | null): SeenMap {
  const k = seenKeyFor(uid);
  return k ? (seenByKey.get(k) ?? EMPTY_SEEN) : EMPTY_SEEN;
}

export async function loadReminderMutes(uid?: number | null): Promise<ReminderMutes> {
  const key = muteKeyFor(uid);
  if (loadedMuteKeys.has(key)) return mutesByKey.get(key) ?? EMPTY_MUTES;
  let parsed: ReminderMutes = {};
  try {
    let raw = await SecureStore.getItemAsync(key);
    if (!raw && key !== LEGACY_MUTES_KEY) raw = await SecureStore.getItemAsync(LEGACY_MUTES_KEY);
    if (raw) parsed = JSON.parse(raw) as ReminderMutes;
  } catch {
    parsed = {};
  }
  mutesByKey.set(key, parsed);
  loadedMuteKeys.add(key);
  emit();
  return parsed;
}

export async function toggleReminderMute(section: ReminderSection, uid?: number | null): Promise<ReminderMutes> {
  const cur = await loadReminderMutes(uid);
  const key = muteKeyFor(uid);
  const next: ReminderMutes = { ...cur, [section]: !cur[section] };
  mutesByKey.set(key, next);
  loadedMuteKeys.add(key);
  emit();
  SecureStore.setItemAsync(key, JSON.stringify(next)).catch(() => {});
  return next;
}

export async function clearAllReminderMutes(uid?: number | null): Promise<ReminderMutes> {
  const key = muteKeyFor(uid);
  const next: ReminderMutes = {};
  mutesByKey.set(key, next);
  loadedMuteKeys.add(key);
  emit();
  SecureStore.setItemAsync(key, JSON.stringify(next)).catch(() => {});
  return next;
}

export async function loadReminderSeen(uid?: number | null): Promise<SeenMap> {
  const key = seenKeyFor(uid);
  if (!key) return EMPTY_SEEN;
  if (loadedSeenKeys.has(key)) return seenByKey.get(key) ?? EMPTY_SEEN;
  let parsed: SeenMap = {};
  try {
    const raw = await SecureStore.getItemAsync(key);
    if (raw) parsed = JSON.parse(raw) as SeenMap;
  } catch {
    parsed = {};
  }
  seenByKey.set(key, parsed);
  loadedSeenKeys.add(key);
  emit();
  return parsed;
}

function pruneSeen(src: SeenMap): SeenMap {
  const cutoffMs = Date.now() - PRUNE_MS;
  const out: SeenMap = {};
  for (const [id, entry] of Object.entries(src)) {
    const t = Date.parse(entry.day);
    if (!Number.isFinite(t) || t >= cutoffMs) out[id] = entry;
  }
  return out;
}

export function markRemindersSeen(
  uid: number | null | undefined,
  list: { id: string; quiet?: boolean; level?: number }[],
  today: string,
): SeenMap {
  const key = seenKeyFor(uid);
  if (!key) return EMPTY_SEEN;
  const prev = seenByKey.get(key) ?? {};
  const next = pruneSeen(prev);
  let changed = Object.keys(next).length !== Object.keys(prev).length;
  for (const r of list) {
    if (r.quiet) continue;
    const old = next[r.id];
    const lvl = r.level;
    if (!old || old.day !== today || old.level !== lvl) {
      next[r.id] = { day: today, ...(lvl !== undefined ? { level: lvl } : {}) };
      changed = true;
    }
  }
  if (!changed) return prev;
  seenByKey.set(key, next);
  loadedSeenKeys.add(key);
  emit();
  SecureStore.setItemAsync(key, JSON.stringify(next)).catch(() => {});
  return next;
}

/** Giảm mốc level đã lưu khi số câu sai giảm xuống để lần tăng lại về sau vẫn báo mới */
export function syncReminderSeenLevels(uid: number | null | undefined, list: { id: string; level?: number }[]) {
  const key = seenKeyFor(uid);
  if (!key) return;
  const prev = seenByKey.get(key);
  if (!prev) return;
  let changed = false;
  const next: SeenMap = { ...prev };
  for (const r of list) {
    const old = next[r.id];
    if (r.level !== undefined && old && old.level !== undefined && r.level < old.level) {
      next[r.id] = { ...old, level: r.level };
      changed = true;
    }
  }
  if (!changed) return;
  seenByKey.set(key, next);
  emit();
  SecureStore.setItemAsync(key, JSON.stringify(next)).catch(() => {});
}

export function useReminderMutes(uid?: number | null): ReminderMutes {
  const snap = useSyncExternalStore(subscribe, () => getReminderMutes(uid));
  useEffect(() => {
    if (uid !== undefined) setReminderUser(uid);
    void loadReminderMutes(uid);
  }, [uid]);
  return snap;
}

export function useReminderSeen(uid?: number | null): SeenMap {
  const snap = useSyncExternalStore(subscribe, () => getReminderSeen(uid));
  useEffect(() => {
    if (uid != null) void loadReminderSeen(uid);
  }, [uid]);
  return snap;
}
