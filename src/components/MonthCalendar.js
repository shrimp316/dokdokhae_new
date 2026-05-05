'use client';
import { useMemo, useState } from 'react';

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
    <div style={{ background: 'var(--card)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow)', padding: 14, marginBottom: 14 }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom: 10 }}>
        <button type="button" className="btn-sm btn-outline" onClick={() => go(-1)} aria-label="이전 달">‹</button>
        <div style={{ fontFamily:'var(--font-serif)', fontWeight:600, color:'var(--accent)' }}>
          {view.y}년 {view.m + 1}월
        </div>
        <div style={{ display:'flex', gap:4 }}>
          <button type="button" className="btn-sm btn-outline" onClick={goToday}>오늘</button>
          <button type="button" className="btn-sm btn-outline" onClick={() => go(1)} aria-label="다음 달">›</button>
        </div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(7, 1fr)', gap:2, marginBottom:4 }}>
        {WEEKDAYS.map(w => (
          <div key={w} style={{ textAlign:'center', fontSize:11, color:'var(--muted)', padding:'4px 0' }}>{w}</div>
        ))}
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(7, 1fr)', gap:2 }}>
        {cells.map((d, i) => {
          if (!d) return <div key={i} />;
          const key = ymd(d);
          const hasEvent = eventDays.has(key);
          const isToday = isSameDay(d, today);
          const isSelected = value && isSameDay(d, value);
          const dow = d.getDay();
          const bg = isSelected ? 'var(--accent)' : hasEvent ? 'var(--accent2)' : 'transparent';
          const color = (isSelected || hasEvent) ? '#fff' : (dow === 0 ? '#c0392b' : (dow === 6 ? '#2a6fb3' : 'var(--text)'));
          return (
            <button
              key={key}
              type="button"
              onClick={() => onChange?.(d)}
              style={{
                aspectRatio: '1 / 1',
                padding: 0,
                border: isToday ? '1.5px solid var(--accent2)' : '1px solid transparent',
                borderRadius: 6,
                background: bg,
                color,
                fontSize: 13,
                fontWeight: hasEvent || isSelected ? 600 : 400,
                cursor: 'pointer',
                display:'flex', alignItems:'center', justifyContent:'center',
                fontFamily:'var(--font-sans)',
              }}
            >
              {d.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}
