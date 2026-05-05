'use client';
import { useEffect, useState } from 'react';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import Link from 'next/link';

export default function FeaturedPage() {
  const [passages, setPassages] = useState([]);
  const [tab, setTab] = useState('weekly');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const snap = await getDocs(query(collection(db, 'featuredPassages'), orderBy('createdAt', 'desc')));
      setPassages(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }
    load();
  }, []);

  const filtered = passages.filter(p => p.period === tab);
  const active = passages.find(p => p.isActive);
  const previewText = (p) => p?.excerpt || p?.curatorNote || p?.passage || '';
  const isPD = (p) => p?.kind === 'public_domain';
  const isCurator = (p) => p?.kind === 'curator_intro';

  return (
    <div>
      <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 20, color: 'var(--accent)', marginBottom: 6 }}>
        📝 이 주/달의 글
      </h1>
      <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 20 }}>
        책에서 길어올린 한 구절, 그리고 함께 나눌 질문들.
      </p>

      {/* 현재 활성 발췌문 강조 */}
      {active && (() => {
        const t = previewText(active);
        const quoted = isPD(active);
        return (
          <Link href={`/featured/${active.id}`} style={{ textDecoration: 'none' }}>
            <div className="card" style={{ padding: 20, marginBottom: 20, borderLeft: '3px solid var(--accent)', cursor: 'pointer' }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--accent2)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span>{active.period === 'weekly' ? '📅 이 주의 글' : '📆 이 달의 글'}</span>
                {isPD(active) && <span style={{ fontSize: 10, background: 'var(--tag-bg)', color: 'var(--accent)', borderRadius: 10, padding: '2px 8px', textTransform: 'none', letterSpacing: 0 }}>📜 원문</span>}
                {isCurator(active) && <span style={{ fontSize: 10, background: 'var(--tag-bg)', color: 'var(--muted)', borderRadius: 10, padding: '2px 8px', textTransform: 'none', letterSpacing: 0 }}>✍️ 소개</span>}
              </div>
              <p style={{ fontFamily: 'var(--font-serif)', fontSize: 15, lineHeight: 1.8, color: 'var(--text)', marginBottom: 10, whiteSpace: 'pre-line' }}>
                {quoted ? `"${t.slice(0, 120)}${t.length > 120 ? '…' : ''}"` : `${t.slice(0, 120)}${t.length > 120 ? '…' : ''}`}
              </p>
              <p style={{ fontSize: 12, color: 'var(--muted)' }}>
                — {active.bookTitle}{active.bookAuthor ? ` / ${active.bookAuthor}` : ''}
              </p>
              {active.questions?.length > 0 && (
                <p style={{ fontSize: 12, color: 'var(--accent)', marginTop: 8 }}>
                  💬 토론 질문 {active.questions.length}개 →
                </p>
              )}
            </div>
          </Link>
        );
      })()}

      {/* 주간 / 월간 탭 */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 16 }}>
        {[['weekly', '📅 주간'], ['monthly', '📆 월간']].map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)}
            style={{ padding: '7px 16px', border: '1.5px solid var(--line)', borderRadius: 20, fontSize: 13, cursor: 'pointer', background: tab === key ? 'var(--accent)' : 'var(--card)', color: tab === key ? '#fff' : 'var(--muted)', fontFamily: 'var(--font-sans)' }}>
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="empty-msg">로딩 중…</p>
      ) : filtered.length === 0 ? (
        <p className="empty-msg">아직 등록된 글이 없어요.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filtered.map(p => {
            const t = previewText(p);
            const quoted = isPD(p);
            return (
              <Link key={p.id} href={`/featured/${p.id}`} style={{ textDecoration: 'none' }}>
                <div className="card" style={{ padding: 16, cursor: 'pointer', opacity: p.isActive ? 1 : 0.8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8, gap: 6 }}>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 11, color: 'var(--muted)' }}>{p.periodKey}</span>
                      {isPD(p) && <span style={{ fontSize: 10, background: 'var(--tag-bg)', color: 'var(--accent)', borderRadius: 10, padding: '2px 8px' }}>📜 원문</span>}
                      {isCurator(p) && <span style={{ fontSize: 10, background: 'var(--tag-bg)', color: 'var(--muted)', borderRadius: 10, padding: '2px 8px' }}>✍️ 소개</span>}
                    </div>
                    {p.isActive && <span style={{ fontSize: 10, background: 'var(--accent)', color: '#fff', borderRadius: 10, padding: '2px 8px' }}>현재</span>}
                  </div>
                  <p style={{ fontFamily: 'var(--font-serif)', fontSize: 14, lineHeight: 1.7, color: 'var(--text)', marginBottom: 8, whiteSpace: 'pre-line' }}>
                    {quoted ? `"${t.slice(0, 80)}${t.length > 80 ? '…' : ''}"` : `${t.slice(0, 80)}${t.length > 80 ? '…' : ''}`}
                  </p>
                  <p style={{ fontSize: 12, color: 'var(--muted)' }}>
                    — {p.bookTitle}{p.bookAuthor ? ` / ${p.bookAuthor}` : ''}
                  </p>
                  {p.questions?.length > 0 && (
                    <p style={{ fontSize: 11, color: 'var(--accent)', marginTop: 6 }}>💬 질문 {p.questions.length}개</p>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
