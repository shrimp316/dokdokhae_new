import { NextResponse } from 'next/server';
import { generateText } from '@/lib/ai';
import { requireAdminUser } from '@/lib/firebaseAdmin';
import {
  CONTENT_LIMITS,
  contentApiErrorResponse,
  optionalString,
  readJsonBody,
  requiredString,
} from '@/lib/contentApi';

export async function POST(request) {
  try {
    const authResult = await requireAdminUser(request);
    if (authResult.response) return authResult.response;

    const body = await readJsonBody(request);
    // 관리자 전용이지만 계정 탈취 등에 대비해 프롬프트에 들어가는 입력 크기를 제한한다.
    const title = requiredString(body.title, 'title', CONTENT_LIMITS.title);
    const author = optionalString(body.author, 'author', CONTENT_LIMITS.bookAuthor);
    const description = optionalString(body.description, 'description', CONTENT_LIMITS.bookDescription);

    const prompt = `당신은 독서 토론 전문 퍼실리테이터입니다.
다음 책에 대한 독서모임 토론 질문 5개를 생성해주세요.

책 제목: ${title}
저자: ${author || '미상'}
${description ? `책 소개: ${description}` : ''}

요구사항:
- 토론을 풍부하게 만들 수 있는 열린 질문
- 책의 주제, 인물, 메시지에 관한 질문
- 참가자들이 자신의 경험과 연결할 수 있는 질문
- 한국어로 작성
- 번호나 기호 없이 질문만 한 줄씩 작성 (총 5개, 각 줄에 하나씩)`;

    const text = await generateText(prompt, { maxTokens: 800 });
    const questions = text.split('\n').map(q => q.trim()).filter(q => q.length > 0).slice(0, 5);

    return NextResponse.json({ questions });
  } catch (error) {
    return contentApiErrorResponse(error, 'generate ai questions');
  }
}
