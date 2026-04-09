'use client';
import { useFCM } from '@/hooks/useFCM';
import { useAuth } from '@/lib/AuthContext';

export default function FCMInit() {
  const { user } = useAuth();
  const { permission, requestPermission } = useFCM();

  if (!user || permission !== 'default') return null;

  return (
    <div style={{
      position: 'fixed', bottom: 20, left: '50%', transform: 'translateX(-50%)',
      background: '#1a1714', color: '#fff', borderRadius: 12,
      padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12,
      zIndex: 500, boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
      maxWidth: 'calc(100vw - 32px)', width: 'max-content',
    }}>
      <span style={{ fontSize: 13 }}>🔔 모임 알림을 받으시겠어요?</span>
      <button
        onClick={requestPermission}
        style={{
          background: 'var(--accent)', color: '#fff', border: 'none',
          borderRadius: 8, padding: '6px 12px', fontSize: 12,
          cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0,
        }}
      >
        허용
      </button>
      <button
        onClick={() => {
          if (typeof window !== 'undefined') {
            sessionStorage.setItem('fcm-dismissed', '1');
            window.dispatchEvent(new Event('fcm-dismiss'));
          }
        }}
        style={{ background: 'none', border: 'none', color: '#999', cursor: 'pointer', fontSize: 16, padding: 0, flexShrink: 0 }}
      >
        ✕
      </button>
    </div>
  );
}
