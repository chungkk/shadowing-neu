import { useSyncExternalStore } from "react";
import { File, Paths } from "expo-file-system";

export type RecentWatch = { videoId: string; title: string };

const FILE = new File(Paths.document, "watch-recent.json");
const listeners = new Set<() => void>();
let cache: RecentWatch[] | null = null;

function read(): RecentWatch[] {
  if (cache) return cache;
  try {
    if (FILE.exists) {
      const parsed = JSON.parse(FILE.textSync()) as unknown;
      if (Array.isArray(parsed)) {
        cache = parsed.filter(
          (x): x is RecentWatch => !!x && typeof (x as RecentWatch).videoId === "string" && typeof (x as RecentWatch).title === "string",
        );
        return cache;
      }
    }
  } catch {}
  cache = [];
  return cache;
}

function write(list: RecentWatch[]) {
  cache = list;
  try {
    FILE.write(JSON.stringify(list));
  } catch {}
  listeners.forEach((l) => l());
}

export function rememberWatch(videoId: string, title: string) {
  const cur = read();
  write([{ videoId, title }, ...cur.filter((r) => r.videoId !== videoId)].slice(0, 8));
}

export function removeWatch(videoId: string) {
  const cur = read();
  write(cur.filter((r) => r.videoId !== videoId));
}

export function useRecentWatches(): RecentWatch[] {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => void listeners.delete(cb);
    },
    read,
  );
}
