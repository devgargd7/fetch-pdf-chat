import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Ensure Prisma packages remain external so their runtime engines are bundled correctly in Lambdas
  serverExternalPackages: ["@prisma/client", "prisma"],
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
      const {
        PrismaPlugin,
      } = require("@prisma/nextjs-monorepo-workaround-plugin");
      config.plugins = [...config.plugins, new PrismaPlugin()];
    }
    return config;
  },
};

export default nextConfig;
