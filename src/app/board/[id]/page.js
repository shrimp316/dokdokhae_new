'use client';
import { useEffect, useState, use } from 'react';
import { doc, getDoc, collection, getDocs, query, orderBy, addDoc, deleteDoc, updateDoc, serverTimestamp, where, increment, setDoc } from 'firebase/firestore';
import { db, storage } from '@/lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useAuth } from '@/lib/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';

const QuillEditor = dynamic(() => import('@/components/QuillEditor'), { ssr: false });

export default function BoardPostPage({ params }) {
  const { id } = use(params);
  const { user, profile } = useAuth();
  const router = useRouter();

  const [post, setPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState('');
  const [replyTo, setReplyTo] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editImageFile, setEditImageFile] = useState(null);
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editCommentText, setEditCommentText] = useState('');

  useEffect(() => {
    loadPost();
    loadComments();
    if (user) checkLike();
  }, [id, user]);

  async function loadPost() {
    const snap = await getDoc(doc(db, 'board', id));
    if (!snap.exists()) { router.push('/board'); return; }
    const data = { id: snap.id, ...snap.data() };
    setPost(data);
    setLikeCount(data.likeCount || 0);
    setEditTitle(data.title);
    setEditContent(data.content);
  }

  async function loadComments() {
    const snap = await getDocs(query(collection(db, 'board', id, 'comments'), orderBy('createdAt', 'asc')));
    setComments(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  }

  async function checkLike() {
    if (!user) return;
    const snap = await getDoc(doc(db, 'board', id, 'likes', user.uid));
    setLiked(snap.exists());
  }

  async function toggleLike() {
    if (!user) { router.push('/login'); return; }
    const likeRef = doc(db, 'board', id, 'likes', user.uid);
    const postRef = doc(db, 'board', id);
    if (liked) {
      await deleteDoc(likeRef);
      await updateDoc(postRef, { likeCount: increment(-1) });
      setLiked(false); setLikeCount(c => c - 1);
    } else {
      await setDoc(likeRef, { uid: user.uid, createdAt: serverTimestamp() });
      await updateDoc(postRef, { likeCount: increment(1) });
      setLiked(true); setLikeCount(c => c + 1);
    }
  }

  async function handleDelete() {
    if (!confirm('삭제할까요?')) return;
    await deleteDoc(doc(db, 'board', id));
    router.push('/board');
  }

  async function handleEdit() {
    if (!editTitle.trim() || !editContent) { alert('제목과 내용을 입력해주세요.'); return; }
    let finalContent = editContent;
    if (editImageFile) {
      const r = ref(storage, `board/${Date.now()}_${editImageFile.name}`);
      await uploadBytes(r, editImageFile);
      const url = await getDownloadURL(r);
      finalContent += `<p><img src="${url}" style="max-width:100%;border-radius:8px" /></p>`;
    }
    await updateDoc(doc(db, 'board', id), { title: editTitle, content: finalContent, updatedAt: serverTimestamp() });
    setEditing(false);
    loadPost();
  }

  async function addComment(parentId = null) {
    if (!user) { router.push('/login'); return; }
    const text = parentId ? replyText : commentText;
    if (!text.trim()) return;
    await addDoc(collection(db, 'board', id, 'comments'), {
      content: text.trim(), nickname: profile.nickname, uid: user.uid,
      parentId: parentId || null, createdAt: serverTimestamp(),
    });
    if (parentId) { setReplyText(''); setReplyTo(null); }
    else setCommentText('');
    loadComments();
  }

  async function deleteComment(commentId) {
    if (!confirm('댓글을 삭제할까요?')) return;
    await deleteDoc(doc(db, 'board', id, 'comments', commentId));
    loadComments();
  }

  async function editComment(commentId) {
    if (!editCommentText.trim()) return;
    await updateDoc(doc(db, 'board', id, 'comments', commentId), { content: editCommentText, updatedAt: serverTimestamp() });
    setEditingCommentId(null);
    loadComments();
  }

  const formatDate = (ts) => ts?.toDate ? `${ts.toDate().getMonth()+1}/${ts.toDate().getDate()}` : '';

  if (!post) return <div className="empty-msg">로딩 중…</div>;

  const canEdit = user?.uid === post.uid;
  const topComments = comments.filter(c => !c.parentId);
  const getReplies = (commentId) => comments.filter(c => c.parentId === commentId);

  return (
    <div>
      <Link href="/board" style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--muted)', fontSize: 13, marginBottom: 16, textDecoration: 'none' }}>
        ← 목록으로
      </Link>

      {/* 게시글 */}
      <div className="card" style={{ padding: 20, marginBottom: 16 }}>
        {editing ? (
          <div>
            <input value={editTitle} onChange={e => setEditTitle(e.target.value)} style={{ marginBottom: 10 }} />
            <QuillEditor value={editContent} onChange={setEditContent} placeholder="내용…" minHeight={200} />
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 8, marginBottom: 8 }}>
              <input type="file" accept="image/*" onChange={e => setEditImageFile(e.target.files[0])} style={{ flex: 1, fontSize: 12 }} />
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <button className="btn-sm btn-outline" onClick={() => setEditing(false)}>취소</button>
              <button className="btn-sm" style={{ background: 'var(--accent)', color: '#fff' }} onClick={handleEdit}>수정 완료</button>
            </div>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 8 }}>
              {post.prefix && <span style={{ fontSize: 11, background: 'var(--accent)', color: '#fff', padding: '2px 8px', borderRadius: 10, flexShrink: 0 }}>{post.prefix}</span>}
              <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 19, fontWeight: 700, lineHeight: 1.4 }}>{post.title}</h1>
            </div>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 16, paddingBottom: 14, borderBottom: '1px solid var(--line)' }}>
              {post.nickname} · {formatDate(post.createdAt)}
              {post.updatedAt && <span> (수정됨)</span>}
            </div>
            <div style={{ fontSize: 14, lineHeight: 1.8 }} dangerouslySetInnerHTML={{ __html: post.content }} />

            {/* 좋아요 + 액션 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 20, paddingTop: 14, borderTop: '1px solid var(--line)' }}>
              <button onClick={toggleLike} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', border: `1.5px solid ${liked ? 'var(--accent2)' : 'var(--line)'}`, borderRadius: 20, background: liked ? '#fff8f0' : 'none', color: liked ? 'var(--accent2)' : 'var(--muted)', cursor: 'pointer', fontSize: 13 }}>
                {liked ? '❤️' : '🤍'} {likeCount}
              </button>
              {canEdit && (
                <>
                  <button className="btn-sm btn-outline" onClick={() => setEditing(true)}>수정</button>
                  <button className="btn-sm btn-danger" onClick={handleDelete}>삭제</button>
                </>
              )}
            </div>
          </>
        )}
      </div>

      {/* 댓글 */}
      <div className="card" style={{ padding: 20 }}>
        <h3 style={{ fontSize: 14, fontWeight: 500, color: 'var(--muted)', marginBottom: 14 }}>댓글 {comments.length}개</h3>

        {/* 댓글 작성 */}
        {user ? (
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            <input type="text" placeholder="댓글을 입력해주세요…" value={commentText} onChange={e => setCommentText(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addComment()} style={{ flex: 1 }} />
            <button onClick={() => addComment()} className="btn-sm" style={{ background: 'var(--accent)', color: '#fff', flexShrink: 0 }}>등록</button>
          </div>
        ) : (
          <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 14 }}>
            <Link href="/login" style={{ color: 'var(--accent)' }}>로그인</Link>하면 댓글을 남길 수 있어요.
          </p>
        )}

        {/* 댓글 목록 */}
        {topComments.length === 0 ? (
          <p style={{ fontSize: 13, color: 'var(--muted)', textAlign: 'center', padding: '16px 0' }}>아직 댓글이 없어요.</p>
        ) : (
          topComments.map(c => (
            <div key={c.id}>
              <div className="comment-item">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span style={{ fontSize: 13, fontWeight: 500 }}>{c.nickname}</span>
                  <span style={{ fontSize: 11, color: 'var(--muted)' }}>{formatDate(c.createdAt)}</span>
                  <div style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
                    {user && <button onClick={() => setReplyTo(replyTo === c.id ? null : c.id)} style={{ fontSize: 11, color: 'var(--muted)', background: 'none', border: 'none', cursor: 'pointer' }}>답글</button>}
                    {user?.uid === c.uid && (
                      <>
                        <button onClick={() => { setEditingCommentId(c.id); setEditCommentText(c.content); }} style={{ fontSize: 11, color: 'var(--muted)', background: 'none', border: 'none', cursor: 'pointer' }}>수정</button>
                        <button onClick={() => deleteComment(c.id)} style={{ fontSize: 11, color: 'var(--danger)', background: 'none', border: 'none', cursor: 'pointer' }}>삭제</button>
                      </>
                    )}
                  </div>
                </div>
                {editingCommentId === c.id ? (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input value={editCommentText} onChange={e => setEditCommentText(e.target.value)} style={{ flex: 1, fontSize: 13 }} onKeyDown={e => e.key === 'Enter' && editComment(c.id)} />
                    <button onClick={() => editComment(c.id)} className="btn-sm" style={{ background: 'var(--accent)', color: '#fff' }}>완료</button>
                    <button onClick={() => setEditingCommentId(null)} className="btn-sm btn-outline">취소</button>
                  </div>
                ) : (
                  <p style={{ fontSize: 14, lineHeight: 1.6 }}>{c.content}</p>
                )}

                {/* 답글 입력 */}
                {replyTo === c.id && (
                  <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                    <input type="text" placeholder="답글을 입력해주세요…" value={replyText} onChange={e => setReplyText(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && addComment(c.id)} style={{ flex: 1, fontSize: 13 }} />
                    <button onClick={() => addComment(c.id)} className="btn-sm" style={{ background: 'var(--accent)', color: '#fff' }}>등록</button>
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
                    {user?.uid === r.uid && (
                      <div style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
                        <button onClick={() => { setEditingCommentId(r.id); setEditCommentText(r.content); }} style={{ fontSize: 11, color: 'var(--muted)', background: 'none', border: 'none', cursor: 'pointer' }}>수정</button>
                        <button onClick={() => deleteComment(r.id)} style={{ fontSize: 11, color: 'var(--danger)', background: 'none', border: 'none', cursor: 'pointer' }}>삭제</button>
                      </div>
                    )}
                  </div>
                  {editingCommentId === r.id ? (
                    <div style={{ display: 'flex', gap: 8 }}>
                      <input value={editCommentText} onChange={e => setEditCommentText(e.target.value)} style={{ flex: 1, fontSize: 13 }} onKeyDown={e => e.key === 'Enter' && editComment(r.id)} />
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
