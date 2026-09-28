import 'server-only';

import sanitizeHtmlLibrary from 'sanitize-html';
import {
  ALLOWED_ATTRIBUTES,
  ALLOWED_CLASS_PATTERNS,
  ALLOWED_STYLE_RULES,
  ALLOWED_TAGS,
  isEditorOnlyClassName,
} from './sanitizePolicy.js';

// removedUnsafeContent 비교용 정규화에서 에디터 전용 class(is-selected)를 미리 빼 둔다.
// 그래야 이미지를 선택한 채 저장해도 "안전하지 않은 내용 제거" 안내가 뜨지 않는다.
function dropEditorOnlyClasses(tagName, attributes) {
  if (!attributes.class) return { tagName, attribs: attributes };
  const kept = attributes.class.split(/\s+/).filter((name) => name && !isEditorOnlyClassName(name));
  // 결과 문자열과 비교하므로 속성 순서를 그대로 유지한다.
  const attribs = {};
  for (const [key, value] of Object.entries(attributes)) {
    if (key !== 'class') attribs[key] = value;
    else if (kept.length) attribs[key] = kept.join(' ');
  }
  return { tagName, attribs };
}

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
  allowedClasses: {
    '*': ALLOWED_CLASS_PATTERNS,
  },
  allowedStyles: {
    '*': ALLOWED_STYLE_RULES,
  },
  allowedSchemes: ['http', 'https', 'mailto', 'tel'],
  allowProtocolRelative: false,
  enforceHtmlBoundary: true,
  transformTags: ATTRIBUTE_TRANSFORMS,
};

// removedUnsafeContent는 "sanitize 결과 ≠ 입력"으로 판단한다. 원문과 바로 비교하면
// 직렬화 차이(따옴표, 태그 닫기)나 위의 속성 변환까지 제거로 잡히므로, 전부 허용하되
// 같은 변환을 거친 입력과 비교해 실제로 걸러낸 내용이 있을 때만 참이 되게 한다.
const NORMALIZE_OPTIONS = {
  allowedTags: false,
  allowedAttributes: false,
  allowedSchemesAppliedToAttributes: [],
  allowVulnerableTags: true,
  enforceHtmlBoundary: true,
  transformTags: { ...ATTRIBUTE_TRANSFORMS, '*': dropEditorOnlyClasses },
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
