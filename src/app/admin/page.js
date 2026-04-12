'use client';
import { useEffect, useState } from 'react';
import { collection, getDocs, addDoc, deleteDoc, updateDoc, doc, query, orderBy, where, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/AuthContext';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';

const QuillEditor = dynamic(() => import('@/components/QuillEditor'), { ssr: false });

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

  // 이 주/달의 글
  const [passages, setPassages] = useState([]);
  const [passageMode, setPassageMode] = useState('ai'); // 'ai' | 'manual'
  const [newPassage, setNewPassage] = useState({ bookTitle: '', bookAuthor: '', bookId: '', passage: '', period: 'weekly', questions: [], source: '' });
  const [newPassageQuestion, setNewPassageQuestion] = useState('');
  const [aiPassageLoading, setAiPassageLoading] = useState(false);

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
    if (passageMode === 'manual' && !newPassage.bookTitle) { alert('책 제목을 입력해주세요.'); return; }
    if (!newPassage.passage) { alert('발췌문을 입력해주세요.'); return; }
    const periodKey = getPeriodKey(newPassage.period);
    await addDoc(collection(db, 'featuredPassages'), {
      ...newPassage, periodKey, year: new Date().getFullYear(),
      isActive: false, createdAt: serverTimestamp(),
    });
    setNewPassage({ bookTitle: '', bookAuthor: '', bookId: '', passage: '', period: 'weekly', questions: [], source: '' });
    setNewPassageQuestion('');
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

  async function generateAIPassage() {
    setAiPassageLoading(true);
    try {
      const res = await fetch('/api/ai-passage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (data.error) { alert('AI 오류: ' + data.error); return; }
      setNewPassage(prev => ({
        ...prev,
        bookTitle: data.bookTitle || prev.bookTitle,
        bookAuthor: data.bookAuthor || prev.bookAuthor,
        passage: data.passage || prev.passage,
        questions: data.questions || prev.questions,
      }));
    } catch (e) { alert('생성 실패: ' + e.message); }
    setAiPassageLoading(false);
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
                    <div key={q.id} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', padding: '8px 0', borderBottom: '1px solid var(--line)' }}>
                      <span style={{ fontSize: 13, color: 'var(--muted)', flexShrink: 0, marginTop: 2 }}>{i + 1}.</span>
                      <span style={{ fontSize: 13, flex: 1, lineHeight: 1.6 }}>{q.question}</span>
                      <button className="btn-sm btn-danger" onClick={() => deleteQuestion(q.id)} style={{ flexShrink: 0 }}>삭제</button>
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

          {/* AI / 직접 입력 모드 선택 */}
          <div style={{ display: 'flex', gap: 4, marginBottom: 16 }}>
            {[['ai', '🤖 AI 자동 생성'], ['manual', '✏️ 직접 입력']].map(([key, label]) => (
              <button key={key} onClick={() => { setPassageMode(key); setNewPassage({ bookTitle: '', bookAuthor: '', bookId: '', passage: '', period: 'weekly', questions: [], source: '' }); setNewPassageQuestion(''); }}
                style={{ flex: 1, padding: '9px 0', border: '1.5px solid var(--line)', borderRadius: 8, fontSize: 13, cursor: 'pointer', fontFamily: 'var(--font-sans)', background: passageMode === key ? 'var(--accent)' : 'var(--card)', color: passageMode === key ? '#fff' : 'var(--muted)' }}>
                {label}
              </button>
            ))}
          </div>

          {/* 주간/월간 선택 (공통) */}
          <select value={newPassage.period} onChange={e => setNewPassage({...newPassage, period: e.target.value})} style={{ marginBottom: 12 }}>
            <option value="weekly">📅 주간</option>
            <option value="monthly">📆 월간</option>
          </select>

          {/* AI 모드 */}
          {passageMode === 'ai' && (
            <>
              <button className="btn-primary" onClick={generateAIPassage} disabled={aiPassageLoading}
                style={{ marginBottom: 12, width: '100%' }}>
                {aiPassageLoading ? '🤖 AI가 책을 고르고 발췌문을 생성하고 있어요…' : '🤖 AI가 책 선택 + 발췌문 + 질문 자동 생성'}
              </button>

              {newPassage.passage && (
                <div style={{ background: 'var(--tag-bg)', borderRadius: 8, padding: 12, marginBottom: 12 }}>
                  <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 6 }}>AI가 생성한 결과 — 내용을 확인 후 등록하세요</p>
                  <p style={{ fontSize: 13, fontWeight: 500 }}>{newPassage.bookTitle} {newPassage.bookAuthor && `/ ${newPassage.bookAuthor}`}</p>
                  <p style={{ fontSize: 13, lineHeight: 1.7, marginTop: 6, whiteSpace: 'pre-line' }}>{newPassage.passage}</p>
                  {newPassage.questions.length > 0 && (
                    <div style={{ marginTop: 8 }}>
                      {newPassage.questions.map((q, i) => <p key={i} style={{ fontSize: 12, color: 'var(--muted)' }}>{i+1}. {q}</p>)}
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {/* 직접 입력 모드 */}
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
              <textarea placeholder="발췌문 *" value={newPassage.passage}
                onChange={e => setNewPassage({...newPassage, passage: e.target.value})}
                style={{ marginBottom: 8, minHeight: 120, resize: 'vertical' }} />
              <input placeholder="출처 표기 (선택)" value={newPassage.source} onChange={e => setNewPassage({...newPassage, source: e.target.value})} style={{ marginBottom: 12 }} />
            </>
          )}

          {/* 관련 질문 */}
          {(passageMode === 'manual' || newPassage.questions.length > 0) && (
            <>
              <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 6 }}>
                관련 질문 (최대 5개){passageMode === 'ai' && newPassage.questions.length > 0 ? ' — AI 생성 결과 (삭제 가능)' : ''}
              </p>
              {newPassage.questions.map((q, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
                  <span style={{ fontSize: 12, flex: 1 }}>{i + 1}. {q}</span>
                  <button onClick={() => setNewPassage(prev => ({...prev, questions: prev.questions.filter((_, j) => j !== i)}))}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', fontSize: 14 }}>×</button>
                </div>
              ))}
              {passageMode === 'manual' && newPassage.questions.length < 5 && (
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
            </>
          )}
          {passageMode === 'manual' && newPassage.questions.length === 0 && (
            <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
              <input placeholder="관련 질문 추가 (선택, 최대 5개)" value={newPassageQuestion} onChange={e => setNewPassageQuestion(e.target.value)}
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
                  <div style={{ display: 'flex', width: '100%', gap: 8, alignItems: 'center' }}>
                    <span style={{ fontSize: 10, background: p.period === 'weekly' ? 'var(--accent2)' : 'var(--accent)', color: '#fff', borderRadius: 10, padding: '2px 8px', flexShrink: 0 }}>
                      {p.period === 'weekly' ? '주간' : '월간'}
                    </span>
                    <span style={{ fontSize: 12, color: 'var(--muted)', flexShrink: 0 }}>{p.periodKey}</span>
                    <span style={{ fontSize: 13, fontWeight: 500, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.bookTitle}</span>
                    <button className="btn-sm btn-outline" onClick={() => togglePassageActive(p.id, p.isActive)}
                      style={{ flexShrink: 0, background: p.isActive ? 'var(--accent)' : '', color: p.isActive ? '#fff' : '' }}>
                      {p.isActive ? '✅ 노출 중' : '노출'}
                    </button>
                    <button className="btn-sm btn-danger" onClick={() => deletePassage(p.id)} style={{ flexShrink: 0 }}>삭제</button>
                  </div>
                  <p style={{ fontSize: 12, color: 'var(--muted)', paddingLeft: 0, lineHeight: 1.5 }}>
                    "{p.passage?.slice(0, 60)}{p.passage?.length > 60 ? '…' : ''}"
                  </p>
                  {p.questions?.length > 0 && (
                    <p style={{ fontSize: 11, color: 'var(--accent)' }}>💬 질문 {p.questions.length}개</p>
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
            <QuillEditor value={newNotice.content} onChange={v => setNewNotice({...newNotice, content: v})} placeholder="공지 내용…" minHeight={120} />
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
                      <QuillEditor value={editNotice.content} onChange={v => setEditNotice({...editNotice, content: v})} placeholder="내용…" minHeight={100} />
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
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 500 }}>{n.pinned ? '📌 ' : ''}{n.title}</div>
                      <div style={{ fontSize: 12, color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                        dangerouslySetInnerHTML={{ __html: (n.content||'').replace(/<[^>]+>/g,'').slice(0,40) + '…' }} />
                    </div>
                    {!n.pinned && <button className="btn-sm btn-outline" onClick={() => setPinned(n.id)}>고정</button>}
                    <button className="btn-sm btn-outline" onClick={() => { setEditingNoticeId(n.id); setEditNotice({ title: n.title, content: n.content, pinned: n.pinned }); }}>수정</button>
                    <button className="btn-sm btn-danger" onClick={() => deleteNotice(n.id)}>삭제</button>
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