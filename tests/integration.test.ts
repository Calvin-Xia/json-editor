import { describe, it, expect, beforeEach } from 'vitest';
import { useDocumentStore } from '../src/store/documentStore';
import { parseJson5, serializeNode, setNodeValue, getNodeValue } from '../src/core/parser';
import { JsonObjectNode, JsonArrayNode } from '@croct/json5-parser';
import {
  addObjectField,
  deleteObjectField,
  addArrayElement,
  deleteArrayElement,
  moveArrayElement,
} from '../src/core/parser/astOperations';
import { validateJsonNode, validateKey } from '../src/core/validation';
import { computePathChanges } from '../src/core/diff';

function setupDocument(content: string, filePath = '/test.json'): void {
  const store = useDocumentStore.getState();
  useDocumentStore.temporal.getState().pause();
  store.openContent(content, filePath);
  useDocumentStore.temporal.getState().resume();
  useDocumentStore.temporal.getState().clear();

  expect(useDocumentStore.getState().parseStatus).toBe('success');
  expect(useDocumentStore.getState().document?.jsonNode).not.toBeNull();
}

function getJsonNode(): JsonObjectNode {
  const node = useDocumentStore.getState().document?.jsonNode;
  expect(node).toBeDefined();
  return node as JsonObjectNode;
}

function getSerialized(): string {
  const content = useDocumentStore.getState().getSerializedContent();
  expect(content).not.toBeNull();
  return content as string;
}

function getTemporal() {
  return useDocumentStore.temporal.getState();
}

