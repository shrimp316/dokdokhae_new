'use client';
import { useState } from 'react';
import dynamic from 'next/dynamic';
import { authenticatedJsonFetch } from '@/lib/authenticatedFetch';
import { isEmptyRichHtml } from '@/lib/html';
import { alertIfSanitized } from '@/lib/sanitize.client';
import { uploadImage } from '@/lib/storage';
import StarRating from '@/components/StarRating';
import styles from './ReviewEditForm.module.css';

const QuillEditor = dynamic(() => import('@/components/QuillEditor'), { ssr: false });

// 감상평 카드 자리에 펼쳐지는 수정 폼. 책 상세와 내 감상평 목록이 같이 쓴다.
// 저장에 성공하면 onSaved로 알려, 페이지가 폼을 닫고 목록을 다시 불러오게 한다.
export default function ReviewEditForm({ review, onCancel, onSaved }) {
  const [content, setContent] = useState(review.content || '');
  const [rating, setRating] = useState(review.rating || 0);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (isEmptyRichHtml(content)) { alert('내용을 입력해주세요.'); return; }
    setSaving(true);
    try {
      const result = await authenticatedJsonFetch(`/api/content/reviews/${encodeURIComponent(review.id)}`, {
        method: 'PATCH',
        body: { content, rating },
      });
      alertIfSanitized(result.contentWasSanitized);
      onSaved();
    } catch (error) {
      alert(`저장 실패: ${error.message}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="review-card">
      <StarRating value={rating} onChange={setRating} className={styles.ratingRow} />
      <QuillEditor
        value={content}
        onChange={setContent}
        placeholder="수정할 내용…"
        minHeight={120}
        onImageUpload={(file) => uploadImage('reviews', file)}
      />
      <div className={styles.actions}>
        <button className="btn-sm btn-outline" onClick={onCancel}>취소</button>
        <button className={`btn-sm ${styles.saveBtn}`} onClick={handleSave} disabled={saving}>
          {saving ? '저장 중…' : '수정 완료'}
        </button>
      </div>
    </div>
  );
}
