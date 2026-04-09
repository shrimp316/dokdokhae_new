'use client';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';

export default function Header() {
  const router = useRouter();
  const { user } = useAuth();

  return (
    <header className="header">
      <button
        onClick={() => document.getElementById('sidebar-toggle')?.click()}
        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, color: 'var(--accent)', padding: 4, lineHeight: 1, flexShrink: 0 }}
        className="md:hidden"
      >
        ☰
      </button>
      <button
        onClick={() => router.push('/')}
        style={{ fontFamily: 'var(--font-serif)', fontSize: 18, fontWeight: 700, color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', flex: 1, textAlign: 'left' }}
      >
        너 참 독독하다
      </button>
      {!user && (
        <button
          onClick={() => router.push('/login')}
          style={{ background: 'none', border: '1.5px solid var(--line)', borderRadius: 20, padding: '5px 12px', fontSize: 12, color: 'var(--muted)', cursor: 'pointer', flexShrink: 0 }}
        >
          로그인
        </button>
      )}
    </header>
  );
}