describe('集成测试：完整编辑周期', () => {
  beforeEach(() => {
    useDocumentStore.setState({
      document: null,
      parseStatus: 'idle',
      error: null,
    });
    useDocumentStore.temporal.getState().clear();
  });

  describe('场景一：打开 → 编辑值 → 撤销 → 重做 → 验证内容', () => {
    it('修改字符串值后 undo/redo 正确恢复', () => {
      const original = '{\n  "name": "hello",\n  "version": "1.0.0"\n}';
      setupDocument(original);

      const before = getSerialized();
      expect(before).toContain('"hello"');
      expect(before).toContain('"1.0.0"');

      const success = useDocumentStore.getState().updateNodeValue('', 'name', 'world');
      expect(success).toBe(true);
      expect(useDocumentStore.getState().document?.isModified).toBe(true);

      const afterEdit = getSerialized();
      expect(afterEdit).toContain('"world"');
      expect(afterEdit).not.toContain('"hello"');

      getTemporal().undo();
      const afterUndo = getSerialized();
      expect(afterUndo).toContain('"hello"');
      expect(afterUndo).not.toContain('"world"');

      getTemporal().redo();
      const afterRedo = getSerialized();
      expect(afterRedo).toContain('"world"');
      expect(afterRedo).not.toContain('"hello"');
    });

    it('修改数字值后 undo/redo 正确恢复', () => {
      setupDocument('{\n  "count": 10,\n  "label": "test"\n}');

      useDocumentStore.getState().updateNodeValue('', 'count', 99);
      expect(getSerialized()).toContain('99');

      getTemporal().undo();
      expect(getSerialized()).toContain('10');
      expect(getSerialized()).not.toContain('99');

      getTemporal().redo();
      expect(getSerialized()).toContain('99');
    });

    it('修改布尔值后 undo/redo 正确恢复', () => {
      setupDocument('{\n  "enabled": false\n}');

      useDocumentStore.getState().updateNodeValue('', 'enabled', true);
      expect(getSerialized()).toContain('true');

      getTemporal().undo();
      expect(getSerialized()).toContain('false');

      getTemporal().redo();
      expect(getSerialized()).toContain('true');
    });

    it('多次修改后多步 undo/redo 正确恢复', () => {
      setupDocument('{\n  "a": "x",\n  "b": "y"\n}');

      useDocumentStore.getState().updateNodeValue('', 'a', 'first');
      expect(getSerialized()).toContain('"first"');

      useDocumentStore.getState().updateNodeValue('', 'b', 'second');
      expect(getSerialized()).toContain('"second"');

      getTemporal().undo();
      const afterFirstUndo = getSerialized();
      expect(afterFirstUndo).toContain('"first"');
      expect(afterFirstUndo).toContain('"y"');

      getTemporal().undo();
      const afterSecondUndo = getSerialized();
      expect(afterSecondUndo).toContain('"x"');
      expect(afterSecondUndo).toContain('"y"');

      getTemporal().redo();
      expect(getSerialized()).toContain('"first"');

      getTemporal().redo();
      expect(getSerialized()).toContain('"second"');
    });

    it('undo 后执行新操作应该清空 redo 栈', () => {
      setupDocument('{\n  "a": "x",\n  "b": "y"\n}');

      useDocumentStore.getState().updateNodeValue('', 'a', 'first');
      useDocumentStore.getState().updateNodeValue('', 'b', 'second');

      getTemporal().undo();
      getTemporal().undo();
      expect(getTemporal().futureStates.length).toBe(2);

      useDocumentStore.getState().updateNodeValue('', 'a', 'brand-new');
      expect(getTemporal().futureStates.length).toBe(0);

      getTemporal().undo();
      expect(getSerialized()).toContain('"x"');
    });
  });

  describe('场景二：打开 → 添加字段 → 删除字段 → 验证结构', () => {
    it('添加 string 字段后序列化包含新字段', () => {
      setupDocument('{\n  "name": "test"\n}');
      const node = getJsonNode();

      const ok = addObjectField(node, 'email', 'string');
      expect(ok).toBe(true);

      const output = serializeNode(node);
      expect(output).toContain('email');
      expect(output).toMatch(/"email"\s*:\s*""/);
    });

    it('添加 number 字段后序列化包含默认值 0', () => {
      setupDocument('{\n  "name": "test"\n}');
      const node = getJsonNode();

      addObjectField(node, 'count', 'number');

      const output = serializeNode(node);
      expect(output).toContain('count');
      expect(output).toMatch(/"count"\s*:\s*0/);
    });

    it('添加 object 字段后序列化包含空对象', () => {
      setupDocument('{\n  "name": "test"\n}');
      const node = getJsonNode();

      addObjectField(node, 'config', 'object');

      const output = serializeNode(node);
      expect(output).toContain('config');
      expect(output).toContain('{}');
    });

    it('添加 array 字段后序列化包含空数组', () => {
      setupDocument('{\n  "name": "test"\n}');
      const node = getJsonNode();

      addObjectField(node, 'items', 'array');

      const output = serializeNode(node);
      expect(output).toContain('items');
      expect(output).toContain('[]');
    });

    it('删除字段后序列化不再包含该字段', () => {
      setupDocument('{\n  "name": "test",\n  "version": "1.0.0"\n}');
      const node = getJsonNode();

      const ok = deleteObjectField(node, 'version');
      expect(ok).toBe(true);

      const output = serializeNode(node);
      expect(output).toContain('name');
      expect(output).not.toContain('version');
    });

    it('添加字段后删除字段，结构恢复原样', () => {
      setupDocument('{\n  "name": "test"\n}');
      const node = getJsonNode();

      addObjectField(node, 'temp', 'string');
      expect(node.has('temp')).toBe(true);

      deleteObjectField(node, 'temp');
      expect(node.has('temp')).toBe(false);

      const output = serializeNode(node);
      expect(output).toContain('name');
      expect(output).not.toContain('temp');
    });

    it('删除不存在的字段返回 false', () => {
      setupDocument('{\n  "name": "test"\n}');
      const node = getJsonNode();

      const ok = deleteObjectField(node, 'missing');
      expect(ok).toBe(false);
    });

    it('添加重复 key 返回 false 且不修改节点', () => {
      setupDocument('{\n  "name": "test"\n}');
      const node = getJsonNode();

      const ok = addObjectField(node, 'name', 'string');
      expect(ok).toBe(false);
      expect(node.get('name').toJSON()).toBe('test');
    });
  });

  describe('场景三：打开 → 添加数组元素 → 移动 → 删除 → 验证', () => {
    it('数组完整操作周期：添加 → 移动 → 删除', () => {
      setupDocument('{\n  "items": ["a", "b", "c"]\n}');
      const node = getJsonNode();
      const arr = node.get('items') as JsonArrayNode;

      addArrayElement(arr, 'string');
      expect(arr.elements).toHaveLength(4);
      expect(arr.elements[3].toJSON()).toBe('');

      moveArrayElement(arr, 0, 2);
      expect(arr.elements[0].toJSON()).toBe('b');
      expect(arr.elements[1].toJSON()).toBe('c');
      expect(arr.elements[2].toJSON()).toBe('a');

      deleteArrayElement(arr, 1);
      expect(arr.elements).toHaveLength(3);
      expect(arr.elements[0].toJSON()).toBe('b');
      expect(arr.elements[1].toJSON()).toBe('a');
      expect(arr.elements[2].toJSON()).toBe('');

      const output = serializeNode(node);
      const reparse = parseJson5(output);
      expect(reparse.success).toBe(true);
    });

    it('添加数组元素到指定位置', () => {
      setupDocument('{\n  "items": [1, 2, 3]\n}');
      const node = getJsonNode();
      const arr = node.get('items') as JsonArrayNode;

      addArrayElement(arr, 'number', 1);
      expect(arr.elements).toHaveLength(4);
      expect(arr.elements[0].toJSON()).toBe(1);
      expect(arr.elements[1].toJSON()).toBe(0);
      expect(arr.elements[2].toJSON()).toBe(2);
      expect(arr.elements[3].toJSON()).toBe(3);
    });

    it('数组操作后序列化仍为有效 JSON5', () => {
      setupDocument('{\n  "items": [1, 2, 3]\n}');
      const node = getJsonNode();
      const arr = node.get('items') as JsonArrayNode;

      addArrayElement(arr, 'object');
      moveArrayElement(arr, 0, 3);
      deleteArrayElement(arr, 1);

      const output = serializeNode(node);
      expect(output).toContain('items');

      const reparse = parseJson5(output);
      expect(reparse.success).toBe(true);
      if (reparse.success) {
        const reparsedArr = (reparse.node as JsonObjectNode).get('items') as JsonArrayNode;
        expect(reparsedArr.elements).toHaveLength(3);
      }
    });

    it('空数组添加元素后删除恢复为空', () => {
      setupDocument('{\n  "items": []\n}');
      const node = getJsonNode();
      const arr = node.get('items') as JsonArrayNode;

      expect(arr.elements).toHaveLength(0);

      addArrayElement(arr, 'string');
      expect(arr.elements).toHaveLength(1);

      deleteArrayElement(arr, 0);
      expect(arr.elements).toHaveLength(0);
    });

    it('out-of-bounds 操作返回 false', () => {
      setupDocument('{\n  "items": ["a"]\n}');
      const node = getJsonNode();
      const arr = node.get('items') as JsonArrayNode;

      expect(addArrayElement(arr, 'string', 5)).toBe(false);
      expect(deleteArrayElement(arr, 5)).toBe(false);
      expect(moveArrayElement(arr, 0, 5)).toBe(false);
    });
  });

  describe('场景四：验证 — 空键名检测阻止非法操作', () => {
    it('空键名被 validateKey 检测为 error', () => {
      const errors = validateKey('', ['name', 'age']);
      expect(errors).toHaveLength(1);
      expect(errors[0].severity).toBe('error');
      expect(errors[0].message).toContain('不能为空');
    });

    it('AST 操作拒绝添加空键名字段', () => {
      setupDocument('{\n  "name": "test"\n}');
      const node = getJsonNode();

      const ok = addObjectField(node, '', 'string');
      expect(ok).toBe(false);
      expect(node.get('name').toJSON()).toBe('test');
    });

    it('validateJsonNode 检测到空键名并返回正确路径', () => {
      const node = parseJson5('{"": "value"}');
      expect(node.success).toBe(true);
      if (!node.success) return;

      const errors = validateJsonNode(node.node);
      const emptyKeyErrors = errors.filter(
        (e) => e.key === '' && e.severity === 'error',
      );
      expect(emptyKeyErrors.length).toBeGreaterThanOrEqual(1);
      expect(emptyKeyErrors[0].path).toBe('/');
    });

    it('validateJsonNode 检测到嵌套空键名并返回正确路径', () => {
      const node = parseJson5('{"config": {"": "value"}}');
      expect(node.success).toBe(true);
      if (!node.success) return;

      const errors = validateJsonNode(node.node);
      const emptyKeyErrors = errors.filter(
        (e) => e.key === '' && e.severity === 'error',
      );
      expect(emptyKeyErrors.length).toBeGreaterThanOrEqual(1);
      expect(emptyKeyErrors[0].path).toBe('/config');
    });

    it('validateJsonNode 对有效对象返回空错误数组', () => {
      const node = parseJson5('{"name": "test", "age": 18}');
      expect(node.success).toBe(true);
      if (!node.success) return;

      const errors = validateJsonNode(node.node);
      expect(errors).toHaveLength(0);
    });

    it('验证与 store 打开内容的集成：有效对象无错误', () => {
      setupDocument('{\n  "name": "test",\n  "version": "1.0.0"\n}');
      const node = getJsonNode();

      const errors = validateJsonNode(node);
      expect(errors).toHaveLength(0);
    });
  });

  describe('场景五：无损往返 — parse → modify → serialize → re-parse → verify', () => {
    it('修改值后保留行尾注释', () => {
      const content = `{
  "name": "test", // 用户名
  "version": "1.0.0", // 版本号
}`;
      setupDocument(content);
      const node = getJsonNode();

      setNodeValue(node, 'version', '2.0.0');

      const output = serializeNode(node);
      expect(output).toContain('用户名');
      expect(output).toContain('版本号');
      expect(output).toContain('2.0.0');

      const reparse = parseJson5(output);
      expect(reparse.success).toBe(true);
      if (reparse.success) {
        expect(getNodeValue(reparse.node as JsonObjectNode, 'version')).toBe('2.0.0');
      }
    });

    it('修改值后保留行首注释', () => {
      const content = `{
  // 这是 name 字段
  "name": "test",
  // 这是 value 字段
  "value": 42,
}`;
      setupDocument(content);
      const node = getJsonNode();

      setNodeValue(node, 'value', 100);

      const output = serializeNode(node);
      expect(output).toContain('这是 name 字段');
      expect(output).toContain('这是 value 字段');
      expect(output).toContain('100');
    });

    it('修改值后保留多行注释', () => {
      const content = `{
  /*
   * 配置信息
   * 详细描述
   */
  "config": "default",
}`;
      setupDocument(content);
      const node = getJsonNode();

      setNodeValue(node, 'config', 'custom');

      const output = serializeNode(node);
      expect(output).toContain('配置信息');
      expect(output).toContain('详细描述');
      expect(output).toContain('"custom"');
    });

    it('修改值后输出仍是有效 JSON5（尾部逗号保留）', () => {
      const content = `{
  "name": "test",
  "value": 1,
}`;
      setupDocument(content);
      const node = getJsonNode();

      setNodeValue(node, 'value', 2);

      const output = serializeNode(node);
      const reparse = parseJson5(output);
      expect(reparse.success).toBe(true);
    });

    it('完整往返：多次修改后注释保留且结构一致', () => {
      const content = `{
  // 应用配置
  "app": {
    "name": "MyApp",
    "version": "1.0.0",
  },
  // 功能开关
  "features": {
    "darkMode": false,
    "notifications": true,
  },
}`;
      setupDocument(content);
      const node = getJsonNode();

      setNodeValue(node, 'app', { name: 'NewApp', version: '2.0.0' });
      setNodeValue(node, 'features', { darkMode: true, notifications: false });

      const output = serializeNode(node);
      expect(output).toContain('应用配置');
      expect(output).toContain('功能开关');

      const reparse = parseJson5(output);
      expect(reparse.success).toBe(true);
      if (!reparse.success) return;

      const reparsedNode = reparse.node as JsonObjectNode;
      const app = reparsedNode.get('app')?.toJSON() as Record<string, unknown>;
      expect(app.name).toBe('NewApp');
      expect(app.version).toBe('2.0.0');

      const features = reparsedNode.get('features')?.toJSON() as Record<string, unknown>;
      expect(features.darkMode).toBe(true);
      expect(features.notifications).toBe(false);
    });

    it('AST 操作后注释保留：添加/删除字段', () => {
      const content = `{
  // 原始配置
  "name": "test",
  // 版本
  "version": "1.0.0",
}`;
      setupDocument(content);
      const node = getJsonNode();

      addObjectField(node, 'temp', 'string');
      const afterAdd = serializeNode(node);
      expect(afterAdd).toContain('原始配置');
      expect(afterAdd).toContain('版本');
      expect(afterAdd).toContain('temp');

      deleteObjectField(node, 'temp');
      const afterDelete = serializeNode(node);
      expect(afterDelete).toContain('原始配置');
      expect(afterDelete).toContain('版本');
      expect(afterDelete).not.toContain('temp');
    });

    it('数组操作后注释保留：添加/移动/删除元素', () => {
      const content = `{
  // 列表数据
  "items": [1, 2, 3],
}`;
      setupDocument(content);
      const node = getJsonNode();
      const arr = node.get('items') as JsonArrayNode;

      addArrayElement(arr, 'number');
      moveArrayElement(arr, 0, 3);
      deleteArrayElement(arr, 0);

      const output = serializeNode(node);
      expect(output).toContain('列表数据');

      const reparse = parseJson5(output);
      expect(reparse.success).toBe(true);
    });
  });

  describe('场景六：Diff 集成 — 编辑后计算变更', () => {
    it('修改值后 diff 正确报告变更', () => {
      const original = '{"name": "old", "version": "1.0"}';
      setupDocument(original);
      const node = getJsonNode();

      setNodeValue(node, 'name', 'new');
      setNodeValue(node, 'version', '2.0');

      const modified = serializeNode(node);

      const reparseOld = parseJson5(original);
      const reparseNew = parseJson5(modified);
      expect(reparseOld.success).toBe(true);
      expect(reparseNew.success).toBe(true);
      if (!reparseOld.success || !reparseNew.success) return;

      const oldJson = JSON.stringify(reparseOld.node.toJSON());
      const newJson = JSON.stringify(reparseNew.node.toJSON());

      const changes = computePathChanges(oldJson, newJson);
      expect(changes.length).toBeGreaterThanOrEqual(2);

      const nameChange = changes.find((c) => c.path === '/name');
      expect(nameChange).toBeDefined();
      expect(nameChange!.type).toBe('modified');
      expect(nameChange!.oldValue).toBe('old');
      expect(nameChange!.newValue).toBe('new');
    });

    it('添加字段后 diff 报告新增', () => {
      const original = '{"name": "test"}';
      setupDocument(original);
      const node = getJsonNode();

      addObjectField(node, 'email', 'string');

      const modified = serializeNode(node);

      const reparseOld = parseJson5(original);
      const reparseNew = parseJson5(modified);
      expect(reparseOld.success).toBe(true);
      expect(reparseNew.success).toBe(true);
      if (!reparseOld.success || !reparseNew.success) return;

      const oldJson = JSON.stringify(reparseOld.node.toJSON());
      const newJson = JSON.stringify(reparseNew.node.toJSON());

      const changes = computePathChanges(oldJson, newJson);
      const addedChange = changes.find(
        (c) => c.path === '/email' && c.type === 'added',
      );
      expect(addedChange).toBeDefined();
    });

    it('删除字段后 diff 报告移除', () => {
      const original = '{"name": "test", "version": "1.0"}';
      setupDocument(original);
      const node = getJsonNode();

      deleteObjectField(node, 'version');

      const modified = serializeNode(node);

      const reparseOld = parseJson5(original);
      const reparseNew = parseJson5(modified);
      expect(reparseOld.success).toBe(true);
      expect(reparseNew.success).toBe(true);
      if (!reparseOld.success || !reparseNew.success) return;

      const oldJson = JSON.stringify(reparseOld.node.toJSON());
      const newJson = JSON.stringify(reparseNew.node.toJSON());

      const changes = computePathChanges(oldJson, newJson);
      const removedChange = changes.find(
        (c) => c.path === '/version' && c.type === 'removed',
      );
      expect(removedChange).toBeDefined();
    });

    it('无修改时 diff 报告无变更', () => {
      const content = '{"name": "test", "version": "1.0"}';
      setupDocument(content);

      const serialized = getSerialized();

      const reparse1 = parseJson5(content);
      const reparse2 = parseJson5(serialized);
      expect(reparse1.success).toBe(true);
      expect(reparse2.success).toBe(true);
      if (!reparse1.success || !reparse2.success) return;

      const json1 = JSON.stringify(reparse1.node.toJSON());
      const json2 = JSON.stringify(reparse2.node.toJSON());

      const changes = computePathChanges(json1, json2);
      expect(changes).toEqual([]);
    });
  });

  describe('场景七：Store 生命周期 — 打开/解析/错误处理', () => {
    it('openContent 成功后 parseStatus 为 success', () => {
      setupDocument('{"name": "test"}');
      expect(useDocumentStore.getState().parseStatus).toBe('success');
      expect(useDocumentStore.getState().error).toBeNull();
    });

    it('openContent 失败后 parseStatus 为 error', () => {
      useDocumentStore.getState().openContent('{ invalid json');
      expect(useDocumentStore.getState().parseStatus).toBe('error');
      expect(useDocumentStore.getState().error).not.toBeNull();
    });

    it('openContent 设置正确的文件路径', () => {
      setupDocument('{"name": "test"}', '/path/to/file.json');
      expect(useDocumentStore.getState().document?.filePath).toBe('/path/to/file.json');
    });

    it('openContent 根据文件扩展名设置 format', () => {
      setupDocument('{"name": "test"}', '/test.json5');
      expect(useDocumentStore.getState().document?.format).toBe('json5');

      setupDocument('{"name": "test"}', '/test.json');
      expect(useDocumentStore.getState().document?.format).toBe('json');
    });

    it('getSerializedContent 在无文档时返回 null', () => {
      expect(useDocumentStore.getState().getSerializedContent()).toBeNull();
    });

    it('updateNodeValue 在无文档时返回 false', () => {
      const result = useDocumentStore.getState().updateNodeValue('', 'key', 'value');
      expect(result).toBe(false);
    });
  });

  describe('场景八：复杂场景 — 嵌套对象编辑与完整往返', () => {
    it('编辑嵌套对象后 undo 恢复原始嵌套结构', () => {
      const content = `{
  "database": {
    "host": "localhost",
    "port": 5432,
  },
}`;
      setupDocument(content);

      useDocumentStore.getState().updateNodeValue('', 'database', {
        host: 'remote-host',
        port: 3306,
      });

      const afterEdit = getSerialized();
      expect(afterEdit).toContain('remote-host');
      expect(afterEdit).toContain('3306');

      getTemporal().undo();
      const afterUndo = getSerialized();
      expect(afterUndo).toContain('localhost');
      expect(afterUndo).toContain('5432');
    });

    it('编辑数组后 undo 恢复原始数组', () => {
      const content = `{
  "tags": ["a", "b", "c"],
}`;
      setupDocument(content);

      useDocumentStore.getState().updateNodeValue('', 'tags', ['x', 'y']);

      const afterEdit = getSerialized();
      expect(afterEdit).toContain('"x"');
      expect(afterEdit).toContain('"y"');

      getTemporal().undo();
      const afterUndo = getSerialized();
      expect(afterUndo).toContain('"a"');
      expect(afterUndo).toContain('"b"');
      expect(afterUndo).toContain('"c"');
    });

    it('混合操作：updateNodeValue + AST 操作后序列化仍有效', () => {
      const content = `{
  // 配置
  "name": "test",
  "items": [1, 2],
}`;
      setupDocument(content);

      useDocumentStore.getState().updateNodeValue('', 'name', 'modified');

      const node = getJsonNode();
      const arr = node.get('items') as JsonArrayNode;
      addArrayElement(arr, 'number');

      const output = serializeNode(node);
      expect(output).toContain('modified');
      expect(output).toContain('配置');

      const reparse = parseJson5(output);
      expect(reparse.success).toBe(true);
      if (reparse.success) {
        const reparsedNode = reparse.node as JsonObjectNode;
        expect(reparsedNode.get('name').toJSON()).toBe('modified');
        expect(
          (reparsedNode.get('items') as JsonArrayNode).elements,
        ).toHaveLength(3);
      }
    });

    it('JSON5 特性保留：单引号、尾部逗号', () => {
      const content = `{
  'name': 'test',
  'value': 42,
}`;
      setupDocument(content, '/test.json5');
      const node = getJsonNode();

      setNodeValue(node, 'value', 100);

      const output = serializeNode(node);
      const reparse = parseJson5(output);
      expect(reparse.success).toBe(true);
    });

    it('空对象的完整编辑周期：添加字段 → 设置值 → 序列化 → 重新解析', () => {
      setupDocument('{}');
      const node = getJsonNode();

      addObjectField(node, 'name', 'string');
      addObjectField(node, 'count', 'number');

      setNodeValue(node, 'name', 'hello');
      setNodeValue(node, 'count', 42);

      const output = serializeNode(node);
      expect(output).toContain('"hello"');
      expect(output).toContain('42');

      const reparse = parseJson5(output);
      expect(reparse.success).toBe(true);
      if (reparse.success) {
        const reparsedNode = reparse.node as JsonObjectNode;
        expect(reparsedNode.get('name').toJSON()).toBe('hello');
        expect(reparsedNode.get('count').toJSON()).toBe(42);
      }
    });
  });
});
