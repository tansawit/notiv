import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { useDialKit } from 'dialkit';

/* ─────────────────────────────────────────────────────────────
 * UNIFIED BADGE STORYBOARD
 *
 * The badge IS the queue. One morphing container, four shapes.
 *
 * Stage 0: BADGE (collapsed)
 *          44×44 circle, shows note count or "+"
 *          Click → expands to QUEUE (250ms, cubic-bezier)
 *
 * Stage 1: QUEUE (expanded panel)
 *          280×dynamic rounded rect, shows notes list + submit
 *          Click Submit → shrinks to LOADING (200ms, cubic-bezier)
 *
 * Stage 2: LOADING (collapsed)
 *          44×44 circle, spinning indicator
 *          On response → expands to RESULT
 *            - SUCCESS: spring (subtle bounce for delight)
 *            - ERROR: cubic-bezier (errors shouldn't bounce)
 *
 * Stage 3: SUCCESS / ERROR (pill)
 *          ~160×44 pill, green/red with ticket ID or error
 *          After 6s → shrinks to BADGE (200ms, cubic-bezier)
 *
 * HYBRID ANIMATION APPROACH:
 * - Cubic-bezier for functional transitions (precise, tool-like)
 * - Spring only for success (moment of earned delight)
 * ─────────────────────────────────────────────────────────── */

type Stage = 'badge' | 'queue' | 'loading' | 'success' | 'error';

interface Note {
  id: string;
  text: string;
  context: string;
}

const BADGE_SIZE = 44;

const TIMING = {
  expand: 0.25,
  collapse: 0.2,
  pillExpand: 0.25,
  pillCollapse: 0.2,
  contentFade: 0.15,
};

const EASING = {
  precise: [0.32, 0.72, 0, 1] as const,
};

const SPRING_SUCCESS = {
  type: 'spring' as const,
  stiffness: 400,
  damping: 28,
  mass: 1,
};

