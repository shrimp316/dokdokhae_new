'use client';
import { useEffect, useState, use } from 'react';
import { doc, getDoc, deleteDoc, collection, getDocs } from 'firebase/firestore';
import { db, storage } from '@/lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useAuth } from '@/lib/AuthContext';
import { useLikes } from '@/lib/usePostInteractions';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';

import { dangerousHtml } from '@/lib/sanitize';
import { authenticatedJsonFetch } from '@/lib/authenticatedFetch';
import ContentLightbox from '@/components/ContentLightbox';
import CommentSection from '@/components/CommentSection';
import LikeBurst from '@/components/LikeBurst';
import { ArrowLeft } from 'lucide-react';

const QuillEditor = dynamic(() => import('@/components/QuillEditor'), { ssr: false });

export default function BoardPostPage({ params }) {
  const { id } = use(params);
  const { user, profile } = useAuth();
  const router = useRouter();

  const [post, setPost] = useState(null);
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editPrefix, setEditPrefix] = useState('');
  const [prefixes, setPrefixes] = useState([]);

  const { liked, likeCount, toggleLike } = useLikes('board', id, user);

  useEffect(() => {
    loadPost();
    loadPrefixes();
  }, [id]);

  async function loadPost() {
    const snap = await getDoc(doc(db, 'board', id));
    if (!snap.exists()) { router.push('/board'); return; }
    const data = { id: snap.id, ...snap.data() };
    setPost(data);
    setEditTitle(data.title);
    setEditContent(data.content);
    setEditPrefix(data.prefix || '');
  }

  async function loadPrefixes() {
    try {
      const snap = await getDocs(collection(db, 'boardPrefixes'));
      setPrefixes(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch {}
  }

  async function handleToggleLike() {
    if (!user) { router.push('/login'); return; }
    await toggleLike();
  }

  async function handleDelete() {
    if (!confirm('삭제할까요?')) return;
    await deleteDoc(doc(db, 'board', id));
    router.push('/board');
  }

  async function handleEdit() {
    if (!editTitle.trim() || !editContent) { alert('제목과 내용을 입력해주세요.'); return; }
    try {
      const result = await authenticatedJsonFetch(`/api/content/board/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        body: { title: editTitle, prefix: editPrefix, content: editContent },
      });
      if (result.contentWasSanitized) {
        alert('안전하지 않거나 지원되지 않는 HTML을 제거한 뒤 저장했습니다.');
      }
      setEditing(false);
      loadPost();
    } catch (error) {
      alert(`저장 실패: ${error.message}`);
    }
  }

  async function handleShare() {
    const url = window.location.href;
    if (navigator.share) {
      await navigator.share({ title: post.title, url });
    } else {
      await navigator.clipboard.writeText(url);
      alert('링크가 복사됐어요!');
    }
  }

  const formatDate = (ts) => ts?.toDate ? `${ts.toDate().getMonth()+1}/${ts.toDate().getDate()}` : '';

  if (!post) return <div className="empty-msg">로딩 중…</div>;

  const isAdmin = profile?.role === 'admin';
  const canEdit = user?.uid === post.uid || isAdmin;

  return (
    <div>
      <Link href="/board" style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--muted)', fontSize: 13, marginBottom: 16, textDecoration: 'none' }}>
        <ArrowLeft size={14} /> 목록으로
      </Link>

      {/* 게시글 */}
      <div className="card" style={{ padding: 20, marginBottom: 16 }}>
        {editing ? (
          <div>
            {prefixes.length > 0 && (
              <select value={editPrefix} onChange={e => setEditPrefix(e.target.value)} style={{ marginBottom: 8 }}>
                <option value="">글머리 선택 (선택사항)</option>
                {prefixes.map(p => <option key={p.id} value={p.label}>{p.label}</option>)}
              </select>
            )}
            <input value={editTitle} onChange={e => setEditTitle(e.target.value)} style={{ marginBottom: 10 }} />
            <QuillEditor
              value={editContent}
              onChange={setEditContent}
              placeholder="내용…"
              minHeight={200}
              onImageUpload={async (file) => {
                const r = ref(storage, `board/${Date.now()}_${file.name}`);
                await uploadBytes(r, file);
                return getDownloadURL(r);
              }}
            />
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <button className="btn-sm btn-outline" onClick={() => setEditing(false)}>취소</button>
              <button className="btn-sm" style={{ background: 'var(--accent)', color: '#fff' }} onClick={handleEdit}>수정 완료</button>
            </div>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 8 }}>
              {post.prefix && <span style={{ fontSize: 11, background: 'var(--accent)', color: '#fff', padding: '2px 8px', borderRadius: 10, flexShrink: 0 }}>{post.prefix}</span>}
              <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 19, fontWeight: 700, lineHeight: 1.4 }}>{post.title}</h1>
            </div>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 16, paddingBottom: 14, borderBottom: '1px solid var(--line)' }}>
              {post.nickname} · {formatDate(post.createdAt)}
              {post.updatedAt && <span> (수정됨)</span>}
            </div>
            <ContentLightbox
              contentClassName="post-content"
              contentStyle={{ fontSize: 14, lineHeight: 1.8 }}
            >
              <div dangerouslySetInnerHTML={dangerousHtml(post.content)} />
            </ContentLightbox>

            {/* 좋아요 + 액션 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 20, paddingTop: 14, borderTop: '1px solid var(--line)' }}>
              <button onClick={handleToggleLike} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', border: `1.5px solid ${liked ? 'var(--accent2)' : 'var(--line)'}`, borderRadius: 20, background: liked ? '#fff8f0' : 'none', color: liked ? 'var(--accent2)' : 'var(--muted)', cursor: 'pointer', fontSize: 13 }}>
                <LikeBurst liked={liked} likeCount={likeCount} size={14} />
              </button>
              <button onClick={handleShare} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', border: '1.5px solid var(--line)', borderRadius: 20, background: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: 13 }}>
                공유
              </button>
              {canEdit && (
                <>
                  <button className="btn-sm btn-outline" onClick={() => setEditing(true)}>수정</button>
                  <button className="btn-sm btn-danger" onClick={handleDelete}>삭제</button>
                </>
              )}
            </div>
          </>
        )}
      </div>

      {/* 댓글 */}
      <div className="card" style={{ padding: 20 }}>
        <CommentSection collectionName="board" postId={id} isAdmin={isAdmin} />
      </div>
    </div>
  );
}
