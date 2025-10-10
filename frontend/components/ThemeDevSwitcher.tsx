'use client';

import { useEffect, useState } from 'react';
import { applyTheme } from '@/lib/theme-system';
import { useThemeStore } from '@/store/theme-store';

const THEMES = [
  { id: 'clean-light', label: 'Clean Light' },
  { id: 'modern-dark', label: 'Modern Dark' },
  { id: 'gold-luxury', label: 'Gold Luxury' },
  { id: 'vibrant-colors', label: 'Vibrant Colors' },
  { id: 'minimal', label: 'Minimal' },
];

export default function ThemeDevSwitcher() {
  const [active, setActive] = useState<string>('clean-light');
  const { setTheme } = useThemeStore();

  useEffect(() => {
    const saved = localStorage.getItem('paymydine-dev-theme');
    if (saved) {
      setActive(saved);
      setTheme(saved);
    }
  }, [setTheme]);

  const onPick = (id: string) => {
    setActive(id);
    setTheme(id);
    localStorage.setItem('paymydine-dev-theme', id);
  };

  // Floating, minimal UI (dev only)
  return (
    <div
      style={{
        position: 'fixed',
        top: 10,
        right: 10,
        zIndex: 9999,
        display: 'flex',
        gap: 6,
        padding: 6,
        background: 'rgba(0,0,0,0.5)',
        borderRadius: 8,
        backdropFilter: 'blur(6px)',
      }}
    >
      {THEMES.map(t => (
        <button
          key={t.id}
          onClick={() => onPick(t.id)}
          style={{
            fontSize: 12,
            padding: '6px 10px',
            borderRadius: 6,
            border: '1px solid rgba(255,255,255,0.25)',
            cursor: 'pointer',
            color: '#fff',
            background:
              active === t.id
                ? 'rgba(255,255,255,0.25)'
                : 'transparent',
          }}
          title={t.id}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}