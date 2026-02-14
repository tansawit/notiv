import type { Annotation, LinearIssueCreateOverrides } from '../shared/types';

const MAX_INLINE_IMAGE_URL_LENGTH = 320_000;
const MAX_INLINE_ATTACHMENTS = 2;

export interface LinearIssueCreateInput {
  title: string;
  description: string;
  teamId: string;
  projectId?: string;
  labelIds?: string[];
  priority?: number;
  assigneeId?: string;
  stateId?: string;
}

function getIssueTitle(comment: string): string {
  const trimmed = comment.trim();
  if (!trimmed) {
    return 'Visual feedback';
  }
  if (trimmed.length <= 80) {
    return trimmed;
  }
  return `${trimmed.slice(0, 77)}...`;
}

function escapeTableValue(value: string): string {
  return value.replace(/\|/g, '\\|').replace(/\n/g, '<br/>');
}

function resolveInlineImageMarkdown(alt: string, source: string | undefined): string | null {
  const value = source?.trim();
  if (!value) {
    return null;
  }

  const isInlineImage = value.startsWith('data:image/');
  const isRemoteImage = value.startsWith('https://') || value.startsWith('http://');
  if (!isInlineImage && !isRemoteImage) {
    return null;
  }
  if (value.length > MAX_INLINE_IMAGE_URL_LENGTH) {
    return null;
  }
  return `![${alt}](${value})`;
}

export function buildIssueDescription(annotation: Annotation, overallDescription?: string): string {
  const componentName =
    annotation.elementLabel?.trim() || annotation.componentName?.trim() || annotation.reactComponents?.[0] || 'Unknown';
  const viewport = annotation.viewport
    ? `${annotation.viewport.width}x${annotation.viewport.height} @${annotation.viewport.devicePixelRatio}x`
    : 'N/A';
  const os = annotation.environment?.os ?? 'Unknown';
  const browser = annotation.environment?.browser ?? 'Unknown';
  const userAgent = annotation.environment?.userAgent ?? 'Unknown';
  const resolution = annotation.environment?.resolution ?? 'Unknown';
  const captured = new Date(annotation.timestamp).toISOString();
  const screenshotMarkdown = resolveInlineImageMarkdown('Element screenshot', annotation.screenshot);
  const attachments = annotation.attachments ?? [];
  const inlineAttachments = attachments
    .slice(0, MAX_INLINE_ATTACHMENTS)
    .map((attachment, index) => ({
      name: attachment.name,
      markdown: resolveInlineImageMarkdown(`Attachment ${index + 1}: ${escapeTableValue(attachment.name)}`, attachment.dataUrl)
    }))
    .filter((attachment): attachment is { name: string; markdown: string } => Boolean(attachment.markdown));
  const omittedAttachmentCount = attachments.length - inlineAttachments.length;

  return [
    ...(overallDescription?.trim() ? ['## Summary', overallDescription.trim(), ''] : []),
    '## Feedback',
    annotation.comment,
    '',
    '## Screenshot',
    screenshotMarkdown ?? '*Screenshot omitted due inline payload limits.*',
    '',
    '## Element',
    '| Property | Value |',
    '| --- | --- |',
    `| Selector | \`${escapeTableValue(annotation.elementPath)}\` |`,
    `| Component | ${escapeTableValue(componentName)} |`,
    `| Tag | ${escapeTableValue(annotation.element)} |`,
    '',
    '## Context',
    '| Property | Value |',
    '| --- | --- |',
    `| URL | ${escapeTableValue(annotation.url ?? 'Unknown')} |`,
    `| Viewport | ${escapeTableValue(viewport)} |`,
    `| Capture Timestamp | ${escapeTableValue(captured)} |`,
    `| OS | ${escapeTableValue(os)} |`,
    `| Browser | ${escapeTableValue(browser)} |`,
    `| User Agent | ${escapeTableValue(userAgent)} |`,
    `| Resolution | ${escapeTableValue(resolution)} |`,
    ...(attachments.length > 0
      ? [
          '',
          '## Attachments',
          ...inlineAttachments.map((attachment) => attachment.markdown),
          ...(omittedAttachmentCount > 0
            ? [`*${omittedAttachmentCount} attachment${omittedAttachmentCount === 1 ? '' : 's'} omitted due inline payload limits.*`]
            : [])
        ]
      : []),
    '',
    '---',
    '*Created via Notis*'
  ].join('\n');
}

