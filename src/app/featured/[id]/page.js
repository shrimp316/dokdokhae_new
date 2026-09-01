'use client';
import { useEffect, useState, use } from 'react';
import { doc, getDoc, collection, getDocs, addDoc, deleteDoc, updateDoc, query, orderBy, serverTimestamp } from 'firebase/firestore';
import { signInAnonymously } from 'firebase/auth';
import { db, auth } from '@/lib/firebase';
import { useAuth } from '@/lib/AuthContext';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';

import { dangerousHtml, sanitizeHtmlForStorage } from '@/lib/sanitize';
import { authenticatedFetch } from '@/lib/authenticatedFetch';
import ContentLightbox from '@/components/ContentLightbox';
import ExpandableContent from '@/components/ExpandableContent';
import { ArrowLeft, Calendar, CalendarDays, ScrollText, PenLine, Bot, MessageCircle, CornerDownRight } from 'lucide-react';

const QuillEditor = dynamic(() => import('@/components/QuillEditor'), { ssr: false });

const NICKNAME_KEY = 'featuredAnonNickname';
const NICKNAME_MIN = 2;
const NICKNAME_MAX = 20;

export default function FeaturedDetailPage({ params }) {
  const { id } = use(params);
  const router = useRouter();
  const { user, profile, anonymousUser } = useAuth();

  const [passage, setPassage] = useState(null);
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState('');
  const [replyTo, setReplyTo] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editCommentText, setEditCommentText] = useState('');
  const [anonNicknameInput, setAnonNicknameInput] = useState('');

  const isMember = !!(user && profile);
  const canComment = isMember || !!anonymousUser;

  useEffect(() => {
    getDoc(doc(db, 'featuredPassages', id)).then(snap => {
      if (snap.exists()) setPassage({ id: snap.id, ...snap.data() });
    });
    loadComments();
  }, [id]);

  useEffect(() => {
    if (user || anonymousUser) return;
    if (typeof window === 'undefined') return;
    const saved = sessionStorage.getItem(NICKNAME_KEY) || '';
    setAnonNicknameInput(saved);
  }, [user, anonymousUser]);

  useEffect(() => {
    if (user || anonymousUser) return;
    signInAnonymously(auth).catch(() => {});
  }, [user, anonymousUser]);

  async function loadComments() {
    const snap = await getDocs(query(collection(db, 'featuredPassages', id, 'comments'), orderBy('createdAt', 'asc')));
    setComments(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  }

  const isEmptyHtml = (html) => !html || html.replace(/<(.|\n)*?>/g, '').trim() === '';

  async function addComment(parentId = null) {
    if (!canComment) return;
    const text = parentId ? replyText : commentText;
    if (parentId ? !text.trim() : isEmptyHtml(text)) return;
    let nickname;
    if (isMember) {
      nickname = profile.nickname;
    } else {
      nickname = anonNicknameInput.trim();
      if (!nickname || nickname.length < NICKNAME_MIN || nickname.length > NICKNAME_MAX) {
        alert(`닉네임을 ${NICKNAME_MIN}~${NICKNAME_MAX}자로 입력해주세요.`);
        return;
      }
    }
    const commentUid = isMember ? user.uid : anonymousUser.uid;
    const sanitized = parentId
      ? { html: text.trim(), removedUnsafeContent: false }
      : sanitizeHtmlForStorage(text);
    if (sanitized.removedUnsafeContent) {
      alert('안전하지 않거나 지원되지 않는 HTML을 제거한 뒤 저장합니다.');
    }
    const commentRef = await addDoc(collection(db, 'featuredPassages', id, 'comments'), {
      content: sanitized.html,
      nickname,
      uid: commentUid,
      parentId: parentId || null,
      isRich: !parentId,
      ...(isMember ? {} : { isAnonymous: true }),
      createdAt: serverTimestamp(),
    });
    authenticatedFetch('/api/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'comment', collectionName: 'featuredPassages', postId: id, commentId: commentRef.id }),
    }).catch(() => {});
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
    const sanitized = isRich
      ? sanitizeHtmlForStorage(editCommentText)
      : { html: editCommentText.trim(), removedUnsafeContent: false };
    if (sanitized.removedUnsafeContent) {
      alert('안전하지 않거나 지원되지 않는 HTML을 제거한 뒤 저장합니다.');
    }
    await updateDoc(doc(db, 'featuredPassages', id, 'comments', commentId), {
      content: sanitized.html,
      updatedAt: serverTimestamp(),
    });
    setEditingCommentId(null);
    loadComments();
  }

  const isAdmin = profile?.role === 'admin';
  const effectiveUid = user?.uid || anonymousUser?.uid || null;
  const formatDate = (ts) => ts?.toDate ? `${ts.toDate().getMonth()+1}/${ts.toDate().getDate()}` : '';

  function saveAnonNickname(name) {
    const trimmed = name.trim();
    if (trimmed.length >= NICKNAME_MIN && trimmed.length <= NICKNAME_MAX) {
      try { sessionStorage.setItem(NICKNAME_KEY, trimmed); } catch {}
    } else {
      try { sessionStorage.removeItem(NICKNAME_KEY); } catch {}
    }
  }

  async function handleShare() {
    const url = window.location.href;
    if (navigator.share) {
      await navigator.share({ title: passage.bookTitle, url });
    } else {
      await navigator.clipboard.writeText(url);
      alert('링크가 복사됐어요!');
    }
  }
  const topComments = comments.filter(c => !c.parentId);
  const getReplies = (commentId) => comments.filter(c => c.parentId === commentId);

  if (!passage) return <div className="empty-msg">로딩 중…</div>;

  return (
    <div>
      <button onClick={() => router.push('/featured')}
        style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: 13, marginBottom: 16, padding: 0 }}>
        <ArrowLeft size={14} /> 목록으로
      </button>

      {/* 기간 배지 */}
      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--accent2)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
        {passage.period === 'weekly' ? <><Calendar size={11} /> 이 주의 글</> : <><CalendarDays size={11} /> 이 달의 글</>} · {passage.periodKey}
      </div>

      {/* 발췌문 / 큐레이터 소개 */}
      <div className="card" style={{ padding: 24, marginBottom: 16 }}>
        {passage.kind === 'public_domain' && passage.excerpt ? (
          <>
            <p style={{ fontFamily: 'var(--font-serif)', fontSize: 16, lineHeight: 2, color: 'var(--text)', whiteSpace: 'pre-line', marginBottom: 16 }}>
              "{passage.excerpt}"
            </p>
            {passage.curatorNote && (
              <p style={{ fontSize: 14, lineHeight: 1.8, color: 'var(--muted)', whiteSpace: 'pre-line', marginBottom: 16, paddingLeft: 12, borderLeft: '2px solid var(--line)' }}>
                {passage.curatorNote}
              </p>
            )}
            <div style={{ borderTop: '1px solid var(--line)', paddingTop: 12 }}>
              <span style={{ fontSize: 10, background: 'var(--tag-bg)', color: 'var(--accent)', borderRadius: 10, padding: '2px 8px', display: 'inline-flex', alignItems: 'center', gap: 3 }}><ScrollText size={10} /> 자유 이용</span>
              <p style={{ fontSize: 13, fontWeight: 500, marginTop: 8 }}>{passage.bookTitle}</p>
              {passage.bookAuthor && <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{passage.bookAuthor}</p>}
              {passage.sourceUrl && (
                <p style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4, wordBreak: 'break-all' }}>
                  출처: <a href={passage.sourceUrl} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)' }}>{passage.sourceUrl}</a>
                </p>
              )}
              {passage.source && <p style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{passage.source}</p>}
              <p style={{ fontSize: 11, color: 'var(--muted)', marginTop: 6, fontStyle: 'italic' }}>공표 후 보호기간 만료 저작물 — 자유롭게 이용 가능</p>
            </div>
          </>
        ) : passage.kind === 'curator_intro' ? (
          <>
            {passage.curatorNote && (
              <p style={{ fontFamily: 'var(--font-serif)', fontSize: 15, lineHeight: 1.9, color: 'var(--text)', whiteSpace: 'pre-line', marginBottom: 16 }}>
                {passage.curatorNote}
              </p>
            )}
            {passage.excerpt && (
              <div style={{ background: 'var(--tag-bg)', borderLeft: '3px solid var(--accent2)', padding: '10px 14px', borderRadius: 6, marginBottom: 16 }}>
                <p style={{ fontFamily: 'var(--font-serif)', fontSize: 14, lineHeight: 1.8, color: 'var(--text)', whiteSpace: 'pre-line' }}>
                  "{passage.excerpt}"
                </p>
                {passage.source && <p style={{ fontSize: 11, color: 'var(--muted)', marginTop: 6 }}>— {passage.source}</p>}
              </div>
            )}
            <div style={{ borderTop: '1px solid var(--line)', paddingTop: 12 }}>
              <span style={{ fontSize: 10, background: 'var(--tag-bg)', color: 'var(--muted)', borderRadius: 10, padding: '2px 8px', display: 'inline-flex', alignItems: 'center', gap: 3 }}><PenLine size={10} /> 큐레이터 소개</span>
              {passage.aiGenerated?.curatorNote && <span style={{ fontSize: 10, color: 'var(--muted)', marginLeft: 6, display: 'inline-flex', alignItems: 'center', gap: 3 }}><Bot size={10} /> AI 큐레이션</span>}
              <p style={{ fontSize: 13, fontWeight: 500, marginTop: 8 }}>{passage.bookTitle}</p>
              {passage.bookAuthor && <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{passage.bookAuthor}</p>}
              <p style={{ fontSize: 11, color: 'var(--muted)', marginTop: 6, fontStyle: 'italic' }}>이 글은 책에 대한 큐레이터의 소개이며, 책의 원문 발췌가 아닙니다.</p>
            </div>
          </>
        ) : (
          <>
            <p style={{ fontFamily: 'var(--font-serif)', fontSize: 16, lineHeight: 2, color: 'var(--text)', whiteSpace: 'pre-line', marginBottom: 16 }}>
              "{passage.passage}"
            </p>
            <div style={{ borderTop: '1px solid var(--line)', paddingTop: 12 }}>
              <p style={{ fontSize: 13, fontWeight: 500 }}>{passage.bookTitle}</p>
              {passage.bookAuthor && <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{passage.bookAuthor}</p>}
              {passage.source && <p style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>출처: {passage.source}</p>}
            </div>
          </>
        )}

        {/* 공유 버튼 */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16, paddingTop: 14, borderTop: '1px solid var(--line)' }}>
          <button onClick={handleShare} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', border: '1.5px solid var(--line)', borderRadius: 20, background: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: 13 }}>
            공유
          </button>
        </div>
      </div>

      {/* 토론 질문 */}
      {passage.questions?.length > 0 && (
        <div className="card" style={{ padding: 20, marginBottom: 16 }}>
          <h2 style={{ fontSize: 14, fontWeight: 600, color: 'var(--accent)', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6 }}><MessageCircle size={14} /> 함께 나눠볼 질문</h2>
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
        {canComment ? (
          <div style={{ marginBottom: 16 }}>
            {!isMember && (
              <div style={{ marginBottom: 8 }}>
                <input
                  type="text"
                  placeholder={`닉네임 (${NICKNAME_MIN}~${NICKNAME_MAX}자) *`}
                  value={anonNicknameInput}
                  maxLength={NICKNAME_MAX}
                  onChange={e => {
                    setAnonNicknameInput(e.target.value);
                    saveAnonNickname(e.target.value);
                  }}
                  style={{ fontSize: 13 }}
                />
              </div>
            )}
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
            댓글을 준비하는 중이에요…
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
                  {c.isAnonymous && (
                    <span style={{ fontSize: 10, background: 'var(--tag-bg)', color: 'var(--muted)', borderRadius: 10, padding: '1px 7px' }}>비회원</span>
                  )}
                  <span style={{ fontSize: 11, color: 'var(--muted)' }}>{formatDate(c.createdAt)}</span>
                  <div style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
                    {canComment && (
                      <button onClick={() => setReplyTo(replyTo === c.id ? null : c.id)}
                        style={{ fontSize: 11, color: 'var(--muted)', background: 'none', border: 'none', cursor: 'pointer' }}>답글</button>
                    )}
                    {(effectiveUid === c.uid || isAdmin) && (
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
                  <ContentLightbox
                    contentClassName="ql-editor ql-snow"
                    contentStyle={{ fontSize: 14, lineHeight: 1.7, padding: 0, border: 'none' }}
                  >
                    <ExpandableContent html={dangerousHtml(c.content)} />
                  </ContentLightbox>
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
                    <CornerDownRight size={11} style={{ color: 'var(--muted)' }} />
                    <span style={{ fontSize: 13, fontWeight: 500 }}>{r.nickname}</span>
                    {r.isAnonymous && (
                      <span style={{ fontSize: 10, background: 'var(--tag-bg)', color: 'var(--muted)', borderRadius: 10, padding: '1px 7px' }}>비회원</span>
                    )}
                    <span style={{ fontSize: 11, color: 'var(--muted)' }}>{formatDate(r.createdAt)}</span>
                    {(effectiveUid === r.uid || isAdmin) && (
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
                    <ExpandableContent
                      text={r.content}
                      style={{ fontSize: 13, lineHeight: 1.6 }}
                    />
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
