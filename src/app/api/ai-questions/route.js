import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { title, author, description } = await request.json();
    if (!title) return NextResponse.json({ error: '책 제목이 필요합니다.' }, { status: 400 });

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'AI API 키가 설정되지 않았습니다. 환경변수 ANTHROPIC_API_KEY를 설정해주세요.' },
        { status: 503 }
      );
    }

    const Anthropic = (await import('@anthropic-ai/sdk')).default;
    const client = new Anthropic({ apiKey });

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

    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 800,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = message.content[0].text.trim();
    const questions = text.split('\n').map(q => q.trim()).filter(q => q.length > 0).slice(0, 5);

    return NextResponse.json({ questions });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
