export const ALLOWED_TAGS = [
  'p', 'br', 'span', 'div',
  'strong', 'em', 'u', 's',
  'h2', 'h3',
  'ol', 'ul', 'li',
  'blockquote',
  'a',
  'img',
];

export const ALLOWED_ATTRIBUTES = {
  '*': ['class', 'style'],
  a: ['href', 'target', 'rel'],
  img: ['src', 'alt', 'loading'],
  li: ['data-list'],
};

export const DOMPURIFY_ALLOWED_ATTRIBUTES = [
  ...ALLOWED_ATTRIBUTES['*'],
  ...ALLOWED_ATTRIBUTES.a,
  ...ALLOWED_ATTRIBUTES.img,
  ...ALLOWED_ATTRIBUTES.li,
];

const COLOR_VALUE = /^(?:#[0-9a-f]{3,8}|[a-z]+|rgba?\([0-9.,%\s]+\)|hsla?\([0-9.,%\s]+\))$/i;
const FONT_SIZE_VALUE = /^(?:\d+(?:\.\d+)?(?:px|em|rem|%)|xx-small|x-small|small|medium|large|x-large|xx-large|smaller|larger)$/i;

export const ALLOWED_STYLE_RULES = {
  color: [COLOR_VALUE],
  'background-color': [COLOR_VALUE],
  'font-size': [FONT_SIZE_VALUE],
};

export function isAllowedStyleDeclaration(declaration) {
  const separator = declaration.indexOf(':');
  if (separator < 1) return false;

  const property = declaration.slice(0, separator).trim().toLowerCase();
  const value = declaration.slice(separator + 1).trim();
  const rules = ALLOWED_STYLE_RULES[property];
  return Boolean(value && rules?.some((rule) => rule.test(value)));
}
