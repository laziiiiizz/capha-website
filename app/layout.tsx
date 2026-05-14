import type { Metadata } from "next";
import { Bodoni_Moda, Roboto } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";

const bodoni = Bodoni_Moda({
  variable: "--font-bodoni",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const roboto = Roboto({
  variable: "--font-roboto",
  subsets: ["latin"],
  weight: ["300", "400", "500", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://capha.net"),
  title: {
    default: "Central Asian Pre-Health Association (CAPHA)",
    template: "%s | CAPHA",
  },
  description:
    "CAPHA — Events, Resources, and Community for aspiring healthcare professionals from Central Asia.",
  icons: { icon: "/favicon.ico" },
  openGraph: {
    type: "website",
    siteName: "CAPHA",
    title: "Central Asian Pre-Health Association (CAPHA)",
    description:
      "CAPHA — Events, Resources, and Community for aspiring healthcare professionals from Central Asia.",
    images: [{ url: "/logo.jpeg", width: 400, height: 400, alt: "CAPHA Logo" }],
  },
  twitter: {
    card: "summary",
    title: "Central Asian Pre-Health Association (CAPHA)",
    description:
      "CAPHA — Events, Resources, and Community for aspiring healthcare professionals from Central Asia.",
    images: ["/logo.jpeg"],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${bodoni.variable} ${roboto.variable}`}>
      <body className="min-h-full flex flex-col antialiased">
        {children}
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
