"use client";

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Activity, MessageSquare, LayoutGrid, Leaf, PanelLeftClose, PanelLeftOpen, Users, ClipboardList } from 'lucide-react';

export function Sidebar() {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const navItems = [
    { href: '/simulation', label: 'Digital Twin', icon: Activity, description: 'Live simulation' },
    { href: '/builder', label: 'Twin Builder', icon: LayoutGrid, description: 'Configure sensors' },
    { href: '/chat', label: 'Uma Chat', icon: MessageSquare, description: 'AI interface' },
    { href: '/team', label: 'Team', icon: Users, description: 'Manage workers' },
    { href: '/operations', label: 'Operations', icon: ClipboardList, description: 'Work orders' },
  ];

  return (
    <nav className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}>
      {/* ── Brand Header ── */}
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <Leaf size={20} color="#000" strokeWidth={2.5} />
        </div>
        <div className="sidebar-brand">
          <span className="sidebar-brand-name">Uma</span>
          <span className="sidebar-brand-tag">Hydroponic</span>
        </div>
        <button 
          className="sidebar-toggle btn-icon btn-ghost" 
          onClick={() => setIsCollapsed(!isCollapsed)}
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
        </button>
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
              title={isCollapsed ? item.label : undefined}
            >
              <Icon size={18} className="nav-link-icon" />
              <span className="nav-link-text">{item.label}</span>
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
            {!isCollapsed && <span>Uma v1.0 · GPT-5.4-mini</span>}
          </div>
        </div>
      </div>
    </nav>
  );
}
