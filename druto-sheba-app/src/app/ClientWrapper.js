'use client';
import { useEffect } from 'react';
import { UserProvider } from '@/lib/UserContext';
import { ToastProvider } from '@/components/Toast';

export default function ClientWrapper({ children }) {
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
  }, []);

  return (
    <ToastProvider>
      <UserProvider>{children}</UserProvider>
    </ToastProvider>
  );
}
