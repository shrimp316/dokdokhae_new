import { NextResponse } from 'next/server';
import { requireAdminUser } from '@/lib/firebaseAdmin';

const MAX_QUERY_LENGTH = 100;

// 카카오 REST 키가 브라우저 번들에 들어가지 않도록 관리자 도서 검색은 서버가 대신 호출한다.
// Vercel 변수 이름이 아직 NEXT_PUBLIC_KAKAO_API_KEY라서 새 이름으로 옮기기 전까지 둘 다 읽는다.
// 이 변수는 서버 코드에서만 읽어야 번들에 포함되지 않는다.
export async function GET(request) {
  const authResult = await requireAdminUser(request);
  if (authResult.response) return authResult.response;

  const apiKey = process.env.KAKAO_REST_API_KEY || process.env.NEXT_PUBLIC_KAKAO_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: '카카오 API 키가 설정되지 않았습니다. 환경변수 KAKAO_REST_API_KEY를 설정해주세요.' },
      { status: 503 }
    );
  }

  const q = (new URL(request.url).searchParams.get('q') || '').trim().slice(0, MAX_QUERY_LENGTH);
  if (!q) return NextResponse.json({ documents: [] });

  try {
    const r = await fetch(`https://dapi.kakao.com/v3/search/book?query=${encodeURIComponent(q)}&size=5`, {
      headers: { Authorization: `KakaoAK ${apiKey}` },
    });
    if (!r.ok) return NextResponse.json({ error: '카카오 검색 호출 실패' }, { status: 502 });
    const data = await r.json();
    const documents = (data.documents || []).map(b => ({
      title: b.title,
      authors: b.authors || [],
      thumbnail: b.thumbnail || '',
      isbn: b.isbn || '',
      contents: b.contents || '',
    }));
    return NextResponse.json({ documents });
  } catch {
    return NextResponse.json({ error: '카카오 검색 호출 실패' }, { status: 502 });
  }
}
