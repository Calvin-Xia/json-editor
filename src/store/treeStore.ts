import { create } from 'zustand';
import type { TreeNode, TreeState } from '../types/treeModel';
import { 
  convertToTreeModel, 
  searchNodes, 
  TreeNodeCache,
  toggleExpand,
  selectNode,
  expandToPath,
  expandAll,
  collapseAll,
  expandToMatchedPaths,
  computeVisiblePaths
} from '../core/treeModel';
import type { JsonNode } from '@croct/json5-parser';

interface TreeStore extends TreeState {
  treeRoot: TreeNode | null;
  visiblePaths: Set<string>;
  
  setTreeRoot: (node: JsonNode | null) => void;
  toggleNodeExpand: (path: string) => void;
  selectTreeNode: (path: string) => void;
  setSearchQuery: (query: string) => void;
  expandToNode: (path: string) => void;
  expandAllNodes: () => void;
  collapseAllNodes: () => void;
  getSelectedNode: () => TreeNode | null;
}

const nodeCache = new TreeNodeCache();

export const useTreeStore = create<TreeStore>((set, get) => ({
  treeRoot: null,
  expandedPaths: new Set(),
  selectedPath: null,
  searchQuery: '',
  matchedPaths: new Set(),
  visiblePaths: new Set(),

  setTreeRoot: (node) => {
    const treeRoot = convertToTreeModel(node);
    if (treeRoot) {
      nodeCache.setRoot(treeRoot);
    } else {
      nodeCache.clear();
    }
    set({ 
      treeRoot,
      expandedPaths: new Set(),
      selectedPath: null,
      searchQuery: '',
      matchedPaths: new Set(),
      visiblePaths: new Set()
    });
  },

  toggleNodeExpand: (path) => {
    set((state) => toggleExpand(state, path));
  },

  selectTreeNode: (path) => {
    set((state) => selectNode(state, path));
  },

  setSearchQuery: (query) => {
    const { treeRoot } = get();
    if (!treeRoot) {
      set({ searchQuery: query, matchedPaths: new Set(), visiblePaths: new Set() });
      return;
    }
    
    const matchedPaths = searchNodes(treeRoot, query);
    
    if (query.trim()) {
      const visiblePaths = computeVisiblePaths(matchedPaths);
      set((state) => ({
        searchQuery: query, 
        matchedPaths,
        visiblePaths,
        expandedPaths: expandToMatchedPaths(state, matchedPaths).expandedPaths
      }));
    } else {
      set({ searchQuery: query, matchedPaths: new Set(), visiblePaths: new Set() });
    }
  },

  expandToNode: (path) => {
    set((state) => expandToPath(state, path));
  },

  expandAllNodes: () => {
    const { treeRoot } = get();
    set((state) => expandAll(state, treeRoot));
  },

  collapseAllNodes: () => {
    set(collapseAll);
  },

  getSelectedNode: () => {
    const { selectedPath } = get();
    if (selectedPath === null) return null;
    return nodeCache.findByPath(selectedPath);
  },
}));

export { nodeCache };
