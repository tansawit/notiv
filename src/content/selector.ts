function cssEscape(value: string): string {
  if (typeof CSS !== 'undefined' && typeof CSS.escape === 'function') {
    return CSS.escape(value);
  }
  return value.replace(/[^a-zA-Z0-9_-]/g, '\\$&');
}

function isStableClassName(name: string): boolean {
  if (!name) {
    return false;
  }

  if (name.startsWith('css-') || name.startsWith('sc-') || name.startsWith('jsx-')) {
    return false;
  }

  if (/^_[a-z0-9]{5,}$/i.test(name)) {
    return false;
  }

  if (/^[a-z0-9]+$/.test(name) && name.length > 16) {
    return false;
  }

  return /^[a-zA-Z][a-zA-Z0-9_-]+$/.test(name);
}

function uniqueSelectorForDocument(selector: string): boolean {
  try {
    return document.querySelectorAll(selector).length === 1;
  } catch {
    return false;
  }
}

function buildAttributeSelectors(element: Element): string[] {
  const selectors: string[] = [];
  const preferredAttrs = ['data-testid', 'data-test', 'data-cy', 'data-qa', 'name', 'aria-label', 'role'];
  for (const attr of preferredAttrs) {
    const value = element.getAttribute(attr)?.trim();
    if (!value) {
      continue;
    }
    selectors.push(`[${attr}="${cssEscape(value)}"]`);
  }
  return selectors;
}

function findPreferredAttributeSelector(element: Element): string | null {
  const id = element.getAttribute('id')?.trim();
  if (id) {
    const idSelector = `#${cssEscape(id)}`;
    if (uniqueSelectorForDocument(idSelector)) {
      return idSelector;
    }
  }

  for (const selector of buildAttributeSelectors(element)) {
    if (uniqueSelectorForDocument(selector)) {
      return selector;
    }
  }

  const tag = element.tagName.toLowerCase();
  const stableClasses = Array.from(element.classList).filter(isStableClassName);
  if (stableClasses.length > 0) {
    const classSelector = `${tag}.${stableClasses.slice(0, 3).map(cssEscape).join('.')}`;
    if (uniqueSelectorForDocument(classSelector)) {
      return classSelector;
    }
  }

  return null;
}

function nthOfTypeSelector(element: Element): string {
  const tag = element.tagName.toLowerCase();
  const parent = element.parentElement;
  if (!parent) {
    return tag;
  }

  const siblings = Array.from(parent.children).filter(
    (child) => child.tagName.toLowerCase() === tag
  );

  if (siblings.length === 1) {
    return tag;
  }

  const index = siblings.indexOf(element) + 1;
  return `${tag}:nth-of-type(${index})`;
}

function buildSegmentCandidates(element: Element): string[] {
  const tag = element.tagName.toLowerCase();
  const candidates: string[] = [];

  const id = element.getAttribute('id')?.trim();
  if (id) {
    candidates.push(`#${cssEscape(id)}`);
  }

  for (const selector of buildAttributeSelectors(element)) {
    candidates.push(`${tag}${selector}`);
    candidates.push(selector);
  }

  const stableClasses = Array.from(element.classList).filter(isStableClassName);
  if (stableClasses.length > 0) {
    const joined = stableClasses.slice(0, 3).map(cssEscape).join('.');
    candidates.push(`${tag}.${joined}`);
  }

  candidates.push(nthOfTypeSelector(element));
  return Array.from(new Set(candidates));
}

export function buildElementSelector(element: Element): string {
  const preferred = findPreferredAttributeSelector(element);
  if (preferred) {
    return preferred;
  }

  const parts: string[] = [];
  let cursor: Element | null = element;
  let depth = 0;

  while (cursor && cursor !== document.documentElement && depth < 10) {
    const candidate = findPreferredAttributeSelector(cursor);
    if (candidate) {
      parts.unshift(candidate);
      const selectorWithPrefix = parts.join(' > ');
      if (uniqueSelectorForDocument(selectorWithPrefix)) {
        return selectorWithPrefix;
      }
    }

    const segmentCandidates = buildSegmentCandidates(cursor);
    let resolvedSegment = segmentCandidates[segmentCandidates.length - 1];

    for (const segment of segmentCandidates) {
      const testSelector = [segment, ...parts].join(' > ');
      if (uniqueSelectorForDocument(testSelector)) {
        return testSelector;
      }
      if (resolvedSegment === segmentCandidates[segmentCandidates.length - 1]) {
        resolvedSegment = segment;
      }
    }

    parts.unshift(resolvedSegment);
    cursor = cursor.parentElement;
    depth += 1;
  }

  if (parts.length === 0) {
    return nthOfTypeSelector(element);
  }

  const fallback = parts.join(' > ');
  return fallback || nthOfTypeSelector(element);
}
