'use client';
import { useState, useEffect } from 'react';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { useAuth } from '@/lib/AuthContext';
import app from '@/lib/firebase';
import { authHeaders } from '@/lib/apiAuth';
import { apiUrl } from '@/lib/apiUrl';

function reportDebug(uid, stage, reason, context) {
  authHeaders({ 'Content-Type': 'application/json' }).then(headers => fetch(apiUrl('/fcmDebug'), {
    method: 'POST', headers, body: JSON.stringify({ uid, stage, reason, context }),
  })).catch(() => {});
}

export function useFCM() {
  const { user } = useAuth();
  const [permission, setPermission] = useState('default');

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPermission(Notification.permission);
    }
  }, []);

  // 이미 허용된 상태면 자동으로 토큰 저장
  useEffect(() => {
    if (!user || typeof window === 'undefined') return;
    if (!('Notification' in window) || !('serviceWorker' in navigator)) return;
    if (Notification.permission === 'granted') saveToken();
  }, [user]);

  // 포그라운드 메시지 리스너는 앱 생애주기당 한 번만 등록 (saveToken이 여러 번
  // 호출돼도 리스너가 중복 등록되어 알림이 여러 번 뜨는 것을 방지)
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
        await fetch(apiUrl('/fcmToken'), {
          method: 'POST',
          headers: await authHeaders({ 'Content-Type': 'application/json' }),
          body: JSON.stringify({ token }),
        });
        console.log('FCM 토큰 저장 완료');
      } else {
        reportDebug(user.uid, 'no-token-returned');
      }
    } catch (e) {
      console.warn('FCM 토큰 저장 실패:', e);
      reportDebug(user.uid, 'token-save-failed', e.message, {
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
        reportDebug(user.uid, 'permission-denied', result);
        return;
      }
      await saveToken();
    } catch (e) {
      console.warn('FCM 초기화 실패:', e);
    }
  }

  return { permission, requestPermission };
}
