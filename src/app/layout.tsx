import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from 'react-hot-toast';
import NavigationBar from '@/components/NavigationBar';
import ClientProviders from '@/components/ClientProviders';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Shop Manager MVP",
  description: "A progressive web app for managing shop inventory, sales, and reports",
  manifest: "/manifest.json",
};

export const viewport = {
  themeColor: "#3B82F6",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode; }>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <ClientProviders>
        <div className="flex flex-col h-screen bg-gray-50">
          <main className="flex-1 overflow-y-auto pb-20">
            {children}
          </main>
          <NavigationBar />
        </div>
        <Toaster position="top-center" />
        </ClientProviders>
      </body>
    </html>
  );
}
