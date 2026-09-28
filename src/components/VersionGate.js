'use client';
import { useEffect } from 'react';
import { APP_VERSION } from '@/lib/version';

const STORAGE_KEY = 'app_version';

// 홈 화면에 설치한 PWA가 예전 캐시를 계속 보여주는 문제를 막기 위해, APP_VERSION이 바뀌면
// 캐시와 서비스 워커를 비우고 한 번 새로고침한다. 푸시 수신용 서비스 워커는 알림이 끊기지 않도록 남긴다.
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
