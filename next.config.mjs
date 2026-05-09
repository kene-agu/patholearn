/** @type {import('next').NextConfig} */
const nextConfig = {
  // Prevent konva's Node.js canvas shim from being bundled in SSR/edge builds
  webpack: (config) => {
    config.resolve.alias = { ...config.resolve.alias, canvas: false };
    return config;
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          // Prevent your pages from being embedded in iframes on other sites (clickjacking)
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          // Stop browsers from guessing content types (MIME sniffing attacks)
          { key: "X-Content-Type-Options", value: "nosniff" },
          // Only send the origin (no full URL) in the Referer header when leaving the site
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // Disable browser features that this app doesn't need
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
          // Force HTTPS for 1 year, including subdomains
          { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
          // Basic XSS protection for older browsers
          { key: "X-XSS-Protection", value: "1; mode=block" },
        ],
      },
    ];
  },
};

export default nextConfig;
