'use client';
import { useEffect, useState, use } from 'react';
import { doc, getDoc, setDoc, collection, getDocs, query, where, orderBy, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { mapDocs } from '@/lib/firestore';
import { uploadImage } from '@/lib/storage';
import { useAuth } from '@/lib/AuthContext';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import ReviewCard from '@/components/ReviewCard';
import ReviewEditForm from '@/components/ReviewEditForm';
import StarRating from '@/components/StarRating';
import { sanitizeHtmlForStorage, alertIfSanitized } from '@/lib/sanitize.client';
import { authenticatedJsonFetch } from '@/lib/authenticatedFetch';
import { isEmptyRichHtml } from '@/lib/html';
import { ArrowLeft, Library, MessageCircle, Pencil, Save } from 'lucide-react';
import styles from './book-detail.module.css';

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
    setQuestions(mapDocs(snap));
  }

  async function loadReviews() {
    const snap = await getDocs(query(collection(db, 'reviews'), where('bookId', '==', id), orderBy('createdAt', 'desc')));
    setReviews(mapDocs(snap));
  }

  async function handleSubmit() {
    if (!user) { router.push('/login'); return; }
    if (!profile) { alert('프로필 로딩 중입니다. 잠시 후 다시 시도해주세요.'); return; }
    if (isEmptyRichHtml(content)) { alert('내용을 입력해주세요.'); return; }
    setSubmitting(true);
    try {
      const result = await authenticatedJsonFetch('/api/content/reviews', {
        method: 'POST',
        body: { bookId: id, content, rating },
      });
      alertIfSanitized(result.contentWasSanitized);
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

  // 임시저장은 서버 API를 거치지 않고 본인 문서에 바로 쓰므로, 나중에 에디터로 다시 불러올 내용을 여기서 sanitize한다.
  async function saveDraft() {
    if (!user) { alert('로그인 후 이용해주세요.'); return; }
    const sanitized = sanitizeHtmlForStorage(content);
    alertIfSanitized(sanitized.removedUnsafeContent, { draft: true });
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
      <button onClick={() => router.push('/books')} className={styles.backBtn}>
        <ArrowLeft size={14} /> 목록으로
      </button>

      <div className={`card ${styles.bookInfoCard}`}>
        {book.cover ? (
          <img src={book.cover} alt={book.title} className={styles.coverImg} />
        ) : (
          <div className={styles.coverPlaceholder}><Library size={24} /></div>
        )}
        <div>
          <h1 className={styles.bookTitle}>{book.title}</h1>
          <p className={styles.bookAuthor}>{book.author}</p>
          {book.genre && <span className={`tag ${styles.genreTag}`}>{book.genre}</span>}
        </div>
      </div>

      {questions.length > 0 && (
        <div className={`card ${styles.questionsCard}`}>
          <h2 className={styles.questionsTitle}><MessageCircle size={14} /> 독서모임 토론 질문</h2>
          <ol className={styles.questionsList}>
            {questions.map((q, i) => (
              <li key={q.id} className={styles.questionItem}>
                <span className={styles.questionNum}>{i + 1}.</span>
                <span className={styles.questionText}>{q.question}</span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {user ? (
        <div className={`card ${styles.reviewFormCard}`}>
          <h3 className={styles.reviewFormTitle}><Pencil size={14} /> 감상평 남기기</h3>

          <StarRating value={rating} onChange={setRating} size={22} allowReset className={styles.starRow} />

          <div className={styles.editorWrap}>
            <QuillEditor
              value={content}
              onChange={setContent}
              placeholder="이 책 어떠셨나요? 자유롭게 적어주세요!"
              minHeight={160}
              onImageUpload={(file) => uploadImage('reviews', file)}
            />
          </div>

          {draft && (
            <button onClick={() => { setContent(draft); setDraft(''); }} className={styles.draftBtn}>
              <Save size={12} /> 임시저장된 내용 불러오기
            </button>
          )}

          <div className={styles.formActions}>
            <button onClick={saveDraft} className={`btn-sm btn-outline ${styles.draftSubmitBtn}`}>임시저장</button>
            <button onClick={handleSubmit} disabled={submitting} className={`btn-sm ${styles.postSubmitBtn}`}>
              {submitting ? '저장 중…' : '감상평 남기기'}
            </button>
          </div>
        </div>
      ) : (
        <div className={`card ${styles.loginPrompt}`}>
          <p className={styles.loginPromptText}>로그인하면 감상평을 남길 수 있어요.</p>
          <button onClick={() => router.push('/login')} className={`btn-primary ${styles.loginPromptBtn}`}>로그인 / 가입</button>
        </div>
      )}

      <div className={styles.reviewCountLabel}>감상평 {reviews.length}개</div>
      {reviews.length === 0 ? (
        <p className="empty-msg">아직 감상평이 없어요. 첫 번째로 남겨보세요!</p>
      ) : (
        reviews.map(r => (
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
              bookTitle={book?.title}
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
