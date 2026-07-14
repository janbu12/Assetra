import type { NextConfig } from 'next';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const nextConfig: NextConfig = {
  output: 'standalone', outputFileTracingRoot: root, turbopack: { root }, poweredByHeader: false,
  async rewrites() { return process.env.NODE_ENV === 'development' ? [{ source: '/api/:path*', destination: 'http://localhost:4000/api/:path*' }] : []; },
};
export default nextConfig;
