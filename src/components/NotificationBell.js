'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import { useNotifications } from '@/hooks/useNotifications';
import { postPath } from '@/lib/routes';
import { formatMonthDay } from '@/lib/format';
import { Bell, MessageCircle, Reply, Heart, CheckCheck } from 'lucide-react';
import styles from './NotificationBell.module.css';

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
    router.push(postPath(n));
  }

  return (
    <div ref={rootRef} className={styles.root}>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        aria-label="알림"
        className={styles.bellBtn}
      >
        <Bell size={18} className={styles.bellIcon} />
        {unreadCount > 0 && (
          <span className={styles.badge}>
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
            className={styles.panel}
          >
            <div className={styles.panelHeader}>
              <span className={styles.panelTitle}>알림</span>
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={() => markAllRead()}
                  className={styles.markAllBtn}
                >
                  <CheckCheck size={12} /> 모두 읽음
                </button>
              )}
            </div>

            {notifications.length === 0 ? (
              <div className={styles.emptyState}>
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
                    className={styles.item}
                    data-first={i === 0 || undefined}
                    data-unread={!n.read || undefined}
                  >
                    <span
                      className={styles.itemIcon}
                      data-unread={!n.read || undefined}
                    >
                      <Icon size={13} fill={n.type === 'like' && !n.read ? 'currentColor' : 'none'} />
                    </span>
                    <span className={styles.itemText}>
                      <span className={styles.itemTitle}>
                        <strong>{n.actorNickname}</strong>
                        {TITLE_BY_TYPE[n.type] || ''}
                      </span>
                      {n.preview && (
                        <span className={styles.itemPreview}>
                          {n.preview}
                        </span>
                      )}
                      <span className={styles.itemDate}>
                        {formatMonthDay(n.createdAt)}
                      </span>
                    </span>
                    {!n.read && (
                      <span aria-hidden="true" className={styles.unreadDot} />
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
