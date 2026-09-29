'use client';
import { useEffect, useState } from 'react';
import { collection, getDocs, query, where, orderBy, doc, getDoc, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { mapDocs } from '@/lib/firestore';
import { useAuth } from '@/lib/AuthContext';
import { useRouter } from 'next/navigation';
import SearchBar from '@/components/SearchBar';
import { stripHtml, matchAny } from '@/lib/searchUtils';
import ReviewCard from '@/components/ReviewCard';
import ReviewEditForm from '@/components/ReviewEditForm';
import styles from './reviews.module.css';

export default function ReviewsPage() {
  const { user, profile } = useAuth();
  const router = useRouter();
  const [reviews, setReviews] = useState([]);
  const [books, setBooks] = useState({});
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState(null);

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
    const revs = mapDocs(snap);
    setReviews(revs);

    // 카드에 책 제목을 보여주기 위해 필요한 책만 한 번씩 읽는다.
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

  const filtered = reviews.filter(r =>
    matchAny([stripHtml(r.content), books[r.bookId]?.title], search)
  );

  if (!user) return (
    <div>
      <div className="section-title">내 감상평</div>
      <div className={`card ${styles.loginPrompt}`}>
        <p className={styles.loginPromptText}>로그인하면 내 감상평을 확인할 수 있어요.</p>
        <button onClick={() => router.push('/login')} className={`btn-primary ${styles.loginPromptBtn}`}>로그인 / 가입</button>
      </div>
    </div>
  );

  return (
    <div>
      <div className="section-title">{isAdmin ? '전체 감상평' : '내 감상평'}</div>
      {!isAdmin && (
        <p className={styles.hintText}>
          도서별 감상평을 남기려면 <button onClick={() => router.push('/books')} className={styles.hintLink}>도서 목록</button>에서 책을 선택해주세요.
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
            <ReviewEditForm
              key={r.id}
              review={r}
              onCancel={() => setEditingId(null)}
              onSaved={() => { setEditingId(null); loadReviews(); }}
            />
          ) : (
            <ReviewCard
              key={r.id}
              review={r}
              bookTitle={books[r.bookId]?.title}
              showBookTitle
              isAdmin={isAdmin}
              onEdit={(rev) => setEditingId(rev.id)}
              onDelete={(rev) => handleDelete(rev.id)}
            />
          )
        ))
      )}
    </div>
  );
}
