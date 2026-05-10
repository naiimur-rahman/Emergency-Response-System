// Set timezone to GMT+6 (Asia/Dhaka) — must be set before any other imports
process.env.TZ = 'Asia/Dhaka';

/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: {
    root: process.cwd(),
  },
  reactStrictMode: false,
};

export default nextConfig;
