'use client';
import { useEffect, useState } from 'react';
import { collection, getDocs, query, where, orderBy, doc, getDoc, deleteDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db, storage } from '@/lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useAuth } from '@/lib/AuthContext';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import SearchBar from '@/components/SearchBar';
import { stripHtml, matchAny } from '@/lib/searchUtils';
import ReviewCard from '@/components/ReviewCard';

const QuillEditor = dynamic(() => import('@/components/QuillEditor'), { ssr: false });

export default function ReviewsPage() {
  const { user, profile } = useAuth();
  const router = useRouter();
  const [reviews, setReviews] = useState([]);
  const [books, setBooks] = useState({});
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
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

  const filtered = reviews.filter(r =>
    matchAny([stripHtml(r.content), books[r.bookId]?.title], search)
  );

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

      <SearchBar
        value={searchInput}
        onChange={setSearchInput}
        onSubmit={v => setSearch(v)}
        placeholder="감상평 내용, 책 제목으로 검색…"
      />

      {filtered.length === 0 ? (
        <p className="empty-msg">아직 작성한 감상평이 없어요.</p>
      ) : (
        filtered.map(r => (
          editingId === r.id ? (
            <div key={r.id} className="review-card">
              <div style={{ marginBottom: 6 }}>
                {[1,2,3,4,5].map(n => (
                  <button key={n} type="button" onClick={() => setEditRating(n)}
                    style={{ fontSize: 20, background: 'none', border: 'none', cursor: 'pointer', color: n <= editRating ? '#f0a500' : 'var(--line)', padding: 0 }}>★</button>
                ))}
              </div>
              <QuillEditor
                value={editContent}
                onChange={setEditContent}
                placeholder="수정할 내용…"
                minHeight={120}
                onImageUpload={async (file) => {
                  const fr = ref(storage, `reviews/${Date.now()}_${file.name}`);
                  await uploadBytes(fr, file);
                  return getDownloadURL(fr);
                }}
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
              bookTitle={books[r.bookId]?.title}
              showBookTitle
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
