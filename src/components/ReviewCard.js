'use client';
import { useState } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { useLikes, useComments } from '@/lib/usePostInteractions';
import { stripHtml } from '@/lib/searchUtils';
import { dangerousHtml } from '@/lib/sanitize';
import ContentLightbox from '@/components/ContentLightbox';
import CommentSection from '@/components/CommentSection';

const PREVIEW_LEN = 30;

export default function ReviewCard({
  review,
  bookTitle,
  isAdmin = false,
  showBookTitle = false,
  onEdit,
  onDelete,
}) {
  const { user } = useAuth();
  const [expanded, setExpanded] = useState(false);

  const { liked, likeCount, toggleLike } = useLikes('reviews', review.id, user);
  const { topComments } = useComments('reviews', review.id);

  const owner = user && review.uid === user.uid;
  const canModify = owner || isAdmin;
  const previewText = stripHtml(review.content || '').slice(0, PREVIEW_LEN);

  const stars = (n) => (
    <span style={{ fontSize: 13 }}>
      {[1,2,3,4,5].map(s => (
        <span key={s} className={s <= (n||0) ? 'star-filled' : 'star-empty'}>★</span>
      ))}
    </span>
  );

  return (
    <div className="review-card">
      <div
        style={{ display:'flex', alignItems:'center', justifyContent:'space-between', cursor:'pointer', gap:8 }}
        onClick={() => setExpanded(e => !e)}
      >
        <div style={{ display:'flex', alignItems:'center', gap:10, minWidth:0, flex:1 }}>
          <span style={{ fontSize:13, fontWeight:600, color:'var(--accent)', whiteSpace:'nowrap' }}>{review.nickname || '익명'}</span>
          {stars(review.rating)}
          {showBookTitle && bookTitle && (
            <span className="rc-meta rc-meta-book-title">📖 {bookTitle}</span>
          )}
          {!expanded && previewText && (
            <span className={`rc-meta${showBookTitle ? ' rc-meta-preview-hide-mobile' : ''}`}>
              {previewText}
            </span>
          )}
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:10, fontSize:12, color:'var(--muted)' }}>
          <span>❤ {likeCount}</span>
          <span>💬 {topComments.length}</span>
          <span style={{ fontSize:14 }}>{expanded ? '▾' : '▸'}</span>
        </div>
      </div>

      {expanded && (
        <div style={{ marginTop: 12 }}>
          <ContentLightbox contentClassName="review-content">
            <div dangerouslySetInnerHTML={dangerousHtml(review.content || '')} />
          </ContentLightbox>

          <div style={{ display:'flex', alignItems:'center', gap:10, marginTop: 12 }}>
            <button
              type="button"
              className="btn-sm btn-outline"
              onClick={(e) => { e.stopPropagation(); if (user) { toggleLike(); } else { alert('로그인이 필요해요.'); } }}
            >
              {liked ? '❤️' : '🤍'} {likeCount}
            </button>
            {canModify && (
              <>
                {onEdit && <button type="button" className="btn-sm btn-outline" onClick={(e) => { e.stopPropagation(); onEdit(review); }}>수정</button>}
                {onDelete && <button type="button" className="btn-sm btn-danger" onClick={(e) => { e.stopPropagation(); onDelete(review); }}>삭제</button>}
              </>
            )}
          </div>

          <CommentSection collectionName="reviews" postId={review.id} isAdmin={isAdmin} />
        </div>
      )}
    </div>
  );
}
