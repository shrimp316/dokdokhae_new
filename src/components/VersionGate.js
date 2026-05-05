'use client';
import { useEffect } from 'react';
import { APP_VERSION } from '@/lib/version';

const STORAGE_KEY = 'app_version';

export default function VersionGate() {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    let stored = null;
    try { stored = localStorage.getItem(STORAGE_KEY); } catch {}
    if (stored === APP_VERSION) return;

    (async () => {
      try {
        if ('caches' in window) {
          const keys = await caches.keys();
          await Promise.all(keys.map(k => caches.delete(k)));
        }
        if ('serviceWorker' in navigator) {
          const regs = await navigator.serviceWorker.getRegistrations();
          await Promise.all(regs.filter(r => !/firebase-messaging-sw/.test(r.active?.scriptURL || '')).map(r => r.unregister()));
        }
      } catch {}
      try { localStorage.setItem(STORAGE_KEY, APP_VERSION); } catch {}
      if (stored && stored !== APP_VERSION) {
        window.location.reload();
      }
    })();
  }, []);

  return null;
}
