import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Loyalty App",
  description: "Self-service loyalty programme builder for cafés and small businesses",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        {/* Cloudflare Web Analytics */}
        <script
          defer
          src="https://static.cloudflareinsights.com/beacon.min.js"
          data-cf-beacon='{"token": "60476589fc39430eaf5699a8717fb0fd"}'
        />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}
