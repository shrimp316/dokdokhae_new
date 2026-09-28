'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';

const ThemeContext = createContext(null);

const MODE_KEY = 'dd-mode';
const FONT_KEY = 'dd-font';
const SIDEBAR_KEY = 'dd-sidebar';

const VALID_MODES = ['white', 'light', 'dark'];

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
  const [mode, setModeState] = useState('white');
  const [fontSize, setFontSizeState] = useState(14);
  const [isOpen, setIsOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  // 서버 렌더 결과와 어긋나지 않도록 저장값은 마운트 후에 읽는다.
  useEffect(() => {
    const m = readStored(MODE_KEY, 'white');
    const f = parseInt(readStored(FONT_KEY, '14'), 10);
    const s = readStored(SIDEBAR_KEY, null);

    setModeState(VALID_MODES.includes(m) ? m : 'white');
    setFontSizeState(Number.isFinite(f) && f >= 12 && f <= 18 ? f : 14);

    // 사이드바는 사용자가 직접 여닫은 적이 없을 때만 화면 크기를 따라간다.
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

  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.documentElement.dataset.mode = mode;
  }, [mode]);

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
    // Provider 밖(SSR 등)에서 호출돼도 깨지지 않도록 기본값을 돌려준다.
    return {
      mode: 'white', setMode: () => {},
      fontSize: 14, setFontSize: () => {},
      isOpen: true, setSidebar: () => {}, toggleSidebar: () => {},
      isMobile: false,
    };
  }
  return ctx;
}
