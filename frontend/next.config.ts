import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // 指定端口配置
  env: {
    PORT: '3000'
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:3001/api/:path*', // 代理到后端
      },
    ];
  },
};

export default nextConfig;
