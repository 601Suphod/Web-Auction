import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    // Type checking is executed separately via `npx tsc --noEmit`.
    // This avoids sporadic Windows `spawn EPERM` failures during `next build`.
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
