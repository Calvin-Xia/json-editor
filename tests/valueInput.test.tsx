// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import React from 'react';
import { render, screen, cleanup, fireEvent, act } from '@testing-library/react';
import ValueInput from '../src/components/FormEditor/ValueInput';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('ValueInput 组件', () => {
  describe('T1: 字符串类型渲染文本输入框', () => {
    it('应渲染文本输入框并显示初始值', () => {
      const handleChange = vi.fn();
      render(
        <ValueInput value="hello" type="string" onChange={handleChange} />
      );

      const input = screen.getByDisplayValue('hello');
      expect(input).toBeDefined();
      expect(input.tagName).toBe('INPUT');
      expect(input.getAttribute('type')).toBe('text');
    });

    it('输入后应调用 onChange 回调并传入字符串值', () => {
      const handleChange = vi.fn();

      render(
        <ValueInput value="" type="string" onChange={handleChange} />
      );

      const input = screen.getByRole('textbox');
      vi.useFakeTimers();
      fireEvent.change(input, { target: { value: 'world' } });

      act(() => {
        vi.advanceTimersByTime(350);
      });

      expect(handleChange).toHaveBeenCalledWith('world');
    });
  });

  describe('T2: 数字类型渲染数字输入框', () => {
    it('应渲染文本输入框并显示数字值', () => {
      const handleChange = vi.fn();
      render(
        <ValueInput value={42} type="number" onChange={handleChange} />
      );

      const input = screen.getByDisplayValue('42');
      expect(input).toBeDefined();
      expect(input.tagName).toBe('INPUT');
    });

    it('失焦时应验证并提交有效数字', () => {
      const handleChange = vi.fn();

      render(
        <ValueInput value={0} type="number" onChange={handleChange} />
      );

      const input = screen.getByRole('textbox');
      fireEvent.change(input, { target: { value: '3.14' } });
      fireEvent.blur(input);

      expect(handleChange).toHaveBeenCalledWith(3.14);
    });

    it('允许中间状态 "3." 不应立即报错', () => {
      const handleChange = vi.fn();

      render(
        <ValueInput value={0} type="number" onChange={handleChange} />
      );

      const input = screen.getByRole('textbox');
      fireEvent.change(input, { target: { value: '3.' } });

      const error = screen.queryByText(/请输入有效的数字/);
      expect(error).toBeNull();
    });
  });

  describe('T3: 布尔类型渲染下拉选择', () => {
    it('应渲染 select 下拉框并包含 true/false 选项', () => {
      const handleChange = vi.fn();
      render(
        <ValueInput value={true} type="boolean" onChange={handleChange} />
      );

      const select = screen.getByRole('combobox');
      expect(select).toBeDefined();
      expect(select.tagName).toBe('SELECT');

      const trueOption = screen.getByRole('option', { name: 'true' });
      const falseOption = screen.getByRole('option', { name: 'false' });
      expect(trueOption).toBeDefined();
      expect(falseOption).toBeDefined();
    });

    it('应显示当前布尔值为选中状态', () => {
      const handleChange = vi.fn();
      render(
        <ValueInput value={true} type="boolean" onChange={handleChange} />
      );

      const select = screen.getByRole('combobox') as HTMLSelectElement;
      expect(select.value).toBe('true');
    });

    it('切换选项应调用 onChange', () => {
      const handleChange = vi.fn();

      render(
        <ValueInput value={true} type="boolean" onChange={handleChange} />
      );

      const select = screen.getByRole('combobox');
      fireEvent.change(select, { target: { value: 'false' } });

      expect(handleChange).toHaveBeenCalledWith(false);
    });
  });

  describe('T4: null 类型渲染只读显示', () => {
    it('应渲染只读的 "null" 文本显示', () => {
      const handleChange = vi.fn();
      render(
        <ValueInput value={null} type="null" onChange={handleChange} />
      );

      const display = screen.getByText('null');
      expect(display).toBeDefined();
      const inputs = screen.queryAllByRole('textbox');
      expect(inputs.length).toBe(0);
    });

    it('null 类型不应有输入控件', () => {
      const handleChange = vi.fn();
      render(
        <ValueInput value={null} type="null" onChange={handleChange} />
      );

      expect(screen.queryByRole('combobox')).toBeNull();
      expect(screen.queryByRole('textbox')).toBeNull();
    });
  });

  describe('T5: 数字输入验证错误', () => {
    it('输入无效数字时应显示验证错误消息', () => {
      const handleChange = vi.fn();

      render(
        <ValueInput value={0} type="number" onChange={handleChange} />
      );

      const input = screen.getByRole('textbox');
      fireEvent.change(input, { target: { value: 'abc' } });
      fireEvent.blur(input);

      const error = screen.getByText('请输入有效的数字');
      expect(error).toBeDefined();
      expect(handleChange).not.toHaveBeenCalled();
    });

    it('空字符串数字输入应显示错误', () => {
      const handleChange = vi.fn();

      render(
        <ValueInput value={42} type="number" onChange={handleChange} />
      );

      const input = screen.getByRole('textbox');
      fireEvent.change(input, { target: { value: '' } });
      fireEvent.blur(input);

      const error = screen.getByText('请输入有效的数字');
      expect(error).toBeDefined();
      expect(handleChange).not.toHaveBeenCalled();
    });

    it('NaN 值输入应显示错误', () => {
      const handleChange = vi.fn();

      render(
        <ValueInput value={0} type="number" onChange={handleChange} />
      );

      const input = screen.getByRole('textbox');
      fireEvent.change(input, { target: { value: 'NaN' } });
      fireEvent.blur(input);

      const error = screen.getByText('请输入有效的数字');
      expect(error).toBeDefined();
      expect(handleChange).not.toHaveBeenCalled();
    });
  });

  describe('T6: Enter 键提交值', () => {
    it('字符串输入按 Enter 应提交当前值', () => {
      const handleChange = vi.fn();

      render(
        <ValueInput value="" type="string" onChange={handleChange} />
      );

      const input = screen.getByRole('textbox');
      fireEvent.change(input, { target: { value: 'test' } });
      fireEvent.keyDown(input, { key: 'Enter' });

      expect(handleChange).toHaveBeenCalledWith('test');
    });

    it('数字输入按 Enter 应提交有效值', () => {
      const handleChange = vi.fn();

      render(
        <ValueInput value={0} type="number" onChange={handleChange} />
      );

      const input = screen.getByRole('textbox');
      fireEvent.change(input, { target: { value: '99' } });
      fireEvent.keyDown(input, { key: 'Enter' });

      expect(handleChange).toHaveBeenCalledWith(99);
    });
  });

  describe('T7: Escape 键还原值', () => {
    it('字符串输入按 Escape 应还原为原始值', () => {
      const handleChange = vi.fn();

      render(
        <ValueInput value="original" type="string" onChange={handleChange} />
      );

      const input = screen.getByRole('textbox') as HTMLInputElement;
      fireEvent.change(input, { target: { value: 'modified' } });
      fireEvent.keyDown(input, { key: 'Escape' });

      expect(input.value).toBe('original');
      expect(handleChange).not.toHaveBeenCalled();
    });

    it('数字输入按 Escape 应还原为原始值', () => {
      const handleChange = vi.fn();

      render(
        <ValueInput value={42} type="number" onChange={handleChange} />
      );

      const input = screen.getByRole('textbox') as HTMLInputElement;
      fireEvent.change(input, { target: { value: '99' } });
      fireEvent.keyDown(input, { key: 'Escape' });

      expect(input.value).toBe('42');
      expect(handleChange).not.toHaveBeenCalled();
    });
  });

  describe('T8: disabled 属性', () => {
    it('disabled 时输入框应被禁用', () => {
      const handleChange = vi.fn();
      render(
        <ValueInput value="test" type="string" onChange={handleChange} disabled />
      );

      const input = screen.getByRole('textbox') as HTMLInputElement;
      expect(input.disabled).toBe(true);
    });

    it('disabled 时布尔 select 应被禁用', () => {
      const handleChange = vi.fn();
      render(
        <ValueInput value={true} type="boolean" onChange={handleChange} disabled />
      );

      const select = screen.getByRole('combobox') as HTMLSelectElement;
      expect(select.disabled).toBe(true);
    });
  });
});
