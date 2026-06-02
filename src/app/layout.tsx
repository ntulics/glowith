import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Glowith | Social Beauty Marketplace",
  description: "Discover beauty providers, browse portfolios, chat, book, and manage deposits in one mobile-first marketplace."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
