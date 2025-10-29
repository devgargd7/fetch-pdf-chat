/** @type {import('next').NextConfig} */
const nextConfig = {
  // Ensure Prisma packages remain external so their runtime engines are bundled correctly in Lambdas
  experimental: {
    serverComponentsExternalPackages: ["@prisma/client", "prisma"],
  },
  // Include Prisma engine files in the traced files for serverless functions
  outputFileTracingIncludes: {
    "/api/**/*": [
      "./node_modules/.prisma/client/**/*",
      "./node_modules/@prisma/client/**/*",
    ],
    "/**/*": [
      "./node_modules/.prisma/client/**/*",
      "./node_modules/@prisma/client/**/*",
    ],
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Use Prisma's official plugin to copy engine files to Lambda
      const { PrismaPlugin } = require("@prisma/nextjs-monorepo-workaround-plugin");
      config.plugins = [...config.plugins, new PrismaPlugin()];
    }
    return config;
  },
  // Use Turbopack configuration instead of webpack
  turbopack: {
    // Turbopack configuration for PDF.js
  },
  // Enable static file serving for worker
  async headers() {
    return [
      {
        source: '/pdf.worker.min.js',
        headers: [
          {
            key: 'Content-Type',
            value: 'application/javascript',
          },
        ],
      },
    ]
  },
}

module.exports = nextConfig
