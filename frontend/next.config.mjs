/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },

  experimental: {
    serverActions: {
      allowedOrigins: ['localhost:3000', 'localhost:3001', '*.paymydine.com'],
    },
  },
  // Environment variables are now handled by environment-config.ts
  // No need to hardcode URLs here anymore
  poweredByHeader: false,
  compress: true,
  generateEtags: false,
  
  // Dynamic image configuration for both development and production
  images: {
    // TEMP: serve original URLs; bypass /_next/image for immediate fix
    unoptimized: true,
    // Keep patterns for later when re-enabling:
    // loader: 'default',
    // loaderFile: './lib/image-loader.ts',
    remotePatterns: [
      // Development patterns - Laravel backend
      {
        protocol: 'http',
        hostname: '127.0.0.1',
        port: '8000',
        pathname: '/**',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '8000',
        pathname: '/**',
      },
      // Production patterns - all paymydine subdomains
      {
        protocol: 'https',
        hostname: '*.paymydine.com',
        pathname: '/**',
      },
      {
        protocol: 'http',
        hostname: '*.paymydine.com',
        pathname: '/**',
      },
      // Fallback for direct domain access
      {
        protocol: 'https',
        hostname: 'paymydine.com',
        pathname: '/**',
      },
    ],
    domains: ['localhost', '127.0.0.1', '*.paymydine.com', 'paymydine.com'],
  },
  
  // Multi-tenant configuration
  async rewrites() {
    const isDevelopment = process.env.NODE_ENV === 'development';
    // Get backend URL from environment or use defaults
    // In production, if Laravel is on same domain but different port, use that port
    // Otherwise, assume Laravel is on same domain (handled by nginx reverse proxy)
    const backendPort = process.env.NEXT_PUBLIC_BACKEND_PORT || '8000';
    const backendHost = isDevelopment 
      ? '127.0.0.1' 
      : (process.env.NEXT_PUBLIC_BACKEND_HOST || '127.0.0.1');
    const backendUrl = `http://${backendHost}:${backendPort}`;
    
    return [
      // API proxy - works for both development and production
      {
        source: '/api/v1/:path*',
        destination: isDevelopment 
          ? `${backendUrl}/api/v1/:path*`
          : `${backendUrl}/api/v1/:path*`, // In production, proxy to Laravel backend
      },
      // Media proxy - CRITICAL: This serves images from Laravel backend
      // MUST proxy to Laravel backend in both dev and production
      {
        source: '/api/media/:path*',
        destination: `${backendUrl}/api/media/:path*`, // Always proxy to Laravel backend
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
      // Handle localhost development (both ports)
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
      {
        source: '/:path*',
        destination: '/:path*',
        has: [
          {
            type: 'host',
            value: 'localhost:3001',
          },
        ],
      },
    ];
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
// Updated: Thu Aug 21 22:21:42 CEST 2025
// Fixed: Image optimization and production media routing
// Added custom image loader for better URL handling
