import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Glowith | Social Beauty Marketplace",
  description: "Discover beauty providers, browse portfolios, chat, book, and manage deposits in one mobile-first marketplace.",
  icons: {
    icon: "/api/brand/icon",
    apple: "/api/brand/icon"
  }
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://js.paystack.co" />
        <link rel="preconnect" href="https://api.paystack.co" />
      </head>
      <body>{children}</body>
    </html>
  );
}
