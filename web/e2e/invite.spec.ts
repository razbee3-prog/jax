import { test, expect } from "@playwright/test";
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
