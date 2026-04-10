import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Required for Cloud Run / Docker — bundles everything into .next/standalone
  output: "standalone",
};

export default nextConfig;
