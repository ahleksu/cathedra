import type {Snapshot} from "../src/lib/model";
import { expect, type Page } from "@playwright/test";
export const KEY = "cathedra:state";
export const fixture:Snapshot = {
  version: 1,
  revision: 1,
  sections: [
    {
      id: "morning",
      name: "Morning",
      archived: false,
      students: [
        { id: "a", name: "Synthetic Learner", number: "0007", archived: false },
        { id: "b", name: "Example Student", number: "0008", archived: false },
        { id: "c", name: "Unseated Learner", number: "0009", archived: false },
      ],
      assignments: { "L1-1": "a", "R1-1": "b" },
    },
    {
      id: "afternoon",
      name: "Afternoon",
      archived: false,
      students: [],
      assignments: {},
    },
  ],
};
export async function seed(page: Page, data: unknown = fixture) {
  await page.goto("/");
  await page.evaluate(({ key, raw }) => localStorage.setItem(key, raw), {
    key: KEY,
    raw: typeof data === "string" ? data : JSON.stringify(data),
  });
  await page.reload();
}
export async function directory(page: Page) {
  await page.getByRole("button", { name: "Settings and backups" }).waitFor();
  const opener = page.getByRole("button", {
    name: "Open directory",
    exact: true,
  });
  if (await opener.isVisible()) await opener.click();
}
export async function closeDirectory(page: Page) {
  const closer = page.getByRole("button", {
    name: "Close directory",
    exact: true,
  });
  if (await closer.isVisible()) await closer.click();
}
export async function data(page: Page) {
  return page.evaluate((key) => JSON.parse(localStorage.getItem(key)!), KEY);
}
export async function flatSeat(page: Page, id: string) {
  await page.getByRole("button", { name: "2D map", exact: true }).click();
  await page.getByRole("button", { name: `Seat ${id}`, exact: true }).click();
  await expect(
    page.getByRole("complementary", { name: "Seat details" }),
  ).toBeVisible();
}
