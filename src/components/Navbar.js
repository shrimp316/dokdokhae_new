'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import { useTheme } from '@/lib/ThemeContext';
import ModeToggle from '@/components/ModeToggle';
import NotificationBell from '@/components/NotificationBell';
import {
  Home, ChevronDown, Settings, Menu, X, LogOut, ArrowUpRight,
  BookOpen, Star, NotebookPen, Calendar, MessageCircle, Megaphone,
} from 'lucide-react';

const READING = [
  { href: '/books',    label: '도서 목록', desc: '함께 읽은 책들의 서가',  icon: BookOpen },
  { href: '/featured', label: '이 주의 글', desc: '이번 주 큐레이션 글',   icon: Star },
  { href: '/reviews',  label: '내 감상평', desc: '내가 남긴 독서 기록',    icon: NotebookPen },
];

const COMMUNITY = [
  { href: '/schedule', label: '모임 일정', desc: '다가오는 독서 모임',     icon: Calendar },
  { href: '/board',    label: '자유게시판', desc: '자유롭게 나누는 이야기', icon: MessageCircle },
  { href: '/notice',   label: '공지사항', desc: '모임 소식과 안내',        icon: Megaphone },
];

const EXTERNAL = {
  href: 'https://sihwa.vercel.app',
  label: '제휴사이트 – 시화',
  desc: '시화 사이트로 이동',
};

function isActiveFor(pathname, href) {
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(`${href}/`);
}

function openExternal() {
  if (confirm(`${EXTERNAL.label} 사이트로 이동할까요?\n새 탭에서 열립니다.`)) {
    window.open(EXTERNAL.href, '_blank', 'noopener,noreferrer');
  }
}

/* ── Top-level link (홈 / 관리자) ───────────────────────────── */
function TopLink({ href, active, children }) {
  return (
    <Link
      href={href}
      className="nav-toplink"
      data-active={active ? 'true' : undefined}
      style={{ textDecoration: 'none' }}
    >
      {children}
    </Link>
  );
}

