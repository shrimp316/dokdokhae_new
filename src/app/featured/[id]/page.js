'use client';
import { useEffect, useState, use } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/AuthContext';
import { useRouter } from 'next/navigation';
import { shareLink } from '@/lib/share';
import CommentSection from '@/components/CommentSection';
import { ArrowLeft, Calendar, CalendarDays, ScrollText, PenLine, Bot, MessageCircle } from 'lucide-react';
import styles from './featured-detail.module.css';

export default function FeaturedDetailPage({ params }) {
  const { id } = use(params);
  const router = useRouter();
  const { profile } = useAuth();
  const isAdmin = profile?.role === 'admin';

  const [passage, setPassage] = useState(null);

  useEffect(() => {
    getDoc(doc(db, 'featuredPassages', id)).then(snap => {
      if (snap.exists()) setPassage({ id: snap.id, ...snap.data() });
    });
  }, [id]);

  function handleShare() {
    shareLink({ title: passage.bookTitle, url: window.location.href });
  }

  if (!passage) return <div className="empty-msg">로딩 중…</div>;

  return (
    <div>
      <button onClick={() => router.push('/featured')} className={styles.backBtn}>
        <ArrowLeft size={14} /> 목록으로
      </button>

      <div className={styles.periodBadge}>
        {passage.period === 'weekly' ? <><Calendar size={11} /> 이 주의 글</> : <><CalendarDays size={11} /> 이 달의 글</>} · {passage.periodKey}
      </div>

      {/* 저작권 때문에 kind마다 보여주는 방식이 다르다.
          public_domain은 보호기간이 끝난 원문이라 인용하고, curator_intro는 원문이 아닌 소개임을 밝힌다.
          kind가 없는 것은 예전 형식(passage 필드)이다. */}
      <div className={`card ${styles.passageCard}`}>
        {passage.kind === 'public_domain' && passage.excerpt ? (
          <>
            <p className={styles.excerptQuote}>
              "{passage.excerpt}"
            </p>
            {passage.curatorNote && (
              <p className={styles.curatorNoteQuoted}>
                {passage.curatorNote}
              </p>
            )}
            <div className={styles.metaFooter}>
              <span className={styles.kindBadge}><ScrollText size={10} /> 자유 이용</span>
              <p className={styles.bookTitleMeta}>{passage.bookTitle}</p>
              {passage.bookAuthor && <p className={styles.bookAuthorMeta}>{passage.bookAuthor}</p>}
              {passage.sourceUrl && (
                <p className={styles.sourceUrlText}>
                  출처: <a href={passage.sourceUrl} target="_blank" rel="noopener noreferrer" className={styles.sourceUrlLink}>{passage.sourceUrl}</a>
                </p>
              )}
              {passage.source && <p className={styles.sourceText}>{passage.source}</p>}
              <p className={styles.licenseNote}>공표 후 보호기간 만료 저작물 — 자유롭게 이용 가능</p>
            </div>
          </>
        ) : passage.kind === 'curator_intro' ? (
          <>
            {passage.curatorNote && (
              <p className={styles.curatorNoteMain}>
                {passage.curatorNote}
              </p>
            )}
            {passage.excerpt && (
              <div className={styles.quoteBox}>
                <p className={styles.quoteBoxText}>
                  "{passage.excerpt}"
                </p>
                {passage.source && <p className={styles.quoteBoxSource}>— {passage.source}</p>}
              </div>
            )}
            <div className={styles.metaFooter}>
              <span className={styles.kindBadgeMuted}><PenLine size={10} /> 큐레이터 소개</span>
              {passage.aiGenerated?.curatorNote && <span className={styles.aiBadge}><Bot size={10} /> AI 큐레이션</span>}
              <p className={styles.bookTitleMeta}>{passage.bookTitle}</p>
              {passage.bookAuthor && <p className={styles.bookAuthorMeta}>{passage.bookAuthor}</p>}
              <p className={styles.licenseNote}>이 글은 책에 대한 큐레이터의 소개이며, 책의 원문 발췌가 아닙니다.</p>
            </div>
          </>
        ) : (
          <>
            <p className={styles.excerptQuote}>
              "{passage.passage}"
            </p>
            <div className={styles.metaFooter}>
              <p className={styles.bookTitleMetaTight}>{passage.bookTitle}</p>
              {passage.bookAuthor && <p className={styles.bookAuthorMeta}>{passage.bookAuthor}</p>}
              {passage.source && <p className={styles.sourceUrlText}>출처: {passage.source}</p>}
            </div>
          </>
        )}

        <div className={styles.shareRow}>
          <button onClick={handleShare} className={styles.shareBtn}>
            공유
          </button>
        </div>
      </div>

      {passage.questions?.length > 0 && (
        <div className={`card ${styles.questionsCard}`}>
          <h2 className={styles.questionsTitle}><MessageCircle size={14} /> 함께 나눠볼 질문</h2>
          <ol className={styles.questionsList}>
            {passage.questions.map((q, i) => (
              <li key={i} className={styles.questionItem}>
                <span className={styles.questionNum}>{i + 1}.</span>
                <span className={styles.questionText}>{q}</span>
              </li>
            ))}
          </ol>
        </div>
      )}

      <div className={`card ${styles.commentsCard}`}>
        <CommentSection collectionName="featuredPassages" postId={id} isAdmin={isAdmin} />
      </div>
    </div>
  );
}
