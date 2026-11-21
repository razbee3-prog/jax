import { defineConfig } from "@playwright/test";
export default defineConfig({ testDir: "./web/e2e", use: { baseURL: "http://127.0.0.1:3000", viewport: { width: 390, height: 844 } }, webServer: { command: "npm run start", url: "http://127.0.0.1:3000", reuseExistingServer: false, env: { INVITE_CODE: "e2e-invite", SESSION_SECRET:"e2e-session-secret" } } });
