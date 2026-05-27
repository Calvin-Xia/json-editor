import { describe, it, expect, beforeEach } from 'vitest';
import { useDocumentStore } from '../src/store/documentStore';
import { parseJson5 } from '../src/core/parser';

describe('Undo/Redo 集成测试', () => {
  beforeEach(() => {
    useDocumentStore.setState({
      document: null,
      parseStatus: 'idle',
      error: null,
    });
    useDocumentStore.temporal.getState().clear();
  });

  const setupDocument = (content: string) => {
    const result = parseJson5(content);
    expect(result.success).toBe(true);
    if (!result.success) return;

    useDocumentStore.temporal.getState().pause();
    useDocumentStore.setState({
      document: {
        filePath: '/test.json5',
        originalContent: content,
        root: null,
        jsonNode: result.node,
        parseError: null,
        isModified: false,
        encoding: 'utf-8',
        format: 'json5' as const,
      },
      parseStatus: 'success',
      error: null,
    });
    useDocumentStore.temporal.getState().resume();
    useDocumentStore.temporal.getState().clear();
  };

  describe('updateNodeValue 创建历史条目', () => {
    it('应该在 updateNodeValue 后产生历史记录', () => {
      setupDocument('{\n  "name": "test"\n}');

      const { pastStates } = useDocumentStore.temporal.getState();
      expect(pastStates.length).toBe(0);

      useDocumentStore.getState().updateNodeValue('', 'name', 'modified');

      const { pastStates: afterPastStates } = useDocumentStore.temporal.getState();
      expect(afterPastStates.length).toBe(1);
    });

    it('应该在多次修改后产生多条历史记录', () => {
      setupDocument('{\n  "name": "test",\n  "value": 1\n}');

      useDocumentStore.getState().updateNodeValue('', 'name', 'first');
      useDocumentStore.getState().updateNodeValue('', 'value', 2);

      const { pastStates } = useDocumentStore.temporal.getState();
      expect(pastStates.length).toBe(2);
    });
  });

  describe('undo() 恢复之前的文档状态', () => {
    it('应该在 undo 后恢复修改前的内容', () => {
      setupDocument('{\n  "name": "test"\n}');

      useDocumentStore.getState().updateNodeValue('', 'name', 'modified');

      const beforeUndo = useDocumentStore.getState().getSerializedContent();
      expect(beforeUndo).toContain('"modified"');

      useDocumentStore.temporal.getState().undo();

      const afterUndo = useDocumentStore.getState().getSerializedContent();
      expect(afterUndo).toContain('"test"');
      expect(afterUndo).not.toContain('"modified"');
    });

    it('应该在 undo 后恢复 isModified 状态', () => {
      setupDocument('{\n  "name": "test"\n}');

      useDocumentStore.getState().updateNodeValue('', 'name', 'modified');
      expect(useDocumentStore.getState().document?.isModified).toBe(true);

      useDocumentStore.temporal.getState().undo();

      expect(useDocumentStore.getState().document?.isModified).toBe(false);
    });

    it('应该支持多步 undo', () => {
      setupDocument('{\n  "name": "test",\n  "value": 1\n}');

      useDocumentStore.getState().updateNodeValue('', 'name', 'first');
      useDocumentStore.getState().updateNodeValue('', 'value', 2);

      useDocumentStore.temporal.getState().undo();
      const afterFirstUndo = useDocumentStore.getState().getSerializedContent();
      expect(afterFirstUndo).toContain('"first"');
      expect(afterFirstUndo).toContain('1');

      useDocumentStore.temporal.getState().undo();
      const afterSecondUndo = useDocumentStore.getState().getSerializedContent();
      expect(afterSecondUndo).toContain('"test"');
      expect(afterSecondUndo).toContain('1');
    });
  });

  describe('redo() 重新应用已撤销的状态', () => {
    it('应该在 redo 后重新应用修改', () => {
      setupDocument('{\n  "name": "test"\n}');

      useDocumentStore.getState().updateNodeValue('', 'name', 'modified');
      useDocumentStore.temporal.getState().undo();

      expect(useDocumentStore.getState().getSerializedContent()).toContain('"test"');

      useDocumentStore.temporal.getState().redo();

      expect(useDocumentStore.getState().getSerializedContent()).toContain('"modified"');
    });

    it('应该在 undo/redo 后保持一致的序列化内容', () => {
      setupDocument('{\n  "name": "test"\n}');

      useDocumentStore.getState().updateNodeValue('', 'name', 'modified');
      const afterModify = useDocumentStore.getState().getSerializedContent();

      useDocumentStore.temporal.getState().undo();
      useDocumentStore.temporal.getState().redo();

      const afterRedo = useDocumentStore.getState().getSerializedContent();
      expect(afterRedo).toBe(afterModify);
    });
  });

  describe('undo 后的新操作清空 redo 栈', () => {
    it('应该在 undo 后执行新操作时清空 futureStates', () => {
      setupDocument('{\n  "name": "test",\n  "value": 1\n}');

      useDocumentStore.getState().updateNodeValue('', 'name', 'first');
      useDocumentStore.getState().updateNodeValue('', 'value', 2);

      useDocumentStore.temporal.getState().undo();
      useDocumentStore.temporal.getState().undo();

      expect(useDocumentStore.temporal.getState().futureStates.length).toBe(2);

      useDocumentStore.getState().updateNodeValue('', 'name', 'new');

      expect(useDocumentStore.temporal.getState().futureStates.length).toBe(0);
    });
  });

  describe('canUndo()/canRedo() 状态检查', () => {
    it('应该在初始状态时 pastStates 和 futureStates 为空', () => {
      setupDocument('{\n  "name": "test"\n}');

      expect(useDocumentStore.temporal.getState().pastStates.length).toBe(0);
      expect(useDocumentStore.temporal.getState().futureStates.length).toBe(0);
    });

    it('应该在修改后 pastStates 不为空', () => {
      setupDocument('{\n  "name": "test"\n}');

      useDocumentStore.getState().updateNodeValue('', 'name', 'modified');

      expect(useDocumentStore.temporal.getState().pastStates.length).toBeGreaterThan(0);
      expect(useDocumentStore.temporal.getState().futureStates.length).toBe(0);
    });

    it('应该在 undo 后 futureStates 不为空', () => {
      setupDocument('{\n  "name": "test"\n}');

      useDocumentStore.getState().updateNodeValue('', 'name', 'modified');
      useDocumentStore.temporal.getState().undo();

      expect(useDocumentStore.temporal.getState().pastStates.length).toBe(0);
      expect(useDocumentStore.temporal.getState().futureStates.length).toBeGreaterThan(0);
    });

    it('应该在 redo 后恢复 pastStates 不为空', () => {
      setupDocument('{\n  "name": "test"\n}');

      useDocumentStore.getState().updateNodeValue('', 'name', 'modified');
      useDocumentStore.temporal.getState().undo();
      useDocumentStore.temporal.getState().redo();

      expect(useDocumentStore.temporal.getState().pastStates.length).toBeGreaterThan(0);
      expect(useDocumentStore.temporal.getState().futureStates.length).toBe(0);
    });
  });
});
