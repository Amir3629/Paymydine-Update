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
    
    // In development, proxy to Laravel backend on localhost:8000
    // In production, Laravel is on the same domain via nginx reverse proxy
    // Nginx should route /api/* requests directly to Laravel, not through Next.js
    const rewrites = [];
    
    if (isDevelopment) {
      const backendPort = process.env.NEXT_PUBLIC_BACKEND_PORT || '8000';
      const backendHost = '127.0.0.1';
      const backendUrl = `http://${backendHost}:${backendPort}`;
      
      // In development, proxy API requests to Laravel
      rewrites.push(
        {
          source: '/api/v1/:path*',
          destination: `${backendUrl}/api/v1/:path*`,
        },
        {
          source: '/api/media/:path*',
          destination: `${backendUrl}/api/media/:path*`,
        }
      );
    }
    // In production, don't add rewrites for /api/* - let nginx route them directly to Laravel
    
    // Handle tenant subdomains and other routes
    rewrites.push(
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
      }
    );
    
    return rewrites;
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
