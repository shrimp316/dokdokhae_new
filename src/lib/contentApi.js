import { NextResponse } from 'next/server';
import { sanitizeHtmlForStorage } from '@/lib/sanitize';

export const CONTENT_LIMITS = {
  title: 200,
  prefix: 50,
  richHtml: 100_000,
  commentHtml: 5_000,
  memberNickname: 12,
  nickname: 20,
  documentId: 256,
};

export class ContentApiError extends Error {
  constructor(status, message) {
    super(message);
    this.name = 'ContentApiError';
    this.status = status;
  }
}

export async function readJsonBody(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    throw new ContentApiError(400, 'A valid JSON body is required');
  }

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new ContentApiError(400, 'The request body must be a JSON object');
  }
  return body;
}

export function requiredString(value, field, maxLength, { trim = true } = {}) {
  if (typeof value !== 'string') {
    throw new ContentApiError(400, `${field} must be a string`);
  }

  const normalized = trim ? value.trim() : value;
  if (!normalized) throw new ContentApiError(400, `${field} is required`);
  if (normalized.length > maxLength) {
    throw new ContentApiError(400, `${field} must be ${maxLength} characters or fewer`);
  }
  return normalized;
}

export function optionalString(value, field, maxLength) {
  if (value == null || value === '') return '';
  if (typeof value !== 'string') {
    throw new ContentApiError(400, `${field} must be a string`);
  }

  const normalized = value.trim();
  if (normalized.length > maxLength) {
    throw new ContentApiError(400, `${field} must be ${maxLength} characters or fewer`);
  }
  return normalized;
}

export function booleanValue(value, field, fallback = false) {
  if (value == null) return fallback;
  if (typeof value !== 'boolean') {
    throw new ContentApiError(400, `${field} must be a boolean`);
  }
  return value;
}

export function ratingValue(value) {
  if (!Number.isInteger(value) || value < 0 || value > 5) {
    throw new ContentApiError(400, 'rating must be an integer between 0 and 5');
  }
  return value;
}

export function documentId(value, field = 'id') {
  const id = requiredString(value, field, CONTENT_LIMITS.documentId);
  if (id.includes('/')) throw new ContentApiError(400, `${field} is invalid`);
  return id;
}

function isEmptyRichHtml(html) {
  if (/<img\b/i.test(html)) return false;
  return html
    .replace(/<!--([\s\S]*?)-->/g, '')
    .replace(/<br\s*\/?\s*>/gi, '')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;|&#160;/gi, ' ')
    .trim() === '';
}

export function sanitizedRichHtml(value, maxLength = CONTENT_LIMITS.richHtml) {
  const raw = requiredString(value, 'content', maxLength, { trim: false });
  const sanitized = sanitizeHtmlForStorage(raw);

  if (!sanitized.html || isEmptyRichHtml(sanitized.html)) {
    throw new ContentApiError(400, 'content has no safe content to store');
  }
  if (sanitized.html.length > maxLength) {
    throw new ContentApiError(400, `sanitized content must be ${maxLength} characters or fewer`);
  }
  return sanitized;
}

export async function getUserProfile(db, uid) {
  const snap = await db.collection('users').doc(uid).get();
  return snap.exists ? snap.data() : null;
}

export function requireProfile(profile) {
  if (!profile) {
    throw new ContentApiError(403, 'A valid user profile is required');
  }
  try {
    return {
      ...profile,
      nickname: requiredString(
        profile.nickname,
        'profile nickname',
        CONTENT_LIMITS.memberNickname,
      ),
    };
  } catch {
    throw new ContentApiError(403, 'A valid user profile is required');
  }
}

export function assertOwnerOrAdmin(resource, uid, profile) {
  if (resource?.uid !== uid && profile?.role !== 'admin') {
    throw new ContentApiError(403, 'Owner or admin permission required');
  }
}

export function contentApiErrorResponse(error, operation) {
  if (error instanceof ContentApiError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }

  console.error(`${operation} failed`, error);
  return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
}
