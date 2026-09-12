import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { seed, fixture, directory, closeDirectory, data } from "./helpers";
test("room renders and desktop/mobile layouts stay within the viewport", async ({
  page,
}, info) => {
  await seed(page);
  await expect(page.locator("canvas")).toBeVisible();
  await expect(page.locator(".seat-marker")).toHaveCount(42);
  await page.screenshot({
    path: `test-results/${info.project.name}-room.png`,
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "2D map", exact: true }).click();
  await expect(page.getByRole("button", { name: /^Seat [LR]/ })).toHaveCount(
    42,
  );
});
test("WebGL failure exposes a working flat seat map", async ({ page }) => {
  await page.addInitScript(() => {
    const get = HTMLCanvasElement.prototype.getContext;
    Object.defineProperty(HTMLCanvasElement.prototype, "getContext", {
      value: function (
        this: HTMLCanvasElement,
        ...args: Parameters<typeof get>
      ) {
        if (String(args[0]).includes("webgl")) return null;
        return get.apply(this, args);
      },
    });
  });
  await seed(page);
  await expect(
    page.getByRole("button", { name: "Seat L1-1", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Seat L1-1", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Synthetic Learner", exact: true }),
  ).toBeVisible();
});
test("production CSP allows the app and student operations transmit no data", async ({
  page,
}) => {
  const policy = readFileSync("customHttp.yml", "utf8").match(
    /value: "([^"]+)"/,
  )![1];
  await page.route("**/*", async (route) => {
    if (route.request().resourceType() === "document") {
      const response = await route.fetch();
      await route.fulfill({
        response,
        headers: { ...response.headers(), "content-security-policy": policy },
      });
    } else await route.continue();
  });
  const requests: string[] = [];
  page.on("request", (req) =>
    requests.push(req.url() + " " + (req.postData() ?? "")),
  );
  await seed(page);
  await expect(page.locator(".seat-marker")).toHaveCount(42);
  await directory(page);
  await page
    .getByRole("button", { name: "Add student", exact: true })
    .first()
    .click();
  await page
    .getByLabel("Student name", { exact: true })
    .fill("PrivateCanaryValue");
  await page
    .getByLabel("Student number", { exact: true })
    .fill("CanaryStudent001");
  await page.getByRole("button", { name: "Save student" }).click();
  await expect
    .poll(async () => (await data(page)).sections[0].students.length)
    .toBe(4);
  expect(requests.every((r) => r.startsWith("http://localhost:4173/"))).toBe(
    true,
  );
  expect(requests.join("\n")).not.toMatch(
    /PrivateCanaryValue|CanaryStudent001|Synthetic%20Learner/,
  );
});
test("search stays section-local and identical records are distinguishable", async ({
  page,
}) => {
  const duplicate = structuredClone(fixture);
  duplicate.sections[0].students.push({
    ...duplicate.sections[0].students[0],
    id: "duplicate-record",
  });
  await seed(page, duplicate);
  await directory(page);
  await page.getByLabel("Search students").fill("0007");
  await expect(page.locator(".student-row")).toHaveCount(2);
  await expect(page.locator(".student-row").last()).toContainText("record");
  await closeDirectory(page);
  await page.getByRole("button", { name: "2D map", exact: true }).click();
  await page.getByRole("button", { name: "Seat L1-1", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Synthetic Learner", exact: true }),
  ).toBeVisible();
});

test("instructor view places the three-seat block on the left", async ({
  page,
}) => {
  await seed(page);
  await expect(page.locator(".seat-marker")).toHaveCount(42);
  const left = await page
    .locator(".seat-marker")
    .filter({ hasText: /^L1-1/ })
    .boundingBox();
  const right = await page
    .locator(".seat-marker")
    .filter({ hasText: /^R1-1/ })
    .boundingBox();
  expect(left!.x).toBeLessThan(right!.x);
});

test("real camera movement is gated and explicit presets work", async ({
  page,
}, info) => {
  await seed(page);
  await expect(page.locator(".seat-marker")).toHaveCount(42);
  const marker = page.locator(".seat-marker").filter({ hasText: /^L1-1/ });
  const box = await page.locator("canvas").boundingBox();
  const drag = async () => {
    await page.mouse.move(
      box!.x + box!.width * 0.5,
      box!.y + box!.height * 0.6,
    );
    await page.mouse.down();
    await page.mouse.move(
      box!.x + box!.width * 0.5 + 50,
      box!.y + box!.height * 0.6 + 15,
      { steps: 10 },
    );
    await page.mouse.up();
  };
  const initial = await marker.boundingBox();
  await drag();
  const still = await marker.boundingBox();
  expect(still!.x).toBeCloseTo(initial!.x, 0);
  if (info.project.name === "mobile")
    await page
      .getByRole("button", { name: "Navigate room", exact: true })
      .click();
  else await page.keyboard.down("Space");
  await drag();
  await expect
    .poll(async () => Math.abs((await marker.boundingBox())!.x - initial!.x))
    .toBeGreaterThan(1);
  if (info.project.name === "mobile")
    await page
      .getByRole("button", { name: "Finish navigating", exact: true })
      .click();
  else await page.keyboard.up("Space");
  const stopped = await marker.boundingBox();
  await drag();
  expect((await marker.boundingBox())!.x).toBeCloseTo(stopped!.x, 0);
  await page.getByRole("button", { name: /^Top-down/ }).click();
  await expect
    .poll(async () => (await marker.boundingBox())!.y)
    .not.toBeCloseTo(stopped!.y, 0);
  await page.getByRole("button", { name: /^Reset/ }).click();
  await expect
    .poll(async () => (await marker.boundingBox())!.x)
    .toBeCloseTo(initial!.x, 0);
});
