/**
 * 仪表盘布局组件
 * 
 * 提供系统的主要布局结构，包括侧边栏、顶部导航和主内容区域
 */

'use client';

import React from 'react';
import { Sidebar } from './sidebar';
import { Header } from './header';
import { cn } from '@/lib/utils';

/**
 * DashboardLayout组件属性接口
 */
export interface DashboardLayoutProps {
  children: React.ReactNode;
  title?: string;
  className?: string;
}

/**
 * DashboardLayout组件
 * 
 * Args:
 *   children: 主内容区域的子组件
 *   title: 页面标题
 *   className: 额外的CSS类名
 * 
 * Returns:
 *   React.ReactElement: 仪表盘布局组件
 */
export function DashboardLayout({
  children,
  title,
  className
}: DashboardLayoutProps) {
  return (
    <div className={cn("flex h-screen bg-gray-50 dark:bg-gray-900", className)}>
      {/* 侧边栏 */}
      <Sidebar />

      {/* 主内容区域 */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* 顶部导航 */}
        <Header title={title} />

        {/* 内容区域 */}
        <main className="flex-1 overflow-auto">
          <div className="p-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}