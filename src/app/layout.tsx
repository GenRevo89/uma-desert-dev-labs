import type { Metadata } from 'next';
import './globals.css';
import { Sidebar } from './components/Sidebar';
import { Providers } from './Providers';

export const metadata: Metadata = {
  title: 'Uma | Hydroponic Intelligence',
  description: 'AI-driven vertical hydroponic farm management system. Desert Dev Labs Hackathon 2026.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <div className="noise-overlay" />
        <Providers>
          <div className="layout-wrapper">
            <Sidebar />
            <main className="main-content">
              {children}
            </main>
          </div>
        </Providers>
      </body>
    </html>
  );
}
