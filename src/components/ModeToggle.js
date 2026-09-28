'use client';
import { useTheme } from '@/lib/ThemeContext';
import styles from './ModeToggle.module.css';

const MODES = [
  { value: 'white', label: '화이트' },
  { value: 'light', label: '라이트' },
  { value: 'dark',  label: '다크' },
];

export default function ModeToggle() {
  const { mode, setMode, fontSize, setFontSize } = useTheme();

  return (
    <div className={styles.wrap}>
      <div className={styles.label}>
        Display
      </div>

      <div
        role="radiogroup"
        aria-label="화면 모드"
        className={styles.modeGroup}
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
              className={styles.modeBtn}
              data-active={active || undefined}
            >
              {m.label}
            </button>
          );
        })}
      </div>

      <div className={styles.fontRow}>
        <button
          type="button"
          onClick={() => setFontSize(fontSize - 1)}
          disabled={fontSize <= 12}
          aria-label="본문 크기 줄이기"
          className={styles.fontBtn}
        >
          A−
        </button>
        <span className={styles.fontValue}>
          {fontSize}px
        </span>
        <button
          type="button"
          onClick={() => setFontSize(fontSize + 1)}
          disabled={fontSize >= 18}
          aria-label="본문 크기 늘리기"
          className={styles.fontBtn}
        >
          A+
        </button>
      </div>
    </div>
  );
}
