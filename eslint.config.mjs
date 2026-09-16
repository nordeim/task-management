import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

// Strict gate: eslint-config-next defaults (core-web-vitals + typescript),
// no rule weakening. `ignores` keeps the linter off the vendored skill
// library, sandbox scaffolding, build output, and the disposable database —
// none of which are part of the application.
const eslintConfig = [
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
      "examples/**",
      "skills/**",
      "refs/**",
      "download/**",
      "upload/**",
      "tool-results/**",
      "mini-services/**",
      "db/**",
    ],
  },
];

export default eslintConfig;
