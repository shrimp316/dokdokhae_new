'use client';
import { useEffect, useState } from 'react';
import { collection, getDocs, query, where, orderBy, doc, getDoc, collectionGroup } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { stripHtml } from '@/lib/searchUtils';
import { NotebookPen, CornerDownRight } from 'lucide-react';

const COMMENT_PREVIEW_LEN = 60;

export default function MyPage() {
  const { user, profile } = useAuth();
  const router = useRouter();
  const [myPosts, setMyPosts] = useState([]);
  const [myComments, setMyComments] = useState([]);
  const [tab, setTab] = useState('posts');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    loadMyData();
  }, [user]);

  async function loadMyData() {
    setLoading(true);
    // 내 게시글
    const postSnap = await getDocs(query(collection(db, 'board'), where('uid', '==', user.uid), orderBy('createdAt', 'desc')));
    setMyPosts(postSnap.docs.map(d => ({ id: d.id, ...d.data() })));

    // 내 댓글 (collectionGroup)
    try {
      const commentSnap = await getDocs(query(collectionGroup(db, 'comments'), where('uid', '==', user.uid), orderBy('createdAt', 'desc')));
      const comments = await Promise.all(commentSnap.docs.map(async d => {
        const parentRef = d.ref.parent.parent; // e.g. board/{id}, reviews/{id}, featuredPassages/{id}
        const parentCol = parentRef.parent.id; // 'board' | 'reviews' | 'featuredPassages'
        const postId = parentRef.id;
        let postTitle = '';
        try {
          const postSnap = await getDoc(parentRef);
          if (postSnap.exists()) postTitle = postSnap.data().title || '';
        } catch (e) { console.error('내 댓글 부모글 로딩 실패', e); }
        return { id: d.id, postId, postTitle, parentCol, ...d.data() };
      }));
      setMyComments(comments);
    } catch (e) {
      console.error('내 댓글 로딩 실패', e);
    }

    setLoading(false);
  }

  function commentLink(c) {
    if (c.parentCol === 'reviews') return `/reviews#${c.postId}`;
    if (c.parentCol === 'featuredPassages') return `/featured/${c.postId}`;
    return `/board/${c.postId}`;
  }

  const formatDate = (ts) => ts?.toDate ? `${ts.toDate().getMonth()+1}/${ts.toDate().getDate()}` : '';

  if (!user) return (
    <div>
      <div className="section-title">마이페이지</div>
      <div className="card" style={{ padding: 30, textAlign: 'center' }}>
        <p style={{ color: 'var(--muted)', marginBottom: 12 }}>로그인이 필요해요.</p>
        <button onClick={() => router.push('/login')} className="btn-primary" style={{ maxWidth: 200, margin: '0 auto' }}>로그인 / 가입</button>
      </div>
    </div>
  );

  return (
    <div>
      {/* 프로필 */}
      <div className="card" style={{ padding: 20, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'var(--accent)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 700, flexShrink: 0 }}>
          {profile?.nickname?.slice(0, 1)}
        </div>
        <div>
          <div style={{ fontFamily: 'var(--font-serif)', fontSize: 18, fontWeight: 700, marginBottom: 2 }}>{profile?.nickname}</div>
          <div style={{ fontSize: 13, color: 'var(--muted)' }}>{user.email}</div>
        </div>
      </div>

      {/* 탭 */}
      <div style={{ display: 'flex', border: '1.5px solid var(--line)', borderRadius: 8, overflow: 'hidden', marginBottom: 16 }}>
        {[['posts', `내 게시글 (${myPosts.length})`], ['comments', `내 댓글 (${myComments.length})`]].map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)}
            style={{ flex: 1, padding: '10px', border: 'none', background: tab === key ? 'var(--accent)' : 'none', color: tab === key ? '#fff' : 'var(--muted)', fontSize: 13, cursor: 'pointer', fontFamily: 'var(--font-sans)' }}>
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="empty-msg">로딩 중…</p>
      ) : tab === 'posts' ? (
        myPosts.length === 0 ? (
          <p className="empty-msg">작성한 게시글이 없어요.</p>
        ) : (
          myPosts.map(p => (
            <Link key={p.id} href={`/board/${p.id}`} style={{ textDecoration: 'none', display: 'block' }}>
              <div className="post-card">
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  {p.prefix && <span style={{ fontSize: 11, background: 'var(--accent)', color: '#fff', padding: '1px 7px', borderRadius: 10 }}>{p.prefix}</span>}
                  <span style={{ fontSize: 15, fontWeight: 500, color: 'var(--text)' }}>{p.title}</span>
                </div>
                <div style={{ fontSize: 11, color: 'var(--muted)' }}>{formatDate(p.createdAt)}</div>
              </div>
            </Link>
          ))
        )
      ) : (
        myComments.length === 0 ? (
          <p className="empty-msg">작성한 댓글이 없어요.</p>
        ) : (
          myComments.map(c => (
            <Link key={c.id} href={commentLink(c)} style={{ textDecoration: 'none', display: 'block' }}>
              <div className="post-card">
                <div style={{ fontSize: 11, color: 'var(--accent2)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <NotebookPen size={11} /> {c.postTitle || '게시글'}
                  {c.parentId && <span style={{ marginLeft: 6, color: 'var(--muted)', display: 'inline-flex', alignItems: 'center', gap: 3 }}><CornerDownRight size={11} /> 대댓글</span>}
                </div>
                <div style={{ fontSize: 14, color: 'var(--text)', marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                  {stripHtml(c.content).slice(0, COMMENT_PREVIEW_LEN)}{stripHtml(c.content).length > COMMENT_PREVIEW_LEN ? '…' : ''}
                </div>
                <div style={{ fontSize: 11, color: 'var(--muted)' }}>{formatDate(c.createdAt)}</div>
              </div>
            </Link>
          ))
        )
      )}
    </div>
  );
}
