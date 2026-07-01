'use client';
import { useEffect, useRef, useState } from 'react';

const CLAMP_LINES = 3;

/**
 * 댓글 등 텍스트/HTML 콘텐츠를 3줄까지만 보여주고, 넘칠 때만
 * "자세히/간단히" 토글 버튼을 노출한다. plain text(pre-wrap)와
 * dangerouslySetInnerHTML(HTML) 콘텐츠를 모두 지원한다.
 */
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
          style={{
            marginTop: 2, padding: 0, fontSize: 11, fontWeight: 600,
            color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer',
          }}
        >
          {expanded ? '간단히' : '자세히'}
        </button>
      )}
    </div>
  );
}
