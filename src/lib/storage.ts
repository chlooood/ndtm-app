// Small synchronous key-value storage for app state. On iOS and Android,
// expo-sqlite installs a localStorage backed by SQLite; on web it's the
// browser's own. Reads and writes never throw: a broken or full store just
// means the app starts fresh.
import 'expo-sqlite/localStorage/install';

const store = (): Storage | undefined => (globalThis as { localStorage?: Storage }).localStorage;

export function readJSON<T>(key: string): T | null {
  try {
    const raw = store()?.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function writeJSON(key: string, value: unknown): void {
  try {
    store()?.setItem(key, JSON.stringify(value));
  } catch {
    // Storage full or unavailable: keep running from memory.
  }
}
