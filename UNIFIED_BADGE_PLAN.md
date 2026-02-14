# Unified Badge Implementation Plan

## Architecture

The badge IS the queue. One morphing container with four shapes:
- **Badge** (44×44 circle) — collapsed state, shows note count or "+"
- **Queue** (280×dynamic rect) — expanded panel with notes list
- **Loading** (44×44 circle) — spinner during submission
- **Success/Error** (pill) — result state before returning to badge

---

## Animation Values (Based on Emil Kowalski Guidelines)

### Hybrid Approach
- **Cubic-bezier** for functional transitions (precise, tool-like)
- **Spring** only for success state (moment of earned delight)

### Container Morphing
| Transition | Duration/Type | Rationale |
|------------|---------------|-----------|
| Badge → Queue | 250ms cubic-bezier | Precise, intentional expand |
| Queue → Loading | 200ms cubic-bezier | Functional collapse |
| Loading → Success | **Spring** (stiffness: 400, damping: 28) | Moment of delight |
| Loading → Error | 250ms cubic-bezier | Errors shouldn't bounce |
| Success/Error → Badge | 200ms cubic-bezier | Clean return to idle |

### Content Animations (Staggered Cascade)
| Element | Animation | Duration | Delay |
|---------|-----------|----------|-------|
| Header | Slide down from y: -6 | 120ms | 20ms |
| Notes | Slide in from x: -8, staggered | 120ms | 30ms + 20ms per row |
| Settings bar | Slide up from y: 4 | 120ms | After last note |
| Exit | Instant opacity fade (no slide) | — | — |

**Total content animation: ~190ms** (snappy for productivity tool)

### Easing
| Transition | Curve | Rationale |
|------------|-------|-----------|
| Container morph | `cubic-bezier(0.32, 0.72, 0, 1)` | iOS-style energetic curve |
| Success spring | stiffness: 400, damping: 28, mass: 1 | Subtle bounce |
| Content | `[0.32, 0.72, 0, 1]` | Matching curve |

### Button Press Feedback
- `transform: scale(0.97)` on press
- `transition: transform 150ms ease-out`

---

## Implementation Tasks (Extension)

### Task 1: Create UnifiedBadge Component
File: `src/content/unified-badge.ts`

Replace separate `floating-badge.ts` and `queue-panel.ts` with single unified component:
- Single container element that morphs between states
- Stage-driven state machine: badge → queue → loading → success/error → badge
- CSS transitions for container morphing
- Staggered content animations

### Task 2: Update Styles
File: `src/content/styles.css`

Add unified badge styles:
- `.notis-unified-badge` base styles
- Stage-specific dimensions via CSS custom properties or data attributes
- Content animation keyframes
- Button press feedback (`:active` states)

### Task 3: Update Content Script
File: `src/content/index.ts`

- Remove separate badge and queue panel imports
- Import and initialize unified badge
- Update event handlers to work with unified component

### Task 4: Wire Up Submission Flow
- Badge click → expand to queue
- Submit click → collapse to loading → call API → expand to result
- Result timeout → collapse to badge
- Track `prevStage` to apply correct transition (spring for success)

### Task 5: Add Accessibility
- `prefers-reduced-motion` support (instant transitions)
- Proper ARIA attributes
- Keyboard navigation

---

## Files to Modify

1. **`src/content/unified-badge.ts`** — New unified component (replaces badge + queue)
2. **`src/content/styles.css`** — Unified badge styles
3. **`src/content/index.ts`** — Update imports and initialization

## Files to Remove (after migration)
- `src/content/floating-badge.ts`
- `src/content/queue-panel.ts`

---

## Verification

1. Run `pnpm dev` and test on a webpage
2. Test all transitions:
   - Click badge → queue expands with staggered content (250ms + 190ms content)
   - Click outside → queue collapses instantly
   - Click submit → loading spinner (200ms)
   - Loading → success pill with spring bounce
   - Loading → error pill without bounce
   - Result → badge after timeout (200ms)
3. Verify button press feedback
4. Test reduced motion mode
5. Run `pnpm build` to verify no errors
