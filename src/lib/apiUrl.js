export function apiUrl(path) {
  const base = process.env.NEXT_PUBLIC_FUNCTIONS_BASE_URL?.replace(/\/$/, '');
  if (base) return `${base}${path}`;
  const fallback = {
    '/fcmToken': '/api/fcm-token',
    '/fcmDebug': '/api/fcm-debug',
    '/aiQuestions': '/api/ai-questions',
    '/aiPassage': '/api/ai-passage',
    '/sendNotification': '/api/send-notification',
    '/notify': '/api/notify',
  };
  return fallback[path] || path;
}
