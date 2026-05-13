// All screens for the 독독해 reading site. Theme-driven via CSS vars on each
// app root. The sidebar style and the book-list shelf style each fork on
// the active direction (magazine | study | night) because those are the
// pieces the user explicitly asked to feel different per direction.

const { useState, useMemo } = React;

// ── Atomic placeholders ────────────────────────────────────────────────
function Cover({ book, size = 'm' }) {
  // Book cover placeholder — a stylized rectangle with title/author. Two
  // tone gradient + thin inner border, then the title vertically near top.
  const W = size === 'l' ? 140 : size === 'm' ? 88 : 60;
  const H = Math.round(W * 1.42);
  return (
    <div style={{
      width: W, height: H, position: 'relative', flex: '0 0 auto',
      background: `linear-gradient(160deg, ${book.cover} 0%, ${book.color} 60%, ${book.spine} 100%)`,
      boxShadow: '0 1px 0 rgba(255,255,255,.25) inset, 0 8px 18px -8px rgba(0,0,0,.35)',
      borderRadius: 2,
    }}>
      <div style={{
        position: 'absolute', inset: 6, border: '1px solid rgba(255,255,255,.18)',
        padding: 6, display: 'flex', flexDirection: 'column', gap: 4,
      }}>
        <div style={{ fontSize: W * 0.11, lineHeight: 1.15, color: 'rgba(255,255,255,.92)',
          fontFamily: 'var(--serif)', fontWeight: 500, letterSpacing: '-0.01em',
          textShadow: '0 1px 2px rgba(0,0,0,.2)', wordBreak: 'keep-all', textWrap: 'pretty' }}>
          {book.title}
        </div>
        <div style={{ fontSize: W * 0.075, color: 'rgba(255,255,255,.65)', marginTop: 'auto' }}>
          {book.author}
        </div>
      </div>
    </div>
  );
}

function Pill({ children, color, soft }) {
  return <span style={{
    display: 'inline-flex', alignItems: 'center', gap: 4,
    padding: '2px 8px', borderRadius: 999, fontSize: 11, fontWeight: 500,
    background: soft || 'var(--accent-soft)', color: color || 'var(--accent)',
    letterSpacing: '0.02em',
  }}>{children}</span>;
}

function SectionTitle({ num, title, sub }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 16, marginBottom: 18 }}>
      {num && <span style={{
        fontFamily: 'var(--serif)', fontSize: 14, color: 'var(--text-muted)',
        fontVariantNumeric: 'tabular-nums', letterSpacing: '0.05em',
      }}>{num}</span>}
      <h2 style={{
        fontFamily: 'var(--serif)', fontSize: 'var(--h2)', fontWeight: 500,
        margin: 0, color: 'var(--text)', letterSpacing: '-0.02em', lineHeight: 1.15,
      }}>{title}</h2>
      {sub && <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{sub}</span>}
    </div>
  );
}

