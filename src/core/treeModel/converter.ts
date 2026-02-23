import type { JsonNode } from '@croct/json5-parser';
import { JsonObjectNode } from '@croct/json5-parser';
import { JsonArrayNode } from '@croct/json5-parser';
import { JsonPrimitiveNode } from '@croct/json5-parser';
import { JsonIdentifierNode } from '@croct/json5-parser';
import type { TreeNode, TreeNodeKind } from '../../types/treeModel';
import { PREVIEW_MAX_LENGTH } from '../../types/treeModel';
import { buildPath, formatKey } from './pathUtils';

function getNodeType(node: JsonNode): TreeNodeKind {
  if (node instanceof JsonObjectNode) {
    return 'object';
  }
  if (node instanceof JsonArrayNode) {
    return 'array';
  }
  if (node instanceof JsonPrimitiveNode) {
    const tokenType = node.token.type;
    switch (tokenType) {
      case 'STRING':
        return 'string';
      case 'NUMBER':
        return 'number';
      case 'BOOLEAN':
        return 'boolean';
      case 'NULL':
        return 'null';
      default:
        return 'null';
    }
  }
  if (node instanceof JsonIdentifierNode) {
    return 'string';
  }
  return 'null';
}

function generatePreviewText(node: JsonNode, kind: TreeNodeKind): string {
  switch (kind) {
    case 'object': {
      const objNode = node as JsonObjectNode;
      const count = objNode.properties.length;
      return `{${count}}`;
    }
    case 'array': {
      const arrNode = node as JsonArrayNode;
      const count = arrNode.elements.length;
      return `[${count}]`;
    }
    case 'string': {
      let strValue: string;
      if (node instanceof JsonPrimitiveNode) {
        strValue = node.value as string;
      } else if (node instanceof JsonIdentifierNode) {
        strValue = node.toJSON();
      } else {
        strValue = String(node);
      }
      const truncated = strValue.length > PREVIEW_MAX_LENGTH
        ? strValue.substring(0, PREVIEW_MAX_LENGTH) + '...'
        : strValue;
      return `"${truncated}"`;
    }
    case 'number': {
      if (node instanceof JsonPrimitiveNode) {
        return String(node.value);
      }
      return String(node);
    }
    case 'boolean': {
      if (node instanceof JsonPrimitiveNode) {
        return String(node.value);
      }
      return String(node);
    }
    case 'null': {
      return 'null';
    }
    default:
      return '';
  }
}

function getPropertyKey(key: JsonIdentifierNode | { value: string }): string {
  if (key instanceof JsonIdentifierNode) {
    return key.toJSON();
  }
  return key.value;
}

function processChildren(
  jsonNode: JsonNode,
  parentPath: string,
  children: TreeNode[]
): void {
  if (jsonNode instanceof JsonObjectNode) {
    for (const property of jsonNode.properties) {
      const propertyKey = getPropertyKey(property.key as JsonIdentifierNode | { value: string });
      const childNode = convertNode(
        property.value,
        parentPath,
        propertyKey,
        false
      );
      children.push(childNode);
    }
  } else if (jsonNode instanceof JsonArrayNode) {
    jsonNode.elements.forEach((element, index) => {
      const childNode = convertNode(
        element,
        parentPath,
        String(index),
        true
      );
      children.push(childNode);
    });
  }
}

function convertNode(
  jsonNode: JsonNode,
  parentPath: string,
  key: string,
  isIndex: boolean
): TreeNode {
  const kind = getNodeType(jsonNode);
  const path = buildPath(parentPath, isIndex ? parseInt(key, 10) : key);
  const displayKey = formatKey(key, isIndex);
  const previewText = generatePreviewText(jsonNode, kind);
  
  const children: TreeNode[] = [];
  processChildren(jsonNode, path, children);
  
  return {
    path,
    key: displayKey,
    kind,
    children,
    previewText,
  };
}

export function convertToTreeModel(jsonNode: JsonNode | null): TreeNode | null {
  if (!jsonNode) {
    return null;
  }
  
  const kind = getNodeType(jsonNode);
  const previewText = generatePreviewText(jsonNode, kind);
  
  const children: TreeNode[] = [];
  processChildren(jsonNode, '', children);
  
  return {
    path: '',
    key: 'root',
    kind,
    children,
    previewText,
  };
}

export class TreeNodeCache {
  private cache: Map<string, TreeNode> = new Map();
  private root: TreeNode | null = null;

  setRoot(root: TreeNode): void {
    this.root = root;
    this.cache.clear();
    this.buildCache(root);
  }

  private buildCache(node: TreeNode): void {
    this.cache.set(node.path, node);
    for (const child of node.children) {
      this.buildCache(child);
    }
  }

  findByPath(path: string): TreeNode | null {
    if (path === '' || path === '/') {
      return this.root;
    }
    return this.cache.get(path) ?? null;
  }

  clear(): void {
    this.cache.clear();
    this.root = null;
  }
}

export function findNodeByPath(root: TreeNode, path: string): TreeNode | null {
  if (path === '' || path === '/') {
    return root;
  }
  
  const segments = path.split('/').filter(Boolean);
  let current: TreeNode = root;
  
  for (const segment of segments) {
    const child = current.children.find(c => {
      const childPath = c.path.split('/').pop();
      return childPath === segment;
    });
    
    if (!child) {
      return null;
    }
    current = child;
  }
  
  return current;
}

export function getAllPaths(node: TreeNode): string[] {
  const paths: string[] = [node.path];
  
  for (const child of node.children) {
    paths.push(...getAllPaths(child));
  }
  
  return paths;
}

export function getAncestorPaths(path: string): string[] {
  if (path === '' || path === '/') {
    return [];
  }
  
  const ancestors: string[] = [];
  const segments = path.split('/').filter(Boolean);
  
  let currentPath = '';
  for (let i = 0; i < segments.length - 1; i++) {
    currentPath += '/' + segments[i];
    ancestors.push(currentPath);
  }
  
  return ancestors;
}

export { getNodeType, generatePreviewText };
