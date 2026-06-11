'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import {
  LayoutDashboard, AlertTriangle, PlusCircle, BarChart3,
  Bell, Users, FileText, LogOut, X, Shield, BookOpen, ClipboardCheck
} from 'lucide-react';

const navItems = [
  { section: 'Main', items: [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/incidents', label: 'All Incidents', icon: AlertTriangle },
    { href: '/incidents/new', label: 'Report Incident', icon: PlusCircle, roles: ['admin', 'dept_head', 'staff'] },
    { href: '/training-logs', label: 'Training Logs', icon: BookOpen },
    { href: '/investigations-capa', label: 'Investigation & CAPA', icon: ClipboardCheck },
    { href: '/analytics', label: 'Analytics', icon: BarChart3 },
  ]},
  { section: 'Communication', items: [
    { href: '/notifications', label: 'Notifications', icon: Bell },
  ]},
  { section: 'Administration', items: [
    { href: '/admin/users', label: 'User Management', icon: Users, roles: ['admin'] },
    { href: '/admin/audit-logs', label: 'Audit Logs', icon: FileText, roles: ['admin'] },
  ]},
];

export default function Sidebar({ isOpen, onClose }) {
  const pathname = usePathname();
  const { user, logout, hasRole } = useAuth();

  return (
    <>
      {isOpen && <div className="sidebar-overlay" onClick={onClose} />}
      <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <Shield size={22} color="#fff" />
          </div>
          <div className="sidebar-brand">
            <h2>HIMS</h2>
            <p>Incident Management</p>
          </div>
          <button className="modal-close" onClick={onClose} style={{ marginLeft: 'auto', display: isOpen ? 'flex' : 'none' }}>
            <X size={18} />
          </button>
        </div>

        <nav className="sidebar-nav">
          {navItems.map((section) => {
            const visibleItems = section.items.filter(
              (item) => !item.roles || item.roles.some((r) => hasRole(r))
            );
            if (visibleItems.length === 0) return null;

            return (
              <div key={section.section} className="sidebar-section">
                <div className="sidebar-section-title">{section.section}</div>
                {visibleItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`sidebar-link ${isActive ? 'active' : ''}`}
                      onClick={onClose}
                    >
                      <Icon size={20} />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <button className="sidebar-link" onClick={logout} style={{ width: '100%', color: '#94a3b8' }}>
            <LogOut size={20} />
            Sign Out
          </button>
        </div>
      </aside>
    </>
  );
}
