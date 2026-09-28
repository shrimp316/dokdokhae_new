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
import { sanitizeHtmlForStorage } from '@/lib/sanitize.client';
import { authenticatedJsonFetch } from '@/lib/authenticatedFetch';
import dynamic from 'next/dynamic';
import { X, Pencil, Save } from 'lucide-react';
import styles from './board.module.css';

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

  // 글 수가 적어 전체를 받아 브라우저에서 검색·페이징한다. 글이 많아지면 저장할 때 검색용 평문과
  // 썸네일을 필드로 남기고, 목록은 필요한 필드만 커서 페이징으로 읽는 방식으로 옮긴다.
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

  // 임시저장은 서버 API를 거치지 않고 본인 문서에 바로 쓰므로, 나중에 에디터로 다시 불러올 내용을 여기서 sanitize한다.
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

      <div className={styles.searchFilterWrap}>
        {prefixes.length > 0 && (
          <div className={styles.prefixFilterBar}>
            <select
              value={filterPrefix}
              onChange={e => setFilterPrefix(e.target.value)}
              className={styles.prefixSelect}
              data-active={!!filterPrefix || undefined}
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

      {user ? (
        <button onClick={() => setShowForm(!showForm)} className={`btn-primary ${styles.writeBtn}`}>
          {showForm ? <><X size={14} /> 닫기</> : <><Pencil size={14} /> 글쓰기</>}
        </button>
      ) : (
        <div className={`card ${styles.loginPrompt}`}>
          <p className={styles.loginPromptText}>로그인하면 글을 작성할 수 있어요.</p>
          <button onClick={() => router.push('/login')} className={`btn-primary ${styles.loginPromptBtn}`}>로그인 / 가입</button>
        </div>
      )}

      {showForm && (
        <div className={`card ${styles.formCard}`}>
          {draft && (
            <button onClick={loadDraft} className={styles.draftBtn}>
              <Save size={12} /> 임시저장된 내용 불러오기
            </button>
          )}
          {prefixes.length > 0 && (
            <select value={prefix} onChange={e => setPrefix(e.target.value)} className={styles.fieldGap}>
              <option value="">글머리 선택 (선택사항)</option>
              {prefixes.map(p => <option key={p.id} value={p.label}>{p.label}</option>)}
            </select>
          )}
          <input type="text" placeholder="제목" value={title} onChange={e => setTitle(e.target.value)} className={styles.fieldGap} />
          <div className={styles.fieldGap}>
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
          <div className={styles.formActions}>
            <button onClick={saveDraft} className={`btn-sm btn-outline ${styles.draftSubmitBtn}`}>임시저장</button>
            <button onClick={handleSubmit} disabled={submitting} className={`btn-sm ${styles.postSubmitBtn}`}>
              {submitting ? '게시 중…' : '게시하기'}
            </button>
          </div>
        </div>
      )}

      <div role="radiogroup" aria-label="보기 모드" className={styles.viewModeBar}>
        {VIEW_MODES.map(m => (
          <button
            key={m.value}
            type="button"
            role="radio"
            aria-checked={viewMode === m.value}
            onClick={() => setViewMode(m.value)}
            className={`btn-sm ${styles.viewModeBtn}`}
            data-active={viewMode === m.value || undefined}
          >{m.label}</button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="empty-msg">게시글이 없어요.</p>
      ) : viewMode === 'board' ? (
        <div>
          <div className={styles.boardHeaderRow}>
            <span className={styles.colNum}>번호</span>
            <span className={styles.colTitle}>제목</span>
            <span className={styles.colAuthor}>글쓴이</span>
            <span className={styles.colDate}>날짜</span>
          </div>
          {pageItems.map((p, i) => (
            <Link key={p.id} href={`/board/${p.id}`} className={styles.rowLink}>
              <div className="post-row">
                <span className={styles.rowNum}>{filtered.length - (pageStart + i)}</span>
                <span className={styles.rowTitleWrap}>
                  {p.prefix && <span className={styles.prefixTag}>{p.prefix}</span>}
                  <span className={styles.rowTitleText}>{p.title}</span>
                </span>
                <span className={styles.rowAuthor}>{p.nickname}</span>
                <span className={styles.rowDate}>{p.createdAt?.toDate ? `${p.createdAt.toDate().getMonth()+1}/${p.createdAt.toDate().getDate()}` : ''}</span>
              </div>
            </Link>
          ))}
        </div>
      ) : viewMode === 'photo' ? (
        <div className="post-grid">
          {pageItems.map(p => {
            const thumb = extractFirstImage(p.content);
            return (
              <Link key={p.id} href={`/board/${p.id}`} className={styles.rowLink}>
                <div className="post-grid-card">
                  {thumb ? (
                    <img src={thumb} alt="" className="post-grid-thumb" />
                  ) : (
                    <div className="post-grid-thumb-empty">No Image</div>
                  )}
                  <div className={styles.photoCardBody}>
                    <div className={styles.photoCardTitle}>{p.title}</div>
                    <div className={styles.photoCardMeta}>
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
          <Link key={p.id} href={`/board/${p.id}`} className={styles.rowLink}>
            <div className="post-card">
              <div className={styles.textCardHead}>
                {p.prefix && <span className={styles.prefixTag}>{p.prefix}</span>}
                <div className={styles.textCardTitle}>{p.title}</div>
              </div>
              <div className={styles.textCardMeta}>
                <span>{p.nickname}</span>
                <span>{p.createdAt?.toDate ? `${p.createdAt.toDate().getMonth()+1}/${p.createdAt.toDate().getDate()}` : ''}</span>
              </div>
            </div>
          </Link>
        ))
      )}

      {filtered.length > 0 && totalPages > 1 && (
        <div className={styles.paginationBar}>
          <button
            type="button"
            onClick={() => setCurrentPage(1)}
            disabled={safePage === 1}
            className={`btn-sm btn-outline ${styles.pageBtn}`}
            aria-label="첫 페이지"
          >«</button>
          <button
            type="button"
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={safePage === 1}
            className={`btn-sm btn-outline ${styles.pageBtn}`}
            aria-label="이전 페이지"
          >‹</button>
          {visiblePages.map(n => (
            <button
              key={n}
              type="button"
              onClick={() => setCurrentPage(n)}
              className={`btn-sm ${styles.pageNumBtn}`}
              aria-current={n === safePage ? 'page' : undefined}
              data-active={n === safePage || undefined}
            >{n}</button>
          ))}
          <button
            type="button"
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={safePage === totalPages}
            className={`btn-sm btn-outline ${styles.pageBtn}`}
            aria-label="다음 페이지"
          >›</button>
          <button
            type="button"
            onClick={() => setCurrentPage(totalPages)}
            disabled={safePage === totalPages}
            className={`btn-sm btn-outline ${styles.pageBtn}`}
            aria-label="마지막 페이지"
          >»</button>
        </div>
      )}
    </div>
  );
}