// ── Sidebar (spine motif, 3 styles) ────────────────────────────────────
function Sidebar({ direction, current, onNav, sidebarStyle }) {
  // sidebarStyle override (from tweaks). Defaults to direction's native style.
  const style = sidebarStyle || direction;

  if (style === 'study') {
    return (
      <aside style={{
        width: 152, padding: '24px 0 24px 18px', flex: '0 0 152px',
        display: 'flex', flexDirection: 'column', gap: 10,
        borderRight: '1px solid var(--border)', background: 'var(--surface)',
      }}>
        <div style={{
          fontFamily: 'var(--serif)', fontSize: 16, color: 'var(--text)',
          padding: '4px 4px 14px', letterSpacing: '-0.02em',
        }}>너 참<br/><em style={{ fontStyle: 'italic', color: 'var(--accent)' }}>독독하다</em></div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {NAV.map((n, i) => {
            const colors = ['#8a3a1f','#3a4a3b','#6a4a3a','#7a5a3a','#a8773a','#6b8aa8','#2c3a4a'];
            const c = colors[i % colors.length];
            const active = current === n.id;
            return (
              <button key={n.id} onClick={() => onNav(n.id)} style={{
                appearance: 'none', border: 0, padding: 0, textAlign: 'left', cursor: 'pointer',
                position: 'relative', height: 36, marginLeft: active ? 0 : 6,
                background: active ? c : `linear-gradient(180deg, ${c} 0%, ${c} 100%)`,
                borderTopLeftRadius: 3, borderBottomLeftRadius: 3,
                boxShadow: active
                  ? `inset 4px 0 0 var(--accent), 0 2px 6px -2px rgba(0,0,0,.3)`
                  : `inset 2px 0 0 rgba(255,255,255,.1), 0 1px 2px rgba(0,0,0,.2)`,
                transition: 'margin .14s, box-shadow .14s',
                display: 'flex', alignItems: 'center', padding: '0 14px',
                color: 'rgba(255,255,255,.95)', fontSize: 13, fontWeight: 500,
                fontFamily: 'var(--serif)', letterSpacing: '0.04em',
              }}
                onMouseEnter={e => !active && (e.currentTarget.style.marginLeft = '0px')}
                onMouseLeave={e => !active && (e.currentTarget.style.marginLeft = '6px')}>
                <span style={{
                  width: 1, height: 18, background: 'rgba(255,255,255,.25)', marginRight: 10,
                }} />
                {n.label}
              </button>
            );
          })}
        </div>
      </aside>
    );
  }

  if (style === 'night') {
    return (
      <aside style={{
        width: 92, flex: '0 0 92px', padding: '32px 0 24px',
        display: 'flex', flexDirection: 'column', alignItems: 'stretch',
        borderRight: '1px solid var(--border)', background: 'transparent',
      }}>
        <div style={{
          fontFamily: 'var(--serif)', fontSize: 13, color: 'var(--accent)',
          padding: '0 0 28px', textAlign: 'center', letterSpacing: '0.18em',
        }}>독·독·해</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, padding: '0 0 0 18px' }}>
          {NAV.map((n) => {
            const active = current === n.id;
            return (
              <button key={n.id} onClick={() => onNav(n.id)} style={{
                appearance: 'none', border: 0, padding: 0, cursor: 'pointer',
                background: 'transparent', height: 56, position: 'relative',
                display: 'flex', alignItems: 'center',
              }}>
                <span style={{
                  width: 3, height: 36, marginRight: 14,
                  background: active
                    ? 'linear-gradient(180deg, transparent 0%, var(--accent) 20%, var(--accent) 80%, transparent 100%)'
                    : 'rgba(232,225,207,.18)',
                  boxShadow: active ? '0 0 8px var(--accent)' : 'none',
                  transition: 'background .2s, box-shadow .2s',
                }} />
                <span style={{
                  writingMode: 'vertical-rl', transform: 'rotate(180deg)',
                  fontFamily: 'var(--serif)', fontSize: 12, letterSpacing: '0.24em',
                  color: active ? 'var(--accent)' : 'var(--text-muted)',
                  transition: 'color .2s',
                }}>{n.label}</span>
              </button>
            );
          })}
        </div>
      </aside>
    );
  }

  // magazine: slim spine — minimal vertical labels, editorial
  return (
    <aside style={{
      width: 88, flex: '0 0 88px', padding: '40px 0 24px',
      display: 'flex', flexDirection: 'column', alignItems: 'stretch',
      borderRight: '1px solid var(--border)', background: 'transparent',
    }}>
      <div style={{
        fontFamily: 'var(--serif)', fontSize: 14, color: 'var(--accent)',
        padding: '0 0 36px 22px', letterSpacing: '0.08em', lineHeight: 1.1,
      }}>
        <div style={{ fontStyle: 'italic', fontSize: 22, fontWeight: 500 }}>독독해</div>
        <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4, letterSpacing: '0.3em' }}>READING CLUB</div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 0, padding: '0 0 0 18px' }}>
        {NAV.map((n, i) => {
          const active = current === n.id;
          return (
            <button key={n.id} onClick={() => onNav(n.id)} style={{
              appearance: 'none', border: 0, padding: 0, cursor: 'pointer',
              background: 'transparent', height: 64, position: 'relative',
              display: 'flex', alignItems: 'center', gap: 12,
              borderTop: i === 0 ? '1px solid var(--border)' : 'none',
              borderBottom: '1px solid var(--border)',
            }}>
              <span style={{
                fontFamily: 'var(--serif)', fontSize: 11,
                color: active ? 'var(--accent)' : 'var(--text-muted)',
                fontVariantNumeric: 'tabular-nums', letterSpacing: '0.05em',
              }}>{String(i + 1).padStart(2, '0')}</span>
              <span style={{
                writingMode: 'vertical-rl', transform: 'rotate(180deg)',
                fontFamily: 'var(--serif)', fontSize: 14, letterSpacing: '0.12em',
                color: active ? 'var(--text)' : 'var(--text-muted)',
                fontWeight: active ? 500 : 400,
                fontStyle: active ? 'italic' : 'normal',
                transition: 'color .15s',
              }}>{n.label}</span>
              {active && <span style={{
                position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)',
                width: 4, height: 28, background: 'var(--accent)',
              }} />}
            </button>
          );
        })}
      </div>
    </aside>
  );
}

// ── Header ─────────────────────────────────────────────────────────────
function Header({ direction, user }) {
  return (
    <header className="dd-header" style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '20px 48px 18px', borderBottom: '1px solid var(--border)',
      gap: 24,
    }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 14 }}>
        <span style={{ fontFamily: 'var(--serif)', fontSize: 11, color: 'var(--text-muted)',
          letterSpacing: '0.3em', textTransform: 'uppercase' }}>Vol. 02 · {(new Date()).getFullYear()}</span>
        <span style={{ width: 24, height: 1, background: 'var(--border)' }} />
        <span style={{ fontFamily: 'var(--serif)', fontSize: 11, color: 'var(--text-muted)',
          letterSpacing: '0.2em' }}>이번 주 · W20</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <button style={{
          background: 'transparent', border: 0, padding: 0, cursor: 'pointer',
          color: 'var(--text-muted)', fontSize: 12, fontFamily: 'var(--sans)',
        }}>검색</button>
        <span style={{ width: 1, height: 14, background: 'var(--border)' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{
            width: 26, height: 26, borderRadius: '50%', background: 'var(--accent)',
            color: 'var(--surface)', display: 'flex', alignItems: 'center',
            justifyContent: 'center', fontSize: 11, fontWeight: 600,
          }}>{user.name[0]}</span>
          <span style={{ fontSize: 12, color: 'var(--text)' }}>{user.name}</span>
          <button style={{
            background: 'transparent', border: 0, padding: 0, cursor: 'pointer',
            color: 'var(--text-muted)', fontSize: 11, textDecoration: 'underline',
            textUnderlineOffset: 2,
          }}>로그아웃</button>
        </div>
      </div>
    </header>
  );
}

