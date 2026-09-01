'use client';
import { useEffect, useState, use } from 'react';
import { doc, getDoc, setDoc, collection, getDocs, query, where, orderBy, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db, storage } from '@/lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useAuth } from '@/lib/AuthContext';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import ReviewCard from '@/components/ReviewCard';
import { sanitizeHtmlForStorage } from '@/lib/sanitize.client';
import { authenticatedJsonFetch } from '@/lib/authenticatedFetch';
import { ArrowLeft, Library, MessageCircle, Pencil, Star, Save } from 'lucide-react';

const QuillEditor = dynamic(() => import('@/components/QuillEditor'), { ssr: false });

export default function BookReviewsPage({ params }) {
  const { id } = use(params);
  const router = useRouter();
  const { user, profile } = useAuth();
  const isAdmin = profile?.role === 'admin';

  const [book, setBook] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [content, setContent] = useState('');
  const [rating, setRating] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editContent, setEditContent] = useState('');
  const [editRating, setEditRating] = useState(0);
  const [draft, setDraft] = useState('');

  useEffect(() => {
    getDoc(doc(db, 'books', id)).then(snap => {
      if (snap.exists()) setBook({ id: snap.id, ...snap.data() });
    });
    loadReviews();
    loadQuestions();
  }, [id]);

  useEffect(() => {
    if (!user) { setDraft(''); return; }
    getDoc(doc(db, 'users', user.uid, 'drafts', `review_${id}`))
      .then(snap => { if (snap.exists()) setDraft(snap.data().content || ''); })
      .catch(() => {});
  }, [id, user]);

  async function loadQuestions() {
    const snap = await getDocs(query(collection(db, 'bookQuestions'), where('bookId', '==', id), orderBy('order', 'asc')));
    setQuestions(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  }

  async function loadReviews() {
    const snap = await getDocs(query(collection(db, 'reviews'), where('bookId', '==', id), orderBy('createdAt', 'desc')));
    setReviews(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  }

  async function uploadImage(file) {
    const r = ref(storage, `reviews/${Date.now()}_${file.name}`);
    await uploadBytes(r, file);
    return getDownloadURL(r);
  }

  async function handleSubmit() {
    if (!user) { router.push('/login'); return; }
    if (!profile) { alert('프로필 로딩 중입니다. 잠시 후 다시 시도해주세요.'); return; }
    if (!content || content === '<p><br></p>') { alert('내용을 입력해주세요.'); return; }
    setSubmitting(true);
    try {
      const result = await authenticatedJsonFetch('/api/content/reviews', {
        method: 'POST',
        body: { bookId: id, content, rating },
      });
      if (result.contentWasSanitized) {
        alert('안전하지 않거나 지원되지 않는 HTML을 제거한 뒤 저장했습니다.');
      }
      setContent(''); setRating(0);
      try { await deleteDoc(doc(db, 'users', user.uid, 'drafts', `review_${id}`)); } catch {}
      setDraft('');
      loadReviews();
    } catch (e) { alert('저장 실패: ' + e.message); }
    finally { setSubmitting(false); }
  }

  async function handleDelete(reviewId) {
    if (!confirm('삭제할까요?')) return;
    await deleteDoc(doc(db, 'reviews', reviewId));
    loadReviews();
  }

  async function handleEdit(reviewId) {
    if (!editContent || editContent === '<p><br></p>') { alert('내용을 입력해주세요.'); return; }
    try {
      const result = await authenticatedJsonFetch(`/api/content/reviews/${encodeURIComponent(reviewId)}`, {
        method: 'PATCH',
        body: { content: editContent, rating: editRating },
      });
      if (result.contentWasSanitized) {
        alert('안전하지 않거나 지원되지 않는 HTML을 제거한 뒤 저장했습니다.');
      }
      setEditingId(null);
      loadReviews();
    } catch (error) {
      alert(`저장 실패: ${error.message}`);
    }
  }

  async function saveDraft() {
    if (!user) { alert('로그인 후 이용해주세요.'); return; }
    const sanitized = sanitizeHtmlForStorage(content);
    if (sanitized.removedUnsafeContent) {
      alert('안전하지 않거나 지원되지 않는 HTML을 제거한 뒤 임시저장합니다.');
    }
    try {
      await setDoc(doc(db, 'users', user.uid, 'drafts', `review_${id}`), {
        bookId: id, content: sanitized.html, updatedAt: serverTimestamp(),
      });
      setContent(sanitized.html);
      setDraft(sanitized.html);
      alert('임시저장 완료!');
    } catch (e) { alert('임시저장 실패: ' + e.message); }
  }

  if (!book) return <div className="empty-msg">로딩 중…</div>;

  return (
    <div>
      {/* 뒤로가기 */}
      <button onClick={() => router.push('/books')} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: 13, marginBottom: 16, padding: 0 }}>
        <ArrowLeft size={14} /> 목록으로
      </button>

      {/* 책 정보 */}
      <div className="card" style={{ padding: 16, marginBottom: 20, display: 'flex', gap: 14, alignItems: 'flex-start' }}>
        {book.cover ? (
          <img src={book.cover} alt={book.title} style={{ width: 60, height: 88, objectFit: 'cover', borderRadius: 5, flexShrink: 0, boxShadow: '1px 2px 8px rgba(0,0,0,0.12)' }} />
        ) : (
          <div style={{ width: 60, height: 88, background: 'var(--tag-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 5, flexShrink: 0 }}><Library size={24} /></div>
        )}
        <div>
          <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 17, fontWeight: 700, marginBottom: 4 }}>{book.title}</h1>
          <p style={{ fontSize: 13, color: 'var(--muted)' }}>{book.author}</p>
          {book.genre && <span className="tag" style={{ marginTop: 6, display: 'inline-block' }}>{book.genre}</span>}
        </div>
      </div>

      {/* 토론 질문 */}
      {questions.length > 0 && (
        <div className="card" style={{ padding: 18, marginBottom: 20 }}>
          <h2 style={{ fontSize: 14, fontWeight: 600, color: 'var(--accent)', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6 }}><MessageCircle size={14} /> 독서모임 토론 질문</h2>
          <ol style={{ paddingLeft: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {questions.map((q, i) => (
              <li key={q.id} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <span style={{ fontFamily: 'var(--font-serif)', fontSize: 17, color: 'var(--accent)', flexShrink: 0, lineHeight: 1.4 }}>{i + 1}.</span>
                <span style={{ fontSize: 14, lineHeight: 1.7, color: 'var(--text)' }}>{q.question}</span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* 감상평 작성 */}
      {user ? (
        <div className="card" style={{ padding: 18, marginBottom: 20 }}>
          <h3 style={{ fontSize: 14, fontWeight: 500, color: 'var(--muted)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}><Pencil size={14} /> 감상평 남기기</h3>

          {/* 별점 */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
            {[1,2,3,4,5].map(n => (
              <button key={n} type="button" onClick={() => setRating(n)}
                style={{ fontSize: 22, background: 'none', border: 'none', cursor: 'pointer', color: n <= rating ? '#f0a500' : 'var(--line)', padding: 0, lineHeight: 1, display: 'inline-flex' }}>
                <Star size={22} fill={n <= rating ? 'currentColor' : 'none'} />
              </button>
            ))}
            {rating > 0 && <button onClick={() => setRating(0)} style={{ fontSize: 11, color: 'var(--muted)', background: 'none', border: 'none', cursor: 'pointer', marginLeft: 4 }}>초기화</button>}
          </div>

          {/* Quill */}
          <div style={{ marginBottom: 10 }}>
            <QuillEditor
              value={content}
              onChange={setContent}
              placeholder="이 책 어떠셨나요? 자유롭게 적어주세요!"
              minHeight={160}
              onImageUpload={uploadImage}
            />
          </div>

          {draft && (
            <button onClick={() => { setContent(draft); setDraft(''); }} style={{ fontSize: 12, color: 'var(--accent2)', background: 'none', border: 'none', cursor: 'pointer', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 4 }}>
              <Save size={12} /> 임시저장된 내용 불러오기
            </button>
          )}

          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={saveDraft} className="btn-sm btn-outline" style={{ flex: 1 }}>임시저장</button>
            <button onClick={handleSubmit} disabled={submitting} className="btn-sm" style={{ flex: 2, background: 'var(--accent)', color: '#fff' }}>
              {submitting ? '저장 중…' : '감상평 남기기'}
            </button>
          </div>
        </div>
      ) : (
        <div className="card" style={{ padding: 20, textAlign: 'center', marginBottom: 20 }}>
          <p style={{ color: 'var(--muted)', marginBottom: 12 }}>로그인하면 감상평을 남길 수 있어요.</p>
          <button onClick={() => router.push('/login')} className="btn-primary" style={{ maxWidth: 200, margin: '0 auto' }}>로그인 / 가입</button>
        </div>
      )}

      {/* 감상평 목록 */}
      <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 12 }}>감상평 {reviews.length}개</div>
      {reviews.length === 0 ? (
        <p className="empty-msg">아직 감상평이 없어요. 첫 번째로 남겨보세요!</p>
      ) : (
        reviews.map(r => (
          editingId === r.id ? (
            <div key={r.id} className="review-card">
              <div style={{ marginBottom: 6 }}>
                {[1,2,3,4,5].map(n => (
                  <button key={n} type="button" onClick={() => setEditRating(n)}
                    style={{ fontSize: 20, background: 'none', border: 'none', cursor: 'pointer', color: n <= editRating ? '#f0a500' : 'var(--line)', padding: 0, display: 'inline-flex' }}>
                    <Star size={20} fill={n <= editRating ? 'currentColor' : 'none'} />
                  </button>
                ))}
              </div>
              <QuillEditor
                value={editContent}
                onChange={setEditContent}
                placeholder="내용 수정…"
                minHeight={120}
                onImageUpload={uploadImage}
              />
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                <button className="btn-sm btn-outline" onClick={() => setEditingId(null)}>취소</button>
                <button className="btn-sm" style={{ background: 'var(--accent)', color: '#fff' }} onClick={() => handleEdit(r.id)}>수정 완료</button>
              </div>
            </div>
          ) : (
            <ReviewCard
              key={r.id}
              review={r}
              bookTitle={book?.title}
              isAdmin={isAdmin}
              onEdit={(rev) => { setEditingId(rev.id); setEditContent(rev.content); setEditRating(rev.rating || 0); }}
              onDelete={(rev) => handleDelete(rev.id)}
            />
          )
        ))
      )}
    </div>
  );
}
