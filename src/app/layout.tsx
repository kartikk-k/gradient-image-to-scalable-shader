import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Tiny Gradient - Turn any gradient into a GPU shader",
  description:
    "Upload a gradient image and convert it into a tiny, resolution-independent, animatable WebGL shader. 99.9% smaller than the original.",
  metadataBase: new URL("https://tinygradient.halodesign.io"),
  openGraph: {
    title: "Tiny Gradient",
    description:
      "Turn any gradient image into a live GPU shader. 12 MB image becomes 15 KB of code.",
    images: [{ url: "/preview.png", width: 1200, height: 630 }],
    siteName: "Tiny Gradient",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Tiny Gradient",
    description:
      "Turn any gradient image into a live GPU shader. 12 MB image becomes 15 KB of code.",
    images: ["/preview.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased dark`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
