import { describe, it, expect } from 'vitest';
import { computePathChanges, computeTextDiff } from '../src/core/diff';
import type { PathChange } from '../src/core/diff';

describe('Diff 计算引擎', () => {
  describe('computePathChanges: 新增路径', () => {
    it('应该检测到新增的顶级字段', () => {
      const old = JSON.stringify({ name: 'test' });
      const neu = JSON.stringify({ name: 'test', version: '1.0.0' });

      const changes = computePathChanges(old, neu);

      expect(changes).toContainEqual({
        path: '/version',
        type: 'added',
        newValue: '1.0.0',
      });
    });

    it('应该检测到新增的嵌套字段', () => {
      const old = JSON.stringify({ config: { host: 'localhost' } });
      const neu = JSON.stringify({ config: { host: 'localhost', port: 3000 } });

      const changes = computePathChanges(old, neu);

      expect(changes).toContainEqual({
        path: '/config/port',
        type: 'added',
        newValue: 3000,
      });
    });

    it('应该检测到新增的嵌套对象', () => {
      const old = JSON.stringify({});
      const neu = JSON.stringify({ database: { host: 'localhost', port: 5432 } });

      const changes = computePathChanges(old, neu);

      expect(changes).toContainEqual({
        path: '/database',
        type: 'added',
        newValue: { host: 'localhost', port: 5432 },
      });
    });
  });

  describe('computePathChanges: 修改路径', () => {
    it('应该检测到值的修改并返回新旧值', () => {
      const old = JSON.stringify({ name: 'old-name' });
      const neu = JSON.stringify({ name: 'new-name' });

      const changes = computePathChanges(old, neu);

      expect(changes).toContainEqual({
        path: '/name',
        type: 'modified',
        oldValue: 'old-name',
        newValue: 'new-name',
      });
    });

    it('应该检测到嵌套字段的修改', () => {
      const old = JSON.stringify({ config: { name: 'old' } });
      const neu = JSON.stringify({ config: { name: 'new' } });

      const changes = computePathChanges(old, neu);

      expect(changes).toContainEqual({
        path: '/config/name',
        type: 'modified',
        oldValue: 'old',
        newValue: 'new',
      });
    });

    it('应该检测到值类型的变化 (string → number)', () => {
      const old = JSON.stringify({ port: '3000' });
      const neu = JSON.stringify({ port: 3000 });

      const changes = computePathChanges(old, neu);

      expect(changes).toContainEqual({
        path: '/port',
        type: 'modified',
        oldValue: '3000',
        newValue: 3000,
      });
    });

    it('应该检测到值类型的变化 (number → boolean)', () => {
      const old = JSON.stringify({ enabled: 1 });
      const neu = JSON.stringify({ enabled: true });

      const changes = computePathChanges(old, neu);

      expect(changes).toContainEqual({
        path: '/enabled',
        type: 'modified',
        oldValue: 1,
        newValue: true,
      });
    });
  });

  describe('computePathChanges: 删除路径', () => {
    it('应该检测到删除的顶级字段', () => {
      const old = JSON.stringify({ name: 'test', version: '1.0.0' });
      const neu = JSON.stringify({ name: 'test' });

      const changes = computePathChanges(old, neu);

      expect(changes).toContainEqual({
        path: '/version',
        type: 'removed',
        oldValue: '1.0.0',
      });
    });

    it('应该检测到删除的嵌套字段', () => {
      const old = JSON.stringify({ config: { host: 'localhost', port: 3000 } });
      const neu = JSON.stringify({ config: { host: 'localhost' } });

      const changes = computePathChanges(old, neu);

      expect(changes).toContainEqual({
        path: '/config/port',
        type: 'removed',
        oldValue: 3000,
      });
    });

    it('应该检测到删除的嵌套对象', () => {
      const old = JSON.stringify({ database: { host: 'localhost', port: 5432 } });
      const neu = JSON.stringify({});

      const changes = computePathChanges(old, neu);

      expect(changes).toContainEqual({
        path: '/database',
        type: 'removed',
        oldValue: { host: 'localhost', port: 5432 },
      });
    });
  });

  describe('computePathChanges: 无变化', () => {
    it('无变化时应返回空数组', () => {
      const content = JSON.stringify({ name: 'test', version: '1.0.0' });

      const changes = computePathChanges(content, content);

      expect(changes).toEqual([]);
    });

    it('相同的嵌套结构应返回空数组', () => {
      const content = JSON.stringify({
        config: { host: 'localhost', port: 3000 },
        items: [1, 2, 3],
      });

      const changes = computePathChanges(content, content);

      expect(changes).toEqual([]);
    });
  });

  describe('computePathChanges: 数组变更', () => {
    it('应该检测到数组元素的新增', () => {
      const old = JSON.stringify({ items: [1, 2] });
      const neu = JSON.stringify({ items: [1, 2, 3] });

      const changes = computePathChanges(old, neu);

      expect(changes).toContainEqual({
        path: '/items/2',
        type: 'added',
        newValue: 3,
      });
    });

    it('应该检测到数组元素的删除', () => {
      const old = JSON.stringify({ items: [1, 2, 3] });
      const neu = JSON.stringify({ items: [1, 2] });

      const changes = computePathChanges(old, neu);

      expect(changes).toContainEqual({
        path: '/items/2',
        type: 'removed',
        oldValue: 3,
      });
    });

    it('应该检测到数组元素的修改', () => {
      const old = JSON.stringify({ items: ['a', 'b', 'c'] });
      const neu = JSON.stringify({ items: ['a', 'B', 'c'] });

      const changes = computePathChanges(old, neu);

      expect(changes).toContainEqual({
        path: '/items/1',
        type: 'modified',
        oldValue: 'b',
        newValue: 'B',
      });
    });

    it('应该检测到整个数组被替换', () => {
      const old = JSON.stringify({ items: [1, 2, 3] });
      const neu = JSON.stringify({ items: ['a', 'b'] });

      const changes = computePathChanges(old, neu);

      expect(changes).toContainEqual({
        path: '/items',
        type: 'modified',
        oldValue: [1, 2, 3],
        newValue: ['a', 'b'],
      });
    });
  });

  describe('computePathChanges: 复杂嵌套', () => {
    it('应该报告深层嵌套路径', () => {
      const old = JSON.stringify({ a: { b: { c: { d: 'old' } } } });
      const neu = JSON.stringify({ a: { b: { c: { d: 'new' } } } });

      const changes = computePathChanges(old, neu);

      expect(changes).toContainEqual({
        path: '/a/b/c/d',
        type: 'modified',
        oldValue: 'old',
        newValue: 'new',
      });
    });

    it('应该同时报告多个变更', () => {
      const old = JSON.stringify({ name: 'old', version: '1.0', removed: true });
      const neu = JSON.stringify({ name: 'new', version: '2.0', added: 42 });

      const changes = computePathChanges(old, neu);

      expect(changes).toHaveLength(4);
      expect(changes).toContainEqual({
        path: '/name',
        type: 'modified',
        oldValue: 'old',
        newValue: 'new',
      });
      expect(changes).toContainEqual({
        path: '/version',
        type: 'modified',
        oldValue: '1.0',
        newValue: '2.0',
      });
      expect(changes).toContainEqual({
        path: '/removed',
        type: 'removed',
        oldValue: true,
      });
      expect(changes).toContainEqual({
        path: '/added',
        type: 'added',
        newValue: 42,
      });
    });
  });

  describe('computePathChanges: 错误处理', () => {
    it('无效的旧内容应返回空数组', () => {
      const changes = computePathChanges('invalid json', '{"name": "test"}');

      expect(changes).toEqual([]);
    });

    it('无效的新内容应返回空数组', () => {
      const changes = computePathChanges('{"name": "test"}', 'invalid json');

      expect(changes).toEqual([]);
    });

    it('双方都无效时应返回空数组', () => {
      const changes = computePathChanges('not json', 'also not json');

      expect(changes).toEqual([]);
    });
  });

  describe('computeTextDiff: 文本差异', () => {
    it('应该返回差异块数组', () => {
      const old = 'line 1\nline 2\nline 3';
      const neu = 'line 1\nline 2 modified\nline 3';

      const diff = computeTextDiff(old, neu);

      expect(diff.length).toBeGreaterThan(0);
      const hasRemoved = diff.some((chunk) => chunk.removed);
      const hasAdded = diff.some((chunk) => chunk.added);
      expect(hasRemoved).toBe(true);
      expect(hasAdded).toBe(true);
    });

    it('完全不同的内容应全部标记为 removed + added', () => {
      const old = 'completely old content';
      const neu = 'completely new content';

      const diff = computeTextDiff(old, neu);

      expect(diff.some((chunk) => chunk.removed)).toBe(true);
      expect(diff.some((chunk) => chunk.added)).toBe(true);
    });

    it('相同内容应只包含 unchanged 块', () => {
      const content = 'same content\nline 2\nline 3';

      const diff = computeTextDiff(content, content);

      expect(diff.every((chunk) => !chunk.removed && !chunk.added)).toBe(true);
    });

    it('无变化时应返回非空的 unchanged 块', () => {
      const content = 'unchanged';

      const diff = computeTextDiff(content, content);

      expect(diff).toHaveLength(1);
      expect(diff[0].value).toBe('unchanged');
      expect(diff[0].added).toBeFalsy();
      expect(diff[0].removed).toBeFalsy();
    });

    it('应正确处理空字符串', () => {
      const diff = computeTextDiff('', 'new content');

      expect(diff).toContainEqual(
        expect.objectContaining({ added: true, value: 'new content' })
      );
    });

    it('应正确处理从有内容到空字符串', () => {
      const diff = computeTextDiff('old content', '');

      expect(diff).toContainEqual(
        expect.objectContaining({ removed: true, value: 'old content' })
      );
    });

    it('双方都为空时应返回空数组', () => {
      const diff = computeTextDiff('', '');

      expect(diff).toEqual([]);
    });

    it('应能处理 JSON 内容的文本差异', () => {
      const old = JSON.stringify({ name: 'test', version: '1.0' }, null, 2);
      const neu = JSON.stringify({ name: 'test', version: '2.0' }, null, 2);

      const diff = computeTextDiff(old, neu);

      expect(diff.length).toBeGreaterThan(0);
      expect(diff.some((chunk) => chunk.removed || chunk.added)).toBe(true);
    });
  });
});
