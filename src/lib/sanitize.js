'use client';
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
  'src', 'alt',
  'class',
  'style',
];

const ALLOWED_STYLE_PROPS = ['color', 'background-color'];

DOMPurify.addHook('afterSanitizeAttributes', (node) => {
  if (node.tagName === 'A') {
    node.setAttribute('target', '_blank');
    node.setAttribute('rel', 'noopener noreferrer');
  }
  if (node.tagName === 'IMG') {
    node.setAttribute('loading', 'lazy');
  }
  if (node.hasAttribute('style')) {
    const filtered = (node.getAttribute('style') || '')
      .split(';')
      .map(s => s.trim())
      .filter(Boolean)
      .filter(s => {
        const prop = s.split(':')[0].trim().toLowerCase();
        return ALLOWED_STYLE_PROPS.includes(prop);
      })
      .join('; ');
    if (filtered) node.setAttribute('style', filtered);
    else node.removeAttribute('style');
  }
});

export function sanitizeHtml(html) {
  if (!html) return '';
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ALLOW_DATA_ATTR: false,
    KEEP_CONTENT: true,
  });
}

export function dangerousHtml(html) {
  return { __html: sanitizeHtml(html) };
}
