import { NextResponse } from 'next/server';

const ALLOWED_HOSTS = [
  'kakaocdn.net',
  'daumcdn.net',
  'kakao.com',
  'pstatic.net',
  'naver.net',
  'naver.com',
  'googleusercontent.com',
  'books.google.com',
  'aladin.co.kr',
  'yes24.com',
];

function hostAllowed(hostname) {
  return ALLOWED_HOSTS.some((h) => hostname === h || hostname.endsWith('.' + h));
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const target = searchParams.get('url');
  if (!target) return NextResponse.json({ error: 'missing url' }, { status: 400 });

  let parsed;
  try { parsed = new URL(target); } catch {
    return NextResponse.json({ error: 'bad url' }, { status: 400 });
  }
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    return NextResponse.json({ error: 'bad protocol' }, { status: 400 });
  }
  if (!hostAllowed(parsed.hostname)) {
    return NextResponse.json({ error: 'host not allowed' }, { status: 403 });
  }

  try {
    const upstream = await fetch(parsed.toString(), {
      headers: { 'User-Agent': 'dokdokhae-cover-proxy/1.0' },
      cache: 'force-cache',
    });
    if (!upstream.ok) {
      return NextResponse.json({ error: 'upstream ' + upstream.status }, { status: 502 });
    }
    const ct = upstream.headers.get('content-type') || '';
    if (!ct.startsWith('image/')) {
      return NextResponse.json({ error: 'not an image' }, { status: 415 });
    }
    const buf = await upstream.arrayBuffer();
    return new NextResponse(buf, {
      headers: {
        'Content-Type': ct,
        'Cache-Control': 'public, max-age=604800, immutable',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
