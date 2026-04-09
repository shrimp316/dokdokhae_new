'use client';
import { useFCM } from '@/hooks/useFCM';
import { useAuth } from '@/lib/AuthContext';
import { useState } from 'react';

export default function FCMInit() {
  const { user } = useAuth();
  const { permission, requestPermission } = useFCM();
  const [msg, setMsg] = useState('');

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
          <span style={{ fontSize: 13 }}>🔔 모임 알림을 받으시겠어요?</span>
          <button onClick={async () => { await requestPermission(); setMsg('토큰 저장 시도 완료'); }} 
            style={{ background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 8, padding: '6px 12px', fontSize: 12, cursor: 'pointer' }}>
            허용
          </button>
        </div>
      )}
      {/* 임시 디버그 - 나중에 삭제 */}
      {msg && (
        <div style={{ position: 'fixed', top: 60, left: 10, background: 'green', color: '#fff', padding: 8, borderRadius: 8, fontSize: 12, zIndex: 999 }}>
          {msg}
        </div>
      )}
      {permission === 'granted' && (
        <div style={{ position: 'fixed', top: 60, left: 10, background: '#333', color: '#fff', padding: 8, borderRadius: 8, fontSize: 11, zIndex: 999, maxWidth: 200 }}>
          알림허용: {permission} / uid: {user.uid.slice(0,8)}
        </div>
      )}
    </>
  );
}