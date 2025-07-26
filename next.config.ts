import type { NextConfig } from "next";

const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development', // Disable PWA in dev
});

const nextConfig: NextConfig = withPWA({
  reactStrictMode: true,
  // Removed the redirects function as it is no longer needed
});

export default nextConfig;
