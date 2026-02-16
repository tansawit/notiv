export interface PopupStatusDisplayParams {
  ready: boolean;
  connected: boolean;
  currentSiteTarget: { label: string } | null;
  viewerName?: string;
  organizationName?: string;
}

export function getPopupStatusPrimaryText(
  params: PopupStatusDisplayParams
): string {
  if (params.ready) return params.viewerName ?? 'Connected';
  if (!params.connected) return 'Not connected';
  if (!params.currentSiteTarget) return 'No webpage';
  return 'Site access needed';
}

export function getPopupStatusSecondaryText(
  params: PopupStatusDisplayParams
): string {
  if (params.ready) return params.organizationName ?? 'Ready to annotate';
  if (!params.connected) return 'Connect Linear to start';
  if (!params.currentSiteTarget) return 'Open a webpage to annotate';
  return params.currentSiteTarget?.label ?? '';
}

export function getSiteAccessStatusText(
  loading: boolean,
  hasTarget: boolean,
  granted: boolean
): string {
  if (loading) return 'Checking...';
  if (hasTarget && granted) return 'Access granted';
  if (hasTarget) return 'Not granted';
  return 'Unavailable';
}

export function getLinearConnectButtonLabel(input: {
  authBusy: boolean;
  connected: boolean;
  busyText: string;
  connectText?: string;
  reconnectText?: string;
}): string {
  if (input.authBusy) {
    return input.busyText;
  }
  const connectText = input.connectText ?? 'Connect';
  const reconnectText = input.reconnectText ?? 'Reconnect';
  return input.connected ? reconnectText : connectText;
}

export function getLinearWorkspaceSummary(input: {
  connected: boolean;
  viewerName?: string;
  organizationName?: string;
}): string {
  if (!input.connected) {
    return 'Not connected';
  }
  const viewer = input.viewerName ? ` as ${input.viewerName}` : '';
  const org = input.organizationName ? ` to ${input.organizationName}` : '';
  return `Connected${viewer}${org}`;
}
