import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  distDir: process.env.NEXT_DIST_DIR ?? ".next", // the e2e build must not overwrite a running dev server
  // Reuse a visited screen for 30s so switching back is instant; LiveRefresh and server actions keep it fresh.
  experimental: { staleTimes: { dynamic: 30 } },
  /* config options here */
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
