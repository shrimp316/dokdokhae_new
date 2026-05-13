'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import { useTheme } from '@/lib/ThemeContext';

// Maps to existing routes in this codebase.
const NAV = [
  { href: '/',         label: '홈',         color: 'var(--dd-menu-1)' },
  { href: '/books',    label: '도서 목록',  color: 'var(--dd-menu-2)' },
  { href: '/featured', label: '이 주의 글', color: 'var(--dd-menu-3)' },
  { href: '/schedule', label: '모임 일정',  color: 'var(--dd-menu-4)' },
  { href: '/reviews',  label: '내 감상평',  color: 'var(--dd-menu-5)' },
  { href: '/board',    label: '자유게시판', color: 'var(--dd-menu-6)' },
  { href: '/notice',   label: '공지사항',   color: 'var(--dd-menu-7)' },
  { href: '/admin',    label: '관리자',     color: 'var(--dd-menu-8)' },
];

function isActiveFor(pathname, href) {
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, profile, logout } = useAuth();
  const { isOpen, isMobile, setSidebar } = useTheme();

  const closeOnMobileNav = () => {
    if (isMobile) setSidebar(false);
  };

  return (
    <aside
      className={`sidebar${isOpen ? '' : ' closed'}`}
      aria-label="주 메뉴"
      aria-hidden={!isOpen}
    >
      <div
        style={{
          padding: '26px 0 26px 18px',
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
          minHeight: '100%',
          boxSizing: 'border-box',
        }}
      >
        {/* Logo */}
        <button
          type="button"
          onClick={() => { router.push('/'); closeOnMobileNav(); }}
          style={{
            appearance: 'none', background: 'transparent', border: 0, padding: '4px 4px 18px',
            textAlign: 'left', cursor: 'pointer',
            fontFamily: 'var(--dd-serif)', fontSize: 18, color: 'var(--dd-text)',
            letterSpacing: '-0.02em', lineHeight: 1.15,
          }}
        >
          너 참
          <br />
          <em style={{ fontStyle: 'italic', color: 'var(--dd-accent)' }}>독독하다</em>
        </button>

        {/* Spine menu */}
        {NAV.map((n) => {
          const active = isActiveFor(pathname, n.href);
          return (
            <Link
              key={n.href}
              href={n.href}
              onClick={closeOnMobileNav}
              style={{
                position: 'relative', height: 38,
                marginLeft: active ? 0 : 6,
                background: n.color,
                borderTopLeftRadius: 3, borderBottomLeftRadius: 3,
                boxShadow: active
                  ? 'inset 4px 0 0 var(--dd-accent), 0 3px 8px -3px rgba(0,0,0,.35)'
                  : 'inset 2px 0 0 rgba(255,255,255,.12), 0 1px 2px rgba(0,0,0,.2)',
                transition: 'margin .14s, box-shadow .14s',
                display: 'flex', alignItems: 'center', padding: '0 14px',
                color: 'rgba(255,255,255,.95)', fontSize: 13, fontWeight: 500,
                fontFamily: 'var(--dd-serif)', letterSpacing: '0.04em',
                textDecoration: 'none',
              }}
              onMouseEnter={(e) => { if (!active) e.currentTarget.style.marginLeft = '0px'; }}
              onMouseLeave={(e) => { if (!active) e.currentTarget.style.marginLeft = '6px'; }}
            >
              <span
                style={{
                  width: 1, height: 18,
                  background: 'rgba(255,255,255,.28)',
                  marginRight: 10,
                }}
                aria-hidden="true"
              />
              {n.label}
            </Link>
          );
        })}

        <div style={{ flex: 1 }} />

        {/* User block */}
        <div
          style={{
            padding: '14px 14px 0',
            borderTop: '1px solid var(--dd-border)',
            display: 'flex', alignItems: 'center', gap: 8,
          }}
        >
          {user && profile ? (
            <>
              <span
                style={{
                  width: 26, height: 26, borderRadius: '50%',
                  background: 'var(--dd-accent)', color: 'var(--dd-surface)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, fontWeight: 600,
                }}
              >
                {profile.nickname?.slice(0, 1) || '·'}
              </span>
              <div style={{ flex: 1, lineHeight: 1.2, minWidth: 0 }}>
                <button
                  type="button"
                  onClick={() => { router.push('/mypage'); closeOnMobileNav(); }}
                  style={{
                    background: 'transparent', border: 0, padding: 0, cursor: 'pointer',
                    color: 'var(--dd-text)', fontSize: 12,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    display: 'block', textAlign: 'left', width: '100%',
                  }}
                >
                  {profile.nickname}
                </button>
                <button
                  type="button"
                  onClick={logout}
                  style={{
                    background: 'transparent', border: 0, padding: 0, cursor: 'pointer',
                    color: 'var(--dd-text-muted)', fontSize: 10,
                    textDecoration: 'underline', textUnderlineOffset: 2,
                  }}
                >
                  로그아웃
                </button>
              </div>
            </>
          ) : (
            <button
              type="button"
              onClick={() => { router.push('/login'); closeOnMobileNav(); }}
              style={{
                width: '100%', padding: '8px 12px',
                background: 'var(--dd-accent)', color: 'var(--dd-surface)',
                border: 0, borderRadius: 2,
                fontSize: 12, fontFamily: 'var(--dd-sans)', letterSpacing: '0.06em',
                cursor: 'pointer',
              }}
            >
              로그인 / 가입
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}
