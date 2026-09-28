'use client';
import { useState, useEffect } from 'react';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { useAuth } from '@/lib/AuthContext';
import app from '@/lib/firebase';
import { authenticatedFetch } from '@/lib/authenticatedFetch';

// 기기별(특히 iOS 홈 화면 앱) 푸시 등록 실패 원인을 서버 로그로 모으기 위한 진단 보고.
function reportDebug(stage, reason, context) {
  authenticatedFetch('/api/fcm-debug', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ stage, reason, context }),
  }).catch(() => {});
}

export function useFCM() {
  const { user } = useAuth();
  const [permission, setPermission] = useState('default');

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPermission(Notification.permission);
    }
  }, []);

  // 토큰은 갱신되거나 다른 계정으로 로그인할 수 있으므로, 이미 허용된 기기도 로그인할 때마다 다시 등록한다.
  useEffect(() => {
    if (!user || typeof window === 'undefined') return;
    if (!('Notification' in window) || !('serviceWorker' in navigator)) return;
    if (Notification.permission === 'granted') saveToken();
  }, [user]);

  // 포그라운드 리스너를 saveToken과 분리해 한 번만 등록한다.
  // saveToken이 여러 번 불려도 같은 알림이 여러 번 뜨지 않게 하려는 것이다.
  useEffect(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    const messaging = getMessaging(app);
    const unsubscribe = onMessage(messaging, (payload) => {
      const { title, body } = payload.notification || {};
      const { notifId, url } = payload.data || {};
      if (!title) return;
      const notif = new Notification(title, { body, icon: '/icon-192.png', tag: notifId });
      notif.onclick = () => {
        window.focus();
        if (url) window.location.href = url;
        notif.close();
      };
    });
    return unsubscribe;
  }, []);

  async function saveToken() {
    try {
      const sw = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
      const messaging = getMessaging(app);
      const token = await getToken(messaging, {
        vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
        serviceWorkerRegistration: sw,
      });
      if (token) {
        const response = await authenticatedFetch('/api/fcm-token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        });
        if (!response.ok) throw new Error('FCM token registration failed');
        console.log('FCM 토큰 저장 완료');
      } else {
        reportDebug('no-token-returned');
      }
    } catch (e) {
      console.warn('FCM 토큰 저장 실패:', e);
      reportDebug('token-save-failed', e.message, {
        displayMode: typeof window.matchMedia === 'function' && window.matchMedia('(display-mode: standalone)').matches
          ? 'standalone' : 'browser',
        iosStandalone: typeof navigator.standalone === 'boolean' ? navigator.standalone : null,
        swSupported: 'serviceWorker' in navigator,
        notificationSupported: 'Notification' in window,
        userAgent: navigator.userAgent,
      });
    }
  }

  async function requestPermission() {
    if (!user || !('Notification' in window) || !('serviceWorker' in navigator)) return;
    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      if (result !== 'granted') {
        reportDebug('permission-denied', result);
        return;
      }
      await saveToken();
    } catch (e) {
      console.warn('FCM 초기화 실패:', e);
    }
  }

  return { permission, requestPermission };
}
