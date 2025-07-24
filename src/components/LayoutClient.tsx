"use client";
import { useContext } from 'react';
import Navbar from './Navbar';
import { ModalContext } from './ClientProviders';

export default function LayoutClient({ children }: { children: React.ReactNode }) {
  const { modalOpen } = useContext(ModalContext);
  console.log('modalOpen:', modalOpen);
  return (
    <>
      {children}
      {!modalOpen && <Navbar />}
    </>
  );
} 