import DOMPurify from 'isomorphic-dompurify';

const ALLOWED_TAGS = [
  'p', 'br', 'span', 'div',
  'strong', 'em', 'u', 's',
  'h2', 'h3',
  'ol', 'ul', 'li',
  'blockquote',
  'a',
  'img',
];

const ALLOWED_ATTR = [
  'href', 'target', 'rel',
  'src', 'alt', 'loading',
  'class',
  'style',
  'data-list',
];

const ALLOWED_STYLE_PROPS = ['color', 'background-color', 'font-size'];

const SANITIZE_OPTIONS = {
  ALLOWED_TAGS,
  ALLOWED_ATTR,
  ALLOW_DATA_ATTR: false,
  KEEP_CONTENT: true,
};

let activeSanitizeReport = null;

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
      .map(s => s.trim())
      .filter(Boolean);
    const allowedDeclarations = declarations.filter(s => {
      const prop = s.split(':')[0].trim().toLowerCase();
      return ALLOWED_STYLE_PROPS.includes(prop);
    });
    const filtered = allowedDeclarations.join('; ');
    if (activeSanitizeReport && allowedDeclarations.length !== declarations.length) {
      activeSanitizeReport.styleWasFiltered = true;
    }
    if (filtered) node.setAttribute('style', filtered);
    else node.removeAttribute('style');
  }
});

function sanitize(html, report = null) {
  const previousReport = activeSanitizeReport;
  activeSanitizeReport = report;
  try {
    const sanitized = DOMPurify.sanitize(html, SANITIZE_OPTIONS);
    if (report) report.removedCount = DOMPurify.removed?.length || 0;
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
