export const STORAGE_KEYS = {
  linearAccessToken: 'linearAccessToken',
  linearRefreshToken: 'linearRefreshToken',
  linearAccessTokenExpiresAt: 'linearAccessTokenExpiresAt',
  linearOAuthClientId: 'linearOAuthClientId',
  captureRedactionEnabled: 'captureRedactionEnabled',
  markersVisible: 'markersVisible',
  lastHighlightColor: 'lastHighlightColor',
  submitTeamId: 'submitTeamId',
  submitProjectId: 'submitProjectId',
  submitAssigneeId: 'submitAssigneeId',
  submitPriority: 'submitPriority',
  submitTriage: 'submitTriage',
  submitLabelIds: 'submitLabelIds',
  submitSettingsExpanded: 'submitSettingsExpanded',
  themePreference: 'themePreference',
  sessionNoteCount: 'sessionNoteCount'
} as const;

export const LEGACY_STORAGE_KEYS = {
  linearTeamId: 'linearTeamId',
  linearProjectId: 'linearProjectId',
  linearDefaultLabelIds: 'linearDefaultLabelIds',
  markerClickBehavior: 'markerClickBehavior'
} as const;

export const UI_IDS = {
  rootContainer: 'notis-extension-root',
  styleTag: 'notis-extension-style'
} as const;
