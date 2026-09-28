'use client';
import { useEffect, useState } from 'react';
import { collection, getDocs, query, where, orderBy, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { dangerousHtml } from '@/lib/sanitize.client';
import ContentLightbox from '@/components/ContentLightbox';
import { bookColors } from '@/lib/bookColors';
import { Pin, X, ArrowRight } from 'lucide-react';
import styles from './page.module.css';

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
    return <div className={styles.coverPlaceholder} />;
  }
  if (featured.cover && /^https?:\/\//.test(featured.cover)) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={featured.cover}
        alt={featured.title}
        className={styles.coverImg}
      />
    );
  }
  // 표지 이미지가 없어도 빈칸으로 두지 않고 책마다 고정된 색으로 표지를 그린다.
  return (
    <div
      className={styles.coverGradient}
      style={{ background: `linear-gradient(160deg, ${c.cover} 0%, ${c.color} 60%, ${c.spine} 100%)` }}
    >
      <div className={styles.coverOverlay}>
        <div className={styles.coverTitle}>
          {featured.title}
        </div>
        <div className={styles.coverAuthor}>
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
    <div className={styles.page}>
      <section className={styles.masthead}>
        <div className={styles.mastheadRow}>
          <span className={styles.mastheadLabel}>
            This Month · 이 달의 책
          </span>
          <span className={styles.mastheadDivider} />
          <span className={styles.issueNo}>
            NO. {issueNo}
          </span>
        </div>

        <h1 className={styles.title}>
          {featured?.title ? (
            <>
              {(() => {
                const t = featured.title;
                // 잡지 표지처럼 제목 끝 몇 글자를 다음 줄에 강조색으로 둔다.
                const split = Math.max(0, t.length - 3);
                const head = t.slice(0, split);
                const tail = t.slice(split);
                return (
                  <>
                    {head}
                    <br />
                    <em className={styles.titleAccent}>{tail || t}</em>
                  </>
                );
              })()}
            </>
          ) : (
            <em className={styles.titleAccent}>독독한 독서</em>
          )}
        </h1>

        <div
          className={`dd-home-hero ${styles.heroGrid}`}
        >
          <MonthIssue featured={featured} />

          <div className={styles.bookInfoCol}>
            <div className={styles.bookMeta}>
              {[featured?.author, featured?.genre, featured?.year]
                .filter(Boolean)
                .join(' · ') || '도서 정보 준비 중'}
            </div>
            <p className={styles.bookIntro}>
              {intro}
            </p>
            {featured?.id && (
              <button
                type="button"
                onClick={() => router.push(`/books/${featured.id}`)}
                className={styles.bookPageBtn}
              >
                도서 페이지 <ArrowRight size={12} />
              </button>
            )}
          </div>

          <div className={styles.meetingCol}>
            {nextMeeting ? (
              <>
                <div className={styles.meetingCard}>
                  <div className={styles.meetingLabel}>
                    NEXT MEETING
                  </div>
                  <div className={styles.meetingDday}>
                    {ddayLabel}
                  </div>
                  <div className={styles.meetingDate}>
                    {formatKDate(nextMeeting.date)}
                  </div>
                  <div className={styles.meetingTime}>
                    {formatKTime(nextMeeting.date)}
                    {nextMeeting.location ? ` · ${nextMeeting.location}` : ''}
                  </div>
                </div>
                <Link
                  href="/schedule"
                  className={styles.meetingLink}
                >
                  <span className={styles.meetingLinkLabel}>다음 모임 <ArrowRight size={12} /></span>
                  {nextMeeting.title || nextMeeting.label || '모임'}
                </Link>
              </>
            ) : (
              <div className={styles.meetingEmpty}>
                예정된 모임이 없어요.
              </div>
            )}
          </div>
        </div>
      </section>

      <section
        className={`dd-home-bottom ${styles.bottomGrid}`}
      >
        {activePassage ? (
          <Link
            href={`/featured/${activePassage.id}`}
            className={styles.passageLink}
          >
            <article className={styles.passageCard}>
              <div className={styles.passageTop}>
                <span className="tag">{activePassage.period === 'weekly' ? '이 주의 글' : '이 달의 글'}</span>
                {activePassage.questions?.length > 0 && (
                  <span className={styles.passageQCount}>
                    질문 {activePassage.questions.length}개
                  </span>
                )}
              </div>
              <h3 className={styles.passageTitle}>
                {activePassage.bookTitle || '제목 없음'}
              </h3>
              <p className={styles.passageExcerpt}>
                {activePassage.excerpt || activePassage.curatorNote || activePassage.passage || ''}
              </p>
              <div className={styles.passageFooter}>
                <span>— {activePassage.bookTitle}{activePassage.bookAuthor ? ` / ${activePassage.bookAuthor}` : ''}</span>
                <span className={styles.passageReadLink}>읽기 <ArrowRight size={11} /></span>
              </div>
            </article>
          </Link>
        ) : (
          <div className={styles.passageEmpty}>
            이 주의 글이 아직 준비되지 않았어요.
          </div>
        )}

        <div className={styles.noticeCol}>
          <h2 className={styles.noticeHeading}>
            <span className={styles.noticeHeadingTag}>
              N.B.
            </span>
            공지사항
          </h2>
          {noticeList.length === 0 && (
            <div className={styles.noticeEmpty}>
              등록된 공지가 없어요.
            </div>
          )}
          {noticeList.map((n) => (
            <Link
              key={n.id}
              href={`/notice/${n.id}`}
              className={styles.noticeRow}
            >
              {n.pinned && <Pin size={11} className={styles.noticePinIcon} />}
              <div className={styles.noticeRowBody}>
                <div className={styles.noticeRowTitle}>
                  {n.title}
                </div>
                <div className={styles.noticeRowDate}>
                  {n.createdAt?.toDate
                    ? `${n.createdAt.toDate().getFullYear()}.${n.createdAt.toDate().getMonth() + 1}.${n.createdAt.toDate().getDate()}`
                    : ''}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {(featured?.quote || featured?.excerpt) && (
        <section className={styles.quoteBand}>
          <span className={styles.quoteLabel}>
            QUOTE OF THE WEEK
          </span>
          <p className={styles.quoteText}>
            “{featured.quote || featured.excerpt}”
          </p>
          <span className={styles.quoteAttribution}>
            — {featured.author}, 『{featured.title}』
          </span>
        </section>
      )}

      {/* 고정 공지 모달: 지금은 noticeOpen을 켜는 곳이 없어 열리지 않는다.
          다시 쓸 계획이 없으면 pinnedNotice 쿼리와 함께 제거한다. */}
      {noticeOpen && pinnedNotice && (
        <div className="modal-overlay" onClick={() => setNoticeOpen(false)}>
          <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>
                {pinnedNotice.title}
              </h2>
              <button
                type="button"
                onClick={() => setNoticeOpen(false)}
                className={styles.modalCloseBtn}
              >
                <X size={20} />
              </button>
            </div>
            <ContentLightbox contentClassName={`notice-content ${styles.modalContent}`}>
              <div dangerouslySetInnerHTML={dangerousHtml(pinnedNotice.content)} />
            </ContentLightbox>
            <div className={styles.modalFooter}>
              <Link
                href={`/notice/${pinnedNotice.id}`}
                className={styles.modalViewAllLink}
                onClick={() => setNoticeOpen(false)}
              >
                전체 보기 <ArrowRight size={13} />
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
