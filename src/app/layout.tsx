import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: 'NS Estética - Belleza y Bienestar',
  description: 'En NS Estética ofrecemos tratamientos personalizados de cuidado de la piel, rejuvenecimiento facial, cavitación, y mucho más para ayudarte a sentirte mejor contigo misma.',
  keywords: ['centro estético', 'cuidado de la piel', 'rejuvenecimiento facial', 'cavitación', 'belleza', 'tratamientos estéticos', 'bienestar'],
};


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  );
}
