import path from 'node:path'
import { fileURLToPath } from 'node:url'

const projectRoot = path.dirname(fileURLToPath(import.meta.url))

/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  compress: true,
  reactStrictMode: true,
  typescript: { ignoreBuildErrors: false },
  turbopack: {
    // Pin Turbopack to this project even when a parent directory also contains a lockfile.
    root: projectRoot,
  },
  images: {
    // Laravel media is tenant-aware and already optimized by the restaurant upload pipeline.
    // Native <img> elements are used by the themes so no remote-image hostname whitelist is required.
    unoptimized: true,
  },
}

export default nextConfig
