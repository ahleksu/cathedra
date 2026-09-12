import { test, expect } from "@playwright/test";
import { seed, fixture, data, directory, flatSeat, KEY } from "./helpers";
test("seat swap needs confirmation and cancellation preserves assignments", async ({
  page,
}) => {
  await seed(page);
  await flatSeat(page, "R1-1");
  await page.getByLabel("Assign student").selectOption("a");
  await page
    .getByRole("button", { name: "Assign to seat", exact: true })
    .click();
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  expect((await data(page)).sections[0].assignments).toEqual({
    "L1-1": "a",
    "R1-1": "b",
  });
  await page
    .getByRole("button", { name: "Assign to seat", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Confirm assignment", exact: true })
    .click();
  await expect
    .poll(async () => (await data(page)).sections[0].assignments)
    .toEqual({ "L1-1": "b", "R1-1": "a" });
});
test("student archive frees a seat and restore stays unassigned", async ({
  page,
}) => {
  await seed(page);
  await flatSeat(page, "L1-1");
  await page
    .getByRole("button", { name: "Archive student", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Archive student", exact: true })
    .click();
  await expect
    .poll(async () => (await data(page)).sections[0].assignments["L1-1"])
    .toBeUndefined();
  await page.getByRole("button", { name: "Close details" }).click();
  await directory(page);
  await page
    .getByRole("button", { name: "Archived records", exact: true })
    .click();
  await page.getByRole("button", { name: "Restore", exact: true }).click();
  await expect
    .poll(async () => (await data(page)).sections[0].students[0].archived)
    .toBe(false);
  expect((await data(page)).sections[0].assignments["L1-1"]).toBeUndefined();
});
test("corrupt data remains intact until a validated restore is confirmed", async ({
  page,
}) => {
  await seed(page, "broken synthetic data");
  await expect(page.locator(".storage-error")).toContainText("cannot be read");
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export original data" }).click();
  expect((await download).suggestedFilename()).toBe(
    "cathedra-original-data.json",
  );
  await page
    .getByLabel("Backup file")
    .setInputFiles({
      name: "backup.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(fixture)),
    });
  await expect(
    page.getByRole("dialog", { name: "Restore this backup?" }),
  ).toBeVisible();
  expect(await page.evaluate((key) => localStorage.getItem(key), KEY)).toBe(
    "broken synthetic data",
  );
  await page.getByRole("button", { name: "Replace all data" }).click();
  await expect(page.locator(".storage-error")).toHaveCount(0);
  expect((await data(page)).sections[0].students[0].number).toBe("0007");
});
test("invalid backup cannot replace saved records", async ({ page }) => {
  await seed(page);
  await page
    .getByLabel("Backup file")
    .setInputFiles({
      name: "bad.json",
      mimeType: "application/json",
      buffer: Buffer.from('{"version":99}'),
    });
  await expect(page.getByText(/backup could not be read/)).toBeVisible();
  expect(await data(page)).toEqual(fixture);
});
test("quota failure keeps saved roster and blocks edits", async ({ page }) => {
  await seed(page);
  await page.evaluate(() => {
    Storage.prototype.setItem = () => {
      throw new DOMException("full", "QuotaExceededError");
    };
  });
  await directory(page);
  await page
    .getByRole("button", { name: "Add student", exact: true })
    .first()
    .click();
  await page.getByLabel("Student name", { exact: true }).fill("Cannot Save");
  await page.getByLabel("Student number", { exact: true }).fill("99");
  await page.getByRole("button", { name: "Save student" }).click();
  await expect(page.locator(".storage-error")).toContainText("not saved");
  expect(await data(page)).toEqual(fixture);
  await expect(
    page.getByRole("button", { name: "Save student" }),
  ).toBeDisabled();
});
test("stale tab cannot overwrite another tab", async ({ page, context }) => {
  await seed(page);
  const other = await context.newPage();
  await other.goto("/");
  await expect(
    other.getByRole("heading", { name: "Morning", exact: true }),
  ).toBeVisible();
  await page.evaluate(({ key, value }) => localStorage.setItem(key, value), {
    key: KEY,
    value: JSON.stringify({ ...fixture, revision: 2 }),
  });
  await expect(other.locator(".storage-error")).toContainText("out of date");
  await other.getByRole("button", { name: "Reload saved data" }).click();
  await expect(other.locator(".storage-error")).toHaveCount(0);
});
test("reset cancellation preserves data and confirmation removes only Cathedra", async ({
  page,
}) => {
  await seed(page);
  await page.evaluate(() => localStorage.setItem("unrelated", "keep"));
  await page.getByRole("button", { name: "Settings and backups" }).click();
  await page
    .getByRole("button", { name: "Reset all local data", exact: true })
    .click();
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  expect(await data(page)).toEqual(fixture);
  await page.getByRole("button", { name: "Settings and backups" }).click();
  await page
    .getByRole("button", { name: "Reset all local data", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Reset all data", exact: true })
    .click();
  await expect(page.getByLabel("Number of sections")).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem("unrelated"))).toBe(
    "keep",
  );
});
