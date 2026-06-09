'use client';
import PortalSidebar from '@/components/PortalSidebar';
import { Activity, Building2, ClipboardList, ShieldCheck, Wrench, Settings, Route, Star } from 'lucide-react';

const navItems = [
  { href: '/control', label: 'Control', icon: Settings },
  { href: '/analytics', label: 'Analytics', icon: Activity },
  { href: '/admin-reviews', label: 'Ratings', icon: Star },
  { href: '/logs', label: 'Trip Logs', icon: Route },
  { href: '/hospitals', label: 'Hospitals', icon: Building2 },
  { href: '/billing', label: 'Billing', icon: ClipboardList },
  { href: '/maintenance', label: 'Maintenance', icon: Wrench },
  { href: '/doctors', label: 'Doctors', icon: Activity },
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
