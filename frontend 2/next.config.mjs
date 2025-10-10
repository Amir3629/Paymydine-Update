/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  experimental: {
    serverActions: {
      allowedOrigins: ['localhost:3000', '*.paymydine.com'],
    },
  },
  env: {
    NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL || '',
    NEXT_PUBLIC_FRONTEND_URL: process.env.NEXT_PUBLIC_FRONTEND_URL || 'http://localhost:3000',
    NEXT_PUBLIC_REMOTE_API_PROXY: process.env.NEXT_PUBLIC_REMOTE_API_PROXY || '',
  },
  poweredByHeader: false,
  compress: true,
  generateEtags: false,
  
  // FIXED: Allow images from API server
  images: {
    remotePatterns: [
      // Tenant image endpoint served by the same origin
      {
        protocol: 'http',
        hostname: '**',
        pathname: '/api-server-multi-tenant.php/**',
      },
      {
        protocol: 'https',
        hostname: '**',
        pathname: '/api-server-multi-tenant.php/**',
      },
      // Also allow CDN/static images on tenant domains
      {
        protocol: 'https',
        hostname: '*.paymydine.com',
        pathname: '/**',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
        pathname: '/**',
      },
    ],
    domains: ['localhost','127.0.0.1'],
  },
  
  // Multi-tenant configuration
  async rewrites() {
    const rules = [
      // Dev: when running Next on 127.0.0.1:8000, proxy PHP endpoints to a local PHP server on 127.0.0.1:8001
      {
        source: '/api-server-multi-tenant.php/:path*',
        destination: 'http://127.0.0.1:8001/api-server-multi-tenant.php/:path*',
        has: [
          { type: 'host', value: '127.0.0.1:8000' },
        ],
      },
      {
        source: '/api-server2.php/:path*',
        destination: 'http://127.0.0.1:8001/api-server2.php/:path*',
        has: [
          { type: 'host', value: '127.0.0.1:8000' },
        ],
      },
      {
        source: '/assets/:path*',
        destination: 'http://127.0.0.1:8001/assets/:path*',
        has: [
          { type: 'host', value: '127.0.0.1:8000' },
        ],
      },
      // Handle tenant subdomains
      {
        source: '/:path*',
        destination: '/:path*',
        has: [
          {
            type: 'host',
            value: '(?<tenant>[^.]+)\\.paymydine\\.com',
          },
        ],
      },
      // Handle localhost development
      {
        source: '/:path*',
        destination: '/:path*',
        has: [
          {
            type: 'host',
            value: 'localhost:3000',
          },
        ],
      },
    ];

    // Optional: when NEXT_PUBLIC_REMOTE_API_PROXY is defined, proxy API to that host
    if (process.env.NEXT_PUBLIC_REMOTE_API_PROXY) {
      rules.unshift(
        {
          source: '/api-server-multi-tenant.php/:path*',
          destination: `${process.env.NEXT_PUBLIC_REMOTE_API_PROXY.replace(/\/$/, '')}/api-server-multi-tenant.php/:path*`,
        },
        {
          source: '/api-server2.php/:path*',
          destination: `${process.env.NEXT_PUBLIC_REMOTE_API_PROXY.replace(/\/$/, '')}/api-server2.php/:path*`,
        },
        {
          source: '/assets/:path*',
          destination: `${process.env.NEXT_PUBLIC_REMOTE_API_PROXY.replace(/\/$/, '')}/assets/:path*`,
        },
      );
    }

    return rules;
  },
  
  // Environment-specific configuration
  serverRuntimeConfig: {
    tenantDetection: true,
  },
  
  publicRuntimeConfig: {
    multiTenant: true,
  },
};

export default nextConfig;
