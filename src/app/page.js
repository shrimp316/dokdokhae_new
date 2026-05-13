'use client';
import { useEffect, useState } from 'react';
import { collection, getDocs, query, where, orderBy, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { dangerousHtml } from '@/lib/sanitize';
import ContentLightbox from '@/components/ContentLightbox';
import { bookColors } from '@/lib/bookColors';

function formatKDate(str) {
  if (!str) return '';
  const d = new Date(str);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}
function formatKTime(str) {
  if (!str) return '';
  const d = new Date(str);
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  return `${hh}:${mi}`;
}

function MonthIssue({ featured }) {
  const c = bookColors(featured);
  if (!featured) {
    return (
      <div
        style={{
          width: 140, height: 199, flex: '0 0 auto',
          background: 'var(--dd-accent-soft)',
          border: '1px solid var(--dd-border)',
          borderRadius: 2,
        }}
      />
    );
  }
  if (featured.cover && /^https?:\/\//.test(featured.cover)) {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={featured.cover}
        alt={featured.title}
        style={{
          width: 140, height: 199, objectFit: 'cover', flex: '0 0 auto',
          borderRadius: 2,
          boxShadow: '0 8px 18px -8px rgba(0,0,0,.35)',
        }}
      />
    );
  }
  // SVG cover placeholder driven by hashed palette.
  return (
    <div
      style={{
        width: 140, height: 199, flex: '0 0 auto', position: 'relative',
        background: `linear-gradient(160deg, ${c.cover} 0%, ${c.color} 60%, ${c.spine} 100%)`,
        boxShadow: '0 1px 0 rgba(255,255,255,.25) inset, 0 8px 18px -8px rgba(0,0,0,.35)',
        borderRadius: 2,
      }}
    >
      <div
        style={{
          position: 'absolute', inset: 6,
          border: '1px solid rgba(255,255,255,.18)',
          padding: 8, display: 'flex', flexDirection: 'column', gap: 4,
        }}
      >
        <div
          style={{
            fontFamily: 'var(--dd-serif)',
            fontSize: 15, lineHeight: 1.2,
            color: 'rgba(255,255,255,.92)', fontWeight: 500,
            letterSpacing: '-0.01em',
            wordBreak: 'keep-all',
            textShadow: '0 1px 2px rgba(0,0,0,.2)',
          }}
        >
          {featured.title}
        </div>
        <div
          style={{
            fontSize: 11, color: 'rgba(255,255,255,.65)', marginTop: 'auto',
          }}
        >
          {featured.author}
        </div>
      </div>
    </div>
  );
}

