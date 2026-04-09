'use client';
import { useEffect, useState } from 'react';
import { collection, getDocs, addDoc, deleteDoc, updateDoc, doc, query, orderBy, where, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import dynamic from 'next/dynamic';

const QuillEditor = dynamic(() => import('@/components/QuillEditor'), { ssr: false });

const ADMIN_PASS = process.env.NEXT_PUBLIC_ADMIN_PASS || 'admin0000';

export default function AdminPage() {
  const [authed, setAuthed] = useState(false);
  const [pw, setPw] = useState('');
  const [err, setErr] = useState('');
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

  useEffect(() => {
    if (authed) { loadAll(); }
  }, [authed, tab]);

  function loadAll() {
    loadBooks(); loadMeetings(); loadNotices(); loadPrefixes();
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

  if (!authed) return (
    <div style={{ maxWidth: 360, margin: '40px auto' }}>
      <div className="card" style={{ padding: '32px 24px', textAlign: 'center' }}>
        <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 20, color: 'var(--accent)', marginBottom: 20 }}>🔒 관리자</h2>
        <input type="password" placeholder="비밀번호" value={pw} onChange={e => setPw(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { pw === ADMIN_PASS ? (setAuthed(true), setErr('')) : setErr('비밀번호가 틀렸어요.'); }}}
          style={{ marginBottom: 10 }} />
        {err && <p style={{ color: 'var(--danger)', fontSize: 12, marginBottom: 8 }}>{err}</p>}
        <button className="btn-primary" onClick={() => pw === ADMIN_PASS ? (setAuthed(true), setErr('')) : setErr('비밀번호가 틀렸어요.')}>로그인</button>
      </div>
    </div>
  );

  const TABS = [['books','📖 책'],['meetings','📅 일정'],['notices','📢 공지'],['prefixes','🏷️ 글머리']];

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 20, color: 'var(--accent)' }}>⚙️ 관리자</h1>
        <button className="btn-sm btn-outline" onClick={() => setAuthed(false)}>로그아웃</button>
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
    </div>
  );
}
