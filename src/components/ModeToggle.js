'use client';
import { useTheme } from '@/lib/ThemeContext';

const MODES = [
  { value: 'light', label: '라이트' },
  { value: 'sepia', label: '세피아' },
  { value: 'dark',  label: '다크' },
];

export default function ModeToggle() {
  const { mode, setMode, fontSize, setFontSize } = useTheme();

  return (
    <div
      style={{
        padding: '14px 14px 12px',
        borderTop: '1px solid var(--dd-border)',
        display: 'flex', flexDirection: 'column', gap: 10,
      }}
    >
      <div
        style={{
          fontFamily: 'var(--dd-serif)', fontSize: 9,
          color: 'var(--dd-text-muted)',
          letterSpacing: '0.3em', textTransform: 'uppercase',
        }}
      >
        Display
      </div>

      {/* Mode segmented control */}
      <div
        role="radiogroup"
        aria-label="화면 모드"
        style={{ display: 'flex', gap: 0 }}
      >
        {MODES.map((m) => {
          const active = mode === m.value;
          return (
            <button
              key={m.value}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => setMode(m.value)}
              style={{
                flex: 1,
                appearance: 'none', border: 0, background: 'transparent',
                padding: '5px 0',
                fontFamily: 'var(--dd-serif)', fontSize: 11,
                color: active ? 'var(--dd-accent)' : 'var(--dd-text-muted)',
                fontWeight: active ? 600 : 400,
                borderBottom: active
                  ? '2px solid var(--dd-accent)'
                  : '2px solid transparent',
                cursor: 'pointer',
                letterSpacing: '0.05em',
                transition: 'color .15s, border-color .15s',
              }}
            >
              {m.label}
            </button>
          );
        })}
      </div>

      {/* Font size A− / px / A+ */}
      <div
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          fontFamily: 'var(--dd-sans)', fontSize: 11,
        }}
      >
        <button
          type="button"
          onClick={() => setFontSize(fontSize - 1)}
          disabled={fontSize <= 12}
          aria-label="본문 크기 줄이기"
          style={{
            appearance: 'none', border: '1px solid var(--dd-border)',
            background: 'transparent',
            color: fontSize <= 12 ? 'var(--dd-text-muted)' : 'var(--dd-text)',
            padding: '2px 8px', cursor: fontSize <= 12 ? 'not-allowed' : 'pointer',
            borderRadius: 2,
            fontFamily: 'var(--dd-serif)', fontSize: 12,
            opacity: fontSize <= 12 ? 0.5 : 1,
          }}
        >
          A−
        </button>
        <span
          style={{
            flex: 1, textAlign: 'center',
            color: 'var(--dd-text)',
            fontVariantNumeric: 'tabular-nums',
            fontSize: 11,
          }}
        >
          {fontSize}px
        </span>
        <button
          type="button"
          onClick={() => setFontSize(fontSize + 1)}
          disabled={fontSize >= 18}
          aria-label="본문 크기 늘리기"
          style={{
            appearance: 'none', border: '1px solid var(--dd-border)',
            background: 'transparent',
            color: fontSize >= 18 ? 'var(--dd-text-muted)' : 'var(--dd-text)',
            padding: '2px 8px', cursor: fontSize >= 18 ? 'not-allowed' : 'pointer',
            borderRadius: 2,
            fontFamily: 'var(--dd-serif)', fontSize: 12,
            opacity: fontSize >= 18 ? 0.5 : 1,
          }}
        >
          A+
        </button>
      </div>
    </div>
  );
}
