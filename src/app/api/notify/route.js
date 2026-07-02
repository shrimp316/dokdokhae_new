import { NextResponse } from 'next/server';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';
import { stripHtml } from '@/lib/searchUtils';

const PREVIEW_LEN = 60;
const VALID_COLLECTIONS = ['board', 'reviews', 'featuredPassages'];

function getAdminApp() {
  if (getApps().length > 0) return getApps()[0];
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
  return initializeApp({ credential: cert(serviceAccount) });
}

function postUrl(collectionName, postId, bookId) {
  if (collectionName === 'board') return `/board/${postId}`;
  if (collectionName === 'reviews') return `/books/${bookId}`;
  return `/featured/${postId}`;
}

async function resolveComment(db, { collectionName, postId, commentId }) {
  const commentSnap = await db.collection(collectionName).doc(postId)
    .collection('comments').doc(commentId).get();
  if (!commentSnap.exists) return null;
  const comment = commentSnap.data();

  if (comment.parentId) {
    const parentSnap = await db.collection(collectionName).doc(postId)
      .collection('comments').doc(comment.parentId).get();
    if (!parentSnap.exists) return null;
    return {
      type: 'reply',
      recipientUid: parentSnap.data().uid,
      actorUid: comment.uid,
      actorNickname: comment.nickname,
      content: comment.content,
    };
  }

  if (collectionName === 'featuredPassages') return null;

  const postSnap = await db.collection(collectionName).doc(postId).get();
  if (!postSnap.exists) return null;
  return {
    type: 'comment',
    recipientUid: postSnap.data().uid,
    bookId: postSnap.data().bookId || null,
    actorUid: comment.uid,
    actorNickname: comment.nickname,
    content: comment.content,
  };
}

async function resolveLike(db, { collectionName, postId, actorUid }) {
  if (collectionName === 'featuredPassages') return null;
  const likeSnap = await db.collection(collectionName).doc(postId)
    .collection('likes').doc(actorUid).get();
  if (!likeSnap.exists) return null;

  const postSnap = await db.collection(collectionName).doc(postId).get();
  if (!postSnap.exists) return null;

  const actorSnap = await db.collection('users').doc(actorUid).get();
  return {
    type: 'like',
    recipientUid: postSnap.data().uid,
    bookId: postSnap.data().bookId || null,
    actorUid,
    actorNickname: actorSnap.exists ? actorSnap.data().nickname : '익명',
  };
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { type, collectionName, postId, commentId, actorUid } = body;

    if (!VALID_COLLECTIONS.includes(collectionName) || !postId) {
      return NextResponse.json({ error: 'invalid collectionName/postId' }, { status: 400 });
    }

    getAdminApp();
    const db = getFirestore();

    let resolved = null;
    if (type === 'comment') {
      if (!commentId) return NextResponse.json({ error: 'commentId required' }, { status: 400 });
      resolved = await resolveComment(db, { collectionName, postId, commentId });
    } else if (type === 'like') {
      if (!actorUid) return NextResponse.json({ error: 'actorUid required' }, { status: 400 });
      resolved = await resolveLike(db, { collectionName, postId, actorUid });
    } else {
      return NextResponse.json({ error: 'invalid type' }, { status: 400 });
    }

    if (!resolved) return NextResponse.json({ success: true, skipped: true });

    const { recipientUid } = resolved;
    if (!recipientUid || recipientUid === resolved.actorUid) {
      return NextResponse.json({ success: true, skipped: true });
    }

    const recipientSnap = await db.collection('users').doc(recipientUid).get();
    if (!recipientSnap.exists) {
      return NextResponse.json({ success: true, skipped: true });
    }

    const notifId = type === 'comment'
      ? commentId
      : `like_${collectionName}_${postId}_${actorUid}`;
    const notifRef = db.collection('users').doc(recipientUid)
      .collection('notifications').doc(notifId);
    const existingSnap = await notifRef.get();

    const preview = resolved.content ? stripHtml(resolved.content).slice(0, PREVIEW_LEN) : '';
    const notifData = {
      type: resolved.type,
      collectionName,
      postId,
      bookId: resolved.bookId || null,
      commentId: type === 'comment' ? commentId : null,
      actorUid: resolved.actorUid,
      actorNickname: resolved.actorNickname || '익명',
      preview,
    };

    await notifRef.set(
      existingSnap.exists ? notifData : { ...notifData, read: false, createdAt: FieldValue.serverTimestamp() },
      { merge: true },
    );

    const tokenSnap = await db.collection('fcmTokens').doc(recipientUid).get();
    const token = tokenSnap.exists ? tokenSnap.data().token : null;
    if (!token) {
      await db.collection('fcmDiagnostics').add({
        uid: recipientUid, stage: 'no-token', reason: null,
        context: { collectionName, postId }, createdAt: FieldValue.serverTimestamp(),
      });
    }
    if (token) {
      const url = postUrl(collectionName, postId, resolved.bookId);
      const titleByType = {
        comment: `${resolved.actorNickname}님이 댓글을 남겼어요`,
        reply: `${resolved.actorNickname}님이 답글을 남겼어요`,
        like: `${resolved.actorNickname}님이 좋아요를 눌렀어요`,
      };
      const title = titleByType[resolved.type];
      try {
        await getMessaging().send({
          token,
          notification: { title, body: preview || undefined },
          data: { notifId, url },
          webpush: {
            notification: { title, body: preview || undefined, icon: '/icon-192.png', tag: notifId },
            fcmOptions: { link: url },
          },
        });
      } catch (e) {
        if (e?.code === 'messaging/registration-token-not-registered') {
          await db.collection('fcmTokens').doc(recipientUid).delete();
        } else {
          console.error('notify push failed', e);
        }
        await db.collection('fcmDiagnostics').add({
          uid: recipientUid, stage: 'send-failed', reason: e?.code || e?.message || String(e),
          context: { collectionName, postId }, createdAt: FieldValue.serverTimestamp(),
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('notify failed', e);
    return NextResponse.json({ success: false, error: e.message }, { status: 200 });
  }
}
