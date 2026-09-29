import 'server-only';
import { ContentApiError } from './contentApiError.js';

// 관리자 AI 도구(토론 질문, 큐레이터 코멘트)가 같은 모델을 쓴다.
// 모델을 바꾸면 비용과 결과 품질이 함께 달라지므로 여기서만 바꾼다.
export const AI_MODEL = 'claude-haiku-4-5-20251001';

async function createClient() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new ContentApiError(503, 'AI API 키가 설정되지 않았습니다. 환경변수 ANTHROPIC_API_KEY를 설정해주세요.');
  }
  // SDK는 AI 요청이 올 때만 필요하므로 그때 불러온다.
  const { default: Anthropic } = await import('@anthropic-ai/sdk');
  return { client: new Anthropic({ apiKey }), Anthropic };
}

// 응답 본문은 블록 목록이라 첫 블록이 글이라고 가정하지 않고 text 블록만 모은다.
// 잘리거나(max_tokens) 거절된(refusal) 응답을 그대로 파싱하면 반쯤 잘린 질문이나 빈 코멘트가
// 저장될 수 있으므로, 관리자가 다시 시도하도록 이유를 담아 거절한다.
export function responseText(message) {
  if (message.stop_reason === 'refusal') {
    throw new ContentApiError(502, 'AI가 이 요청에 답하지 않았어요. 입력 내용을 바꿔 다시 시도해주세요.');
  }
  if (message.stop_reason === 'max_tokens') {
    throw new ContentApiError(502, 'AI 응답이 길어 중간에 잘렸어요. 다시 시도해주세요.');
  }
  const text = (message.content || [])
    .filter((block) => block.type === 'text')
    .map((block) => block.text)
    .join('')
    .trim();
  if (!text) {
    throw new ContentApiError(502, 'AI 응답이 비어 있어요. 다시 시도해주세요.');
  }
  return text;
}

// 프롬프트 하나를 보내고 응답 글을 돌려준다. API 오류는 관리자에게 보여줄 메시지로 바꾼다.
export async function generateText(prompt, { maxTokens }) {
  const { client, Anthropic } = await createClient();
  let message;
  try {
    message = await client.messages.create({
      model: AI_MODEL,
      max_tokens: maxTokens,
      messages: [{ role: 'user', content: prompt }],
    });
  } catch (error) {
    if (error instanceof Anthropic.RateLimitError) {
      throw new ContentApiError(429, 'AI 요청이 많아 잠시 막혔어요. 잠시 후 다시 시도해주세요.');
    }
    if (error instanceof Anthropic.APIError) {
      console.error('anthropic api error', error.status, error.message);
      throw new ContentApiError(502, 'AI 호출에 실패했어요. 잠시 후 다시 시도해주세요.');
    }
    throw error;
  }
  return responseText(message);
}
