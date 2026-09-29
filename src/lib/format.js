// 화면에 보이는 날짜 표기를 한곳에서 정한다. 모두 브라우저의 로컬 시간 기준이다.
// 서버에서 조회 키로 쓰는 날짜 문자열(api/cron 등)은 표시용이 아니므로 여기서 만들지 않는다.

const pad2 = (n) => String(n).padStart(2, '0');

// Firestore Timestamp, Date, 모임 일정의 datetime-local 문자열을 모두 받는다.
// 값이 없거나 날짜로 읽을 수 없으면 null을 돌려줘 화면에 빈 문자열이 나가게 한다.
function toDate(value) {
  if (!value) return null;
  const d = typeof value.toDate === 'function' ? value.toDate() : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

// 목록·댓글의 짧은 날짜: 03-07
export function formatMonthDay(value) {
  const d = toDate(value);
  return d ? `${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}` : '';
}

// 공지 날짜: 2026.3.7
export function formatDotDate(value) {
  const d = toDate(value);
  return d ? `${d.getFullYear()}.${d.getMonth() + 1}.${d.getDate()}` : '';
}

// 모임 날짜: 2026-03-07
export function formatDate(value) {
  const d = toDate(value);
  return d ? `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}` : '';
}

// 모임 시간: 19:30
export function formatTime(value) {
  const d = toDate(value);
  return d ? `${pad2(d.getHours())}:${pad2(d.getMinutes())}` : '';
}

// 모임 일시: 2026-03-07 19:30
export function formatDateTime(value) {
  const d = toDate(value);
  return d ? `${formatDate(d)} ${formatTime(d)}` : '';
}
