import { directory, closeDirectory } from "./helpers";
import { test, expect } from "@playwright/test";
test("onboarding, seating, persistence and section isolation", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByLabel("Number of sections").fill("2");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByLabel("Section 1", { exact: true }).fill("Morning");
  await page.getByLabel("Section 2", { exact: true }).fill("Afternoon");
  await page.getByRole("button", { name: "Open my classroom" }).click();
  await directory(page);
  await page
    .getByRole("button", { name: "Add student", exact: true })
    .first()
    .click();
  await page
    .getByLabel("Student name", { exact: true })
    .fill("Synthetic Learner");
  await page.getByLabel("Student number", { exact: true }).fill("0007");
  await page.getByRole("button", { name: "Save student" }).click();
  await expect(
    page.getByText("Synthetic Learner", { exact: true }).first(),
  ).toBeVisible();
  await closeDirectory(page);
  await page.getByRole("button", { name: "2D map", exact: true }).click();
  await page.getByRole("button", { name: "Seat L1-1", exact: true }).click();
  await page
    .getByLabel("Assign student")
    .selectOption({ label: "Synthetic Learner · 0007" });
  await page
    .getByRole("button", { name: "Assign to seat", exact: true })
    .click();
  await page.reload();
  await directory(page);
  await expect(
    page.getByText("Synthetic Learner", { exact: true }).first(),
  ).toBeVisible();
  await page.getByLabel("Active section").selectOption({ label: "Afternoon" });
  await expect(
    page.getByText("Synthetic Learner", { exact: true }),
  ).toHaveCount(0);
  await directory(page);
  await page.getByLabel("Active section").selectOption({ label: "Morning" });
  await directory(page);
  await expect(
    page.getByText("Synthetic Learner", { exact: true }).first(),
  ).toBeVisible();
});
