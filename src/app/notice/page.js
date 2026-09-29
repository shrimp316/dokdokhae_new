'use client';
import { useEffect, useState } from 'react';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { mapDocs } from '@/lib/firestore';
import { formatDotDate } from '@/lib/format';
import Link from 'next/link';
import { Pin } from 'lucide-react';
import styles from './notice-list.module.css';

export default function NoticePage() {
  const [posts, setPosts] = useState([]);

  useEffect(() => {
    getDocs(query(collection(db, 'notices'), orderBy('createdAt', 'desc')))
      .then(snap => setPosts(mapDocs(snap)));
  }, []);

  return (
    <div>
      <div className="section-title">공지사항</div>
      {posts.length === 0 ? (
        <p className="empty-msg">공지가 없어요.</p>
      ) : (
        posts.map(p => (
          <Link key={p.id} href={`/notice/${p.id}`} className={styles.rowLink}>
            <div className={`post-card ${p.pinned ? 'pinned' : ''}`}>
              {p.pinned && <div className={styles.pinnedTag}><Pin size={11} /> 고정</div>}
              <div className={styles.title}>{p.title}</div>
              <div className={styles.date}>{formatDotDate(p.createdAt)}</div>
            </div>
          </Link>
        ))
      )}
    </div>
  );
}
