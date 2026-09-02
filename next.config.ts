import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Pin the Turbopack root to this app folder so it is self-contained.
  // This makes local dev match the Vercel build (which deploys only this folder).
  turbopack: {
    root: path.resolve(__dirname),
  },
};

export default nextConfig;
