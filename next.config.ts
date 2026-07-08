import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Trim the response surface and enforce strict rendering.
  poweredByHeader: false,
  reactStrictMode: true,
  // Keep heavy server SDKs out of the bundle so serverless cold starts stay small.
  serverExternalPackages: ["@anthropic-ai/sdk", "voyageai"],
};

export default nextConfig;
