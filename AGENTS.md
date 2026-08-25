# AGENTS.md

## Project Overview

JSON/JSON5 Editor — a Windows desktop application for visually editing JSON/JSON5 files with **lossless round-trip** (preserves comments, trailing commas, quote style). Built with Electron + React + TypeScript.

## Tech Stack

- **Runtime**: Electron ^28.0.0
- **UI**: React ^18.2.0, TypeScript ^5.3.0 (strict mode)
- **Build**: Vite ^5.0.0
- **State**: Zustand ^4.4.0
- **Parser**: @croct/json5-parser ^0.2.2 (comment-preserving)
- **Testing**: Vitest ^4.0.18
- **Packaging**: electron-builder ^24.9.0 (NSIS for Windows)

## Commands

| Action | Command |
|--------|---------|
| Install | `npm install` |
| Dev (Vite + Electron) | `npm run electron:dev` |
| Dev (Vite only) | `npm run dev` |
| Build | `npm run build` |
| Build + Package | `npm run electron:build` |
| Test all | `npm run test` |
| Test watch | `npm run test:watch` |
| Type check | `npm run typecheck` |
| Lint | `npm run lint` |

## Project Structure

```
json-editor/
├── electron/                    # Electron main process
│   ├── main.ts                  # App entry: window, menu, IPC registration
│   ├── preload.ts               # contextBridge: exposes electronAPI
│   └── ipc/
│       ├── index.ts             # registerIpcHandlers()
│       └── fileHandlers.ts      # File I/O: open/save/autosave/version/recent
│
├── src/                         # Renderer process (React)
│   ├── types/                   # TypeScript type definitions
│   │   ├── treeModel.ts         # TreeNode, TreeState, PathSegment
│   │   ├── document.ts          # Document, ParseError, ParseStatus
│   │   └── ipc.ts               # ElectronAPI interface + Window augmentation
│   ├── store/                   # Zustand state management (TWO stores)
│   │   ├── documentStore.ts     # Document state + undo/redo (zundo) + IPC calls
│   │   └── treeStore.ts         # Tree state: expand/collapse/search/selection
│   │   # uiStore.ts has been removed as dead code (see Architecture Notes below).
│   ├── core/                    # Business logic (framework-agnostic, pure functions)
│   │   ├── parser/              # JSON5 parsing, serialization, AST operations
│   │   ├── treeModel/           # Tree conversion, path utils, state operations
│   │   ├── diff/                # Path-level + text-level diff
│   │   └── validation/          # Empty/duplicate key detection
│   ├── hooks/                   # React hooks
│   │   ├── useIPC.ts            # Menu event listeners (graceful fallback when no Electron)
│   │   ├── useFileOperations.ts # File ops hook (open/save/autosave/version/recent)
│   │   ├── useAutosave.ts       # 5s debounce .tmp autosave + recovery hook
│   │   └── useClipboardPaste.ts # Global paste handler for JSON content
│   ├── components/              # React UI components
│   │   ├── TreeView/            # Tree navigation with search
│   │   ├── FormEditor/          # Node info + add/delete/move for object/array, value editor
│   │   ├── Toolbar/             # Open/Recent/Save/SaveAs/Undo/Redo + Version/Settings
│   │   ├── StatusBar/           # File path, encoding, modified indicator, parse status
│   │   ├── RawPreview/          # Read-only raw content preview
│   │   ├── DiffPreview/         # Save-time path-change + text-diff modal
│   │   ├── VersionHistory/      # Version list, preview, rollback
│   │   ├── RecoveryDialog/      # Crash-recovery dialog (.tmp autosave)
│   │   ├── DropZone/            # Drag-and-drop file open
│   │   └── ParseError/          # Parse error display
│   │   # ModifyDemo/ has been removed as it was never mounted (see Architecture Notes below).
│   └── styles/                  # CSS custom properties + global styles
│
├── scripts/
│   └── lint.mjs                 # Zero-dep custom linter (no console.log in src, no any)
│
├── tests/                       # Vitest tests (node environment)
├── JSON-JSON5编辑器PRD.md        # Product requirements document (Chinese)
└── package.json
```

## Code Style

### Imports

Use **relative paths** (not `@/` alias). Separate `import type` from value imports. CSS imports last.

