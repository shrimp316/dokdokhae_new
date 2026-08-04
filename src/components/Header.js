'use client';
import { useEffect, useState } from 'react';
import { collection, getDocs, query, where, limit } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';

export default function Header() {
  const router = useRouter();
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

  if (!featuredTitle) return null;

  return (
    <header className="header">
      <button
        type="button"
        onClick={() => router.push('/books')}
        style={{
          appearance: 'none', background: 'transparent', border: 0, padding: 0,
          cursor: 'pointer',
          fontFamily: 'var(--dd-serif)', fontSize: 14, color: 'var(--dd-text)',
          letterSpacing: '0.04em',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          maxWidth: '100%', textAlign: 'left',
        }}
        title={featuredTitle}
      >
        이 주의 책 · {featuredTitle}
      </button>
    </header>
  );
}
