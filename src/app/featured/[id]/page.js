'use client';
import { useEffect, useState, use } from 'react';
import { doc, getDoc, collection, getDocs, addDoc, deleteDoc, updateDoc, query, orderBy, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';

const QuillEditor = dynamic(() => import('@/components/QuillEditor'), { ssr: false });

export default function FeaturedDetailPage({ params }) {
  const { id } = use(params);
  const router = useRouter();
  const { user, profile } = useAuth();

  const [passage, setPassage] = useState(null);
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState('');
  const [replyTo, setReplyTo] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editCommentText, setEditCommentText] = useState('');

  useEffect(() => {
    getDoc(doc(db, 'featuredPassages', id)).then(snap => {
      if (snap.exists()) setPassage({ id: snap.id, ...snap.data() });
    });
    loadComments();
  }, [id]);

  async function loadComments() {
    const snap = await getDocs(query(collection(db, 'featuredPassages', id, 'comments'), orderBy('createdAt', 'asc')));
    setComments(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  }

  const isEmptyHtml = (html) => !html || html.replace(/<(.|\n)*?>/g, '').trim() === '';

  async function addComment(parentId = null) {
    if (!user) { router.push('/login'); return; }
    const text = parentId ? replyText : commentText;
    if (parentId ? !text.trim() : isEmptyHtml(text)) return;
    await addDoc(collection(db, 'featuredPassages', id, 'comments'), {
      content: parentId ? text.trim() : text,
      nickname: profile.nickname, uid: user.uid,
      parentId: parentId || null,
      isRich: !parentId,
      createdAt: serverTimestamp(),
    });
    if (parentId) { setReplyText(''); setReplyTo(null); }
    else setCommentText('');
    loadComments();
  }

  async function deleteComment(commentId) {
    if (!confirm('댓글을 삭제할까요?')) return;
    await deleteDoc(doc(db, 'featuredPassages', id, 'comments', commentId));
    loadComments();
  }

  async function editComment(commentId) {
    const target = comments.find(c => c.id === commentId);
    const isRich = target?.isRich || !target?.parentId;
    if (isRich ? isEmptyHtml(editCommentText) : !editCommentText.trim()) return;
    await updateDoc(doc(db, 'featuredPassages', id, 'comments', commentId), {
      content: editCommentText,
      updatedAt: serverTimestamp(),
    });
    setEditingCommentId(null);
    loadComments();
  }

  const isAdmin = profile?.role === 'admin';
  const formatDate = (ts) => ts?.toDate ? `${ts.toDate().getMonth()+1}/${ts.toDate().getDate()}` : '';
  const topComments = comments.filter(c => !c.parentId);
  const getReplies = (commentId) => comments.filter(c => c.parentId === commentId);

  if (!passage) return <div className="empty-msg">로딩 중…</div>;

  return (
    <div>
      <button onClick={() => router.push('/featured')}
        style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: 13, marginBottom: 16, padding: 0 }}>
        ← 목록으로
      </button>

      {/* 기간 배지 */}
      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--accent2)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>
        {passage.period === 'weekly' ? '📅 이 주의 글' : '📆 이 달의 글'} · {passage.periodKey}
      </div>

      {/* 발췌문 */}
      <div className="card" style={{ padding: 24, marginBottom: 16 }}>
        <p style={{ fontFamily: 'var(--font-serif)', fontSize: 16, lineHeight: 2, color: 'var(--text)', whiteSpace: 'pre-line', marginBottom: 16 }}>
          "{passage.passage}"
        </p>
        <div style={{ borderTop: '1px solid var(--line)', paddingTop: 12 }}>
          <p style={{ fontSize: 13, fontWeight: 500 }}>{passage.bookTitle}</p>
          {passage.bookAuthor && <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{passage.bookAuthor}</p>}
          {passage.source && <p style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>출처: {passage.source}</p>}
        </div>
      </div>

      {/* 토론 질문 */}
      {passage.questions?.length > 0 && (
        <div className="card" style={{ padding: 20, marginBottom: 16 }}>
          <h2 style={{ fontSize: 14, fontWeight: 600, color: 'var(--accent)', marginBottom: 14 }}>💬 함께 나눠볼 질문</h2>
          <ol style={{ paddingLeft: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 12 }}>
            {passage.questions.map((q, i) => (
              <li key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <span style={{ fontFamily: 'var(--font-serif)', fontSize: 18, color: 'var(--accent)', flexShrink: 0, lineHeight: 1.4 }}>{i + 1}.</span>
                <span style={{ fontSize: 14, lineHeight: 1.7, color: 'var(--text)' }}>{q}</span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* 댓글 */}
      <div className="card" style={{ padding: 20 }}>
        <h3 style={{ fontSize: 14, fontWeight: 500, color: 'var(--muted)', marginBottom: 14 }}>
          댓글 {comments.length}개
        </h3>

        {/* 댓글 작성 */}
        {user ? (
          <div style={{ marginBottom: 16 }}>
            <QuillEditor
              value={commentText}
              onChange={setCommentText}
              placeholder="생각을 남겨주세요…"
              minHeight={120}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
              <button onClick={() => addComment()} className="btn-sm"
                style={{ background: 'var(--accent)', color: '#fff' }}>등록</button>
            </div>
          </div>
        ) : (
          <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 14 }}>
            <Link href="/login" style={{ color: 'var(--accent)' }}>로그인</Link>하면 댓글을 남길 수 있어요.
          </p>
        )}

        {/* 댓글 목록 */}
        {topComments.length === 0 ? (
          <p style={{ fontSize: 13, color: 'var(--muted)', textAlign: 'center', padding: '16px 0' }}>
            첫 번째 댓글을 남겨보세요.
          </p>
        ) : (
          topComments.map(c => (
            <div key={c.id}>
              <div className="comment-item">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span style={{ fontSize: 13, fontWeight: 500 }}>{c.nickname}</span>
                  <span style={{ fontSize: 11, color: 'var(--muted)' }}>{formatDate(c.createdAt)}</span>
                  <div style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
                    {user && (
                      <button onClick={() => setReplyTo(replyTo === c.id ? null : c.id)}
                        style={{ fontSize: 11, color: 'var(--muted)', background: 'none', border: 'none', cursor: 'pointer' }}>답글</button>
                    )}
                    {(user?.uid === c.uid || isAdmin) && (
                      <>
                        <button onClick={() => { setEditingCommentId(c.id); setEditCommentText(c.content); }}
                          style={{ fontSize: 11, color: 'var(--muted)', background: 'none', border: 'none', cursor: 'pointer' }}>수정</button>
                        <button onClick={() => deleteComment(c.id)}
                          style={{ fontSize: 11, color: 'var(--danger)', background: 'none', border: 'none', cursor: 'pointer' }}>삭제</button>
                      </>
                    )}
                  </div>
                </div>

                {editingCommentId === c.id ? (
                  <div>
                    <QuillEditor
                      value={editCommentText}
                      onChange={setEditCommentText}
                      placeholder="내용을 수정해주세요…"
                      minHeight={100}
                    />
                    <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
                      <button onClick={() => editComment(c.id)} className="btn-sm" style={{ background: 'var(--accent)', color: '#fff' }}>완료</button>
                      <button onClick={() => setEditingCommentId(null)} className="btn-sm btn-outline">취소</button>
                    </div>
                  </div>
                ) : (
                  <div
                    className="ql-editor ql-snow"
                    style={{ fontSize: 14, lineHeight: 1.7, padding: 0, border: 'none' }}
                    dangerouslySetInnerHTML={{ __html: c.content }}
                  />
                )}

                {/* 답글 입력 */}
                {replyTo === c.id && (
                  <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                    <input type="text" placeholder="답글을 입력해주세요…" value={replyText}
                      onChange={e => setReplyText(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && addComment(c.id)}
                      style={{ flex: 1, fontSize: 13 }} />
                    <button onClick={() => addComment(c.id)} className="btn-sm"
                      style={{ background: 'var(--accent)', color: '#fff' }}>등록</button>
                  </div>
                )}
              </div>

              {/* 대댓글 */}
              {getReplies(c.id).map(r => (
                <div key={r.id} className="reply-item">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: 11, color: 'var(--muted)' }}>↩</span>
                    <span style={{ fontSize: 13, fontWeight: 500 }}>{r.nickname}</span>
                    <span style={{ fontSize: 11, color: 'var(--muted)' }}>{formatDate(r.createdAt)}</span>
                    {(user?.uid === r.uid || isAdmin) && (
                      <div style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
                        <button onClick={() => { setEditingCommentId(r.id); setEditCommentText(r.content); }}
                          style={{ fontSize: 11, color: 'var(--muted)', background: 'none', border: 'none', cursor: 'pointer' }}>수정</button>
                        <button onClick={() => deleteComment(r.id)}
                          style={{ fontSize: 11, color: 'var(--danger)', background: 'none', border: 'none', cursor: 'pointer' }}>삭제</button>
                      </div>
                    )}
                  </div>
                  {editingCommentId === r.id ? (
                    <div style={{ display: 'flex', gap: 8 }}>
                      <input value={editCommentText} onChange={e => setEditCommentText(e.target.value)}
                        style={{ flex: 1, fontSize: 13 }} onKeyDown={e => e.key === 'Enter' && editComment(r.id)} />
                      <button onClick={() => editComment(r.id)} className="btn-sm" style={{ background: 'var(--accent)', color: '#fff' }}>완료</button>
                      <button onClick={() => setEditingCommentId(null)} className="btn-sm btn-outline">취소</button>
                    </div>
                  ) : (
                    <p style={{ fontSize: 13, lineHeight: 1.6 }}>{r.content}</p>
                  )}
                </div>
              ))}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