```typescript
// ✅ Preferred
import React, { useEffect, useCallback } from 'react';
import type { TreeNode, TreeState } from '../../types/treeModel';
import { useDocumentStore } from '../../store/documentStore';
import './TreeView.css';

// ❌ Avoid
import { useDocumentStore } from '@/store/documentStore';
```

### Components

Functional `React.FC`, default export, early returns for loading/error/idle states, co-located CSS.

```typescript
import React from 'react';
import { useDocumentStore } from '../../store/documentStore';
import './ComponentName.css';

const ComponentName: React.FC = () => {
  const { document, parseStatus } = useDocumentStore();
  
  if (parseStatus === 'idle' || !document) {
    return <div className="component-name">...</div>;
  }
  
  return (
    <div className="component-name">
      ...
    </div>
  );
};

export default ComponentName;
```

### Zustand Stores

Interface defined above `create` call. Export as `use{Name}Store`. Use `get()` for current state in actions.

```typescript
import { create } from 'zustand';

interface MyStore {
  data: SomeType | null;
  status: 'idle' | 'loading' | 'success' | 'error';
  setData: (data: SomeType) => void;
}

export const useMyStore = create<MyStore>((set, get) => ({
  data: null,
  status: 'idle',
  setData: (data) => set({ data }),
}));
```

### Error Handling

Use try/catch with `String(error)` for store state. Return discriminated union results for parse operations (never throw).

```typescript
// In stores
try {
  // operation
} catch (error) {
  set({ error: String(error) });
}

// For parse results
export interface ParseSuccessResult { success: true; node: CroctJsonNode; }
export interface ParseFailureResult { success: false; error: ParseError; }
export type ParseResult = ParseSuccessResult | ParseFailureResult;
```

### Naming Conventions

| Category | Convention | Example |
|----------|-----------|---------|
| Components | PascalCase | `TreeNodeItem`, `FormEditor` |
| Hooks | camelCase, `use` prefix | `useDocumentStore`, `useFileOperations` |
| Interfaces | PascalCase | `TreeNode`, `Document` |
| Functions | camelCase | `parseJson5`, `convertToTreeModel` |
| Constants | UPPER_SNAKE_CASE | `PREVIEW_MAX_LENGTH` |
| CSS classes | kebab-case | `tree-node`, `form-editor` |
| Event handlers | `handle` prefix | `handleClick`, `handleSave` |

### CSS

- Plain CSS files co-located with components (no CSS-in-JS, no Tailwind)
- CSS custom properties in `src/styles/variables.css` (design tokens)
- Global styles in `src/styles/index.css`
- Component CSS imported in component file: `import './TreeView.css'`

## Testing

- **Framework**: Vitest (globals enabled, but import explicitly)
- **Location**: `tests/` directory (not `__tests__` inside `src/`)
- **Naming**: `{feature}.test.ts` (e.g., `treeModel.test.ts`, `parse-success.test.ts`)
- **Environment**: node (no DOM testing currently)

```typescript
import { describe, it, expect } from 'vitest';
import { functionToTest } from '../src/core/module';

describe('Feature Name', () => {
  describe('T{id}: Description', () => {
    it('should do something specific', () => {
      const result = functionToTest(input);
      expect(result).toBe(expected);
    });
  });
});
```

**Test descriptions**: Chinese for feature tests, English for unit tests.

**Critical test files** (must pass for any parser/serializer changes):
- `comment-preserved.test.ts` — Lossless round-trip validation
- `set-writeback.test.ts` — Set value + re-serialize validation

## Electron IPC

- **Security**: `contextIsolation: true`, `nodeIntegration: false`
- **Preload**: Exposes `window.electronAPI` via `contextBridge`
- **Channels**: `namespace:action` (e.g., `file:open`, `menu:save`, `autosave:write`)
- **Type safety**: `ElectronAPI` interface in `src/types/ipc.ts` + `declare global { interface Window { electronAPI: ElectronAPI } }`

## Language

- **UI strings**: Chinese (Simplified) — all user-facing text must be in Chinese
- **Code**: English — variable names, function names, comments
- **Error messages in stores**: Chinese (e.g., `'保存失败'`)

## Boundaries

