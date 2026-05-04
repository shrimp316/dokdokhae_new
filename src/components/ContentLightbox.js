'use client';
import { useEffect, useState } from 'react';

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
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 500, padding: 20, cursor: 'zoom-out',
          }}
          role="dialog"
          aria-modal="true"
        >
          <img
            src={src}
            alt=""
            style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: 8 }}
          />
        </div>
      )}
    </>
  );
}
