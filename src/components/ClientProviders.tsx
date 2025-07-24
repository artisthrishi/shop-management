// ============================================================================
// Context: Shop Manager MVP - ClientProviders for i18n and other client context
// ============================================================================
'use client';
import '../lib/i18n';
import React, { createContext, useState } from 'react';

export const ModalContext = createContext({
  modalOpen: false,
  setModalOpen: (open: boolean) => {},
});

export function ModalProvider({ children }: { children: React.ReactNode }) {
  const [modalOpen, setModalOpen] = useState(false);
  return (
    <ModalContext.Provider value={{ modalOpen, setModalOpen }}>
      {children}
    </ModalContext.Provider>
  );
}

export default function ClientProviders({ children }: { children: React.ReactNode }) {
  return (
    <ModalProvider>
      {children}
    </ModalProvider>
  );
} 