/**
 * 管理模块布局
 * 
 * 为所有管理页面提供统一的布局结构
 */

import { DashboardLayout } from '@/components/layout/dashboard-layout';

/**
 * 管理布局组件属性接口
 */
interface ManagementLayoutProps {
  children: React.ReactNode;
}

/**
 * 管理布局组件
 * 
 * Args:
 *   children: 子页面内容
 * 
 * Returns:
 *   React.ReactElement: 管理模块布局
 */
export default function ManagementLayout({ children }: ManagementLayoutProps) {
  return (
    <DashboardLayout title="基础数据管理">
      {children}
    </DashboardLayout>
  );
}