// ── Home screen ────────────────────────────────────────────────────────
function HomeScreen({ direction, onNav }) {
  const m = MEETINGS[0];
  const wk = WEEKLY_POSTS[0];
  return (
    <div className="dd-page" style={{ padding: '36px 48px 60px', display: 'flex', flexDirection: 'column', gap: 48 }}>
      {/* Editorial masthead */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 0, position: 'relative' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 12 }}>
          <span style={{ fontFamily: 'var(--serif)', fontSize: 11, color: 'var(--accent)',
            letterSpacing: '0.3em', textTransform: 'uppercase' }}>This Month · 이 달의 책</span>
          <span style={{ flex: 1, height: 1, background: 'var(--border)' }} />
          <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--serif)',
            letterSpacing: '0.15em' }}>NO. 020</span>
        </div>
        <h1 className="dd-h1" style={{
          fontFamily: 'var(--serif)', fontSize: 'var(--h1)', fontWeight: 500,
          margin: 0, color: 'var(--text)', letterSpacing: '-0.03em', lineHeight: 1.02,
          textWrap: 'balance',
        }}>
          살인자의<br/>
          <em style={{ fontStyle: 'italic', color: 'var(--accent)' }}>기억법</em>
        </h1>
        <div className="dd-home-hero" style={{ display: 'grid', gridTemplateColumns: '160px 1fr 220px', gap: 36, marginTop: 28, alignItems: 'start' }}>
          <Cover book={CURRENT_BOOK} size="l" />
          <div>
            <div style={{ fontFamily: 'var(--serif)', fontSize: 13, color: 'var(--text-muted)',
              letterSpacing: '0.08em', marginBottom: 12 }}>
              김영하 · {CURRENT_BOOK.genre} · {CURRENT_BOOK.year}
            </div>
            <p style={{
              fontFamily: 'var(--serif)', fontSize: 15, lineHeight: 1.65, color: 'var(--text)',
              margin: 0, textWrap: 'pretty', letterSpacing: '-0.005em',
            }}>{CURRENT_BOOK.intro}</p>
            <div style={{
              marginTop: 18, paddingLeft: 14, borderLeft: '2px solid var(--accent)',
              fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 17, lineHeight: 1.4,
              color: 'var(--text)',
            }}>"{CURRENT_BOOK.quote}"</div>
            <button onClick={() => onNav('books')} style={{
              marginTop: 22, padding: '10px 18px', background: 'transparent',
              border: '1px solid var(--accent)', color: 'var(--accent)', cursor: 'pointer',
              fontFamily: 'var(--sans)', fontSize: 12, letterSpacing: '0.08em',
              borderRadius: 0,
            }}>도서 페이지 →</button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{
              padding: 18, background: 'var(--accent)', color: 'var(--surface)',
              display: 'flex', flexDirection: 'column', gap: 4,
            }}>
              <div style={{ fontSize: 10, letterSpacing: '0.3em', opacity: .7 }}>NEXT MEETING</div>
              <div style={{ fontFamily: 'var(--serif)', fontSize: 36, fontWeight: 500,
                lineHeight: 1, letterSpacing: '-0.02em' }}>D-{m.d}</div>
              <div style={{ fontSize: 11, opacity: .85, marginTop: 6 }}>{m.date}</div>
              <div style={{ fontSize: 11, opacity: .85 }}>{m.time}</div>
            </div>
            <button onClick={() => onNav('meetings')} style={{
              padding: 12, background: 'var(--surface)', border: '1px solid var(--border)',
              color: 'var(--text)', cursor: 'pointer', fontSize: 12, fontFamily: 'var(--sans)',
              textAlign: 'left',
            }}>
              <span style={{ color: 'var(--text-muted)' }}>다음 모임 → </span>{m.label}
            </button>
          </div>
        </div>
      </div>

      {/* This week's post */}
      <div className="dd-home-bottom" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 36 }}>
        <article style={{
          gridColumn: 'span 1', padding: 24, background: 'var(--surface)',
          border: '1px solid var(--border)', borderRadius: 2,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <Pill>이 주의 글</Pill>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>W20 · 소개</span>
          </div>
          <h3 style={{
            fontFamily: 'var(--serif)', fontSize: 22, fontWeight: 500, margin: '0 0 10px',
            color: 'var(--text)', letterSpacing: '-0.02em', lineHeight: 1.2,
          }}>{wk.book.split(' / ')[0]}</h3>
          <p style={{
            fontSize: 13, lineHeight: 1.7, color: 'var(--text)', margin: 0,
            fontFamily: 'var(--sans)', textWrap: 'pretty',
            display: '-webkit-box', WebkitLineClamp: 4, WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}>{wk.body}</p>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            marginTop: 16, fontSize: 11, color: 'var(--text-muted)' }}>
            <span>— {wk.book}</span>
            <span>· 토론 질문 {wk.questions}개 →</span>
          </div>
        </article>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <SectionTitle num="N.B." title="공지사항" />
          {NOTICES.map((n, i) => (
            <div key={n.id} style={{
              padding: '12px 0', borderBottom: i < NOTICES.length - 1 ? '1px dashed var(--border)' : 'none',
              display: 'flex', alignItems: 'baseline', gap: 12,
            }}>
              {n.pinned && <span style={{ color: 'var(--accent)', fontSize: 10 }}>📌</span>}
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, color: 'var(--text)', fontFamily: 'var(--serif)',
                  fontWeight: 500, letterSpacing: '-0.01em' }}>{n.title}</div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2,
                  letterSpacing: '0.05em' }}>{n.date}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quote band */}
      <div style={{
        padding: '32px 0', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 12,
      }}>
        <span style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.4em' }}>QUOTE OF THE WEEK</span>
        <p style={{
          fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 26, color: 'var(--text)',
          margin: 0, lineHeight: 1.35, letterSpacing: '-0.015em', maxWidth: 680, textWrap: 'balance',
        }}>"기억이 사라지면, 나는 누구인가."</p>
        <span style={{ fontSize: 11, color: 'var(--text-muted)', letterSpacing: '0.08em',
          fontFamily: 'var(--serif)' }}>— 김영하, 『살인자의 기억법』</span>
      </div>
    </div>
  );
}

