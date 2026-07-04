import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // "standalone" bundles everything into .next/standalone for Docker / Cloud Run
  // self-hosting. On Vercel, leave the default output so the platform handles
  // output tracing itself. The Dockerfile sets DOCKER_BUILD=1.
  output: process.env.DOCKER_BUILD ? "standalone" : undefined,
};

export default nextConfig;
