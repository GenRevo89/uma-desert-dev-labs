"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Activity, MessageSquare, LayoutGrid, Leaf, Radio } from 'lucide-react';

export function Sidebar() {
  const pathname = usePathname();

  const navItems = [
    { href: '/simulation', label: 'Digital Twin', icon: Activity, description: 'Live simulation' },
    { href: '/builder', label: 'Twin Builder', icon: LayoutGrid, description: 'Configure sensors' },
    { href: '/chat', label: 'Uma Chat', icon: MessageSquare, description: 'AI interface' },
  ];

  return (
    <nav className="sidebar">
      {/* ── Brand Header ── */}
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <Leaf size={20} color="#000" strokeWidth={2.5} />
        </div>
        <div className="sidebar-brand">
          <span className="sidebar-brand-name">Uma</span>
          <span className="sidebar-brand-tag">Hydroponic Intelligence</span>
        </div>
      </div>

      {/* ── Navigation ── */}
      <div className="sidebar-nav">
        <div className="sidebar-section-label">Modules</div>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`nav-link ${isActive ? 'active' : ''}`}
            >
              <Icon size={18} className="nav-link-icon" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>

      {/* ── Footer Status ── */}
      <div className="sidebar-footer">
        <div className="sidebar-status">
          <div className="status-dot" />
          <div className="status-text">
            <strong>System Online</strong>
            Uma v1.0 · GPT-5.4-mini
          </div>
        </div>
      </div>
    </nav>
  );
}
