'use client';
import { useState } from 'react';
import dynamic from 'next/dynamic';
import { collection, getDocs, limit, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { formatMonthDay } from '@/lib/format';
import { useAuth } from '@/lib/AuthContext';
import { useComments } from '@/lib/usePostInteractions';
import { dangerousHtml } from '@/lib/sanitize.client';
import { NICKNAME_TAKEN_MESSAGE } from '@/lib/nicknames';
import {
  ANON_NICKNAME_MAX, ANON_NICKNAME_MIN, COMMENT_MAX_LENGTH, isRichComment,
} from '@/lib/commentPolicy';
import ContentLightbox from '@/components/ContentLightbox';
import ExpandableContent from '@/components/ExpandableContent';
import styles from './CommentSection.module.css';

const QuillEditor = dynamic(() => import('@/components/QuillEditor'), { ssr: false });

// 같은 탭에서는 닉네임을 다시 입력하지 않게 하되, 공용 기기에 남지 않도록 탭을 닫으면 잊는다.
const ANON_NICKNAME_KEY = 'featuredAnonNickname';
const SANITIZED_MESSAGE = '안전하지 않거나 지원되지 않는 HTML을 제거한 뒤 저장했습니다.';

function isBlank(text, rich) {
  if (!text) return true;
  return rich ? text.replace(/<(.|\n)*?>/g, '').trim() === '' : !text.trim();
}

// 글자 수가 넘으면 안내하고 false를 반환한다. (입력한 내용은 지우지 않는다.)
function checkCommentLength(text) {
  const length = text.trim().length;
  if (length <= COMMENT_MAX_LENGTH) return true;
  alert(`댓글이 너무 깁니다. 최대 ${COMMENT_MAX_LENGTH.toLocaleString('ko-KR')}자까지 입력할 수 있어요. (현재 ${length.toLocaleString('ko-KR')}자)`);
  return false;
}

// 비회원 닉네임 확인. 회원 닉네임과 겹치면 익명 계정을 만들기 전에 막는다.
// (서버 API도 같은 검사를 다시 한다.)
async function checkAnonNickname(nickname) {
  if (nickname.length < ANON_NICKNAME_MIN || nickname.length > ANON_NICKNAME_MAX) {
    alert(`닉네임을 ${ANON_NICKNAME_MIN}~${ANON_NICKNAME_MAX}자로 입력해주세요.`);
    return false;
  }
  try {
    const taken = await getDocs(query(collection(db, 'users'), where('nickname', '==', nickname), limit(1)));
    if (!taken.empty) {
      alert(NICKNAME_TAKEN_MESSAGE);
      return false;
    }
  } catch (error) {
    // 미리 확인하지 못해도 서버가 다시 검사하므로 작성은 막지 않는다.
    console.error('nickname check failed', error);
  }
  return true;
}

function readSavedNickname() {
  if (typeof window === 'undefined') return '';
  try { return sessionStorage.getItem(ANON_NICKNAME_KEY) || ''; } catch { return ''; }
}

function saveAnonNickname(name) {
  const trimmed = name.trim();
  try {
    if (trimmed.length >= ANON_NICKNAME_MIN && trimmed.length <= ANON_NICKNAME_MAX) {
      sessionStorage.setItem(ANON_NICKNAME_KEY, trimmed);
    } else {
      sessionStorage.removeItem(ANON_NICKNAME_KEY);
    }
  } catch {}
}

// 버튼 클릭이 바깥 카드(예: 감상평 카드 펼치기)로 전파되지 않게 한다.
const stop = (fn) => (e) => { e.stopPropagation(); fn(); };

// 컬렉션별 댓글 방식(작성 경로, 리치 HTML, 비회원 허용)은 lib/commentPolicy.js의 commentMode가 정한다.
export default function CommentSection({ collectionName, postId, isAdmin = false }) {
  const { user, profile, anonymousUser, loading: authLoading } = useAuth();
  const {
    mode, topComments, getReplies, addComment, editComment, deleteComment,
  } = useComments(collectionName, postId);
  const [commentText, setCommentText] = useState('');
  // 닉네임 입력창은 로그인 상태가 확정된 뒤(클라이언트)에만 그려지므로 초기값에서 바로 읽어도 된다.
  const [anonNickname, setAnonNickname] = useState(readSavedNickname);
  const [replyTarget, setReplyTarget] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [editCommentId, setEditCommentId] = useState(null);
  const [editText, setEditText] = useState('');

  const isMember = !!(user && profile);
  const showNicknameInput = mode.allowAnonymous && !isMember;
  // 비회원 작성을 허용하는 곳은 로그인 상태가 확정된 뒤에만 입력창을 연다.
  // (회원이 비회원 입력창을 보거나 익명 계정을 만드는 일이 없게 한다.)
  const canWrite = mode.allowAnonymous ? !authLoading : !!user;
  const currentUid = user?.uid || anonymousUser?.uid || null;

  function handleNicknameChange(value) {
    setAnonNickname(value);
    saveAnonNickname(value);
  }

  async function resolveNickname() {
    if (!showNicknameInput) return profile?.nickname || '익명';
    const nickname = anonNickname.trim();
    return (await checkAnonNickname(nickname)) ? nickname : null;
  }

  // 실패하면 입력한 내용을 남겨 두도록, 성공했을 때만 true를 돌려준다.
  async function submit(text, parentId) {
    const rich = mode.rich && !parentId;
    if (!canWrite || isBlank(text, rich)) return false;
    if (!checkCommentLength(text)) return false;
    const nickname = await resolveNickname();
    if (!nickname) return false;
    try {
      const { contentWasSanitized } = await addComment({
        content: text, nickname, uid: currentUid, parentId,
      });
      if (contentWasSanitized) alert(SANITIZED_MESSAGE);
      return true;
    } catch (error) {
      alert(`저장 실패: ${error.message}`);
      return false;
    }
  }

  async function handleAddTop() {
    if (await submit(commentText, null)) setCommentText('');
  }

  async function handleAddReply(parentId) {
    if (await submit(replyText, parentId)) {
      setReplyText(''); setReplyTarget(null);
    }
  }

  async function handleSaveEdit(comment) {
    const rich = isRichComment(mode, comment);
    if (isBlank(editText, rich)) return;
    if (!checkCommentLength(editText)) return;
    try {
      const { contentWasSanitized } = await editComment(comment.id, rich ? editText : editText.trim());
      if (contentWasSanitized) alert(SANITIZED_MESSAGE);
      setEditCommentId(null); setEditText('');
    } catch (error) {
      alert(`저장 실패: ${error.message}`);
    }
  }

  async function handleDelete(commentId) {
    if (!confirm('삭제할까요?')) return;
    try {
      await deleteComment(commentId);
    } catch (error) {
      alert(`삭제 실패: ${error.message}`);
    }
  }

  const ctx = {
    mode,
    canWrite,
    canModify: (c) => (!!currentUid && c.uid === currentUid) || isAdmin,
    editCommentId,
    editText,
    setEditText,
    onStartEdit: (c) => { setEditCommentId(c.id); setEditText(c.content); },
    onCancelEdit: () => setEditCommentId(null),
    onSaveEdit: handleSaveEdit,
    onStartReply: (c) => { setReplyTarget(c.id); setReplyText(''); },
    onDelete: handleDelete,
  };

  const totalCount = topComments.length + topComments.reduce((acc, c) => acc + getReplies(c.id).length, 0);

  return (
    <div className={styles.wrapper}>
      <div className={styles.heading}>
        댓글 ({totalCount})
      </div>

      {topComments.map(c => (
        <div key={c.id} className="comment-item">
          <CommentRow comment={c} ctx={ctx} />
          {getReplies(c.id).map(r => (
            <div key={r.id} className="reply-item">
              <CommentRow comment={r} ctx={ctx} />
            </div>
          ))}
          {replyTarget === c.id && canWrite && (
            <div className={styles.replyRow}>
              <textarea rows={2} value={replyText} onChange={e => setReplyText(e.target.value)} placeholder="답글을 남겨주세요" onClick={e => e.stopPropagation()} className={styles.textarea} />
              <button type="button" className="btn-sm btn-outline" onClick={stop(() => handleAddReply(c.id))}>등록</button>
              <button type="button" className="btn-sm" onClick={stop(() => setReplyTarget(null))}>취소</button>
            </div>
          )}
        </div>
      ))}

      {!canWrite ? (
        <div className={styles.loginHint}>
          {mode.allowAnonymous ? '댓글을 준비하는 중이에요…' : '로그인 후 댓글을 작성할 수 있어요.'}
        </div>
      ) : (
        <div className={styles.composer}>
          {showNicknameInput && (
            <input
              type="text"
              placeholder={`닉네임 (${ANON_NICKNAME_MIN}~${ANON_NICKNAME_MAX}자) *`}
              value={anonNickname}
              maxLength={ANON_NICKNAME_MAX}
              onChange={e => handleNicknameChange(e.target.value)}
              className={styles.nicknameInput}
            />
          )}
          {mode.rich ? (
            <>
              <QuillEditor
                value={commentText}
                onChange={setCommentText}
                placeholder="생각을 남겨주세요…"
                minHeight={120}
              />
              <div className={styles.editorActions}>
                <button type="button" className="btn-sm btn-outline" onClick={stop(handleAddTop)}>등록</button>
              </div>
            </>
          ) : (
            <div className={styles.composerRow}>
              <textarea
                rows={2}
                value={commentText}
                onChange={e => setCommentText(e.target.value)}
                onClick={e => e.stopPropagation()}
                placeholder="댓글을 남겨주세요"
                className={styles.textarea}
              />
              <button type="button" className="btn-sm btn-outline" onClick={stop(handleAddTop)}>등록</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// 댓글과 답글은 모양이 같아 한 컴포넌트로 그린다. (답글에는 답글 버튼만 없다.)
function CommentRow({ comment, ctx }) {
  const editing = ctx.editCommentId === comment.id;
  const rich = isRichComment(ctx.mode, comment);
  const isReply = !!comment.parentId;

  return (
    <div className={styles.itemHeader}>
      <div className={styles.itemBody}>
        <div className={styles.itemMeta}>
          <span className={styles.itemNickname}>{comment.nickname}</span>
          {comment.isAnonymous && <span className={styles.anonBadge}>비회원</span>}
          <span className={styles.itemDate}>{formatMonthDay(comment.createdAt)}</span>
        </div>
        {editing ? (
          rich ? (
            <div className={styles.richEdit}>
              <QuillEditor
                value={ctx.editText}
                onChange={ctx.setEditText}
                placeholder="내용을 수정해주세요…"
                minHeight={100}
              />
              <div className={styles.editorActions}>
                <button type="button" className="btn-sm btn-outline" onClick={stop(() => ctx.onSaveEdit(comment))}>저장</button>
                <button type="button" className="btn-sm" onClick={stop(ctx.onCancelEdit)}>취소</button>
              </div>
            </div>
          ) : (
            <div className={styles.editRow}>
              <textarea rows={2} value={ctx.editText} onChange={e => ctx.setEditText(e.target.value)} className={styles.textarea} />
              <button type="button" className="btn-sm btn-outline" onClick={stop(() => ctx.onSaveEdit(comment))}>저장</button>
              <button type="button" className="btn-sm" onClick={stop(ctx.onCancelEdit)}>취소</button>
            </div>
          )
        ) : rich ? (
          <ContentLightbox contentClassName={`ql-editor ql-snow ${styles.richText}`}>
            <ExpandableContent html={dangerousHtml(comment.content)} />
          </ContentLightbox>
        ) : (
          <ExpandableContent text={comment.content} className={styles.commentText} />
        )}
      </div>
      {!editing && (
        <div className={styles.itemActions}>
          {ctx.canWrite && !isReply && (
            <button type="button" className="btn-sm btn-ghost" onClick={stop(() => ctx.onStartReply(comment))}>답글</button>
          )}
          {ctx.canModify(comment) && (
            <>
              <button type="button" className="btn-sm btn-ghost" onClick={stop(() => ctx.onStartEdit(comment))}>수정</button>
              <button type="button" className="btn-sm btn-ghost" onClick={stop(() => ctx.onDelete(comment.id))}>삭제</button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
