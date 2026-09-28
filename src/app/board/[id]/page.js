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

import { dangerousHtml } from '@/lib/sanitize.client';
import { authenticatedJsonFetch } from '@/lib/authenticatedFetch';
import ContentLightbox from '@/components/ContentLightbox';
import CommentSection from '@/components/CommentSection';
import LikeBurst from '@/components/LikeBurst';
import { ArrowLeft } from 'lucide-react';
import styles from './board-post.module.css';

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

  // 작성·수정은 sanitize 때문에 서버 API를 거치지만, 삭제는 검증할 내용이 없어
  // firestore.rules(작성자·관리자만 허용)에 맡기고 브라우저에서 바로 지운다.
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
      <Link href="/board" className={styles.backLink}>
        <ArrowLeft size={14} /> 목록으로
      </Link>

      <div className={`card ${styles.postCard}`}>
        {editing ? (
          <div>
            {prefixes.length > 0 && (
              <select value={editPrefix} onChange={e => setEditPrefix(e.target.value)} className={styles.fieldGapSm}>
                <option value="">글머리 선택 (선택사항)</option>
                {prefixes.map(p => <option key={p.id} value={p.label}>{p.label}</option>)}
              </select>
            )}
            <input value={editTitle} onChange={e => setEditTitle(e.target.value)} className={styles.fieldGapMd} />
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
            <div className={styles.editActions}>
              <button className="btn-sm btn-outline" onClick={() => setEditing(false)}>취소</button>
              <button className={`btn-sm ${styles.editSaveBtn}`} onClick={handleEdit}>수정 완료</button>
            </div>
          </div>
        ) : (
          <>
            <div className={styles.postHead}>
              {post.prefix && <span className={styles.prefixTag}>{post.prefix}</span>}
              <h1 className={styles.postTitle}>{post.title}</h1>
            </div>
            <div className={styles.postMeta}>
              {post.nickname} · {formatDate(post.createdAt)}
              {post.updatedAt && <span> (수정됨)</span>}
            </div>
            <ContentLightbox
              contentClassName={`post-content ${styles.postBody}`}
            >
              <div dangerouslySetInnerHTML={dangerousHtml(post.content)} />
            </ContentLightbox>

            <div className={styles.actionsRow}>
              <button onClick={handleToggleLike} className={styles.roundBtn} data-liked={liked || undefined}>
                <LikeBurst liked={liked} likeCount={likeCount} size={14} />
              </button>
              <button onClick={handleShare} className={styles.roundBtn}>
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

      <div className={`card ${styles.commentsCard}`}>
        <CommentSection collectionName="board" postId={id} isAdmin={isAdmin} />
      </div>
    </div>
  );
}
