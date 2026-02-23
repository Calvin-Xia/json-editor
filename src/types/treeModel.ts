export type TreeNodeKind = 'object' | 'array' | 'string' | 'number' | 'boolean' | 'null';

export interface TreeNode {
  path: string;
  key: string;
  kind: TreeNodeKind;
  children: TreeNode[];
  previewText: string;
}

export interface TreeState {
  expandedPaths: Set<string>;
  selectedPath: string | null;
  searchQuery: string;
  matchedPaths: Set<string>;
}

export interface PathSegment {
  type: 'key' | 'index';
  value: string | number;
}

export const PREVIEW_MAX_LENGTH = 50;
