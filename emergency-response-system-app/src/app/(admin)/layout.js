'use client';
import PortalSidebar from '@/components/PortalSidebar';
import { Activity, Building2, ClipboardList, ShieldCheck, Wrench, Database } from 'lucide-react';

const navItems = [
  { href: '/analytics', label: 'Analytics', icon: Activity },
  { href: '/hospitals', label: 'Hospitals', icon: Building2 },
  { href: '/billing', label: 'Billing', icon: ClipboardList },
  { href: '/maintenance', label: 'Maintenance', icon: Wrench },
  { href: '/queries', label: 'Live Queries', icon: Database },
];


export default function AdminLayout({ children }) {
  return (
    <div className="app-layout">
      <PortalSidebar
        portalName="Admin Portal"
        portalColor="#30d158"
        portalIcon={ShieldCheck}
        navItems={navItems}
      />
      <main className="main-content">{children}</main>
    </div>
  );
}
