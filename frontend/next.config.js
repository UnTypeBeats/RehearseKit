/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  // Don't set env here - let environment variables be used directly
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'storage.googleapis.com',
        pathname: '/rehearsekit-*/**',
      },
    ],
  },
}

module.exports = nextConfig

