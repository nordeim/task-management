import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // Type errors fail the build — the codebase typechecks clean (tsc --noEmit).
  reactStrictMode: true,
};

export default nextConfig;
