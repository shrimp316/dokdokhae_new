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

    const prompt = `당신은 독서 큐레이터입니다.
다음 책에서 독자에게 인상적이고 생각할 거리를 줄 수 있는 대표적인 인용구 또는 핵심 구절을 제안하고, 관련 토론 질문 3개를 생성해주세요.

책 제목: ${title}
저자: ${author || '미상'}
${description ? `책 소개: ${description}` : ''}

다음 형식으로 응답해주세요 (형식을 정확히 지켜주세요):

[구절]
(책의 분위기와 핵심 주제를 담은 2~4문장의 인용구나 핵심 구절. 실제 책 내용이 불확실하다면 책의 주제를 잘 나타내는 문장을 창작해도 됩니다.)

[질문1]
(첫 번째 토론 질문)

[질문2]
(두 번째 토론 질문)

[질문3]
(세 번째 토론 질문)`;

    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1000,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = message.content[0].text.trim();

    // 구절 파싱
    const passageMatch = text.match(/\[구절\]\s*([\s\S]*?)(?=\[질문1\]|$)/);
    const q1Match = text.match(/\[질문1\]\s*([\s\S]*?)(?=\[질문2\]|$)/);
    const q2Match = text.match(/\[질문2\]\s*([\s\S]*?)(?=\[질문3\]|$)/);
    const q3Match = text.match(/\[질문3\]\s*([\s\S]*?)$/);

    const passage = passageMatch ? passageMatch[1].trim() : text;
    const questions = [q1Match, q2Match, q3Match]
      .map(m => m ? m[1].trim() : '')
      .filter(q => q.length > 0);

    return NextResponse.json({ passage, questions });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
