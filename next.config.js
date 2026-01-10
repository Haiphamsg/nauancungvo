/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // Disable features that increase memory usage
  poweredByHeader: false,

  // Optimize for low-memory environments
  experimental: {
    // Disable memory-intensive features
    webpackMemoryOptimizations: true,
  },

  // Reduce bundle size
  compiler: {
    // Remove console logs in production
    removeConsole: process.env.NODE_ENV === 'production',
  },
};

module.exports = nextConfig;
