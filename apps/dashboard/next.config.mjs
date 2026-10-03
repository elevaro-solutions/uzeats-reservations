import { localUploadRewrites, securityHeaders } from '../../packages/config/securityHeaders.mjs';

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  transpilePackages: ['@reservations/ui', '@reservations/shared'],
  async headers() {
    // CSP img-src includes the API origin so local upload thumbs can render.
    // maps:true allows Places Autocomplete on register / add-restaurant flows.
    return [{ source: '/:path*', headers: securityHeaders({ maps: true }) }];
  },
  async rewrites() {
    return localUploadRewrites();
  },
};
export default nextConfig;
