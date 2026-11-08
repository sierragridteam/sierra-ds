import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/browser",
  use: { baseURL: "http://127.0.0.1:4329" },
  webServer: {
    command:
      "pnpm --filter sierra-ds-demo exec astro preview --ignore-lock --host 127.0.0.1 --port 4329",
    url: "http://127.0.0.1:4329/charts",
    reuseExistingServer: false,
  },
});
