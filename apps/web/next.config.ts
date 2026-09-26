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
    ],
  },
};

export default nextConfig;
