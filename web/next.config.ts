import type { NextConfig } from 'next';
const config: NextConfig = { output: 'standalone', outputFileTracingRoot: process.cwd(), allowedDevOrigins: ['127.0.0.1'] };
export default config;
