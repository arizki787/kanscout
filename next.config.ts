import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["pdfjs-dist"],
  cacheComponents: true,
};

export default nextConfig;
