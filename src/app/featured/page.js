'use client';
import { useEffect, useState } from 'react';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { mapDocs } from '@/lib/firestore';
import Link from 'next/link';
import { NotebookPen, Calendar, CalendarDays, ScrollText, PenLine, MessageCircle, ArrowRight } from 'lucide-react';
import styles from './featured-list.module.css';

export default function FeaturedPage() {
  const [passages, setPassages] = useState([]);
  const [tab, setTab] = useState('weekly');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const snap = await getDocs(query(collection(db, 'featuredPassages'), orderBy('createdAt', 'desc')));
      setPassages(mapDocs(snap));
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
      <h1 className={styles.heading}>
        <NotebookPen size={20} /> 이 주/달의 글
      </h1>
      <p className={styles.subheading}>
        책에서 길어올린 한 구절, 그리고 함께 나눌 질문들.
      </p>

      {active && (() => {
        const t = previewText(active);
        const quoted = isPD(active);
        return (
          <Link href={`/featured/${active.id}`} className={styles.activeLink}>
            <div className={`card ${styles.activeCard}`}>
              <div className={styles.activeTopRow}>
                <span className={styles.periodTag}>{active.period === 'weekly' ? <><Calendar size={12} /> 이 주의 글</> : <><CalendarDays size={12} /> 이 달의 글</>}</span>
                {isPD(active) && <span className={styles.kindBadgePD}><ScrollText size={10} /> 원문</span>}
                {isCurator(active) && <span className={styles.kindBadgeCurator}><PenLine size={10} /> 소개</span>}
              </div>
              <p className={styles.activeExcerpt}>
                {quoted ? `"${t.slice(0, 120)}${t.length > 120 ? '…' : ''}"` : `${t.slice(0, 120)}${t.length > 120 ? '…' : ''}`}
              </p>
              <p className={styles.sourceText}>
                — {active.bookTitle}{active.bookAuthor ? ` / ${active.bookAuthor}` : ''}
              </p>
              {active.questions?.length > 0 && (
                <p className={styles.activeQuestions}>
                  <MessageCircle size={12} /> 토론 질문 {active.questions.length}개 <ArrowRight size={12} />
                </p>
              )}
            </div>
          </Link>
        );
      })()}

      <div className={styles.tabBar}>
        {[['weekly', <><Calendar size={13} /> 주간</>], ['monthly', <><CalendarDays size={13} /> 월간</>]].map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)}
            className={styles.tabBtn} data-active={tab === key || undefined}>
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="empty-msg">로딩 중…</p>
      ) : filtered.length === 0 ? (
        <p className="empty-msg">아직 등록된 글이 없어요.</p>
      ) : (
        <div className={styles.list}>
          {filtered.map(p => {
            const t = previewText(p);
            const quoted = isPD(p);
            return (
              <Link key={p.id} href={`/featured/${p.id}`} className={styles.activeLink}>
                <div className={`card ${styles.listCard}`} data-active={p.isActive || undefined}>
                  <div className={styles.listTopRow}>
                    <div className={styles.listTopLeft}>
                      <span className={styles.periodKeyText}>{p.periodKey}</span>
                      {isPD(p) && <span className={styles.kindBadgePD}><ScrollText size={10} /> 원문</span>}
                      {isCurator(p) && <span className={styles.kindBadgeCurator}><PenLine size={10} /> 소개</span>}
                    </div>
                    {p.isActive && <span className={styles.activeNowBadge}>현재</span>}
                  </div>
                  <p className={styles.listExcerpt}>
                    {quoted ? `"${t.slice(0, 80)}${t.length > 80 ? '…' : ''}"` : `${t.slice(0, 80)}${t.length > 80 ? '…' : ''}`}
                  </p>
                  <p className={styles.sourceText}>
                    — {p.bookTitle}{p.bookAuthor ? ` / ${p.bookAuthor}` : ''}
                  </p>
                  {p.questions?.length > 0 && (
                    <p className={styles.listQuestions}><MessageCircle size={11} /> 질문 {p.questions.length}개</p>
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
