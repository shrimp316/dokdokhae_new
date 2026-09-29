'use client';
import { useEffect, useState } from 'react';
import { collection, getDocs, addDoc, deleteDoc, updateDoc, doc, query, orderBy, where, serverTimestamp } from 'firebase/firestore';
import { db, storage } from '@/lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useAuth } from '@/lib/AuthContext';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { stripHtml } from '@/lib/searchUtils';
import { authenticatedFetch, authenticatedJsonFetch } from '@/lib/authenticatedFetch';
import {
  Lock, Settings, BookOpen, Star, MessageCircle, Bot, NotebookPen, Calendar,
  Volume2, Tag, Bell, PenLine, ScrollText, Pencil, Lightbulb, Download, Link2,
  CheckCircle2, Clock, Pin, Megaphone,
} from 'lucide-react';
import styles from './admin.module.css';

const QuillEditor = dynamic(() => import('@/components/QuillEditor'), { ssr: false });

const INITIAL_PASSAGE = {
  kind: 'curator_intro',
  bookTitle: '', bookAuthor: '', bookId: '',
  bookDescription: '',
  excerpt: '', curatorNote: '',
  period: 'weekly', questions: [],
  source: '', sourceType: 'manual', sourceUrl: '',
  publicDomain: false,
  aiGeneratedNote: false,
  aiGeneratedQuestions: false,
};

// 카카오 REST 키는 서버에만 두고, 브라우저는 관리자 인증을 거치는 /api/book-search를 통해서만 검색한다.
async function searchKakaoBooks(query) {
  const data = await authenticatedJsonFetch(`/api/book-search?q=${encodeURIComponent(query.trim())}`);
  return data?.documents || [];
}

