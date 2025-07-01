/**
 * 对话框组件
 * 
 * 提供模态对话框功能，用于表单编辑、确认操作等场景
 */

'use client';

import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from './button';

/**
 * 对话框属性接口
 */
interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
  className?: string;
}

/**
 * 对话框内容属性接口
 */
interface DialogContentProps {
  className?: string;
  children: React.ReactNode;
}

/**
 * 对话框头部属性接口
 */
interface DialogHeaderProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * 对话框标题属性接口
 */
interface DialogTitleProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * 对话框描述属性接口
 */
interface DialogDescriptionProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * 对话框底部属性接口
 */
interface DialogFooterProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * 对话框根组件
 * 
 * Args:
 *   open: 是否打开
 *   onOpenChange: 打开状态变化回调
 *   children: 子组件
 *   className: 自定义样式类
 * 
 * Returns:
 *   React.ReactElement: 对话框组件
 */export function Dialog({ open, onOpenChange, children, className }: DialogProps) {
  // 处理 ESC 键关闭
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && open) {
        onOpenChange(false);
      }
    };

    if (open) {
      document.addEventListener('keydown', handleEscape);
      // 防止背景滚动
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [open, onOpenChange]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      {/* 背景遮罩 */}
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm"
        onClick={() => onOpenChange(false)}
      />
      
      {/* 对话框容器 */}
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <div className={cn(
          'relative bg-white dark:bg-gray-800 rounded-lg shadow-xl',
          'w-full max-w-lg max-h-[90vh] overflow-hidden',
          'transform transition-all duration-200 ease-out',
          className
        )}>
          {children}
        </div>
      </div>
    </div>
  );
}

/**
 * 对话框内容组件
 */
export function DialogContent({ children, className }: DialogContentProps) {
  return (
    <div className={cn('flex flex-col max-h-[90vh]', className)}>
      {children}
    </div>
  );
}

/**
 * 对话框头部组件
 */
export function DialogHeader({ children, className }: DialogHeaderProps) {
  return (
    <div className={cn(
      'flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700',
      className
    )}>
      {children}
    </div>
  );
}

/**
 * 对话框标题组件
 */
export function DialogTitle({ children, className }: DialogTitleProps) {
  return (
    <h2 className={cn(
      'text-lg font-semibold text-gray-900 dark:text-white',
      className
    )}>
      {children}
    </h2>
  );
}

/**
 * 对话框描述组件
 */
export function DialogDescription({ children, className }: DialogDescriptionProps) {
  return (
    <p className={cn(
      'text-sm text-gray-600 dark:text-gray-400 mt-1',
      className
    )}>
      {children}
    </p>
  );
}

/**
 * 对话框底部组件
 */
export function DialogFooter({ children, className }: DialogFooterProps) {
  return (
    <div className={cn(
      'flex items-center justify-end space-x-3 p-6 border-t border-gray-200 dark:border-gray-700',
      className
    )}>
      {children}
    </div>
  );
}

/**
 * 对话框关闭按钮组件
 */
interface DialogCloseProps {
  onClose: () => void;
  className?: string;
}

export function DialogClose({ onClose, className }: DialogCloseProps) {
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={onClose}
      className={cn('h-8 w-8 p-0', className)}
    >
      <X className="h-4 w-4" />
    </Button>
  );
}