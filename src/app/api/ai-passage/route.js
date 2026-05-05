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

    const body = await request.json().catch(() => ({}));
    const { kind, bookTitle, bookAuthor, bookDescription = '', excerpt = '' } = body;

    if (kind !== 'curator_intro' && kind !== 'public_domain') {
      return NextResponse.json(
        { error: 'kind는 curator_intro 또는 public_domain이어야 합니다.' },
        { status: 400 }
      );
    }
    if (!bookTitle || !bookAuthor) {
      return NextResponse.json(
        { error: '책 제목(bookTitle)과 저자(bookAuthor)가 필요합니다.' },
        { status: 400 }
      );
    }
    if (kind === 'public_domain' && !excerpt.trim()) {
      return NextResponse.json(
        { error: 'public_domain 모드는 원문 발췌(excerpt)가 필요합니다.' },
        { status: 400 }
      );
    }

    const Anthropic = (await import('@anthropic-ai/sdk')).default;
    const client = new Anthropic({ apiKey });

    let prompt;
    if (kind === 'curator_intro') {
      prompt = `당신은 독서 큐레이터입니다. 아래 책에 대한 큐레이터 코멘트를 작성해주세요.

책 제목: ${bookTitle}
저자: ${bookAuthor}
${bookDescription ? `\n[책 소개 — 출판사 제공]\n${bookDescription}\n` : ''}

작성 규칙(반드시 준수):
- 책의 본문을 직접 인용하거나 발췌·재구성하지 마세요. 큰따옴표로 묶인 문장도 만들지 마세요.
- "~라고 적혀 있다", "이 책의 한 구절은…", "작가는 ~라고 썼다" 같이 책 안에 특정 문장이 등장한다고 단정하는 표현 금지.
- 위 [책 소개]에 명시되지 않은 내용을 구체적 사실처럼 단정하지 마세요(예: 등장인물·줄거리·구체 일화 임의 창작 금지).
- "이 책은 ~을 다룹니다", "~를 떠올리게 합니다", "~를 묻게 됩니다" 같은 소개·연상·질문 유도 표현만 사용.
- 정확히 2문단(각 문단 3~5문장)으로 작성. 한국어 독자 대상의 자연스러운 큐레이터 톤.

다음 형식으로 응답해주세요 (형식을 정확히 지켜주세요):

[코멘트]
(2문단 큐레이터 글)

[질문1]
(첫 번째 토론 질문)

[질문2]
(두 번째 토론 질문)

[질문3]
(세 번째 토론 질문)`;
    } else {
      prompt = `당신은 독서 큐레이터입니다. 아래는 저작권 보호기간이 만료된 작품의 발췌문(원문)입니다. 원문에 대한 짧은 큐레이터 코멘트와 토론 질문 3개만 작성해주세요.

책 제목: ${bookTitle}
저자: ${bookAuthor}

[원문]
${excerpt}

작성 규칙(반드시 준수):
- 원문은 그대로 보존되어 별도 표시되므로, 응답에 원문을 다시 포함하지 마세요.
- 큐레이터 코멘트는 1~2문단, 원문에 대한 감상이나 시대·맥락 소개에 한정.
- 토론 질문 3개는 원문을 직접 인용하지 말고 사유를 유도하는 형태로.

다음 형식으로 응답해주세요:

[코멘트]
(1~2문단 큐레이터 글)

[질문1]
(첫 번째 토론 질문)

[질문2]
(두 번째 토론 질문)

[질문3]
(세 번째 토론 질문)`;
    }

    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1500,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = message.content[0].text.trim();

    const noteMatch = text.match(/\[코멘트\]\s*([\s\S]*?)(?=\[질문1\]|$)/);
    const q1Match = text.match(/\[질문1\]\s*([\s\S]*?)(?=\[질문2\]|$)/);
    const q2Match = text.match(/\[질문2\]\s*([\s\S]*?)(?=\[질문3\]|$)/);
    const q3Match = text.match(/\[질문3\]\s*([\s\S]*?)$/);

    const curatorNote = noteMatch ? noteMatch[1].trim() : '';
    const questions = [q1Match, q2Match, q3Match]
      .map(m => m ? m[1].trim() : '')
      .filter(q => q.length > 0);

    return NextResponse.json({ curatorNote, questions });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
