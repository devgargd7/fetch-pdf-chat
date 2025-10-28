import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Ensure Prisma packages remain external so their runtime engines are bundled correctly in Lambdas
    serverComponentsExternalPackages: ["@prisma/client", "prisma"],
  },
};

export default nextConfig;
