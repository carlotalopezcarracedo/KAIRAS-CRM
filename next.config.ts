import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Evita que Next use un package-lock.json ajeno fuera del proyecto.
  outputFileTracingRoot: path.join(__dirname),
};

export default nextConfig;
