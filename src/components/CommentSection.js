'use client';
import { useState } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { useComments } from '@/lib/usePostInteractions';

export default function CommentSection({ collectionName, postId, isAdmin = false }) {
  const { user, profile } = useAuth();
  const {
    topComments, getReplies, addComment, editComment, deleteComment,
  } = useComments(collectionName, postId);
  const [commentText, setCommentText] = useState('');
  const [replyTarget, setReplyTarget] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [editCommentId, setEditCommentId] = useState(null);
  const [editText, setEditText] = useState('');

  async function handleAddTop() {
    if (!commentText.trim() || !user) return;
    await addComment({
      content: commentText, nickname: profile?.nickname || '익명', uid: user.uid, parentId: null,
    });
    setCommentText('');
  }
  async function handleAddReply(parentId) {
    if (!replyText.trim() || !user) return;
    await addComment({
      content: replyText, nickname: profile?.nickname || '익명', uid: user.uid, parentId,
    });
    setReplyText(''); setReplyTarget(null);
  }
  async function handleSaveEdit(commentId) {
    if (!editText.trim()) return;
    await editComment(commentId, editText.trim());
    setEditCommentId(null); setEditText('');
  }

  const totalCount = topComments.length + topComments.reduce((acc, c) => acc + getReplies(c.id).length, 0);

  return (
    <div style={{ marginTop: 12, borderTop: '1px solid var(--line)', paddingTop: 12 }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent)', marginBottom: 8 }}>
        댓글 ({totalCount})
      </div>
      {topComments.map(c => (
        <CommentItem
          key={c.id}
          comment={c}
          replies={getReplies(c.id)}
          user={user}
          isAdmin={isAdmin}
          replyTarget={replyTarget}
          setReplyTarget={setReplyTarget}
          replyText={replyText}
          setReplyText={setReplyText}
          onAddReply={handleAddReply}
          editCommentId={editCommentId}
          setEditCommentId={setEditCommentId}
          editText={editText}
          setEditText={setEditText}
          onSaveEdit={handleSaveEdit}
          onDelete={deleteComment}
        />
      ))}
      {user ? (
        <div style={{ display: 'flex', gap: 6, marginTop: 8, alignItems: 'flex-start' }}>
          <textarea
            rows={2}
            value={commentText}
            onChange={e => setCommentText(e.target.value)}
            onClick={e => e.stopPropagation()}
            placeholder="댓글을 남겨주세요"
            style={{ minHeight: 44, resize: 'vertical' }}
          />
          <button type="button" className="btn-sm btn-outline" onClick={(e) => { e.stopPropagation(); handleAddTop(); }}>등록</button>
        </div>
      ) : (
        <div style={{ fontSize: 12, color: 'var(--muted)' }}>로그인 후 댓글을 작성할 수 있어요.</div>
      )}
    </div>
  );
}

function CommentItem({
  comment, replies, user, isAdmin,
  replyTarget, setReplyTarget, replyText, setReplyText, onAddReply,
  editCommentId, setEditCommentId, editText, setEditText, onSaveEdit, onDelete,
}) {
  const owner = user && comment.uid === user.uid;
  const canModify = owner || isAdmin;
  const editing = editCommentId === comment.id;

  return (
    <div className="comment-item">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent)' }}>{comment.nickname}</div>
          {editing ? (
            <div style={{ display: 'flex', gap: 6, marginTop: 4, alignItems: 'flex-start' }}>
              <textarea rows={2} value={editText} onChange={e => setEditText(e.target.value)} style={{ minHeight: 44, resize: 'vertical' }} />
              <button type="button" className="btn-sm btn-outline" onClick={(e) => { e.stopPropagation(); onSaveEdit(comment.id); }}>저장</button>
              <button type="button" className="btn-sm" onClick={(e) => { e.stopPropagation(); setEditCommentId(null); }}>취소</button>
            </div>
          ) : (
            <div style={{ fontSize: 13, marginTop: 2, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{comment.content}</div>
          )}
        </div>
        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
          {user && !editing && (
            <button type="button" className="btn-sm btn-ghost" onClick={(e) => { e.stopPropagation(); setReplyTarget(comment.id); setReplyText(''); }}>답글</button>
          )}
          {canModify && !editing && (
            <>
              <button type="button" className="btn-sm btn-ghost" onClick={(e) => { e.stopPropagation(); setEditCommentId(comment.id); setEditText(comment.content); }}>수정</button>
              <button type="button" className="btn-sm btn-ghost" onClick={(e) => { e.stopPropagation(); if (confirm('삭제할까요?')) onDelete(comment.id); }}>삭제</button>
            </>
          )}
        </div>
      </div>

      {replies.map(r => {
        const rEditing = editCommentId === r.id;
        const rOwner = user && r.uid === user.uid;
        const rCanModify = rOwner || isAdmin;
        return (
          <div key={r.id} className="reply-item">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent)' }}>{r.nickname}</div>
                {rEditing ? (
                  <div style={{ display: 'flex', gap: 6, marginTop: 4, alignItems: 'flex-start' }}>
                    <textarea rows={2} value={editText} onChange={e => setEditText(e.target.value)} style={{ minHeight: 44, resize: 'vertical' }} />
                    <button type="button" className="btn-sm btn-outline" onClick={(e) => { e.stopPropagation(); onSaveEdit(r.id); }}>저장</button>
                    <button type="button" className="btn-sm" onClick={(e) => { e.stopPropagation(); setEditCommentId(null); }}>취소</button>
                  </div>
                ) : (
                  <div style={{ fontSize: 13, marginTop: 2, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{r.content}</div>
                )}
              </div>
              <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                {rCanModify && !rEditing && (
                  <>
                    <button type="button" className="btn-sm btn-ghost" onClick={(e) => { e.stopPropagation(); setEditCommentId(r.id); setEditText(r.content); }}>수정</button>
                    <button type="button" className="btn-sm btn-ghost" onClick={(e) => { e.stopPropagation(); if (confirm('삭제할까요?')) onDelete(r.id); }}>삭제</button>
                  </>
                )}
              </div>
            </div>
          </div>
        );
      })}

      {replyTarget === comment.id && user && (
        <div style={{ display: 'flex', gap: 6, marginTop: 8, marginLeft: 16, alignItems: 'flex-start' }}>
          <textarea rows={2} value={replyText} onChange={e => setReplyText(e.target.value)} placeholder="답글을 남겨주세요" onClick={e => e.stopPropagation()} style={{ minHeight: 44, resize: 'vertical' }} />
          <button type="button" className="btn-sm btn-outline" onClick={(e) => { e.stopPropagation(); onAddReply(comment.id); }}>등록</button>
          <button type="button" className="btn-sm" onClick={(e) => { e.stopPropagation(); setReplyTarget(null); }}>취소</button>
        </div>
      )}
    </div>
  );
}
