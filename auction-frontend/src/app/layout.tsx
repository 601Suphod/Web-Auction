import type { Metadata } from "next";
import { AppProviders } from '@/components/providers/AppProviders';
import "./globals.css";

export const metadata: Metadata = {
  title: "AuctionHub",
  description: "ประสบการณ์ประมูลออนไลน์ที่ลื่นไหลและใช้งานได้จริง",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased" data-scroll-behavior="smooth">
      <body className="min-h-full flex flex-col">
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
