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
import styles from './Navbar.module.css';

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
      className={styles.topLink}
      data-active={active ? 'true' : undefined}
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

  // 항목을 눌러 이동하면 메뉴가 열린 채 남지 않게 한다.
  useEffect(() => { setOpen(false); }, [pathname]);

  return (
    <div
      ref={rootRef}
      className={styles.dropdownRoot}
    >
      <button
        type="button"
        className={`${styles.topLink} ${styles.dropdownTrigger}`}
        data-active={anyActive ? 'true' : undefined}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        {label}
        <ChevronDown
          size={13}
          className={styles.chevron}
          data-open={open || undefined}
        />
      </button>

      {open && (
        <div className={styles.dropPanel} role="menu">
          {items.map((it) => {
            const Icon = it.icon;
            const active = isActiveFor(pathname, it.href);
            return (
              <Link
                key={it.href}
                href={it.href}
                role="menuitem"
                className={styles.dropItem}
                data-active={active ? 'true' : undefined}
              >
                <span className={styles.dropIcon}><Icon size={16} /></span>
                <span className={styles.itemLabel}>
                  <span className={styles.dropTitle}>{it.label}</span>
                  <span className={styles.dropDesc}>{it.desc}</span>
                </span>
              </Link>
            );
          })}

          {withExternal && (
            <>
              <div className={styles.dropSep} />
              <button
                type="button"
                role="menuitem"
                className={`${styles.dropItem} ${styles.resetBtnFull}`}
                onClick={openExternal}
              >
                <span className={styles.dropIcon}><ArrowUpRight size={16} /></span>
                <span className={styles.itemLabel}>
                  <span className={styles.dropTitle}>{EXTERNAL.label}</span>
                  <span className={styles.dropDesc}>{EXTERNAL.desc}</span>
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
    <div ref={rootRef} className={styles.dropdownRoot}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="화면 설정"
        aria-expanded={open}
        className={styles.iconBtn}
        data-active={open ? 'true' : undefined}
      >
        <Settings size={18} />
      </button>
      {open && (
        <div
          className={`${styles.dropPanel} ${styles.settingsPanel}`}
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
      <div className={styles.authWrap}>
        <Link href="/mypage" className={styles.authLink}>
          <span className={styles.avatar}>
            {profile.nickname?.slice(0, 1) || '·'}
          </span>
          <span className={styles.nickname}>
            {profile.nickname}
          </span>
        </Link>
        <button
          type="button"
          onClick={onLogout}
          aria-label="로그아웃"
          className={styles.iconBtn}
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
      className={styles.loginBtn}
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

  // 모바일 메뉴는 이동할 때만 닫는다. 화면 크기(isMobile) 변화에 반응하면
  // 데스크톱↔모바일 전환마다 사용자가 저장한 사이드바 상태를 덮어쓴다.
  useEffect(() => {
    if (isMobile) setSidebar(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  const closeMobile = () => { if (isMobile) setSidebar(false); };

  const Logo = (
    <Link href="/" onClick={closeMobile} className={styles.logo}>
      너 참 <em className={styles.logoAccent}>독독하다</em>
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
        <nav className={styles.navbar}>
          {Logo}
          <div className={styles.mobileTopRow}>
            {user && <NotificationBell />}
            <button
              type="button"
              onClick={toggleSidebar}
              aria-label={menuOpen ? '메뉴 닫기' : '메뉴 열기'}
              aria-expanded={menuOpen}
              className={styles.iconBtn}
              data-active={menuOpen ? 'true' : undefined}
            >
              {menuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </nav>

        {menuOpen && (
          <div className={styles.mobileOverlay} onClick={() => setSidebar(false)} aria-hidden="true" />
        )}

        <div className={styles.mobilePanel} data-open={menuOpen ? 'true' : 'false'} aria-hidden={!menuOpen}>
          {flat.map((it) => {
            const Icon = it.icon;
            const active = isActiveFor(pathname, it.href);
            return (
              <Link
                key={it.href}
                href={it.href}
                onClick={closeMobile}
                className={styles.mobileItem}
                data-active={active ? 'true' : undefined}
              >
                {Icon && <Icon size={17} className={styles.mobileItemIcon} />}
                {it.label}
              </Link>
            );
          })}

          <button
            type="button"
            onClick={() => { setSidebar(false); openExternal(); }}
            className={`${styles.mobileItem} ${styles.resetBtnFull}`}
          >
            <ArrowUpRight size={17} className={styles.mobileItemIcon} />
            {EXTERNAL.label}
          </button>

          {isAdmin && (
            <Link
              href="/admin"
              onClick={closeMobile}
              className={styles.mobileItem}
              data-active={isActiveFor(pathname, '/admin') ? 'true' : undefined}
            >
              <Settings size={17} className={styles.mobileItemIcon} />
              관리자
            </Link>
          )}

          <div className={`${styles.dropSep} ${styles.sepMd}`} />

          <div className={styles.mobileProfileWrap}>
            {user && profile ? (
              <div className={styles.mobileProfileRow}>
                <button
                  type="button"
                  onClick={() => { router.push('/mypage'); closeMobile(); }}
                  className={styles.mobileProfileBtn}
                >
                  <span className={styles.mobileAvatar}>
                    {profile.nickname?.slice(0, 1) || '·'}
                  </span>
                  <span className={styles.mobileNickname}>
                    {profile.nickname}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => { logout(); closeMobile(); }}
                  className={styles.mobileLogoutBtn}
                >
                  <LogOut size={14} /> 로그아웃
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => { router.push('/login'); closeMobile(); }}
                className={styles.mobileLoginBtn}
              >
                로그인 / 가입
              </button>
            )}
          </div>

          <div className={`${styles.dropSep} ${styles.sepBottom}`} />
          <ModeToggle />
        </div>
      </>
    );
  }

  /* ── Desktop ─────────────────────────────────────────────── */
  return (
    <nav className={styles.navbar}>
      <div className={styles.desktopLeft}>
        {Logo}
        <div className={styles.divider} />
        <TopLink href="/" active={isActiveFor(pathname, '/')}>홈</TopLink>
        <NavDropdown label="읽기" items={READING} pathname={pathname} />
        <NavDropdown label="커뮤니티" items={COMMUNITY} pathname={pathname} withExternal />
        {isAdmin && (
          <TopLink href="/admin" active={isActiveFor(pathname, '/admin')}>관리자</TopLink>
        )}
      </div>

      <div className={styles.desktopRight}>
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
