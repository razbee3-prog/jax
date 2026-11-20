import { defineConfig } from "@playwright/test";
export default defineConfig({ testDir: "./web/e2e", use: { baseURL: "http://127.0.0.1:3000", viewport: { width: 390, height: 844 } }, webServer: { command: "npm run dev", url: "http://127.0.0.1:3000", reuseExistingServer: !process.env.CI, env: { INVITE_CODE: "e2e-invite" } } });