export function buildGroupedIssueDescription(
  annotations: Array<Omit<Annotation, 'screenshot' | 'screenshotViewport' | 'linearIssue'>>,
  groupedScreenshot: string,
  overallDescription?: string
): string {
  const first = annotations[0];
  const viewport = first.viewport
    ? `${first.viewport.width}x${first.viewport.height} @${first.viewport.devicePixelRatio}x`
    : 'N/A';
  const os = first.environment?.os ?? 'Unknown';
  const browser = first.environment?.browser ?? 'Unknown';
  const userAgent = first.environment?.userAgent ?? 'Unknown';
  const resolution = first.environment?.resolution ?? 'Unknown';
  const captured = new Date(first.timestamp).toISOString();
  const markerRows = annotations
    .map((annotation, index) => {
      const note = annotation.comment.trim().replace(/\s+/g, ' ') || 'Untitled note';
      const componentName =
        annotation.elementLabel?.trim() ||
        annotation.componentName?.trim() ||
        annotation.reactComponents?.[0] ||
        annotation.element;
      const component = componentName.replace(/\s+/g, ' ').trim() || 'Unknown';
      return {
        id: index + 1,
        component,
        note
      };
    })
    .sort((left, right) => left.id - right.id)
    .map((entry) => `| ${entry.id} | ${escapeTableValue(entry.component)} | ${escapeTableValue(entry.note)} |`);

  const screenshotMarkdown = resolveInlineImageMarkdown('Session screenshot with markers', groupedScreenshot);

  return [
    '## Overall Description',
    overallDescription?.trim() || 'No overall description provided.',
    '',
    '## Screenshot',
    screenshotMarkdown ?? '*Screenshot omitted due inline payload limits.*',
    '',
    '## Marker Comments',
    '| ID | Component | Note |',
    '| --- | --- | --- |',
    ...markerRows,
    '',
    '## Context',
    '| Property | Value |',
    '| --- | --- |',
    `| URL | ${escapeTableValue(first.url ?? 'Unknown')} |`,
    `| Viewport | ${escapeTableValue(viewport)} |`,
    `| Capture Timestamp | ${escapeTableValue(captured)} |`,
    `| OS | ${escapeTableValue(os)} |`,
    `| Browser | ${escapeTableValue(browser)} |`,
    `| User Agent | ${escapeTableValue(userAgent)} |`,
    `| Resolution | ${escapeTableValue(resolution)} |`,
    `| Marker Count | ${annotations.length} |`,
    '',
    '---',
    '*Created via Notis*'
  ].join('\n');
}

export function buildIssueCreateInput(
  titleSource: string,
  description: string,
  overrides?: LinearIssueCreateOverrides
): LinearIssueCreateInput {
  const teamId = overrides?.teamId?.trim();
  if (!teamId) {
    throw new Error('No Linear team selected for this submission.');
  }

  const input: LinearIssueCreateInput = {
    title: getIssueTitle(overrides?.title?.trim() || titleSource),
    description,
    teamId
  };

  const projectId = overrides?.projectId?.trim();
  if (projectId) {
    input.projectId = projectId;
  }

  const labelIds = (overrides?.labelIds ?? [])
    .map((id) => id.trim())
    .filter(Boolean);
  if (labelIds.length > 0) {
    input.labelIds = labelIds;
  }

  if (typeof overrides?.priority === 'number' && overrides.priority >= 0 && overrides.priority <= 4) {
    input.priority = overrides.priority;
  }

  const assigneeId = overrides?.assigneeId?.trim();
  if (assigneeId) {
    input.assigneeId = assigneeId;
  }

  if (overrides?.triage && overrides.triageStateId?.trim()) {
    input.stateId = overrides.triageStateId.trim();
  }

  return input;
}
