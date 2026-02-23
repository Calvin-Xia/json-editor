import { describe, it, expect } from 'vitest';
import { JsonParser } from '@croct/json5-parser';
import { convertToTreeModel, findNodeByPath, searchNodes, getAncestorPaths, TreeNodeCache } from '../src/core/treeModel';
import { buildPath, parsePath, formatKey, escapeKey, unescapeKey } from '../src/core/treeModel/pathUtils';
import { 
  toggleExpand, 
  selectNode, 
  expandToPath, 
  createInitialTreeState,
  expandAll,
  collapseAll,
  computeVisiblePaths
} from '../src/core/treeModel/operations';
import type { TreeNode } from '../src/types/treeModel';

describe('Path Utils', () => {
  describe('buildPath', () => {
    it('should build root path for first key', () => {
      expect(buildPath('', 'name')).toBe('/name');
    });

    it('should build nested path', () => {
      expect(buildPath('/config', 'name')).toBe('/config/name');
    });

    it('should build array index path', () => {
      expect(buildPath('/items', 0)).toBe('/items/0');
    });

    it('should handle deeply nested paths', () => {
      expect(buildPath('/a/b/c', 'd')).toBe('/a/b/c/d');
    });
  });

  describe('parsePath', () => {
    it('should parse empty path', () => {
      expect(parsePath('')).toEqual([]);
    });

    it('should parse single key path', () => {
      expect(parsePath('/name')).toEqual([
        { type: 'key', value: 'name' }
      ]);
    });

    it('should parse array index path', () => {
      expect(parsePath('/items/0')).toEqual([
        { type: 'key', value: 'items' },
        { type: 'index', value: 0 }
      ]);
    });

    it('should parse deeply nested path', () => {
      expect(parsePath('/a/b/0/c')).toEqual([
        { type: 'key', value: 'a' },
        { type: 'key', value: 'b' },
        { type: 'index', value: 0 },
        { type: 'key', value: 'c' }
      ]);
    });
  });

  describe('formatKey', () => {
    it('should format array index with brackets', () => {
      expect(formatKey(0, true)).toBe('[0]');
      expect(formatKey(5, true)).toBe('[5]');
    });

    it('should format object key without brackets', () => {
      expect(formatKey('name', false)).toBe('name');
    });
  });

  describe('escapeKey / unescapeKey', () => {
    it('should escape special characters', () => {
      expect(escapeKey('a/b')).toBe('a~1b');
      expect(escapeKey('a~b')).toBe('a~0b');
    });

    it('should unescape special characters', () => {
      expect(unescapeKey('a~1b')).toBe('a/b');
      expect(unescapeKey('a~0b')).toBe('a~b');
    });

    it('should handle consecutive special characters', () => {
      expect(escapeKey('a//b')).toBe('a~1~1b');
      expect(escapeKey('a~~b')).toBe('a~0~0b');
      expect(escapeKey('a/~b')).toBe('a~1~0b');
    });

    it('should round-trip escape/unescape', () => {
      const keys = ['a/b', 'a~b', 'a//b', 'a~~b', 'normal'];
      for (const key of keys) {
        expect(unescapeKey(escapeKey(key))).toBe(key);
      }
    });

    it('should handle empty string key', () => {
      expect(escapeKey('')).toBe('');
      expect(unescapeKey('')).toBe('');
    });
  });
});

