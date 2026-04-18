"use client";

import Link from 'next/link';
import { Activity, LayoutGrid, MessageSquare, ArrowRight, Leaf, Zap, Database, Shield } from 'lucide-react';
import './home.css';

export default function Home() {
  const modules = [
    {
      href: '/simulation',
      icon: Activity,
      title: 'Digital Twin',
      description: 'Observe and interact with a living simulation of your vertical farm. Perturb environmental parameters and watch Uma restore equilibrium in real-time.',
      accent: 'var(--accent)',
      accentBg: 'var(--accent-subtle)',
    },
    {
      href: '/builder',
      icon: LayoutGrid,
      title: 'Twin Builder',
      description: 'Configure your real-world sensor array using drag-and-drop components. Build the digital representation of your physical infrastructure.',
      accent: 'var(--cyan)',
      accentBg: 'var(--cyan-subtle)',
    },
    {
      href: '/chat',
      icon: MessageSquare,
      title: 'Uma Chat',
      description: 'Engage directly with Uma through natural language. She can query your farm\'s telemetry, analyze trends, and speak her findings aloud.',
      accent: 'var(--violet)',
      accentBg: 'var(--violet-subtle)',
    },
  ];

  const stats = [
    { icon: Zap, label: 'AI Engine', value: 'GPT-5.4-mini' },
    { icon: Database, label: 'Database', value: 'MongoDB Atlas' },
    { icon: Shield, label: 'Query Layer', value: 'GraphQL' },
  ];

  return (
    <div className="home-container">
      {/* ── Hero Section ── */}
      <div className="hero animate-in">
        <div className="hero-badge">
          <Leaf size={14} />
          Desert Dev Labs Hackathon 2026
        </div>

        <h1 className="hero-title">
          Meet <span className="hero-accent">Uma</span>
        </h1>
        <p className="hero-subtitle">
          The autonomous intelligence layer for vertical hydroponic agriculture.
          Uma monitors, adapts, and optimizes your growing environment through
          real-time sensor fusion and elastic equilibrium control.
        </p>

        <div className="hero-actions">
          <Link href="/simulation" className="btn btn-primary btn-lg">
            Launch Digital Twin
            <ArrowRight size={16} />
          </Link>
          <Link href="/chat" className="btn btn-secondary btn-lg">
            Talk to Uma
          </Link>
        </div>
      </div>

      {/* ── Modules Grid ── */}
      <div className="modules-grid">
        {modules.map((mod, idx) => {
          const Icon = mod.icon;
          return (
            <Link 
              key={mod.href} 
              href={mod.href} 
              className={`module-card glass-panel animate-in animate-in-delay-${idx + 1}`}
            >
              <div className="module-icon" style={{ background: mod.accentBg, color: mod.accent }}>
                <Icon size={22} />
              </div>
              <div className="module-content">
                <h3 className="module-title">{mod.title}</h3>
                <p className="module-description">{mod.description}</p>
              </div>
              <div className="module-arrow" style={{ color: mod.accent }}>
                <ArrowRight size={18} />
              </div>
            </Link>
          );
        })}
      </div>

      {/* ── Tech Stack Bar ── */}
      <div className="tech-bar glass-panel animate-in animate-in-delay-4">
        {stats.map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <div key={idx} className="tech-item">
              <Icon size={16} className="tech-icon" />
              <div className="tech-label">{stat.label}</div>
              <div className="tech-value mono">{stat.value}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
