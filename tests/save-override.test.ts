import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { parseJson5, serializeNode, setNodeValue } from '../src/core/parser';
import { JsonObjectNode } from '@croct/json5-parser';

const testFilePath = path.join(__dirname, 'test-save.json5');

describe('T5: 保存覆盖成功测试', () => {
  beforeEach(() => {
    if (fs.existsSync(testFilePath)) {
      fs.unlinkSync(testFilePath);
    }
  });

  afterEach(() => {
    if (fs.existsSync(testFilePath)) {
      fs.unlinkSync(testFilePath);
    }
  });

  it('应该成功保存修改后的内容到文件', () => {
    const originalContent = `{
  "name": "test",
  "version": "1.0.0",
}`;

    fs.writeFileSync(testFilePath, originalContent, 'utf-8');

    const result = parseJson5(originalContent);
    expect(result.success).toBe(true);

    if (result.success) {
      const node = result.node as JsonObjectNode;
      setNodeValue(node, 'version', '2.0.0');
      
      const output = serializeNode(node);
      fs.writeFileSync(testFilePath, output, 'utf-8');
      
      const savedContent = fs.readFileSync(testFilePath, 'utf-8');
      expect(savedContent).toContain('version');
      expect(savedContent).toContain('2.0.0');
    }
  });

  it('应该保存带注释的内容', () => {
    const originalContent = `{
  // 配置名称
  "name": "test",
}`;

    fs.writeFileSync(testFilePath, originalContent, 'utf-8');

    const result = parseJson5(originalContent);
    expect(result.success).toBe(true);

    if (result.success) {
      const node = result.node as JsonObjectNode;
      setNodeValue(node, 'name', 'modified');
      
      const output = serializeNode(node);
      fs.writeFileSync(testFilePath, output, 'utf-8');
      
      const savedContent = fs.readFileSync(testFilePath, 'utf-8');
      expect(savedContent).toContain('配置名称');
      expect(savedContent).toContain('modified');
    }
  });

  it('应该保存新添加的字段', () => {
    const originalContent = `{
  "name": "test",
}`;

    fs.writeFileSync(testFilePath, originalContent, 'utf-8');

    const result = parseJson5(originalContent);
    expect(result.success).toBe(true);

    if (result.success) {
      const node = result.node as JsonObjectNode;
      setNodeValue(node, 'newField', 'newValue');
      
      const output = serializeNode(node);
      fs.writeFileSync(testFilePath, output, 'utf-8');
      
      const savedContent = fs.readFileSync(testFilePath, 'utf-8');
      expect(savedContent).toContain('newField');
      expect(savedContent).toContain('newValue');
    }
  });

  it('保存的内容应该可以被重新解析', () => {
    const originalContent = `{
  "name": "test",
  "count": 10,
}`;

    fs.writeFileSync(testFilePath, originalContent, 'utf-8');

    const result = parseJson5(originalContent);
    expect(result.success).toBe(true);

    if (result.success) {
      const node = result.node as JsonObjectNode;
      setNodeValue(node, 'count', 99);
      
      const output = serializeNode(node);
      fs.writeFileSync(testFilePath, output, 'utf-8');
      
      const savedContent = fs.readFileSync(testFilePath, 'utf-8');
      const reparseResult = parseJson5(savedContent);
      
      expect(reparseResult.success).toBe(true);
    }
  });
});
