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
  themePreference: 'themePreference'
} as const;

export const LEGACY_STORAGE_KEYS = {
  linearTeamId: 'linearTeamId',
  linearProjectId: 'linearProjectId',
  linearDefaultLabelIds: 'linearDefaultLabelIds',
  markerClickBehavior: 'markerClickBehavior'
} as const;

export const UI_IDS = {
  rootContainer: 'notiv-extension-root',
  styleTag: 'notiv-extension-style'
} as const;
