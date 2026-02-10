import type { ElementSelection } from '../shared/types';

const CONTAINER_TAGS = new Set(['div', 'section', 'article', 'nav', 'header', 'footer', 'aside', 'main']);
const HEADING_TAGS = new Set(['h1', 'h2', 'h3', 'h4', 'h5', 'h6']);
const GRAPHIC_TAGS = new Set(['path', 'circle', 'rect', 'line', 'g', 'ellipse', 'polygon', 'polyline']);

function normalizeWhitespace(value: string | undefined): string {
  if (!value) {
    return '';
  }
  return value.replace(/\s+/g, ' ').trim();
}

function truncate(value: string, limit: number): string {
  if (value.length <= limit) {
    return value;
  }
  return `${value.slice(0, Math.max(1, limit - 1))}...`;
}

function normalizeClassToken(token: string): string {
  return token
    .replace(/[_][a-zA-Z0-9]{5,}.*$/, '')
    .replace(/[^a-zA-Z0-9_-]/g, '')
    .trim();
}

function isMeaningfulClassToken(token: string): boolean {
  if (!token) {
    return false;
  }
  if (token.startsWith('css-') || token.startsWith('sc-') || token.startsWith('jsx-')) {
    return false;
  }
  if (/^_[a-z0-9]{5,}$/i.test(token)) {
    return false;
  }
  if (/^[a-z0-9]+$/.test(token) && token.length > 16) {
    return false;
  }
  return /^[a-zA-Z][a-zA-Z0-9_-]+$/.test(token);
}

function extractClassNameLabel(selection: ElementSelection): string | null {
  const words = selection.classes
    .map(normalizeClassToken)
    .filter((token) => token.length > 2 && !/^[a-z]{1,2}$/.test(token) && isMeaningfulClassToken(token))
    .slice(0, 2);

  if (words.length === 0) {
    return null;
  }
  return words.join(' ');
}

function formatHref(href: string): string {
  const raw = href.trim();
  if (!raw) {
    return 'link';
  }

  if (raw.startsWith('/')) {
    return truncate(raw, 40);
  }

  try {
    const parsed = new URL(raw, window.location.href);
    const normalized = `${parsed.pathname}${parsed.search}`;
    return truncate(normalized || parsed.hostname, 40);
  } catch {
    return truncate(raw, 40);
  }
}

function fallbackFromSelector(selection: ElementSelection): string | null {
  const match = selection.elementPath.match(/\[(data-[^=\]]+)="([^"]+)"\]/);
  if (!match) {
    return null;
  }
  return `${match[1]}:${truncate(match[2], 28)}`;
}

export function resolveSelectionLabel(selection: ElementSelection): string {
  const explicitElementLabel = normalizeWhitespace(selection.elementLabel);
  if (explicitElementLabel) {
    return explicitElementLabel;
  }

  const tag = selection.tag.toLowerCase();
  const text = normalizeWhitespace(selection.contentPreview);
  const ariaLabel = normalizeWhitespace(selection.accessibility.label);
  const role = normalizeWhitespace(selection.accessibility.role);

  if (tag === 'button') {
    if (ariaLabel) {
      return `button [${truncate(ariaLabel, 36)}]`;
    }
    if (text) {
      return `button "${truncate(text, 30)}"`;
    }
    return 'button';
  }

  if (tag === 'a') {
    if (text) {
      return `link "${truncate(text, 32)}"`;
    }
    if (selection.href) {
      return `link to ${formatHref(selection.href)}`;
    }
    return 'link';
  }

  if (HEADING_TAGS.has(tag)) {
    if (text) {
      return `${tag} "${truncate(text, 42)}"`;
    }
    return tag;
  }

  if (tag === 'p') {
    if (text) {
      return `paragraph: "${truncate(text, 52)}"`;
    }
    return 'paragraph';
  }

  if (tag === 'li') {
    if (text) {
      return `list item: "${truncate(text, 40)}"`;
    }
    return 'list item';
  }

  if (tag === 'span' || tag === 'label') {
    if (text && text.length < 64) {
      return `"${truncate(text, 44)}"`;
    }
    return tag;
  }

  if (tag === 'input') {
    if (text) {
      return `input "${truncate(text, 36)}"`;
    }
    if (ariaLabel) {
      return `input "${truncate(ariaLabel, 36)}"`;
    }
    return 'input';
  }

  if (tag === 'textarea') {
    if (text) {
      return `textarea "${truncate(text, 36)}"`;
    }
    if (ariaLabel) {
      return `textarea "${truncate(ariaLabel, 36)}"`;
    }
    return 'textarea';
  }

  if (tag === 'img') {
    if (text) {
      return `image "${truncate(text, 36)}"`;
    }
    return 'image';
  }

  if (tag === 'svg') {
    return 'icon';
  }

  if (GRAPHIC_TAGS.has(tag)) {
    return 'graphic element';
  }

  if (tag === 'code') {
    if (text) {
      return `code: \`${truncate(text, 30)}\``;
    }
    return 'code';
  }

  if (tag === 'pre') {
    return 'code block';
  }

  if (tag === 'blockquote') {
    return 'blockquote';
  }

  if (CONTAINER_TAGS.has(tag)) {
    if (ariaLabel) {
      return `${tag} [${truncate(ariaLabel, 36)}]`;
    }
    if (role) {
      return role;
    }
    const classLabel = extractClassNameLabel(selection);
    if (classLabel) {
      return classLabel;
    }
    if (text && text.length < 56) {
      return `"${truncate(text, 44)}"`;
    }
    return tag === 'div' ? 'container' : tag;
  }

  const explicitComponent = normalizeWhitespace(selection.componentName);
  if (explicitComponent && explicitComponent.toLowerCase() !== tag) {
    return explicitComponent;
  }

  const reactComponent = selection.reactComponents.find((name) => Boolean(name?.trim()))?.trim();
  if (reactComponent) {
    return reactComponent;
  }

  const selectorLabel = fallbackFromSelector(selection);
  if (selectorLabel) {
    return selectorLabel;
  }

  if (text && text.length < 56) {
    return `${tag} "${truncate(text, 42)}"`;
  }

  return tag;
}
