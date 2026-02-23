import type { TreeNode, TreeState } from '../../types/treeModel';
import { getAllPaths, getAncestorPaths } from './converter';

export function toggleExpand(
  state: TreeState,
  path: string
): TreeState {
  const newExpanded = new Set(state.expandedPaths);
  
  if (newExpanded.has(path)) {
    newExpanded.delete(path);
  } else {
    newExpanded.add(path);
  }
  
  return {
    ...state,
    expandedPaths: newExpanded,
  };
}

export function selectNode(
  state: TreeState,
  path: string
): TreeState {
  return {
    ...state,
    selectedPath: path,
  };
}

export function expandToPath(
  state: TreeState,
  path: string
): TreeState {
  const ancestors = getAncestorPaths(path);
  const newExpanded = new Set(state.expandedPaths);
  
  for (const ancestor of ancestors) {
    newExpanded.add(ancestor);
  }
  
  return {
    ...state,
    expandedPaths: newExpanded,
  };
}

export function searchNodes(
  root: TreeNode | null,
  query: string
): Set<string> {
  if (!root || !query.trim()) {
    return new Set();
  }
  
  const normalizedQuery = query.toLowerCase().trim();
  const matchedPaths = new Set<string>();
  
  function searchNode(node: TreeNode): void {
    const keyMatch = node.key.toLowerCase().includes(normalizedQuery);
    const pathMatch = node.path.toLowerCase().includes(normalizedQuery);
    
    if (keyMatch || pathMatch) {
      matchedPaths.add(node.path);
    }
    
    for (const child of node.children) {
      searchNode(child);
    }
  }
  
  searchNode(root);
  return matchedPaths;
}

export function computeVisiblePaths(matchedPaths: Set<string>): Set<string> {
  const visiblePaths = new Set<string>();
  
  for (const matchedPath of matchedPaths) {
    visiblePaths.add(matchedPath);
    const ancestors = getAncestorPaths(matchedPath);
    for (const ancestor of ancestors) {
      visiblePaths.add(ancestor);
    }
  }
  
  return visiblePaths;
}

export function expandToMatchedPaths(
  state: TreeState,
  matchedPaths: Set<string>
): TreeState {
  const newExpanded = new Set(state.expandedPaths);
  
  for (const matchedPath of matchedPaths) {
    const ancestors = getAncestorPaths(matchedPath);
    for (const ancestor of ancestors) {
      newExpanded.add(ancestor);
    }
  }
  
  return {
    ...state,
    expandedPaths: newExpanded,
  };
}

export function collapseAll(state: TreeState): TreeState {
  return {
    ...state,
    expandedPaths: new Set(),
  };
}

export function expandAll(
  state: TreeState,
  root: TreeNode | null
): TreeState {
  if (!root) {
    return state;
  }
  
  const allPaths = getAllPaths(root);
  const newExpanded = new Set(allPaths.filter(p => p !== ''));
  
  return {
    ...state,
    expandedPaths: newExpanded,
  };
}

export function isNodeExpanded(state: TreeState, path: string): boolean {
  return state.expandedPaths.has(path);
}

export function isNodeSelected(state: TreeState, path: string): boolean {
  return state.selectedPath === path;
}

export function isNodeMatched(state: TreeState, path: string): boolean {
  return state.matchedPaths.has(path);
}

export function shouldShowNode(
  visiblePaths: Set<string> | null,
  node: TreeNode
): boolean {
  if (!visiblePaths) {
    return true;
  }
  
  return visiblePaths.has(node.path);
}

export function createInitialTreeState(): TreeState {
  return {
    expandedPaths: new Set(),
    selectedPath: null,
    searchQuery: '',
    matchedPaths: new Set(),
  };
}
