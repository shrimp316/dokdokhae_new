'use client';
import { useEffect, useState } from 'react';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import Link from 'next/link';

function formatDateTime(str) {
  if (!str) return '';
  const d = new Date(str);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd} ${hh}:00`;
}

export default function HomePage() {
  const [featured, setFeatured] = useState(null);
  const [nextMeeting, setNextMeeting] = useState(null);
  const [pinnedNotice, setPinnedNotice] = useState(null);
  const [noticeOpen, setNoticeOpen] = useState(false);
  const [activePassage, setActivePassage] = useState(null);

  useEffect(() => {
    async function load() {
      // 이달의 책
      const bookSnap = await getDocs(query(collection(db, 'books'), where('featured', '==', true)));
      if (!bookSnap.empty) setFeatured({ id: bookSnap.docs[0].id, ...bookSnap.docs[0].data() });

      // 다음 모임
      const meetSnap = await getDocs(query(collection(db, 'meetings'), orderBy('date', 'asc')));
      const meetings = meetSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      const upcoming = meetings.filter(m => m.date && new Date(m.date) >= new Date());
      if (upcoming.length) setNextMeeting(upcoming[0]);

      // 고정 공지
      try {
        const noticeSnap = await getDocs(query(collection(db, 'notices'), where('pinned', '==', true), orderBy('createdAt', 'desc')));
        if (!noticeSnap.empty) setPinnedNotice({ id: noticeSnap.docs[0].id, ...noticeSnap.docs[0].data() });
      } catch {}

      // 이 주/달의 글
      try {
        const passageSnap = await getDocs(query(collection(db, 'featuredPassages'), where('isActive', '==', true)));
        if (!passageSnap.empty) setActivePassage({ id: passageSnap.docs[0].id, ...passageSnap.docs[0].data() });
      } catch {}
    }
    load();
  }, []);

  const diff = nextMeeting ? Math.ceil((new Date(nextMeeting.date) - new Date()) / (1000 * 60 * 60 * 24)) : null;
  const dday = diff === null ? null : diff === 0 ? 'D-Day!' : diff > 0 ? `D-${diff}` : `D+${Math.abs(diff)}`;

  return (
    <div>
      {/* 고정 공지 배너 */}
      {pinnedNotice && (
        <div className="notice-banner" onClick={() => setNoticeOpen(true)}>
          <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--accent2)', flexShrink: 0 }}>📢 공지</span>
          <span style={{ fontSize: 13, flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{pinnedNotice.title}</span>
          <span style={{ fontSize: 18, color: 'var(--muted)', flexShrink: 0 }}>›</span>
        </div>
      )}

      {/* 이 주/달의 글 배너 */}
      {activePassage && (
        <Link href={`/featured/${activePassage.id}`} style={{ textDecoration: 'none', display: 'block', marginBottom: 16 }}>
          <div className="card" style={{ padding: 18, borderLeft: '3px solid var(--accent2)', cursor: 'pointer' }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--accent2)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
              {activePassage.period === 'weekly' ? '📝 이 주의 글' : '📝 이 달의 글'}
            </div>
            <p style={{ fontFamily: 'var(--font-serif)', fontSize: 14, lineHeight: 1.8, color: 'var(--text)', marginBottom: 8, whiteSpace: 'pre-line' }}>
              "{activePassage.passage?.slice(0, 100)}{activePassage.passage?.length > 100 ? '…' : ''}"
            </p>
            <p style={{ fontSize: 12, color: 'var(--muted)' }}>
              — {activePassage.bookTitle}{activePassage.bookAuthor ? ` / ${activePassage.bookAuthor}` : ''}
              {activePassage.questions?.length > 0 && <span style={{ color: 'var(--accent)', marginLeft: 8 }}>· 💬 질문 {activePassage.questions.length}개</span>}
            </p>
          </div>
        </Link>
      )}

      {/* 이달의 책 */}
      {featured ? (
        <Link href={`/books/${featured.id}`} style={{ textDecoration: 'none', display: 'block', marginBottom: 16 }}>
          <div className="card" style={{ padding: 20, cursor: 'pointer' }}>
            <div style={{ fontSize: 11, fontWeight: 500, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--accent2)', marginBottom: 14 }}>📖 이 달의 책</div>
            <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
              {featured.cover ? (
                <img src={featured.cover} alt={featured.title} style={{ width: 90, height: 130, objectFit: 'cover', borderRadius: 6, boxShadow: '2px 4px 12px rgba(0,0,0,0.15)', flexShrink: 0 }} />
              ) : (
                <div style={{ width: 90, height: 130, background: 'var(--tag-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, borderRadius: 6, flexShrink: 0 }}>📚</div>
              )}
              <div>
                <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 17, fontWeight: 700, lineHeight: 1.4, marginBottom: 6 }}>{featured.title}</h2>
                <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 4 }}>{featured.author}</p>
                {featured.genre && <span className="tag">{featured.genre}</span>}
                {featured.description && <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 8, lineHeight: 1.5 }}>{featured.description}</p>}
              </div>
            </div>
          </div>
        </Link>
      ) : (
        <div className="card" style={{ padding: 30, textAlign: 'center', color: 'var(--muted)', marginBottom: 16 }}>이 달의 책이 아직 선정되지 않았어요.</div>
      )}

      {/* D-day */}
      {nextMeeting && (
  <div className="dday-card">
    <div style={{ fontFamily: 'var(--font-serif)', fontSize: 28, fontWeight: 700, minWidth: 60, flexShrink: 0 }}>{dday}</div>
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {formatDateTime(nextMeeting.date)}{nextMeeting.dateEnd ? ` ~ ${formatDateTime(nextMeeting.dateEnd)}` : ''}
      </div>
      {nextMeeting.location && <div style={{ fontSize: 12, opacity: 0.8 }}>{nextMeeting.location}</div>}
    </div>
  </div>
)}

      {/* 기타 공지 버튼 */}
      <Link href="/notice" style={{
        display: 'block', width: '100%', padding: 12,
        background: 'var(--card)', border: '1.5px solid var(--line)',
        borderRadius: 'var(--radius)', fontSize: 13, color: 'var(--muted)',
        textAlign: 'center', textDecoration: 'none',
        transition: 'all 0.15s',
      }}>
        📋 기타 공지 보기
      </Link>

      {/* 고정 공지 상세 박스 */}
      {noticeOpen && pinnedNotice && (
        <div className="modal-overlay" onClick={() => setNoticeOpen(false)}>
          <div className="modal-sheet" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 18, color: 'var(--accent)' }}>{pinnedNotice.title}</h2>
              <button onClick={() => setNoticeOpen(false)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--muted)' }}>✕</button>
            </div>
            <div style={{ fontSize: 14, lineHeight: 1.8, whiteSpace: 'pre-wrap' }} dangerouslySetInnerHTML={{ __html: pinnedNotice.content }} />
            <div style={{ marginTop: 16, textAlign: 'right' }}>
              <Link href={`/notice/${pinnedNotice.id}`} style={{ fontSize: 13, color: 'var(--accent)', textDecoration: 'underline' }} onClick={() => setNoticeOpen(false)}>
                전체 보기 →
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