export function UnifiedBadgeMock() {
  const [stage, setStage] = useState<Stage>('badge');
  const [prevStage, setPrevStage] = useState<Stage>('badge');
  const [notes, setNotes] = useState<Note[]>([
    { id: '1', text: 'Test note 1', context: 'paragraph: "Example text"' },
    { id: '2', text: 'Test note 2', context: 'paragraph: "More context"' },
    { id: '3', text: 'Test note 3', context: 'heading: "Section title"' },
  ]);
  const [showTooltip, setShowTooltip] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = useReducedMotion();

  const params = useDialKit('Unified Badge', {
    dimensions: {
      queueWidth: [280, 240, 360],
      successWidth: [160, 120, 220],
      errorWidth: [180, 140, 240],
      rowHeight: [52, 40, 64],
      headerHeight: [48, 40, 56],
      settingsHeight: [36, 32, 44],
    },
    loadingDuration: [1500, 500, 3000],
    pillVisibleDuration: [6000, 2000, 10000],
    addNote: { type: 'action' as const, label: 'Add Note' },
    clearNotes: { type: 'action' as const, label: 'Clear Notes' },
    simulateSuccess: { type: 'action' as const, label: 'Trigger Success' },
    simulateError: { type: 'action' as const, label: 'Trigger Error' },
    restart: { type: 'action' as const, label: 'Reset to Badge' },
  }, {
    onAction: (action) => {
      if (action === 'addNote') {
        const id = String(Date.now());
        setNotes(prev => [...prev, { id, text: `Note ${prev.length + 1}`, context: 'new context' }]);
      }
      if (action === 'clearNotes') setNotes([]);
      if (action === 'simulateSuccess') runSubmission('success');
      if (action === 'simulateError') runSubmission('error');
      if (action === 'restart') {
        changeStage('badge');
        setShowTooltip(false);
      }
    },
  });

  const changeStage = (newStage: Stage) => {
    setStage((currentStage) => {
      setPrevStage(currentStage);
      return newStage;
    });
  };

  const runSubmission = (result: 'success' | 'error') => {
    changeStage('loading');
    setTimeout(() => changeStage(result), params.loadingDuration);
    setTimeout(() => {
      changeStage('badge');
      setNotes([]);
    }, params.loadingDuration + params.pillVisibleDuration);
  };

  const handleBadgeClick = () => {
    if (stage === 'badge') changeStage('queue');
    else if (stage === 'loading') {
      setShowTooltip(true);
      setTimeout(() => setShowTooltip(false), 2000);
    }
  };

  const handleSubmit = () => {
    if (notes.length > 0) runSubmission('success');
  };

  const queueHeight =
    params.dimensions.headerHeight +
    params.dimensions.settingsHeight +
    Math.max(1, notes.length) * params.dimensions.rowHeight +
    (notes.length === 0 ? 40 : 16);

  const isExpanded = stage === 'queue';

  useEffect(() => {
    if (!isExpanded) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        changeStage('badge');
      }
    };
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 100);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isExpanded]);

  const getDimensions = () => {
    switch (stage) {
      case 'badge':
      case 'loading':
        return {
          width: BADGE_SIZE,
          height: BADGE_SIZE,
          borderRadius: BADGE_SIZE / 2,
          backgroundColor: '#c9a227',
        };
      case 'queue':
        return {
          width: params.dimensions.queueWidth,
          height: queueHeight,
          borderRadius: 12,
          backgroundColor: '#c9a227',
        };
      case 'success':
        return {
          width: params.dimensions.successWidth,
          height: BADGE_SIZE,
          borderRadius: BADGE_SIZE / 2,
          backgroundColor: '#22c55e',
        };
      case 'error':
        return {
          width: params.dimensions.errorWidth,
          height: BADGE_SIZE,
          borderRadius: BADGE_SIZE / 2,
          backgroundColor: '#ef4444',
        };
    }
  };

  const getContainerTransition = () => {
    if (prefersReducedMotion) {
      return { duration: 0 };
    }

    // Success state gets a spring (moment of delight)
    if (stage === 'success' && prevStage === 'loading') {
      return SPRING_SUCCESS;
    }

    // Everything else uses precise cubic-bezier
    let duration = TIMING.collapse;
    if (stage === 'queue') duration = TIMING.expand;
    if (stage === 'error') duration = TIMING.pillExpand;

    return {
      duration,
      ease: EASING.precise,
    };
  };

  const contentTransition = {
    duration: prefersReducedMotion ? 0 : TIMING.contentFade,
    ease: EASING.precise,
  };

  const buttonStyle: React.CSSProperties = {
    transition: 'transform 150ms ease-out',
  };

  const dimensions = getDimensions();
  const containerTransition = getContainerTransition();

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
      fontFamily: 'Inter, system-ui, sans-serif',
    }}>
      {/* Stage indicator */}
      <div style={{
        position: 'absolute',
        top: 40,
        left: 40,
        color: 'rgba(255,255,255,0.3)',
        fontSize: 14,
      }}>
        Stage: <strong style={{ color: 'rgba(255,255,255,0.7)' }}>{stage}</strong>
        {' · '}
        Notes: <strong style={{ color: 'rgba(255,255,255,0.7)' }}>{notes.length}</strong>
        {' · '}
        Transition: <strong style={{ color: stage === 'success' ? 'rgba(100,255,150,0.8)' : 'rgba(255,255,255,0.5)' }}>
          {stage === 'success' && prevStage === 'loading' ? 'spring' : 'cubic-bezier'}
        </strong>
        {prefersReducedMotion && (
          <span style={{ marginLeft: 12, color: 'rgba(255,200,100,0.7)' }}>
            (reduced motion)
          </span>
        )}
      </div>

      {/* Backdrop */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: prefersReducedMotion ? 0 : 0.15 }}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.3)',
              zIndex: 40,
            }}
          />
        )}
      </AnimatePresence>

      {/* Unified morphing container */}
      <motion.div
        ref={containerRef}
        initial={false}
        animate={dimensions}
        transition={containerTransition}
        onClick={handleBadgeClick}
        style={{
          position: 'fixed',
          right: 20,
          bottom: 20,
          boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
          overflow: 'hidden',
          cursor: stage === 'badge' || stage === 'loading' ? 'pointer' : 'default',
          zIndex: 50,
        }}
      >
        <AnimatePresence mode="wait">
          {/* Badge: Note count or + */}
          {stage === 'badge' && (
            <motion.div
              key="badge"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={contentTransition}
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#1a1a2e',
                fontWeight: 600,
                fontSize: notes.length > 0 ? 16 : 20,
              }}
            >
              {notes.length > 0 ? notes.length : '+'}
            </motion.div>
          )}

          {/* Queue: Full panel */}
          {stage === 'queue' && (
            <motion.div
              key="queue"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.1 }}
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                flexDirection: 'column',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.12, delay: 0.02, ease: EASING.precise }}
                style={{
                  padding: '12px 16px',
                  borderBottom: '1px solid rgba(255,255,255,0.1)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  height: params.dimensions.headerHeight,
                  flexShrink: 0,
                }}
              >
                <span style={{ color: '#fff', fontWeight: 600, fontSize: 14 }}>
                  {notes.length} {notes.length === 1 ? 'note' : 'notes'} captured
                </span>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={() => setNotes([])}
                    style={{
                      ...buttonStyle,
                      background: 'transparent',
                      border: '1px solid rgba(255,255,255,0.2)',
                      borderRadius: 6,
                      padding: '6px 12px',
                      color: 'rgba(255,255,255,0.7)',
                      fontSize: 12,
                      cursor: 'pointer',
                    }}
                    onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.97)')}
                    onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                    onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                  >
                    Clear
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={notes.length === 0}
                    style={{
                      ...buttonStyle,
                      background: notes.length > 0 ? '#fff' : 'rgba(255,255,255,0.3)',
                      border: 'none',
                      borderRadius: 6,
                      width: 32,
                      height: 32,
                      color: '#c9a227',
                      cursor: notes.length > 0 ? 'pointer' : 'not-allowed',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                    onMouseDown={(e) => notes.length > 0 && (e.currentTarget.style.transform = 'scale(0.97)')}
                    onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                    onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M5 12h14M12 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              </motion.div>

              {/* Notes list */}
              <div style={{
                flex: 1,
                overflowY: 'auto',
                padding: 8,
              }}>
                {notes.length === 0 ? (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.12, delay: 0.04 }}
                    style={{
                      color: 'rgba(255,255,255,0.5)',
                      fontSize: 13,
                      textAlign: 'center',
                      padding: '16px 8px',
                    }}
                  >
                    No notes yet. Select text to capture.
                  </motion.div>
                ) : (
                  notes.map((note, i) => (
                    <motion.div
                      key={note.id}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{
                        duration: 0.12,
                        delay: 0.03 + i * 0.02,
                        ease: EASING.precise,
                      }}
                      style={{
                        padding: '10px 8px',
                        display: 'flex',
                        gap: 10,
                        alignItems: 'flex-start',
                        height: params.dimensions.rowHeight,
                      }}
                    >
                      <div style={{
                        width: 16,
                        height: 16,
                        borderRadius: 4,
                        background: '#fff',
                        color: '#c9a227',
                        fontSize: 10,
                        fontWeight: 600,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}>
                        {i + 1}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ color: '#fff', fontSize: 13, fontWeight: 500 }}>
                          {note.text}
                        </div>
                        <div style={{
                          color: 'rgba(255,255,255,0.5)',
                          fontSize: 11,
                          marginTop: 2,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}>
                          {note.context}
                        </div>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>

              {/* Settings bar */}
              <motion.div
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{
                  duration: 0.12,
                  delay: 0.03 + Math.min(notes.length, 5) * 0.02,
                  ease: EASING.precise,
                }}
                style={{
                  padding: '8px 12px',
                  borderTop: '1px solid rgba(255,255,255,0.1)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  height: params.dimensions.settingsHeight,
                  flexShrink: 0,
                }}
              >
                <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11 }}>
                  Options
                </span>
                <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11 }}>
                  → EXP
                </span>
              </motion.div>
            </motion.div>
          )}

          {/* Loading: Spinner */}
          {stage === 'loading' && (
            <motion.div
              key="loading"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={contentTransition}
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{
                  duration: 1,
                  repeat: Infinity,
                  ease: 'linear',
                }}
                style={{
                  width: 20,
                  height: 20,
                  border: '2px solid rgba(26,26,46,0.3)',
                  borderTopColor: '#1a1a2e',
                  borderRadius: '50%',
                }}
              />
            </motion.div>
          )}

          {/* Success */}
          {stage === 'success' && (
            <motion.div
              key="success"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={contentTransition}
              style={{
                position: 'absolute',
                inset: 0,
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
              <div style={{ display: 'flex', gap: 4, marginLeft: 'auto' }}>
                <button
                  style={{
                    ...buttonStyle,
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
                  }}
                  onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.97)')}
                  onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                  onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="9" y="9" width="13" height="13" rx="2" />
                    <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                  </svg>
                </button>
                <button
                  style={{
                    ...buttonStyle,
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
                  }}
                  onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.97)')}
                  onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                  onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3" />
                  </svg>
                </button>
              </div>
            </motion.div>
          )}

          {/* Error */}
          {stage === 'error' && (
            <motion.div
              key="error"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={contentTransition}
              style={{
                position: 'absolute',
                inset: 0,
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
        </AnimatePresence>

        {/* Loading tooltip */}
        <AnimatePresence>
          {showTooltip && stage === 'loading' && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ duration: prefersReducedMotion ? 0 : 0.15 }}
              style={{
                position: 'absolute',
                bottom: '100%',
                left: '50%',
                transform: 'translateX(-50%)',
                marginBottom: 8,
                background: '#1a1a2e',
                color: '#fff',
                padding: '6px 12px',
                borderRadius: 6,
                fontSize: 12,
                whiteSpace: 'nowrap',
                boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
              }}
            >
              Submitting to Linear...
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

export default UnifiedBadgeMock;