// ── Books screen (bookshelf form) ───────────────────────────────────────
function BooksScreen({ direction, onSelect }) {
  const [q, setQ] = useState('');
  const filtered = useMemo(() => BOOKS.filter(b =>
    !q || b.title.includes(q) || b.author.includes(q) || b.genre.includes(q)
  ), [q]);

  const showShelf = direction === 'study'; // wooden shelves with spines+covers
  const showFloating = direction === 'night'; // floating glow covers

  return (
    <div className="dd-page" style={{ padding: '36px 48px 60px', display: 'flex', flexDirection: 'column', gap: 32 }}>
      <div className="dd-books-head" style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', letterSpacing: '0.3em',
            textTransform: 'uppercase', marginBottom: 8 }}>The Library</div>
          <h1 className="dd-h1" style={{
            fontFamily: 'var(--serif)', fontSize: 'var(--h1)', fontWeight: 500,
            margin: 0, color: 'var(--text)', letterSpacing: '-0.03em', lineHeight: 1,
          }}>역대 <em style={{ fontStyle: 'italic', color: 'var(--accent)' }}>도서 목록</em></h1>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="제목 · 저자 · 장르"
            style={{
              padding: '10px 14px', minWidth: 280, background: 'transparent',
              border: '1px solid var(--border)', borderBottom: '1px solid var(--text)',
              borderTop: 0, borderLeft: 0, borderRight: 0,
              fontSize: 13, color: 'var(--text)', outline: 'none',
              fontFamily: 'var(--sans)',
            }} />
        </div>
      </div>

      {showShelf && <BookShelfStudy books={filtered} onSelect={onSelect} />}
      {showFloating && <BookShelfNight books={filtered} onSelect={onSelect} />}
      {!showShelf && !showFloating && <BookShelfMagazine books={filtered} onSelect={onSelect} />}
    </div>
  );
}

function BookShelfMagazine({ books, onSelect }) {
  // Editorial grid: large covers laid out in an asymmetric magazine grid
  return (
    <div className="dd-shelf-mag" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '40px 28px' }}>
      {books.map((b, i) => (
        <button key={b.id} onClick={() => onSelect(b)} style={{
          appearance: 'none', border: 0, background: 'transparent', padding: 0,
          textAlign: 'left', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 12,
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
            minHeight: 230, position: 'relative',
          }}>
            <span style={{
              position: 'absolute', top: 0, left: 0, fontFamily: 'var(--serif)',
              fontSize: 13, color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums',
              letterSpacing: '0.05em',
            }}>{String(i + 1).padStart(2, '0')}.</span>
            <Cover book={b} size="m" />
          </div>
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 10 }}>
            <div style={{ fontFamily: 'var(--serif)', fontSize: 15, fontWeight: 500,
              color: 'var(--text)', letterSpacing: '-0.015em', lineHeight: 1.25,
              textWrap: 'balance' }}>{b.title}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4,
              fontFamily: 'var(--sans)' }}>{b.author} · {b.year}</div>
          </div>
        </button>
      ))}
    </div>
  );
}

function BookShelfStudy({ books, onSelect, perRow = 6 }) {
  // Vertical book spines standing on a wooden shelf. Title runs along
  // each spine in vertical-LR (columns flow left→right, top→bottom,
  // so "하쿠나 마타타 …" reads from the LEFT column down). Font is
  // sized so the whole title fits in a single vertical line. A brass
  // year plaque hangs off the right end of each shelf.
  const rows = [];
  for (let i = 0; i < books.length; i += perRow) rows.push(books.slice(i, i + perRow));
  return (
    <div className="dd-shelf-study" style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {rows.map((row, r) => {
        const years = row.map(b => b.year).filter(Boolean);
        const ymin = Math.min(...years);
        const ymax = Math.max(...years);
        return (
          <div key={r} style={{ position: 'relative' }}>
            <div style={{
              display: 'flex', alignItems: 'flex-end', gap: 8, paddingBottom: 0,
              minHeight: 260, paddingLeft: 12, paddingRight: 0, flexWrap: 'wrap',
            }}>
              {row.map((b, i) => {
                const heights = [228, 218, 238, 222, 212, 232];
                const h = heights[(r * perRow + i) % heights.length];
                const widths = [44, 40, 48, 42, 46, 38];
                const w = widths[(r * perRow + i) % widths.length];
                return (
                  <button key={b.id} onClick={() => onSelect(b)} title={`${b.title} — ${b.author} (${b.year})`} style={{
                    appearance: 'none', border: 0, padding: 0, cursor: 'pointer',
                    width: w, height: h, position: 'relative', overflow: 'hidden',
                    background: `linear-gradient(90deg, ${b.spine} 0%, ${b.color} 18%, ${b.color} 82%, ${b.spine} 100%)`,
                    boxShadow: 'inset 2px 0 0 rgba(255,255,255,.10), inset -2px 0 0 rgba(0,0,0,.20), 0 1px 3px rgba(0,0,0,.2)',
                    borderRadius: '1px 1px 0 0',
                    transition: 'transform .15s',
                    display: 'flex', flexDirection: 'column', alignItems: 'center',
                  }}
                    onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-6px)'}
                    onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}>
                    {/* Title — vertical-LR, single line, small font so the whole title fits in one column */}
                    <div style={{
                      writingMode: 'vertical-lr',
                      whiteSpace: 'nowrap',
                      color: 'rgba(255,255,255,.96)', fontFamily: 'var(--serif)',
                      fontSize: 10.5, padding: '14px 0 8px',
                      letterSpacing: '0.04em', fontWeight: 500, lineHeight: 1.2,
                      flex: 1, minHeight: 0, overflow: 'hidden',
                      textShadow: '0 1px 1px rgba(0,0,0,.18)',
                    }}>{b.title}</div>
                    {/* year sticker at the base of each spine */}
                    <div style={{
                      width: '100%', padding: '4px 0 5px',
                      fontFamily: 'var(--serif)', fontSize: 8.5,
                      fontVariantNumeric: 'tabular-nums', letterSpacing: '0.06em',
                      color: 'rgba(255,255,255,.58)', textAlign: 'center',
                      borderTop: '1px solid rgba(0,0,0,.22)',
                    }}>{b.year}</div>
                  </button>
                );
              })}
              {/* Bookend */}
              <div style={{
                width: 14, height: 46, background: 'var(--accent)', alignSelf: 'flex-end',
                boxShadow: '0 -1px 2px rgba(0,0,0,.2)',
                marginLeft: 4,
              }} />
            </div>
            {/* Brass year plaque — positioned absolute so narrow viewports
                don't wrap it to a new flex line (which made the books look
                like they were floating above the shelf). Sits on the shelf
                board at the right end. */}
            <div className="dd-plaque" style={{
              position: 'absolute', right: 12, bottom: 16,
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              pointerEvents: 'none',
            }}>
              {/* hanger chain */}
              <span style={{
                width: 2, height: 14, background: 'linear-gradient(180deg, #8a6a3a 0%, #5a3a1a 100%)',
              }} />
              <div style={{
                padding: '10px 16px',
                minWidth: 92, textAlign: 'center',
                background: 'linear-gradient(180deg, #d8b27a 0%, #c08648 38%, #a76c2c 72%, #8a5418 100%)',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,.5), inset 0 -1px 0 rgba(0,0,0,.25), 0 3px 6px rgba(0,0,0,.25)',
                borderRadius: 3, position: 'relative',
                color: '#2a1808', fontFamily: 'var(--serif)',
                textShadow: '0 1px 0 rgba(255,255,255,.22)',
              }}>
                <div style={{ fontSize: 8, letterSpacing: '0.35em',
                  color: '#3e2410', textTransform: 'uppercase', fontWeight: 600 }}>Anno</div>
                <div style={{ fontSize: 13, fontVariantNumeric: 'tabular-nums',
                  fontWeight: 700, letterSpacing: '0.04em', marginTop: 2, lineHeight: 1.15 }}>
                  {ymin === ymax ? ymin : `${ymin}–${ymax}`}
                </div>
                {/* corner pins */}
                <span style={{ position: 'absolute', top: 4, left: 4, width: 3, height: 3,
                  borderRadius: '50%', background: 'radial-gradient(circle at 30% 30%, #b88a4a 0%, #4c2e0c 80%)' }} />
                <span style={{ position: 'absolute', top: 4, right: 4, width: 3, height: 3,
                  borderRadius: '50%', background: 'radial-gradient(circle at 30% 30%, #b88a4a 0%, #4c2e0c 80%)' }} />
                <span style={{ position: 'absolute', bottom: 4, left: 4, width: 3, height: 3,
                  borderRadius: '50%', background: 'radial-gradient(circle at 30% 30%, #b88a4a 0%, #4c2e0c 80%)' }} />
                <span style={{ position: 'absolute', bottom: 4, right: 4, width: 3, height: 3,
                  borderRadius: '50%', background: 'radial-gradient(circle at 30% 30%, #b88a4a 0%, #4c2e0c 80%)' }} />
              </div>
            </div>
            {/* Wooden shelf board */}
            <div style={{
              height: 16,
              background: 'linear-gradient(180deg, #7a5232 0%, #5a3a20 50%, #3a2310 100%)',
              boxShadow: '0 10px 18px -8px rgba(0,0,0,.55), inset 0 1px 0 rgba(255,255,255,.1)',
              marginBottom: 30, borderRadius: '0 0 2px 2px',
            }} />
          </div>
        );
      })}
    </div>
  );
}

