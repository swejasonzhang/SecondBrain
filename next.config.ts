import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Trim the response surface and enforce strict rendering.
  poweredByHeader: false,
  reactStrictMode: true,
  // Keep heavy server SDKs out of the bundle so serverless cold starts stay small.
  serverExternalPackages: ["@anthropic-ai/sdk", "voyageai"],
  // Baseline production security headers (compatible with Clerk).
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
