import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
