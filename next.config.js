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
    serverComponentsExternalPackages: [
      'firebase-admin',
      'open-factura',
      'nodemailer',
      'jspdf',
      'bwip-js',
      'genkit',
      '@genkit-ai/core',
      '@genkit-ai/googleai',
      '@genkit-ai/next',
      '@opentelemetry/sdk-node',
      '@opentelemetry/instrumentation',
      'require-in-the-middle',
    ],
    cpus: 1,
    workerThreads: false,
    memoryBasedWorkersCount: false,
  },
};

module.exports = nextConfig;



