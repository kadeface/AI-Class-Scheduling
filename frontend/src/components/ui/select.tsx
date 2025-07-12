/**
 * 选择框组件
 * 
 * 提供统一样式的下拉选择框
 */

import React from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * 选择项接口
 */
export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

/**
 * 选择框属性接口
 */
export interface SelectProps {
  value?: string;
  onChange?: (value: string) => void;
  onValueChange?: (value: string) => void;  // 添加onValueChange支持
  options?: SelectOption[];  // 使options可选
  placeholder?: string;
  disabled?: boolean;
  error?: boolean;
  helperText?: string;
  label?: string;
  className?: string;
  required?: boolean;
  children?: React.ReactNode;  // 添加children支持，用于直接使用option元素
}

/**
 * 选择框组件
 * 
 * 已支持：
 *   - 动态options传递（支持大数据量选项，适合批量表单场景）
 *   - 受控/非受控用法
 *   - options与children二选一
 *   - 占位符、禁用、错误态、辅助文本
 * 
 * 扩展建议：
 *   - 如需支持分组（optgroup）、搜索、虚拟滚动等大数据优化，可在此基础上扩展
 *   - 如需自定义过滤逻辑（如按课程过滤教师），建议在父组件处理后传递options
 *   - 如需异步加载选项，可结合外部状态管理
 * 
 * Args:
 *   value: 当前值
 *   onChange: 值变化回调 (React.ChangeEvent)
 *   onValueChange: 值变化回调 (string)
 *   options: 选项列表
 *   placeholder: 占位符
 *   disabled: 是否禁用
 *   error: 是否有错误
 *   helperText: 帮助文本
 *   label: 标签文本
 *   className: 自定义样式类
 *   required: 是否必需
 *   children: 子元素(option元素)
 * 
 * Returns:
 *   React.ReactElement: 选择框组件
 */
export function Select({
  value,
  onChange,
  onValueChange,
  options,
  placeholder = '请选择',
  disabled = false,
  error = false,
  helperText,
  label,
  className,
  required = false,
  children,
}: SelectProps) {
  const selectId = React.useId();

  const handleChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const newValue = event.target.value;
    onChange?.(newValue);
    onValueChange?.(newValue);
  };

  return (
    <div className="space-y-1">
      {label && (
        <label 
          htmlFor={selectId}
          className="block text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      
      <div className="relative">
        <select
          id={selectId}
          value={value || ''}
          onChange={handleChange}
          disabled={disabled}
          className={cn(
            'flex h-10 w-full rounded-md border px-3 py-2 text-sm',
            'appearance-none cursor-pointer',
            'focus:outline-none focus:ring-2 focus:ring-offset-2',
            'disabled:cursor-not-allowed disabled:opacity-50',
            'dark:bg-gray-800 dark:text-white',
            // 正常状态
            !error && [
              'border-gray-300 dark:border-gray-600',
              'focus:border-blue-500 focus:ring-blue-500'
            ],
            // 错误状态
            error && [
              'border-red-300 dark:border-red-600',
              'focus:border-red-500 focus:ring-red-500',
              'bg-red-50 dark:bg-red-900/20'
            ],
            className
          )}
        >
          {/* 如果有children，使用children；否则使用options */}
          {children ? (
            <>
              {placeholder && (
                <option value="" disabled>
                  {placeholder}
                </option>
              )}
              {children}
            </>
          ) : (
            <>
              {placeholder && (
                <option value="" disabled>
                  {placeholder}
                </option>
              )}
              {options?.map((option) => (
                <option
                  key={option.value}
                  value={option.value}
                  disabled={option.disabled}
                >
                  {option.label}
                </option>
              ))}
            </>
          )}
        </select>
        
        {/* 下拉箭头图标 */}
        <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
      </div>
      
      {helperText && (
        <p className={cn(
          'text-xs',
          error ? 'text-red-600 dark:text-red-400' : 'text-gray-500 dark:text-gray-400'
        )}>
          {helperText}
        </p>
      )}
    </div>
  );
}