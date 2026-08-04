import type { NextConfig } from "next";

/**
 * Security headers — the Next.js equivalent of what the Express "helmet"
 * package does (this app has no Express server, so headers are set here
 * instead, applied to every route). See docs/SECURITY.md for the reasoning
 * behind each one.
 */
const securityHeaders = [
  { key: "X-DNS-Prefetch-Control", value: "off" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-XSS-Protection", value: "0" }, // modern browsers; legacy XSS filters can themselves introduce bugs
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https://res.cloudinary.com",
      "font-src 'self' data:",
      "connect-src 'self' https://api.stripe.com",
      "frame-src https://js.stripe.com",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  // Produces a minimal, self-contained build in .next/standalone — used by
  // the Dockerfile so the production image doesn't need the full
  // node_modules or source tree.
  output: "standalone",

  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
      },
    ],
  },

  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
