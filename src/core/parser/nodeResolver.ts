import { JsonObjectNode, JsonArrayNode } from '@croct/json5-parser';
import type { JsonNode } from '@croct/json5-parser';
import { parsePath } from '../treeModel/pathUtils';
import { JsonIdentifierNode } from '@croct/json5-parser';

function getPropertyKey(key: JsonIdentifierNode | { value: string }): string {
  if (key instanceof JsonIdentifierNode) {
    return key.toJSON();
  }
  return key.value;
}

export function resolveNodeAtPath(root: JsonNode, path: string): JsonNode | null {
  if (path === '' || path === '/') {
    return root;
  }

  const segments = parsePath(path);
  let current: JsonNode = root;

  for (const segment of segments) {
    if (current instanceof JsonObjectNode && segment.type === 'key') {
      const targetKey = segment.value as string;
      const prop = current.properties.find(
        (p) => getPropertyKey(p.key as JsonIdentifierNode | { value: string }) === targetKey
      );
      if (!prop) {
        return null;
      }
      current = prop.value;
    } else if (current instanceof JsonArrayNode && segment.type === 'index') {
      const index = segment.value as number;
      if (index < 0 || index >= current.elements.length) {
        return null;
      }
      current = current.elements[index];
    } else {
      return null;
    }
  }

  return current;
}
