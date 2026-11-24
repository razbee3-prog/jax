import { test, expect } from "@playwright/test";
test("invite controls remain editable before hydration", async ({ page }) => {
  let release = () => {};
  const scripts = new Promise<void>(resolve => { release = resolve; });
  await page.route("**/_next/static/**/*.js", async route => { await scripts; await route.continue().catch(() => {}); });
  try {
    await page.goto("/", { waitUntil: "commit" });
    await expect(page.getByRole("heading", { name: "Jax", exact: true })).toBeVisible();
    await expect(page.getByLabel("Enter invite code to get started")).toBeEnabled();
    await expect(page.getByRole("button", { name: "Get started" })).toBeEnabled();
    await page.getByLabel("Enter invite code to get started").fill("wrong");
    await page.screenshot({ path: "test-results/invite-hydrating-390x844.png" });
    release();
    await page.waitForFunction(() => document.documentElement.classList.contains("dark"));
    await expect(page.getByLabel("Enter invite code to get started")).toHaveValue("wrong");
    const response = page.waitForResponse(response => response.url().endsWith("/api/invite") && response.request().method() === "POST");
    await page.getByRole("button", { name: "Get started" }).click();
    expect((await response).status()).toBe(401);
    await expect(page.locator("#error")).toHaveText("That code didn't work.");
    await expect(page).toHaveURL("/");
    await page.screenshot({ path: "test-results/invite-rejected-390x844.png" });
  } finally { release(); }
});
test("invite retries preserve the editable field and submit its current value", async ({ page }) => {
  await page.goto("/?fake=1");
  const input = page.getByLabel("Enter invite code to get started");
  await input.fill("wrong");
  const field = await input.elementHandle();
  for (const code of ["wrong", "still wrong", "E2E-INVITE"]) {
    await input.fill(code);
    const response = page.waitForResponse(response => response.url().endsWith("/api/invite") && response.request().method() === "POST");
    await page.getByRole("button", { name: "Get started" }).click();
    const result = await response;
    expect(result.request().postDataJSON()).toEqual({ code });
    expect(result.status()).toBe(code === "E2E-INVITE" ? 200 : 401);
    if (code !== "E2E-INVITE") {
      await expect(page.locator("#error")).toHaveText("That code didn't work.");
      expect(await field!.evaluate(element => element.isConnected)).toBe(true);
      await expect(input).toBeFocused();
      await expect(input).toHaveValue(code);
    }
  }
  await expect(page.getByText("Jax needs your camera and microphone to coach you. Video stays on your phone.")).toBeVisible();
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
