import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, Manrope } from "next/font/google";
import { AppLoader } from "@/components/app-loader";
import "./globals.css";

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-sans",
});

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  variable: "--font-display",
});

export const metadata: Metadata = {
  title: "Bella Voce",
  description: "Choir accountability and member management",
  icons: {
    icon: "/images/bella-voce-logo.png",
    shortcut: "/images/bella-voce-logo.png",
    apple: "/images/bella-voce-logo.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#2CA6A4",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${manrope.variable} ${cormorant.variable}`}>
        <AppLoader>{children}</AppLoader>
      </body>
    </html>
  );
}
