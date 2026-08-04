'use client';
import { useEffect, useState } from 'react';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import Link from 'next/link';
import { Pin } from 'lucide-react';

export default function NoticePage() {
  const [posts, setPosts] = useState([]);

  useEffect(() => {
    getDocs(query(collection(db, 'notices'), orderBy('createdAt', 'desc')))
      .then(snap => setPosts(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
  }, []);

  const formatDate = (ts) => ts?.toDate ? `${ts.toDate().getFullYear()}.${ts.toDate().getMonth()+1}.${ts.toDate().getDate()}` : '';

  return (
    <div>
      <div className="section-title">공지사항</div>
      {posts.length === 0 ? (
        <p className="empty-msg">공지가 없어요.</p>
      ) : (
        posts.map(p => (
          <Link key={p.id} href={`/notice/${p.id}`} style={{ textDecoration: 'none', display: 'block' }}>
            <div className={`post-card ${p.pinned ? 'pinned' : ''}`}>
              {p.pinned && <div style={{ fontSize: 11, color: 'var(--accent2)', marginBottom: 4, display: 'inline-flex', alignItems: 'center', gap: 3 }}><Pin size={11} /> 고정</div>}
              <div style={{ fontSize: 15, fontWeight: 500, color: 'var(--text)' }}>{p.title}</div>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>{formatDate(p.createdAt)}</div>
            </div>
          </Link>
        ))
      )}
    </div>
  );
}
