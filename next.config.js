/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'picsum.photos',
      },
    ],
  },
  experimental: {
    serverComponentsExternalPackages: ['firebase-admin', 'open-factura', 'nodemailer', 'jspdf', 'bwip-js'],
    cpus: 1,
    workerThreads: false,
    memoryBasedWorkersCount: true,
  },
};

module.exports = nextConfig;

