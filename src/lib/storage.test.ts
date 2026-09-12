// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { EMPTY_SNAPSHOT } from "./model";
import {
  STORAGE_KEY,
  commitSnapshot,
  loadSnapshot,
  resetStorage,
} from "./storage";
beforeEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
  let queue = Promise.resolve();
  Object.defineProperty(navigator, "locks", {
    configurable: true,
    value: {
      request: (_name: string, fn: () => unknown) => {
        const task = queue.then(fn);
        queue = task.then(
          () => undefined,
          () => undefined,
        );
        return task;
      },
    },
  });
});
describe("local storage safety", () => {
  it("loads an empty store and persists with a new revision", async () => {
    expect(loadSnapshot()).toEqual({
      snapshot: EMPTY_SNAPSHOT,
      raw: null,
      error: null,
    });
    const raw = await commitSnapshot(null, EMPTY_SNAPSHOT);
    expect(JSON.parse(raw).revision).toBe(1);
    expect(loadSnapshot().raw).toBe(raw);
  });
  it("preserves malformed saved data and reports a safe error", () => {
    localStorage.setItem(STORAGE_KEY, "private malformed text");
    const result = loadSnapshot();
    expect(result.raw).toBe("private malformed text");
    expect(result.error).toBeTruthy();
    expect(result.error).not.toContain("private malformed text");
  });
  it("rejects a stale concurrent save", async () => {
    const results = await Promise.allSettled([
      commitSnapshot(null, EMPTY_SNAPSHOT),
      commitSnapshot(null, EMPTY_SNAPSHOT),
    ]);
    expect(results.map((result) => result.status)).toEqual([
      "fulfilled",
      "rejected",
    ]);
    expect(loadSnapshot().snapshot.revision).toBe(1);
  });
  it("does not discard the stored state when quota is exhausted", async () => {
    const raw = await commitSnapshot(null, EMPTY_SNAPSHOT);
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("secret", "QuotaExceededError");
    });
    await expect(commitSnapshot(raw, EMPTY_SNAPSHOT)).rejects.toThrow(
      /storage/i,
    );
    expect(localStorage.getItem(STORAGE_KEY)).toBe(raw);
  });
  it("fails closed without browser locks", async () => {
    Object.defineProperty(navigator, "locks", {
      configurable: true,
      value: undefined,
    });
    await expect(commitSnapshot(null, EMPTY_SNAPSHOT)).rejects.toThrow(
      /browser/i,
    );
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });
  it("resets only the app key with the stale-state guard", async () => {
    localStorage.setItem("other-app", "keep");
    const raw = await commitSnapshot(null, EMPTY_SNAPSHOT);
    await expect(resetStorage(null)).rejects.toThrow();
    await resetStorage(raw);
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    expect(localStorage.getItem("other-app")).toBe("keep");
  });
});

it("cannot overwrite unreadable saved data until an explicit reset", async () => {
  localStorage.setItem(STORAGE_KEY, "broken");
  await expect(commitSnapshot("broken", EMPTY_SNAPSHOT)).rejects.toThrow(
    /recovery/i,
  );
  expect(localStorage.getItem(STORAGE_KEY)).toBe("broken");
  await resetStorage("broken");
  await commitSnapshot(null, EMPTY_SNAPSHOT);
  expect(loadSnapshot().error).toBeNull();
});
it("increments from saved revision instead of trusting imported revision", async () => {
  const raw = await commitSnapshot(null, { ...EMPTY_SNAPSHOT, revision: 999 });
  const newer = await commitSnapshot(raw, { ...EMPTY_SNAPSHOT, revision: 50 });
  expect(JSON.parse(newer).revision).toBe(2);
});
it("reports unavailable storage without exposing browser error details", () => {
  vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
    throw new Error("private error text");
  });
  const result = loadSnapshot();
  expect(result.error).toContain("storage");
  expect(result.error).not.toContain("private error text");
});
it("replaces corrupt storage atomically only with explicit recovery", async () => {
  localStorage.setItem(STORAGE_KEY, "broken");
  const raw = await commitSnapshot("broken", EMPTY_SNAPSHOT, true);
  expect(JSON.parse(raw).revision).toBe(1);
  expect(loadSnapshot().error).toBeNull();
});
it("preserves corrupt original when a recovery write exceeds quota", async () => {
  localStorage.setItem(STORAGE_KEY, "broken");
  vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
    throw new DOMException("quota", "QuotaExceededError");
  });
  await expect(commitSnapshot("broken", EMPTY_SNAPSHOT, true)).rejects.toThrow(
    /storage/i,
  );
  expect(localStorage.getItem(STORAGE_KEY)).toBe("broken");
});
