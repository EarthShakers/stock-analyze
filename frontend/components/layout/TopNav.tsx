'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

import { api } from '@/lib/api';
import type { SystemInfo } from '@/lib/types';

const tabs = [
  { href: '/', label: '分析' },
  { href: '/history', label: '历史' },
  { href: '/settings', label: '设置' },
];

export function TopNav() {
  const pathname = usePathname();
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);

  useEffect(() => {
    void api.getSystemInfo().then(setSystemInfo).catch(() => setSystemInfo({
      status: 'disconnected',
      agents_count: 0,
      enabled_agents: [],
      mcp_tools_info: { total_tools: 0, server_count: 0 },
      debug_mode: false,
      verbose_logging: false,
    }));
  }, []);

  return (
    <header style={{ position: 'sticky', top: 0, zIndex: 20, backdropFilter: 'blur(14px)', background: 'rgba(10,14,23,0.72)', borderBottom: '1px solid rgba(30,41,59,0.8)' }}>
      <div className="page-container" style={{ paddingTop: 14, paddingBottom: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          <Link href="/" style={{ fontWeight: 700, letterSpacing: '0.03em' }}>
            TradingAgents
          </Link>
          <nav style={{ display: 'flex', gap: 8 }}>
            {tabs.map((tab) => {
              const active = pathname === tab.href;
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className="ghost-button"
                  style={{
                    padding: '9px 14px',
                    background: active ? 'rgba(59,130,246,0.14)' : undefined,
                    color: active ? 'white' : 'var(--text-secondary)',
                  }}
                >
                  {tab.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="tag">
          <span className={`status-dot ${systemInfo?.status === 'degraded' ? 'degraded' : systemInfo?.status === 'disconnected' ? 'disconnected' : ''}`} />
          {systemInfo?.status === 'connected' ? '已连接' : systemInfo?.status === 'degraded' ? '部分连接' : '未连接'}
        </div>
      </div>
    </header>
  );
}
