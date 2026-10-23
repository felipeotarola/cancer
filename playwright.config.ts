import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests",
  testMatch: "**/*.spec.ts",
  testIgnore: "**/eve.integration.spec.ts",
  use: {
    baseURL: "http://127.0.0.1:5184",
    channel: "chrome",
    viewport: { width: 1440, height: 900 },
  },
  webServer: {
    command: "npm run dev:ui -- --host 127.0.0.1 --port 5184 --strictPort",
    env: { VITE_AGENT_MODE: "mock" },
    url: "http://127.0.0.1:5184",
    reuseExistingServer: false,
  },
});
