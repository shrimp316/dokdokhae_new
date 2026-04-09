'use client';
import { useEffect } from 'react';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { useAuth } from '@/lib/AuthContext';
import app from '@/lib/firebase';

export function useFCM() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user || typeof window === 'undefined') return;
    if (!('Notification' in window) || !('serviceWorker' in navigator)) return;

    async function initFCM() {
      try {
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') return;

        const messaging = getMessaging(app);
        const token = await getToken(messaging, {
          vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
        });

        if (token) {
          await fetch('/api/fcm-token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token, uid: user.uid }),
          });
        }

        // 포그라운드 메시지 수신
        onMessage(messaging, (payload) => {
          const { title, body } = payload.notification || {};
          if (title && Notification.permission === 'granted') {
            new Notification(title, { body, icon: '/icon-192.png' });
          }
        });
      } catch (e) {
        console.warn('FCM 초기화 실패:', e);
      }
    }

    initFCM();
  }, [user]);
}
