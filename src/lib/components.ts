interface ReactFiber {
  tag: number;
  type: unknown;
  elementType?: unknown;
  return: ReactFiber | null;
}

const FIBER_TAGS = {
  FunctionComponent: 0,
  ClassComponent: 1,
  IndeterminateComponent: 2,
  HostRoot: 3,
  HostPortal: 4,
  HostComponent: 5,
  HostText: 6,
  Fragment: 7,
  Mode: 8,
  ContextConsumer: 9,
  ContextProvider: 10,
  ForwardRef: 11,
  Profiler: 12,
  SuspenseComponent: 13,
  MemoComponent: 14,
  SimpleMemoComponent: 15,
  LazyComponent: 16,
  SuspenseListComponent: 19,
  HostHoistable: 26,
  HostSingleton: 27
} as const;

const REACT_SKIP_EXACT = new Set([
  'Component',
  'PureComponent',
  'Fragment',
  'Suspense',
  'Profiler',
  'StrictMode',
  'Routes',
  'Route',
  'Outlet',
  'Root',
  'HotReload'
]);

const REACT_SKIP_PATTERNS: RegExp[] = [
  /Boundary$/,
  /BoundaryHandler$/,
  /Provider$/,
  /Consumer$/,
  /Router$/,
  /^Client(Page|Segment|Root)/,
  /^Server(Root|Component|Render)/,
  /^RSC/,
  /^With[A-Z]/,
  /Wrapper$/,
  /Overlay$/,
  /Handler$/
];

const UTILITY_CLASS_WORDS = new Set([
  'flex',
  'grid',
  'relative',
  'absolute',
  'fixed',
  'sticky',
  'block',
  'inline',
  'hidden',
  'container',
  'wrapper',
  'items',
  'justify',
  'center'
]);

function getDisplayName(type: unknown): string | null {
  if (!type) {
    return null;
  }

  if (typeof type === 'function') {
    const fn = type as { displayName?: string; name?: string };
    return fn.displayName ?? fn.name ?? null;
  }

  if (typeof type !== 'object') {
    return null;
  }

  const record = type as Record<string, unknown>;
  if (typeof record.displayName === 'string') {
    return record.displayName;
  }
  if (typeof record.name === 'string') {
    return record.name;
  }

  if (record.render && typeof record.render === 'object') {
    const render = record.render as Record<string, unknown>;
    if (typeof render.displayName === 'string') {
      return render.displayName;
    }
    if (typeof render.name === 'string') {
      return render.name;
    }
  }

  if (record.type) {
    return getDisplayName(record.type);
  }

  return null;
}

function isMinifiedName(name: string): boolean {
  if (name.length <= 2) {
    return true;
  }
  if (name.length <= 3 && name === name.toLowerCase()) {
    return true;
  }
  return false;
}

function shouldIncludeReactName(name: string): boolean {
  if (REACT_SKIP_EXACT.has(name)) {
    return false;
  }
  return !REACT_SKIP_PATTERNS.some((pattern) => pattern.test(name));
}

function getReactFiberKey(element: Element): string | null {
  const keys = Object.keys(element as unknown as Record<string, unknown>);
  return (
    keys.find((key) => key.startsWith('__reactFiber$') || key.startsWith('__reactInternalInstance$')) ?? null
  );
}

function getFiberFromElement(element: Element): ReactFiber | null {
  const key = getReactFiberKey(element);
  if (!key) {
    return null;
  }

  const fiber = (element as unknown as Record<string, unknown>)[key];
  return (fiber as ReactFiber | null) ?? null;
}

