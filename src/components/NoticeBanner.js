'use client';
import { useEffect, useState } from 'react';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import { dangerousHtml } from '@/lib/sanitize';

export default function NoticeBanner() {
  const [notice, setNotice] = useState(null);
  const [open, setOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    getDocs(query(collection(db, 'notices'), where('pinned', '==', true), orderBy('createdAt', 'desc')))
      .then(snap => { if (!snap.empty) setNotice({ id: snap.docs[0].id, ...snap.docs[0].data() }); })
      .catch(() => {});
  }, []);

  if (!notice) return null;

  return (
    <>
      <div className="notice-banner" onClick={() => setOpen(true)} style={{ marginBottom: 14 }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--accent2)', flexShrink: 0 }}>📢 공지</span>
        <span style={{ fontSize: 13, flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{notice.title}</span>
        <span style={{ fontSize: 18, color: 'var(--muted)', flexShrink: 0 }}>›</span>
      </div>

      {open && (
        <div className="modal-overlay" onClick={() => setOpen(false)}>
          <div className="modal-sheet" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 18, color: 'var(--accent)' }}>{notice.title}</h2>
              <button onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--muted)' }}>✕</button>
            </div>
            <div style={{ fontSize: 14, lineHeight: 1.8 }} dangerouslySetInnerHTML={dangerousHtml(notice.content)} />
            <div style={{ marginTop: 16, textAlign: 'right' }}>
              <button onClick={() => { setOpen(false); router.push(`/notice/${notice.id}`); }}
                style={{ fontSize: 13, color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>
                전체 보기 →
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
