import './globals.css';

import type { Metadata } from 'next';

import { TopNav } from '@/components/layout/TopNav';

export const metadata: Metadata = {
  title: 'TradingAgents',
  description: 'TradingAgents React + FastAPI 控制台',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN" className="dark">
      <body>
        <div className="app-shell">
          <TopNav />
          {children}
        </div>
      </body>
    </html>
  );
}