function getComponentNameFromFiber(fiber: ReactFiber): string | null {
  const tag = fiber.tag;
  const type = fiber.type as Record<string, unknown> | null;
  const elementType = fiber.elementType as Record<string, unknown> | null;

  if (
    tag === FIBER_TAGS.HostComponent ||
    tag === FIBER_TAGS.HostText ||
    tag === FIBER_TAGS.HostHoistable ||
    tag === FIBER_TAGS.HostSingleton ||
    tag === FIBER_TAGS.HostRoot ||
    tag === FIBER_TAGS.HostPortal ||
    tag === FIBER_TAGS.Fragment ||
    tag === FIBER_TAGS.Mode ||
    tag === FIBER_TAGS.Profiler ||
    tag === FIBER_TAGS.SuspenseComponent ||
    tag === FIBER_TAGS.SuspenseListComponent
  ) {
    return null;
  }

  if (tag === FIBER_TAGS.ForwardRef) {
    if (elementType?.render) {
      const inner = getDisplayName(elementType.render);
      if (inner) {
        return inner;
      }
    }
    return getDisplayName(type);
  }

  if (tag === FIBER_TAGS.MemoComponent || tag === FIBER_TAGS.SimpleMemoComponent) {
    if (elementType?.type) {
      const inner = getDisplayName(elementType.type);
      if (inner) {
        return inner;
      }
    }
    return getDisplayName(type);
  }

  if (tag === FIBER_TAGS.ContextProvider || tag === FIBER_TAGS.ContextConsumer) {
    return null;
  }

  if (tag === FIBER_TAGS.LazyComponent) {
    if (elementType?._status === 1 && elementType._result) {
      return getDisplayName(elementType._result);
    }
    return null;
  }

  if (
    tag === FIBER_TAGS.FunctionComponent ||
    tag === FIBER_TAGS.ClassComponent ||
    tag === FIBER_TAGS.IndeterminateComponent
  ) {
    return getDisplayName(type);
  }

  return getDisplayName(type);
}

function humanizeReactName(name: string): string {
  return name
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/([A-Z])([A-Z][a-z])/g, '$1 $2')
    .trim();
}

function normalizeClassToken(token: string): string {
  return token.replace(/[_][a-zA-Z0-9]{5,}.*$/, '');
}

function deriveNameFromClassList(element: HTMLElement): string | null {
  if (!element.className || typeof element.className !== 'string') {
    return null;
  }

  const tokens = element.className
    .split(/\s+/)
    .map((token) => normalizeClassToken(token))
    .filter(Boolean);

  for (const token of tokens) {
    const words = token
      .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
      .toLowerCase()
      .split(/[-_\s]+/)
      .filter((word) => word.length > 2 && !/^\d+$/.test(word) && !UTILITY_CLASS_WORDS.has(word));

    if (words.length > 0) {
      return words.slice(0, 2).join(' ');
    }
  }

  return null;
}

export function detectReactComponents(element: Element, limit = 6, maxDepth = 30): string[] {
  const names: string[] = [];
  const seen = new Set<string>();
  let fiber = getFiberFromElement(element);
  let depth = 0;

  while (fiber && depth < maxDepth && names.length < limit) {
    const name = getComponentNameFromFiber(fiber);
    if (name && !seen.has(name) && !isMinifiedName(name) && shouldIncludeReactName(name)) {
      names.push(name);
      seen.add(name);
    }
    fiber = fiber.return;
    depth += 1;
  }

  return names;
}

export function detectVueComponents(element: Element, limit = 5): string[] {
  let cursor: Element | null = element;
  const names: string[] = [];
  const seen = new Set<string>();

  while (cursor && names.length < limit) {
    const record = cursor as unknown as Record<string, unknown>;
    const instance =
      (record.__vueParentComponent as Record<string, unknown> | undefined) ??
      (record.__vue_app__ as Record<string, unknown> | undefined);

    if (instance) {
      const type = instance.type as Record<string, unknown> | undefined;
      const name =
        (typeof type?.name === 'string' && type.name) ||
        (typeof type?.__name === 'string' && type.__name) ||
        null;

      if (name && !seen.has(name)) {
        names.push(name);
        seen.add(name);
      }
    }

    cursor = cursor.parentElement;
  }

  return names;
}

export function detectComponentNames(element: Element): string[] {
  const react = detectReactComponents(element);
  if (react.length > 0) {
    return react;
  }
  return detectVueComponents(element);
}

export function detectComponentLabel(element: Element): string | null {
  if (!(element instanceof HTMLElement)) {
    return null;
  }

  const explicit = element.dataset.element?.trim();
  if (explicit) {
    return explicit;
  }

  const byClass = deriveNameFromClassList(element);
  if (byClass) {
    return byClass;
  }

  const reactName = detectReactComponents(element, 1)[0];
  if (reactName) {
    return humanizeReactName(reactName);
  }

  const aria = element.getAttribute('aria-label')?.trim();
  if (aria) {
    return aria;
  }

  return null;
}
