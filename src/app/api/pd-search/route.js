import { NextResponse } from 'next/server';

const ALLOWED_PROXY_HOSTS = ['gutenberg.org', 'www.gutenberg.org', 'gutenberg.net'];

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const proxy = searchParams.get('proxy');

  if (proxy) {
    let host;
    try { host = new URL(proxy).hostname; } catch {
      return NextResponse.json({ error: 'invalid proxy url' }, { status: 400 });
    }
    if (!ALLOWED_PROXY_HOSTS.some(a => host === a || host.endsWith('.' + a))) {
      return NextResponse.json({ error: 'proxy host not allowed' }, { status: 403 });
    }
    try {
      const r = await fetch(proxy);
      if (!r.ok) return NextResponse.json({ error: '본문 가져오기 실패' }, { status: 502 });
      const text = await r.text();
      return new NextResponse(text, {
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      });
    } catch (e) {
      return NextResponse.json({ error: e.message }, { status: 500 });
    }
  }

  const q = (searchParams.get('q') || '').trim();
  const lang = searchParams.get('lang') || 'ko';
  if (!q) return NextResponse.json({ books: [] });

  try {
    const url = `https://gutendex.com/books?search=${encodeURIComponent(q)}&languages=${encodeURIComponent(lang)}`;
    const r = await fetch(url);
    if (!r.ok) return NextResponse.json({ error: 'Gutendex 호출 실패' }, { status: 502 });
    const data = await r.json();
    const books = (data.results || []).slice(0, 10).map(b => ({
      id: b.id,
      title: b.title,
      authors: (b.authors || []).map(a => a.name),
      formats: b.formats || {},
    }));
    return NextResponse.json({ books });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
