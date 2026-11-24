import { useId, useState } from 'react';
import { storedTheme, switchTheme, type Theme } from '../lib/theme';

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(storedTheme);
  const mask = useId();
  const dark = theme === 'dark';
  return (
    <button
      className="icon-button theme-toggle"
      data-theme-icon={theme}
      aria-label={dark ? 'Ativar modo claro' : 'Ativar modo escuro'}
      title={dark ? 'Modo claro' : 'Modo escuro'}
      onClick={(event) => {
        const next = dark ? 'light' : 'dark';
        setTheme(next);
        switchTheme(next, event.currentTarget);
      }}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
        <mask id={mask}>
          <rect width="24" height="24" fill="#fff" />
          <circle className="theme-bite" cx="30" cy="-6" r="8" fill="#000" />
        </mask>
        <circle
          className="theme-core"
          cx="12"
          cy="12"
          r="5"
          fill="currentColor"
          mask={`url(#${mask})`}
        />
        <g
          className="theme-rays"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        >
          <path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4" />
        </g>
      </svg>
    </button>
  );
}
