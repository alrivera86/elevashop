/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@elevashop/shared-types', '@elevashop/ui-components'],
  output: 'standalone',
};

module.exports = nextConfig;
