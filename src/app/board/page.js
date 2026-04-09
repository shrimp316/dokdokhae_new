'use client';
import { useEffect, useState } from 'react';
import { collection, getDocs, query, orderBy, addDoc, serverTimestamp, doc, getDoc } from 'firebase/firestore';
import { db, storage } from '@/lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useAuth } from '@/lib/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import NoticeBanner from '@/components/NoticeBanner';
import dynamic from 'next/dynamic';

const QuillEditor = dynamic(() => import('@/components/QuillEditor'), { ssr: false });

export default function BoardPage() {
  const { user, profile } = useAuth();
  const router = useRouter();
  const [posts, setPosts] = useState([]);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [prefix, setPrefix] = useState('');
  const [content, setContent] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [prefixes, setPrefixes] = useState([]);
  const [draft, setDraft] = useState('');

  useEffect(() => {
    loadPosts();
    loadPrefixes();
    const saved = localStorage.getItem('draft-board');
    if (saved) { try { const d = JSON.parse(saved); setDraft(d); } catch {} }
  }, []);

  async function loadPosts() {
    const snap = await getDocs(query(collection(db, 'board'), orderBy('createdAt', 'desc')));
    setPosts(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  }

  async function loadPrefixes() {
    try {
      const snap = await getDocs(collection(db, 'boardPrefixes'));
      setPrefixes(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch {}
  }

  const filtered = posts.filter(p =>
    !search || (p.title || '').toLowerCase().includes(search.toLowerCase()) ||
    (p.nickname || '').toLowerCase().includes(search.toLowerCase())
  );

  async function handleSubmit() {
    if (!user) { router.push('/login'); return; }
    if (!title.trim()) { alert('제목을 입력해주세요.'); return; }
    if (!content || content === '<p><br></p>') { alert('내용을 입력해주세요.'); return; }
    setSubmitting(true);
    try {
      let finalContent = content;
      if (imageFile) {
        const r = ref(storage, `board/${Date.now()}_${imageFile.name}`);
        await uploadBytes(r, imageFile);
        const url = await getDownloadURL(r);
        finalContent += `<p><img src="${url}" style="max-width:100%;border-radius:8px" /></p>`;
      }
      await addDoc(collection(db, 'board'), {
        title: title.trim(), prefix, content: finalContent,
        nickname: profile.nickname, uid: user.uid,
        createdAt: serverTimestamp(),
      });
      setTitle(''); setPrefix(''); setContent(''); setImageFile(null);
      setShowForm(false);
      localStorage.removeItem('draft-board');
      loadPosts();
    } catch (e) { alert('저장 실패: ' + e.message); }
    setSubmitting(false);
  }

  function saveDraft() {
    localStorage.setItem('draft-board', JSON.stringify({ title, prefix, content }));
    alert('임시저장 완료!');
  }

  function loadDraft() {
    if (draft) { setTitle(draft.title || ''); setPrefix(draft.prefix || ''); setContent(draft.content || ''); }
  }

  return (
    <div>
      <NoticeBanner />
      <div className="section-title">자유게시판</div>

      {/* 검색 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--card)', border: '1.5px solid var(--line)', borderRadius: 24, padding: '8px 14px', marginBottom: 14 }}>
        <span style={{ color: 'var(--muted)' }}>🔍</span>
        <input type="text" placeholder="제목, 닉네임으로 검색…" value={search} onChange={e => setSearch(e.target.value)}
          style={{ border: 'none', background: 'none', outline: 'none', fontSize: 14, width: '100%' }} />
      </div>

      {/* 글쓰기 버튼 */}
      {user ? (
        <button onClick={() => setShowForm(!showForm)} className="btn-primary" style={{ marginBottom: 14 }}>
          {showForm ? '✕ 닫기' : '✏️ 글쓰기'}
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
            <button onClick={loadDraft} style={{ fontSize: 12, color: 'var(--accent2)', background: 'none', border: 'none', cursor: 'pointer', marginBottom: 8, display: 'block' }}>
              💾 임시저장된 내용 불러오기
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
            <QuillEditor value={content} onChange={setContent} placeholder="내용을 입력해주세요…" minHeight={160} />
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 10 }}>
            <input type="file" accept="image/*" onChange={e => setImageFile(e.target.files[0])} style={{ flex: 1, fontSize: 12 }} />
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={saveDraft} className="btn-sm btn-outline" style={{ flex: 1 }}>임시저장</button>
            <button onClick={handleSubmit} disabled={submitting} className="btn-sm" style={{ flex: 2, background: 'var(--accent)', color: '#fff' }}>
              {submitting ? '게시 중…' : '게시하기'}
            </button>
          </div>
        </div>
      )}

      {/* 게시글 목록 */}
      {filtered.length === 0 ? (
        <p className="empty-msg">게시글이 없어요.</p>
      ) : (
        filtered.map(p => (
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
    </div>
  );
}
