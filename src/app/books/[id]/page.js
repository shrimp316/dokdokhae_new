'use client';
import { useEffect, useState, use } from 'react';
import { doc, getDoc, collection, getDocs, query, where, orderBy, addDoc, deleteDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db, storage } from '@/lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useAuth } from '@/lib/AuthContext';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';

const QuillEditor = dynamic(() => import('@/components/QuillEditor'), { ssr: false });

export default function BookReviewsPage({ params }) {
  const { id } = use(params);
  const router = useRouter();
  const { user, profile } = useAuth();

  const [book, setBook] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [content, setContent] = useState('');
  const [rating, setRating] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editContent, setEditContent] = useState('');
  const [editRating, setEditRating] = useState(0);
  const [imageFile, setImageFile] = useState(null);
  const [draft, setDraft] = useState('');

  useEffect(() => {
    getDoc(doc(db, 'books', id)).then(snap => {
      if (snap.exists()) setBook({ id: snap.id, ...snap.data() });
    });
    loadReviews();
    // 임시저장 불러오기
    const saved = localStorage.getItem(`draft-review-${id}`);
    if (saved) setDraft(saved);
  }, [id]);

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
    if (!content || content === '<p><br></p>') { alert('내용을 입력해주세요.'); return; }
    setSubmitting(true);
    try {
      let finalContent = content;
      if (imageFile) {
        const url = await uploadImage(imageFile);
        finalContent += `<p><img src="${url}" style="max-width:100%;border-radius:8px" /></p>`;
      }
      await addDoc(collection(db, 'reviews'), {
        bookId: id, content: finalContent, rating,
        nickname: profile.nickname, uid: user.uid,
        createdAt: serverTimestamp(),
      });
      setContent(''); setRating(0); setImageFile(null);
      localStorage.removeItem(`draft-review-${id}`);
      loadReviews();
    } catch (e) { alert('저장 실패: ' + e.message); }
    setSubmitting(false);
  }

  async function handleDelete(reviewId) {
    if (!confirm('삭제할까요?')) return;
    await deleteDoc(doc(db, 'reviews', reviewId));
    loadReviews();
  }

  async function handleEdit(reviewId) {
    if (!editContent || editContent === '<p><br></p>') { alert('내용을 입력해주세요.'); return; }
    await updateDoc(doc(db, 'reviews', reviewId), { content: editContent, rating: editRating, updatedAt: serverTimestamp() });
    setEditingId(null);
    loadReviews();
  }

  function saveDraft() {
    localStorage.setItem(`draft-review-${id}`, content);
    alert('임시저장 완료!');
  }

  if (!book) return <div className="empty-msg">로딩 중…</div>;

  return (
    <div>
      {/* 뒤로가기 */}
      <button onClick={() => router.push('/books')} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: 13, marginBottom: 16, padding: 0 }}>
        ← 목록으로
      </button>

      {/* 책 정보 */}
      <div className="card" style={{ padding: 16, marginBottom: 20, display: 'flex', gap: 14, alignItems: 'flex-start' }}>
        {book.cover ? (
          <img src={book.cover} alt={book.title} style={{ width: 60, height: 88, objectFit: 'cover', borderRadius: 5, flexShrink: 0, boxShadow: '1px 2px 8px rgba(0,0,0,0.12)' }} />
        ) : (
          <div style={{ width: 60, height: 88, background: 'var(--tag-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, borderRadius: 5, flexShrink: 0 }}>📚</div>
        )}
        <div>
          <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 17, fontWeight: 700, marginBottom: 4 }}>{book.title}</h1>
          <p style={{ fontSize: 13, color: 'var(--muted)' }}>{book.author}</p>
          {book.genre && <span className="tag" style={{ marginTop: 6, display: 'inline-block' }}>{book.genre}</span>}
        </div>
      </div>

      {/* 감상평 작성 */}
      {user ? (
        <div className="card" style={{ padding: 18, marginBottom: 20 }}>
          <h3 style={{ fontSize: 14, fontWeight: 500, color: 'var(--muted)', marginBottom: 12 }}>✏️ 감상평 남기기</h3>

          {/* 별점 */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
            {[1,2,3,4,5].map(n => (
              <button key={n} type="button" onClick={() => setRating(n)}
                style={{ fontSize: 22, background: 'none', border: 'none', cursor: 'pointer', color: n <= rating ? '#f0a500' : 'var(--line)', padding: 0, lineHeight: 1 }}>★</button>
            ))}
            {rating > 0 && <button onClick={() => setRating(0)} style={{ fontSize: 11, color: 'var(--muted)', background: 'none', border: 'none', cursor: 'pointer', marginLeft: 4 }}>초기화</button>}
          </div>

          {/* Quill */}
          <div style={{ marginBottom: 10 }}>
            <QuillEditor value={content} onChange={setContent} placeholder="이 책 어떠셨나요? 자유롭게 적어주세요!" minHeight={160} />
          </div>

          {/* 이미지 업로드 */}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 10 }}>
            <input type="file" accept="image/*" onChange={e => setImageFile(e.target.files[0])} style={{ flex: 1, fontSize: 12 }} />
            {imageFile && <span style={{ fontSize: 12, color: 'var(--accent2)' }}>📎 {imageFile.name}</span>}
          </div>

          {draft && (
            <button onClick={() => { setContent(draft); setDraft(''); }} style={{ fontSize: 12, color: 'var(--accent2)', background: 'none', border: 'none', cursor: 'pointer', marginBottom: 8, display: 'block' }}>
              💾 임시저장된 내용 불러오기
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
          <div key={r.id} className="review-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 13, fontWeight: 500 }}>✏️ {r.nickname}</span>
              <span style={{ fontSize: 11, color: 'var(--muted)', marginLeft: 'auto' }}>
                {r.createdAt?.toDate ? `${r.createdAt.toDate().getMonth()+1}/${r.createdAt.toDate().getDate()}` : ''}
              </span>
              {(user?.uid === r.uid) && (
                <div style={{ display: 'flex', gap: 4 }}>
                  <button className="btn-sm btn-outline" onClick={() => { setEditingId(r.id); setEditContent(r.content); setEditRating(r.rating || 0); }}>수정</button>
                  <button className="btn-sm btn-danger" onClick={() => handleDelete(r.id)}>삭제</button>
                </div>
              )}
            </div>
            {r.rating > 0 && (
              <div style={{ marginBottom: 6 }}>
                {[1,2,3,4,5].map(n => <span key={n} style={{ color: n <= r.rating ? '#f0a500' : 'var(--line)', fontSize: 14 }}>★</span>)}
              </div>
            )}
            {editingId === r.id ? (
              <div>
                <div style={{ marginBottom: 6 }}>
                  {[1,2,3,4,5].map(n => (
                    <button key={n} type="button" onClick={() => setEditRating(n)}
                      style={{ fontSize: 20, background: 'none', border: 'none', cursor: 'pointer', color: n <= editRating ? '#f0a500' : 'var(--line)', padding: 0 }}>★</button>
                  ))}
                </div>
                <QuillEditor value={editContent} onChange={setEditContent} placeholder="내용 수정…" minHeight={120} />
                <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                  <button className="btn-sm btn-outline" onClick={() => setEditingId(null)}>취소</button>
                  <button className="btn-sm" style={{ background: 'var(--accent)', color: '#fff' }} onClick={() => handleEdit(r.id)}>수정 완료</button>
                </div>
              </div>
            ) : (
              <div className="review-content" dangerouslySetInnerHTML={{ __html: r.content }} />
            )}
          </div>
        ))
      )}
    </div>
  );
}
