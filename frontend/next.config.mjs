/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:5005/api/:path*',
      },
      {
        source: '/health',
        destination: 'http://localhost:5005/health',
      },
    ];
  },
};

export default nextConfig;
