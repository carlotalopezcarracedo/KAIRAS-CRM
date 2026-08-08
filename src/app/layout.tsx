import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { cookies } from "next/headers";
import { THEME_COOKIE, DEFAULT_THEME, isTheme } from "@/lib/theme";
import { ThemedToaster } from "@/components/shell/themed-toaster";
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

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // El tema se resuelve en el servidor: así el primer HTML ya llega con el
  // atributo puesto y no hay destello de tema equivocado.
  const store = await cookies();
  const raw = store.get(THEME_COOKIE)?.value;
  const theme = isTheme(raw) ? raw : DEFAULT_THEME;

  return (
    <html lang="es" className={jakarta.variable} data-theme={theme}>
      <body className="min-h-dvh bg-ink text-foam antialiased">
        {children}
        <ThemedToaster theme={theme} />
      </body>
    </html>
  );
}
