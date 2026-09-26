import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'previews.dropbox.com',
        pathname: '/p/thumb/**',
      },
      {
        protocol: 'https',
        hostname: '**.storageapi.dev',
      },
    ],
  },
};

export default nextConfig;