/* ── Desktop dropdown (읽기 / 커뮤니티) ─────────────────────── */
function NavDropdown({ label, items, withExternal, pathname }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  const anyActive = items.some((it) => isActiveFor(pathname, it.href));

  useEffect(() => {
    if (!open) return;
    function onOutside(e) {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    }
    function onKey(e) { if (e.key === 'Escape') setOpen(false); }
    document.addEventListener('mousedown', onOutside);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onOutside);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  // Close after navigating to one of the items.
  useEffect(() => { setOpen(false); }, [pathname]);

  return (
    <div
      ref={rootRef}
      style={{ position: 'relative' }}
    >
      <button
        type="button"
        className="nav-toplink"
        data-active={anyActive ? 'true' : undefined}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        style={{
          appearance: 'none', background: 'transparent', border: 0, cursor: 'pointer',
          display: 'inline-flex', alignItems: 'center', gap: 4, fontFamily: 'var(--dd-sans)',
        }}
      >
        {label}
        <ChevronDown
          size={13}
          style={{ transition: 'transform .18s', transform: open ? 'rotate(180deg)' : 'none', opacity: 0.7 }}
        />
      </button>

      {open && (
        <div className="nav-drop-panel" role="menu">
          {items.map((it) => {
            const Icon = it.icon;
            const active = isActiveFor(pathname, it.href);
            return (
              <Link
                key={it.href}
                href={it.href}
                role="menuitem"
                className="nav-drop-item"
                data-active={active ? 'true' : undefined}
                style={{ textDecoration: 'none' }}
              >
                <span className="nav-drop-icon"><Icon size={16} /></span>
                <span style={{ minWidth: 0 }}>
                  <span className="nav-drop-title">{it.label}</span>
                  <span className="nav-drop-desc">{it.desc}</span>
                </span>
              </Link>
            );
          })}

          {withExternal && (
            <>
              <div className="nav-drop-sep" />
              <button
                type="button"
                role="menuitem"
                className="nav-drop-item"
                onClick={openExternal}
                style={{ appearance: 'none', background: 'transparent', border: 0, cursor: 'pointer', textAlign: 'left', width: '100%' }}
              >
                <span className="nav-drop-icon"><ArrowUpRight size={16} /></span>
                <span style={{ minWidth: 0 }}>
                  <span className="nav-drop-title">{EXTERNAL.label}</span>
                  <span className="nav-drop-desc">{EXTERNAL.desc}</span>
                </span>
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Settings popover (theme mode + font size) ─────────────── */
function SettingsPopover() {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    function onOutside(e) {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', onOutside);
    return () => document.removeEventListener('mousedown', onOutside);
  }, [open]);

  return (
    <div ref={rootRef} style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="화면 설정"
        aria-expanded={open}
        className="nav-icon-btn"
        data-active={open ? 'true' : undefined}
      >
        <Settings size={18} />
      </button>
      {open && (
        <div
          className="nav-drop-panel"
          style={{ right: 0, left: 'auto', width: 240, padding: 0 }}
        >
          <ModeToggle />
        </div>
      )}
    </div>
  );
}

/* ── Right-side auth block (desktop) ───────────────────────── */
function AuthBlock({ user, profile, onLogout, onLogin }) {
  if (user && profile) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Link
          href="/mypage"
          style={{
            display: 'flex', alignItems: 'center', gap: 7, textDecoration: 'none',
            color: 'var(--dd-text)',
          }}
        >
          <span
            style={{
              width: 26, height: 26, borderRadius: '50%',
              background: 'var(--dd-accent)', color: 'var(--dd-surface)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, fontWeight: 600, flexShrink: 0,
            }}
          >
            {profile.nickname?.slice(0, 1) || '·'}
          </span>
          <span
            style={{
              fontSize: 12.5, maxWidth: 96, overflow: 'hidden',
              textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}
          >
            {profile.nickname}
          </span>
        </Link>
        <button
          type="button"
          onClick={onLogout}
          aria-label="로그아웃"
          className="nav-icon-btn"
          title="로그아웃"
        >
          <LogOut size={16} />
        </button>
      </div>
    );
  }
  return (
    <button
      type="button"
      onClick={onLogin}
      style={{
        padding: '7px 14px',
        background: 'var(--dd-accent)', color: 'var(--dd-surface)',
        border: 0, borderRadius: 999,
        fontSize: 12, fontFamily: 'var(--dd-sans)', letterSpacing: '0.04em',
        cursor: 'pointer', whiteSpace: 'nowrap',
      }}
    >
      로그인 / 가입
    </button>
  );
}

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, profile, logout } = useAuth();
  const { isOpen, isMobile, setSidebar, toggleSidebar } = useTheme();
  const isAdmin = profile?.role === 'admin';

  const menuOpen = isMobile && isOpen;

  // Close the mobile panel whenever the route changes.
  useEffect(() => {
    if (isMobile) setSidebar(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  const closeMobile = () => { if (isMobile) setSidebar(false); };

  const Logo = (
    <Link
      href="/"
      onClick={closeMobile}
      style={{
        textDecoration: 'none', fontFamily: 'var(--dd-serif)', fontSize: 17,
        color: 'var(--dd-text)', letterSpacing: '-0.02em', whiteSpace: 'nowrap',
        flexShrink: 0,
      }}
    >
      너 참 <em style={{ fontStyle: 'italic', color: 'var(--dd-accent)' }}>독독하다</em>
    </Link>
  );

  /* ── Mobile ──────────────────────────────────────────────── */
  if (isMobile) {
    const flat = [
      { href: '/', label: '홈', icon: Home },
      ...READING, ...COMMUNITY,
    ];
    return (
      <>
        <nav className="navbar">
          {Logo}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {user && <NotificationBell />}
            <button
              type="button"
              onClick={toggleSidebar}
              aria-label={menuOpen ? '메뉴 닫기' : '메뉴 열기'}
              aria-expanded={menuOpen}
              className="nav-icon-btn"
              data-active={menuOpen ? 'true' : undefined}
            >
              {menuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </nav>

        {menuOpen && (
          <div className="nav-mobile-overlay" onClick={() => setSidebar(false)} aria-hidden="true" />
        )}

        <div className="nav-mobile-panel" data-open={menuOpen ? 'true' : 'false'} aria-hidden={!menuOpen}>
          {flat.map((it) => {
            const Icon = it.icon;
            const active = isActiveFor(pathname, it.href);
            return (
              <Link
                key={it.href}
                href={it.href}
                onClick={closeMobile}
                className="nav-mobile-item"
                data-active={active ? 'true' : undefined}
                style={{ textDecoration: 'none' }}
              >
                {Icon && <Icon size={17} style={{ opacity: 0.8, flexShrink: 0 }} />}
                {it.label}
              </Link>
            );
          })}

          <button
            type="button"
            onClick={() => { setSidebar(false); openExternal(); }}
            className="nav-mobile-item"
            style={{ appearance: 'none', background: 'transparent', border: 0, cursor: 'pointer', textAlign: 'left', width: '100%' }}
          >
            <ArrowUpRight size={17} style={{ opacity: 0.8, flexShrink: 0 }} />
            {EXTERNAL.label}
          </button>

          {isAdmin && (
            <Link
              href="/admin"
              onClick={closeMobile}
              className="nav-mobile-item"
              data-active={isActiveFor(pathname, '/admin') ? 'true' : undefined}
              style={{ textDecoration: 'none' }}
            >
              <Settings size={17} style={{ opacity: 0.8, flexShrink: 0 }} />
              관리자
            </Link>
          )}

          <div className="nav-drop-sep" style={{ margin: '8px 0' }} />

          <div style={{ padding: '0 4px' }}>
            {user && profile ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <button
                  type="button"
                  onClick={() => { router.push('/mypage'); closeMobile(); }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8, background: 'transparent',
                    border: 0, cursor: 'pointer', color: 'var(--dd-text)', padding: 4, minWidth: 0,
                  }}
                >
                  <span
                    style={{
                      width: 28, height: 28, borderRadius: '50%',
                      background: 'var(--dd-accent)', color: 'var(--dd-surface)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 12, fontWeight: 600, flexShrink: 0,
                    }}
                  >
                    {profile.nickname?.slice(0, 1) || '·'}
                  </span>
                  <span style={{ fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {profile.nickname}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => { logout(); closeMobile(); }}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 5,
                    background: 'transparent', border: '1px solid var(--dd-border)',
                    borderRadius: 999, padding: '6px 12px', cursor: 'pointer',
                    color: 'var(--dd-text-muted)', fontSize: 12, flexShrink: 0,
                  }}
                >
                  <LogOut size={14} /> 로그아웃
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => { router.push('/login'); closeMobile(); }}
                style={{
                  width: '100%', padding: '10px 12px',
                  background: 'var(--dd-accent)', color: 'var(--dd-surface)',
                  border: 0, borderRadius: 8,
                  fontSize: 13, fontFamily: 'var(--dd-sans)', letterSpacing: '0.04em',
                  cursor: 'pointer',
                }}
              >
                로그인 / 가입
              </button>
            )}
          </div>

          <div className="nav-drop-sep" style={{ margin: '8px 0 4px' }} />
          <ModeToggle />
        </div>
      </>
    );
  }

  /* ── Desktop ─────────────────────────────────────────────── */
  return (
    <nav className="navbar">
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
        {Logo}
        <div style={{ width: 1, height: 20, background: 'var(--dd-border)', margin: '0 10px', flexShrink: 0 }} />
        <TopLink href="/" active={isActiveFor(pathname, '/')}>홈</TopLink>
        <NavDropdown label="읽기" items={READING} pathname={pathname} />
        <NavDropdown label="커뮤니티" items={COMMUNITY} pathname={pathname} withExternal />
        {isAdmin && (
          <TopLink href="/admin" active={isActiveFor(pathname, '/admin')}>관리자</TopLink>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
        {user && <NotificationBell />}
        <SettingsPopover />
        <AuthBlock
          user={user}
          profile={profile}
          onLogout={logout}
          onLogin={() => router.push('/login')}
        />
      </div>
    </nav>
  );
}
