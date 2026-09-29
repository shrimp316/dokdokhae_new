'use client';

import 'client-only';
import DOMPurify from 'dompurify';
import {
  ALLOWED_TAGS,
  DOMPURIFY_ALLOWED_ATTRIBUTES,
  isAllowedClassName,
  isAllowedStyleDeclaration,
  isEditorOnlyClassName,
} from './sanitizePolicy.js';

const SANITIZE_OPTIONS = {
  ALLOWED_TAGS,
  ALLOWED_ATTR: DOMPURIFY_ALLOWED_ATTRIBUTES,
  ALLOW_DATA_ATTR: false,
  KEEP_CONTENT: true,
};

// DOMPurify 훅은 전역에 한 번만 등록되므로, 호출마다의 제거 보고서는 모듈 변수로 전달한다.
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
      if (node.hasAttribute('class')) {
        const names = (node.getAttribute('class') || '').split(/\s+/).filter(Boolean);
        const allowedNames = names.filter(isAllowedClassName);

        if (activeSanitizeReport
          && names.some((name) => !isAllowedClassName(name) && !isEditorOnlyClassName(name))) {
          activeSanitizeReport.classWasFiltered = true;
        }
        if (allowedNames.length) node.setAttribute('class', allowedNames.join(' '));
        else node.removeAttribute('class');
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
  // DOMPurify를 쓸 수 없는 환경(SSR)에서는 검증 없이 통과시키지 않고 전부 버린다.
  if (!purifier) {
    if (report) report.removedCount = 1;
    return '';
  }

  const previousReport = activeSanitizeReport;
  activeSanitizeReport = report;
  try {
    const sanitized = purifier.sanitize(html, SANITIZE_OPTIONS);
    if (report) {
      // DOMPurify가 스스로 감싼 BODY를 벗겨낸 것은 사용자 내용을 지운 게 아니므로 세지 않는다.
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

  const report = { removedCount: 0, styleWasFiltered: false, classWasFiltered: false };
  const sanitized = sanitize(html, report);
  return {
    html: sanitized,
    removedUnsafeContent: report.removedCount > 0 || report.styleWasFiltered || report.classWasFiltered,
  };
}

// 서버가 저장 전에 HTML을 걸러냈거나(contentWasSanitized), 임시저장 전에 여기서 걸러냈을 때
// 사용자가 붙여넣은 서식이 왜 사라졌는지 알 수 있게 같은 문구로 알린다.
export function alertIfSanitized(wasSanitized, { draft = false } = {}) {
  if (!wasSanitized) return;
  alert(draft
    ? '안전하지 않거나 지원되지 않는 HTML을 제거한 뒤 임시저장합니다.'
    : '안전하지 않거나 지원되지 않는 HTML을 제거한 뒤 저장했습니다.');
}

export function dangerousHtml(html) {
  return { __html: sanitizeHtml(html) };
}
