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
  images: {
    remotePatterns: [
      // Allow backend image hosts (local dev)
      { protocol: 'http', hostname: 'localhost', port: '8000', pathname: '/assets/**' },
      { protocol: 'http', hostname: 'localhost', port: '8000', pathname: '/api/**' },
      { protocol: 'http', hostname: '127.0.0.1', port: '8000', pathname: '/assets/**' },
      { protocol: 'http', hostname: '127.0.0.1', port: '8000', pathname: '/api/**' },
      // Allow production hosts
      { protocol: 'http', hostname: 'paymydine.com', pathname: '/**' },
      { protocol: 'http', hostname: '*.paymydine.com', pathname: '/**' },
      { protocol: 'https', hostname: 'paymydine.com', pathname: '/**' },
      { protocol: 'https', hostname: '*.paymydine.com', pathname: '/**' },
    ],
  },
};

module.exports = nextConfig;

