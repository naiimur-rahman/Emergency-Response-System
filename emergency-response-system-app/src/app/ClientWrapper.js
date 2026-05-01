'use client';
import { UserProvider } from '@/lib/UserContext';

export default function ClientWrapper({ children }) {
  return <UserProvider>{children}</UserProvider>;
}
