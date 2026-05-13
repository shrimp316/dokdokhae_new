// Study-only direction with responsive layout + collapsible sidebar.

const { useState, useEffect, useRef } = React;

const USER = { name: '범' };

// Study direction palette across light/sepia/dark modes.
const STUDY = {
  serif: '"Noto Serif KR","EB Garamond",Georgia,serif',
  sans: 'Pretendard,sans-serif',
  light: {
    bg: '#ece1c8', surface: '#f3e9d2', text: '#28201a', textMuted: '#7a6856',
    accent: '#8a3a1f', accentSoft: '#d8c0a0', border: 'rgba(40,32,26,0.18)',
    shelf: 'linear-gradient(180deg, #6b4a2e 0%, #4a3220 100%)',
  },
  sepia: {
    bg: '#e6d8b8', surface: '#ede0c2', text: '#2c2218', textMuted: '#7c6a56',
    accent: '#7a3014', accentSoft: '#d4b890', border: 'rgba(44,34,24,0.22)',
    shelf: 'linear-gradient(180deg, #6b4a2e 0%, #3e2a18 100%)',
  },
  dark: {
    bg: '#1c1813', surface: '#241e17', text: '#e8dcc6', textMuted: '#8c7e68',
    accent: '#c87a4a', accentSoft: '#3a2c1e', border: 'rgba(232,220,198,0.10)',
    shelf: 'linear-gradient(180deg, #2a2018 0%, #15100b 100%)',
  },
};

function themeVars(mode, fontSize) {
  const m = STUDY[mode] || STUDY.sepia;
  return {
    '--bg': m.bg, '--surface': m.surface, '--text': m.text, '--text-muted': m.textMuted,
    '--accent': m.accent, '--accent-soft': m.accentSoft, '--border': m.border,
    '--shelf': m.shelf,
    '--serif': STUDY.serif, '--sans': STUDY.sans,
    '--body': `${fontSize}px`,
    '--h1': `clamp(36px, 7vw, ${Math.round(fontSize * 4.6)}px)`,
    '--h2': `${Math.round(fontSize * 2.2)}px`,
  };
}

