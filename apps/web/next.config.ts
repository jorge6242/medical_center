import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  async rewrites() {
    const platformApiUrl =
      process.env['PLATFORM_API_URL'] ??
      (process.env['NODE_ENV'] === 'production'
        ? process.env['NEXT_PUBLIC_API_URL']
        : 'http://api:3001');
    if (!platformApiUrl) return [];
    return [{ source: '/api/platform/:path*', destination: `${platformApiUrl}/platform/:path*` }];
  },
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
