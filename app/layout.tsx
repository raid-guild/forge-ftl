import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Tapper Caravan",
  description: "A compact real-time caravan dungeon tapper prototype.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