export default function HomePage() {
  const [featured, setFeatured] = useState(null);
  const [nextMeeting, setNextMeeting] = useState(null);
  const [pinnedNotice, setPinnedNotice] = useState(null);
  const [noticeOpen, setNoticeOpen] = useState(false);
  const [activePassage, setActivePassage] = useState(null);
  const [noticeList, setNoticeList] = useState([]);
  const router = useRouter();

  useEffect(() => {
    async function load() {
      try {
        const bookSnap = await getDocs(query(collection(db, 'books'), where('featured', '==', true), limit(1)));
        if (!bookSnap.empty) setFeatured({ id: bookSnap.docs[0].id, ...bookSnap.docs[0].data() });
      } catch {}

      try {
        const meetSnap = await getDocs(query(collection(db, 'meetings'), orderBy('date', 'asc')));
        const meetings = meetSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
        const upcoming = meetings.filter((m) => m.date && new Date(m.date) >= new Date());
        if (upcoming.length) setNextMeeting(upcoming[0]);
      } catch {}

      try {
        const noticeSnap = await getDocs(query(collection(db, 'notices'), where('pinned', '==', true), orderBy('createdAt', 'desc')));
        if (!noticeSnap.empty) setPinnedNotice({ id: noticeSnap.docs[0].id, ...noticeSnap.docs[0].data() });
      } catch {}

      try {
        const allNotices = await getDocs(query(collection(db, 'notices'), orderBy('createdAt', 'desc'), limit(4)));
        setNoticeList(allNotices.docs.map((d) => ({ id: d.id, ...d.data() })));
      } catch {}

      try {
        const passageSnap = await getDocs(query(collection(db, 'featuredPassages'), where('isActive', '==', true), limit(1)));
        if (!passageSnap.empty) setActivePassage({ id: passageSnap.docs[0].id, ...passageSnap.docs[0].data() });
      } catch {}
    }
    load();
  }, []);

  const diff = nextMeeting
    ? Math.ceil((new Date(nextMeeting.date) - new Date()) / (1000 * 60 * 60 * 24))
    : null;
  const ddayLabel =
    diff === null ? '' : diff === 0 ? 'D-Day' : diff > 0 ? `D-${diff}` : `D+${Math.abs(diff)}`;

  const intro =
    featured?.description ||
    featured?.intro ||
    '이번 달 함께 읽고 있는 책입니다. 도서 페이지에서 인용과 회원 감상을 확인하세요.';

  const issueNo = String(new Date().getMonth() + 1).padStart(3, '0');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 48 }}>
      {/* ── Masthead ── */}
      <section style={{ position: 'relative' }}>
        <div
          style={{
            display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 12,
          }}
        >
          <span
            style={{
              fontFamily: 'var(--dd-serif)', fontSize: 11,
              color: 'var(--dd-accent)', letterSpacing: '0.3em',
              textTransform: 'uppercase', whiteSpace: 'nowrap',
            }}
          >
            This Month · 이 달의 책
          </span>
          <span style={{ flex: 1, height: 1, background: 'var(--dd-border)' }} />
          <span
            style={{
              fontSize: 11, color: 'var(--dd-text-muted)',
              fontFamily: 'var(--dd-serif)', letterSpacing: '0.15em',
              whiteSpace: 'nowrap',
            }}
          >
            NO. {issueNo}
          </span>
        </div>

        <h1
          style={{
            fontFamily: 'var(--dd-serif)', fontSize: 'var(--dd-h1)',
            fontWeight: 500, margin: 0, color: 'var(--dd-text)',
            letterSpacing: '-0.03em', lineHeight: 1.02,
          }}
        >
          {featured?.title ? (
            <>
              {(() => {
                const t = featured.title;
                // Highlight last 2~3 chars in italic accent.
                const split = Math.max(0, t.length - 3);
                const head = t.slice(0, split);
                const tail = t.slice(split);
                return (
                  <>
                    {head}
                    <br />
                    <em style={{ fontStyle: 'italic', color: 'var(--dd-accent)' }}>{tail || t}</em>
                  </>
                );
              })()}
            </>
          ) : (
            <em style={{ fontStyle: 'italic', color: 'var(--dd-accent)' }}>독독한 독서</em>
          )}
        </h1>

        <div
          className="dd-home-hero"
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 160px) minmax(0, 1fr) minmax(0, 220px)',
            gap: 36, marginTop: 28, alignItems: 'start',
          }}
        >
          <MonthIssue featured={featured} />

          <div style={{ minWidth: 0 }}>
            <div
              style={{
                fontFamily: 'var(--dd-serif)', fontSize: 13,
                color: 'var(--dd-text-muted)', letterSpacing: '0.08em',
                marginBottom: 12,
              }}
            >
              {[featured?.author, featured?.genre, featured?.year]
                .filter(Boolean)
                .join(' · ') || '도서 정보 준비 중'}
            </div>
            <p
              style={{
                fontFamily: 'var(--dd-serif)', fontSize: 15,
                lineHeight: 1.65, color: 'var(--dd-text)',
                margin: 0, letterSpacing: '-0.005em',
              }}
            >
              {intro}
            </p>
            {featured?.id && (
              <button
                type="button"
                onClick={() => router.push(`/books/${featured.id}`)}
                style={{
                  marginTop: 22, padding: '10px 18px',
                  background: 'transparent',
                  border: '1px solid var(--dd-accent)',
                  color: 'var(--dd-accent)', cursor: 'pointer',
                  fontFamily: 'var(--dd-sans)', fontSize: 12,
                  letterSpacing: '0.08em', borderRadius: 0,
                }}
              >
                도서 페이지 →
              </button>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {nextMeeting ? (
              <>
                <div
                  style={{
                    padding: 18, background: 'var(--dd-accent)',
                    color: 'var(--dd-surface)',
                    display: 'flex', flexDirection: 'column', gap: 4,
                  }}
                >
                  <div style={{ fontSize: 10, letterSpacing: '0.3em', opacity: 0.7 }}>
                    NEXT MEETING
                  </div>
                  <div
                    style={{
                      fontFamily: 'var(--dd-serif)', fontSize: 36, fontWeight: 500,
                      lineHeight: 1, letterSpacing: '-0.02em',
                    }}
                  >
                    {ddayLabel}
                  </div>
                  <div style={{ fontSize: 11, opacity: 0.85, marginTop: 6 }}>
                    {formatKDate(nextMeeting.date)}
                  </div>
                  <div style={{ fontSize: 11, opacity: 0.85 }}>
                    {formatKTime(nextMeeting.date)}
                    {nextMeeting.location ? ` · ${nextMeeting.location}` : ''}
                  </div>
                </div>
                <Link
                  href="/schedule"
                  style={{
                    padding: 12, background: 'var(--dd-surface)',
                    border: '1px solid var(--dd-border)',
                    color: 'var(--dd-text)', cursor: 'pointer', fontSize: 12,
                    fontFamily: 'var(--dd-sans)', textAlign: 'left',
                    textDecoration: 'none',
                  }}
                >
                  <span style={{ color: 'var(--dd-text-muted)' }}>다음 모임 → </span>
                  {nextMeeting.title || nextMeeting.label || '모임'}
                </Link>
              </>
            ) : (
              <div
                style={{
                  padding: 18, background: 'var(--dd-surface)',
                  border: '1px solid var(--dd-border)',
                  color: 'var(--dd-text-muted)', fontSize: 12,
                  fontFamily: 'var(--dd-serif)', fontStyle: 'italic',
                }}
              >
                예정된 모임이 없어요.
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── This week / 공지 ── */}
      <section
        className="dd-home-bottom"
        style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 36 }}
      >
        {activePassage ? (
          <Link
            href={`/featured/${activePassage.id}`}
            style={{ textDecoration: 'none', color: 'inherit' }}
          >
            <article
              style={{
                padding: 24, background: 'var(--dd-surface)',
                border: '1px solid var(--dd-border)', borderRadius: 2, cursor: 'pointer',
                height: '100%', boxSizing: 'border-box',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <span className="tag">{activePassage.period === 'weekly' ? '이 주의 글' : '이 달의 글'}</span>
                {activePassage.questions?.length > 0 && (
                  <span style={{ fontSize: 11, color: 'var(--dd-text-muted)' }}>
                    질문 {activePassage.questions.length}개
                  </span>
                )}
              </div>
              <h3
                style={{
                  fontFamily: 'var(--dd-serif)', fontSize: 22, fontWeight: 500,
                  margin: '0 0 10px',
                  color: 'var(--dd-text)', letterSpacing: '-0.02em', lineHeight: 1.2,
                }}
              >
                {activePassage.bookTitle || '제목 없음'}
              </h3>
              <p
                style={{
                  fontSize: 13, lineHeight: 1.7, color: 'var(--dd-text)',
                  margin: 0, fontFamily: 'var(--dd-sans)',
                  display: '-webkit-box', WebkitLineClamp: 4,
                  WebkitBoxOrient: 'vertical', overflow: 'hidden',
                }}
              >
                {activePassage.excerpt || activePassage.curatorNote || activePassage.passage || ''}
              </p>
              <div
                style={{
                  display: 'flex', justifyContent: 'space-between',
                  marginTop: 16, fontSize: 11, color: 'var(--dd-text-muted)',
                }}
              >
                <span>— {activePassage.bookTitle}{activePassage.bookAuthor ? ` / ${activePassage.bookAuthor}` : ''}</span>
                <span>읽기 →</span>
              </div>
            </article>
          </Link>
        ) : (
          <div
            style={{
              padding: 24, background: 'var(--dd-surface)',
              border: '1px solid var(--dd-border)', borderRadius: 2,
              color: 'var(--dd-text-muted)', fontFamily: 'var(--dd-serif)',
              fontStyle: 'italic',
            }}
          >
            이 주의 글이 아직 준비되지 않았어요.
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <h2
            style={{
              fontFamily: 'var(--dd-serif)', fontSize: 22, fontWeight: 500,
              color: 'var(--dd-text)', letterSpacing: '-0.02em',
              marginBottom: 14, paddingBottom: 8, borderBottom: '1px solid var(--dd-border)',
              display: 'flex', alignItems: 'baseline', gap: 12,
            }}
          >
            <span
              style={{
                fontSize: 14, color: 'var(--dd-text-muted)',
                letterSpacing: '0.05em',
              }}
            >
              N.B.
            </span>
            공지사항
          </h2>
          {noticeList.length === 0 && (
            <div
              style={{
                color: 'var(--dd-text-muted)', fontStyle: 'italic',
                fontFamily: 'var(--dd-serif)', padding: '8px 0',
              }}
            >
              등록된 공지가 없어요.
            </div>
          )}
          {noticeList.map((n, i) => (
            <Link
              key={n.id}
              href={`/notice/${n.id}`}
              style={{
                padding: '12px 0',
                borderBottom: i < noticeList.length - 1 ? '1px dashed var(--dd-border)' : 'none',
                display: 'flex', alignItems: 'baseline', gap: 12,
                textDecoration: 'none', color: 'inherit',
              }}
            >
              {n.pinned && <span style={{ color: 'var(--dd-accent)', fontSize: 10 }}>📌</span>}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 13, color: 'var(--dd-text)',
                    fontFamily: 'var(--dd-serif)', fontWeight: 500,
                    letterSpacing: '-0.01em',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}
                >
                  {n.title}
                </div>
                <div
                  style={{
                    fontSize: 10, color: 'var(--dd-text-muted)', marginTop: 2,
                    letterSpacing: '0.05em',
                  }}
                >
                  {n.createdAt?.toDate
                    ? `${n.createdAt.toDate().getFullYear()}.${n.createdAt.toDate().getMonth() + 1}.${n.createdAt.toDate().getDate()}`
                    : ''}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ── Quote band (only if featured book has quote/excerpt) ── */}
      {(featured?.quote || featured?.excerpt) && (
        <section
          style={{
            padding: '32px 0',
            borderTop: '1px solid var(--dd-border)',
            borderBottom: '1px solid var(--dd-border)',
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            textAlign: 'center', gap: 12,
          }}
        >
          <span
            style={{
              fontSize: 10, color: 'var(--dd-text-muted)',
              letterSpacing: '0.4em',
            }}
          >
            QUOTE OF THE WEEK
          </span>
          <p
            style={{
              fontFamily: 'var(--dd-serif)', fontStyle: 'italic',
              fontSize: 26, color: 'var(--dd-text)',
              margin: 0, lineHeight: 1.35, letterSpacing: '-0.015em',
              maxWidth: 680,
            }}
          >
            “{featured.quote || featured.excerpt}”
          </p>
          <span
            style={{
              fontSize: 11, color: 'var(--dd-text-muted)',
              letterSpacing: '0.08em', fontFamily: 'var(--dd-serif)',
            }}
          >
            — {featured.author}, 『{featured.title}』
          </span>
        </section>
      )}

      {/* Pinned-notice modal (kept from previous behaviour) */}
      {noticeOpen && pinnedNotice && (
        <div className="modal-overlay" onClick={() => setNoticeOpen(false)}>
          <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
            <div
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                marginBottom: 16,
              }}
            >
              <h2
                style={{
                  fontFamily: 'var(--dd-serif)', fontSize: 18,
                  color: 'var(--dd-accent)',
                }}
              >
                {pinnedNotice.title}
              </h2>
              <button
                type="button"
                onClick={() => setNoticeOpen(false)}
                style={{
                  background: 'none', border: 'none', fontSize: 20, cursor: 'pointer',
                  color: 'var(--dd-text-muted)',
                }}
              >
                ✕
              </button>
            </div>
            <ContentLightbox contentStyle={{ fontSize: 14, lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>
              <div dangerouslySetInnerHTML={dangerousHtml(pinnedNotice.content)} />
            </ContentLightbox>
            <div style={{ marginTop: 16, textAlign: 'right' }}>
              <Link
                href={`/notice/${pinnedNotice.id}`}
                style={{ fontSize: 13, color: 'var(--dd-accent)', textDecoration: 'underline' }}
                onClick={() => setNoticeOpen(false)}
              >
                전체 보기 →
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
