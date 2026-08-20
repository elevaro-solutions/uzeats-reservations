/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  transpilePackages: ['@reservations/ui', '@reservations/shared'],
  async rewrites() {
    return [{ source: '/r/:slug', destination: '/restaurants/:slug' }];
  },
  async redirects() {
    return [
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
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'picsum.photos' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: '**.digitaloceanspaces.com' },
    ],
  },
};

export default nextConfig;
