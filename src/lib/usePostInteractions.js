'use client';
import { useEffect, useState } from 'react';
import {
  collection, doc, getDoc, deleteDoc, updateDoc,
  query, orderBy, addDoc, onSnapshot, serverTimestamp, runTransaction,
} from 'firebase/firestore';
import { signInAnonymously } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { authenticatedFetch, authenticatedJsonFetch } from '@/lib/authenticatedFetch';
import { commentMode } from '@/lib/commentPolicy';

// 알림은 부가 기능이라 실패해도 좋아요·댓글 자체는 성공으로 둔다.
function notify(payload) {
  authenticatedFetch('/api/notify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  }).catch(() => {});
}

export function useLikes(collectionName, postId, user) {
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);

  useEffect(() => {
    if (!postId) return;
    let cancelled = false;
    async function load() {
      const postSnap = await getDoc(doc(db, collectionName, postId));
      if (!cancelled && postSnap.exists()) {
        setLikeCount(postSnap.data().likeCount || 0);
      }
      if (user) {
        const likeSnap = await getDoc(doc(db, collectionName, postId, 'likes', user.uid));
        if (!cancelled) setLiked(likeSnap.exists());
      } else if (!cancelled) {
        setLiked(false);
      }
    }
    load();
    return () => { cancelled = true; };
  // user 객체는 토큰이 갱신될 때마다 바뀌므로 계정이 바뀔 때(uid)만 다시 읽는다.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collectionName, postId, user?.uid]);

  async function toggleLike() {
    if (!user || !postId) return;
    const likeRef = doc(db, collectionName, postId, 'likes', user.uid);
    const postRef = doc(db, collectionName, postId);

    // 누르는 즉시 반영하고, 저장이 실패하면 되돌린다.
    const willLike = !liked;
    setLiked(willLike);
    setLikeCount(c => Math.max(0, c + (willLike ? 1 : -1)));

    try {
      // 좋아요 문서와 likeCount가 어긋나지 않도록 한 트랜잭션에서 함께 바꾼다.
      await runTransaction(db, async (tx) => {
        const likeSnap = await tx.get(likeRef);
        const postSnap = await tx.get(postRef);
        if (!postSnap.exists()) throw new Error('post not found');
        const current = postSnap.data().likeCount || 0;
        if (likeSnap.exists()) {
          tx.delete(likeRef);
          tx.update(postRef, { likeCount: Math.max(0, current - 1) });
        } else {
          tx.set(likeRef, { uid: user.uid, createdAt: serverTimestamp() });
          tx.update(postRef, { likeCount: current + 1 });
        }
      });
      if (willLike) notify({ type: 'like', collectionName, postId });
    } catch (err) {
      console.error('toggleLike failed', err);
      setLiked(!willLike);
      setLikeCount(c => Math.max(0, c + (willLike ? -1 : 1)));
    }
  }

  return { liked, likeCount, toggleLike };
}

function commentApiUrl(mode, postId, commentId) {
  const base = `${mode.apiPath}/${encodeURIComponent(postId)}/comments`;
  return commentId ? `${base}/${encodeURIComponent(commentId)}` : base;
}

// 댓글 목록(실시간 구독)과 작성·수정·삭제. 저장 경로는 컬렉션별 댓글 방식(commentMode)에 따라 정해진다.
// - 서버 API: 리치 HTML sanitize와 비회원 검증이 필요한 컬렉션 (이 주의 글)
// - Firestore 직접 쓰기: 일반 텍스트 댓글 (게시판·감상평, firestore.rules가 검증)
// 작성·수정은 { contentWasSanitized }를 돌려준다.
export function useComments(collectionName, postId) {
  const mode = commentMode(collectionName);
  const [comments, setComments] = useState([]);

  // 댓글 컬렉션을 구독하므로 작성·수정·삭제 후 다시 읽어 올 필요가 없다.
  // 다른 사람이 단 댓글도, 같은 글을 보는 다른 컴포넌트(감상평 카드 헤더의 댓글 수)도 바로 반영된다.
  useEffect(() => {
    if (!postId) return;
    const q = query(
      collection(db, collectionName, postId, 'comments'),
      orderBy('createdAt', 'asc'),
    );
    return onSnapshot(q, (snap) => {
      // 방금 쓴 댓글은 서버 시각이 확정되기 전이라 createdAt을 추정값으로 채운다.
      setComments(snap.docs.map(d => ({ id: d.id, ...d.data({ serverTimestamps: 'estimate' }) })));
    }, (error) => {
      console.error('comments subscription failed', error);
    });
  }, [collectionName, postId]);

  async function addComment({ content, nickname, uid, parentId = null }) {
    let commentId;
    let contentWasSanitized = false;

    if (mode.apiPath) {
      // 비회원은 댓글을 등록하는 이 시점에만 익명 계정을 만든다. (페이지를 보기만 하면 만들지 않음)
      if (!auth.currentUser) await signInAnonymously(auth);
      const result = await authenticatedJsonFetch(commentApiUrl(mode, postId), {
        method: 'POST',
        body: { content, nickname, parentId },
      });
      commentId = result.id;
      contentWasSanitized = !!result.contentWasSanitized;
    } else {
      const docRef = await addDoc(collection(db, collectionName, postId, 'comments'), {
        content: content.trim(), nickname, uid,
        parentId: parentId || null,
        createdAt: serverTimestamp(),
      });
      commentId = docRef.id;
    }

    // 알림 API는 회원 전용이므로 비회원 댓글은 알림을 보내지 않는다.
    if (!auth.currentUser?.isAnonymous) {
      notify({ type: 'comment', collectionName, postId, commentId });
    }
    return { contentWasSanitized };
  }

  async function editComment(commentId, content) {
    let contentWasSanitized = false;
    if (mode.apiPath) {
      const result = await authenticatedJsonFetch(commentApiUrl(mode, postId, commentId), {
        method: 'PATCH',
        body: { content },
      });
      contentWasSanitized = !!result.contentWasSanitized;
    } else {
      await updateDoc(doc(db, collectionName, postId, 'comments', commentId), {
        content, updatedAt: serverTimestamp(),
      });
    }
    return { contentWasSanitized };
  }

  // 삭제는 모든 컬렉션에서 브라우저가 직접 수행한다. (firestore.rules가 작성자·관리자만 허용)
  async function deleteComment(commentId) {
    await deleteDoc(doc(db, collectionName, postId, 'comments', commentId));
  }

  const topComments = comments.filter(c => !c.parentId);
  const getReplies = (cid) => comments.filter(c => c.parentId === cid);

  return { mode, comments, topComments, getReplies, addComment, editComment, deleteComment };
}
