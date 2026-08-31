'use client';
import { useEffect, useRef, useState } from 'react';
import {
  collection, doc, getDoc, getDocs, deleteDoc, updateDoc,
  query, orderBy, addDoc, serverTimestamp, runTransaction,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { authenticatedFetch } from '@/lib/authenticatedFetch';

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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collectionName, postId, user?.uid]);

  async function toggleLike() {
    if (!user || !postId) return;
    const likeRef = doc(db, collectionName, postId, 'likes', user.uid);
    const postRef = doc(db, collectionName, postId);

    // optimistic UI
    const willLike = !liked;
    setLiked(willLike);
    setLikeCount(c => Math.max(0, c + (willLike ? 1 : -1)));

    try {
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
      // rollback optimistic UI
      setLiked(!willLike);
      setLikeCount(c => Math.max(0, c + (willLike ? -1 : 1)));
    }
  }

  return { liked, likeCount, toggleLike };
}

export function useComments(collectionName, postId) {
  const [comments, setComments] = useState([]);
  const mountedRef = useRef(true);
  useEffect(() => () => { mountedRef.current = false; }, []);

  async function loadComments() {
    if (!postId) return;
    const snap = await getDocs(query(
      collection(db, collectionName, postId, 'comments'),
      orderBy('createdAt', 'asc'),
    ));
    if (!mountedRef.current) return;
    setComments(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  }

  useEffect(() => {
    if (!postId) return;
    let cancelled = false;
    async function load() {
      const snap = await getDocs(query(
        collection(db, collectionName, postId, 'comments'),
        orderBy('createdAt', 'asc'),
      ));
      if (!cancelled) setComments(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }
    load();
    return () => { cancelled = true; };
  }, [collectionName, postId]);

  async function addComment({ content, nickname, uid, parentId = null }) {
    if (!content?.trim()) return;
    const docRef = await addDoc(collection(db, collectionName, postId, 'comments'), {
      content: content.trim(), nickname, uid,
      parentId: parentId || null,
      createdAt: serverTimestamp(),
    });
    notify({ type: 'comment', collectionName, postId, commentId: docRef.id });
    await loadComments();
  }

  async function editComment(commentId, content) {
    await updateDoc(doc(db, collectionName, postId, 'comments', commentId), {
      content, updatedAt: serverTimestamp(),
    });
    await loadComments();
  }

  async function deleteComment(commentId) {
    await deleteDoc(doc(db, collectionName, postId, 'comments', commentId));
    await loadComments();
  }

  const topComments = comments.filter(c => !c.parentId);
  const getReplies = (cid) => comments.filter(c => c.parentId === cid);

  return { comments, topComments, getReplies, addComment, editComment, deleteComment, reload: loadComments };
}
