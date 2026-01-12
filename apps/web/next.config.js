/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@elevashop/shared-types', '@elevashop/ui-components'],
};

module.exports = nextConfig;
