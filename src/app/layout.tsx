import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
// import "../lib/i18n"; // Removed to fix SSR error
import Navbar from '../components/Navbar';
import ClientProviders from '../components/ClientProviders';
import { ModalContext } from '../components/ClientProviders';
import LayoutClient from '../components/LayoutClient';
import AppShell from './AppShell';
import { Toaster } from 'react-hot-toast';

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
  // themeColor and viewport moved to viewport export
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
        <AppShell>
          {children}
        </AppShell>
        <Toaster position="top-center" />
      </body>
    </html>
  );
}
