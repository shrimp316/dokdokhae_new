'use client';

import 'client-only';
import DOMPurify from 'dompurify';
import {
  ALLOWED_TAGS,
  DOMPURIFY_ALLOWED_ATTRIBUTES,
  isAllowedStyleDeclaration,
} from './sanitizePolicy.js';

const SANITIZE_OPTIONS = {
  ALLOWED_TAGS,
  ALLOWED_ATTR: DOMPURIFY_ALLOWED_ATTRIBUTES,
  ALLOW_DATA_ATTR: false,
  KEEP_CONTENT: true,
};

let activeSanitizeReport = null;
let hooksRegistered = false;

function getPurifier() {
  if (typeof window === 'undefined' || typeof DOMPurify.sanitize !== 'function') {
    return null;
  }

  if (!hooksRegistered) {
    DOMPurify.addHook('afterSanitizeAttributes', (node) => {
      if (node.tagName === 'A') {
        node.setAttribute('target', '_blank');
        node.setAttribute('rel', 'noopener noreferrer');
      }
      if (node.tagName === 'IMG') {
        node.setAttribute('loading', 'lazy');
      }
      if (node.hasAttribute('style')) {
        const original = node.getAttribute('style') || '';
        const declarations = original
          .split(';')
          .map((value) => value.trim())
          .filter(Boolean);
        const allowedDeclarations = declarations.filter(isAllowedStyleDeclaration);
        const filtered = allowedDeclarations.join('; ');

        if (activeSanitizeReport && allowedDeclarations.length !== declarations.length) {
          activeSanitizeReport.styleWasFiltered = true;
        }
        if (filtered) node.setAttribute('style', filtered);
        else node.removeAttribute('style');
      }
    });
    hooksRegistered = true;
  }

  return DOMPurify;
}

function sanitize(html, report = null) {
  const purifier = getPurifier();
  if (!purifier) {
    if (report) report.removedCount = 1;
    return '';
  }

  const previousReport = activeSanitizeReport;
  activeSanitizeReport = report;
  try {
    const sanitized = purifier.sanitize(html, SANITIZE_OPTIONS);
    if (report) {
      report.removedCount = (purifier.removed || []).filter((item) => (
        item.attribute || item.element?.tagName !== 'BODY'
      )).length;
    }
    return sanitized;
  } finally {
    activeSanitizeReport = previousReport;
  }
}

export function sanitizeHtml(html) {
  if (!html) return '';
  return sanitize(html);
}

export function sanitizeHtmlForStorage(html) {
  if (!html) return { html: '', removedUnsafeContent: false };

  const report = { removedCount: 0, styleWasFiltered: false };
  const sanitized = sanitize(html, report);
  return {
    html: sanitized,
    removedUnsafeContent: report.removedCount > 0 || report.styleWasFiltered,
  };
}

export function dangerousHtml(html) {
  return { __html: sanitizeHtml(html) };
}
