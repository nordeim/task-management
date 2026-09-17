import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // Type errors fail the build — the codebase typechecks clean (tsc --noEmit).
  reactStrictMode: true,
  // The reference matches route paths case-insensitively (its own links use
  // "/Dashboard", "/Boards", "/Board", "/Analytics", but "/boards" works
  // too). Canonical routes are lowercase; capitalized spellings rewrites in.
  async rewrites() {
    return [
      { source: "/Dashboard", destination: "/" },
      { source: "/dashboard", destination: "/" },
      { source: "/Boards", destination: "/boards" },
      { source: "/Board", destination: "/board" },
      { source: "/Analytics", destination: "/analytics" },
    ];
  },
};

export default nextConfig;
