import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
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
독자에게 깊은 울림을 줄 수 있는 책 한 권을 자유롭게 선택하고, 그 책의 핵심 내용을 2~3문단으로 간추린 발췌문을 작성해주세요.
소설, 에세이, 인문학, 철학, 자기계발 등 장르는 자유입니다. 한국 독자에게 잘 알려진 책을 선택하면 좋습니다.

다음 형식으로 응답해주세요 (형식을 정확히 지켜주세요):

[제목]
(책 제목)

[저자]
(저자 이름)

[발췌]
(책의 핵심 내용을 담은 2~3문단. 원문의 분위기와 문체를 살려 간추린 내용으로 작성.)

[질문1]
(첫 번째 토론 질문)

[질문2]
(두 번째 토론 질문)

[질문3]
(세 번째 토론 질문)`;

    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1500,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = message.content[0].text.trim();

    const titleMatch = text.match(/\[제목\]\s*([\s\S]*?)(?=\[저자\]|$)/);
    const authorMatch = text.match(/\[저자\]\s*([\s\S]*?)(?=\[발췌\]|$)/);
    const passageMatch = text.match(/\[발췌\]\s*([\s\S]*?)(?=\[질문1\]|$)/);
    const q1Match = text.match(/\[질문1\]\s*([\s\S]*?)(?=\[질문2\]|$)/);
    const q2Match = text.match(/\[질문2\]\s*([\s\S]*?)(?=\[질문3\]|$)/);
    const q3Match = text.match(/\[질문3\]\s*([\s\S]*?)$/);

    const bookTitle = titleMatch ? titleMatch[1].trim() : '';
    const bookAuthor = authorMatch ? authorMatch[1].trim() : '';
    const passage = passageMatch ? passageMatch[1].trim() : text;
    const questions = [q1Match, q2Match, q3Match]
      .map(m => m ? m[1].trim() : '')
      .filter(q => q.length > 0);

    return NextResponse.json({ bookTitle, bookAuthor, passage, questions });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
