'use client';
import { UserProvider } from '@/lib/UserContext';
import { ToastProvider } from '@/components/Toast';

export default function ClientWrapper({ children }) {
  return (
    <ToastProvider>
      <UserProvider>{children}</UserProvider>
    </ToastProvider>
  );
}