describe('TreeModel Converter', () => {
  describe('T1: Empty Object', () => {
    it('should convert empty object', () => {
      const node = JsonParser.parse('{}');
      const tree = convertToTreeModel(node);
      
      expect(tree).not.toBeNull();
      expect(tree!.kind).toBe('object');
      expect(tree!.path).toBe('');
      expect(tree!.key).toBe('root');
      expect(tree!.children).toHaveLength(0);
      expect(tree!.previewText).toBe('{0}');
    });
  });

  describe('T2: Empty Array', () => {
    it('should convert empty array', () => {
      const node = JsonParser.parse('[]');
      const tree = convertToTreeModel(node);
      
      expect(tree).not.toBeNull();
      expect(tree!.kind).toBe('array');
      expect(tree!.children).toHaveLength(0);
      expect(tree!.previewText).toBe('[0]');
    });
  });

  describe('T3: Single-level Object', () => {
    it('should convert single-level object', () => {
      const node = JsonParser.parse('{"a": 1}');
      const tree = convertToTreeModel(node);
      
      expect(tree).not.toBeNull();
      expect(tree!.kind).toBe('object');
      expect(tree!.children).toHaveLength(1);
      
      const child = tree!.children[0];
      expect(child.key).toBe('a');
      expect(child.kind).toBe('number');
      expect(child.path).toBe('/a');
      expect(child.previewText).toBe('1');
    });
  });

  describe('T4: Single-level Array', () => {
    it('should convert single-level array', () => {
      const node = JsonParser.parse('[1, 2, 3]');
      const tree = convertToTreeModel(node);
      
      expect(tree).not.toBeNull();
      expect(tree!.kind).toBe('array');
      expect(tree!.children).toHaveLength(3);
      
      expect(tree!.children[0].key).toBe('[0]');
      expect(tree!.children[0].kind).toBe('number');
      expect(tree!.children[0].path).toBe('/0');
      
      expect(tree!.children[1].key).toBe('[1]');
      expect(tree!.children[2].key).toBe('[2]');
    });
  });

  describe('T5: Deeply Nested Object', () => {
    it('should convert deeply nested object', () => {
      const node = JsonParser.parse('{"a": {"b": {"c": {"d": 1}}}}');
      const tree = convertToTreeModel(node);
      
      expect(tree).not.toBeNull();
      expect(tree!.kind).toBe('object');
      
      const a = tree!.children[0];
      expect(a.key).toBe('a');
      expect(a.path).toBe('/a');
      expect(a.kind).toBe('object');
      
      const b = a.children[0];
      expect(b.key).toBe('b');
      expect(b.path).toBe('/a/b');
      
      const c = b.children[0];
      expect(c.key).toBe('c');
      expect(c.path).toBe('/a/b/c');
      
      const d = c.children[0];
      expect(d.key).toBe('d');
      expect(d.path).toBe('/a/b/c/d');
      expect(d.kind).toBe('number');
    });
  });

  describe('T6: Deeply Nested Array', () => {
    it('should convert deeply nested array', () => {
      const node = JsonParser.parse('[[[1]]]');
      const tree = convertToTreeModel(node);
      
      expect(tree).not.toBeNull();
      expect(tree!.kind).toBe('array');
      
      const level1 = tree!.children[0];
      expect(level1.key).toBe('[0]');
      expect(level1.path).toBe('/0');
      expect(level1.kind).toBe('array');
      
      const level2 = level1.children[0];
      expect(level2.key).toBe('[0]');
      expect(level2.path).toBe('/0/0');
      
      const level3 = level2.children[0];
      expect(level3.key).toBe('[0]');
      expect(level3.path).toBe('/0/0/0');
      expect(level3.kind).toBe('number');
    });
  });

  describe('T7: Mixed Array', () => {
    it('should convert mixed type array', () => {
      const node = JsonParser.parse('[1, "a", true, null, {}, []]');
      const tree = convertToTreeModel(node);
      
      expect(tree).not.toBeNull();
      expect(tree!.kind).toBe('array');
      expect(tree!.children).toHaveLength(6);
      
      expect(tree!.children[0].kind).toBe('number');
      expect(tree!.children[1].kind).toBe('string');
      expect(tree!.children[2].kind).toBe('boolean');
      expect(tree!.children[3].kind).toBe('null');
      expect(tree!.children[4].kind).toBe('object');
      expect(tree!.children[5].kind).toBe('array');
    });
  });

  describe('T8: Complex Mixed Structure', () => {
    it('should convert complex mixed structure', () => {
      const json = `{
        "name": "test",
        "version": 1.0,
        "enabled": true,
        "config": {
          "host": "localhost",
          "ports": [8080, 8081],
          "nested": {
            "value": null
          }
        },
        "items": [
          {"id": 1, "name": "item1"},
          {"id": 2, "name": "item2"}
        ]
      }`;
      
      const node = JsonParser.parse(json);
      const tree = convertToTreeModel(node);
      
      expect(tree).not.toBeNull();
      expect(tree!.kind).toBe('object');
      expect(tree!.children).toHaveLength(5);
      
      const config = tree!.children.find(c => c.key === 'config');
      expect(config).toBeDefined();
      expect(config!.kind).toBe('object');
      expect(config!.children).toHaveLength(3);
      
      const ports = config!.children.find(c => c.key === 'ports');
      expect(ports).toBeDefined();
      expect(ports!.kind).toBe('array');
      expect(ports!.children).toHaveLength(2);
    });
  });

  describe('T9: Special Character Keys', () => {
    it('should handle special character keys', () => {
      const node = JsonParser.parse('{"a.b": 1, "a/b": 2, "a[0]": 3}');
      const tree = convertToTreeModel(node);
      
      expect(tree).not.toBeNull();
      expect(tree!.children).toHaveLength(3);
      
      const key1 = tree!.children.find(c => c.key === 'a.b');
      expect(key1).toBeDefined();
      expect(key1!.path).toBe('/a.b');
      
      const key2 = tree!.children.find(c => c.key === 'a/b');
      expect(key2).toBeDefined();
      
      const key3 = tree!.children.find(c => c.key === 'a[0]');
      expect(key3).toBeDefined();
    });
  });

  describe('T10: Unicode Keys', () => {
    it('should handle unicode keys', () => {
      const node = JsonParser.parse('{"中文": 1, "日本語": 2}');
      const tree = convertToTreeModel(node);
      
      expect(tree).not.toBeNull();
      expect(tree!.children).toHaveLength(2);
      
      const key1 = tree!.children.find(c => c.key === '中文');
      expect(key1).toBeDefined();
      expect(key1!.kind).toBe('number');
      
      const key2 = tree!.children.find(c => c.key === '日本語');
      expect(key2).toBeDefined();
    });
  });

  describe('T11: Long String Truncation', () => {
    it('should truncate long strings in preview', () => {
      const longString = 'a'.repeat(100);
      const node = JsonParser.parse(`{"text": "${longString}"}`);
      const tree = convertToTreeModel(node);
      
      expect(tree).not.toBeNull();
      const textNode = tree!.children[0];
      expect(textNode.kind).toBe('string');
      expect(textNode.previewText.length).toBeLessThan(100);
      expect(textNode.previewText).toContain('...');
    });
  });

  describe('T12: Boolean and Null Values', () => {
    it('should handle boolean and null values', () => {
      const node = JsonParser.parse('{"active": true, "disabled": false, "empty": null}');
      const tree = convertToTreeModel(node);
      
      expect(tree).not.toBeNull();
      
      const active = tree!.children.find(c => c.key === 'active');
      expect(active!.kind).toBe('boolean');
      expect(active!.previewText).toBe('true');
      
      const disabled = tree!.children.find(c => c.key === 'disabled');
      expect(disabled!.kind).toBe('boolean');
      expect(disabled!.previewText).toBe('false');
      
      const empty = tree!.children.find(c => c.key === 'empty');
      expect(empty!.kind).toBe('null');
      expect(empty!.previewText).toBe('null');
    });
  });

  describe('T13: Large Array Performance', () => {
    it('should handle large array (100+ elements)', () => {
      const elements = Array.from({ length: 150 }, (_, i) => i);
      const node = JsonParser.parse(`[${elements.join(',')}]`);
      const tree = convertToTreeModel(node);
      
      expect(tree).not.toBeNull();
      expect(tree!.kind).toBe('array');
      expect(tree!.children).toHaveLength(150);
      
      expect(tree!.children[0].key).toBe('[0]');
      expect(tree!.children[149].key).toBe('[149]');
    });

    it('should find nodes in large array efficiently', () => {
      const elements = Array.from({ length: 200 }, (_, i) => `"item${i}"`);
      const node = JsonParser.parse(`[${elements.join(',')}]`);
      const tree = convertToTreeModel(node);
      
      const found = findNodeByPath(tree!, '/100');
      expect(found).not.toBeNull();
      expect(found!.key).toBe('[100]');
    });
  });
});

