// ============================================================================
// Context for Cursor AI – Shop Manager MVP - ClientProviders for modal context
// ============================================================================
'use client';
import React, { createContext, useState } from 'react';

export const ModalContext = createContext({
  modalOpen: false,
  setModalOpen: (_open: boolean) => {},
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