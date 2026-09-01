import 'server-only';

import sanitizeHtmlLibrary from 'sanitize-html';
import {
  ALLOWED_ATTRIBUTES,
  ALLOWED_STYLE_RULES,
  ALLOWED_TAGS,
} from './sanitizePolicy.js';

const ATTRIBUTE_TRANSFORMS = {
  a(tagName, attributes) {
    return {
      tagName,
      attribs: {
        ...attributes,
        target: '_blank',
        rel: 'noopener noreferrer',
      },
    };
  },
  img(tagName, attributes) {
    return {
      tagName,
      attribs: {
        ...attributes,
        loading: 'lazy',
      },
    };
  },
};

const SANITIZE_OPTIONS = {
  allowedTags: ALLOWED_TAGS,
  allowedAttributes: ALLOWED_ATTRIBUTES,
  allowedStyles: {
    '*': ALLOWED_STYLE_RULES,
  },
  allowedSchemes: ['http', 'https', 'mailto', 'tel'],
  allowProtocolRelative: false,
  enforceHtmlBoundary: true,
  transformTags: ATTRIBUTE_TRANSFORMS,
};

const NORMALIZE_OPTIONS = {
  allowedTags: false,
  allowedAttributes: false,
  allowedSchemesAppliedToAttributes: [],
  allowVulnerableTags: true,
  enforceHtmlBoundary: true,
  transformTags: ATTRIBUTE_TRANSFORMS,
};

export function sanitizeHtml(html) {
  if (!html) return '';
  return sanitizeHtmlLibrary(html, SANITIZE_OPTIONS);
}

export function sanitizeHtmlForStorage(html) {
  if (!html) return { html: '', removedUnsafeContent: false };

  const sanitized = sanitizeHtml(html);
  const normalizedInput = sanitizeHtmlLibrary(html, NORMALIZE_OPTIONS);
  return {
    html: sanitized,
    removedUnsafeContent: sanitized !== normalizedInput,
  };
}
