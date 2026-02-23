import type { PathSegment } from '../../types/treeModel';

export function buildPath(parentPath: string, key: string | number): string {
  if (typeof key === 'number') {
    return parentPath === '' ? `/${key}` : `${parentPath}/${key}`;
  }
  return parentPath === '' ? `/${escapeKey(key)}` : `${parentPath}/${escapeKey(key)}`;
}

export function parsePath(path: string): PathSegment[] {
  if (path === '' || path === '/') {
    return [];
  }

  const segments: PathSegment[] = [];
  const parts = path.split('/').filter(Boolean);

  for (const part of parts) {
    const unescaped = unescapeKey(part);
    const index = parseInt(unescaped, 10);
    
    if (!isNaN(index) && String(index) === unescaped) {
      segments.push({ type: 'index', value: index });
    } else {
      segments.push({ type: 'key', value: unescaped });
    }
  }

  return segments;
}

export function formatKey(key: string | number, isIndex: boolean): string {
  if (isIndex || typeof key === 'number') {
    return `[${key}]`;
  }
  return String(key);
}

export function escapeKey(key: string): string {
  return key.replace(/~/g, '~0').replace(/\//g, '~1');
}

export function unescapeKey(key: string): string {
  return key.replace(/~1/g, '/').replace(/~0/g, '~');
}

export function getParentPath(path: string): string {
  if (path === '' || path === '/') {
    return '';
  }
  const lastSlash = path.lastIndexOf('/');
  if (lastSlash <= 0) {
    return '';
  }
  return path.substring(0, lastSlash);
}

export function getLastSegment(path: string): string {
  if (path === '' || path === '/') {
    return '';
  }
  const lastSlash = path.lastIndexOf('/');
  return unescapeKey(path.substring(lastSlash + 1));
}

export function isAncestorOf(ancestorPath: string, descendantPath: string): boolean {
  if (ancestorPath === '') {
    return descendantPath !== '';
  }
  return descendantPath.startsWith(ancestorPath + '/');
}

export function isDescendantOf(descendantPath: string, ancestorPath: string): boolean {
  return isAncestorOf(ancestorPath, descendantPath);
}
