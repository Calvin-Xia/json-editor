import { describe, it, expect } from 'vitest';
import { parseJson5, serializeNode, setNodeValue } from '../src/core/parser';
import { JsonObjectNode } from '@croct/json5-parser';

describe('T4: 注释未丢失测试', () => {
  it('应该在修改值后保留注释', () => {
    const content = `{
  // 这是 name 字段的注释
  "name": "test",
  // 这是 version 字段的注释
  "version": "1.0.0",
}`;

    const result = parseJson5(content);
    expect(result.success).toBe(true);

    if (result.success) {
      const node = result.node as JsonObjectNode;
      setNodeValue(node, 'version', '2.0.0');
      
      const output = serializeNode(node);
      expect(output).toContain('这是 name 字段的注释');
      expect(output).toContain('这是 version 字段的注释');
    }
  });

  it('应该保留多行注释', () => {
    const content = `{
  /*
   * 这是一个多行注释
   * 描述这个配置文件
   */
  "name": "test",
}`;

    const result = parseJson5(content);
    expect(result.success).toBe(true);

    if (result.success) {
      const node = result.node as JsonObjectNode;
      setNodeValue(node, 'name', 'modified');
      
      const output = serializeNode(node);
      expect(output).toContain('这是一个多行注释');
    }
  });

  it('应该保留行尾注释', () => {
    const content = `{
  "name": "test", // 行尾注释
  "value": 123, // 另一个行尾注释
}`;

    const result = parseJson5(content);
    expect(result.success).toBe(true);

    if (result.success) {
      const node = result.node as JsonObjectNode;
      setNodeValue(node, 'value', 456);
      
      const output = serializeNode(node);
      expect(output).toContain('行尾注释');
    }
  });

  it('应该在添加新字段后保留原有注释', () => {
    const content = `{
  // 原有注释
  "name": "test",
}`;

    const result = parseJson5(content);
    expect(result.success).toBe(true);

    if (result.success) {
      const node = result.node as JsonObjectNode;
      setNodeValue(node, 'newField', 'newValue');
      
      const output = serializeNode(node);
      expect(output).toContain('原有注释');
    }
  });
});
