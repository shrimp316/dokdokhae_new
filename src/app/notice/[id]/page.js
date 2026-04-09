'use client';
import { useEffect, useState, use } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import Link from 'next/link';

export default function NoticePostPage({ params }) {
  const { id } = use(params);
  const [post, setPost] = useState(null);

  useEffect(() => {
    getDoc(doc(db, 'notices', id)).then(snap => {
      if (snap.exists()) setPost({ id: snap.id, ...snap.data() });
    });
  }, [id]);

  if (!post) return <div className="empty-msg">로딩 중…</div>;

  const formatDate = (ts) => ts?.toDate ? `${ts.toDate().getFullYear()}.${ts.toDate().getMonth()+1}.${ts.toDate().getDate()}` : '';

  return (
    <div>
      <Link href="/notice" style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--muted)', fontSize: 13, marginBottom: 16, textDecoration: 'none' }}>
        ← 목록으로
      </Link>
      <div className="card" style={{ padding: 20 }}>
        {post.pinned && <div style={{ fontSize: 11, color: 'var(--accent2)', marginBottom: 6 }}>📌 고정 공지</div>}
        <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 20, fontWeight: 700, marginBottom: 8 }}>{post.title}</h1>
        <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 20, paddingBottom: 14, borderBottom: '1px solid var(--line)' }}>
          {formatDate(post.createdAt)}
        </div>
        <div style={{ fontSize: 14, lineHeight: 1.8 }} dangerouslySetInnerHTML={{ __html: post.content }} />
      </div>
    </div>
  );
}