function BookShelfNight({ books, onSelect }) {
  // Floating glowing covers on dark
  return (
    <div className="dd-shelf-night" style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '36px 24px',
      padding: '20px 0' }}>
      {books.map((b) => (
        <button key={b.id} onClick={() => onSelect(b)} style={{
          appearance: 'none', border: 0, background: 'transparent', padding: 0,
          textAlign: 'center', cursor: 'pointer', display: 'flex',
          flexDirection: 'column', alignItems: 'center', gap: 10,
        }}>
          <div style={{
            filter: 'drop-shadow(0 8px 16px rgba(0,0,0,.5)) drop-shadow(0 0 24px rgba(212,148,107,.08))',
            transition: 'transform .2s, filter .2s',
          }}
            onMouseEnter={e => {
              e.currentTarget.style.transform = 'translateY(-4px)';
              e.currentTarget.style.filter = 'drop-shadow(0 12px 24px rgba(0,0,0,.6)) drop-shadow(0 0 32px rgba(212,148,107,.22))';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.filter = 'drop-shadow(0 8px 16px rgba(0,0,0,.5)) drop-shadow(0 0 24px rgba(212,148,107,.08))';
            }}>
            <Cover book={b} size="m" />
          </div>
          <div style={{
            fontFamily: 'var(--serif)', fontSize: 13, color: 'var(--text)',
            letterSpacing: '-0.01em', textWrap: 'balance', lineHeight: 1.25,
          }}>{b.title}</div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.08em' }}>
            {b.author}
          </div>
        </button>
      ))}
    </div>
  );
}

