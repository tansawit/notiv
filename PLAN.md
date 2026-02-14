# Visual Feedback Extension for Linear

Browser extension for PM/QA to capture visual feedback on staging sites and create Linear tickets with screenshots.

## Overview

- **Target users**: PM, QA reviewing staging builds
- **Platform**: Chrome extension (Manifest V3)
- **Output**: Linear tickets with screenshot, element context, and metadata
- **Schema**: Compatible with Agentation Annotation Format v1.0 (with extensions)

## Architecture

```
notis-extension/
├── manifest.json
├── package.json
├── tsconfig.json
├── vite.config.ts
├── src/
│   ├── content/
│   │   ├── index.ts              # Content script entry
│   │   ├── detector.ts           # Element hover/selection
│   │   ├── selector.ts           # CSS selector generation
│   │   ├── highlighter.ts        # Visual highlight overlay
│   │   ├── annotator.tsx         # Annotation popup UI
│   │   └── styles.css            # Injected styles (shadow DOM)
│   ├── background/
│   │   ├── index.ts              # Service worker
│   │   ├── linear.ts             # Linear API client
│   │   ├── screenshot.ts         # Tab capture + crop
│   │   └── storage.ts            # Chrome storage wrapper
│   ├── popup/
│   │   ├── index.html
│   │   ├── popup.tsx             # Settings UI
│   │   └── popup.css
│   ├── shared/
│   │   ├── types.ts              # Annotation schema
│   │   ├── messages.ts           # Message passing types
│   │   └── constants.ts
│   └── lib/
│       └── components.ts         # React/Vue component detection
├── assets/
│   └── icons/                    # Extension icons
└── dist/                         # Build output
```

## Implementation Steps

### Step 1: Project Setup

- [x] Initialize repo with pnpm
- [x] Configure Vite for Chrome extension build
- [x] Set up TypeScript with strict mode
- [x] Create manifest.json (Manifest V3)
- [x] Add production icon set

**Key files:**

- `manifest.json` - Extension config
- `vite.config.ts` - Build config with CRXJS or similar
- `package.json` - Dependencies

### Step 2: Content Script - Element Detection

- [x] Implement element hover highlighting
- [x] Generate unique CSS selectors (prefer data-testid > id > semantic classes)
- [x] Detect React/Vue component names from fiber/instance
- [x] Create highlight overlay (positioned div with border)
- [x] Handle click to select element

**Key files:**

- `src/content/detector.ts`
- `src/content/selector.ts`
- `src/content/highlighter.ts`

### Step 3: Content Script - Annotation UI

- [x] Build annotation popup (React, injected via shadow DOM)
- [x] Text input for feedback
- [x] Severity/highlight metadata controls
- [x] Submit and cancel buttons
- [x] Show captured element info (selector, component name)
- [x] Keyboard shortcuts (Escape to cancel)

**Key files:**

- `src/content/annotator.tsx`
- `src/content/styles.css`

### Step 4: Background - Screenshot Capture

- [x] Use chrome.tabs.captureVisibleTab() for viewport screenshot
- [x] Crop to element bounding box using canvas
- [x] Convert to base64 PNG
- [x] Handle high-DPI displays (devicePixelRatio)

**Key files:**

- `src/background/screenshot.ts`

### Step 5: Background - Linear Integration

- [x] Implement Linear OAuth flow (chrome.identity.launchWebAuthFlow)
- [x] Store tokens in chrome.storage.local
- [x] Create Linear API client (GraphQL)
- [x] Implement issue creation with embedded image
- [x] Fetch teams/projects for settings

**Key files:**

- `src/background/linear.ts`
- `src/background/storage.ts`

### Step 6: Popup - Settings UI

- [x] Linear connection status
- [x] Connect/disconnect button
- [x] Team/project/assignee/priority selectors
- [x] Default label and triage preferences
- [x] Keyboard shortcut display in manifest command + activation flow

**Key files:**

- `src/popup/popup.tsx`
- `src/popup/index.html`

### Step 7: Message Passing & Integration

- [x] Define message types (TypeScript)
- [x] Content → Background: annotation + screenshot request
- [x] Background → Content: auth status, success/error
- [x] Wire up full flow end-to-end

**Key files:**

- `src/shared/messages.ts`
- `src/content/index.ts`
- `src/background/index.ts`

### Step 8: Polish & Edge Cases

