import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { BackgroundResponse } from '../shared/messages';
import { sendRuntimeMessage } from '../shared/runtime';
import { STORAGE_KEYS } from '../shared/constants';
import { setLocalStorageItems } from '../shared/chrome-storage';
import {
  springTransition,
  buttonHoverScale,
  buttonTapScaleWithY,
  createDisabledButtonHover,
  createDisabledButtonTap,
} from '../shared/motion-presets';

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

const stepVariants = {
  initial: (direction: number) => ({
    opacity: 0,
    y: direction > 0 ? 16 : -16,
    scale: 0.98,
  }),
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
  },
  exit: (direction: number) => ({
    opacity: 0,
    y: direction < 0 ? 16 : -16,
    scale: 0.98,
  }),
};

const stepTransition = {
  type: 'spring' as const,
  stiffness: 400,
  damping: 30,
  mass: 0.8,
};

const indicatorVariants = {
  initial: { scale: 0.8, opacity: 0 },
  animate: { scale: 1, opacity: 1 },
  exit: { scale: 0.8, opacity: 0 },
};

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
  const [direction, setDirection] = useState(1);
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
      setDirection(1);
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
    setDirection(1);
    await connectWithOAuth();
  };

  const handleGrantClick = async (): Promise<void> => {
    setDirection(1);
    await toggleCurrentSitePermission();
  };

  return (
    <div className="onboarding-wizard">
      <div className="onboarding-progress">
        <div className="onboarding-steps">
          <motion.div
            className={`onboarding-step-dot ${stepNumber >= 1 ? 'active' : ''} ${step === 'success' ? 'completed' : ''}`}
            variants={indicatorVariants}
            initial="initial"
            animate="animate"
            transition={{ delay: 0.1 }}
          />
          <div className="onboarding-step-line" />
          <motion.div
            className={`onboarding-step-dot ${stepNumber >= 2 ? 'active' : ''} ${step === 'success' ? 'completed' : ''}`}
            variants={indicatorVariants}
            initial="initial"
            animate="animate"
            transition={{ delay: 0.2 }}
          />
        </div>
        <span className="onboarding-step-label">
          {step === 'success' ? 'Setup complete' : `Step ${stepNumber} of 2`}
        </span>
      </div>

      <AnimatePresence mode="wait" custom={direction}>
        {step === 'connect' && (
          <motion.div
            key="connect"
            className="onboarding-content"
            custom={direction}
            variants={stepVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={stepTransition}
          >
            <h2 className="onboarding-title">Connect to Linear</h2>
            <p className="onboarding-description">
              Notis creates tickets in your Linear workspace when you capture feedback.
            </p>
            <motion.button
              className="button primary large"
              onClick={() => void handleConnectClick()}
              disabled={authBusy}
              whileHover={createDisabledButtonHover(authBusy)}
              whileTap={createDisabledButtonTap(authBusy, true)}
              transition={springTransition}
            >
              {authBusy ? 'Connecting...' : 'Connect Linear'}
            </motion.button>
          </motion.div>
        )}

        {step === 'grant' && (
          <motion.div
            key="grant"
            className="onboarding-content"
            custom={direction}
            variants={stepVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={stepTransition}
          >
            <h2 className="onboarding-title">Enable on this site</h2>
            <p className="onboarding-description">
              Allow Notis to highlight elements on{' '}
              <strong>{currentSiteTarget?.label ?? 'this site'}</strong> so you can select them for feedback.
            </p>
            <p className="onboarding-privacy">
              Your data only goes to Linear.
            </p>
            <motion.button
              className="button primary large"
              onClick={() => void handleGrantClick()}
              disabled={sitePermissionsBusy || !currentSiteTarget}
              whileHover={createDisabledButtonHover(sitePermissionsBusy || !currentSiteTarget)}
              whileTap={createDisabledButtonTap(sitePermissionsBusy || !currentSiteTarget, true)}
              transition={springTransition}
            >
              {sitePermissionsBusy ? 'Granting...' : 'Enable on This Site'}
            </motion.button>
          </motion.div>
        )}

        {step === 'success' && (
          <motion.div
            key="success"
            className="onboarding-content onboarding-success"
            custom={direction}
            variants={stepVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={stepTransition}
          >
            <motion.div
              className="onboarding-checkmark"
              initial={{ scale: 0, rotate: -45 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 400, damping: 15, delay: 0.2 }}
            >
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 12l5 5L20 6" />
              </svg>
            </motion.div>
            <h2 className="onboarding-title">You're ready!</h2>
            <p className="onboarding-description">
              Click anywhere to add a note, or select text to highlight.
            </p>
            <motion.button
              className="button primary large"
              onClick={() => void handleComplete()}
              whileHover={buttonHoverScale}
              whileTap={buttonTapScaleWithY}
              transition={springTransition}
            >
              Start Annotating
            </motion.button>
            <motion.p
              className="onboarding-shortcut"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              Pro tip: <kbd>⌘⇧F</kbd> activates instantly
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
