// This module has been removed.
//
// It used to export a Zustand store for UI preferences (sidebarWidth, isSearchVisible,
// searchQuery, selectedNodeId), but none of those fields were read or written by any
// UI component, so the entire store was dead code. AGENTS.md and README.md have been
// updated to describe the actual two-store architecture: `documentStore` and `treeStore`.
//
// If a future feature needs real UI state (e.g. a resizable sidebar, a search-visibility
// toggle, or "remember last selected node"), recreate this store with concrete consumers.
export {};
