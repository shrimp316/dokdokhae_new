'use client';
import { useFCM } from '@/hooks/useFCM';
import { useAuth } from '@/lib/AuthContext';
import { Bell } from 'lucide-react';

export default function FCMInit() {
  const { user } = useAuth();
  const { permission, requestPermission } = useFCM();

  if (!user) return null;

  return (
    <>
      {permission === 'default' && (
        <div style={{
          position: 'fixed', bottom: 20, left: '50%', transform: 'translateX(-50%)',
          background: '#1a1714', color: '#fff', borderRadius: 12,
          padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12,
          zIndex: 500, boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
          maxWidth: 'calc(100vw - 32px)',
        }}>
          <span style={{ fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 4 }}><Bell size={14} /> 모임 알림을 받으시겠어요?</span>
          <button onClick={async () => { await requestPermission(); }}
            style={{ background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 8, padding: '6px 12px', fontSize: 12, cursor: 'pointer' }}>
            허용
          </button>
        </div>
      )}
    </>
  );
}