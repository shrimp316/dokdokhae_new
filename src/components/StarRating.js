'use client';
import { Star } from 'lucide-react';
import styles from './StarRating.module.css';

const STARS = [1, 2, 3, 4, 5];

// 감상평 별점. onChange가 있으면 누를 수 있는 입력, 없으면 카드에 보여주는 표시용이다.
// 입력과 표시는 원래 색이 달라(입력: 강조 노랑, 표시: 테마 강조색) 각자 색을 유지한다.
// className으로 줄 간격·여백을 정하는 바깥 요소 스타일을 페이지에서 넘긴다.
export default function StarRating({ value = 0, onChange, size, allowReset = false, className }) {
  const rating = value || 0;

  if (!onChange) {
    const iconSize = size ?? 13;
    return (
      <span className={`${styles.display} ${className || ''}`} aria-label={`별점 ${rating}점`}>
        {STARS.map((n) => (
          <span key={n} className={`${styles.displayStar} ${n <= rating ? styles.displayFilled : styles.displayEmpty}`}>
            <Star size={iconSize} fill={n <= rating ? 'currentColor' : 'none'} />
          </span>
        ))}
      </span>
    );
  }

  const iconSize = size ?? 20;
  return (
    <div className={className}>
      {STARS.map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          className={styles.inputStar}
          data-active={n <= rating || undefined}
          aria-label={`${n}점`}
          aria-pressed={n === rating}
        >
          <Star size={iconSize} fill={n <= rating ? 'currentColor' : 'none'} />
        </button>
      ))}
      {allowReset && rating > 0 && (
        <button type="button" onClick={() => onChange(0)} className={styles.resetBtn}>초기화</button>
      )}
    </div>
  );
}