- [ ] Handle iframes (if needed)
- [x] Handle fixed/sticky positioned elements
- [x] Add loading state during submission
- [x] Error handling with user-friendly messages
- [x] Toast notification on success with Linear link
- [x] Keyboard shortcut to activate (Cmd+Shift+F)

### Step 9: Testing & Documentation

- [ ] Manual testing on staging sites
- [ ] Test with various frameworks (Next.js, Vite, CRA)
- [x] Write README with setup instructions
- [x] Document Linear OAuth app setup and redirect URI model

## Schema (Agentation-compatible + Extensions)

```typescript
interface Annotation {
  // Required (Agentation v1.0)
  id: string;
  comment: string;
  elementPath: string;
  timestamp: number;
  x: number;
  y: number;
  element: string;

  // Recommended (Agentation v1.0)
  url?: string;
  boundingBox?: { x: number; y: number; width: number; height: number };

  // Context (Agentation v1.0)
  reactComponents?: string[];
  cssClasses?: string[];
  computedStyles?: Record<string, string>;
  accessibility?: { role?: string; label?: string };

  // Extensions (our additions)
  screenshot: string; // base64 PNG
  screenshotViewport?: string; // full viewport for context
  severity: 'bug' | 'suggestion' | 'question';
  linearIssue?: {
    id: string;
    identifier: string;
    url: string;
  };
}
```

## Linear Ticket Format

```markdown
## Feedback

{comment}

## Screenshot

![Element screenshot](data:image/png;base64,{screenshot})

## Element

| Property  | Value                  |
| --------- | ---------------------- |
| Selector  | `{elementPath}`        |
| Component | `{reactComponents[0]}` |
| Tag       | `{element}`            |

## Context

- **URL**: {url}
- **Viewport**: {viewport.width}x{viewport.height}
- **Captured**: {timestamp}

---

_Created via Notis Extension_
```

## Dependencies

```json
{
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  },
  "devDependencies": {
    "@crxjs/vite-plugin": "^2.0.0-beta",
    "@types/chrome": "^0.0.260",
    "@types/react": "^18.2.0",
    "typescript": "^5.3.0",
    "vite": "^5.0.0"
  }
}
```

## Manifest V3

```json
{
  "manifest_version": 3,
  "name": "Notis",
  "version": "0.1.0",
  "description": "Visual feedback for staging review → Linear",

  "permissions": ["activeTab", "storage", "identity"],

  "host_permissions": ["https://api.linear.app/*", "https://linear.app/*"],

  "background": {
    "service_worker": "src/background/index.ts",
    "type": "module"
  },

  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["src/content/index.ts"],
      "run_at": "document_idle"
    }
  ],

  "action": {
    "default_popup": "src/popup/index.html",
    "default_icon": {
      "16": "assets/icons/16.png",
      "48": "assets/icons/48.png",
      "128": "assets/icons/128.png"
    }
  },

  "commands": {
    "activate": {
      "suggested_key": {
        "default": "Ctrl+Shift+F",
        "mac": "Command+Shift+F"
      },
      "description": "Activate element picker"
    }
  }
}
```

## Verification

1. **Build**: `pnpm build` completes without errors
2. **Load**: Extension loads in chrome://extensions (developer mode)
3. **Activate**: Cmd+Shift+F activates element picker
4. **Highlight**: Hovering elements shows highlight overlay
5. **Select**: Clicking element opens annotation popup
6. **Auth**: Linear OAuth flow completes successfully
7. **Submit**: Creates Linear ticket with:
   - Title from feedback
   - Screenshot embedded
   - Element selector in description
   - Correct team/project
8. **Notification**: Toast shows with link to created ticket

## Future Enhancements (Out of Scope)

- Firefox support
- GitHub Issues integration
- Team collaboration features
- Annotation history
- MCP server for agent integration

## Research Notes

### Why Not Agentation?

- PolyForm Shield license prohibits competing tools
- Doesn't capture screenshots
- Designed for dev mode (`NODE_ENV=development`), not staging builds
- No direct Linear integration

### Existing Tools Reviewed

- **BugHerd** - Expensive, outdated UI, limited integrations
- **Marker.io** - No duplicate detection, client portal friction
- **Userback** - Better but still per-seat pricing issues

### Key Differentiators

1. Screenshots captured at annotation time (not server-side)
2. Direct Linear integration (not just webhooks)
3. Schema compatible with Agentation (future interop possible)
4. Works on any URL without code changes