// ── Book detail (감상평) ─────────────────────────────────────────────────
function BookDetailScreen({ book, onBack }) {
  const [rating, setRating] = useState(0);
  const [text, setText] = useState('');
  const reviews = REVIEWS.filter(r => r.book === book.title || r.book.startsWith(book.title.slice(0, 5)));
  return (
    <div className="dd-page" style={{ padding: '36px 48px 60px', display: 'flex', flexDirection: 'column', gap: 28 }}>
      <button onClick={onBack} style={{
        background: 'transparent', border: 0, padding: 0, cursor: 'pointer',
        color: 'var(--text-muted)', fontSize: 12, alignSelf: 'flex-start',
        fontFamily: 'var(--sans)',
      }}>← 목록으로</button>

      <div className="dd-detail-hero" style={{ display: 'grid', gridTemplateColumns: '180px 1fr', gap: 32, alignItems: 'start',
        paddingBottom: 28, borderBottom: '1px solid var(--border)' }}>
        <Cover book={book} size="l" />
        <div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', letterSpacing: '0.2em',
            marginBottom: 6 }}>{book.genre} · {book.year}</div>
          <h1 style={{
            fontFamily: 'var(--serif)', fontSize: 'var(--h1)', fontWeight: 500,
            margin: '0 0 8px', color: 'var(--text)', letterSpacing: '-0.03em', lineHeight: 1.02,
          }}>{book.title}</h1>
          <div style={{ fontFamily: 'var(--serif)', fontSize: 16, fontStyle: 'italic',
            color: 'var(--accent)' }}>— {book.author}</div>
          {book.intro && <p style={{
            marginTop: 18, fontFamily: 'var(--serif)', fontSize: 14, lineHeight: 1.7,
            color: 'var(--text)', maxWidth: 640, textWrap: 'pretty',
          }}>{book.intro}</p>}
        </div>
      </div>

      <div>
        <SectionTitle num="01." title="감상평 남기기" />
        <div style={{
          padding: 24, background: 'var(--surface)', border: '1px solid var(--border)',
          display: 'flex', flexDirection: 'column', gap: 14,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {[1,2,3,4,5].map(n => (
              <button key={n} onClick={() => setRating(n)} style={{
                appearance: 'none', border: 0, background: 'transparent', padding: 0,
                cursor: 'pointer', fontSize: 24, lineHeight: 1,
                color: n <= rating ? 'var(--accent)' : 'var(--border)',
              }}>★</button>
            ))}
            <span style={{ marginLeft: 8, fontSize: 11, color: 'var(--text-muted)' }}>
              {rating ? `${rating}.0 · ` : ''}별점을 선택해 주세요
            </span>
          </div>
          <textarea value={text} onChange={e => setText(e.target.value)}
            placeholder="이 책 어떠셨나요? 자유롭게 적어주세요."
            style={{
              minHeight: 140, padding: 14, background: 'transparent',
              border: '1px solid var(--border)', resize: 'vertical', fontSize: 14,
              fontFamily: 'var(--serif)', lineHeight: 1.6, color: 'var(--text)',
              outline: 'none',
            }} />
          <div style={{ display: 'flex', gap: 10 }}>
            <button style={{
              flex: 1, padding: '12px 16px', background: 'transparent',
              border: '1px solid var(--accent)', color: 'var(--accent)', cursor: 'pointer',
              fontSize: 12, letterSpacing: '0.08em', fontFamily: 'var(--sans)',
            }}>임시저장</button>
            <button style={{
              flex: 2, padding: '12px 16px', background: 'var(--accent)',
              border: 0, color: 'var(--surface)', cursor: 'pointer',
              fontSize: 12, letterSpacing: '0.08em', fontFamily: 'var(--sans)',
            }}>감상평 남기기</button>
          </div>
        </div>
      </div>

      <div>
        <SectionTitle num="02." title="다른 회원들의 감상평" sub={`${reviews.length}개`} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          {reviews.length === 0 && (
            <div style={{
              padding: 32, textAlign: 'center', color: 'var(--text-muted)',
              fontFamily: 'var(--serif)', fontStyle: 'italic',
            }}>아직 감상평이 없어요. 첫 번째로 남겨보세요.</div>
          )}
          {reviews.map((r, i) => (
            <div key={r.id} style={{
              padding: '18px 0', borderTop: i === 0 ? '1px solid var(--border)' : 'none',
              borderBottom: '1px solid var(--border)',
              display: 'grid', gridTemplateColumns: '120px 1fr auto', gap: 18, alignItems: 'start',
            }}>
              <div>
                <div style={{ fontFamily: 'var(--serif)', fontSize: 14, color: 'var(--text)',
                  fontWeight: 500 }}>{r.user}</div>
                <div style={{ color: 'var(--accent)', fontSize: 12, marginTop: 2 }}>
                  {'★'.repeat(r.rating)}<span style={{ color: 'var(--border)' }}>{'★'.repeat(5-r.rating)}</span>
                </div>
              </div>
              <div style={{ fontFamily: 'var(--serif)', fontSize: 14, lineHeight: 1.6,
                color: 'var(--text)' }}>{r.body}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>♥ {r.likes} · 💬 {r.comments}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Weekly screen ───────────────────────────────────────────────────────
function WeeklyScreen() {
  const [tab, setTab] = useState('week');
  const current = WEEKLY_POSTS.find(p => p.current);
  return (
    <div className="dd-page" style={{ padding: '36px 48px 60px', display: 'flex', flexDirection: 'column', gap: 32 }}>
      <div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', letterSpacing: '0.3em',
          textTransform: 'uppercase', marginBottom: 8 }}>The Weekly · 이 주의 글</div>
        <h1 style={{
          fontFamily: 'var(--serif)', fontSize: 'var(--h1)', fontWeight: 500,
          margin: 0, color: 'var(--text)', letterSpacing: '-0.03em', lineHeight: 1,
        }}>책에서 길어올린 <em style={{ fontStyle: 'italic', color: 'var(--accent)' }}>한 구절</em></h1>
      </div>

      <article style={{
        padding: '32px 36px', border: '1px solid var(--accent)',
        background: 'var(--surface)', position: 'relative',
      }}>
        <span style={{
          position: 'absolute', top: -10, left: 24, padding: '2px 10px',
          background: 'var(--accent)', color: 'var(--surface)', fontSize: 10,
          letterSpacing: '0.2em', fontFamily: 'var(--serif)',
        }}>현재 · {current.week}</span>
        <div style={{ display: 'flex', gap: 10, marginBottom: 14, alignItems: 'center' }}>
          <Pill>이 주의 글</Pill>
          <Pill>{current.tag}</Pill>
        </div>
        <p style={{
          fontFamily: 'var(--serif)', fontSize: 20, lineHeight: 1.55, color: 'var(--text)',
          margin: 0, letterSpacing: '-0.01em', textWrap: 'pretty',
        }}>{current.body}</p>
        <div style={{ marginTop: 18, fontSize: 12, color: 'var(--text-muted)',
          fontFamily: 'var(--serif)', fontStyle: 'italic' }}>— {current.book}</div>
        <div style={{ marginTop: 6, fontSize: 12, color: 'var(--accent)' }}>
          토론 질문 {current.questions}개 →
        </div>
      </article>

      <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--border)' }}>
        {[['week','주간'],['month','월간']].map(([k, lbl]) => (
          <button key={k} onClick={() => setTab(k)} style={{
            appearance: 'none', border: 0, padding: '10px 18px', cursor: 'pointer',
            background: 'transparent', fontFamily: 'var(--serif)', fontSize: 13,
            color: tab === k ? 'var(--text)' : 'var(--text-muted)',
            borderBottom: tab === k ? '2px solid var(--accent)' : '2px solid transparent',
            fontWeight: tab === k ? 500 : 400, marginBottom: -1,
          }}>{lbl}</button>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
        {WEEKLY_POSTS.map((p, i) => (
          <div key={p.id} style={{
            padding: '20px 0', borderBottom: '1px solid var(--border)',
            display: 'grid', gridTemplateColumns: '100px 1fr', gap: 24, alignItems: 'start',
          }}>
            <div style={{
              fontFamily: 'var(--serif)', fontSize: 13, color: 'var(--text-muted)',
              letterSpacing: '0.05em', paddingTop: 4,
            }}>{p.week}</div>
            <div>
              <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
                <Pill>{p.tag}</Pill>
                {p.current && <span style={{
                  fontSize: 10, color: 'var(--accent)', alignSelf: 'center',
                  letterSpacing: '0.15em',
                }}>· NOW</span>}
              </div>
              <p style={{
                fontFamily: 'var(--serif)', fontSize: 15, lineHeight: 1.55, margin: 0,
                color: 'var(--text)', display: '-webkit-box', WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical', overflow: 'hidden', textWrap: 'pretty',
              }}>{p.body}</p>
              <div style={{ marginTop: 8, fontSize: 11, color: 'var(--text-muted)' }}>
                — {p.book} · 질문 {p.questions}개
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Meetings (calendar + list) ──────────────────────────────────────────
function MeetingsScreen() {
  const ym = '2026년 5월';
  const days = Array.from({ length: 31 }, (_, i) => i + 1);
  // 5/1 = Friday in 2026
  const blanks = 5; // Sun=0..Thu=4 blank
  const meetingDays = { 23: true, 24: true };
  const today = 14;
  return (
    <div className="dd-page" style={{ padding: '36px 48px 60px', display: 'flex', flexDirection: 'column', gap: 28 }}>
      <div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', letterSpacing: '0.3em',
          textTransform: 'uppercase', marginBottom: 8 }}>Schedule · 모임 일정</div>
        <h1 style={{
          fontFamily: 'var(--serif)', fontSize: 'var(--h1)', fontWeight: 500,
          margin: 0, color: 'var(--text)', letterSpacing: '-0.03em', lineHeight: 1,
        }}>{ym}<em style={{ fontStyle: 'italic', color: 'var(--accent)' }}>.</em></h1>
      </div>

      <div className="dd-meet-grid" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 32 }}>
        <div style={{ border: '1px solid var(--border)', padding: 18, background: 'var(--surface)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            marginBottom: 14 }}>
            <button style={{ appearance: 'none', border: 0, background: 'transparent',
              cursor: 'pointer', color: 'var(--text-muted)', fontSize: 14, fontFamily: 'var(--serif)' }}>‹</button>
            <span style={{ fontFamily: 'var(--serif)', fontSize: 14, color: 'var(--text)',
              letterSpacing: '0.05em' }}>{ym}</span>
            <button style={{ appearance: 'none', border: 0, background: 'transparent',
              cursor: 'pointer', color: 'var(--text-muted)', fontSize: 14, fontFamily: 'var(--serif)' }}>›</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 0,
            borderTop: '1px solid var(--border)' }}>
            {['일','월','화','수','목','금','토'].map((d, i) => (
              <div key={d} style={{
                padding: '8px 0', textAlign: 'center', fontSize: 10, fontFamily: 'var(--serif)',
                color: i === 0 ? 'var(--accent)' : 'var(--text-muted)',
                letterSpacing: '0.15em', borderBottom: '1px solid var(--border)',
              }}>{d}</div>
            ))}
            {Array.from({ length: blanks }).map((_, i) => <div key={`bl-${i}`} style={{ minHeight: 64 }} />)}
            {days.map(d => {
              const wd = (blanks + d - 1) % 7;
              const meet = meetingDays[d];
              const isToday = d === today;
              return (
                <div key={d} style={{
                  minHeight: 64, padding: 6, position: 'relative',
                  border: isToday ? '1px solid var(--accent)' : 'none',
                  background: meet ? 'var(--accent)' : 'transparent',
                  color: meet ? 'var(--surface)' : wd === 0 ? 'var(--accent)' : 'var(--text)',
                }}>
                  <div style={{
                    fontFamily: 'var(--serif)', fontSize: 13, fontWeight: meet ? 600 : 400,
                    fontVariantNumeric: 'tabular-nums',
                  }}>{d}</div>
                  {meet && <div style={{ position: 'absolute', bottom: 6, right: 6, fontSize: 8,
                    letterSpacing: '0.1em' }}>MEET</div>}
                </div>
              );
            })}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ fontFamily: 'var(--serif)', fontSize: 14, color: 'var(--text)',
            letterSpacing: '0.05em', marginBottom: 4 }}>다가오는 모임</div>
          {MEETINGS.map(m => (
            <div key={m.id} style={{
              padding: 16, background: 'var(--surface)', border: '1px solid var(--border)',
              display: 'flex', flexDirection: 'column', gap: 6,
            }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                <span style={{
                  fontFamily: 'var(--serif)', fontSize: 24, fontWeight: 500,
                  color: 'var(--accent)', letterSpacing: '-0.02em', lineHeight: 1,
                }}>D-{m.d}</span>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{m.date}</span>
              </div>
              <div style={{ fontSize: 12, color: 'var(--text)', fontFamily: 'var(--serif)' }}>
                📖 {m.book}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{m.label} · {m.time}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── All reviews ─────────────────────────────────────────────────────────
function ReviewsScreen() {
  return (
    <div className="dd-page" style={{ padding: '36px 48px 60px', display: 'flex', flexDirection: 'column', gap: 28 }}>
      <div className="dd-books-head" style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', letterSpacing: '0.3em',
            textTransform: 'uppercase', marginBottom: 8 }}>Reviews · 감상평</div>
          <h1 style={{
            fontFamily: 'var(--serif)', fontSize: 'var(--h1)', fontWeight: 500,
            margin: 0, color: 'var(--text)', letterSpacing: '-0.03em', lineHeight: 1,
          }}>전체 <em style={{ fontStyle: 'italic', color: 'var(--accent)' }}>감상평</em></h1>
        </div>
        <input placeholder="감상평 · 책 제목" style={{
          padding: '10px 14px', minWidth: 280, background: 'transparent',
          border: '1px solid var(--border)', borderBottom: '1px solid var(--text)',
          borderTop: 0, borderLeft: 0, borderRight: 0, fontSize: 13,
          color: 'var(--text)', outline: 'none', fontFamily: 'var(--sans)',
        }} />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
        {REVIEWS.map((r, i) => (
          <div key={r.id} style={{
            padding: '20px 0', borderTop: i === 0 ? '1px solid var(--border)' : 'none',
            borderBottom: '1px solid var(--border)',
            display: 'grid', gridTemplateColumns: '120px 1fr 100px', gap: 24, alignItems: 'center',
          }}>
            <div>
              <div style={{ fontFamily: 'var(--serif)', fontSize: 13, fontWeight: 500,
                color: 'var(--text)' }}>{r.user}</div>
              <div style={{ color: 'var(--accent)', fontSize: 11, marginTop: 2 }}>
                {'★'.repeat(r.rating)}<span style={{ color: 'var(--border)' }}>{'★'.repeat(5-r.rating)}</span>
              </div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)',
                letterSpacing: '0.05em', marginBottom: 2,
                fontFamily: 'var(--serif)', fontStyle: 'italic',
              }}>📖 {r.book}</div>
              <div style={{ fontFamily: 'var(--serif)', fontSize: 14, color: 'var(--text)',
                lineHeight: 1.5, textWrap: 'pretty' }}>{r.body}</div>
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'right' }}>
              ♥ {r.likes} · 💬 {r.comments}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Free board ──────────────────────────────────────────────────────────
function BoardScreen() {
  return (
    <div className="dd-page" style={{ padding: '36px 48px 60px', display: 'flex', flexDirection: 'column', gap: 28 }}>
      <div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', letterSpacing: '0.3em',
          textTransform: 'uppercase', marginBottom: 8 }}>The Board · 자유게시판</div>
        <h1 style={{
          fontFamily: 'var(--serif)', fontSize: 'var(--h1)', fontWeight: 500,
          margin: 0, color: 'var(--text)', letterSpacing: '-0.03em', lineHeight: 1,
        }}>회원들의 <em style={{ fontStyle: 'italic', color: 'var(--accent)' }}>이야기</em></h1>
      </div>

      <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        {['전체','리뷰','글쓰기','필사','기타','지난 독모'].map((t, i) => (
          <button key={t} style={{
            appearance: 'none', border: '1px solid var(--border)', padding: '6px 12px',
            cursor: 'pointer', background: i === 0 ? 'var(--text)' : 'transparent',
            color: i === 0 ? 'var(--surface)' : 'var(--text-muted)', fontSize: 11,
            fontFamily: 'var(--sans)', letterSpacing: '0.04em', borderRadius: 999,
          }}>{t}</button>
        ))}
        <span style={{ flex: 1 }} />
        <button style={{
          padding: '10px 18px', background: 'var(--accent)', border: 0,
          color: 'var(--surface)', cursor: 'pointer', fontSize: 12,
          fontFamily: 'var(--sans)', letterSpacing: '0.08em',
        }}>＋ 글쓰기</button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
        {BOARD_POSTS.map((p, i) => (
          <div key={p.id} style={{
            padding: '18px 0', borderTop: i === 0 ? '1px solid var(--border)' : 'none',
            borderBottom: '1px solid var(--border)',
            display: 'grid', gridTemplateColumns: '80px 1fr auto', gap: 20, alignItems: 'center',
          }}>
            <span style={{
              fontSize: 10, color: p.tagColor, letterSpacing: '0.1em',
              fontFamily: 'var(--serif)', textTransform: 'uppercase', fontWeight: 500,
            }}>— {p.tag}</span>
            <div>
              <div style={{ fontFamily: 'var(--serif)', fontSize: 16, fontWeight: 500,
                color: 'var(--text)', letterSpacing: '-0.015em', lineHeight: 1.25 }}>{p.title}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                {p.user} · {p.date}
              </div>
            </div>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{p.comments ? `💬 ${p.comments}` : ''}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Notices ─────────────────────────────────────────────────────────────
function NoticesScreen() {
  return (
    <div className="dd-page" style={{ padding: '36px 48px 60px', display: 'flex', flexDirection: 'column', gap: 28 }}>
      <div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', letterSpacing: '0.3em',
          textTransform: 'uppercase', marginBottom: 8 }}>Notice · 공지사항</div>
        <h1 style={{
          fontFamily: 'var(--serif)', fontSize: 'var(--h1)', fontWeight: 500,
          margin: 0, color: 'var(--text)', letterSpacing: '-0.03em', lineHeight: 1,
        }}>독독한 <em style={{ fontStyle: 'italic', color: 'var(--accent)' }}>소식</em></h1>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
        {NOTICES.map((n, i) => (
          <div key={n.id} style={{
            padding: '22px 18px', borderTop: i === 0 ? '1px solid var(--border)' : 'none',
            borderBottom: '1px solid var(--border)',
            background: n.pinned ? 'var(--surface)' : 'transparent',
            borderLeft: n.pinned ? '3px solid var(--accent)' : 'none',
            display: 'flex', alignItems: 'baseline', gap: 18,
          }}>
            {n.pinned && <span style={{
              fontSize: 10, color: 'var(--accent)', letterSpacing: '0.2em',
              fontFamily: 'var(--serif)', textTransform: 'uppercase', fontWeight: 600,
            }}>📌 고정</span>}
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: 'var(--serif)', fontSize: 17, fontWeight: 500,
                color: 'var(--text)', letterSpacing: '-0.015em' }}>{n.title}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                {n.date}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

Object.assign(window, {
  Sidebar, Header, HomeScreen, BooksScreen, BookDetailScreen,
  WeeklyScreen, MeetingsScreen, ReviewsScreen, BoardScreen, NoticesScreen,
});
