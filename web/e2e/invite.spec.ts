import { test, expect } from "@playwright/test";
test("invite controls wait for hydration before accepting a submission", async ({ page }) => {
  let release = () => {};
  const scripts = new Promise<void>(resolve => { release = resolve; });
  await page.route("**/_next/static/**/*.js", async route => { await scripts; await route.continue().catch(() => {}); });
  try {
    await page.goto("/", { waitUntil: "commit" });
    await expect(page.getByRole("heading", { name: "Jax", exact: true })).toBeVisible();
    await expect(page.getByLabel("Enter invite code to get started")).toBeDisabled();
    await expect(page.getByRole("button", { name: "Get started" })).toBeDisabled();
    await page.screenshot({ path: "test-results/invite-hydrating-390x844.png" });
    release();
    await page.getByLabel("Enter invite code to get started").fill("wrong");
    const response = page.waitForResponse(response => response.url().endsWith("/api/invite") && response.request().method() === "POST");
    await page.getByRole("button", { name: "Get started" }).click();
    expect((await response).status()).toBe(401);
    await expect(page.locator("#error")).toHaveText("That code didn't work.");
    await expect(page).toHaveURL("/");
    await page.screenshot({ path: "test-results/invite-rejected-390x844.png" });
  } finally { release(); }
});
test("invite screen at iPhone viewport", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Jax", exact: true })).toBeVisible();
  await expect(page.getByText("Your AI personal trainer")).toBeVisible();
  await expect(page.getByText("Jax is not medical advice. Stop if anything hurts.")).toBeVisible();
  await page.screenshot({ path: "test-results/invite-390x844.png" });
  await page.getByLabel("Enter invite code to get started").fill("wrong");
  await page.getByRole("button", { name: "Get started" }).click();
  await expect(page.locator("#error")).toHaveText("That code didn't work.");
  await page.getByLabel("Enter invite code to get started").fill("E2E-INVITE");
  await page.getByRole("button", { name: "Get started" }).click();
  await expect(page.getByText("Jax needs your camera and microphone to coach you. Video stays on your phone.")).toBeVisible();
});
