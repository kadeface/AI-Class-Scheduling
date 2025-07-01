/**
 * 输入框组件
 * 
 * 提供统一样式的输入框，支持各种输入类型和状态
 */

import React from 'react';
import { cn } from '@/lib/utils';

/**
 * 输入框属性接口
 */
export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
  helperText?: string;
  label?: string;
}

/**
 * 输入框组件
 * 
 * Args:
 *   className: 自定义样式类
 *   error: 是否有错误
 *   helperText: 帮助文本
 *   label: 标签文本
 *   ...props: 其他HTML input属性
 * 
 * Returns:
 *   React.ReactElement: 输入框组件
 */
export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, error, helperText, label, type, ...props }, ref) => {
    const inputId = React.useId();

    return (
      <div className="space-y-1">
        {label && (
          <label 
            htmlFor={inputId}
            className="block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            {label}
            {props.required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}
        
        <input
          id={inputId}
          type={type}
          className={cn(
            'flex h-10 w-full rounded-md border px-3 py-2 text-sm',
            'placeholder:text-gray-400 dark:placeholder:text-gray-500',
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
          ref={ref}
          {...props}
        />
        
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
);

Input.displayName = 'Input';