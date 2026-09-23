import { localUploadRewrites, securityHeaders } from '../../packages/config/securityHeaders.mjs';

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  transpilePackages: ['@reservations/ui', '@reservations/shared'],
  async headers() {
    // CSP img-src includes the API origin so local upload thumbs can render.
    return [{ source: '/:path*', headers: securityHeaders({ maps: false }) }];
  },
  async rewrites() {
    return localUploadRewrites();
  },
};
export default nextConfig;
