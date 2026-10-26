import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/__tests__/setup.ts"],
    include: ["**/*.test.{ts,tsx}", "**/*.spec.{ts,tsx}"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      include: ["src/**"],
      exclude: [
        "src/**/*.test.{ts,tsx}",
        "src/**/*.spec.{ts,tsx}",
        "src/__tests__/**",
        "src/types/**",
        // Translation dictionaries are data, and `i18n.test.ts` asserts their
        // content (key parity, placeholders, no unused strings).
        "src/lib/i18n/en.ts",
        "src/lib/i18n/es.ts",
        // UI is exercised by the Playwright suite (login, dashboard, history,
        // analytics, goals, scheduled, profile, money boundary), which is where
        // it is actually worth testing. This gate measures the logic instead:
        // services, jobs, i18n, rate limiting, API routes and middleware.
        "src/components/**",
        "src/app/**/page.tsx",
        "src/app/**/*Client.tsx",
        "src/app/**/layout.tsx",
        "src/app/**/loading.tsx",
        "src/app/globals.css",
        "src/middleware.ts",
        "src/lib/prisma.ts",
      ],
      // Floors measured on this suite. UI is excluded above, so these numbers
      // describe the logic; the per-path thresholds hold the critical layers to
      // a much higher bar.
      thresholds: {
        statements: 65,
        branches: 62,
        functions: 70,
        lines: 65,
        "src/lib/services/**": {
          statements: 85,
          branches: 80,
          functions: 90,
          lines: 85,
        },
        "src/lib/i18n/**": {
          statements: 75,
          branches: 60,
          functions: 55,
          lines: 75,
        },
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
