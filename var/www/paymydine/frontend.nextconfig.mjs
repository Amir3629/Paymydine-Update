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
    // Environment variables are now handled by environment-config.ts
    // No need to hardcode URLs here anymore
    poweredByHeader: false,
    compress: true,
    generateEtags: false,
    
    // Dynamic image configuration for both development and production
    images: {
      // Use custom loader for better image URL handling
      loader: 'custom',
      loaderFile: './lib/image-loader.ts',
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
      return [
        // API proxy for development - this fixes CORS issues
        {
          source: '/api/v1/:path*',
          destination: 'http://127.0.0.1:8000/api/v1/:path*',
        },
        // Media proxy for development - this serves images from Laravel backend
        {
          source: '/api/media/:path*',
          destination: 'http://127.0.0.1:8000/api/media/:path*',
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