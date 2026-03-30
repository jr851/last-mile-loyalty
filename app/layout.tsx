import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Last Mile Loyalty — Turn every customer into a regular",
  description: "Digital loyalty programme with Apple & Google Wallet integration. Built by enterprise loyalty experts for independent businesses. Free to start, set up in 5 minutes.",
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
