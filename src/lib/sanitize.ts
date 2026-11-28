import DOMPurify from 'isomorphic-dompurify';

const ALLOWED_SIZE_GUIDE_TAGS = [
  'table',
  'thead',
  'tbody',
  'tr',
  'th',
  'td',
  'p',
  'h1',
  'h2',
  'h3',
  'h4',
  'ul',
  'ol',
  'li',
  'strong',
  'em',
];

const ALLOWED_SIZE_GUIDE_ATTRS = ['colspan', 'rowspan', 'scope'];

const FORBIDDEN_SIZE_GUIDE_TAGS = [
  'script',
  'style',
  'iframe',
  'object',
  'embed',
  'svg',
  'math',
  'form',
  'input',
  'textarea',
  'button',
  'select',
  'option',
  'link',
  'meta',
  'base',
  'img',
  'a',
  'video',
  'audio',
  'source',
  'picture',
];

const MAX_SIZE_GUIDE_LENGTH = 50000;

/**
 * Strictly sanitizes admin-authored size guide HTML both before storage and before rendering.
 * Strips all scripts, event handlers, iframes, objects, styles, links, images, data attributes,
 * and dangerous URI schemes (`javascript:`, `vbscript:`, `data:`).
 */
export function sanitizeSizeGuideHtml(input: unknown): string {
  if (typeof input !== 'string') return '';
  const bounded = input.slice(0, MAX_SIZE_GUIDE_LENGTH);
  if (!bounded.trim()) return '';

  const sanitized = DOMPurify.sanitize(bounded, {
    ALLOWED_TAGS: ALLOWED_SIZE_GUIDE_TAGS,
    ALLOWED_ATTR: ALLOWED_SIZE_GUIDE_ATTRS,
    FORBID_TAGS: FORBIDDEN_SIZE_GUIDE_TAGS,
    ALLOW_DATA_ATTR: false,
    ALLOW_ARIA_ATTR: false,
    ALLOW_UNKNOWN_PROTOCOLS: false,
  });

  // Defense-in-depth scrub against any leftover URI scheme strings in text/attributes
  return String(sanitized).replace(/(?:javascript|vbscript|data)\s*:/gi, '');
}

/**
 * Escapes dynamic text interpolated into HTML emails/templates (V-19).
 */
export function escapeHtml(value: unknown): string {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
