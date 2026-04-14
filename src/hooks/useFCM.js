'use client';
import { useState, useEffect } from 'react';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { useAuth } from '@/lib/AuthContext';
import app from '@/lib/firebase';

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

  async function saveToken() {
    try {
      const sw = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
      const messaging = getMessaging(app);
      const token = await getToken(messaging, {
        vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
        serviceWorkerRegistration: sw,
      });
      if (token) {
        await fetch('/api/fcm-token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token, uid: user.uid }),
        });
        console.log('FCM 토큰 저장 완료');
      }
      onMessage(messaging, (payload) => {
        const { title, body } = payload.notification || {};
        if (title) new Notification(title, { body, icon: '/icon-192.png' });
      });
    } catch (e) {
      console.warn('FCM 토큰 저장 실패:', e);
    }
  }

  async function requestPermission() {
    if (!user || !('Notification' in window) || !('serviceWorker' in navigator)) return;
    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      if (result !== 'granted') return;
      await saveToken();
    } catch (e) {
      console.warn('FCM 초기화 실패:', e);
    }
  }

  return { permission, requestPermission };
}
