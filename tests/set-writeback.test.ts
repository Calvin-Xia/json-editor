import { describe, it, expect } from 'vitest';
import { parseJson5, serializeNode, setNodeValue } from '../src/core/parser';
import { JsonObjectNode } from '@croct/json5-parser';

describe('T3: set 后写回仍是 JSON5 测试', () => {
  it('应该在 set 操作后 toString() 输出仍是有效 JSON5', () => {
    const content = `{
  "name": "test",
  "version": "1.0.0",
}`;

    const result = parseJson5(content);
    expect(result.success).toBe(true);

    if (result.success) {
      const node = result.node as JsonObjectNode;
      setNodeValue(node, 'version', '2.0.0');
      
      const output = serializeNode(node);
      expect(output).toContain('version');
      expect(output).toContain('2.0.0');
      
      const reparseResult = parseJson5(output);
      expect(reparseResult.success).toBe(true);
    }
  });

  it('应该在添加新键后输出仍是有效 JSON5', () => {
    const content = `{
  "name": "test",
}`;

    const result = parseJson5(content);
    expect(result.success).toBe(true);

    if (result.success) {
      const node = result.node as JsonObjectNode;
      setNodeValue(node, 'newKey', 'newValue');
      
      const output = serializeNode(node);
      expect(output).toContain('newKey');
      expect(output).toContain('newValue');
      
      const reparseResult = parseJson5(output);
      expect(reparseResult.success).toBe(true);
    }
  });

  it('应该在修改数字值后输出仍是有效 JSON5', () => {
    const content = `{
  "count": 10,
}`;

    const result = parseJson5(content);
    expect(result.success).toBe(true);

    if (result.success) {
      const node = result.node as JsonObjectNode;
      setNodeValue(node, 'count', 99);
      
      const output = serializeNode(node);
      expect(output).toContain('99');
      
      const reparseResult = parseJson5(output);
      expect(reparseResult.success).toBe(true);
    }
  });

  it('应该在修改布尔值后输出仍是有效 JSON5', () => {
    const content = `{
  "enabled": false,
}`;

    const result = parseJson5(content);
    expect(result.success).toBe(true);

    if (result.success) {
      const node = result.node as JsonObjectNode;
      setNodeValue(node, 'enabled', true);
      
      const output = serializeNode(node);
      expect(output).toContain('true');
      
      const reparseResult = parseJson5(output);
      expect(reparseResult.success).toBe(true);
    }
  });
});
