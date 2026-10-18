import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: process.env.EVENT_TITLE || "Quehost - Live Q&A",
  description: "Real-time interactive audience Q&A web app with intelligent intent grouping.",
  icons: {
    icon: "/favicon.ico",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#f8fafc",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="light">
      <body className="antialiased selection:bg-brand-100 selection:text-brand-900 text-slate-900 min-h-screen">
        <main className="min-h-screen flex flex-col">{children}</main>
      </body>
    </html>
  );
}
