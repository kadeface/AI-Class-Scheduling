/**
 * Textarea组件
 * 
 * 基于HTML textarea的Textarea组件实现
 */

import * as React from 'react';
import { cn } from '@/lib/utils';

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

/**
 * Textarea组件
 * 
 * Args:
 *   className: 额外的CSS类名
 *   ...props: 其他textarea属性
 * 
 * Returns:
 *   React.ReactElement: Textarea组件
 */
const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          'flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Textarea.displayName = 'Textarea';

export { Textarea };