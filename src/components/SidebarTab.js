'use client';
import { useTheme } from '@/lib/ThemeContext';

export default function SidebarTab() {
  const { isOpen, isMobile, toggleSidebar } = useTheme();

  const offset = isOpen
    ? (isMobile ? 'var(--dd-sidebar-w-mobile)' : 'var(--dd-sidebar-w)')
    : '0px';

  return (
    <button
      type="button"
      onClick={toggleSidebar}
      aria-label={isOpen ? '사이드바 닫기' : '사이드바 열기'}
      style={{
        position: 'fixed',
        left: 0,
        top: isMobile ? 18 : 84,
        transform: `translateX(${offset})`,
        transition: 'transform .28s cubic-bezier(.4,0,.2,1)',
        zIndex: 30,
        width: 26, height: 58,
        appearance: 'none', border: 0, padding: 0, cursor: 'pointer',
        background: 'var(--dd-accent)', color: 'rgba(255,255,255,.96)',
        clipPath: 'polygon(0 0, 100% 0, 100% 100%, 50% 84%, 0 100%)',
        boxShadow: '2px 2px 8px -2px rgba(0,0,0,.35)',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        paddingTop: 18,
        fontSize: 13, fontFamily: 'var(--dd-serif)', letterSpacing: '0.1em',
      }}
    >
      <span style={{ display: 'inline-block', transform: 'translateY(-2px)' }}>
        {isOpen ? '‹' : '›'}
      </span>
    </button>
  );
}
