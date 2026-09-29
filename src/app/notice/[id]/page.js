'use client';
import { useEffect, useState, use } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { formatDotDate } from '@/lib/format';
import Link from 'next/link';
import { dangerousHtml } from '@/lib/sanitize.client';
import ContentLightbox from '@/components/ContentLightbox';
import { ArrowLeft, Pin } from 'lucide-react';
import styles from './notice-post.module.css';

export default function NoticePostPage({ params }) {
  const { id } = use(params);
  const [post, setPost] = useState(null);

  useEffect(() => {
    getDoc(doc(db, 'notices', id)).then(snap => {
      if (snap.exists()) setPost({ id: snap.id, ...snap.data() });
    });
  }, [id]);

  if (!post) return <div className="empty-msg">로딩 중…</div>;

  return (
    <div>
      <Link href="/notice" className={styles.backLink}>
        <ArrowLeft size={14} /> 목록으로
      </Link>
      <div className={`card ${styles.card}`}>
        {post.pinned && <div className={styles.pinnedTag}><Pin size={11} /> 고정 공지</div>}
        <h1 className={styles.title}>{post.title}</h1>
        <div className={styles.meta}>
          {formatDotDate(post.createdAt)}
        </div>
        <ContentLightbox contentClassName={`notice-content ${styles.body}`}>
          <div dangerouslySetInnerHTML={dangerousHtml(post.content)} />
        </ContentLightbox>
      </div>
    </div>
  );
}
