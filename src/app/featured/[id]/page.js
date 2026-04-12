'use client';
import { useEffect, useState, use } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useRouter } from 'next/navigation';

export default function FeaturedDetailPage({ params }) {
  const { id } = use(params);
  const router = useRouter();
  const [passage, setPassage] = useState(null);

  useEffect(() => {
    getDoc(doc(db, 'featuredPassages', id)).then(snap => {
      if (snap.exists()) setPassage({ id: snap.id, ...snap.data() });
    });
  }, [id]);

  if (!passage) return <div className="empty-msg">로딩 중…</div>;

  return (
    <div>
      <button onClick={() => router.push('/featured')}
        style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: 13, marginBottom: 16, padding: 0 }}>
        ← 목록으로
      </button>

      {/* 기간 배지 */}
      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--accent2)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>
        {passage.period === 'weekly' ? '📅 이 주의 글' : '📆 이 달의 글'} · {passage.periodKey}
      </div>

      {/* 발췌문 */}
      <div className="card" style={{ padding: 24, marginBottom: 20 }}>
        <p style={{ fontFamily: 'var(--font-serif)', fontSize: 16, lineHeight: 2, color: 'var(--text)', whiteSpace: 'pre-line', marginBottom: 16 }}>
          "{passage.passage}"
        </p>
        <div style={{ borderTop: '1px solid var(--line)', paddingTop: 12 }}>
          <p style={{ fontSize: 13, fontWeight: 500 }}>{passage.bookTitle}</p>
          {passage.bookAuthor && <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{passage.bookAuthor}</p>}
          {passage.source && <p style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>출처: {passage.source}</p>}
        </div>
      </div>

      {/* 토론 질문 */}
      {passage.questions?.length > 0 && (
        <div className="card" style={{ padding: 20 }}>
          <h2 style={{ fontSize: 14, fontWeight: 600, color: 'var(--accent)', marginBottom: 14 }}>💬 함께 나눠볼 질문</h2>
          <ol style={{ paddingLeft: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 12 }}>
            {passage.questions.map((q, i) => (
              <li key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <span style={{ fontFamily: 'var(--font-serif)', fontSize: 18, color: 'var(--accent)', flexShrink: 0, lineHeight: 1.4 }}>{i + 1}.</span>
                <span style={{ fontSize: 14, lineHeight: 1.7, color: 'var(--text)' }}>{q}</span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}
