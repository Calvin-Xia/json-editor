import * as Diff from 'diff';
import { parseJson5, serializeNode } from '../parser';

export interface PathChange {
  path: string;
  type: 'added' | 'removed' | 'modified';
  oldValue?: unknown;
  newValue?: unknown;
}

function parseContent(content: string): unknown | null {
  try {
    return JSON.parse(content);
  } catch {
    // Try JSON5 parsing for content with comments/trailing commas
    const result = parseJson5(content);
    if (result.success) {
      const serialized = serializeNode(result.node);
      return JSON.parse(serialized);
    }
    return null;
  }
}

export function computePathChanges(oldContent: string, newContent: string): PathChange[] {
  const oldObj = parseContent(oldContent);
  if (oldObj === null) return [];

  const newObj = parseContent(newContent);
  if (newObj === null) return [];

  const changes: PathChange[] = [];
  diffRecursive(oldObj, newObj, '', changes);
  return changes;
}

export function computeTextDiff(oldContent: string, newContent: string): Diff.Change[] {
  return Diff.diffLines(oldContent, newContent);
}

function diffRecursive(
  oldVal: unknown,
  newVal: unknown,
  basePath: string,
  changes: PathChange[],
): void {
  if (isObject(oldVal) && isObject(newVal)) {
    const oldKeys = Object.keys(oldVal);
    const newKeys = Object.keys(newVal);
    const allKeys = new Set([...oldKeys, ...newKeys]);

    for (const key of allKeys) {
      const path = `${basePath}/${escapeKey(key)}`;
      const inOld = key in oldVal;
      const inNew = key in newVal;

      if (inOld && !inNew) {
        changes.push({ path, type: 'removed', oldValue: oldVal[key] });
      } else if (!inOld && inNew) {
        changes.push({ path, type: 'added', newValue: newVal[key] });
      } else {
        diffRecursive(oldVal[key], newVal[key], path, changes);
      }
    }
    return;
  }

  if (Array.isArray(oldVal) && Array.isArray(newVal)) {
    const minLen = Math.min(oldVal.length, newVal.length);
    const hasCommonPrefix = minLen > 0 && deepEqual(oldVal[0], newVal[0]);

    if (!hasCommonPrefix && oldVal.length !== newVal.length) {
      changes.push({ path: basePath, type: 'modified', oldValue: oldVal, newValue: newVal });
      return;
    }

    const maxLen = Math.max(oldVal.length, newVal.length);

    for (let i = 0; i < maxLen; i++) {
      const path = `${basePath}/${i}`;

      if (i >= oldVal.length) {
        changes.push({ path, type: 'added', newValue: newVal[i] });
      } else if (i >= newVal.length) {
        changes.push({ path, type: 'removed', oldValue: oldVal[i] });
      } else {
        diffRecursive(oldVal[i], newVal[i], path, changes);
      }
    }
    return;
  }

  if (!deepEqual(oldVal, newVal)) {
    changes.push({ path: basePath, type: 'modified', oldValue: oldVal, newValue: newVal });
  }
}

function isObject(val: unknown): val is Record<string, unknown> {
  return typeof val === 'object' && val !== null && !Array.isArray(val);
}

function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a === null || b === null) return false;
  if (typeof a !== typeof b) return false;
  if (typeof a !== 'object') return false;

  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    return a.every((item, i) => deepEqual(item, b[i]));
  }

  if (isObject(a) && isObject(b)) {
    const aKeys = Object.keys(a);
    const bKeys = Object.keys(b);
    if (aKeys.length !== bKeys.length) return false;
    return aKeys.every((key) => key in b && deepEqual(a[key], b[key]));
  }

  return false;
}

function escapeKey(key: string): string {
  return key.replace(/~/g, '~0').replace(/\//g, '~1');
}
