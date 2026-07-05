import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import Nav from "@/components/Nav";
import SiteLoader from "@/components/SiteLoader";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "FIFA World Cup 2026 · Intelligent Analytics Dashboard",
  description:
    "AI-powered real-time insights for the 2026 World Cup — a Poisson goal-scoring model trained on 1930-2022 results, simulated 20,000 times against the live bracket.",
  appleWebApp: {
    capable: true,
    title: "WC26 Predictor",
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  themeColor: "#0a0a0a",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full text-ink-primary">
        <SiteLoader />
        {/* lives in the root layout so it survives every navigation — the
            active-pill indicator animates instead of the nav remounting */}
        <Nav />
        {children}
      </body>
    </html>
  );
}
