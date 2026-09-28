'use client';
import { useEffect, useMemo, useState } from 'react';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import BookShelfStudy from '@/components/BookShelfStudy';
import styles from './books-list.module.css';

export default function BooksPage() {
  const [books, setBooks] = useState([]);
  const [q, setQ] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const snap = await getDocs(query(collection(db, 'books'), orderBy('addedAt', 'desc')));
        if (cancelled) return;
        setBooks(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      } catch {
        // 불러오지 못하면 빈 서가로 둔다.
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const filtered = useMemo(() => {
    if (!q.trim()) return books;
    const needle = q.trim().toLowerCase();
    return books.filter((b) => {
      const fields = [b.title, b.author, b.genre].map((s) => (s || '').toLowerCase());
      return fields.some((s) => s.includes(needle));
    });
  }, [books, q]);

  return (
    <div className={styles.page}>
      <div className={`dd-books-head ${styles.head}`}>
        <div>
          <div className={styles.eyebrow}>
            The Library
          </div>
          <h1 className={styles.title}>
            역대 <em className={styles.titleAccent}>도서 목록</em>
          </h1>
        </div>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="제목 · 저자 · 장르"
          className={styles.searchInput}
        />
      </div>

      {filtered.length === 0 ? (
        <p className="empty-msg">등록된 책이 없어요.</p>
      ) : (
        <BookShelfStudy books={filtered} perRow={6} />
      )}
    </div>
  );
}
