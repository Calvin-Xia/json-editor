import { describe, it, expect } from 'vitest';
import { parseJson5, serializeNode } from '../src/core/parser';
import { JsonObjectNode, JsonArrayNode, JsonPrimitiveNode } from '@croct/json5-parser';
import {
  addObjectField,
  deleteObjectField,
  addArrayElement,
  deleteArrayElement,
  moveArrayElement,
  isMixedArray,
} from '../src/core/parser/astOperations';

function parseOrFail(content: string): JsonObjectNode {
  const result = parseJson5(content);
  expect(result.success).toBe(true);
  if (!result.success) throw new Error('parse failed');
  return result.node as JsonObjectNode;
}

function parseArrayOrFail(content: string): JsonArrayNode {
  const result = parseJson5(content);
  expect(result.success).toBe(true);
  if (!result.success) throw new Error('parse failed');
  return result.node as JsonArrayNode;
}

describe('astOperations', () => {
  describe('addObjectField', () => {
    it('应该添加 string 类型字段，默认值为空字符串', () => {
      const node = parseOrFail('{ "name": "test" }');
      const ok = addObjectField(node, 'email', 'string');
      expect(ok).toBe(true);
      expect(node.has('email')).toBe(true);
      expect(node.get('email').toJSON()).toBe('');
    });

    it('应该添加 number 类型字段，默认值为 0', () => {
      const node = parseOrFail('{ "name": "test" }');
      const ok = addObjectField(node, 'count', 'number');
      expect(ok).toBe(true);
      expect(node.get('count').toJSON()).toBe(0);
    });

    it('应该添加 boolean 类型字段，默认值为 false', () => {
      const node = parseOrFail('{ "name": "test" }');
      const ok = addObjectField(node, 'enabled', 'boolean');
      expect(ok).toBe(true);
      expect(node.get('enabled').toJSON()).toBe(false);
    });

    it('应该添加 null 类型字段', () => {
      const node = parseOrFail('{ "name": "test" }');
      const ok = addObjectField(node, 'nothing', 'null');
      expect(ok).toBe(true);
      expect(node.get('nothing').toJSON()).toBe(null);
    });

    it('应该添加 object 类型字段，默认值为空对象', () => {
      const node = parseOrFail('{ "name": "test" }');
      const ok = addObjectField(node, 'meta', 'object');
      expect(ok).toBe(true);
      expect(node.get('meta').toJSON()).toEqual({});
    });

    it('应该添加 array 类型字段，默认值为空数组', () => {
      const node = parseOrFail('{ "name": "test" }');
      const ok = addObjectField(node, 'items', 'array');
      expect(ok).toBe(true);
      expect(node.get('items').toJSON()).toEqual([]);
    });

    it('重复 key 应该返回 false，不修改节点', () => {
      const node = parseOrFail('{ "name": "test" }');
      const ok = addObjectField(node, 'name', 'string');
      expect(ok).toBe(false);
      expect(node.get('name').toJSON()).toBe('test');
    });

    it('空 key 应该返回 false', () => {
      const node = parseOrFail('{ "name": "test" }');
      expect(addObjectField(node, '', 'string')).toBe(false);
    });

    it('添加字段后应该保留原有注释（lossless round-trip）', () => {
      const content = `{
  // 这是注释
  "name": "test",
}`;
      const node = parseOrFail(content);
      addObjectField(node, 'newField', 'string');

      const output = serializeNode(node);
      expect(output).toContain('这是注释');
      expect(output).toContain('newField');
    });

    it('添加字段后 toString() 仍是有效 JSON5', () => {
      const node = parseOrFail('{ "name": "test", }');
      addObjectField(node, 'version', 'string');

      const output = serializeNode(node);
      const reparse = parseJson5(output);
      expect(reparse.success).toBe(true);
    });
  });

  describe('deleteObjectField', () => {
    it('删除存在的字段应该返回 true', () => {
      const node = parseOrFail('{ "name": "test", "age": 25 }');
      const ok = deleteObjectField(node, 'age');
      expect(ok).toBe(true);
      expect(node.has('age')).toBe(false);
    });

    it('删除不存在的字段应该返回 false', () => {
      const node = parseOrFail('{ "name": "test" }');
      const ok = deleteObjectField(node, 'missing');
      expect(ok).toBe(false);
    });

    it('删除字段后其他字段保持不变', () => {
      const node = parseOrFail('{ "name": "test", "age": 25, "city": "Beijing" }');
      deleteObjectField(node, 'age');
      expect(node.get('name').toJSON()).toBe('test');
      expect(node.get('city').toJSON()).toBe('Beijing');
    });

    it('删除字段后应该保留其他字段的注释（lossless round-trip）', () => {
      const content = `{
  // 名称
  "name": "test",
  // 年龄
  "age": 25,
}`;
      const node = parseOrFail(content);
      deleteObjectField(node, 'age');

      const output = serializeNode(node);
      expect(output).toContain('名称');
    });

    it('删除字段后 toString() 仍是有效 JSON5', () => {
      const node = parseOrFail('{ "name": "test", "age": 25, }');
      deleteObjectField(node, 'age');

      const output = serializeNode(node);
      const reparse = parseJson5(output);
      expect(reparse.success).toBe(true);
    });
  });

  describe('addArrayElement', () => {
    it('应该在末尾追加 string 元素', () => {
      const node = parseOrFail('{ "items": ["a", "b"] }');
      const arr = node.get('items') as JsonArrayNode;
      const ok = addArrayElement(arr, 'string');
      expect(ok).toBe(true);
      const elements = arr.elements;
      expect(elements).toHaveLength(3);
      expect(elements[2].toJSON()).toBe('');
    });

    it('应该在末尾追加 number 元素', () => {
      const node = parseOrFail('{ "items": [1, 2] }');
      const arr = node.get('items') as JsonArrayNode;
      addArrayElement(arr, 'number');
      expect(arr.elements).toHaveLength(3);
      expect(arr.elements[2].toJSON()).toBe(0);
    });

    it('应该在末尾追加 boolean 元素', () => {
      const node = parseOrFail('{ "items": [true] }');
      const arr = node.get('items') as JsonArrayNode;
      addArrayElement(arr, 'boolean');
      expect(arr.elements[1].toJSON()).toBe(false);
    });

    it('应该在末尾追加 null 元素', () => {
      const node = parseOrFail('{ "items": [1] }');
      const arr = node.get('items') as JsonArrayNode;
      addArrayElement(arr, 'null');
      expect(arr.elements[1].toJSON()).toBe(null);
    });

    it('应该在末尾追加 object 元素', () => {
      const node = parseOrFail('{ "items": [] }');
      const arr = node.get('items') as JsonArrayNode;
      addArrayElement(arr, 'object');
      expect(arr.elements[0].toJSON()).toEqual({});
    });

    it('应该在末尾追加 array 元素', () => {
      const node = parseOrFail('{ "items": [] }');
      const arr = node.get('items') as JsonArrayNode;
      addArrayElement(arr, 'array');
      expect(arr.elements[0].toJSON()).toEqual([]);
    });

    it('应该在指定 index 插入元素', () => {
      const node = parseOrFail('{ "items": ["a", "b", "c"] }');
      const arr = node.get('items') as JsonArrayNode;
      const ok = addArrayElement(arr, 'string', 1);
      expect(ok).toBe(true);
      expect(arr.elements).toHaveLength(4);
      expect(arr.elements[0].toJSON()).toBe('a');
      expect(arr.elements[1].toJSON()).toBe('');
      expect(arr.elements[2].toJSON()).toBe('b');
      expect(arr.elements[3].toJSON()).toBe('c');
    });

    it('index 超出范围应该返回 false', () => {
      const node = parseOrFail('{ "items": ["a"] }');
      const arr = node.get('items') as JsonArrayNode;
      expect(addArrayElement(arr, 'string', 5)).toBe(false);
    });

    it('index 为负数应该返回 false', () => {
      const node = parseOrFail('{ "items": ["a"] }');
      const arr = node.get('items') as JsonArrayNode;
      expect(addArrayElement(arr, 'string', -1)).toBe(false);
    });

    it('添加元素后应该保留原有注释（lossless round-trip）', () => {
      const content = `{
  // 列表
  "items": [1, 2],
}`;
      const node = parseOrFail(content);
      const arr = node.get('items') as JsonArrayNode;
      addArrayElement(arr, 'number');

      const output = serializeNode(node);
      expect(output).toContain('列表');
    });

    it('添加元素后 toString() 仍是有效 JSON5', () => {
      const node = parseOrFail('{ "items": [1, 2, 3] }');
      const arr = node.get('items') as JsonArrayNode;
      addArrayElement(arr, 'string');

      const output = serializeNode(node);
      const reparse = parseJson5(output);
      expect(reparse.success).toBe(true);
    });
  });

  describe('deleteArrayElement', () => {
    it('删除指定 index 的元素应该返回 true', () => {
      const node = parseOrFail('{ "items": ["a", "b", "c"] }');
      const arr = node.get('items') as JsonArrayNode;
      const ok = deleteArrayElement(arr, 1);
      expect(ok).toBe(true);
      expect(arr.elements).toHaveLength(2);
      expect(arr.elements[0].toJSON()).toBe('a');
      expect(arr.elements[1].toJSON()).toBe('c');
    });

    it('删除第一个元素', () => {
      const node = parseOrFail('{ "items": [1, 2, 3] }');
      const arr = node.get('items') as JsonArrayNode;
      deleteArrayElement(arr, 0);
      expect(arr.elements).toHaveLength(2);
      expect(arr.elements[0].toJSON()).toBe(2);
    });

    it('删除最后一个元素', () => {
      const node = parseOrFail('{ "items": [1, 2, 3] }');
      const arr = node.get('items') as JsonArrayNode;
      deleteArrayElement(arr, 2);
      expect(arr.elements).toHaveLength(2);
      expect(arr.elements[1].toJSON()).toBe(2);
    });

    it('index 超出范围应该返回 false', () => {
      const node = parseOrFail('{ "items": ["a"] }');
      const arr = node.get('items') as JsonArrayNode;
      expect(deleteArrayElement(arr, 5)).toBe(false);
    });

    it('index 为负数应该返回 false', () => {
      const node = parseOrFail('{ "items": ["a"] }');
      const arr = node.get('items') as JsonArrayNode;
      expect(deleteArrayElement(arr, -1)).toBe(false);
    });

    it('空数组删除应该返回 false', () => {
      const node = parseOrFail('{ "items": [] }');
      const arr = node.get('items') as JsonArrayNode;
      expect(deleteArrayElement(arr, 0)).toBe(false);
    });

    it('删除元素后应该保留原有注释（lossless round-trip）', () => {
      const content = `{
  // 列表
  "items": [1, 2, 3],
}`;
      const node = parseOrFail(content);
      const arr = node.get('items') as JsonArrayNode;
      deleteArrayElement(arr, 1);

      const output = serializeNode(node);
      expect(output).toContain('列表');
    });

    it('删除元素后 toString() 仍是有效 JSON5', () => {
      const node = parseOrFail('{ "items": [1, 2, 3] }');
      const arr = node.get('items') as JsonArrayNode;
      deleteArrayElement(arr, 1);

      const output = serializeNode(node);
      const reparse = parseJson5(output);
      expect(reparse.success).toBe(true);
    });
  });

  describe('moveArrayElement', () => {
    it('将元素从 index 0 移到 index 2', () => {
      const node = parseOrFail('{ "items": ["a", "b", "c"] }');
      const arr = node.get('items') as JsonArrayNode;
      const ok = moveArrayElement(arr, 0, 2);
      expect(ok).toBe(true);
      expect(arr.elements[0].toJSON()).toBe('b');
      expect(arr.elements[1].toJSON()).toBe('c');
      expect(arr.elements[2].toJSON()).toBe('a');
    });

    it('将元素从 index 2 移到 index 0', () => {
      const node = parseOrFail('{ "items": ["a", "b", "c"] }');
      const arr = node.get('items') as JsonArrayNode;
      moveArrayElement(arr, 2, 0);
      expect(arr.elements[0].toJSON()).toBe('c');
      expect(arr.elements[1].toJSON()).toBe('a');
      expect(arr.elements[2].toJSON()).toBe('b');
    });

    it('相同 index 移动不改变顺序', () => {
      const node = parseOrFail('{ "items": ["a", "b", "c"] }');
      const arr = node.get('items') as JsonArrayNode;
      const ok = moveArrayElement(arr, 1, 1);
      expect(ok).toBe(true);
      expect(arr.elements[0].toJSON()).toBe('a');
      expect(arr.elements[1].toJSON()).toBe('b');
      expect(arr.elements[2].toJSON()).toBe('c');
    });

    it('fromIndex 超出范围应该返回 false', () => {
      const node = parseOrFail('{ "items": ["a"] }');
      const arr = node.get('items') as JsonArrayNode;
      expect(moveArrayElement(arr, 5, 0)).toBe(false);
    });

    it('toIndex 超出范围应该返回 false', () => {
      const node = parseOrFail('{ "items": ["a"] }');
      const arr = node.get('items') as JsonArrayNode;
      expect(moveArrayElement(arr, 0, 5)).toBe(false);
    });

    it('负数 index 应该返回 false', () => {
      const node = parseOrFail('{ "items": ["a"] }');
      const arr = node.get('items') as JsonArrayNode;
      expect(moveArrayElement(arr, -1, 0)).toBe(false);
    });

    it('移动元素后应该保留原有注释（lossless round-trip）', () => {
      const content = `{
  // 列表
  "items": ["a", "b", "c"],
}`;
      const node = parseOrFail(content);
      const arr = node.get('items') as JsonArrayNode;
      moveArrayElement(arr, 0, 2);

      const output = serializeNode(node);
      expect(output).toContain('列表');
    });

    it('移动元素后 toString() 仍是有效 JSON5', () => {
      const node = parseOrFail('{ "items": [1, 2, 3] }');
      const arr = node.get('items') as JsonArrayNode;
      moveArrayElement(arr, 0, 2);

      const output = serializeNode(node);
      const reparse = parseJson5(output);
      expect(reparse.success).toBe(true);
    });
  });

  describe('isMixedArray', () => {
    it('同类型数组应该返回 false（全部 string）', () => {
      const node = parseOrFail('{ "items": ["a", "b"] }');
      const arr = node.get('items') as JsonArrayNode;
      expect(isMixedArray(arr)).toBe(false);
    });

    it('同类型数组应该返回 false（全部 number）', () => {
      const node = parseOrFail('{ "items": [1, 2, 3] }');
      const arr = node.get('items') as JsonArrayNode;
      expect(isMixedArray(arr)).toBe(false);
    });

    it('混合类型数组应该返回 true', () => {
      const node = parseOrFail('{ "items": ["a", 1, true] }');
      const arr = node.get('items') as JsonArrayNode;
      expect(isMixedArray(arr)).toBe(true);
    });

    it('空数组应该返回 false', () => {
      const node = parseOrFail('{ "items": [] }');
      const arr = node.get('items') as JsonArrayNode;
      expect(isMixedArray(arr)).toBe(false);
    });

    it('单元素数组应该返回 false', () => {
      const node = parseOrFail('{ "items": [42] }');
      const arr = node.get('items') as JsonArrayNode;
      expect(isMixedArray(arr)).toBe(false);
    });

    it('null 与其他类型混合应该返回 true', () => {
      const node = parseOrFail('{ "items": [null, "a"] }');
      const arr = node.get('items') as JsonArrayNode;
      expect(isMixedArray(arr)).toBe(true);
    });

    it('对象和数组混合应该返回 true', () => {
      const node = parseOrFail('{ "items": [[], {}] }');
      const arr = node.get('items') as JsonArrayNode;
      expect(isMixedArray(arr)).toBe(true);
    });
  });

  describe('综合 lossless round-trip 测试', () => {
    it('连续添加和删除字段后注释保留', () => {
      const content = `{
  // 重要配置
  "name": "test",
  // 版本号
  "version": "1.0.0",
}`;
      const node = parseOrFail(content);
      addObjectField(node, 'temp', 'string');
      deleteObjectField(node, 'temp');

      const output = serializeNode(node);
      expect(output).toContain('重要配置');
      expect(output).toContain('版本号');
    });

    it('添加字段后删除再添加新字段仍保留注释', () => {
      const content = `{
  /* 配置块 */
  "name": "test",
}`;
      const node = parseOrFail(content);
      addObjectField(node, 'foo', 'string');
      deleteObjectField(node, 'foo');
      addObjectField(node, 'bar', 'number');

      const output = serializeNode(node);
      expect(output).toContain('配置块');
      expect(output).toContain('bar');

      const reparse = parseJson5(output);
      expect(reparse.success).toBe(true);
    });

    it('数组添加/删除/移动元素后注释保留', () => {
      const content = `{
  // 数组字段
  "items": [1, 2, 3],
}`;
      const node = parseOrFail(content);
      const arr = node.get('items') as JsonArrayNode;
      addArrayElement(arr, 'number');
      deleteArrayElement(arr, 0);
      moveArrayElement(arr, 0, 1);

      const output = serializeNode(node);
      expect(output).toContain('数组字段');

      const reparse = parseJson5(output);
      expect(reparse.success).toBe(true);
    });
  });
});
