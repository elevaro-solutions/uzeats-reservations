import { localUploadRewrites, securityHeaders } from '../../packages/config/securityHeaders.mjs';

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  transpilePackages: ['@reservations/ui', '@reservations/shared'],
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders({ maps: true }) }];
  },
  async redirects() {
    return [
      {
        source: '/r/:slug',
        destination: '/restaurants/:slug',
        permanent: true,
      },
      {
        source: '/near-me/cities/:slug',
        destination: '/near-me/restaurants/:slug',
        permanent: true,
      },
      {
        source: '/near-me/states/:slug',
        destination: '/near-me/restaurants/state/:slug',
        permanent: true,
      },
    ];
  },
  async rewrites() {
    return localUploadRewrites();
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'picsum.photos' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'img.freepik.com' },
      { protocol: 'https', hostname: '**.freepik.com' },
      { protocol: 'https', hostname: 'img.b2bpic.net' },
      { protocol: 'https', hostname: '**.digitaloceanspaces.com' },
    ],
  },
};

export default nextConfig;
