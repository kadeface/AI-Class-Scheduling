import React from 'react';
import { Sidebar } from '@/components/layout/sidebar';

/**
 * 报告模块布局组件
 * 
 * Args:
 *   children: 子页面内容
 * 
 * Returns:
 *   React.ReactElement: 报告模块布局
 */
export default function ReportsLayout(props: any) {
  const { children } = props;
  
  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-950">
      <Sidebar />
      <main className="flex-1 p-6 overflow-auto">
        {children}
      </main>
    </div>
  );
}