// ── Collapsible book-spine sidebar (Study) ─────────────────────────────
function StudySidebar({ current, onNav, isOpen }) {
  // Wraps the spine column. The OUTER aside transitions its width
  // (0 ↔ W) snap-instantly so layout reflows; the INNER track slides via
  // transform so visually the panel glides off-screen and the content
  // flows over the space smoothly.
  const W = 178;
  return (
    <aside style={{
      width: isOpen ? W : 0,
      minWidth: 0,
      flexShrink: 0,
      background: isOpen ? 'var(--surface)' : 'transparent',
      borderRight: isOpen ? '1px solid var(--border)' : '1px solid transparent',
      overflow: 'visible',
      position: 'relative',
    }}>
      <div style={{
        width: W, height: '100%',
        padding: '26px 0 26px 18px',
        display: 'flex', flexDirection: 'column', gap: 4,
        transform: isOpen ? 'translateX(0)' : `translateX(-${W}px)`,
        transition: 'transform .28s cubic-bezier(.4,0,.2,1)',
        background: 'var(--surface)',
        borderRight: '1px solid var(--border)',
        boxSizing: 'border-box',
      }}>
        <div style={{
          fontFamily: 'var(--serif)', fontSize: 18, color: 'var(--text)',
          padding: '4px 4px 18px', letterSpacing: '-0.02em', lineHeight: 1.15,
        }}>
          너 참<br/>
          <em style={{ fontStyle: 'italic', color: 'var(--accent)' }}>독독하다</em>
        </div>
        {NAV.map((n, i) => {
          const colors = ['#8a3a1f','#3a4a3b','#6a4a3a','#7a5a3a','#a8773a','#6b8aa8','#2c3a4a'];
          const c = colors[i % colors.length];
          const active = current === n.id;
          return (
            <button key={n.id} onClick={() => onNav(n.id)} style={{
              appearance: 'none', border: 0, textAlign: 'left', cursor: 'pointer',
              position: 'relative', height: 38, marginLeft: active ? 0 : 6,
              background: c,
              borderTopLeftRadius: 3, borderBottomLeftRadius: 3,
              boxShadow: active
                ? `inset 4px 0 0 var(--accent), 0 3px 8px -3px rgba(0,0,0,.35)`
                : `inset 2px 0 0 rgba(255,255,255,.12), 0 1px 2px rgba(0,0,0,.2)`,
              transition: 'margin .14s, box-shadow .14s',
              display: 'flex', alignItems: 'center', padding: '0 14px',
              color: 'rgba(255,255,255,.95)', fontSize: 13, fontWeight: 500,
              fontFamily: 'var(--serif)', letterSpacing: '0.04em',
            }}
              onMouseEnter={e => !active && (e.currentTarget.style.marginLeft = '0px')}
              onMouseLeave={e => !active && (e.currentTarget.style.marginLeft = '6px')}>
              <span style={{
                width: 1, height: 18, background: 'rgba(255,255,255,.28)', marginRight: 10,
              }} />
              {n.label}
            </button>
          );
        })}
        <div style={{ flex: 1 }} />
        <div style={{ padding: '14px 14px 0', borderTop: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{
            width: 26, height: 26, borderRadius: '50%', background: 'var(--accent)',
            color: 'var(--surface)', display: 'flex', alignItems: 'center',
            justifyContent: 'center', fontSize: 11, fontWeight: 600,
          }}>{USER.name[0]}</span>
          <div style={{ flex: 1, lineHeight: 1.2 }}>
            <div style={{ fontSize: 12, color: 'var(--text)' }}>{USER.name}</div>
            <button style={{
              background: 'transparent', border: 0, padding: 0, cursor: 'pointer',
              color: 'var(--text-muted)', fontSize: 10, textDecoration: 'underline',
              textUnderlineOffset: 2,
            }}>로그아웃</button>
          </div>
        </div>
      </div>
    </aside>
  );
}

// ── Bookmark tab handle (toggles sidebar) ──────────────────────────────
function SidebarTab({ isOpen, onToggle, isMobile }) {
  // Always at the seam between sidebar and content. When closed it sticks
  // out from the left edge of the viewport.
  return (
    <button onClick={onToggle} aria-label={isOpen ? '사이드바 닫기' : '사이드바 열기'} style={{
      position: 'absolute',
      left: 0, top: isMobile ? 18 : 84,
      transform: isOpen ? `translateX(${isMobile ? 234 : 178}px)` : 'translateX(0)',
      transition: 'transform .28s cubic-bezier(.4,0,.2,1)',
      zIndex: 30,
      width: 26, height: 58,
      appearance: 'none', border: 0, padding: 0, cursor: 'pointer',
      background: 'var(--accent)', color: 'rgba(255,255,255,.96)',
      // Bookmark notch at the bottom
      clipPath: 'polygon(0 0, 100% 0, 100% 100%, 50% 84%, 0 100%)',
      boxShadow: '2px 2px 8px -2px rgba(0,0,0,.35)',
      display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
      paddingTop: 18,
      fontSize: 13, fontFamily: 'var(--serif)', letterSpacing: '0.1em',
    }}>
      <span style={{ display: 'inline-block', transform: 'translateY(-2px)' }}>
        {isOpen ? '‹' : '›'}
      </span>
    </button>
  );
}

// ── Compact header for the Study app ───────────────────────────────────
function StudyHeader({ isMobile, isOpen, onToggleSidebar }) {
  return (
    <header style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: isMobile ? '16px 18px 14px 56px' : '20px 36px 18px 56px',
      borderBottom: '1px solid var(--border)',
      gap: 16, background: 'var(--bg)', position: 'relative', zIndex: 2,
    }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, minWidth: 0 }}>
        <span style={{ fontFamily: 'var(--serif)', fontSize: 11, color: 'var(--text-muted)',
          letterSpacing: '0.25em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
          Vol. 02
        </span>
        <span style={{ width: 18, height: 1, background: 'var(--border)' }} />
        <span style={{ fontFamily: 'var(--serif)', fontSize: 12, color: 'var(--text)',
          letterSpacing: '0.04em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          이 주의 책 · 살인자의 기억법
        </span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
        <button style={{
          background: 'transparent', border: 0, padding: 0, cursor: 'pointer',
          color: 'var(--text-muted)', fontSize: 12, fontFamily: 'var(--sans)',
        }}>🔍</button>
      </div>
    </header>
  );
}

// ── App shell ──────────────────────────────────────────────────────────
function ReadingApp() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [screen, setScreen] = useState({ id: 'home', book: null });
  const [isOpen, setIsOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 820px)');
    const update = () => {
      const m = mq.matches;
      setIsMobile(m);
      setIsOpen(!m);  // open on desktop, closed on mobile
    };
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  const vars = themeVars(t.mode, t.fontSize);

  const onNav = (id) => {
    setScreen({ id, book: null });
    if (isMobile) setIsOpen(false);
  };
  const onSelectBook = (b) => {
    setScreen({ id: 'bookDetail', book: b });
    if (isMobile) setIsOpen(false);
  };
  const onBack = () => setScreen({ id: 'books', book: null });

  let content;
  switch (screen.id) {
    case 'books': content = <BooksScreen direction="study" onSelect={onSelectBook} />; break;
    case 'bookDetail': content = <BookDetailScreen book={screen.book || CURRENT_BOOK} onBack={onBack} />; break;
    case 'weekly': content = <WeeklyScreen />; break;
    case 'meetings': content = <MeetingsScreen />; break;
    case 'reviews': content = <ReviewsScreen />; break;
    case 'board': content = <BoardScreen />; break;
    case 'notices': content = <NoticesScreen />; break;
    default: content = <HomeScreen direction="study" onNav={onNav} />;
  }

  return (
    <div style={{
      ...vars,
      width: '100%', height: '100%', minHeight: '100vh',
      display: 'flex', position: 'relative',
      background: 'var(--bg)', color: 'var(--text)',
      fontFamily: 'var(--sans)', fontSize: 'var(--body)',
      overflow: 'hidden',
    }}>
      {/* Backdrop only on mobile when sidebar open */}
      {isMobile && isOpen && (
        <div onClick={() => setIsOpen(false)} style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,.42)',
          zIndex: 15, animation: 'ddFade .2s',
        }} />
      )}

      {/* Sidebar — fixed on mobile so it overlays; flex item on desktop */}
      {isMobile ? (
        <div style={{
          position: 'fixed', left: 0, top: 0, bottom: 0, zIndex: 20,
          transform: isOpen ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform .28s cubic-bezier(.4,0,.2,1)',
          width: 234, background: 'var(--surface)',
          boxShadow: isOpen ? '4px 0 24px -8px rgba(0,0,0,.3)' : 'none',
        }}>
          <div style={{ width: 234, height: '100%' }}>
            <StudySidebar current={screen.id} onNav={onNav} isOpen />
          </div>
        </div>
      ) : (
        <StudySidebar current={screen.id} onNav={onNav} isOpen={isOpen} />
      )}

      {/* Tab handle */}
      <SidebarTab isOpen={isOpen} isMobile={isMobile}
        onToggle={() => setIsOpen(o => !o)} />

      {/* Main content */}
      <main style={{
        flex: 1, minWidth: 0, height: '100vh', overflowY: 'auto', overflowX: 'hidden',
        background: 'var(--bg)', position: 'relative',
      }}>
        <StudyHeader isMobile={isMobile} isOpen={isOpen}
          onToggleSidebar={() => setIsOpen(o => !o)} />
        <div data-screen-label={`study · ${screen.id}`}>{content}</div>
      </main>

      <TweaksPanel title="독독해 · Tweaks">
        <TweakSection label="모드" />
        <TweakRadio label="라이트 · 세피아 · 다크" value={t.mode}
          options={[
            { label: '라이트', value: 'light' },
            { label: '세피아', value: 'sepia' },
            { label: '다크', value: 'dark' },
          ]}
          onChange={(v) => setTweak('mode', v)} />

        <TweakSection label="본문 크기" />
        <TweakSlider label="Font size" value={t.fontSize} min={12} max={18} unit="px"
          onChange={(v) => setTweak('fontSize', v)} />

        <TweakSection label="사이드바" />
        <TweakToggle label={isOpen ? '열림' : '닫힘'} value={isOpen}
          onChange={() => setIsOpen(o => !o)} />
      </TweaksPanel>
    </div>
  );
}

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "fontSize": 14,
  "mode": "sepia"
}/*EDITMODE-END*/;

ReactDOM.createRoot(document.getElementById('root')).render(<ReadingApp />);
