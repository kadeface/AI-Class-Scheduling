/**
 * ScrollArea组件
 * 
 * 提供自定义滚动条的滚动区域组件
 */

import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * ScrollArea组件属性接口
 */
export interface ScrollAreaProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

/**
 * ScrollArea组件
 * 
 * Args:
 *   className: CSS类名
 *   children: 子元素
 *   ...props: 其他div属性
 * 
 * Returns:
 *   React.ReactElement: 滚动区域组件
 */
const ScrollArea = React.forwardRef<HTMLDivElement, ScrollAreaProps>(
  ({ className, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "relative overflow-auto",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
);

ScrollArea.displayName = "ScrollArea";

export { ScrollArea };