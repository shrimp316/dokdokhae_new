const { onRequest } = require('firebase-functions/v2/https');
const { onSchedule } = require('firebase-functions/v2/scheduler');
const admin = require('firebase-admin');

admin.initializeApp();
const db = admin.firestore();
const auth = admin.auth();
const anthropicKey = { value: () => process.env.ANTHROPIC_API_KEY };

async function verify(request) {
  const value = request.get('authorization') || '';
  if (!value.startsWith('Bearer ')) return null;
  try { return await auth.verifyIdToken(value.slice(7)); } catch { return null; }
}

async function requireAdmin(request) {
  const user = await verify(request);
  if (!user) return { status: 401, user: null };
  const snap = await db.doc(`users/${user.uid}`).get();
  return snap.data()?.role === 'admin' ? { status: 200, user } : { status: 403, user };
}

exports.fcmToken = onRequest({ cors: true }, async (request, response) => {
  if (request.method !== 'POST') return response.sendStatus(405);
  const user = await verify(request);
  if (!user) return response.status(401).json({ error: 'Unauthorized' });
  const { token } = request.body || {};
  if (!token) return response.status(400).json({ error: 'token required' });
  await db.doc(`fcmTokens/${user.uid}`).set({ token, updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
  return response.json({ success: true });
});

exports.fcmDebug = onRequest({ cors: true }, async (request, response) => {
  if (request.method !== 'POST') return response.sendStatus(405);
  const user = await verify(request);
  if (!user) return response.status(401).json({ error: 'Unauthorized' });
  const { stage, reason, context } = request.body || {};
  if (!stage) return response.status(400).json({ error: 'stage required' });
  await db.collection('fcmDiagnostics').add({ uid: user.uid, stage, reason: reason || null, context: context || null, createdAt: admin.firestore.FieldValue.serverTimestamp() });
  return response.json({ success: true });
});

exports.sendNotification = onRequest({ cors: true }, async (request, response) => {
  const gate = await requireAdmin(request);
  if (gate.status !== 200) return response.status(gate.status).json({ error: gate.status === 401 ? 'Unauthorized' : 'Forbidden' });
  const { title, body, url = '/' } = request.body || {};
  if (!title || !body) return response.status(400).json({ error: 'title and body required' });
  const snap = await db.collection('fcmTokens').get();
  const tokens = snap.docs.map(d => d.data().token).filter(Boolean);
  if (!tokens.length) return response.json({ success: true, sent: 0 });
  const result = await admin.messaging().sendEachForMulticast({ tokens, notification: { title, body }, webpush: { notification: { title, body, icon: '/icon-192.png' }, fcmOptions: { link: url } } });
  return response.json({ success: true, sent: result.successCount, failed: result.failureCount });
});

exports.aiQuestions = onRequest({ cors: true }, async (request, response) => {
  const gate = await requireAdmin(request);
  if (gate.status !== 200) return response.status(gate.status).json({ error: gate.status === 401 ? 'Unauthorized' : 'Forbidden' });
  const { title, author, description } = request.body || {};
  if (!title) return response.status(400).json({ error: 'title required' });
  const result = await callAnthropic(anthropicKey.value(), `책 제목: ${title}\n저자: ${author || '미상'}\n소개: ${description || ''}\n독서 토론 질문 5개를 한국어로 작성하세요.`, 800);
  return response.json({ questions: result.split('\n').map(s => s.trim()).filter(Boolean).slice(0, 5) });
});

exports.aiPassage = onRequest({ cors: true }, async (request, response) => {
  const gate = await requireAdmin(request);
  if (gate.status !== 200) return response.status(gate.status).json({ error: gate.status === 401 ? 'Unauthorized' : 'Forbidden' });
  const { kind, bookTitle, bookAuthor, bookDescription = '', excerpt = '' } = request.body || {};
  if (!['curator_intro', 'public_domain'].includes(kind) || !bookTitle || !bookAuthor) return response.status(400).json({ error: 'invalid request' });
  if (kind === 'public_domain' && !excerpt.trim()) return response.status(400).json({ error: 'excerpt required' });
  const prompt = kind === 'public_domain'
    ? `책 제목: ${bookTitle}\n저자: ${bookAuthor}\n발췌문:\n${excerpt}\n이 발췌문을 직접 반복하지 말고 큐레이터 소개와 독서 질문 3개를 한국어로 작성하세요. [코멘터리], [질문1], [질문2], [질문3] 형식을 지키세요.`
    : `책 제목: ${bookTitle}\n저자: ${bookAuthor}\n소개: ${bookDescription}\n책 내용을 단정하거나 인용하지 않는 큐레이터 소개와 독서 질문 3개를 한국어로 작성하세요. [코멘터리], [질문1], [질문2], [질문3] 형식을 지키세요.`;
  const text = await callAnthropic(anthropicKey.value(), prompt, 1500);
  const section = (label, next) => { const end = next ? `(?=\\[${next}\\]|$)` : '$'; const match = text.match(new RegExp(`\\[${label}\\]\\s*([\\s\\S]*?)${end}`)); return match ? match[1].trim() : ''; };
  return response.json({ curatorNote: section('코멘터리', '질문1'), questions: ['질문1', '질문2', '질문3'].map((label, i) => section(label, ['질문2', '질문3', null][i])).filter(Boolean) });
});

exports.notify = onRequest({ cors: true }, async (request, response) => {
  if (request.method !== 'POST') return response.sendStatus(405);
  const user = await verify(request);
  if (!user) return response.status(401).json({ error: 'Unauthorized' });
  const { type, collectionName, postId, commentId, actorUid } = request.body || {};
  if (!['board', 'reviews', 'featuredPassages'].includes(collectionName) || !postId) return response.status(400).json({ error: 'invalid request' });
  if (actorUid && actorUid !== user.uid) return response.status(403).json({ error: 'UID mismatch' });
  if (type === 'comment' && !commentId) return response.status(400).json({ error: 'commentId required' });
  if (type === 'like' && !actorUid) return response.status(400).json({ error: 'actorUid required' });
  const comment = type === 'comment' ? (await db.doc(`${collectionName}/${postId}/comments/${commentId}`).get()).data() : null;
  const post = (await db.doc(`${collectionName}/${postId}`).get()).data();
  const recipientUid = comment?.parentId ? (await db.doc(`${collectionName}/${postId}/comments/${comment.parentId}`).get()).data()?.uid : post?.uid;
  if (!recipientUid || recipientUid === user.uid) return response.json({ success: true, skipped: true });
  const notifId = type === 'comment' ? commentId : `like_${collectionName}_${postId}_${user.uid}`;
  const actorProfile = await db.doc(`users/${user.uid}`).get();
  const actorNickname = comment?.nickname || actorProfile.data()?.nickname || '익명';
  const rawContent = comment?.content || '';
  const preview = rawContent.replace(/<[^>]*>/g, '').trim().slice(0, 60);
  const title = type === 'like' ? `${actorNickname}님이 좋아요를 눌렀습니다` : `${actorNickname}님이 댓글을 남겼습니다`;
  await db.doc(`users/${recipientUid}/notifications/${notifId}`).set({ type, collectionName, postId, commentId: commentId || null, actorUid: user.uid, actorNickname, preview, read: false, createdAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
  const tokenSnap = await db.doc(`fcmTokens/${recipientUid}`).get();
  const token = tokenSnap.data()?.token;
  if (token) await admin.messaging().send({ token, notification: { title, body: preview || undefined }, data: { notifId, url: collectionName === 'reviews' ? `/books/${postId}` : `/${collectionName === 'board' ? 'board' : 'featured'}/${postId}` } });
  return response.json({ success: true });
});

async function callAnthropic(key, prompt, max_tokens) {
  const result = await fetch('https://api.anthropic.com/v1/messages', { method: 'POST', headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' }, body: JSON.stringify({ model: 'claude-haiku-4-5-20251001', max_tokens, messages: [{ role: 'user', content: prompt }] }) });
  if (!result.ok) throw new Error(`Anthropic API ${result.status}`);
  const data = await result.json();
  return data.content?.[0]?.text?.trim() || '';
}

exports.dailyCron = onSchedule({ schedule: '0 0 * * *', timeZone: 'Asia/Seoul' }, async () => {
  const now = new Date();
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(now);
  const tomorrowDate = new Date(`${today}T12:00:00+09:00`);
  tomorrowDate.setDate(tomorrowDate.getDate() + 1);
  const tomorrow = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(tomorrowDate);
  const tokensSnap = await db.collection('fcmTokens').get();
  const tokens = tokensSnap.docs.map(d => d.data().token).filter(Boolean);
  const sendAll = async (title, body, url = '/') => {
    if (!tokens.length) return 0;
    const result = await admin.messaging().sendEachForMulticast({ tokens, notification: { title, body }, webpush: { notification: { title, body, icon: '/icon-192.png' }, fcmOptions: { link: url } } });
    return result.successCount;
  };
  const scheduled = await db.collection('scheduledNotifications').where('date', '==', today).where('sent', '==', false).get();
  for (const item of scheduled.docs) { const data = item.data(); const sent = await sendAll(data.title, data.body, data.url || '/'); await item.ref.update({ sent: true, sentAt: admin.firestore.FieldValue.serverTimestamp(), sentCount: sent }); }
  const meetings = await db.collection('meetings').get();
  for (const item of meetings.docs) { const data = item.data(); if (data.date?.slice(0, 10) === tomorrow && !data.notified) { await sendAll('내일 모임 알림', `${data.date.slice(0, 16).replace('T', ' ')} 모임이 예정되어 있습니다.`, '/schedule'); await item.ref.update({ notified: true }); } }
});
