import React, { useEffect, useState } from 'react';
import type { BackgroundResponse } from '../shared/messages';
import { sendRuntimeMessage } from '../shared/runtime';
import { STORAGE_KEYS } from '../shared/constants';
import { setLocalStorageItems } from '../shared/chrome-storage';

type OnboardingStep = 'connect' | 'grant' | 'success';

interface OnboardingWizardProps {
  connected: boolean;
  currentSiteTarget: { pattern: string; label: string } | null;
  currentSiteGranted: boolean;
  authBusy: boolean;
  sitePermissionsBusy: boolean;
  connectWithOAuth: () => Promise<void>;
  toggleCurrentSitePermission: () => Promise<void>;
  onComplete: () => void;
}

export function OnboardingWizard({
  connected,
  currentSiteTarget,
  currentSiteGranted,
  authBusy,
  sitePermissionsBusy,
  connectWithOAuth,
  toggleCurrentSitePermission,
  onComplete,
}: OnboardingWizardProps): React.JSX.Element {
  const [showSuccess, setShowSuccess] = useState(false);

  const step: OnboardingStep = showSuccess
    ? 'success'
    : !connected
      ? 'connect'
      : !currentSiteGranted
        ? 'grant'
        : 'success';

  const stepNumber = step === 'connect' ? 1 : step === 'grant' ? 2 : 2;

  useEffect(() => {
    if (connected && currentSiteGranted && !showSuccess) {
      setShowSuccess(true);
    }
  }, [connected, currentSiteGranted, showSuccess]);

  const handleComplete = async (): Promise<void> => {
    await setLocalStorageItems({ [STORAGE_KEYS.onboardingCompleted]: true });
    await sendRuntimeMessage<BackgroundResponse>({ type: 'refreshActionPopupState' });

    try {
      const response = await sendRuntimeMessage<BackgroundResponse>({ type: 'activatePicker' });
      if (response.ok) {
        setTimeout(() => {
          window.close();
        }, 800);
      }
    } catch {
      onComplete();
    }
  };

  const handleConnectClick = async (): Promise<void> => {
    await connectWithOAuth();
  };

  const handleGrantClick = async (): Promise<void> => {
    await toggleCurrentSitePermission();
  };

  return (
    <div className="onboarding-wizard">
      <div className="onboarding-progress">
        <div className="onboarding-steps">
          <div className={`onboarding-step-dot ${stepNumber >= 1 ? 'active' : ''} ${step === 'success' ? 'completed' : ''}`} />
          <div className="onboarding-step-line" />
          <div className={`onboarding-step-dot ${stepNumber >= 2 ? 'active' : ''} ${step === 'success' ? 'completed' : ''}`} />
        </div>
        <span className="onboarding-step-label">
          {step === 'success' ? 'Setup complete' : `Step ${stepNumber} of 2`}
        </span>
      </div>

      {step === 'connect' && (
        <div key="connect" className="onboarding-content step-enter">
          <h2 className="onboarding-title">Connect to Linear</h2>
          <p className="onboarding-description">
            Notis creates tickets in your Linear workspace when you capture feedback.
          </p>
          <button
            className="button primary large"
            onClick={() => void handleConnectClick()}
            disabled={authBusy}
          >
            {authBusy ? 'Connecting...' : 'Connect Linear'}
          </button>
        </div>
      )}

      {step === 'grant' && (
        <div key="grant" className="onboarding-content step-enter">
          <h2 className="onboarding-title">Enable on this site</h2>
          <p className="onboarding-description">
            Allow Notis to highlight elements on{' '}
            <strong>{currentSiteTarget?.label ?? 'this site'}</strong> so you can select them for feedback.
          </p>
          <p className="onboarding-privacy">
            Your data only goes to Linear.
          </p>
          <button
            className="button primary large"
            onClick={() => void handleGrantClick()}
            disabled={sitePermissionsBusy || !currentSiteTarget}
          >
            {sitePermissionsBusy ? 'Granting...' : 'Enable on This Site'}
          </button>
        </div>
      )}

      {step === 'success' && (
        <div key="success" className="onboarding-content onboarding-success step-enter">
          <div className="onboarding-checkmark checkmark-enter">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 12l5 5L20 6" />
            </svg>
          </div>
          <h2 className="onboarding-title">You're ready!</h2>
          <p className="onboarding-description">
            Click anywhere to add a note, or select text to highlight.
          </p>
          <button
            className="button primary large"
            onClick={() => void handleComplete()}
          >
            Start Annotating
          </button>
          <p className="onboarding-shortcut hint-enter">
            Pro tip: <kbd>⌘⇧F</kbd> activates instantly
          </p>
        </div>
      )}
    </div>
  );
}
