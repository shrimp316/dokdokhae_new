'use client';
import { useEffect, useState } from 'react';
import { collection, getDocs, query, orderBy, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import NoticeBanner from '@/components/NoticeBanner';

function formatDateTime(str) {
  if (!str) return '';
  const d = new Date(str);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:00`;
}

export default function SchedulePage() {
  const [meetings, setMeetings] = useState([]);
  const [books, setBooks] = useState({});

  useEffect(() => {
    async function load() {
      const snap = await getDocs(query(collection(db, 'meetings'), orderBy('date', 'asc')));
      const meets = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setMeetings(meets);

      const bookIds = [...new Set(meets.map(m => m.bookId).filter(Boolean))];
      const bookMap = {};
      await Promise.all(bookIds.map(async bid => {
        const bsnap = await getDoc(doc(db, 'books', bid));
        if (bsnap.exists()) bookMap[bid] = bsnap.data();
      }));
      setBooks(bookMap);
    }
    load();
  }, []);

  const now = new Date();

  return (
    <div>
      <NoticeBanner />
      <div className="section-title">모임 일정</div>
      {meetings.length === 0 ? (
        <p className="empty-msg">등록된 일정이 없어요.</p>
      ) : (
        meetings.map(m => {
          const mDate = new Date(m.date);
          const past = mDate < now;
          const diff = Math.ceil((mDate - now) / (1000 * 60 * 60 * 24));
          const dday = diff === 0 ? 'D-Day' : diff > 0 ? `D-${diff}` : `D+${Math.abs(diff)}`;
          const book = m.bookId ? books[m.bookId] : null;

          return (
            <div key={m.id} style={{
              display: 'flex', gap: 14, background: 'var(--card)',
              borderRadius: 'var(--radius)', padding: 16, marginBottom: 10,
              boxShadow: 'var(--shadow)', opacity: past ? 0.6 : 1
            }}>
              <div style={{ fontFamily: 'var(--font-serif)', fontSize: 16, fontWeight: 700, color: past ? 'var(--muted)' : 'var(--accent)', minWidth: 52 }}>
                {dday}
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 3 }}>
                  {formatDateTime(m.date)}{m.dateEnd ? ` ~ ${formatDateTime(m.dateEnd)}` : ''}
                </div>
                {book && <div style={{ fontSize: 12, color: 'var(--muted)' }}>📖 {book.title}</div>}
                {m.note && <div style={{ fontSize: 12, color: 'var(--accent2)', marginTop: 4 }}>{m.note}</div>}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
