/** @type {import('next').NextConfig} */
const nextConfig = {
  env: { NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'https://school-erp-bay.vercel.app' },
};
export default nextConfig;
