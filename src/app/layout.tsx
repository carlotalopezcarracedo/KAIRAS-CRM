import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: { default: "KAIRAS OS", template: "%s · KAIRAS OS" },
  description: "Sistema operativo interno de KAIRAS",
};

export const viewport: Viewport = {
  themeColor: "#0D090B",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" className={jakarta.variable}>
      <body className="min-h-dvh bg-ink text-foam antialiased">
        {children}
        <Toaster
          position="top-right"
          theme="dark"
          toastOptions={{
            style: {
              background: "#18151d",
              border: "1px solid rgba(225,232,240,0.1)",
              color: "#e1e8f0",
            },
          }}
        />
      </body>
    </html>
  );
}
