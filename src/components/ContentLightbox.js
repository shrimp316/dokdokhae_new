'use client';
import { useEffect, useState } from 'react';
import styles from './ContentLightbox.module.css';

// 본문은 HTML 문자열로 그려져 이미지마다 핸들러를 달 수 없으므로, 감싼 영역에서 클릭을 받아 확대한다.
export default function ContentLightbox({ children, contentClassName, contentStyle }) {
  const [src, setSrc] = useState(null);

  function onClick(e) {
    if (e.button !== 0) return;
    if (e.target?.tagName === 'IMG') {
      e.preventDefault();
      setSrc(e.target.src);
    }
  }

  useEffect(() => {
    if (!src) return;
    function onKey(ev) { if (ev.key === 'Escape') setSrc(null); }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [src]);

  return (
    <>
      <div className={contentClassName} style={contentStyle} onClick={onClick}>
        {children}
      </div>
      {src && (
        <div
          onClick={() => setSrc(null)}
          className={styles.overlay}
          role="dialog"
          aria-modal="true"
        >
          <img
            src={src}
            alt=""
            className={styles.image}
          />
        </div>
      )}
    </>
  );
}
