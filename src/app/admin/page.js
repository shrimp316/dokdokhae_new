'use client';
import { useEffect, useState } from 'react';
import { collection, getDocs, addDoc, deleteDoc, updateDoc, doc, query, orderBy, where, serverTimestamp } from 'firebase/firestore';
import { db, storage } from '@/lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useAuth } from '@/lib/AuthContext';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { stripHtml } from '@/lib/searchUtils';

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
      const res = await fetch('/api/ai-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: book.title, author: book.author, description: book.description }),
      });
      const data = await res.json();
      if (data.error) { alert('AI 오류: ' + data.error); return; }
      setAiQResults(data.questions || []);
    } catch (e) { alert('생성 실패: ' + e.message); }
    setAiQLoading(false);
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
    // ISO week number
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
      const res = await fetch('/api/ai-passage', {
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
    } catch (e) { alert('생성 실패: ' + e.message); }
    setAiPassageLoading(false);
  }

  async function searchKakaoForPassage() {
    if (!passageBookSearch.trim()) return;
    try {
      const res = await fetch(`https://dapi.kakao.com/v3/search/book?query=${encodeURIComponent(passageBookSearch)}&size=5`, {
        headers: { Authorization: `KakaoAK ${process.env.NEXT_PUBLIC_KAKAO_API_KEY}` }
      });
      const data = await res.json();
      setPassageKakaoResults(data.documents || []);
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
    } catch (e) { alert('검색 실패: ' + e.message); }
    setPdSearchLoading(false);
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
      const res = await fetch('/api/send-notification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newNotif.title, body: newNotif.body, url: newNotif.url || '/' }),
      });
      const data = await res.json();
      alert(`✅ ${data.sent}명에게 알림을 보냈어요!`);
      setNewNotif({ title: '', body: '', date: '', url: '/' });
    } catch (e) { alert('발송 실패: ' + e.message); }
    setSendingNow(false);
  }

  // 책 검색 (카카오)
  async function searchKakao() {
    if (!bookSearch.trim()) return;
    try {
      const res = await fetch(`https://dapi.kakao.com/v3/search/book?query=${encodeURIComponent(bookSearch)}&size=5`, {
        headers: { Authorization: `KakaoAK ${process.env.NEXT_PUBLIC_KAKAO_API_KEY}` }
      });
      const data = await res.json();
      setSearchResults(data.documents || []);
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
    if (newNotice.pinned) {
      const prev = await getDocs(query(collection(db, 'notices'), where('pinned', '==', true)));
      for (const d of prev.docs) await updateDoc(doc(db, 'notices', d.id), { pinned: false });
    }
    await addDoc(collection(db, 'notices'), { ...newNotice, createdAt: serverTimestamp() });
    setNewNotice({ title: '', content: '', pinned: false });
    loadNotices();
    alert('공지가 등록되었어요!');
  }

  async function deleteNotice(id) {
    if (!confirm('삭제할까요?')) return;
    await deleteDoc(doc(db, 'notices', id));
    loadNotices();
  }

  async function saveEditNotice(id) {
    if (!editNotice.title || !editNotice.content) { alert('제목과 내용을 입력해주세요.'); return; }
    if (editNotice.pinned) {
      const prev = await getDocs(query(collection(db, 'notices'), where('pinned', '==', true)));
      for (const d of prev.docs) if (d.id !== id) await updateDoc(doc(db, 'notices', d.id), { pinned: false });
    }
    await updateDoc(doc(db, 'notices', id), { ...editNotice, updatedAt: serverTimestamp() });
    setEditingNoticeId(null);
    loadNotices();
  }

  async function setPinned(id) {
    const prev = await getDocs(query(collection(db, 'notices'), where('pinned', '==', true)));
    for (const d of prev.docs) await updateDoc(doc(db, 'notices', d.id), { pinned: false });
    await updateDoc(doc(db, 'notices', id), { pinned: true });
    loadNotices();
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

  const sectionStyle = { background: 'var(--card)', borderRadius: 'var(--radius)', padding: 18, marginBottom: 16, boxShadow: 'var(--shadow)' };
  const h3Style = { fontSize: 15, fontWeight: 600, color: 'var(--accent)', marginBottom: 14 };
  const listItemStyle = { display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--line)' };

  if (loading) return <p className="empty-msg">로딩 중…</p>;

  if (!user) return (
    <div style={{ maxWidth: 360, margin: '40px auto' }}>
      <div className="card" style={{ padding: '32px 24px', textAlign: 'center' }}>
        <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 20, color: 'var(--accent)', marginBottom: 16 }}>🔒 관리자</h2>
        <p style={{ fontSize: 14, color: 'var(--muted)', marginBottom: 16 }}>로그인이 필요해요.</p>
        <button className="btn-primary" onClick={() => router.push('/login')}>로그인하러 가기</button>
      </div>
    </div>
  );

  if (!isAdmin) return (
    <div style={{ maxWidth: 360, margin: '40px auto' }}>
      <div className="card" style={{ padding: '32px 24px', textAlign: 'center' }}>
        <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 20, color: 'var(--accent)', marginBottom: 16 }}>🔒 권한 없음</h2>
        <p style={{ fontSize: 14, color: 'var(--muted)' }}>관리자 계정으로 로그인해주세요.</p>
      </div>
    </div>
  );

  const TABS = [['books','📖 책'],['questions','💬 토론질문'],['featured','📝 이 주의 글'],['meetings','📅 일정'],['notices','📢 공지'],['prefixes','🏷️ 글머리'],['notifications','🔔 알림']];

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 20, color: 'var(--accent)' }}>⚙️ 관리자</h1>
      </div>

      {/* 탭 */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, overflowX: 'auto' }}>
        {TABS.map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)}
            style={{ padding: '8px 14px', border: '1.5px solid var(--line)', borderRadius: 20, fontSize: 13, cursor: 'pointer', fontFamily: 'var(--font-sans)', background: tab === key ? 'var(--accent)' : 'var(--card)', color: tab === key ? '#fff' : 'var(--muted)', whiteSpace: 'nowrap' }}>
            {label}
          </button>
        ))}
      </div>

      {/* 책 관리 */}
      {tab === 'books' && (
        <div style={sectionStyle}>
          <h3 style={h3Style}>📖 책 추가</h3>
          <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
            <input placeholder="책 제목으로 검색…" value={bookSearch} onChange={e => setBookSearch(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && searchKakao()} style={{ flex: 1 }} />
            <button className="btn-sm btn-outline" onClick={searchKakao} style={{ flexShrink: 0, padding: '10px 14px' }}>검색</button>
          </div>
          {searchResults.map((b, i) => (
            <div key={i} onClick={() => selectKakaoBook(b)} style={{ display: 'flex', gap: 10, padding: 8, cursor: 'pointer', borderRadius: 8, transition: 'background 0.1s' }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--tag-bg)'}
              onMouseLeave={e => e.currentTarget.style.background = 'none'}>
              {b.thumbnail && <img src={b.thumbnail} style={{ width: 40, height: 56, objectFit: 'cover', borderRadius: 4 }} />}
              <div>
                <div style={{ fontSize: 13, fontWeight: 500 }}>{b.title}</div>
                <div style={{ fontSize: 11, color: 'var(--muted)' }}>{(b.authors||[]).join(', ')} · {b.publisher}</div>
              </div>
            </div>
          ))}
          {newBook.title && (
            <div style={{ background: 'var(--tag-bg)', borderRadius: 8, padding: 8, marginBottom: 8, display: 'flex', gap: 8, alignItems: 'center' }}>
              {newBook.cover && <img src={newBook.cover} style={{ height: 50, borderRadius: 4 }} />}
              <span style={{ fontSize: 13 }}>{newBook.title}</span>
            </div>
          )}
          <input placeholder="제목" value={newBook.title} onChange={e => setNewBook({...newBook, title: e.target.value})} style={{ marginBottom: 8 }} />
          <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
            <input placeholder="저자" value={newBook.author} onChange={e => setNewBook({...newBook, author: e.target.value})} />
            <input placeholder="장르" value={newBook.genre} onChange={e => setNewBook({...newBook, genre: e.target.value})} />
          </div>
          <input placeholder="표지 URL" value={newBook.cover} onChange={e => setNewBook({...newBook, cover: e.target.value})} style={{ marginBottom: 8 }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <input type="checkbox" id="featured" checked={newBook.featured} onChange={e => setNewBook({...newBook, featured: e.target.checked})} style={{ width: 'auto' }} />
            <label htmlFor="featured" style={{ fontSize: 13, color: 'var(--muted)', cursor: 'pointer' }}>⭐ 이 달의 책으로 설정</label>
          </div>
          <button className="btn-primary" onClick={addBook}>책 추가</button>
          <div style={{ marginTop: 14 }}>
            {books.map(b => (
              <div key={b.id} style={listItemStyle}>
                {b.cover && <img src={b.cover} style={{ height: 44, borderRadius: 4 }} />}
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 500 }}>{b.title}</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)' }}>{b.author} {b.featured ? '· ⭐ 이달의 책' : ''}</div>
                </div>
                {!b.featured && <button className="btn-sm btn-outline" onClick={() => setFeatured(b.id)}>이달의 책</button>}
                <button className="btn-sm btn-danger" onClick={() => deleteBook(b.id)}>삭제</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 토론 질문 관리 */}
      {tab === 'questions' && (
        <div style={sectionStyle}>
          <h3 style={h3Style}>💬 책 토론 질문 관리</h3>

          {/* 책 선택 */}
          <select value={selectedBookForQ} onChange={e => { setSelectedBookForQ(e.target.value); loadBookQuestions(e.target.value); setAiQResults([]); }} style={{ marginBottom: 12 }}>
            <option value="">책을 선택하세요</option>
            {books.map(b => <option key={b.id} value={b.id}>{b.title}</option>)}
          </select>

          {selectedBookForQ && (
            <>
              {/* AI 질문 생성 */}
              <button className="btn-sm btn-outline" onClick={generateAIQuestions} disabled={aiQLoading}
                style={{ marginBottom: 12, width: '100%', padding: '10px 0' }}>
                {aiQLoading ? '🤖 AI가 질문을 생성하고 있어요…' : '🤖 AI 질문 5개 자동 생성'}
              </button>

              {/* AI 결과 */}
              {aiQResults.length > 0 && (
                <div style={{ background: 'var(--tag-bg)', borderRadius: 8, padding: 12, marginBottom: 12 }}>
                  <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 8 }}>AI가 생성한 질문 — 저장할 항목을 선택해주세요</p>
                  {aiQResults.map((q, i) => (
                    <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 6 }}>
                      <span style={{ fontSize: 13, flex: 1, lineHeight: 1.6 }}>{q}</span>
                      <button className="btn-sm" style={{ background: 'var(--accent)', color: '#fff', flexShrink: 0 }} onClick={() => saveAIQuestion(q)}>저장</button>
                    </div>
                  ))}
                </div>
              )}

              {/* 직접 입력 */}
              <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                <input placeholder="질문을 직접 입력하세요" value={newQuestion} onChange={e => setNewQuestion(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addQuestion()} style={{ flex: 1 }} />
                <button className="btn-sm" style={{ background: 'var(--accent)', color: '#fff', flexShrink: 0 }} onClick={addQuestion}>추가</button>
              </div>

              {/* 등록된 질문 목록 */}
              <div>
                {bookQuestions.length === 0 ? (
                  <p style={{ fontSize: 13, color: 'var(--muted)' }}>등록된 질문이 없어요.</p>
                ) : (
                  bookQuestions.map((q, i) => (
                    <div key={q.id} style={{ padding: '8px 0', borderBottom: '1px solid var(--line)' }}>
                      {editingQuestionId === q.id ? (
                        <div style={{ display: 'flex', gap: 8 }}>
                          <input value={editQuestionText} onChange={e => setEditQuestionText(e.target.value)}
                            style={{ flex: 1, fontSize: 13 }} onKeyDown={e => e.key === 'Enter' && saveEditQuestion(q.id)} />
                          <button className="btn-sm" style={{ background: 'var(--accent)', color: '#fff' }} onClick={() => saveEditQuestion(q.id)}>완료</button>
                          <button className="btn-sm btn-outline" onClick={() => setEditingQuestionId(null)}>취소</button>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                          <span style={{ fontSize: 13, color: 'var(--muted)', flexShrink: 0, marginTop: 2 }}>{i + 1}.</span>
                          <span style={{ fontSize: 13, flex: 1, lineHeight: 1.6 }}>{q.question}</span>
                          <button className="btn-sm btn-outline" onClick={() => { setEditingQuestionId(q.id); setEditQuestionText(q.question); }} style={{ flexShrink: 0 }}>수정</button>
                          <button className="btn-sm btn-danger" onClick={() => deleteQuestion(q.id)} style={{ flexShrink: 0 }}>삭제</button>
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

      {/* 이 주의 글 관리 */}
      {tab === 'featured' && (
        <div style={sectionStyle}>
          <h3 style={h3Style}>📝 이 주/달의 글 등록</h3>

          {/* 모드 선택 (3-way) */}
          <div style={{ display: 'flex', gap: 4, marginBottom: 16 }}>
            {[['curator', '✍️ 큐레이터 소개'], ['pd', '📜 원문 발췌'], ['manual', '✏️ 직접 입력']].map(([key, label]) => (
              <button key={key} onClick={() => { setPassageMode(key); setNewPassage({ ...INITIAL_PASSAGE, kind: key === 'pd' ? 'public_domain' : 'curator_intro' }); setNewPassageQuestion(''); setPassageKakaoResults([]); setPassageBookSearch(''); setPdSearchResults([]); setPdSearchQuery(''); }}
                style={{ flex: 1, padding: '9px 0', border: '1.5px solid var(--line)', borderRadius: 8, fontSize: 12, cursor: 'pointer', fontFamily: 'var(--font-sans)', background: passageMode === key ? 'var(--accent)' : 'var(--card)', color: passageMode === key ? '#fff' : 'var(--muted)' }}>
                {label}
              </button>
            ))}
          </div>

          {/* 주간/월간 선택 (공통) */}
          <select value={newPassage.period} onChange={e => setNewPassage({...newPassage, period: e.target.value})} style={{ marginBottom: 12 }}>
            <option value="weekly">📅 주간</option>
            <option value="monthly">📆 월간</option>
          </select>

          {/* Curator 모드 */}
          {passageMode === 'curator' && (
            <>
              {/* 책 선택 — 시스템 내 books */}
              <select value={newPassage.bookId} onChange={e => selectPassageBookFromCollection(e.target.value)} style={{ marginBottom: 8 }}>
                <option value="">시스템 내 책에서 선택</option>
                {books.map(b => <option key={b.id} value={b.id}>{b.title}{b.author ? ` / ${b.author}` : ''}</option>)}
              </select>
              {/* 또는 카카오 검색 */}
              <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                <input placeholder="또는 책 제목으로 검색…" value={passageBookSearch} onChange={e => setPassageBookSearch(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && searchKakaoForPassage()} style={{ flex: 1 }} />
                <button className="btn-sm btn-outline" onClick={searchKakaoForPassage} style={{ flexShrink: 0 }}>검색</button>
              </div>
              {passageKakaoResults.map((b, i) => (
                <div key={i} onClick={() => selectPassageKakaoBook(b)} style={{ display: 'flex', gap: 10, padding: 8, cursor: 'pointer', borderRadius: 8 }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--tag-bg)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                  {b.thumbnail && <img src={b.thumbnail} style={{ width: 36, height: 50, objectFit: 'cover', borderRadius: 4 }} />}
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{b.title}</div>
                    <div style={{ fontSize: 11, color: 'var(--muted)' }}>{(b.authors||[]).join(', ')} · {b.publisher}</div>
                  </div>
                </div>
              ))}
              {/* 선택된 책 표시 */}
              {newPassage.bookTitle && (
                <div style={{ background: 'var(--tag-bg)', borderRadius: 8, padding: 10, marginBottom: 8, fontSize: 13 }}>
                  <strong>{newPassage.bookTitle}</strong>{newPassage.bookAuthor && ` / ${newPassage.bookAuthor}`}
                </div>
              )}
              {/* 책 소개 (AI 컨텍스트) */}
              <textarea placeholder="책 소개 (AI 컨텍스트로 사용, 자동 채워짐)" value={newPassage.bookDescription}
                onChange={e => setNewPassage({...newPassage, bookDescription: e.target.value})}
                style={{ marginBottom: 8, minHeight: 60, fontSize: 12, resize: 'vertical' }} />
              {/* AI 생성 버튼 */}
              <button className="btn-primary" onClick={generateAIPassage} disabled={aiPassageLoading || !newPassage.bookTitle}
                style={{ marginBottom: 8, width: '100%' }}>
                {aiPassageLoading ? '🤖 큐레이터 코멘트 생성 중…' : '🤖 큐레이터 코멘트 + 토론 질문 생성'}
              </button>
              {/* 큐레이터 코멘트 */}
              <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>큐레이터 코멘트 (2문단)</p>
              <textarea value={newPassage.curatorNote}
                onChange={e => setNewPassage({...newPassage, curatorNote: e.target.value, aiGeneratedNote: false})}
                style={{ marginBottom: 8, minHeight: 120, resize: 'vertical' }} />
              {/* 짧은 직접 인용 (선택) */}
              <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>짧은 직접 인용 (1~2문장, 선택) — 입력 시 출처 필수</p>
              <textarea placeholder='예: "이 책에서 작가는 ... 라고 썼다." (큰따옴표 없이 본문만)' value={newPassage.excerpt}
                onChange={e => setNewPassage({...newPassage, excerpt: e.target.value})}
                style={{ marginBottom: 8, minHeight: 60, fontSize: 13, resize: 'vertical' }} />
              {newPassage.excerpt && (
                <input placeholder="출처 표기 * (예: 책 제목, 출판사, 페이지)" value={newPassage.source}
                  onChange={e => setNewPassage({...newPassage, source: e.target.value})}
                  style={{ marginBottom: 8 }} />
              )}
            </>
          )}

          {/* PD 모드 */}
          {passageMode === 'pd' && (
            <>
              <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 6 }}>
                💡 Project Gutenberg(저작권 만료 작품)에서 책을 검색합니다. 한국어 작품이 한정적이라 결과가 적을 수 있어요.
              </p>
              <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                <input placeholder="책 제목 검색…" value={pdSearchQuery} onChange={e => setPdSearchQuery(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && searchGutendex()} style={{ flex: 1 }} />
                <button className="btn-sm btn-outline" onClick={searchGutendex} disabled={pdSearchLoading} style={{ flexShrink: 0 }}>
                  {pdSearchLoading ? '검색 중…' : '검색'}
                </button>
              </div>
              {pdSearchResults.map((b) => (
                <div key={b.id} onClick={() => selectGutendexBook(b)} style={{ padding: 8, cursor: 'pointer', borderRadius: 8 }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--tag-bg)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{b.title}</div>
                  <div style={{ fontSize: 11, color: 'var(--muted)' }}>{(b.authors||[]).join(', ')}</div>
                </div>
              ))}
              {pdTextLoading && <p style={{ fontSize: 12, color: 'var(--muted)' }}>📥 본문 가져오는 중…</p>}
              {newPassage.bookTitle && (
                <div style={{ background: 'var(--tag-bg)', borderRadius: 8, padding: 10, marginBottom: 8, fontSize: 13 }}>
                  <strong>{newPassage.bookTitle}</strong>{newPassage.bookAuthor && ` / ${newPassage.bookAuthor}`}
                  {newPassage.sourceUrl && (
                    <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4, wordBreak: 'break-all' }}>
                      🔗 {newPassage.sourceUrl}
                    </div>
                  )}
                </div>
              )}
              <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>발췌할 원문 * (다듬어서 저장)</p>
              <textarea value={newPassage.excerpt}
                onChange={e => setNewPassage({...newPassage, excerpt: e.target.value})}
                style={{ marginBottom: 8, minHeight: 160, resize: 'vertical' }} />
              <button className="btn-primary" onClick={generateAIPassage} disabled={aiPassageLoading || !newPassage.excerpt}
                style={{ marginBottom: 8, width: '100%' }}>
                {aiPassageLoading ? '🤖 토론 질문 생성 중…' : '🤖 토론 질문 + 짧은 큐레이터 코멘트 생성'}
              </button>
              {newPassage.curatorNote && (
                <>
                  <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>큐레이터 코멘트</p>
                  <textarea value={newPassage.curatorNote}
                    onChange={e => setNewPassage({...newPassage, curatorNote: e.target.value, aiGeneratedNote: false})}
                    style={{ marginBottom: 8, minHeight: 80, resize: 'vertical' }} />
                </>
              )}
            </>
          )}

          {/* Manual 모드 */}
          {passageMode === 'manual' && (
            <>
              <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                <input placeholder="책 제목 *" value={newPassage.bookTitle} onChange={e => setNewPassage({...newPassage, bookTitle: e.target.value})} style={{ flex: 2 }} />
                <input placeholder="저자" value={newPassage.bookAuthor} onChange={e => setNewPassage({...newPassage, bookAuthor: e.target.value})} style={{ flex: 1 }} />
              </div>
              <select value={newPassage.bookId} onChange={e => setNewPassage({...newPassage, bookId: e.target.value})} style={{ marginBottom: 8 }}>
                <option value="">시스템 내 책 연결 (선택사항)</option>
                {books.map(b => <option key={b.id} value={b.id}>{b.title}</option>)}
              </select>
              <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>본문 / 큐레이터 글</p>
              <textarea placeholder="2문단 큐레이터 글 또는 짧은 발췌 *" value={newPassage.curatorNote}
                onChange={e => setNewPassage({...newPassage, curatorNote: e.target.value})}
                style={{ marginBottom: 8, minHeight: 120, resize: 'vertical' }} />
              <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>짧은 직접 인용 (선택)</p>
              <textarea placeholder='큰따옴표로 묶일 짧은 인용. 입력 시 출처 필수.' value={newPassage.excerpt}
                onChange={e => setNewPassage({...newPassage, excerpt: e.target.value})}
                style={{ marginBottom: 8, minHeight: 60, fontSize: 13, resize: 'vertical' }} />
              <input placeholder="출처 표기 (인용이 있으면 필수)" value={newPassage.source} onChange={e => setNewPassage({...newPassage, source: e.target.value})} style={{ marginBottom: 12 }} />
            </>
          )}

          {/* 관련 질문 (공통) */}
          <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 6, marginTop: 8 }}>
            관련 질문 (최대 5개){newPassage.aiGeneratedQuestions ? ' — 🤖 AI 생성' : ''}
          </p>
          {newPassage.questions.map((q, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
              <span style={{ fontSize: 12, flex: 1 }}>{i + 1}. {q}</span>
              <button onClick={() => setNewPassage(prev => ({...prev, questions: prev.questions.filter((_, j) => j !== i)}))}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', fontSize: 14 }}>×</button>
            </div>
          ))}
          {newPassage.questions.length < 5 && (
            <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
              <input placeholder="질문 추가" value={newPassageQuestion} onChange={e => setNewPassageQuestion(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && newPassageQuestion.trim()) {
                  setNewPassage(prev => ({...prev, questions: [...prev.questions, newPassageQuestion.trim()]}));
                  setNewPassageQuestion('');
                }}} style={{ flex: 1 }} />
              <button className="btn-sm btn-outline" onClick={() => {
                if (newPassageQuestion.trim()) {
                  setNewPassage(prev => ({...prev, questions: [...prev.questions, newPassageQuestion.trim()]}));
                  setNewPassageQuestion('');
                }
              }}>추가</button>
            </div>
          )}

          <button className="btn-primary" onClick={addPassage} style={{ marginTop: 12 }}>등록</button>

          {/* 등록된 목록 */}
          <div style={{ marginTop: 20 }}>
            <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--muted)', marginBottom: 10 }}>등록된 발췌문</p>
            {passages.length === 0 ? (
              <p style={{ fontSize: 13, color: 'var(--muted)' }}>아직 등록된 발췌문이 없어요.</p>
            ) : (
              passages.map(p => (
                <div key={p.id} style={{ ...listItemStyle, alignItems: 'flex-start', flexDirection: 'column', gap: 6 }}>
                  {editingPassageId === p.id ? (
                    /* 수정 폼 */
                    <div style={{ width: '100%' }}>
                      <select value={editPassage.kind} onChange={e => setEditPassage({...editPassage, kind: e.target.value, publicDomain: e.target.value === 'public_domain'})} style={{ marginBottom: 8 }}>
                        <option value="curator_intro">✍️ 큐레이터 소개</option>
                        <option value="public_domain">📜 원문 발췌 (저작권 만료)</option>
                      </select>
                      <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                        <input placeholder="책 제목 *" value={editPassage.bookTitle} onChange={e => setEditPassage({...editPassage, bookTitle: e.target.value})} style={{ flex: 2 }} />
                        <input placeholder="저자" value={editPassage.bookAuthor} onChange={e => setEditPassage({...editPassage, bookAuthor: e.target.value})} style={{ flex: 1 }} />
                      </div>
                      {editPassage.kind === 'public_domain' ? (
                        <>
                          <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>원문 발췌 *</p>
                          <textarea value={editPassage.excerpt} onChange={e => setEditPassage({...editPassage, excerpt: e.target.value})}
                            style={{ marginBottom: 8, minHeight: 160, resize: 'vertical' }} />
                          <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>큐레이터 코멘트 (선택)</p>
                          <textarea value={editPassage.curatorNote} onChange={e => setEditPassage({...editPassage, curatorNote: e.target.value})}
                            style={{ marginBottom: 8, minHeight: 80, resize: 'vertical' }} />
                        </>
                      ) : (
                        <>
                          <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>큐레이터 코멘트</p>
                          <textarea value={editPassage.curatorNote} onChange={e => setEditPassage({...editPassage, curatorNote: e.target.value})}
                            style={{ marginBottom: 8, minHeight: 120, resize: 'vertical' }} />
                          <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>짧은 직접 인용 (선택)</p>
                          <textarea value={editPassage.excerpt} onChange={e => setEditPassage({...editPassage, excerpt: e.target.value})}
                            style={{ marginBottom: 8, minHeight: 60, fontSize: 13, resize: 'vertical' }} />
                        </>
                      )}
                      <input placeholder="출처 (선택, 인용 시 필수)" value={editPassage.source} onChange={e => setEditPassage({...editPassage, source: e.target.value})} style={{ marginBottom: 8 }} />
                      <input placeholder="출처 URL (선택)" value={editPassage.sourceUrl} onChange={e => setEditPassage({...editPassage, sourceUrl: e.target.value})} style={{ marginBottom: 8 }} />
                      {/* 질문 수정 */}
                      <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>질문</p>
                      {editPassage.questions.map((q, i) => (
                        <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
                          <span style={{ fontSize: 12, flex: 1 }}>{i + 1}. {q}</span>
                          <button onClick={() => setEditPassage(prev => ({...prev, questions: prev.questions.filter((_, j) => j !== i)}))}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', fontSize: 14 }}>×</button>
                        </div>
                      ))}
                      {editPassage.questions.length < 5 && (
                        <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                          <input placeholder="질문 추가" value={editPassageQuestion} onChange={e => setEditPassageQuestion(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter' && editPassageQuestion.trim()) { setEditPassage(prev => ({...prev, questions: [...prev.questions, editPassageQuestion.trim()]})); setEditPassageQuestion(''); }}}
                            style={{ flex: 1, fontSize: 13 }} />
                          <button className="btn-sm btn-outline" onClick={() => { if (editPassageQuestion.trim()) { setEditPassage(prev => ({...prev, questions: [...prev.questions, editPassageQuestion.trim()]})); setEditPassageQuestion(''); } }}>추가</button>
                        </div>
                      )}
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button className="btn-sm btn-outline" onClick={() => { setEditingPassageId(null); setEditPassageQuestion(''); }}>취소</button>
                        <button className="btn-sm" style={{ background: 'var(--accent)', color: '#fff' }} onClick={() => saveEditPassage(p.id)}>저장</button>
                      </div>
                    </div>
                  ) : (
                    /* 목록 뷰 */
                    <>
                      <div style={{ display: 'flex', width: '100%', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 10, background: p.period === 'weekly' ? 'var(--accent2)' : 'var(--accent)', color: '#fff', borderRadius: 10, padding: '2px 8px', flexShrink: 0 }}>
                          {p.period === 'weekly' ? '주간' : '월간'}
                        </span>
                        {p.kind === 'public_domain' ? (
                          <span style={{ fontSize: 10, background: 'var(--tag-bg)', color: 'var(--accent)', borderRadius: 10, padding: '2px 8px', flexShrink: 0 }}>📜 원문</span>
                        ) : p.kind === 'curator_intro' ? (
                          <span style={{ fontSize: 10, background: 'var(--tag-bg)', color: 'var(--muted)', borderRadius: 10, padding: '2px 8px', flexShrink: 0 }}>✍️ 소개</span>
                        ) : null}
                        <span style={{ fontSize: 12, color: 'var(--muted)', flexShrink: 0 }}>{p.periodKey}</span>
                        <span style={{ fontSize: 13, fontWeight: 500, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.bookTitle}</span>
                        <button className="btn-sm btn-outline" onClick={() => togglePassageActive(p.id, p.isActive)}
                          style={{ flexShrink: 0, background: p.isActive ? 'var(--accent)' : '', color: p.isActive ? '#fff' : '' }}>
                          {p.isActive ? '✅ 노출 중' : '노출'}
                        </button>
                        <button className="btn-sm btn-outline" onClick={() => { setEditingPassageId(p.id); setEditPassage({ bookTitle: p.bookTitle || '', bookAuthor: p.bookAuthor || '', kind: p.kind || 'curator_intro', excerpt: p.excerpt || '', curatorNote: p.curatorNote || '', passage: p.passage || '', questions: p.questions || [], source: p.source || '', sourceType: p.sourceType || 'manual', sourceUrl: p.sourceUrl || '', publicDomain: !!p.publicDomain }); setEditPassageQuestion(''); }} style={{ flexShrink: 0 }}>수정</button>
                        <button className="btn-sm btn-danger" onClick={() => deletePassage(p.id)} style={{ flexShrink: 0 }}>삭제</button>
                      </div>
                      <p style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }}>
                        {(() => { const t = p.excerpt || p.curatorNote || p.passage || ''; return t ? `"${t.slice(0, 60)}${t.length > 60 ? '…' : ''}"` : ''; })()}
                      </p>
                      {p.questions?.length > 0 && (
                        <p style={{ fontSize: 11, color: 'var(--accent)' }}>💬 질문 {p.questions.length}개</p>
                      )}
                    </>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* 일정 관리 */}
      {tab === 'meetings' && (
        <div style={sectionStyle}>
          <h3 style={h3Style}>📅 일정 추가</h3>
          <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={{ fontSize: 11, color: 'var(--muted)' }}>시작</label>
              <input type="datetime-local" value={newMeeting.start} onChange={e => setNewMeeting({...newMeeting, start: e.target.value})} />
            </div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={{ fontSize: 11, color: 'var(--muted)' }}>종료</label>
              <input type="datetime-local" value={newMeeting.end} onChange={e => setNewMeeting({...newMeeting, end: e.target.value})} />
            </div>
          </div>
          <select value={newMeeting.bookId} onChange={e => setNewMeeting({...newMeeting, bookId: e.target.value})} style={{ marginBottom: 8 }}>
            <option value="">책 선택 (선택사항)</option>
            {books.map(b => <option key={b.id} value={b.id}>{b.title}</option>)}
          </select>
          <input placeholder="메모 (선택)" value={newMeeting.note} onChange={e => setNewMeeting({...newMeeting, note: e.target.value})} style={{ marginBottom: 8 }} />
          <button className="btn-primary" onClick={addMeeting}>일정 추가</button>
          <div style={{ marginTop: 14 }}>
            {meetings.map(m => (
              <div key={m.id} style={listItemStyle}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 500 }}>{formatDateTime(m.date)}{m.dateEnd ? ` ~ ${formatDateTime(m.dateEnd)}` : ''}</div>
                  {m.note && <div style={{ fontSize: 12, color: 'var(--muted)' }}>{m.note}</div>}
                </div>
                <button className="btn-sm btn-danger" onClick={() => deleteMeeting(m.id)}>삭제</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 공지 관리 */}
      {tab === 'notices' && (
        <div style={sectionStyle}>
          <h3 style={h3Style}>📢 공지 추가</h3>
          <input placeholder="공지 제목" value={newNotice.title} onChange={e => setNewNotice({...newNotice, title: e.target.value})} style={{ marginBottom: 8 }} />
          <div style={{ marginBottom: 8 }}>
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <input type="checkbox" id="pinned" checked={newNotice.pinned} onChange={e => setNewNotice({...newNotice, pinned: e.target.checked})} style={{ width: 'auto' }} />
            <label htmlFor="pinned" style={{ fontSize: 13, color: 'var(--muted)', cursor: 'pointer' }}>📌 홈 상단 고정 공지로 설정</label>
          </div>
          <button className="btn-primary" onClick={addNotice}>공지 등록</button>

          <div style={{ marginTop: 14 }}>
            {notices.map(n => (
              <div key={n.id}>
                {editingNoticeId === n.id ? (
                  <div style={{ padding: '12px 0', borderBottom: '1px solid var(--line)' }}>
                    <input value={editNotice.title} onChange={e => setEditNotice({...editNotice, title: e.target.value})} style={{ marginBottom: 8 }} />
                    <div style={{ marginBottom: 8 }}>
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
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <input type="checkbox" checked={editNotice.pinned} onChange={e => setEditNotice({...editNotice, pinned: e.target.checked})} style={{ width: 'auto' }} />
                      <span style={{ fontSize: 13, color: 'var(--muted)' }}>📌 고정</span>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button className="btn-sm btn-outline" onClick={() => setEditingNoticeId(null)}>취소</button>
                      <button className="btn-sm" style={{ background: 'var(--accent)', color: '#fff' }} onClick={() => saveEditNotice(n.id)}>저장</button>
                    </div>
                  </div>
                ) : (
                  <div style={listItemStyle}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.pinned ? '📌 ' : ''}{n.title}</div>
                      <div style={{ fontSize: 12, color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {stripHtml(n.content).slice(0,40) + '…'}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                      {!n.pinned && <button className="btn-sm btn-outline" onClick={() => setPinned(n.id)} style={{ flexShrink: 0 }}>고정</button>}
                      <button className="btn-sm btn-outline" onClick={() => { setEditingNoticeId(n.id); setEditNotice({ title: n.title, content: n.content, pinned: n.pinned }); }} style={{ flexShrink: 0 }}>수정</button>
                      <button className="btn-sm btn-danger" onClick={() => deleteNotice(n.id)} style={{ flexShrink: 0 }}>삭제</button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 글머리 관리 */}
      {tab === 'prefixes' && (
        <div style={sectionStyle}>
          <h3 style={h3Style}>🏷️ 자유게시판 글머리 관리</h3>
          <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
            <input placeholder="새 글머리 (예: 공략, 질문, 잡담)" value={newPrefix} onChange={e => setNewPrefix(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addPrefix()} style={{ flex: 1 }} />
            <button className="btn-sm" style={{ background: 'var(--accent)', color: '#fff', flexShrink: 0 }} onClick={addPrefix}>추가</button>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {prefixes.map(p => (
              <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--tag-bg)', borderRadius: 20, padding: '4px 10px 4px 12px' }}>
                <span style={{ fontSize: 13 }}>{p.label}</span>
                <button onClick={() => deletePrefix(p.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', fontSize: 14, lineHeight: 1, padding: 0 }}>×</button>
              </div>
            ))}
            {prefixes.length === 0 && <p style={{ fontSize: 13, color: 'var(--muted)' }}>아직 글머리가 없어요.</p>}
          </div>
        </div>
      )}

      {/* 알림 관리 */}
      {tab === 'notifications' && (
        <div style={sectionStyle}>
          <h3 style={h3Style}>🔔 알림 보내기</h3>
          <input placeholder="알림 제목" value={newNotif.title} onChange={e => setNewNotif({...newNotif, title: e.target.value})} style={{ marginBottom: 8 }} />
          <textarea placeholder="알림 내용" value={newNotif.body} onChange={e => setNewNotif({...newNotif, body: e.target.value})} style={{ marginBottom: 8, minHeight: 80 }} />
          <input placeholder="이동할 URL (예: /notice, /board)" value={newNotif.url} onChange={e => setNewNotif({...newNotif, url: e.target.value})} style={{ marginBottom: 8 }} />

          <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
            <button
              onClick={sendNow}
              disabled={sendingNow}
              className="btn-primary"
              style={{ flex: 1 }}
            >
              {sendingNow ? '발송 중…' : '📣 지금 바로 발송'}
            </button>
          </div>

          <h3 style={{ ...h3Style, marginTop: 8 }}>📅 예약 알림</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 4 }}>
            <label style={{ fontSize: 11, color: 'var(--muted)' }}>발송 날짜 (해당 날 오전 9시에 발송)</label>
            <input type="date" value={newNotif.date} onChange={e => setNewNotif({...newNotif, date: e.target.value})} style={{ marginBottom: 8 }} />
          </div>
          <button onClick={addScheduledNotif} className="btn-primary" style={{ marginBottom: 16 }}>예약 등록</button>

          <div>
            {scheduled.length === 0 ? (
              <p style={{ fontSize: 13, color: 'var(--muted)' }}>예약된 알림이 없어요.</p>
            ) : (
              scheduled.map(n => (
                <div key={n.id} style={{ ...listItemStyle, opacity: n.sent ? 0.5 : 1 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 500 }}>{n.title}</div>
                    <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                      📅 {n.date} · {n.sent ? '✅ 발송완료' : '⏳ 대기중'}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--muted)' }}>{n.body}</div>
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