'use client';

import React, { useEffect, useState } from 'react';

const THEME_STORAGE_KEY = 'gridstock-theme';

export default function ThemeToggle({ showLabel = false }: { showLabel?: boolean }) {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const syncFromDom = () => {
      const saved = localStorage.getItem(THEME_STORAGE_KEY);
      const isDark = saved ? saved === 'dark' : document.documentElement.dataset.theme === 'dark';
      document.documentElement.dataset.theme = isDark ? 'dark' : 'light';
      setDark(isDark);
    };
    syncFromDom();
    window.addEventListener('gridstock-theme-change', syncFromDom);
    return () => window.removeEventListener('gridstock-theme-change', syncFromDom);
  }, []);

  const toggle = () => {
    const next = !dark;
    const nextValue = next ? 'dark' : 'light';
    localStorage.setItem(THEME_STORAGE_KEY, nextValue);
    document.documentElement.dataset.theme = nextValue;
    setDark(next);
    window.dispatchEvent(new Event('gridstock-theme-change'));
  };

  return (
    <button
      type="button"
      className={showLabel ? 'button secondary theme-toggle-btn' : 'icon-button theme-toggle-btn'}
      onClick={toggle}
      title={dark ? 'Mudar para tema claro' : 'Mudar para tema escuro'}
      aria-label={dark ? 'Mudar para tema claro' : 'Mudar para tema escuro'}
      aria-pressed={dark}
    >
      {dark ? (
        <svg aria-hidden="true" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
        </svg>
      ) : (
        <svg aria-hidden="true" viewBox="0 0 24 24">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z" />
        </svg>
      )}
      {showLabel && <span>{dark ? 'Tema claro' : 'Tema escuro'}</span>}
    </button>
  );
}