**Always do:**
- Run `npm run test` before committing
- Run `npm run typecheck` before committing
- Use `import type` for type-only imports
- Use relative imports (not `@/` alias)
- Keep `src/core/` functions pure and framework-agnostic
- Preserve lossless round-trip (comments, trailing commas, quote style)

**Ask first:**
- Changes to IPC channel structure
- Modifications to parser/serializer core logic
- New dependencies

**Never do:**
- Use `any` type in TypeScript
- Use `@ts-ignore` or `@ts-expect-error`
- Import Electron modules in renderer code (use `window.electronAPI`)
- Add side effects to `src/core/` functions
- Delete or skip failing tests
- Commit `.env` files or secrets
- Use CSS-in-JS or Tailwind (project uses plain CSS)

## Architecture Notes

**Dual TypeScript Configs:**
- `tsconfig.json` — Renderer: ES2020 modules, JSX react-jsx, bundler resolution
- `tsconfig.node.json` — Electron main: CommonJS, node resolution, composite build

**Path System:**
- JSON Pointer-style paths: `/a/b/0/c` (slash-separated, integers for array indices)
- Special character escaping: `~0` for `~`, `~1` for `/` (RFC 6901 style)
- `TreeNodeCache` for O(1) path lookups

**State Management:**
- Two Zustand stores with a clear separation of concerns:
  - `documentStore` (in `src/store/documentStore.ts`) — owns the current `Document`, parse status,
    diff-preview state, undo/redo history (via `zundo`), and document-mutation actions
    (open, save, updateNodeValue, addField/deleteField/addArrayItem/deleteArrayItem/moveArrayItem,
    exportNodeFragment). It directly calls `window.electronAPI.*` for file and version operations.
  - `treeStore` (in `src/store/treeStore.ts`) — owns the derived `TreeNode` root plus
    expand/collapse, selection, and search-match state. It does not touch the file system.
- A third historical file (`src/store/uiStore.ts`) was removed because none of its declared
  fields (`sidebarWidth`, `isSearchVisible`, `searchQuery`, `selectedNodeId`) were ever read or
  written by any UI component. If a future feature needs UI preferences (resizable sidebar,
  search-visibility toggle, last-selected-node memory), recreate this store **with concrete
  consumers wired in from day one** so it does not become dead code again.
- Complex state operations are extracted to pure functions in `core/treeModel/operations.ts`.

**Version History (auto-snapshot on save):**
- The PRD's V1 "保存文件 → 创建版本记录" requirement is implemented. Every successful
  `file:save` and `file:saveAs` (where the source file already existed) takes a snapshot of
  the pre-save `originalContent` and writes it under `<file>.versions/YYYYMMDD-HHmmss-mmm.json5`.
- `handleVersionCreate` validates that the target is a regular file, writes atomically via
  `.tmp` + `rename`, and prunes the oldest entries so no more than `MAX_VERSIONS = 20` are
  retained. Tests in `tests/version-create.test.ts` cover creation, extension preservation,
  missing-file rejection, and pruning.

**Recent Files UI:**
- The `file:getRecent` and `file:openByPath` IPC channels (registered in
  `electron/ipc/index.ts` and exposed via preload) are surfaced by a "最近" dropdown in
  `Toolbar/index.tsx`. The dropdown auto-refreshes on document load/save and supports
  click-outside-to-close.

**Lint script:**
- `npm run lint` runs `scripts/lint.mjs`, a zero-dependency custom linter that enforces:
  - No `: any` / `as any` in TypeScript source (except `tests/`).
  - No `console.log` inside `src/`.
- `npm run lint:eslint` is the aspirational target (full `eslint:recommended` +
  `@typescript-eslint` + `react-hooks`); the npm packages are not installed yet. The
  migration path is documented in `scripts/lint.mjs`.

**Keyboard shortcuts:**
- In Electron mode, `Ctrl+Z` / `Ctrl+Y` are handled by the application menu accelerator
  (`electron/main.ts`) which forwards them to the renderer via the `menu:undo` / `menu:redo`
  IPC channels. The renderer's global `keydown` handler in `App.tsx` is **gated** on
  `window.electronAPI.menu` being absent: in Electron mode it stays dormant to avoid
  double-firing undo/redo. In pure browser mode (no Electron menu) it takes over.