describe('TreeModel Operations', () => {
  describe('findNodeByPath', () => {
    it('should find root node', () => {
      const node = JsonParser.parse('{"a": {"b": 1}}');
      const tree = convertToTreeModel(node);
      
      const found = findNodeByPath(tree!, '');
      expect(found).toBe(tree);
    });

    it('should find nested node', () => {
      const node = JsonParser.parse('{"a": {"b": 1}}');
      const tree = convertToTreeModel(node);
      
      const found = findNodeByPath(tree!, '/a/b');
      expect(found).toBeDefined();
      expect(found!.key).toBe('b');
    });

    it('should return null for invalid path', () => {
      const node = JsonParser.parse('{"a": 1}');
      const tree = convertToTreeModel(node);
      
      const found = findNodeByPath(tree!, '/invalid');
      expect(found).toBeNull();
    });
  });

  describe('searchNodes', () => {
    it('should find nodes by key', () => {
      const node = JsonParser.parse('{"name": "test", "nested": {"name": "inner"}}');
      const tree = convertToTreeModel(node);
      
      const matched = searchNodes(tree, 'name');
      expect(matched.size).toBe(2);
    });

    it('should find nodes by path', () => {
      const node = JsonParser.parse('{"a": {"b": {"c": 1}}}');
      const tree = convertToTreeModel(node);
      
      const matched = searchNodes(tree, '/a/b');
      expect(matched.size).toBeGreaterThan(0);
    });

    it('should return empty set for no matches', () => {
      const node = JsonParser.parse('{"a": 1}');
      const tree = convertToTreeModel(node);
      
      const matched = searchNodes(tree, 'nonexistent');
      expect(matched.size).toBe(0);
    });
  });

  describe('getAncestorPaths', () => {
    it('should return empty for root path', () => {
      expect(getAncestorPaths('')).toEqual([]);
    });

    it('should return ancestor paths', () => {
      const ancestors = getAncestorPaths('/a/b/c');
      expect(ancestors).toEqual(['/a', '/a/b']);
    });
  });

  describe('toggleExpand', () => {
    it('should toggle expand state', () => {
      const state = createInitialTreeState();
      
      const expanded = toggleExpand(state, '/a');
      expect(expanded.expandedPaths.has('/a')).toBe(true);
      
      const collapsed = toggleExpand(expanded, '/a');
      expect(collapsed.expandedPaths.has('/a')).toBe(false);
    });
  });

  describe('selectNode', () => {
    it('should select node', () => {
      const state = createInitialTreeState();
      
      const selected = selectNode(state, '/a/b');
      expect(selected.selectedPath).toBe('/a/b');
    });
  });

  describe('expandToPath', () => {
    it('should expand all ancestors', () => {
      const state = createInitialTreeState();
      
      const expanded = expandToPath(state, '/a/b/c');
      expect(expanded.expandedPaths.has('/a')).toBe(true);
      expect(expanded.expandedPaths.has('/a/b')).toBe(true);
    });
  });

  describe('expandAll / collapseAll', () => {
    it('should expand all nodes', () => {
      const node = JsonParser.parse('{"a": {"b": 1}, "c": [1, 2]}');
      const tree = convertToTreeModel(node);
      const state = createInitialTreeState();
      
      const expanded = expandAll(state, tree);
      expect(expanded.expandedPaths.size).toBeGreaterThan(0);
    });

    it('should collapse all nodes', () => {
      const state = createInitialTreeState();
      state.expandedPaths.add('/a');
      state.expandedPaths.add('/b');
      
      const collapsed = collapseAll(state);
      expect(collapsed.expandedPaths.size).toBe(0);
    });
  });

  describe('computeVisiblePaths', () => {
    it('should compute visible paths including ancestors', () => {
      const matchedPaths = new Set(['/a/b/c', '/x/y']);
      const visiblePaths = computeVisiblePaths(matchedPaths);
      
      expect(visiblePaths.has('/a/b/c')).toBe(true);
      expect(visiblePaths.has('/a/b')).toBe(true);
      expect(visiblePaths.has('/a')).toBe(true);
      expect(visiblePaths.has('/x/y')).toBe(true);
      expect(visiblePaths.has('/x')).toBe(true);
    });

    it('should return empty set for empty input', () => {
      const visiblePaths = computeVisiblePaths(new Set());
      expect(visiblePaths.size).toBe(0);
    });
  });

  describe('Concurrent Operations', () => {
    it('should handle multiple expand operations', () => {
      let state = createInitialTreeState();
      
      state = toggleExpand(state, '/a');
      state = toggleExpand(state, '/b');
      state = toggleExpand(state, '/c');
      
      expect(state.expandedPaths.has('/a')).toBe(true);
      expect(state.expandedPaths.has('/b')).toBe(true);
      expect(state.expandedPaths.has('/c')).toBe(true);
    });

    it('should handle mixed operations', () => {
      let state = createInitialTreeState();
      
      state = toggleExpand(state, '/a');
      state = selectNode(state, '/a/b');
      state = toggleExpand(state, '/a/b');
      state = toggleExpand(state, '/a'); 
      
      expect(state.expandedPaths.has('/a')).toBe(false);
      expect(state.expandedPaths.has('/a/b')).toBe(true);
      expect(state.selectedPath).toBe('/a/b');
    });
  });
});

describe('TreeNodeCache', () => {
  it('should cache and find nodes by path', () => {
    const node = JsonParser.parse('{"a": {"b": {"c": 1}}}');
    const tree = convertToTreeModel(node);
    
    const cache = new TreeNodeCache();
    cache.setRoot(tree!);
    
    expect(cache.findByPath('')).toBe(tree);
    expect(cache.findByPath('/a')).not.toBeNull();
    expect(cache.findByPath('/a/b')).not.toBeNull();
    expect(cache.findByPath('/a/b/c')).not.toBeNull();
  });

  it('should return null for non-existent paths', () => {
    const node = JsonParser.parse('{"a": 1}');
    const tree = convertToTreeModel(node);
    
    const cache = new TreeNodeCache();
    cache.setRoot(tree!);
    
    expect(cache.findByPath('/nonexistent')).toBeNull();
  });

  it('should clear cache', () => {
    const node = JsonParser.parse('{"a": 1}');
    const tree = convertToTreeModel(node);
    
    const cache = new TreeNodeCache();
    cache.setRoot(tree!);
    
    cache.clear();
    
    expect(cache.findByPath('')).toBeNull();
    expect(cache.findByPath('/a')).toBeNull();
  });
});
