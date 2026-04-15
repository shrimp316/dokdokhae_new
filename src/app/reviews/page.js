'use client';
import { useEffect, useState } from 'react';
import { collection, getDocs, query, where, orderBy, doc, getDoc, deleteDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/AuthContext';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';

const QuillEditor = dynamic(() => import('@/components/QuillEditor'), { ssr: false });

export default function ReviewsPage() {
  const { user, profile } = useAuth();
  const router = useRouter();
  const [reviews, setReviews] = useState([]);
  const [books, setBooks] = useState({});
  const [editingId, setEditingId] = useState(null);
  const [editContent, setEditContent] = useState('');
  const [editRating, setEditRating] = useState(0);

  const isAdmin = profile?.role === 'admin';

  useEffect(() => {
    if (!user) return;
    loadReviews();
  }, [user, isAdmin]);

  async function loadReviews() {
    const q = isAdmin
      ? query(collection(db, 'reviews'), orderBy('createdAt', 'desc'))
      : query(collection(db, 'reviews'), where('uid', '==', user.uid), orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    const revs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    setReviews(revs);

    // 책 정보 캐시
    const bookIds = [...new Set(revs.map(r => r.bookId))];
    const bookMap = {};
    await Promise.all(bookIds.map(async bid => {
      const bsnap = await getDoc(doc(db, 'books', bid));
      if (bsnap.exists()) bookMap[bid] = { id: bsnap.id, ...bsnap.data() };
    }));
    setBooks(bookMap);
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

  const formatDate = (ts) => ts?.toDate ? `${ts.toDate().getMonth()+1}/${ts.toDate().getDate()}` : '';

  if (!user) return (
    <div>
      <div className="section-title">내 감상평</div>
      <div className="card" style={{ padding: 30, textAlign: 'center' }}>
        <p style={{ color: 'var(--muted)', marginBottom: 12 }}>로그인하면 내 감상평을 확인할 수 있어요.</p>
        <button onClick={() => router.push('/login')} className="btn-primary" style={{ maxWidth: 200, margin: '0 auto' }}>로그인 / 가입</button>
      </div>
    </div>
  );

  return (
    <div>
      <div className="section-title">{isAdmin ? '전체 감상평' : '내 감상평'}</div>
      {!isAdmin && (
        <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 14 }}>
          도서별 감상평을 남기려면 <button onClick={() => router.push('/books')} style={{ color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, textDecoration: 'underline' }}>도서 목록</button>에서 책을 선택해주세요.
        </p>
      )}

      {reviews.length === 0 ? (
        <p className="empty-msg">아직 작성한 감상평이 없어요.</p>
      ) : (
        reviews.map(r => {
          const book = books[r.bookId];
          return (
            <div key={r.id} className="review-card">
              {/* 책 정보 */}
              {book && (
                <button
                  onClick={() => router.push(`/books/${r.bookId}`)}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, background: 'var(--tag-bg)', border: 'none', borderRadius: 8, padding: '6px 10px', cursor: 'pointer', width: '100%', textAlign: 'left' }}
                >
                  {book.cover && <img src={book.cover} alt={book.title} style={{ width: 28, height: 40, objectFit: 'cover', borderRadius: 3 }} />}
                  <span style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 500 }}>📖 {book.title}</span>
                </button>
              )}

              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                {isAdmin && r.nickname && <span style={{ fontSize: 12, fontWeight: 500 }}>{r.nickname}</span>}
                <span style={{ fontSize: 11, color: 'var(--muted)' }}>{formatDate(r.createdAt)}</span>
                {r.updatedAt && <span style={{ fontSize: 11, color: 'var(--muted)' }}>(수정됨)</span>}
                <div style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
                  <button className="btn-sm btn-outline" onClick={() => { setEditingId(r.id); setEditContent(r.content); setEditRating(r.rating || 0); }}>수정</button>
                  <button className="btn-sm btn-danger" onClick={() => handleDelete(r.id)}>삭제</button>
                </div>
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
                  <QuillEditor value={editContent} onChange={setEditContent} placeholder="수정할 내용…" minHeight={120} />
                  <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                    <button className="btn-sm btn-outline" onClick={() => setEditingId(null)}>취소</button>
                    <button className="btn-sm" style={{ background: 'var(--accent)', color: '#fff' }} onClick={() => handleEdit(r.id)}>수정 완료</button>
                  </div>
                </div>
              ) : (
                <div className="review-content" dangerouslySetInnerHTML={{ __html: r.content }} />
              )}
            </div>
          );
        })
      )}
    </div>
  );
}
