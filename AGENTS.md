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
│       └── fileHandlers.ts      # File I/O: open/save/autosave/version
│
├── src/                         # Renderer process (React)
│   ├── types/                   # TypeScript type definitions
│   │   ├── treeModel.ts         # TreeNode, TreeState, PathSegment
│   │   ├── document.ts          # Document, JSONNode, ParseError
│   │   └── ipc.ts               # ElectronAPI interface + Window augmentation
│   ├── store/                   # Zustand state management
│   │   ├── documentStore.ts     # Document state: open/save/parse/updateNodeValue
│   │   ├── treeStore.ts         # Tree state: expand/collapse/search/selection
│   │   └── uiStore.ts           # UI state: sidebar width, search visibility
│   ├── core/                    # Business logic (framework-agnostic, pure functions)
│   │   ├── parser/              # JSON5 parsing and serialization
│   │   └── treeModel/           # Tree conversion, path utils, state operations
│   ├── hooks/                   # React hooks
│   │   ├── useIPC.ts            # Menu event listeners
│   │   └── useFileOperations.ts # File ops hook
│   ├── components/              # React UI components
│   │   ├── TreeView/            # Tree navigation with search
│   │   ├── FormEditor/          # Node info display (WIP)
│   │   ├── Toolbar/             # Open/Save/Undo/Redo buttons
│   │   ├── StatusBar/           # File path, encoding, parse status
│   │   ├── RawPreview/          # Read-only raw content preview
│   │   ├── ModifyDemo/          # Demo: modify node value by key
│   │   └── ParseError/          # Parse error display
│   └── styles/                  # CSS custom properties + global styles
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
- Three separate Zustand stores (no combined root store)
- Stores call `window.electronAPI` directly for file operations
- Complex state operations extracted to pure functions in `core/treeModel/operations.ts`
