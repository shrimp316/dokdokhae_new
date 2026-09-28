'use client';
import { useMemo, useState } from 'react';
import styles from './MonthCalendar.module.css';

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

function pad2(n) { return String(n).padStart(2, '0'); }
function ymd(d) { return `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`; }
function startOfMonth(y, m) { return new Date(y, m, 1); }
function isSameDay(a, b) {
  return a.getFullYear()===b.getFullYear() && a.getMonth()===b.getMonth() && a.getDate()===b.getDate();
}

export default function MonthCalendar({ meetings = [], value = null, onChange }) {
  const today = new Date();
  const [view, setView] = useState(() => {
    const base = value || today;
    return { y: base.getFullYear(), m: base.getMonth() };
  });

  const eventDays = useMemo(() => {
    const set = new Set();
    for (const meet of meetings) {
      if (!meet?.date) continue;
      const d = new Date(meet.date);
      if (Number.isNaN(d.getTime())) continue;
      set.add(ymd(d));
    }
    return set;
  }, [meetings]);

  const cells = useMemo(() => {
    const first = startOfMonth(view.y, view.m);
    const startWeekday = first.getDay();
    const daysInMonth = new Date(view.y, view.m + 1, 0).getDate();
    const arr = [];
    for (let i = 0; i < startWeekday; i++) arr.push(null);
    for (let day = 1; day <= daysInMonth; day++) {
      arr.push(new Date(view.y, view.m, day));
    }
    while (arr.length % 7 !== 0) arr.push(null);
    // 달마다 주 수가 달라도 달력 높이가 흔들리지 않도록 항상 6주를 채운다.
    while (arr.length < 42) arr.push(null);
    return arr;
  }, [view]);

  function go(delta) {
    setView(v => {
      let y = v.y, m = v.m + delta;
      if (m < 0) { m = 11; y--; }
      if (m > 11) { m = 0; y++; }
      return { y, m };
    });
  }
  function goToday() {
    setView({ y: today.getFullYear(), m: today.getMonth() });
    onChange?.(today);
  }

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <button type="button" className="btn-sm btn-outline" onClick={() => go(-1)} aria-label="이전 달">‹</button>
        <div className={styles.title}>
          {view.y}년 {view.m + 1}월
        </div>
        <div className={styles.headerNav}>
          <button type="button" className="btn-sm btn-outline" onClick={goToday}>오늘</button>
          <button type="button" className="btn-sm btn-outline" onClick={() => go(1)} aria-label="다음 달">›</button>
        </div>
      </div>

      <div className={styles.weekdayRow}>
        {WEEKDAYS.map(w => (
          <div key={w} className={styles.weekday}>{w}</div>
        ))}
      </div>

      <div className={styles.dayGrid}>
        {cells.map((d, i) => {
          if (!d) return <div key={i} />;
          const key = ymd(d);
          const hasEvent = eventDays.has(key);
          const isToday = isSameDay(d, today);
          const isSelected = value && isSameDay(d, value);
          const dow = d.getDay();
          return (
            <button
              key={key}
              type="button"
              onClick={() => onChange?.(d)}
              className={styles.day}
              data-today={isToday || undefined}
              data-sun={dow === 0 || undefined}
              data-sat={dow === 6 || undefined}
              data-event={hasEvent || undefined}
              data-selected={isSelected || undefined}
            >
              {d.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}
