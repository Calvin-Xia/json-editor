import { describe, it, expect } from 'vitest';
import { parseJson5 } from '../src/core/parser';

describe('T1: 解析成功测试', () => {
  it('应该成功解析有效的 JSON5 文件', () => {
    const content = `{
  // 这是一个注释
  "name": "test",
  "version": "1.0.0",
  "debug": true,
  "count": 42,
}`;

    const result = parseJson5(content);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.node).toBeDefined();
      expect(result.node.toString()).toContain('name');
      expect(result.node.toString()).toContain('test');
    }
  });

  it('应该成功解析标准 JSON 文件', () => {
    const content = '{"name": "test", "value": 123}';

    const result = parseJson5(content);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.node).toBeDefined();
    }
  });

  it('应该成功解析带尾逗号的 JSON5', () => {
    const content = `{
  "items": [1, 2, 3,],
  "name": "test",
}`;

    const result = parseJson5(content);

    expect(result.success).toBe(true);
    if (result.success) {
      const output = result.node.toString();
      expect(output).toContain('items');
    }
  });

  it('应该成功解析带单引号的 JSON5', () => {
    const content = `{
  'name': 'test',
  'value': 'hello',
}`;

    const result = parseJson5(content);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.node).toBeDefined();
    }
  });
});
