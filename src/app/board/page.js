'use client';
import { useEffect, useState } from 'react';
import { collection, getDocs, query, orderBy, serverTimestamp, doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore';
import { db, storage } from '@/lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useAuth } from '@/lib/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import NoticeBanner from '@/components/NoticeBanner';
import SearchBar from '@/components/SearchBar';
import { stripHtml, matchAny, extractFirstImage } from '@/lib/searchUtils';
import { sanitizeHtmlForStorage } from '@/lib/sanitize';
import { authenticatedJsonFetch } from '@/lib/authenticatedFetch';
import dynamic from 'next/dynamic';
import { X, Pencil, Save } from 'lucide-react';

const QuillEditor = dynamic(() => import('@/components/QuillEditor'), { ssr: false });

const PAGE_SIZE = 10;
const VISIBLE_PAGES = 5;
const VIEW_KEY = 'dd-board-view';
const VIEW_MODES = [
  { value: 'text', label: '줄글형' },
  { value: 'board', label: '게시판형' },
  { value: 'photo', label: '사진형' },
];

function getVisiblePages(current, total) {
  if (total <= VISIBLE_PAGES) return Array.from({ length: total }, (_, i) => i + 1);
  let start = Math.max(1, current - Math.floor(VISIBLE_PAGES / 2));
  const end = Math.min(total, start + VISIBLE_PAGES - 1);
  start = Math.max(1, end - VISIBLE_PAGES + 1);
  return Array.from({ length: end - start + 1 }, (_, i) => start + i);
}

export default function BoardPage() {
  const { user, profile } = useAuth();
  const router = useRouter();
  const [posts, setPosts] = useState([]);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [prefix, setPrefix] = useState('');
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [prefixes, setPrefixes] = useState([]);
  const [filterPrefix, setFilterPrefix] = useState('');
  const [draft, setDraft] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [viewMode, setViewModeState] = useState('text');

  useEffect(() => {
    loadPrefixes();
  }, []);

  useEffect(() => {
    try {
      const v = window.localStorage.getItem(VIEW_KEY);
      if (VIEW_MODES.some(m => m.value === v)) setViewModeState(v);
    } catch {}
  }, []);

  function setViewMode(v) {
    setViewModeState(v);
    try { window.localStorage.setItem(VIEW_KEY, v); } catch {}
  }

  useEffect(() => {
    let cancelled = false;
    async function run() {
      const snap = await getDocs(query(
        collection(db, 'board'),
        orderBy('createdAt', 'desc'),
      ));
      if (cancelled) return;
      setPosts(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }
    run();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, filterPrefix]);

  useEffect(() => {
    if (!user) { setDraft(''); return; }
    getDoc(doc(db, 'users', user.uid, 'drafts', 'board'))
      .then(snap => { if (snap.exists()) setDraft(snap.data()); })
      .catch(() => {});
  }, [user]);

  async function reloadPosts() {
    const snap = await getDocs(query(
      collection(db, 'board'),
      orderBy('createdAt', 'desc'),
    ));
    setPosts(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  }

  async function loadPrefixes() {
    try {
      const snap = await getDocs(collection(db, 'boardPrefixes'));
      setPrefixes(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch {}
  }

  const filtered = posts.filter(p => {
    const matchSearch = matchAny([p.title, stripHtml(p.content), p.nickname, p.prefix], search);
    const matchPrefix = !filterPrefix || p.prefix === filterPrefix;
    return matchSearch && matchPrefix;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const pageStart = (safePage - 1) * PAGE_SIZE;
  const pageItems = filtered.slice(pageStart, pageStart + PAGE_SIZE);
  const visiblePages = getVisiblePages(safePage, totalPages);

  async function handleSubmit() {
    if (!user) { router.push('/login'); return; }
    if (!profile) { alert('프로필 로딩 중입니다. 잠시 후 다시 시도해주세요.'); return; }
    if (!title.trim()) { alert('제목을 입력해주세요.'); return; }
    if (!content || content === '<p><br></p>') { alert('내용을 입력해주세요.'); return; }
    setSubmitting(true);
    try {
      const result = await authenticatedJsonFetch('/api/content/board', {
        method: 'POST',
        body: { title, prefix, content },
      });
      if (result.contentWasSanitized) {
        alert('안전하지 않거나 지원되지 않는 HTML을 제거한 뒤 저장했습니다.');
      }
      setTitle(''); setPrefix(''); setContent('');
      setShowForm(false);
      try { await deleteDoc(doc(db, 'users', user.uid, 'drafts', 'board')); } catch {}
      setDraft('');
      await reloadPosts();
      setCurrentPage(1);
    } catch (e) { alert('저장 실패: ' + e.message); }
    finally { setSubmitting(false); }
  }

  async function saveDraft() {
    if (!user) { alert('로그인 후 이용해주세요.'); return; }
    const sanitized = sanitizeHtmlForStorage(content);
    if (sanitized.removedUnsafeContent) {
      alert('안전하지 않거나 지원되지 않는 HTML을 제거한 뒤 임시저장합니다.');
    }
    try {
      await setDoc(doc(db, 'users', user.uid, 'drafts', 'board'), {
        title, prefix, content: sanitized.html, updatedAt: serverTimestamp(),
      });
      setContent(sanitized.html);
      setDraft({ title, prefix, content: sanitized.html });
      alert('임시저장 완료!');
    } catch (e) { alert('임시저장 실패: ' + e.message); }
  }

  function loadDraft() {
    if (draft) { setTitle(draft.title || ''); setPrefix(draft.prefix || ''); setContent(draft.content || ''); }
  }

  return (
    <div>
      <NoticeBanner />
      <div className="section-title">자유게시판</div>

      {/* 검색 + 말머리 필터 */}
      <div style={{ marginBottom: 14 }}>
        {prefixes.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--card)', border: '1.5px solid var(--line)', borderRadius: 12, padding: '8px 14px', marginBottom: 8 }}>
            <select
              value={filterPrefix}
              onChange={e => setFilterPrefix(e.target.value)}
              style={{ border: 'none', background: 'none', outline: 'none', fontSize: 13, color: filterPrefix ? 'var(--accent)' : 'var(--muted)', cursor: 'pointer', flexShrink: 0, width: 'auto', padding: 0 }}
            >
              <option value="">전체 말머리</option>
              {prefixes.map(p => <option key={p.id} value={p.label}>{p.label}</option>)}
            </select>
          </div>
        )}
        <SearchBar
          value={searchInput}
          onChange={setSearchInput}
          onSubmit={v => setSearch(v)}
          placeholder="제목, 내용, 닉네임, 말머리로 검색…"
        />
      </div>

      {/* 글쓰기 버튼 */}
      {user ? (
        <button onClick={() => setShowForm(!showForm)} className="btn-primary" style={{ marginBottom: 14, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
          {showForm ? <><X size={14} /> 닫기</> : <><Pencil size={14} /> 글쓰기</>}
        </button>
      ) : (
        <div className="card" style={{ padding: 16, textAlign: 'center', marginBottom: 14 }}>
          <p style={{ color: 'var(--muted)', marginBottom: 10, fontSize: 14 }}>로그인하면 글을 작성할 수 있어요.</p>
          <button onClick={() => router.push('/login')} className="btn-primary" style={{ maxWidth: 160, margin: '0 auto' }}>로그인 / 가입</button>
        </div>
      )}

      {/* 글쓰기 폼 */}
      {showForm && (
        <div className="card" style={{ padding: 18, marginBottom: 16 }}>
          {draft && (
            <button onClick={loadDraft} style={{ fontSize: 12, color: 'var(--accent2)', background: 'none', border: 'none', cursor: 'pointer', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 4 }}>
              <Save size={12} /> 임시저장된 내용 불러오기
            </button>
          )}
          {/* 글머리 */}
          {prefixes.length > 0 && (
            <select value={prefix} onChange={e => setPrefix(e.target.value)} style={{ marginBottom: 8 }}>
              <option value="">글머리 선택 (선택사항)</option>
              {prefixes.map(p => <option key={p.id} value={p.label}>{p.label}</option>)}
            </select>
          )}
          <input type="text" placeholder="제목" value={title} onChange={e => setTitle(e.target.value)} style={{ marginBottom: 8 }} />
          <div style={{ marginBottom: 8 }}>
            <QuillEditor
              value={content}
              onChange={setContent}
              placeholder="내용을 입력해주세요…"
              minHeight={160}
              onImageUpload={async (file) => {
                const r = ref(storage, `board/${Date.now()}_${file.name}`);
                await uploadBytes(r, file);
                return getDownloadURL(r);
              }}
            />
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={saveDraft} className="btn-sm btn-outline" style={{ flex: 1 }}>임시저장</button>
            <button onClick={handleSubmit} disabled={submitting} className="btn-sm" style={{ flex: 2, background: 'var(--accent)', color: '#fff' }}>
              {submitting ? '게시 중…' : '게시하기'}
            </button>
          </div>
        </div>
      )}

      {/* 보기 모드 선택 */}
      <div role="radiogroup" aria-label="보기 모드" style={{ display: 'flex', justifyContent: 'flex-end', gap: 4, marginBottom: 10 }}>
        {VIEW_MODES.map(m => (
          <button
            key={m.value}
            type="button"
            role="radio"
            aria-checked={viewMode === m.value}
            onClick={() => setViewMode(m.value)}
            className="btn-sm"
            style={{
              background: viewMode === m.value ? 'var(--accent)' : 'var(--tag-bg)',
              color: viewMode === m.value ? '#fff' : 'var(--accent)',
              border: '1px solid var(--line)',
              fontWeight: viewMode === m.value ? 600 : 400,
            }}
          >{m.label}</button>
        ))}
      </div>

      {/* 게시글 목록 */}
      {filtered.length === 0 ? (
        <p className="empty-msg">게시글이 없어요.</p>
      ) : viewMode === 'board' ? (
        <div>
          <div style={{ display: 'flex', gap: 10, padding: '6px 12px', fontSize: 11, color: 'var(--muted)', borderBottom: '1.5px solid var(--line)' }}>
            <span style={{ width: 32, flexShrink: 0 }}>번호</span>
            <span style={{ flex: 1 }}>제목</span>
            <span style={{ width: 70, flexShrink: 0 }}>글쓴이</span>
            <span style={{ width: 44, flexShrink: 0, textAlign: 'right' }}>날짜</span>
          </div>
          {pageItems.map((p, i) => (
            <Link key={p.id} href={`/board/${p.id}`} style={{ textDecoration: 'none', display: 'block' }}>
              <div className="post-row">
                <span style={{ width: 32, flexShrink: 0, fontSize: 12, color: 'var(--muted)' }}>{filtered.length - (pageStart + i)}</span>
                <span style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                  {p.prefix && <span style={{ fontSize: 11, background: 'var(--accent)', color: '#fff', padding: '1px 7px', borderRadius: 10, flexShrink: 0 }}>{p.prefix}</span>}
                  <span style={{ fontSize: 14, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.title}</span>
                </span>
                <span style={{ width: 70, flexShrink: 0, fontSize: 12, color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.nickname}</span>
                <span style={{ width: 44, flexShrink: 0, fontSize: 11, color: 'var(--muted)', textAlign: 'right' }}>{p.createdAt?.toDate ? `${p.createdAt.toDate().getMonth()+1}/${p.createdAt.toDate().getDate()}` : ''}</span>
              </div>
            </Link>
          ))}
        </div>
      ) : viewMode === 'photo' ? (
        <div className="post-grid">
          {pageItems.map(p => {
            const thumb = extractFirstImage(p.content);
            return (
              <Link key={p.id} href={`/board/${p.id}`} style={{ textDecoration: 'none', display: 'block' }}>
                <div className="post-grid-card">
                  {thumb ? (
                    <img src={thumb} alt="" className="post-grid-thumb" />
                  ) : (
                    <div className="post-grid-thumb-empty">No Image</div>
                  )}
                  <div style={{ padding: '8px 10px' }}>
                    <div style={{
                      fontSize: 13, fontWeight: 500, color: 'var(--text)',
                      display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                      minHeight: '2.6em', lineHeight: '1.3em',
                    }}>{p.title}</div>
                    <div style={{ display: 'flex', gap: 8, fontSize: 10, color: 'var(--muted)', marginTop: 4 }}>
                      <span>{p.nickname}</span>
                      <span>{p.createdAt?.toDate ? `${p.createdAt.toDate().getMonth()+1}/${p.createdAt.toDate().getDate()}` : ''}</span>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        pageItems.map(p => (
          <Link key={p.id} href={`/board/${p.id}`} style={{ textDecoration: 'none', display: 'block' }}>
            <div className="post-card">
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                {p.prefix && <span style={{ fontSize: 11, background: 'var(--accent)', color: '#fff', padding: '1px 7px', borderRadius: 10 }}>{p.prefix}</span>}
                <div style={{ fontSize: 15, fontWeight: 500, color: 'var(--text)' }}>{p.title}</div>
              </div>
              <div style={{ display: 'flex', gap: 10, fontSize: 11, color: 'var(--muted)' }}>
                <span>{p.nickname}</span>
                <span>{p.createdAt?.toDate ? `${p.createdAt.toDate().getMonth()+1}/${p.createdAt.toDate().getDate()}` : ''}</span>
              </div>
            </div>
          </Link>
        ))
      )}

      {filtered.length > 0 && totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 4, marginTop: 16, flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => setCurrentPage(1)}
            disabled={safePage === 1}
            className="btn-sm btn-outline"
            aria-label="첫 페이지"
            style={{ minWidth: 32 }}
          >«</button>
          <button
            type="button"
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={safePage === 1}
            className="btn-sm btn-outline"
            aria-label="이전 페이지"
            style={{ minWidth: 32 }}
          >‹</button>
          {visiblePages.map(n => (
            <button
              key={n}
              type="button"
              onClick={() => setCurrentPage(n)}
              className="btn-sm"
              aria-current={n === safePage ? 'page' : undefined}
              style={{
                minWidth: 32,
                background: n === safePage ? 'var(--accent)' : 'var(--tag-bg)',
                color: n === safePage ? '#fff' : 'var(--accent)',
                border: '1px solid var(--line)',
                fontWeight: n === safePage ? 600 : 400,
              }}
            >{n}</button>
          ))}
          <button
            type="button"
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={safePage === totalPages}
            className="btn-sm btn-outline"
            aria-label="다음 페이지"
            style={{ minWidth: 32 }}
          >›</button>
          <button
            type="button"
            onClick={() => setCurrentPage(totalPages)}
            disabled={safePage === totalPages}
            className="btn-sm btn-outline"
            aria-label="마지막 페이지"
            style={{ minWidth: 32 }}
          >»</button>
        </div>
      )}
    </div>
  );
}
