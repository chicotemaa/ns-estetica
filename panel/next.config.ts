import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: process.platform === 'win32' ? undefined : 'standalone',
  outputFileTracingRoot: process.cwd(),
};

export default nextConfig;
