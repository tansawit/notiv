export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface LinearIssueRef {
  id: string;
  identifier: string;
  url: string;
}

export interface AnnotationAttachment {
  name: string;
  dataUrl: string;
}

export type HighlightColor = 'blue' | 'yellow' | 'green' | 'red' | 'purple' | 'orange' | 'light-blue';

export interface Annotation {
  id: string;
  comment: string;
  highlightColor: HighlightColor;
  titleOverride?: string;
  attachments?: AnnotationAttachment[];
  elementPath: string;
  timestamp: number;
  x: number;
  y: number;
  element: string;
  elementLabel?: string;
  componentName?: string;
  url?: string;
  boundingBox?: BoundingBox;
  reactComponents?: string[];
  cssClasses?: string[];
  computedStyles?: Record<string, string>;
  accessibility?: {
    role?: string;
    label?: string;
  };
  viewport?: {
    width: number;
    height: number;
    devicePixelRatio: number;
  };
  environment?: {
    os: string;
    browser: string;
    resolution: string;
    userAgent?: string;
  };
  screenshot: string;
  screenshotViewport?: string;
  linearIssue?: LinearIssueRef;
}

export interface ElementSelection {
  elementPath: string;
  tag: string;
  elementLabel?: string;
  classes: string[];
  componentName?: string;
  reactComponents: string[];
  contentPreview?: string;
  href?: string;
  boundingBox: BoundingBox;
  accessibility: {
    role?: string;
    label?: string;
  };
}

export interface LinearSettings {
  accessToken?: string;
  refreshToken?: string;
  accessTokenExpiresAt?: number;
  linearOAuthClientId?: string;
}

export interface LinearTeam {
  id: string;
  key: string;
  name: string;
  triageStateId?: string;
  memberIds?: string[];
}

export interface LinearProject {
  id: string;
  name: string;
  teamIds: string[];
}

export interface LinearLabel {
  id: string;
  name: string;
  color: string;
  isGroup: boolean;
  parentId?: string;
  teamId?: string;
}

export interface LinearUser {
  id: string;
  name: string;
  avatarUrl?: string;
}

export interface LinearIssueCreateOverrides {
  teamId?: string;
  title?: string;
  description?: string;
  priority?: number;
  projectId?: string;
  assigneeId?: string;
  labelIds?: string[];
  triage?: boolean;
  triageStateId?: string;
}

export interface LinearWorkspaceResources {
  viewerName?: string;
  organizationName?: string;
  teams: LinearTeam[];
  projects: LinearProject[];
  labels: LinearLabel[];
  users: LinearUser[];
}

export interface SubmissionHistoryItem {
  id: string;
  identifier: string;
  url: string;
  timestamp: number;
  noteCount: number;
  firstNotePreview: string;
  pageDomain: string;
}
