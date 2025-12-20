/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // Ignore ESLint errors during production build
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Ignore TypeScript type errors during production build
    ignoreBuildErrors: true,
  },
};

module.exports = nextConfig;

