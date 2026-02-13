import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDialKit } from 'dialkit';
import { GenieEffect } from './GenieEffect';

/* ─────────────────────────────────────────────────────────────
 * SUBMISSION ANIMATION STORYBOARD
 *
 * Stage 0: IDLE
 *          Queue panel open, badge shows count
 *
 * Stage 1: QUEUE_EXIT (user clicks Submit)
 *     0ms  Queue panel warps with genie effect toward badge
 *   400ms  Queue panel fully absorbed into badge
 *
 * Stage 2: LOADING
 *   400ms  Badge morphs: count fades out, spinner fades in
 *          Spinner rotating (continuous until response)
 *
 * Stage 3a: SUCCESS
 *     0ms  Spinner fades out
 *    50ms  Badge expands horizontally into pill
 *   150ms  Green background fades in
 *   200ms  Checkmark + ticket ID fade in
 *  6000ms  Begin collapse back to empty badge
 *
 * Stage 3b: ERROR
 *     0ms  Spinner fades out
 *    50ms  Badge expands into pill
 *   150ms  Red background fades in
 *   200ms  X icon + error message fade in
 *  6000ms  Begin collapse back to empty badge
 *
 * Stage 4: RESET
 *     0ms  Pill content fades out
 *   100ms  Pill shrinks back to circle
 *   200ms  "+" icon fades in
 * ─────────────────────────────────────────────────────────── */

type Stage = 'idle' | 'genie-exit' | 'loading' | 'success' | 'error' | 'reset';

