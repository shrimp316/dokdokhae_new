'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import { useNotifications } from '@/hooks/useNotifications';
import { Bell, MessageCircle, Reply, Heart, CheckCheck } from 'lucide-react';

const TITLE_BY_TYPE = {
  comment: '님이 댓글을 남겼어요',
  reply: '님이 답글을 남겼어요',
  like: '님이 좋아요를 눌렀어요',
};

const ICON_BY_TYPE = {
  comment: MessageCircle,
  reply: Reply,
  like: Heart,
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
        <Bell size={18} style={{ display: 'inline', verticalAlign: '-3px' }} />
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

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -6 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            style={{
              position: 'absolute', right: 0, top: '100%', marginTop: 8,
              width: 320, maxHeight: 420, overflowY: 'auto',
              background: 'var(--dd-surface)', border: '1px solid var(--dd-border)',
              borderRadius: 'var(--radius)', boxShadow: 'var(--shadow)', zIndex: 400,
              transformOrigin: 'top right',
            }}
          >
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '12px 14px', borderBottom: '1px solid var(--dd-border)',
            }}
            >
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--dd-text)' }}>알림</span>
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={() => markAllRead()}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 4,
                    background: 'none', border: 0, cursor: 'pointer',
                    fontSize: 11, color: 'var(--dd-accent)', padding: 0,
                  }}
                >
                  <CheckCheck size={12} /> 모두 읽음
                </button>
              )}
            </div>

            {notifications.length === 0 ? (
              <div style={{ padding: '32px 14px', fontSize: 12, color: 'var(--dd-text-muted)', textAlign: 'center' }}>
                알림이 없어요.
              </div>
            ) : (
              notifications.map((n, i) => {
                const Icon = ICON_BY_TYPE[n.type] || MessageCircle;
                return (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => handleItemClick(n)}
                    style={{
                      display: 'flex', alignItems: 'flex-start', gap: 10, width: '100%',
                      textAlign: 'left', padding: '12px 14px',
                      border: 0, borderTop: i === 0 ? 'none' : '1px solid var(--dd-border)',
                      background: n.read ? 'transparent' : 'var(--dd-accent-soft)',
                      cursor: 'pointer', position: 'relative',
                    }}
                  >
                    <span
                      style={{
                        flexShrink: 0, width: 28, height: 28, borderRadius: '50%',
                        background: n.read ? 'var(--dd-border)' : 'var(--dd-accent)',
                        color: n.read ? 'var(--dd-text-muted)' : '#fff',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}
                    >
                      <Icon size={13} fill={n.type === 'like' && !n.read ? 'currentColor' : 'none'} />
                    </span>
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ display: 'block', fontSize: 12.5, color: 'var(--dd-text)', lineHeight: 1.4 }}>
                        <strong>{n.actorNickname}</strong>
                        {TITLE_BY_TYPE[n.type] || ''}
                      </span>
                      {n.preview && (
                        <span
                          style={{
                            display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical',
                            overflow: 'hidden', fontSize: 11.5, color: 'var(--dd-text-muted)', marginTop: 3,
                          }}
                        >
                          {n.preview}
                        </span>
                      )}
                      <span style={{ display: 'block', fontSize: 10.5, color: 'var(--dd-text-muted)', marginTop: 4 }}>
                        {formatDate(n.createdAt)}
                      </span>
                    </span>
                    {!n.read && (
                      <span
                        aria-hidden="true"
                        style={{
                          flexShrink: 0, width: 6, height: 6, borderRadius: '50%',
                          background: 'var(--dd-accent)', marginTop: 5,
                        }}
                      />
                    )}
                  </button>
                );
              })
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
