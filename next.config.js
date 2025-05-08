/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  env: {
    DEPLOYMENT_ID: process.env.DEPLOYMENT_ID || 'development',
  },
};

module.exports = nextConfig;
