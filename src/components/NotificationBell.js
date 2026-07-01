'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useNotifications } from '@/hooks/useNotifications';

const TITLE_BY_TYPE = {
  comment: '님이 댓글을 남겼어요',
  reply: '님이 답글을 남겼어요',
  like: '님이 좋아요를 눌렀어요',
};

function notifUrl(n) {
  if (n.collectionName === 'board') return `/board/${n.postId}`;
  if (n.collectionName === 'reviews') return `/books/${n.bookId}`;
  return `/featured/${n.postId}`;
}

function formatDate(ts) {
  if (!ts?.toDate) return '';
  const d = ts.toDate();
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

export default function NotificationBell() {
  const router = useRouter();
  const { notifications, unreadCount, markRead, markAllRead } = useNotifications();
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    function onClickOutside(e) {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [open]);

  function handleItemClick(n) {
    markRead(n.id);
    setOpen(false);
    router.push(notifUrl(n));
  }

  return (
    <div ref={rootRef} style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        aria-label="알림"
        style={{
          position: 'relative', background: 'transparent', border: 0, padding: 4,
          cursor: 'pointer', fontSize: 18, lineHeight: 1, color: 'var(--dd-text)',
        }}
      >
        🔔
        {unreadCount > 0 && (
          <span
            style={{
              position: 'absolute', top: 0, right: 0, transform: 'translate(40%, -30%)',
              background: 'var(--danger, #d64545)', color: '#fff',
              borderRadius: 999, fontSize: 10, fontWeight: 700,
              minWidth: 16, height: 16, padding: '0 4px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          style={{
            position: 'absolute', right: 0, top: '100%', marginTop: 8,
            width: 300, maxHeight: 400, overflowY: 'auto',
            background: 'var(--dd-bg, #fff)', border: '1px solid var(--dd-border)',
            borderRadius: 8, boxShadow: '0 8px 24px rgba(0,0,0,0.12)', zIndex: 400,
          }}
        >
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '10px 12px', borderBottom: '1px solid var(--dd-border)',
          }}
          >
            <span style={{ fontSize: 13, fontWeight: 600 }}>알림</span>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={() => markAllRead()}
                style={{
                  background: 'none', border: 0, cursor: 'pointer',
                  fontSize: 11, color: 'var(--accent)',
                }}
              >
                모두 읽음
              </button>
            )}
          </div>

          {notifications.length === 0 ? (
            <div style={{ padding: 20, fontSize: 12, color: 'var(--muted)', textAlign: 'center' }}>
              알림이 없어요.
            </div>
          ) : (
            notifications.map(n => (
              <button
                key={n.id}
                type="button"
                onClick={() => handleItemClick(n)}
                style={{
                  display: 'block', width: '100%', textAlign: 'left',
                  padding: '10px 12px', border: 0, borderBottom: '1px solid var(--dd-border)',
                  background: n.read ? 'transparent' : 'var(--tag-bg, #f4f4f4)',
                  cursor: 'pointer',
                }}
              >
                <div style={{ fontSize: 12 }}>
                  <strong>{n.actorNickname}</strong>
                  {TITLE_BY_TYPE[n.type] || ''}
                </div>
                {n.preview && (
                  <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{n.preview}</div>
                )}
                <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 4 }}>{formatDate(n.createdAt)}</div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
