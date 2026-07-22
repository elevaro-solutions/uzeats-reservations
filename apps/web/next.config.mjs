/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  transpilePackages: ['@reservations/ui', '@reservations/shared'],
  async rewrites() {
    return [{ source: '/r/:slug', destination: '/restaurants/:slug' }];
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'picsum.photos' },
      { protocol: 'https', hostname: '**.digitaloceanspaces.com' },
    ],
  },
};

export default nextConfig;
