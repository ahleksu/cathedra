import { EMPTY_SNAPSHOT, parseSnapshot, type Snapshot } from "./model";

export const STORAGE_KEY = "cathedra:state";
const STORAGE_ERROR =
  "Browser storage is unavailable or full. Your changes were not saved. Free storage or export your current data and try again.";
const STALE_ERROR =
  "Another tab changed the saved data. Reload the latest data before trying again.";
class StorageFailure extends Error {}

export function loadSnapshot(): {
  snapshot: Snapshot;
  raw: string | null;
  error: string | null;
} {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(STORAGE_KEY);
    return {
      snapshot:
        raw === null ? structuredClone(EMPTY_SNAPSHOT) : parseSnapshot(raw),
      raw,
      error: null,
    };
  } catch {
    return {
      snapshot: structuredClone(EMPTY_SNAPSHOT),
      raw,
      error:
        raw === null
          ? STORAGE_ERROR
          : "Saved data cannot be read. Download the saved data for recovery, then import a valid backup or reset this browser.",
    };
  }
}

async function withWriteLock<T>(operation: () => T): Promise<T> {
  if (typeof navigator === "undefined" || !navigator.locks?.request) {
    throw new StorageFailure(
      "This browser cannot safely coordinate local saves. Use a current browser on HTTPS or localhost.",
    );
  }
  try {
    return await navigator.locks.request("cathedra:write", operation);
  } catch (error) {
    if (error instanceof StorageFailure) throw error;
    throw new StorageFailure(STORAGE_ERROR);
  }
}

export async function commitSnapshot(
  expectedRaw: string | null,
  next: Snapshot,
  recovery = false,
): Promise<string> {
  // Capture and validate the proposed state before waiting for another tab.
  const validated = parseSnapshot(JSON.stringify(next));
  return withWriteLock(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved !== expectedRaw) throw new StorageFailure(STALE_ERROR);
    let revision = 0;
    if (saved !== null) {
      try {
        revision = parseSnapshot(saved).revision;
      } catch {
        if (!recovery)
          throw new StorageFailure(
            "Saved data needs recovery. Download it before resetting or replacing it.",
          );
      }
    }
    if (revision >= Number.MAX_SAFE_INTEGER)
      throw new StorageFailure(
        "The saved revision limit was reached. Export your data before resetting this browser.",
      );
    const raw = JSON.stringify({ ...validated, revision: revision + 1 });
    localStorage.setItem(STORAGE_KEY, raw);
    return raw;
  });
}

export async function resetStorage(expectedRaw: string | null): Promise<void> {
  return withWriteLock(() => {
    if (localStorage.getItem(STORAGE_KEY) !== expectedRaw)
      throw new StorageFailure(STALE_ERROR);
    localStorage.removeItem(STORAGE_KEY);
  });
}
