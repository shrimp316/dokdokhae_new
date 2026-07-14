'use client';
import { useEffect, useState } from 'react';
import { collection, getDocs, query, where, limit } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/AuthContext';
import NotificationBell from '@/components/NotificationBell';

export default function Header() {
  const router = useRouter();
  const { user } = useAuth();
  const [featuredTitle, setFeaturedTitle] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const snap = await getDocs(
          query(collection(db, 'books'), where('featured', '==', true), limit(1)),
        );
        if (cancelled || snap.empty) return;
        setFeaturedTitle(snap.docs[0].data().title || '');
      } catch {
        // ignore — header simply shows nothing if the fetch fails.
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <header className="header">
      <div
        style={{
          display: 'flex', alignItems: 'baseline', gap: 12,
          minWidth: 0, flex: 1,
        }}
      >
        {featuredTitle && (
          <button
            type="button"
            onClick={() => router.push('/books')}
            style={{
              appearance: 'none', background: 'transparent', border: 0, padding: 0,
              cursor: 'pointer',
              fontFamily: 'var(--dd-serif)', fontSize: 14, color: 'var(--dd-text)',
              letterSpacing: '0.04em',
              overflow: 'hidden', textOverflow: 'ellipsis',
              flex: 1, minWidth: 0, textAlign: 'left',
            }}
            title={featuredTitle}
          >
            이 주의 책 · {featuredTitle}
          </button>
        )}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
        {user && <NotificationBell />}
        {!user && (
          <button
            type="button"
            onClick={() => router.push('/login')}
            style={{
              background: 'transparent', border: '1px solid var(--dd-border)',
              borderRadius: 999, padding: '5px 12px',
              fontSize: 11, color: 'var(--dd-text-muted)',
              cursor: 'pointer', fontFamily: 'var(--dd-sans)',
            }}
          >
            로그인
          </button>
        )}
      </div>
    </header>
  );
}
