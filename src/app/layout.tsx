import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Live Weather Board",
  description: "Realtime weather dashboard powered by Supabase and Open-Meteo.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
