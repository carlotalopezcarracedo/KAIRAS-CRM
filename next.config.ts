import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Evita que Next use un package-lock.json ajeno fuera del proyecto.
  outputFileTracingRoot: path.join(__dirname),

  // Conserva brevemente en el navegador las rutas RSC ya visitadas o
  // precargadas. Las Server Actions que mutan datos invalidan esta caché.
  experimental: {
    staleTimes: {
      dynamic: 30,
    },
  },

  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
