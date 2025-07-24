"use client";
import ClientProviders from '../components/ClientProviders';
import LayoutClient from '../components/LayoutClient';

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <ClientProviders>
      <LayoutClient>
        {children}
      </LayoutClient>
    </ClientProviders>
  );
} 