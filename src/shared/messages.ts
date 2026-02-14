import type { Annotation, ElementSelection, HighlightColor, LinearIssueCreateOverrides } from './types';

export type ContentToBackgroundMessage =
  | {
      type: 'captureAndCreateIssue';
      payload: {
        annotation: Omit<Annotation, 'screenshot' | 'screenshotViewport' | 'linearIssue'>;
        overrides?: LinearIssueCreateOverrides;
      };
    }
  | {
      type: 'captureAndCreateGroupedIssue';
      payload: {
        annotations: Array<Omit<Annotation, 'screenshot' | 'screenshotViewport' | 'linearIssue'>>;
        overrides?: LinearIssueCreateOverrides;
      };
    }
  | {
      type: 'captureAndCopyScreenshot';
      payload: {
        annotations: Array<Omit<Annotation, 'screenshot' | 'screenshotViewport' | 'linearIssue'>>;
      };
    }
  | {
      type: 'linearAuthStart';
    }
  | {
      type: 'linearAuthDisconnect';
    }
  | {
      type: 'linearSettingsGet';
    }
  | {
      type: 'linearResourcesGet';
      payload?: {
        accessToken?: string;
      };
    }
  | {
      type: 'linearSettingsSave';
      payload: {
        accessToken?: string;
        linearOAuthClientId?: string;
      };
    }
  | {
      type: 'activatePicker';
    }
  | {
      type: 'setPickerActive';
      payload: {
        active: boolean;
      };
    }
  | {
      type: 'setToolbarVisible';
      payload: {
        visible: boolean;
      };
    }
  | {
      type: 'openSettingsPage';
    }
  | {
      type: 'refreshActionPopupState';
    }
  | {
      type: 'checkDirectActivationReady';
    };

export type BackgroundToContentMessage =
  | {
      type: 'notisPing';
    }
  | {
      type: 'pickerActivationChanged';
      payload: { active: boolean };
    }
  | {
      type: 'toolbarVisibilityChanged';
      payload: { visible: boolean };
    }
  | {
      type: 'capturePrepare';
      payload: {
        boundingBox?: {
          x: number;
          y: number;
          width: number;
          height: number;
        };
        marker?: {
          x: number;
          y: number;
          text?: string;
          index?: number;
          color?: HighlightColor;
        };
        highlights?: Array<{
          x: number;
          y: number;
          width: number;
          height: number;
          color?: HighlightColor;
        }>;
        markers?: Array<{
          x: number;
          y: number;
          text?: string;
          index?: number;
          color?: HighlightColor;
        }>;
      };
    }
  | {
      type: 'captureRestore';
    }
  | {
      type: 'pickerSelectionChanged';
      payload: { selection: ElementSelection | null };
    }
  | {
      type: 'issueCreated';
      payload: {
        identifier: string;
        url: string;
      };
    }
  | {
      type: 'issueCreationFailed';
      payload: {
        message: string;
      };
    };

export type BackgroundResponse =
  | {
      ok: true;
      data?: unknown;
    }
  | {
      ok: false;
      error: string;
    };
