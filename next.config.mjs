/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Keep production builds resilient on Vercel: TS is the source of truth,
  // ESLint stylistic rules should never block a deploy.
  eslint: {
    ignoreDuringBuilds: true,
  },
  experimental: {
    optimizePackageImports: [],
  },
};

export default nextConfig;