export default function AdminPage() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();
  const isAdmin = profile?.role === 'admin';

  const [tab, setTab] = useState('books');

  // 책
  const [books, setBooks] = useState([]);
  const [bookSearch, setBookSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [newBook, setNewBook] = useState({ title: '', author: '', cover: '', genre: '', isbn: '', description: '', featured: false });

  // 일정
  const [meetings, setMeetings] = useState([]);
  const [newMeeting, setNewMeeting] = useState({ start: '', end: '', bookId: '', note: '' });

  // 공지
  const [notices, setNotices] = useState([]);
  const [newNotice, setNewNotice] = useState({ title: '', content: '', pinned: false });
  const [editingNoticeId, setEditingNoticeId] = useState(null);
  const [editNotice, setEditNotice] = useState({ title: '', content: '', pinned: false });

  // 글머리
  const [prefixes, setPrefixes] = useState([]);
  const [newPrefix, setNewPrefix] = useState('');

  // 예약 알림
  const [scheduled, setScheduled] = useState([]);
  const [newNotif, setNewNotif] = useState({ title: '', body: '', date: '', url: '/' });
  const [sendingNow, setSendingNow] = useState(false);

  // 책 토론 질문
  const [selectedBookForQ, setSelectedBookForQ] = useState('');
  const [bookQuestions, setBookQuestions] = useState([]);
  const [newQuestion, setNewQuestion] = useState('');
  const [aiQLoading, setAiQLoading] = useState(false);
  const [aiQResults, setAiQResults] = useState([]);
  const [editingQuestionId, setEditingQuestionId] = useState(null);
  const [editQuestionText, setEditQuestionText] = useState('');

  // 이 주/달의 글
  const [passages, setPassages] = useState([]);
  const [passageMode, setPassageMode] = useState('curator'); // 'curator' | 'pd' | 'manual'
  const [newPassage, setNewPassage] = useState(INITIAL_PASSAGE);
  const [newPassageQuestion, setNewPassageQuestion] = useState('');
  const [aiPassageLoading, setAiPassageLoading] = useState(false);
  const [editingPassageId, setEditingPassageId] = useState(null);
  const [editPassage, setEditPassage] = useState({ bookTitle: '', bookAuthor: '', kind: 'curator_intro', excerpt: '', curatorNote: '', passage: '', questions: [], source: '', sourceType: 'manual', sourceUrl: '', publicDomain: false });
  const [editPassageQuestion, setEditPassageQuestion] = useState('');

  // Curator 모드 책 검색
  const [passageBookSearch, setPassageBookSearch] = useState('');
  const [passageKakaoResults, setPassageKakaoResults] = useState([]);

  // PD 모드 Gutendex 검색
  const [pdSearchQuery, setPdSearchQuery] = useState('');
  const [pdSearchResults, setPdSearchResults] = useState([]);
  const [pdSearchLoading, setPdSearchLoading] = useState(false);
  const [pdTextLoading, setPdTextLoading] = useState(false);

  // 지금은 탭을 바꿀 때마다 모든 컬렉션을 다시 읽는다. 탭을 컴포넌트로 나눌 때 탭별로 필요한 것만 읽도록 바꾼다.
  useEffect(() => {
    if (isAdmin) { loadAll(); }
  }, [isAdmin, tab]);

  function loadAll() {
    loadBooks(); loadMeetings(); loadNotices(); loadPrefixes(); loadScheduled(); loadPassages();
  }

  async function loadBooks() {
    const snap = await getDocs(query(collection(db, 'books'), orderBy('addedAt', 'desc')));
    setBooks(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  }
  async function loadMeetings() {
    const snap = await getDocs(query(collection(db, 'meetings'), orderBy('date', 'asc')));
    setMeetings(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  }
  async function loadNotices() {
    const snap = await getDocs(query(collection(db, 'notices'), orderBy('createdAt', 'desc')));
    setNotices(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  }
  async function loadPrefixes() {
    try {
      const snap = await getDocs(collection(db, 'boardPrefixes'));
      setPrefixes(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch {}
  }

  async function loadScheduled() {
    try {
      const snap = await getDocs(query(collection(db, 'scheduledNotifications'), orderBy('date', 'asc')));
      setScheduled(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch {}
  }

  // 책 토론 질문 함수
  async function loadBookQuestions(bookId) {
    if (!bookId) { setBookQuestions([]); return; }
    const snap = await getDocs(query(collection(db, 'bookQuestions'), where('bookId', '==', bookId), orderBy('order', 'asc')));
    setBookQuestions(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  }

  async function addQuestion() {
    if (!selectedBookForQ) { alert('책을 선택해주세요.'); return; }
    if (!newQuestion.trim()) { alert('질문을 입력해주세요.'); return; }
    await addDoc(collection(db, 'bookQuestions'), {
      bookId: selectedBookForQ, question: newQuestion.trim(),
      order: bookQuestions.length, createdAt: serverTimestamp(), createdBy: user.uid,
    });
    setNewQuestion('');
    loadBookQuestions(selectedBookForQ);
  }

  async function deleteQuestion(id) {
    if (!confirm('질문을 삭제할까요?')) return;
    await deleteDoc(doc(db, 'bookQuestions', id));
    loadBookQuestions(selectedBookForQ);
  }

  async function generateAIQuestions() {
    if (!selectedBookForQ) { alert('책을 선택해주세요.'); return; }
    const book = books.find(b => b.id === selectedBookForQ);
    if (!book) return;
    setAiQLoading(true);
    setAiQResults([]);
    try {
      const res = await authenticatedFetch('/api/ai-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: book.title, author: book.author, description: book.description }),
      });
      const data = await res.json();
      if (data.error) { alert('AI 오류: ' + data.error); return; }
      setAiQResults(data.questions || []);
    } catch (e) {
      alert('생성 실패: ' + e.message);
    } finally {
      setAiQLoading(false);
    }
  }

  async function saveEditQuestion(id) {
    if (!editQuestionText.trim()) return;
    await updateDoc(doc(db, 'bookQuestions', id), { question: editQuestionText.trim() });
    setEditingQuestionId(null);
    loadBookQuestions(selectedBookForQ);
  }

  async function saveAIQuestion(q) {
    if (!selectedBookForQ) return;
    await addDoc(collection(db, 'bookQuestions'), {
      bookId: selectedBookForQ, question: q,
      order: bookQuestions.length, createdAt: serverTimestamp(), createdBy: user.uid,
    });
    loadBookQuestions(selectedBookForQ);
  }

  // 이 주/달의 글 함수
  async function loadPassages() {
    try {
      const snap = await getDocs(query(collection(db, 'featuredPassages'), orderBy('createdAt', 'desc')));
      setPassages(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch {}
  }

  function getPeriodKey(period) {
    const now = new Date();
    if (period === 'monthly') {
      return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    }
    // 주간 글은 ISO 주차로 묶는다. 연말·연초에 걸친 주도 한 주로 셀 수 있다.
    const d = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
  }

  async function addPassage() {
    const kind = passageMode === 'pd' ? 'public_domain' : 'curator_intro';
    if (!newPassage.bookTitle?.trim()) { alert('책 제목을 입력해주세요.'); return; }
    if (kind === 'public_domain' && !newPassage.excerpt?.trim()) { alert('원문 발췌가 필요합니다.'); return; }
    if (kind === 'curator_intro' && !newPassage.curatorNote?.trim() && !newPassage.excerpt?.trim()) {
      alert('큐레이터 코멘트 또는 발췌문을 입력해주세요.'); return;
    }
    if (newPassage.excerpt?.trim() && !newPassage.source?.trim() && !newPassage.sourceUrl?.trim()) {
      alert('직접 인용을 사용할 때는 출처(텍스트) 또는 출처 URL이 필요합니다.'); return;
    }
    const periodKey = getPeriodKey(newPassage.period);
    // passage는 kind가 생기기 전 형식의 필드다. 예전 화면도 내용을 보여줄 수 있게 대표 텍스트를 계속 채운다.
    const passageBackcompat = newPassage.excerpt?.trim() || newPassage.curatorNote?.trim() || '';
    await addDoc(collection(db, 'featuredPassages'), {
      kind,
      bookTitle: newPassage.bookTitle,
      bookAuthor: newPassage.bookAuthor,
      bookId: newPassage.bookId || '',
      excerpt: newPassage.excerpt || '',
      curatorNote: newPassage.curatorNote || '',
      passage: passageBackcompat,
      period: newPassage.period,
      periodKey,
      questions: newPassage.questions || [],
      source: newPassage.source || '',
      sourceType: newPassage.sourceType || (kind === 'public_domain' ? 'gutendex' : 'manual'),
      sourceUrl: newPassage.sourceUrl || '',
      publicDomain: kind === 'public_domain' ? true : !!newPassage.publicDomain,
      aiGenerated: {
        curatorNote: !!newPassage.aiGeneratedNote,
        questions: !!newPassage.aiGeneratedQuestions,
      },
      year: new Date().getFullYear(),
      isActive: false,
      createdAt: serverTimestamp(),
    });
    setNewPassage(INITIAL_PASSAGE);
    setNewPassageQuestion('');
    setPassageKakaoResults([]); setPassageBookSearch('');
    setPdSearchResults([]); setPdSearchQuery('');
    loadPassages();
    alert('등록되었어요!');
  }

  async function deletePassage(id) {
    if (!confirm('삭제할까요?')) return;
    await deleteDoc(doc(db, 'featuredPassages', id));
    loadPassages();
  }

  // 노출 중인 글은 하나뿐이어야 한다. 지금은 하나씩 갱신해서 중간에 실패하면 0개나 2개가 될 수 있으므로
  // writeBatch로 한 번에 커밋하도록 바꿀 예정이다. (setFeatured·addBook도 같다)
  async function togglePassageActive(id, currentActive) {
    if (!currentActive) {
      const prev = await getDocs(query(collection(db, 'featuredPassages'), where('isActive', '==', true)));
      for (const d of prev.docs) await updateDoc(doc(db, 'featuredPassages', d.id), { isActive: false });
    }
    await updateDoc(doc(db, 'featuredPassages', id), { isActive: !currentActive });
    loadPassages();
  }

  async function saveEditPassage(id) {
    if (!editPassage.bookTitle?.trim()) { alert('책 제목을 입력해주세요.'); return; }
    const kind = editPassage.kind || 'curator_intro';
    if (kind === 'public_domain' && !editPassage.excerpt?.trim()) {
      alert('원문 발췌가 필요합니다.'); return;
    }
    if (kind === 'curator_intro' && !editPassage.curatorNote?.trim() && !editPassage.excerpt?.trim() && !editPassage.passage?.trim()) {
      alert('큐레이터 코멘트 또는 발췌문이 필요합니다.'); return;
    }
    const passageBackcompat = editPassage.excerpt?.trim() || editPassage.curatorNote?.trim() || editPassage.passage?.trim() || '';
    await updateDoc(doc(db, 'featuredPassages', id), {
      bookTitle: editPassage.bookTitle,
      bookAuthor: editPassage.bookAuthor,
      kind,
      excerpt: editPassage.excerpt || '',
      curatorNote: editPassage.curatorNote || '',
      passage: passageBackcompat,
      questions: editPassage.questions,
      source: editPassage.source,
      sourceType: editPassage.sourceType || 'manual',
      sourceUrl: editPassage.sourceUrl || '',
      publicDomain: kind === 'public_domain' ? true : !!editPassage.publicDomain,
    });
    setEditingPassageId(null);
    loadPassages();
  }

  async function generateAIPassage() {
    const kind = passageMode === 'pd' ? 'public_domain' : 'curator_intro';
    if (!newPassage.bookTitle?.trim() || !newPassage.bookAuthor?.trim()) {
      alert('먼저 책을 선택해주세요 (제목·저자 필요).'); return;
    }
    if (kind === 'public_domain' && !newPassage.excerpt?.trim()) {
      alert('원문 발췌를 먼저 입력해주세요.'); return;
    }
    setAiPassageLoading(true);
    try {
      const res = await authenticatedFetch('/api/ai-passage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind,
          bookTitle: newPassage.bookTitle,
          bookAuthor: newPassage.bookAuthor,
          bookDescription: newPassage.bookDescription || '',
          excerpt: newPassage.excerpt || '',
        }),
      });
      const data = await res.json();
      if (data.error) { alert('AI 오류: ' + data.error); return; }
      setNewPassage(prev => ({
        ...prev,
        curatorNote: data.curatorNote || prev.curatorNote,
        questions: data.questions?.length ? data.questions : prev.questions,
        aiGeneratedNote: !!data.curatorNote,
        aiGeneratedQuestions: !!(data.questions && data.questions.length),
      }));
    } catch (e) {
      alert('생성 실패: ' + e.message);
    } finally {
      setAiPassageLoading(false);
    }
  }

  async function searchKakaoForPassage() {
    if (!passageBookSearch.trim()) return;
    try {
      setPassageKakaoResults(await searchKakaoBooks(passageBookSearch));
    } catch (e) { alert('검색 실패: ' + e.message); }
  }

  function selectPassageKakaoBook(b) {
    setNewPassage(prev => ({
      ...prev,
      bookTitle: b.title,
      bookAuthor: (b.authors || []).join(', '),
      bookDescription: b.contents || '',
      bookId: '',
    }));
    setPassageKakaoResults([]);
    setPassageBookSearch('');
  }

  function selectPassageBookFromCollection(bookId) {
    if (!bookId) {
      setNewPassage(prev => ({ ...prev, bookId: '', bookTitle: '', bookAuthor: '', bookDescription: '' }));
      return;
    }
    const b = books.find(x => x.id === bookId);
    if (!b) return;
    setNewPassage(prev => ({
      ...prev,
      bookId,
      bookTitle: b.title || prev.bookTitle,
      bookAuthor: b.author || prev.bookAuthor,
      bookDescription: b.description || prev.bookDescription,
    }));
  }

  async function searchGutendex() {
    if (!pdSearchQuery.trim()) return;
    setPdSearchLoading(true);
    try {
      const res = await fetch(`/api/pd-search?q=${encodeURIComponent(pdSearchQuery)}&lang=ko`);
      const data = await res.json();
      if (data.error) { alert('검색 실패: ' + data.error); setPdSearchResults([]); return; }
      setPdSearchResults(data.books || []);
    } catch (e) {
      alert('검색 실패: ' + e.message);
    } finally {
      setPdSearchLoading(false);
    }
  }

  async function selectGutendexBook(b) {
    const txtKey = Object.keys(b.formats || {}).find(k => k.startsWith('text/plain'));
    const htmlKey = Object.keys(b.formats || {}).find(k => k.startsWith('text/html'));
    const sourceUrl = (txtKey && b.formats[txtKey]) || (htmlKey && b.formats[htmlKey]) || '';
    let preview = '';
    if (txtKey) {
      setPdTextLoading(true);
      try {
        const res = await fetch(`/api/pd-search?proxy=${encodeURIComponent(b.formats[txtKey])}`);
        if (res.ok) {
          const text = await res.text();
          // 구텐베르크 텍스트 앞뒤의 라이선스 머리말·꼬리말을 떼고 본문만 발췌 후보로 쓴다.
          const start = text.indexOf('*** START');
          const end = text.indexOf('*** END');
          let body = text;
          if (start >= 0) {
            const nl = text.indexOf('\n', start);
            body = end > start ? text.slice(nl + 1, end) : text.slice(nl + 1);
          }
          preview = body.trim().slice(0, 1500);
        }
      } catch {}
      setPdTextLoading(false);
    }
    setNewPassage(prev => ({
      ...prev,
      kind: 'public_domain',
      bookTitle: b.title || '',
      bookAuthor: (b.authors || []).join(', '),
      bookDescription: '',
      excerpt: preview,
      sourceType: 'gutendex',
      sourceUrl,
      publicDomain: true,
      bookId: '',
    }));
    setPdSearchResults([]);
  }

  async function addScheduledNotif() {
    if (!newNotif.title || !newNotif.body || !newNotif.date) { alert('제목, 내용, 날짜를 모두 입력해주세요.'); return; }
    await addDoc(collection(db, 'scheduledNotifications'), { ...newNotif, sent: false, createdAt: serverTimestamp() });
    setNewNotif({ title: '', body: '', date: '', url: '/' });
    loadScheduled();
    alert('예약 알림이 등록되었어요!');
  }

  async function deleteScheduled(id) {
    if (!confirm('삭제할까요?')) return;
    await deleteDoc(doc(db, 'scheduledNotifications', id));
    loadScheduled();
  }

  async function sendNow() {
    if (!newNotif.title || !newNotif.body) { alert('제목과 내용을 입력해주세요.'); return; }
    setSendingNow(true);
    try {
      const res = await authenticatedFetch('/api/send-notification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newNotif.title, body: newNotif.body, url: newNotif.url || '/' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Notification send failed');
      alert(`✅ ${data.sent}명에게 알림을 보냈어요!`);
      setNewNotif({ title: '', body: '', date: '', url: '/' });
    } catch (e) { alert('발송 실패: ' + e.message); }
    setSendingNow(false);
  }

  async function searchKakao() {
    if (!bookSearch.trim()) return;
    try {
      setSearchResults(await searchKakaoBooks(bookSearch));
    } catch (e) { alert('검색 실패: ' + e.message); }
  }

  function selectKakaoBook(b) {
    setNewBook({ title: b.title, author: (b.authors||[]).join(', '), cover: b.thumbnail, genre: b.genre || '', isbn: b.isbn, description: b.contents, featured: false });
    setSearchResults([]);
  }

  async function addBook() {
    if (!newBook.title) { alert('제목을 입력해주세요.'); return; }
    if (newBook.featured) {
      const prev = await getDocs(query(collection(db, 'books'), where('featured', '==', true)));
      for (const d of prev.docs) await updateDoc(doc(db, 'books', d.id), { featured: false });
    }
    await addDoc(collection(db, 'books'), { ...newBook, addedAt: serverTimestamp() });
    setNewBook({ title: '', author: '', cover: '', genre: '', isbn: '', description: '', featured: false });
    loadBooks();
    alert('책이 추가되었어요!');
  }

  async function deleteBook(id) {
    if (!confirm('삭제할까요?')) return;
    await deleteDoc(doc(db, 'books', id));
    loadBooks();
  }

  async function setFeatured(id) {
    const prev = await getDocs(query(collection(db, 'books'), where('featured', '==', true)));
    for (const d of prev.docs) await updateDoc(doc(db, 'books', d.id), { featured: false });
    await updateDoc(doc(db, 'books', id), { featured: true });
    loadBooks();
  }

  async function addMeeting() {
    if (!newMeeting.start) { alert('시작 시간을 입력해주세요.'); return; }
    await addDoc(collection(db, 'meetings'), { date: newMeeting.start, dateEnd: newMeeting.end, bookId: newMeeting.bookId, note: newMeeting.note, createdAt: serverTimestamp() });
    setNewMeeting({ start: '', end: '', bookId: '', note: '' });
    loadMeetings();
    alert('일정이 추가되었어요!');
  }

  async function deleteMeeting(id) {
    if (!confirm('삭제할까요?')) return;
    await deleteDoc(doc(db, 'meetings', id));
    loadMeetings();
  }

  async function addNotice() {
    if (!newNotice.title || !newNotice.content) { alert('제목과 내용을 입력해주세요.'); return; }
    try {
      const result = await authenticatedJsonFetch('/api/content/notices', {
        method: 'POST',
        body: newNotice,
      });
      if (result.contentWasSanitized) {
        alert('안전하지 않거나 지원되지 않는 HTML을 제거한 뒤 저장했습니다.');
      }
      setNewNotice({ title: '', content: '', pinned: false });
      loadNotices();
      alert('공지가 등록되었어요!');
    } catch (error) {
      alert(`저장 실패: ${error.message}`);
    }
  }

  async function deleteNotice(id) {
    if (!confirm('삭제할까요?')) return;
    await deleteDoc(doc(db, 'notices', id));
    loadNotices();
  }

  async function saveEditNotice(id) {
    if (!editNotice.title || !editNotice.content) { alert('제목과 내용을 입력해주세요.'); return; }
    try {
      const result = await authenticatedJsonFetch(`/api/content/notices/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        body: editNotice,
      });
      if (result.contentWasSanitized) {
        alert('안전하지 않거나 지원되지 않는 HTML을 제거한 뒤 저장했습니다.');
      }
      setEditingNoticeId(null);
      loadNotices();
    } catch (error) {
      alert(`저장 실패: ${error.message}`);
    }
  }

  async function setPinned(id) {
    const notice = notices.find(n => n.id === id);
    if (!notice) return;
    try {
      const result = await authenticatedJsonFetch(`/api/content/notices/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        body: { title: notice.title, content: notice.content, pinned: true },
      });
      if (result.contentWasSanitized) {
        alert('안전하지 않거나 지원되지 않는 HTML을 제거한 뒤 저장했습니다.');
      }
      loadNotices();
    } catch (error) {
      alert(`고정 실패: ${error.message}`);
    }
  }

  async function addPrefix() {
    if (!newPrefix.trim()) return;
    await addDoc(collection(db, 'boardPrefixes'), { label: newPrefix.trim(), createdAt: serverTimestamp() });
    setNewPrefix('');
    loadPrefixes();
  }

  async function deletePrefix(id) {
    await deleteDoc(doc(db, 'boardPrefixes', id));
    loadPrefixes();
  }

  const formatDateTime = (str) => {
    if (!str) return '';
    const d = new Date(str);
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:00`;
  };

  if (loading) return <p className="empty-msg">로딩 중…</p>;

  if (!user) return (
    <div className={styles.authGateWrap}>
      <div className={`card ${styles.authGateCard}`}>
        <h2 className={styles.authGateTitle}><Lock size={20} /> 관리자</h2>
        <p className={`${styles.authGateText} ${styles.mb16}`}>로그인이 필요해요.</p>
        <button className="btn-primary" onClick={() => router.push('/login')}>로그인하러 가기</button>
      </div>
    </div>
  );

  if (!isAdmin) return (
    <div className={styles.authGateWrap}>
      <div className={`card ${styles.authGateCard}`}>
        <h2 className={styles.authGateTitle}><Lock size={20} /> 권한 없음</h2>
        <p className={styles.authGateText}>관리자 계정으로 로그인해주세요.</p>
      </div>
    </div>
  );

  const TABS = [
    ['books', <><BookOpen size={13} /> 책</>],
    ['questions', <><MessageCircle size={13} /> 토론질문</>],
    ['featured', <><NotebookPen size={13} /> 이 주의 글</>],
    ['meetings', <><Calendar size={13} /> 일정</>],
    ['notices', <><Volume2 size={13} /> 공지</>],
    ['prefixes', <><Tag size={13} /> 글머리</>],
    ['notifications', <><Bell size={13} /> 알림</>],
  ];

  return (
    <div>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}><Settings size={20} /> 관리자</h1>
      </div>

      <div className={styles.tabBar}>
        {TABS.map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)}
            className={styles.tabBtn} data-active={tab === key || undefined}>
            {label}
          </button>
        ))}
      </div>

      {tab === 'books' && (
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}><BookOpen size={15} /> 책 추가</h3>
          <div className={`${styles.rowBase} ${styles.mb8}`}>
            <input placeholder="책 제목으로 검색…" value={bookSearch} onChange={e => setBookSearch(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && searchKakao()} className={styles.flex1} />
            <button className={`btn-sm btn-outline ${styles.searchBtn}`} onClick={searchKakao}>검색</button>
          </div>
          {searchResults.map((b, i) => (
            <div key={i} onClick={() => selectKakaoBook(b)} className={styles.resultRow}>
              {b.thumbnail && <img src={b.thumbnail} className={styles.resultThumb} />}
              <div>
                <div className={styles.resultTitle}>{b.title}</div>
                <div className={styles.resultMeta}>{(b.authors||[]).join(', ')} · {b.publisher}</div>
              </div>
            </div>
          ))}
          {newBook.title && (
            <div className={styles.selectedPreview}>
              {newBook.cover && <img src={newBook.cover} className={styles.selectedPreviewImg} />}
              <span className={styles.selectedPreviewText}>{newBook.title}</span>
            </div>
          )}
          <input placeholder="제목" value={newBook.title} onChange={e => setNewBook({...newBook, title: e.target.value})} className={styles.fieldGap} />
          <div className={`${styles.rowBase} ${styles.mb8}`}>
            <input placeholder="저자" value={newBook.author} onChange={e => setNewBook({...newBook, author: e.target.value})} />
            <input placeholder="장르" value={newBook.genre} onChange={e => setNewBook({...newBook, genre: e.target.value})} />
          </div>
          <input placeholder="표지 URL" value={newBook.cover} onChange={e => setNewBook({...newBook, cover: e.target.value})} className={styles.fieldGap} />
          <div className={styles.checkboxRow}>
            <input type="checkbox" id="featured" checked={newBook.featured} onChange={e => setNewBook({...newBook, featured: e.target.checked})} className={styles.checkbox} />
            <label htmlFor="featured" className={styles.checkboxLabel}><Star size={13} fill="currentColor" /> 이 달의 책으로 설정</label>
          </div>
          <button className="btn-primary" onClick={addBook}>책 추가</button>
          <div className={styles.mt14}>
            {books.map(b => (
              <div key={b.id} className={styles.listItem}>
                {b.cover && <img src={b.cover} className={styles.listThumb} />}
                <div className={styles.flex1}>
                  <div className={styles.listTitle}>{b.title}</div>
                  <div className={styles.listSubtitle}>{b.author} {b.featured && <>· <Star size={11} fill="currentColor" /> 이달의 책</>}</div>
                </div>
                {!b.featured && <button className="btn-sm btn-outline" onClick={() => setFeatured(b.id)}>이달의 책</button>}
                <button className="btn-sm btn-danger" onClick={() => deleteBook(b.id)}>삭제</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'questions' && (
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}><MessageCircle size={15} /> 책 토론 질문 관리</h3>

          <select value={selectedBookForQ} onChange={e => { setSelectedBookForQ(e.target.value); loadBookQuestions(e.target.value); setAiQResults([]); }} className={styles.fieldGapLg}>
            <option value="">책을 선택하세요</option>
            {books.map(b => <option key={b.id} value={b.id}>{b.title}</option>)}
          </select>

          {selectedBookForQ && (
            <>
              <button onClick={generateAIQuestions} disabled={aiQLoading}
                className={`btn-sm btn-outline ${styles.aiGenerateBtn} ${styles.mb12}`}>
                <Bot size={14} /> {aiQLoading ? 'AI가 질문을 생성하고 있어요…' : 'AI 질문 5개 자동 생성'}
              </button>

              {aiQResults.length > 0 && (
                <div className={styles.aiResultBox}>
                  <p className={`${styles.helperText} ${styles.mb8}`}>AI가 생성한 질문 — 필요하면 직접 수정한 뒤 저장해주세요</p>
                  {aiQResults.map((q, i) => (
                    <div key={i} className={`${styles.rowBaseCenter} ${styles.mb6}`}>
                      <input value={q} onChange={e => setAiQResults(prev => prev.map((qq, j) => j === i ? e.target.value : qq))}
                        className={styles.aiResultInput} />
                      <button className={`btn-sm ${styles.accentBtnShrink}`} onClick={() => saveAIQuestion(q)}>저장</button>
                    </div>
                  ))}
                </div>
              )}

              <div className={`${styles.rowBase} ${styles.mb12}`}>
                <input placeholder="질문을 직접 입력하세요" value={newQuestion} onChange={e => setNewQuestion(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addQuestion()} className={styles.flex1} />
                <button className={`btn-sm ${styles.accentBtnShrink}`} onClick={addQuestion}>추가</button>
              </div>

              <div>
                {bookQuestions.length === 0 ? (
                  <p className={styles.mutedSmall}>등록된 질문이 없어요.</p>
                ) : (
                  bookQuestions.map((q, i) => (
                    <div key={q.id} className={styles.questionRow}>
                      {editingQuestionId === q.id ? (
                        <div className={styles.questionEditRow}>
                          <input value={editQuestionText} onChange={e => setEditQuestionText(e.target.value)}
                            className={styles.questionEditInput} onKeyDown={e => e.key === 'Enter' && saveEditQuestion(q.id)} />
                          <button className={`btn-sm ${styles.accentBtn}`} onClick={() => saveEditQuestion(q.id)}>완료</button>
                          <button className="btn-sm btn-outline" onClick={() => setEditingQuestionId(null)}>취소</button>
                        </div>
                      ) : (
                        <div className={styles.questionViewRow}>
                          <span className={styles.questionIndex}>{i + 1}.</span>
                          <span className={styles.questionText}>{q.question}</span>
                          <button className={`btn-sm btn-outline ${styles.shrink0}`} onClick={() => { setEditingQuestionId(q.id); setEditQuestionText(q.question); }}>수정</button>
                          <button className={`btn-sm btn-danger ${styles.shrink0}`} onClick={() => deleteQuestion(q.id)}>삭제</button>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </>
          )}
        </div>
      )}

      {tab === 'featured' && (
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}><NotebookPen size={15} /> 이 주/달의 글 등록</h3>

          <div className={styles.modeRow}>
            {[['curator', <><PenLine size={12} /> 큐레이터 소개</>], ['pd', <><ScrollText size={12} /> 원문 발췌</>], ['manual', <><Pencil size={12} /> 직접 입력</>]].map(([key, label]) => (
              <button key={key} onClick={() => { setPassageMode(key); setNewPassage({ ...INITIAL_PASSAGE, kind: key === 'pd' ? 'public_domain' : 'curator_intro' }); setNewPassageQuestion(''); setPassageKakaoResults([]); setPassageBookSearch(''); setPdSearchResults([]); setPdSearchQuery(''); }}
                className={styles.modeBtn} data-active={passageMode === key || undefined}>
                {label}
              </button>
            ))}
          </div>

          <select value={newPassage.period} onChange={e => setNewPassage({...newPassage, period: e.target.value})} className={styles.fieldGapLg}>
            <option value="weekly">📅 주간</option>
            <option value="monthly">📆 월간</option>
          </select>

          {passageMode === 'curator' && (
            <>
              <select value={newPassage.bookId} onChange={e => selectPassageBookFromCollection(e.target.value)} className={styles.fieldGap}>
                <option value="">시스템 내 책에서 선택</option>
                {books.map(b => <option key={b.id} value={b.id}>{b.title}{b.author ? ` / ${b.author}` : ''}</option>)}
              </select>
              <div className={`${styles.rowBase} ${styles.mb8}`}>
                <input placeholder="또는 책 제목으로 검색…" value={passageBookSearch} onChange={e => setPassageBookSearch(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && searchKakaoForPassage()} className={styles.flex1} />
                <button className={`btn-sm btn-outline ${styles.shrink0}`} onClick={searchKakaoForPassage}>검색</button>
              </div>
              {passageKakaoResults.map((b, i) => (
                <div key={i} onClick={() => selectPassageKakaoBook(b)} className={styles.resultRow}>
                  {b.thumbnail && <img src={b.thumbnail} className={styles.resultThumbSm} />}
                  <div>
                    <div className={styles.resultTitle}>{b.title}</div>
                    <div className={styles.resultMeta}>{(b.authors||[]).join(', ')} · {b.publisher}</div>
                  </div>
                </div>
              ))}
              {newPassage.bookTitle && (
                <div className={styles.selectedPreviewBlock}>
                  <strong>{newPassage.bookTitle}</strong>{newPassage.bookAuthor && ` / ${newPassage.bookAuthor}`}
                </div>
              )}
              <textarea placeholder="책 소개 (AI 컨텍스트로 사용, 자동 채워짐)" value={newPassage.bookDescription}
                onChange={e => setNewPassage({...newPassage, bookDescription: e.target.value})}
                className={styles.textareaH60Sm} />
              <button className={`btn-primary ${styles.aiGenerateBtnNoPad} ${styles.mb8}`} onClick={generateAIPassage} disabled={aiPassageLoading || !newPassage.bookTitle}>
                <Bot size={14} /> {aiPassageLoading ? '큐레이터 코멘트 생성 중…' : '큐레이터 코멘트 + 토론 질문 생성'}
              </button>
              <p className={styles.helperText}>큐레이터 코멘트 (2문단)</p>
              <textarea value={newPassage.curatorNote}
                onChange={e => setNewPassage({...newPassage, curatorNote: e.target.value, aiGeneratedNote: false})}
                className={styles.textareaH120} />
              <p className={styles.helperText}>짧은 직접 인용 (1~2문장, 선택) — 입력 시 출처 필수</p>
              <textarea placeholder='예: "이 책에서 작가는 ... 라고 썼다." (큰따옴표 없이 본문만)' value={newPassage.excerpt}
                onChange={e => setNewPassage({...newPassage, excerpt: e.target.value})}
                className={styles.textareaH60} />
              {newPassage.excerpt && (
                <input placeholder="출처 표기 * (예: 책 제목, 출판사, 페이지)" value={newPassage.source}
                  onChange={e => setNewPassage({...newPassage, source: e.target.value})}
                  className={styles.fieldGap} />
              )}
            </>
          )}

          {passageMode === 'pd' && (
            <>
              <p className={styles.pdInfoText}>
                <Lightbulb size={12} className={styles.pdInfoIcon} /> Project Gutenberg(저작권 만료 작품)에서 책을 검색합니다. 한국어 작품이 한정적이라 결과가 적을 수 있어요.
              </p>
              <div className={`${styles.rowBase} ${styles.mb8}`}>
                <input placeholder="책 제목 검색…" value={pdSearchQuery} onChange={e => setPdSearchQuery(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && searchGutendex()} className={styles.flex1} />
                <button className={`btn-sm btn-outline ${styles.shrink0}`} onClick={searchGutendex} disabled={pdSearchLoading}>
                  {pdSearchLoading ? '검색 중…' : '검색'}
                </button>
              </div>
              {pdSearchResults.map((b) => (
                <div key={b.id} onClick={() => selectGutendexBook(b)} className={styles.resultRowStack}>
                  <div className={styles.resultTitle}>{b.title}</div>
                  <div className={styles.resultMeta}>{(b.authors||[]).join(', ')}</div>
                </div>
              ))}
              {pdTextLoading && <p className={styles.pdLoadingText}><Download size={12} /> 본문 가져오는 중…</p>}
              {newPassage.bookTitle && (
                <div className={styles.selectedPreviewBlock}>
                  <strong>{newPassage.bookTitle}</strong>{newPassage.bookAuthor && ` / ${newPassage.bookAuthor}`}
                  {newPassage.sourceUrl && (
                    <div className={styles.selectedPreviewLink}>
                      <Link2 size={11} /> {newPassage.sourceUrl}
                    </div>
                  )}
                </div>
              )}
              <p className={styles.helperText}>발췌할 원문 * (다듬어서 저장)</p>
              <textarea value={newPassage.excerpt}
                onChange={e => setNewPassage({...newPassage, excerpt: e.target.value})}
                className={styles.textareaH160} />
              <button className={`btn-primary ${styles.aiGenerateBtnNoPad} ${styles.mb8}`} onClick={generateAIPassage} disabled={aiPassageLoading || !newPassage.excerpt}>
                <Bot size={14} /> {aiPassageLoading ? '토론 질문 생성 중…' : '토론 질문 + 짧은 큐레이터 코멘트 생성'}
              </button>
              {newPassage.curatorNote && (
                <>
                  <p className={styles.helperText}>큐레이터 코멘트</p>
                  <textarea value={newPassage.curatorNote}
                    onChange={e => setNewPassage({...newPassage, curatorNote: e.target.value, aiGeneratedNote: false})}
                    className={styles.fieldGap} />
                </>
              )}
            </>
          )}

          {passageMode === 'manual' && (
            <>
              <div className={`${styles.rowBase} ${styles.mb8}`}>
                <input placeholder="책 제목 *" value={newPassage.bookTitle} onChange={e => setNewPassage({...newPassage, bookTitle: e.target.value})} className={styles.flex2} />
                <input placeholder="저자" value={newPassage.bookAuthor} onChange={e => setNewPassage({...newPassage, bookAuthor: e.target.value})} className={styles.flex1} />
              </div>
              <select value={newPassage.bookId} onChange={e => setNewPassage({...newPassage, bookId: e.target.value})} className={styles.fieldGap}>
                <option value="">시스템 내 책 연결 (선택사항)</option>
                {books.map(b => <option key={b.id} value={b.id}>{b.title}</option>)}
              </select>
              <p className={styles.helperText}>본문 / 큐레이터 글</p>
              <textarea placeholder="2문단 큐레이터 글 또는 짧은 발췌 *" value={newPassage.curatorNote}
                onChange={e => setNewPassage({...newPassage, curatorNote: e.target.value})}
                className={styles.textareaH120} />
              <p className={styles.helperText}>짧은 직접 인용 (선택)</p>
              <textarea placeholder='큰따옴표로 묶일 짧은 인용. 입력 시 출처 필수.' value={newPassage.excerpt}
                onChange={e => setNewPassage({...newPassage, excerpt: e.target.value})}
                className={styles.textareaH60} />
              <input placeholder="출처 표기 (인용이 있으면 필수)" value={newPassage.source} onChange={e => setNewPassage({...newPassage, source: e.target.value})} className={styles.fieldGapLg} />
            </>
          )}

          <p className={styles.relatedQuestionsLabel}>
            관련 질문 (최대 5개){newPassage.aiGeneratedQuestions && <> — <Bot size={12} /> AI 생성</>}
          </p>
          {newPassage.questions.map((q, i) => (
            <div key={i} className={styles.numberedRow}>
              <span className={styles.numberBadge}>{i + 1}.</span>
              <input value={q} onChange={e => setNewPassage(prev => ({...prev, questions: prev.questions.map((qq, j) => j === i ? e.target.value : qq), aiGeneratedQuestions: false}))}
                className={styles.numberedInput} />
              <button onClick={() => setNewPassage(prev => ({...prev, questions: prev.questions.filter((_, j) => j !== i)}))}
                className={styles.removeBtn}>×</button>
            </div>
          ))}
          {newPassage.questions.length < 5 && (
            <div className={`${styles.rowBase} ${styles.mb8}`}>
              <input placeholder="질문 추가" value={newPassageQuestion} onChange={e => setNewPassageQuestion(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && newPassageQuestion.trim()) {
                  setNewPassage(prev => ({...prev, questions: [...prev.questions, newPassageQuestion.trim()]}));
                  setNewPassageQuestion('');
                }}} className={styles.flex1} />
              <button className="btn-sm btn-outline" onClick={() => {
                if (newPassageQuestion.trim()) {
                  setNewPassage(prev => ({...prev, questions: [...prev.questions, newPassageQuestion.trim()]}));
                  setNewPassageQuestion('');
                }
              }}>추가</button>
            </div>
          )}

          <button className={`btn-primary ${styles.mt12}`} onClick={addPassage}>등록</button>

          <div className={styles.mt20}>
            <p className={styles.registeredListLabel}>등록된 발췌문</p>
            {passages.length === 0 ? (
              <p className={styles.mutedSmall}>아직 등록된 발췌문이 없어요.</p>
            ) : (
              passages.map(p => (
                <div key={p.id} className={`${styles.listItem} ${styles.listItemColumn}`}>
                  {editingPassageId === p.id ? (
                    <div className={styles.editFormWrap}>
                      <select value={editPassage.kind} onChange={e => setEditPassage({...editPassage, kind: e.target.value, publicDomain: e.target.value === 'public_domain'})} className={styles.fieldGap}>
                        <option value="curator_intro">✍️ 큐레이터 소개</option>
                        <option value="public_domain">📜 원문 발췌 (저작권 만료)</option>
                      </select>
                      <div className={`${styles.rowBase} ${styles.mb8}`}>
                        <input placeholder="책 제목 *" value={editPassage.bookTitle} onChange={e => setEditPassage({...editPassage, bookTitle: e.target.value})} className={styles.flex2} />
                        <input placeholder="저자" value={editPassage.bookAuthor} onChange={e => setEditPassage({...editPassage, bookAuthor: e.target.value})} className={styles.flex1} />
                      </div>
                      {editPassage.kind === 'public_domain' ? (
                        <>
                          <p className={styles.helperText}>원문 발췌 *</p>
                          <textarea value={editPassage.excerpt} onChange={e => setEditPassage({...editPassage, excerpt: e.target.value})}
                            className={styles.textareaH160} />
                          <p className={styles.helperText}>큐레이터 코멘트 (선택)</p>
                          <textarea value={editPassage.curatorNote} onChange={e => setEditPassage({...editPassage, curatorNote: e.target.value})}
                            className={styles.fieldGap} />
                        </>
                      ) : (
                        <>
                          <p className={styles.helperText}>큐레이터 코멘트</p>
                          <textarea value={editPassage.curatorNote} onChange={e => setEditPassage({...editPassage, curatorNote: e.target.value})}
                            className={styles.textareaH120} />
                          <p className={styles.helperText}>짧은 직접 인용 (선택)</p>
                          <textarea value={editPassage.excerpt} onChange={e => setEditPassage({...editPassage, excerpt: e.target.value})}
                            className={styles.textareaH60} />
                        </>
                      )}
                      <input placeholder="출처 (선택, 인용 시 필수)" value={editPassage.source} onChange={e => setEditPassage({...editPassage, source: e.target.value})} className={styles.fieldGap} />
                      <input placeholder="출처 URL (선택)" value={editPassage.sourceUrl} onChange={e => setEditPassage({...editPassage, sourceUrl: e.target.value})} className={styles.fieldGap} />
                      <p className={styles.helperText}>질문</p>
                      {editPassage.questions.map((q, i) => (
                        <div key={i} className={styles.numberedRow}>
                          <span className={styles.numberBadge}>{i + 1}.</span>
                          <input value={q} onChange={e => setEditPassage(prev => ({...prev, questions: prev.questions.map((qq, j) => j === i ? e.target.value : qq)}))}
                            className={styles.numberedInput} />
                          <button onClick={() => setEditPassage(prev => ({...prev, questions: prev.questions.filter((_, j) => j !== i)}))}
                            className={styles.removeBtn}>×</button>
                        </div>
                      ))}
                      {editPassage.questions.length < 5 && (
                        <div className={`${styles.rowBase} ${styles.mb10}`}>
                          <input placeholder="질문 추가" value={editPassageQuestion} onChange={e => setEditPassageQuestion(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter' && editPassageQuestion.trim()) { setEditPassage(prev => ({...prev, questions: [...prev.questions, editPassageQuestion.trim()]})); setEditPassageQuestion(''); }}}
                            className={styles.editQuestionAddInput} />
                          <button className="btn-sm btn-outline" onClick={() => { if (editPassageQuestion.trim()) { setEditPassage(prev => ({...prev, questions: [...prev.questions, editPassageQuestion.trim()]})); setEditPassageQuestion(''); } }}>추가</button>
                        </div>
                      )}
                      <div className={styles.rowBase}>
                        <button className="btn-sm btn-outline" onClick={() => { setEditingPassageId(null); setEditPassageQuestion(''); }}>취소</button>
                        <button className={`btn-sm ${styles.accentBtn}`} onClick={() => saveEditPassage(p.id)}>저장</button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className={styles.passageRowHead}>
                        <span className={styles.passageBadge} data-weekly={p.period === 'weekly' || undefined}>
                          {p.period === 'weekly' ? '주간' : '월간'}
                        </span>
                        {p.kind === 'public_domain' ? (
                          <span className={styles.passageBadgeAccent}><ScrollText size={10} /> 원문</span>
                        ) : p.kind === 'curator_intro' ? (
                          <span className={styles.passageBadgeMuted}><PenLine size={10} /> 소개</span>
                        ) : null}
                        <span className={`${styles.mutedTiny} ${styles.shrink0}`}>{p.periodKey}</span>
                        <span className={styles.passageBookTitle}>{p.bookTitle}</span>
                        <button className={`btn-sm btn-outline ${styles.shrink0} ${styles.passageToggleBtn}`} onClick={() => togglePassageActive(p.id, p.isActive)}
                          data-active={p.isActive || undefined}>
                          {p.isActive ? <><CheckCircle2 size={12} /> 노출 중</> : '노출'}
                        </button>
                        <button className={`btn-sm btn-outline ${styles.shrink0}`} onClick={() => { setEditingPassageId(p.id); setEditPassage({ bookTitle: p.bookTitle || '', bookAuthor: p.bookAuthor || '', kind: p.kind || 'curator_intro', excerpt: p.excerpt || '', curatorNote: p.curatorNote || '', passage: p.passage || '', questions: p.questions || [], source: p.source || '', sourceType: p.sourceType || 'manual', sourceUrl: p.sourceUrl || '', publicDomain: !!p.publicDomain }); setEditPassageQuestion(''); }}>수정</button>
                        <button className={`btn-sm btn-danger ${styles.shrink0}`} onClick={() => deletePassage(p.id)}>삭제</button>
                      </div>
                      <p className={styles.passageExcerptPreview}>
                        {(() => { const t = p.excerpt || p.curatorNote || p.passage || ''; return t ? `"${t.slice(0, 60)}${t.length > 60 ? '…' : ''}"` : ''; })()}
                      </p>
                      {p.questions?.length > 0 && (
                        <p className={styles.passageQuestionCount}><MessageCircle size={11} /> 질문 {p.questions.length}개</p>
                      )}
                    </>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {tab === 'meetings' && (
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}><Calendar size={15} /> 일정 추가</h3>
          <div className={`${styles.rowBase} ${styles.mb8}`}>
            <div className={styles.fieldCol}>
              <label className={styles.fieldLabel}>시작</label>
              <input type="datetime-local" value={newMeeting.start} onChange={e => setNewMeeting({...newMeeting, start: e.target.value})} />
            </div>
            <div className={styles.fieldCol}>
              <label className={styles.fieldLabel}>종료</label>
              <input type="datetime-local" value={newMeeting.end} onChange={e => setNewMeeting({...newMeeting, end: e.target.value})} />
            </div>
          </div>
          <select value={newMeeting.bookId} onChange={e => setNewMeeting({...newMeeting, bookId: e.target.value})} className={styles.fieldGap}>
            <option value="">책 선택 (선택사항)</option>
            {books.map(b => <option key={b.id} value={b.id}>{b.title}</option>)}
          </select>
          <input placeholder="메모 (선택)" value={newMeeting.note} onChange={e => setNewMeeting({...newMeeting, note: e.target.value})} className={styles.fieldGap} />
          <button className="btn-primary" onClick={addMeeting}>일정 추가</button>
          <div className={styles.mt14}>
            {meetings.map(m => (
              <div key={m.id} className={styles.listItem}>
                <div className={styles.flex1}>
                  <div className={styles.listTitle}>{formatDateTime(m.date)}{m.dateEnd ? ` ~ ${formatDateTime(m.dateEnd)}` : ''}</div>
                  {m.note && <div className={styles.mutedTiny}>{m.note}</div>}
                </div>
                <button className="btn-sm btn-danger" onClick={() => deleteMeeting(m.id)}>삭제</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'notices' && (
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}><Volume2 size={15} /> 공지 추가</h3>
          <input placeholder="공지 제목" value={newNotice.title} onChange={e => setNewNotice({...newNotice, title: e.target.value})} className={styles.fieldGap} />
          <div className={styles.fieldGap}>
            <QuillEditor
              value={newNotice.content}
              onChange={v => setNewNotice({...newNotice, content: v})}
              placeholder="공지 내용…"
              minHeight={120}
              onImageUpload={async (file) => {
                const r = ref(storage, `notices/${Date.now()}_${file.name}`);
                await uploadBytes(r, file);
                return getDownloadURL(r);
              }}
            />
          </div>
          <div className={styles.checkboxRow}>
            <input type="checkbox" id="pinned" checked={newNotice.pinned} onChange={e => setNewNotice({...newNotice, pinned: e.target.checked})} className={styles.checkbox} />
            <label htmlFor="pinned" className={styles.checkboxLabel}><Pin size={13} /> 홈 상단 고정 공지로 설정</label>
          </div>
          <button className="btn-primary" onClick={addNotice}>공지 등록</button>

          <div className={styles.mt14}>
            {notices.map(n => (
              <div key={n.id}>
                {editingNoticeId === n.id ? (
                  <div className={styles.noticeEditWrap}>
                    <input value={editNotice.title} onChange={e => setEditNotice({...editNotice, title: e.target.value})} className={styles.fieldGap} />
                    <div className={styles.fieldGap}>
                      <QuillEditor
                        value={editNotice.content}
                        onChange={v => setEditNotice({...editNotice, content: v})}
                        placeholder="내용…"
                        minHeight={100}
                        onImageUpload={async (file) => {
                          const r = ref(storage, `notices/${Date.now()}_${file.name}`);
                          await uploadBytes(r, file);
                          return getDownloadURL(r);
                        }}
                      />
                    </div>
                    <div className={styles.checkboxRowTight}>
                      <input type="checkbox" checked={editNotice.pinned} onChange={e => setEditNotice({...editNotice, pinned: e.target.checked})} className={styles.checkbox} />
                      <span className={styles.pinnedLabel}><Pin size={13} /> 고정</span>
                    </div>
                    <div className={styles.rowBase}>
                      <button className="btn-sm btn-outline" onClick={() => setEditingNoticeId(null)}>취소</button>
                      <button className={`btn-sm ${styles.accentBtn}`} onClick={() => saveEditNotice(n.id)}>저장</button>
                    </div>
                  </div>
                ) : (
                  <div className={styles.listItem}>
                    <div className={`${styles.flex1} ${styles.minW0}`}>
                      <div className={styles.listTitleRow}>{n.pinned && <Pin size={12} />}{n.title}</div>
                      <div className={styles.listSubtitleEllipsis}>
                        {stripHtml(n.content).slice(0,40) + '…'}
                      </div>
                    </div>
                    <div className={styles.listActions}>
                      {!n.pinned && <button className={`btn-sm btn-outline ${styles.shrink0}`} onClick={() => setPinned(n.id)}>고정</button>}
                      <button className={`btn-sm btn-outline ${styles.shrink0}`} onClick={() => { setEditingNoticeId(n.id); setEditNotice({ title: n.title, content: n.content, pinned: n.pinned }); }}>수정</button>
                      <button className={`btn-sm btn-danger ${styles.shrink0}`} onClick={() => deleteNotice(n.id)}>삭제</button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'prefixes' && (
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}><Tag size={15} /> 자유게시판 글머리 관리</h3>
          <div className={`${styles.rowBase} ${styles.mb14}`}>
            <input placeholder="새 글머리 (예: 공략, 질문, 잡담)" value={newPrefix} onChange={e => setNewPrefix(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addPrefix()} className={styles.flex1} />
            <button className={`btn-sm ${styles.accentBtnShrink}`} onClick={addPrefix}>추가</button>
          </div>
          <div className={styles.rowWrap}>
            {prefixes.map(p => (
              <div key={p.id} className={styles.prefixChip}>
                <span className={styles.prefixChipText}>{p.label}</span>
                <button onClick={() => deletePrefix(p.id)} className={styles.prefixRemoveBtn}>×</button>
              </div>
            ))}
            {prefixes.length === 0 && <p className={styles.mutedSmall}>아직 글머리가 없어요.</p>}
          </div>
        </div>
      )}

      {tab === 'notifications' && (
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}><Bell size={15} /> 알림 보내기</h3>
          <input placeholder="알림 제목" value={newNotif.title} onChange={e => setNewNotif({...newNotif, title: e.target.value})} className={styles.fieldGap} />
          <textarea placeholder="알림 내용" value={newNotif.body} onChange={e => setNewNotif({...newNotif, body: e.target.value})} className={styles.fieldGap} />
          <input placeholder="이동할 URL (예: /notice, /board)" value={newNotif.url} onChange={e => setNewNotif({...newNotif, url: e.target.value})} className={styles.fieldGap} />

          <div className={`${styles.rowBase} ${styles.mb20}`}>
            <button
              onClick={sendNow}
              disabled={sendingNow}
              className={`btn-primary ${styles.sendBtnInner}`}
            >
              {sendingNow ? '발송 중…' : <><Megaphone size={14} /> 지금 바로 발송</>}
            </button>
          </div>

          <h3 className={`${styles.sectionTitle} ${styles.mt8}`}><Calendar size={15} /> 예약 알림</h3>
          <div className={styles.dateFieldCol}>
            <label className={styles.fieldLabel}>발송 날짜 (해당 날 오전 9시에 발송)</label>
            <input type="date" value={newNotif.date} onChange={e => setNewNotif({...newNotif, date: e.target.value})} className={styles.fieldGap} />
          </div>
          <button onClick={addScheduledNotif} className={`btn-primary ${styles.mb16}`}>예약 등록</button>

          <div>
            {scheduled.length === 0 ? (
              <p className={styles.mutedSmall}>예약된 알림이 없어요.</p>
            ) : (
              scheduled.map(n => (
                <div key={n.id} className={styles.listItem} data-sent={n.sent || undefined}>
                  <div className={styles.flex1}>
                    <div className={styles.listTitle}>{n.title}</div>
                    <div className={styles.listSubtitle}>
                      <Calendar size={12} /> {n.date} · {n.sent ? <><CheckCircle2 size={12} /> 발송완료</> : <><Clock size={12} /> 대기중</>}
                    </div>
                    <div className={styles.mutedTiny}>{n.body}</div>
                  </div>
                  {!n.sent && <button className="btn-sm btn-danger" onClick={() => deleteScheduled(n.id)}>삭제</button>}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
