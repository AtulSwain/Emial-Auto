import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Email templates are plain HTML/text files read from disk at runtime.
  // Make sure Vercel bundles them with every server function.
  outputFileTracingIncludes: {
    "/**": ["./src/emails/templates/**"],
  },
  serverExternalPackages: ["pg", "nodemailer"],
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "same-origin" },
          { key: "X-Frame-Options", value: "DENY" },
        ],
      },
      {
        source: "/i/:path*",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      },
      {
        source: "/admin/:path*",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      },
    ];
  },
};

export default nextConfig;
