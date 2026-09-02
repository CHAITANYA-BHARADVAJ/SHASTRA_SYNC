import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { SettingsProvider } from "@/context/SettingsContext";
import { ToastProvider } from "@/components/Toast";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f8fafc" },
    { media: "(prefers-color-scheme: dark)", color: "#0f172a" },
  ],
};

export const metadata: Metadata = {
  title: "Shastra Sync — Family Dashboard",
  description: "Real-time elder care monitoring dashboard for family members. Stay connected with your loved ones.",
  keywords: ["elder care", "family monitoring", "health alerts", "real-time monitoring"],
  authors: [{ name: "Shastra Sync Team" }],
  manifest: "/manifest.json",
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100`}
      >
        <SettingsProvider>
          <ToastProvider>
            {children}
          </ToastProvider>
        </SettingsProvider>
      </body>
    </html>
  );
}
