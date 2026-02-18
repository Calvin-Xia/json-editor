import { describe, it, expect } from 'vitest';
import { parseJson5 } from '../src/core/parser';

describe('T2: 解析失败测试', () => {
  it('应该在解析无效 JSON5 时返回错误信息', () => {
    const content = `{
  "name": "test",
  "value": missing_quotes,
}`;

    const result = parseJson5(content);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBeDefined();
      expect(result.error.line).toBeGreaterThan(0);
      expect(result.error.column).toBeGreaterThan(0);
      expect(result.error.message).toBeTruthy();
    }
  });

  it('应该在缺少引号时返回错误', () => {
    const content = `{ name: test }`;

    const result = parseJson5(content);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBeDefined();
    }
  });

  it('应该在缺少大括号时返回错误', () => {
    const content = `{
  "name": "test"
  "value": 123
}`;

    const result = parseJson5(content);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBeDefined();
      expect(result.error.message).toBeTruthy();
    }
  });

  it('应该在空内容时返回错误', () => {
    const content = '';

    const result = parseJson5(content);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBeDefined();
    }
  });
});