export function SubmissionAnimationMock() {
  const [stage, setStage] = useState<Stage>('idle');
  const [noteCount] = useState(3);
  const [genieActive, setGenieActive] = useState(false);
  const badgeRef = useRef<HTMLDivElement>(null);

  const params = useDialKit('Submission Animation', {
    // Genie Effect
    genie: {
      duration: [400, 200, 800],
      pinchAmount: [0.95, 0.5, 1.0],
      pinchCurve: [2.5, 1, 5],
      concaveStrength: [0.6, 0, 1.5],
      verticalSqueeze: [0.4, 0, 0.8],
    },

    // Loading
    loading: {
      morphDuration: [150, 50, 300],
      spinnerSpeed: [1, 0.5, 2],
    },

    // Pill Expansion
    pill: {
      expandDuration: [200, 100, 400],
      successWidth: [160, 120, 220],
      errorWidth: [180, 140, 240],
      contentDelay: [100, 0, 300],
    },

    // Timing
    pillVisibleDuration: [6000, 2000, 10000],
    resetDuration: [300, 150, 500],

    // Springs
    expandSpring: {
      type: 'spring' as const,
      visualDuration: 0.25,
      bounce: 0.15,
    },

    // Actions
    restart: { type: 'action' as const, label: 'Restart Demo' },
    simulateSuccess: { type: 'action' as const, label: 'Trigger Success' },
    simulateError: { type: 'action' as const, label: 'Trigger Error' },
  }, {
    onAction: (action) => {
      if (action === 'restart') {
        setStage('idle');
        setGenieActive(false);
      }
      if (action === 'simulateSuccess') {
        runSubmission('success');
      }
      if (action === 'simulateError') {
        runSubmission('error');
      }
    },
  });

  const getBadgePosition = useCallback(() => {
    if (!badgeRef.current) return { x: window.innerWidth - 42, y: window.innerHeight - 42 };
    const rect = badgeRef.current.getBoundingClientRect();
    return {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
    };
  }, []);

  const runSubmission = (result: 'success' | 'error') => {
    setStage('genie-exit');
    setGenieActive(true);

    setTimeout(() => {
      setGenieActive(false);
      setStage('loading');
    }, params.genie.duration);

    setTimeout(() => {
      setStage(result);
    }, params.genie.duration + 1500);

    setTimeout(() => {
      setStage('reset');
    }, params.genie.duration + 1500 + params.pillVisibleDuration);

    setTimeout(() => {
      setStage('idle');
    }, params.genie.duration + 1500 + params.pillVisibleDuration + params.resetDuration);
  };

  const badgeSize = 44;
  const isExpanded = stage === 'success' || stage === 'error';
  const pillWidth = stage === 'success'
    ? params.pill.successWidth
    : stage === 'error'
      ? params.pill.errorWidth
      : badgeSize;

  const showQueuePanel = stage === 'idle' || stage === 'genie-exit';

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'Inter, system-ui, sans-serif',
    }}>
      {/* Mock page content */}
      <div style={{
        position: 'absolute',
        top: 40,
        left: 40,
        color: 'rgba(255,255,255,0.3)',
        fontSize: 14,
      }}>
        Stage: <strong style={{ color: 'rgba(255,255,255,0.7)' }}>{stage}</strong>
      </div>

      {/* Queue Panel with Genie Effect */}
      {showQueuePanel && (
        <GenieEffect
          active={genieActive}
          config={{
            pinchAmount: params.genie.pinchAmount,
            pinchCurve: params.genie.pinchCurve,
            concaveStrength: params.genie.concaveStrength,
            verticalSqueeze: params.genie.verticalSqueeze,
          }}
          targetPosition={getBadgePosition()}
          duration={params.genie.duration}
          onComplete={() => {
            // Genie animation complete
          }}
        >
          <div
            style={{
              position: 'fixed',
              right: 20,
              bottom: 68,
              width: 280,
              background: '#2a2a3e',
              borderRadius: 12,
              border: '1px solid rgba(255,255,255,0.1)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
              overflow: 'hidden',
            }}
          >
            {/* Header */}
            <div style={{
              padding: '12px 16px',
              borderBottom: '1px solid rgba(255,255,255,0.1)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
              <span style={{ color: '#fff', fontWeight: 600, fontSize: 14 }}>
                {noteCount} notes captured
              </span>
              <div style={{ display: 'flex', gap: 8 }}>
                <button style={{
                  background: 'transparent',
                  border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: 6,
                  padding: '6px 12px',
                  color: 'rgba(255,255,255,0.7)',
                  fontSize: 12,
                  cursor: 'pointer',
                }}>
                  Clear
                </button>
                <button
                  onClick={() => runSubmission('success')}
                  style={{
                    background: '#c9a227',
                    border: 'none',
                    borderRadius: 6,
                    width: 32,
                    height: 32,
                    color: '#1a1a2e',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Notes list */}
            <div style={{ padding: 8 }}>
              {[1, 2, 3].map((i) => (
                <div key={i} style={{
                  padding: '10px 8px',
                  display: 'flex',
                  gap: 10,
                  alignItems: 'flex-start',
                }}>
                  <div style={{
                    width: 16,
                    height: 16,
                    borderRadius: 4,
                    background: '#c9a227',
                    color: '#1a1a2e',
                    fontSize: 10,
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    {i}
                  </div>
                  <div>
                    <div style={{ color: '#fff', fontSize: 13, fontWeight: 500 }}>
                      Test note {i}
                    </div>
                    <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, marginTop: 2 }}>
                      paragraph: "Example text"
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Settings bar */}
            <div style={{
              padding: '8px 12px',
              borderTop: '1px solid rgba(255,255,255,0.1)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
              <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11 }}>
                Options
              </span>
              <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11 }}>
                → EXP
              </span>
            </div>
          </div>
        </GenieEffect>
      )}

      {/* Badge / Loading / Pill */}
      <motion.div
        ref={badgeRef}
        layout
        animate={{
          width: isExpanded ? pillWidth : badgeSize,
          height: badgeSize,
          borderRadius: badgeSize / 2,
          backgroundColor: stage === 'success'
            ? '#22c55e'
            : stage === 'error'
              ? '#ef4444'
              : '#c9a227',
        }}
        transition={params.expandSpring}
        style={{
          position: 'fixed',
          right: 20,
          bottom: 20,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
          overflow: 'hidden',
        }}
      >
        <AnimatePresence mode="wait">
          {/* Idle: Show count */}
          {stage === 'idle' && (
            <motion.span
              key="count"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.15 }}
              style={{
                color: '#1a1a2e',
                fontWeight: 600,
                fontSize: 16,
              }}
            >
              {noteCount}
            </motion.span>
          )}

          {/* Genie Exit: Show count while panel animates */}
          {stage === 'genie-exit' && (
            <motion.span
              key="count-exit"
              initial={{ opacity: 1 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              style={{
                color: '#1a1a2e',
                fontWeight: 600,
                fontSize: 16,
              }}
            >
              {noteCount}
            </motion.span>
          )}

          {/* Loading: Spinner */}
          {stage === 'loading' && (
            <motion.div
              key="spinner"
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1, rotate: 360 }}
              exit={{ opacity: 0, scale: 0.5 }}
              transition={{
                opacity: { duration: params.loading.morphDuration / 1000 },
                scale: { duration: params.loading.morphDuration / 1000 },
                rotate: {
                  duration: 1 / params.loading.spinnerSpeed,
                  repeat: Infinity,
                  ease: 'linear'
                },
              }}
              style={{
                width: 20,
                height: 20,
                border: '2px solid rgba(26,26,46,0.3)',
                borderTopColor: '#1a1a2e',
                borderRadius: '50%',
              }}
            />
          )}

          {/* Success: Checkmark + ID */}
          {stage === 'success' && (
            <motion.div
              key="success"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ delay: params.pill.contentDelay / 1000 }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '0 14px',
                color: '#fff',
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M20 6L9 17l-5-5" />
              </svg>
              <span style={{ fontWeight: 600, fontSize: 13 }}>EXP-142</span>
              <div style={{ display: 'flex', gap: 4, marginLeft: 4 }}>
                <button style={{
                  background: 'rgba(255,255,255,0.2)',
                  border: 'none',
                  borderRadius: 4,
                  width: 24,
                  height: 24,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="9" y="9" width="13" height="13" rx="2" />
                    <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                  </svg>
                </button>
                <button style={{
                  background: 'rgba(255,255,255,0.2)',
                  border: 'none',
                  borderRadius: 4,
                  width: 24,
                  height: 24,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3" />
                  </svg>
                </button>
              </div>
            </motion.div>
          )}

          {/* Error: X + message */}
          {stage === 'error' && (
            <motion.div
              key="error"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ delay: params.pill.contentDelay / 1000 }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '0 14px',
                color: '#fff',
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
              <span style={{ fontWeight: 500, fontSize: 12 }}>Failed to submit</span>
            </motion.div>
          )}

          {/* Reset: Plus icon */}
          {stage === 'reset' && (
            <motion.span
              key="plus"
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              style={{
                color: '#1a1a2e',
                fontWeight: 600,
                fontSize: 20,
              }}
            >
              +
            </motion.span>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

export default SubmissionAnimationMock;
