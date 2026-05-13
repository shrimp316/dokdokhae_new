'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';

const ThemeContext = createContext(null);

const MODE_KEY = 'dd-mode';
const FONT_KEY = 'dd-font';
const SIDEBAR_KEY = 'dd-sidebar';

const VALID_MODES = ['light', 'sepia', 'dark'];

function readStored(key, fallback) {
  if (typeof window === 'undefined') return fallback;
  try {
    const v = window.localStorage.getItem(key);
    return v == null ? fallback : v;
  } catch {
    return fallback;
  }
}

export function ThemeProvider({ children }) {
  // Mode (light/sepia/dark)
  const [mode, setModeState] = useState('sepia');
  // Body font size (12-18)
  const [fontSize, setFontSizeState] = useState(14);
  // Sidebar open / closed
  const [isOpen, setIsOpen] = useState(true);
  // Viewport breakpoint (matches max-width: 820px)
  const [isMobile, setIsMobile] = useState(false);

  // Hydrate from localStorage once on mount.
  useEffect(() => {
    const m = readStored(MODE_KEY, 'sepia');
    const f = parseInt(readStored(FONT_KEY, '14'), 10);
    const s = readStored(SIDEBAR_KEY, null);

    setModeState(VALID_MODES.includes(m) ? m : 'sepia');
    setFontSizeState(Number.isFinite(f) && f >= 12 && f <= 18 ? f : 14);

    // Viewport-aware default for sidebar: open on desktop, closed on mobile.
    const mq = window.matchMedia('(max-width: 820px)');
    const m0 = mq.matches;
    setIsMobile(m0);
    setIsOpen(s != null ? s === '1' : !m0);

    const onChange = (e) => {
      setIsMobile(e.matches);
      if (s == null) setIsOpen(!e.matches);
    };
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  // Apply data-mode to <html> whenever it changes.
  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.documentElement.dataset.mode = mode;
  }, [mode]);

  // Apply --dd-body to <html> whenever fontSize changes.
  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.documentElement.style.setProperty('--dd-body', `${fontSize}px`);
    document.documentElement.style.setProperty(
      '--dd-h1',
      `clamp(36px, 7vw, ${Math.round(fontSize * 4.6)}px)`,
    );
    document.documentElement.style.setProperty('--dd-h2', `${Math.round(fontSize * 2.2)}px`);
  }, [fontSize]);

  const setMode = useCallback((m) => {
    setModeState(m);
    try { window.localStorage.setItem(MODE_KEY, m); } catch {}
  }, []);

  const setFontSize = useCallback((f) => {
    const clamped = Math.max(12, Math.min(18, f));
    setFontSizeState(clamped);
    try { window.localStorage.setItem(FONT_KEY, String(clamped)); } catch {}
  }, []);

  const setSidebar = useCallback((open) => {
    setIsOpen(open);
    try { window.localStorage.setItem(SIDEBAR_KEY, open ? '1' : '0'); } catch {}
  }, []);

  const toggleSidebar = useCallback(() => {
    setIsOpen((prev) => {
      const next = !prev;
      try { window.localStorage.setItem(SIDEBAR_KEY, next ? '1' : '0'); } catch {}
      return next;
    });
  }, []);

  const value = {
    mode, setMode,
    fontSize, setFontSize,
    isOpen, setSidebar, toggleSidebar,
    isMobile,
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    // Safe fallback so SSR or out-of-tree consumers don't crash.
    return {
      mode: 'sepia', setMode: () => {},
      fontSize: 14, setFontSize: () => {},
      isOpen: true, setSidebar: () => {}, toggleSidebar: () => {},
      isMobile: false,
    };
  }
  return ctx;
}
