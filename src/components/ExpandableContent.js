'use client';
import { useEffect, useRef, useState } from 'react';
import styles from './ExpandableContent.module.css';

const CLAMP_LINES = 3;

// 긴 댓글 하나가 목록을 밀어내지 않도록 몇 줄만 보여주고, 실제로 넘칠 때만 펼치기 버튼을 둔다.
export default function ExpandableContent({
  text, html, style, className, lines = CLAMP_LINES,
}) {
  const ref = useRef(null);
  const [expanded, setExpanded] = useState(false);
  const [overflowing, setOverflowing] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    setOverflowing(el.scrollHeight > el.clientHeight + 1);
  }, [text, html]);

  const clampStyle = expanded ? null : {
    display: '-webkit-box',
    WebkitLineClamp: lines,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
  };

  return (
    <div>
      <div
        ref={ref}
        className={className}
        style={{ ...style, ...clampStyle }}
        {...(html ? { dangerouslySetInnerHTML: html } : {})}
      >
        {html ? undefined : text}
      </div>
      {overflowing && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); setExpanded(v => !v); }}
          className={styles.toggleBtn}
        >
          {expanded ? '간단히' : '자세히'}
        </button>
      )}
    </div>
  );
}
