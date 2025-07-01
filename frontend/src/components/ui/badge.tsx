/**
 * Badge组件
 * 
 * 基于Radix UI的Badge组件实现
 */

import * as React from 'react';
import { cn } from '@/lib/utils';

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'secondary' | 'outline' | 'destructive';
}

/**
 * Badge组件
 * 
 * Args:
 *   className: 额外的CSS类名
 *   variant: Badge变体样式
 *   children: 子元素内容
 *   ...props: 其他HTML div属性
 * 
 * Returns:
 *   React.ReactElement: Badge组件
 */
const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(
  ({ className, variant = 'default', ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
          {
            'border-transparent bg-primary text-primary-foreground hover:bg-primary/80':
              variant === 'default',
            'border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80':
              variant === 'secondary',
            'text-foreground': variant === 'outline',
            'border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80':
              variant === 'destructive',
          },
          className
        )}
        {...props}
      />
    );
  }
);

Badge.displayName = 'Badge';

export { Badge };