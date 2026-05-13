'use client';
import { useEffect, useState } from 'react';
import { collection, getDocs, query, where, limit } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/AuthContext';

function volumeNumber() {
  // 2026-01 = Vol. 02 ... aim for stable display tied to year.
  const y = new Date().getFullYear();
  return String(Math.max(1, y - 2024)).padStart(2, '0');
}

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
        // ignore — header keeps Vol. only.
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
        <span
          style={{
            fontFamily: 'var(--dd-serif)', fontSize: 11,
            color: 'var(--dd-text-muted)',
            letterSpacing: '0.25em', textTransform: 'uppercase',
            whiteSpace: 'nowrap',
          }}
        >
          Vol. {volumeNumber()}
        </span>
        {featuredTitle && (
          <>
            <span style={{ width: 18, height: 1, background: 'var(--dd-border)', flexShrink: 0 }} />
            <button
              type="button"
              onClick={() => router.push('/books')}
              style={{
                appearance: 'none', background: 'transparent', border: 0, padding: 0,
                cursor: 'pointer',
                fontFamily: 'var(--dd-serif)', fontSize: 12, color: 'var(--dd-text)',
                letterSpacing: '0.04em',
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                minWidth: 0, textAlign: 'left',
              }}
              title={featuredTitle}
            >
              이 주의 책 · {featuredTitle}
            </button>
          </>
        )}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
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
