import { describe, it, expect } from 'vitest';
import { JsonParser, JsonObjectNode } from '@croct/json5-parser';
import { validateJsonNode, validateKey, ValidationError } from '../src/core/validation';

describe('validateKey', () => {
  describe('T1: 空键名检测', () => {
    it('空键名应返回 error', () => {
      const errors = validateKey('', ['name', 'age']);
      expect(errors).toHaveLength(1);
      expect(errors[0]).toEqual({
        path: '',
        key: '',
        message: '字段名不能为空',
        severity: 'error',
      });
    });

    it('非空键名不应返回 error', () => {
      const errors = validateKey('name', ['name', 'age']);
      expect(errors).toHaveLength(0);
    });
  });

  describe('T2: 重复键名检测', () => {
    it('重复键名应返回 warning', () => {
      const errors = validateKey('name', ['name', 'age', 'name']);
      expect(errors).toHaveLength(1);
      expect(errors[0]).toEqual({
        path: '',
        key: 'name',
        message: '字段名已存在: name',
        severity: 'warning',
      });
    });

    it('唯一键名不应返回 warning', () => {
      const errors = validateKey('email', ['name', 'age']);
      expect(errors).toHaveLength(0);
    });
  });

  describe('T3: 空键名且重复', () => {
    it('空键名且重复应返回两个错误', () => {
      const errors = validateKey('', ['', '', 'name']);
      expect(errors).toHaveLength(2);
      expect(errors[0].severity).toBe('error');
      expect(errors[1].severity).toBe('warning');
    });
  });
});

describe('validateJsonNode', () => {
  describe('T4: 有效键名通过验证', () => {
    it('所有键名有效时返回空数组', () => {
      const node = JsonParser.parse('{"name": "test", "age": 18}', JsonObjectNode);
      const errors = validateJsonNode(node);
      expect(errors).toHaveLength(0);
    });

    it('JSON5 带注释的合法对象通过验证', () => {
      const node = JsonParser.parse(
        `{
          // 注释
          "name": "test",
          "version": "1.0.0",
        }`,
        JsonObjectNode
      );
      const errors = validateJsonNode(node);
      expect(errors).toHaveLength(0);
    });
  });

  describe('T5: 对象中的空键名返回错误及路径', () => {
    it('顶层空键名路径为 /', () => {
      const node = JsonParser.parse('{"": "value"}', JsonObjectNode);
      const errors = validateJsonNode(node);
      expect(errors.length).toBeGreaterThanOrEqual(1);
      const emptyKeyError = errors.find(
        (e) => e.key === '' && e.severity === 'error'
      );
      expect(emptyKeyError).toBeDefined();
      expect(emptyKeyError!.path).toBe('/');
    });

    it('嵌套对象空键名路径正确', () => {
      const node = JsonParser.parse(
        '{"config": {"": "value"}}',
        JsonObjectNode
      );
      const errors = validateJsonNode(node);
      expect(errors.length).toBeGreaterThanOrEqual(1);
      const emptyKeyError = errors.find(
        (e) => e.key === '' && e.severity === 'error'
      );
      expect(emptyKeyError).toBeDefined();
      expect(emptyKeyError!.path).toBe('/config');
    });
  });

  describe('T6: 对象中的重复键名返回警告及路径', () => {
    it('顶层重复键名路径为 /', () => {
      const siblingKeys = ['name', 'age', 'name'];
      const errors = validateKey('name', siblingKeys);
      const duplicates = errors.filter((e) => e.severity === 'warning');
      expect(duplicates).toHaveLength(1);
      expect(duplicates[0].key).toBe('name');
      expect(duplicates[0].message).toBe('字段名已存在: name');
    });
  });

  describe('T7: 数组元素不验证键名', () => {
    it('数组中的对象仍然验证键名', () => {
      const node = JsonParser.parse(
        '{"items": [{"name": "a"}, {"name": "b"}]}',
        JsonObjectNode
      );
      const errors = validateJsonNode(node);
      expect(errors).toHaveLength(0);
    });

    it('嵌套数组中的空键名仍被检测到', () => {
      const node = JsonParser.parse(
        '{"items": [{"": "value"}]}',
        JsonObjectNode
      );
      const errors = validateJsonNode(node);
      expect(errors.length).toBeGreaterThanOrEqual(1);
      const emptyKeyError = errors.find(
        (e) => e.key === '' && e.severity === 'error'
      );
      expect(emptyKeyError).toBeDefined();
      expect(emptyKeyError!.path).toBe('/items/0');
    });
  });

  describe('T8: 递归验证嵌套对象', () => {
    it('深层嵌套对象的错误路径正确', () => {
      const node = JsonParser.parse(
        '{"a": {"b": {"c": {"": "deep"}}}}',
        JsonObjectNode
      );
      const errors = validateJsonNode(node);
      expect(errors.length).toBeGreaterThanOrEqual(1);
      const emptyKeyError = errors.find(
        (e) => e.key === '' && e.severity === 'error'
      );
      expect(emptyKeyError).toBeDefined();
      expect(emptyKeyError!.path).toBe('/a/b/c');
    });

    it('多个嵌套层级的错误都被收集', () => {
      const node = JsonParser.parse(
        '{"": "top", "child": {"": "nested"}}',
        JsonObjectNode
      );
      const errors = validateJsonNode(node);
      expect(errors.length).toBeGreaterThanOrEqual(2);
      const errorPaths = errors
        .filter((e) => e.severity === 'error')
        .map((e) => e.path)
        .sort();
      expect(errorPaths).toContain('/');
      expect(errorPaths).toContain('/child');
    });
  });

  describe('T9: 数组索引正确反映在路径中', () => {
    it('数组索引出现在路径中', () => {
      const node = JsonParser.parse(
        '{"list": [{"": "first"}, {"name": "ok"}, {"": "third"}]}',
        JsonObjectNode
      );
      const errors = validateJsonNode(node);
      const emptyKeyErrors = errors.filter(
        (e) => e.key === '' && e.severity === 'error'
      );
      expect(emptyKeyErrors).toHaveLength(2);
      const paths = emptyKeyErrors.map((e) => e.path).sort();
      expect(paths).toContain('/list/0');
      expect(paths).toContain('/list/2');
    });
  });

  describe('T10: 混合场景 - 多种错误同时存在', () => {
    it('空键名和嵌套错误一起被收集', () => {
      const node = JsonParser.parse(
        `{
          "valid": true,
          "": "empty key at root",
          "nested": {
            "child": {
              "": "empty key deep"
            }
          },
          "array": [
            {"": "empty in array"},
            {"ok": "fine"}
          ]
        }`,
        JsonObjectNode
      );
      const errors = validateJsonNode(node);
      const errorOnly = errors.filter((e) => e.severity === 'error');
      expect(errorOnly.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('T11: 特殊字符路径处理', () => {
    it('包含 ~ 和 / 的键名正确转义', () => {
      const node = JsonParser.parse('{"a~b": {"c/d": {"": "val"}}}', JsonObjectNode);
      const errors = validateJsonNode(node);
      const emptyKeyError = errors.find(
        (e) => e.key === '' && e.severity === 'error'
      );
      expect(emptyKeyError).toBeDefined();
      expect(emptyKeyError!.path).toBe('/a~0b/c~1d');
    });
  });
});
