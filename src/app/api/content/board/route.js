import { NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { getAdminDb, requireAuthenticatedUser } from '@/lib/firebaseAdmin';
import {
  CONTENT_LIMITS,
  contentApiErrorResponse,
  getUserProfile,
  optionalString,
  readJsonBody,
  requiredString,
  requireProfile,
  sanitizedRichHtml,
} from '@/lib/contentApi';

export async function POST(request) {
  try {
    const authResult = await requireAuthenticatedUser(request);
    if (authResult.response) return authResult.response;

    const body = await readJsonBody(request);
    const db = getAdminDb();
    const profile = requireProfile(await getUserProfile(db, authResult.user.uid));
    const title = requiredString(body.title, 'title', CONTENT_LIMITS.title);
    const prefix = optionalString(body.prefix, 'prefix', CONTENT_LIMITS.prefix);
    const content = sanitizedRichHtml(body.content);

    // 닉네임은 요청 본문이 아니라 프로필에서 가져와 다른 회원을 사칭할 수 없게 한다.
    const ref = await db.collection('board').add({
      title,
      prefix,
      content: content.html,
      nickname: profile.nickname.trim(),
      uid: authResult.user.uid,
      createdAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({
      success: true,
      id: ref.id,
      content: content.html,
      contentWasSanitized: content.removedUnsafeContent,
    }, { status: 201 });
  } catch (error) {
    return contentApiErrorResponse(error, 'create board post');
  }
}
