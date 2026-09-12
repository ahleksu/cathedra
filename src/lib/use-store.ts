"use client";
import { useEffect, useRef, useState } from "react";
import {
  EMPTY_SNAPSHOT,
  mutate,
  parseSnapshot,
  type Action,
  type Snapshot,
} from "./model";
import {
  commitSnapshot,
  loadSnapshot,
  resetStorage,
  STORAGE_KEY,
} from "./storage";

export function useStore() {
  const [initial] = useState(loadSnapshot);
  const [snapshot, setSnapshot] = useState(initial.snapshot);
  const [error, setError] = useState(initial.error);
  const [busy, setBusy] = useState(false);
  const [raw, setRaw] = useState(initial.raw);
  const working = useRef(false);
  useEffect(() => {
    const listener = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY || event.key === null)
        setError(
          "This browser tab is out of date. Reload saved data before editing.",
        );
    };
    window.addEventListener("storage", listener);
    return () => window.removeEventListener("storage", listener);
  }, []);
  async function save(next: Snapshot, recovery = false) {
    if (working.current || (!recovery && error)) return false;
    working.current = true;
    setBusy(true);
    try {
      const result = await commitSnapshot(raw, next, recovery);
      setRaw(result);
      setSnapshot(parseSnapshot(result));
      setError(null);
      return true;
    } catch {
      setError(
        "Changes were not saved. Storage is unavailable, full, or changed in another tab. Export a backup, then reload saved data to retry.",
      );
      return false;
    } finally {
      working.current = false;
      setBusy(false);
    }
  }
  async function dispatch(action: Action) {
    try {
      return await save(mutate(snapshot, action));
    } catch {
      setError("This change is not valid. Reload saved data and try again.");
      return false;
    }
  }
  function reload() {
    const result = loadSnapshot();
    setRaw(result.raw);
    setSnapshot(result.snapshot);
    setError(result.error);
  }
  async function reset() {
    if (working.current) return;
    working.current = true;
    setBusy(true);
    try {
      await resetStorage(raw);
      setRaw(null);
      setSnapshot(EMPTY_SNAPSHOT);
      setError(null);
    } catch {
      setError("Reset failed. Reload saved data and try again.");
    } finally {
      working.current = false;
      setBusy(false);
    }
  }
  return { snapshot, error, busy, dispatch, save, reload, reset, raw };
}

export function downloadText(text: string, filename: string) {
  const url = URL.createObjectURL(
    new Blob([text], { type: "application/json" }),
  );
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
