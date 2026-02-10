import { describe, expect, it } from 'vitest';
import {
  buildGroupedIssueDescription,
  buildIssueCreateInput,
  buildIssueDescription
} from './linear-issue-content';
import type { Annotation } from '../shared/types';

function makeAnnotation(overrides: Partial<Annotation> = {}): Annotation {
  return {
    id: 'note-1',
    comment: 'Button text should be more explicit',
    highlightColor: 'blue',
    elementPath: 'button[data-testid="submit"]',
    timestamp: Date.UTC(2026, 1, 10, 10, 0, 0),
    x: 100,
    y: 150,
    element: 'button',
    elementLabel: 'Submit button',
    url: 'https://example.com/path',
    viewport: {
      width: 1440,
      height: 900,
      devicePixelRatio: 2
    },
    environment: {
      os: 'macOS',
      browser: 'Chrome',
      resolution: '2560x1600',
      userAgent: 'Mozilla/5.0 Test UA'
    },
    screenshot: 'data:image/png;base64,abc123',
    ...overrides
  };
}

describe('buildIssueCreateInput', () => {
  it('requires team id and trims override fields', () => {
    const input = buildIssueCreateInput('Title', 'Description', {
      teamId: '  team_123  ',
      projectId: ' project_1 ',
      labelIds: [' label_a ', ''],
      assigneeId: ' user_1 ',
      triage: true,
      triageStateId: ' triage_state ',
      priority: 2
    });

    expect(input).toEqual({
      title: 'Title',
      description: 'Description',
      teamId: 'team_123',
      projectId: 'project_1',
      labelIds: ['label_a'],
      assigneeId: 'user_1',
      stateId: 'triage_state',
      priority: 2
    });
  });

  it('truncates long title source to 80 chars', () => {
    const longTitle = 'a'.repeat(120);
    const input = buildIssueCreateInput(longTitle, 'Body', { teamId: 'team_1' });

    expect(input.title.length).toBe(80);
    expect(input.title.endsWith('...')).toBe(true);
  });

  it('throws when team id is missing', () => {
    expect(() => buildIssueCreateInput('Title', 'Body', {})).toThrow(
      'No Linear team selected for this submission.'
    );
  });
});

describe('buildIssueDescription', () => {
  it('omits oversized inline screenshot payloads', () => {
    const oversized = `data:image/png;base64,${'a'.repeat(320_100)}`;
    const body = buildIssueDescription(makeAnnotation({ screenshot: oversized }));

    expect(body).toContain('*Screenshot omitted due inline payload limits.*');
  });

  it('includes at most 2 inline attachments and reports omissions', () => {
    const body = buildIssueDescription(
      makeAnnotation({
        attachments: [
          { name: 'one.png', dataUrl: 'data:image/png;base64,1' },
          { name: 'two.png', dataUrl: 'data:image/png;base64,2' },
          { name: 'three.png', dataUrl: 'data:image/png;base64,3' }
        ]
      })
    );

    expect(body).toContain('Attachment 1: one.png');
    expect(body).toContain('Attachment 2: two.png');
    expect(body).not.toContain('Attachment 3: three.png');
    expect(body).toContain('*1 attachment omitted due inline payload limits.*');
    expect(body).toContain('| User Agent | Mozilla/5.0 Test UA |');
  });
});

describe('buildGroupedIssueDescription', () => {
  it('builds grouped marker list with context metadata', () => {
    const annotations = [
      makeAnnotation({ id: 'n1', comment: 'Spacing is off', elementLabel: 'Header title' }),
      makeAnnotation({ id: 'n2', comment: 'Color contrast too low', elementLabel: 'Subtitle' })
    ];

    const body = buildGroupedIssueDescription(
      annotations.map((annotation) => {
        const cloned = { ...annotation };
        delete (cloned as Partial<Annotation>).screenshot;
        return cloned;
      }),
      'data:image/png;base64,abc123',
      'Release candidate review notes'
    );

    expect(body).toContain('## Marker Comments');
    expect(body).toContain('1. Spacing is off');
    expect(body).toContain('2. Color contrast too low');
    expect(body).toContain('| Marker Count | 2 |');
    expect(body).toContain('| User Agent | Mozilla/5.0 Test UA |');
    expect(body).toContain('Release candidate review notes');
  });
});
