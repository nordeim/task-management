import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "node",
    // Colocated component/domain suites + the database-path contract under
    // tests/ (the operator's spec pins that location — see .env.example).
    include: ["src/**/*.test.ts", "tests/**/*.test.ts"],
    // The vendored skill library and sandbox scaffolding are not part of the
    // application and stay outside every gate (lint, types, tests).
    exclude: ["node_modules/**", "skills/**", "docs/**", ".next/**"],
    testTimeout: 30_000,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
