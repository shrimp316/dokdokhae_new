'use client';
import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';

const NAV_ITEMS = [
  { href: '/', icon: '🏠', label: '홈' },
  { href: '/books', icon: '📚', label: '도서 목록' },
  { href: '/featured', icon: '📝', label: '이 주의 글' },
  { href: '/schedule', icon: '📅', label: '모임 일정' },
  { href: '/reviews', icon: '✏️', label: '내 감상평' },
  null,
  { href: '/board', icon: '💬', label: '자유게시판' },
  { href: '/notice', icon: '📢', label: '공지사항' },
  null,
  { href: '/admin', icon: '⚙️', label: '관리자' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, profile, logout } = useAuth();
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className={`sidebar-overlay ${open ? 'open' : ''}`} onClick={() => setOpen(false)} />
      <aside className={`sidebar ${open ? 'open' : ''}`}>
        {/* 로고 */}
        <div style={{ padding: '20px 16px 14px', borderBottom: '1px solid var(--line)' }}>
          <button
            onClick={() => { router.push('/'); setOpen(false); }}
            style={{ fontFamily: 'var(--font-serif)', fontSize: '18px', fontWeight: 700, color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', width: '100%' }}
          >
            📚 너 참 독독하다
          </button>
        </div>

        {/* 유저 영역 */}
        <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--line)' }}>
          {user && profile ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <button
                onClick={() => { router.push('/mypage'); setOpen(false); }}
                style={{
                  width: 36, height: 36, borderRadius: '50%',
                  background: 'var(--accent)', color: '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 14, fontWeight: 600, border: 'none', cursor: 'pointer', flexShrink: 0
                }}
              >
                {profile.nickname?.slice(0, 1)}
              </button>
              <div style={{ flex: 1, minWidth: 0 }}>
                <button
                  onClick={() => { router.push('/mypage'); setOpen(false); }}
                  style={{ fontSize: 13, fontWeight: 500, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text)', display: 'block', textAlign: 'left', width: '100%', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
                >
                  {profile.nickname}
                </button>
                <button onClick={logout} style={{ fontSize: 11, color: 'var(--muted)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', padding: 0, fontFamily: 'var(--font-sans)' }}>
                  로그아웃
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => { router.push('/login'); setOpen(false); }}
              style={{
                width: '100%', padding: '10px 14px',
                background: 'var(--accent)', color: '#fff',
                border: 'none', borderRadius: 8,
                fontSize: 13, fontFamily: 'var(--font-sans)', cursor: 'pointer',
              }}
            >
              🔐 로그인 / 가입
            </button>
          )}
        </div>

        {/* 네비게이션 */}
        <nav style={{ padding: '8px 0', flex: 1 }}>
          {NAV_ITEMS.map((item, i) => {
            if (!item) return <div key={i} style={{ height: 1, background: 'var(--line)', margin: '4px 12px' }} />;
            const active = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '11px 16px', fontSize: 14,
                  color: active ? 'var(--accent)' : 'var(--text)',
                  background: active ? 'var(--tag-bg)' : 'none',
                  fontWeight: active ? 500 : 400,
                  textDecoration: 'none',
                  transition: 'background 0.1s',
                }}
              >
                <span style={{ fontSize: 18, width: 24, textAlign: 'center' }}>{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* 모바일 햄버거 버튼 - Header에서 제어 */}
      <button
        id="sidebar-toggle"
        onClick={() => setOpen(o => !o)}
        style={{ display: 'none' }}
        aria-label="메뉴"
      />
    </>
  );
}
