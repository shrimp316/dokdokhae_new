'use client';
import { useEffect, useState } from 'react';
import {
  collection, doc, query, orderBy, limit, onSnapshot, updateDoc, writeBatch,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/AuthContext';

const LIST_LIMIT = 30;

export function useNotifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    if (!user) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setNotifications([]);
      return;
    }
    const q = query(
      collection(db, 'users', user.uid, 'notifications'),
      orderBy('createdAt', 'desc'),
      limit(LIST_LIMIT),
    );
    const unsub = onSnapshot(q, (snap) => {
      setNotifications(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return unsub;
  }, [user]);

  const unreadCount = notifications.filter(n => !n.read).length;

  useEffect(() => {
    if (!('setAppBadge' in navigator)) return;
    try {
      if (unreadCount > 0) navigator.setAppBadge(unreadCount);
      else navigator.clearAppBadge();
    } catch {
      // 앱 아이콘 배지는 부가 기능이라 지원하지 않는 환경에서는 조용히 넘어간다.
    }
  }, [unreadCount]);

  // 읽음 표시는 실패해도 다음 방문 때 다시 시도하면 되므로 사용자에게 알리지 않는다.
  async function markRead(notifId) {
    if (!user) return;
    try {
      await updateDoc(doc(db, 'users', user.uid, 'notifications', notifId), { read: true });
    } catch {}
  }

  async function markAllRead() {
    if (!user) return;
    const unread = notifications.filter(n => !n.read);
    if (!unread.length) return;
    const batch = writeBatch(db);
    unread.forEach(n => batch.update(doc(db, 'users', user.uid, 'notifications', n.id), { read: true }));
    try {
      await batch.commit();
    } catch {}
  }

  return { notifications, unreadCount, markRead, markAllRead };
}
