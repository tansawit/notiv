import { beforeEach, describe, expect, it } from 'vitest';
import { buildElementSelector } from './selector';

describe('buildElementSelector', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    if (typeof CSS === 'undefined') {
      (globalThis as { CSS?: { escape: (value: string) => string } }).CSS = {
        escape: (value: string) => value.replace(/[^a-zA-Z0-9_-]/g, '\\$&')
      };
    }
  });

  it('prefers stable test attributes when unique', () => {
    document.body.innerHTML = `
      <main>
        <button data-testid="save-feedback">Save</button>
      </main>
    `;
    const target = document.querySelector('button') as Element;
    const selector = buildElementSelector(target);
    expect(selector).toBe('[data-testid="save-feedback"]');
    expect(document.querySelector(selector)).toBe(target);
  });

  it('falls back to unique id selectors', () => {
    document.body.innerHTML = `
      <section>
        <div id="feedback-toolbar">Toolbar</div>
      </section>
    `;
    const target = document.getElementById('feedback-toolbar') as Element;
    const selector = buildElementSelector(target);
    expect(selector).toBe('#feedback-toolbar');
    expect(document.querySelector(selector)).toBe(target);
  });

  it('builds a resolvable hierarchical selector when no unique attrs exist', () => {
    document.body.innerHTML = `
      <ul>
        <li><span>First</span></li>
        <li><span>Second</span></li>
        <li><span>Third</span></li>
      </ul>
    `;
    const target = document.querySelectorAll('span')[1] as Element;
    const selector = buildElementSelector(target);
    expect(selector.length).toBeGreaterThan(0);
    expect(document.querySelector(selector)).toBe(target);
  });
});
