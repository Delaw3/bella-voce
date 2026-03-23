import type { Metadata, Viewport } from "next";
import { Manrope } from "next/font/google";
import { AppLoader } from "@/components/app-loader";
import { PushNotificationManager } from "@/components/push-notification-manager";
import { PwaRegistrar } from "@/components/pwa-registrar";
import { ThemeProvider } from "@/components/theme-provider";
import { ZoomGuard } from "@/components/zoom-guard";
import { getThemeBootstrapScript } from "@/lib/theme";
import "./globals.css";

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "Bella Voce",
  description: "Choir accountability and member management",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    shortcut: "/icons/icon-192x192.png",
    apple: "/icons/apple-touch-icon.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Bella Voce",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#2CA6A4",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: getThemeBootstrapScript() }} />
      </head>
      <body className={manrope.variable}>
        <ThemeProvider>
          <ZoomGuard />
          <PwaRegistrar />
          <PushNotificationManager />
          <AppLoader>{children}</AppLoader>
        </ThemeProvider>
      </body>
    </html>
  );
}
