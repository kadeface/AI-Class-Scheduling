/**
 * 导航相关类型定义
 * 
 * 定义导航菜单项、面包屑、页面布局等相关类型
 */

import { LucideIcon } from 'lucide-react';

/**
 * 导航菜单项接口
 */
export interface NavigationItem {
  id: string;
  label: string;
  href: string;
  icon?: LucideIcon;
  children?: NavigationItem[];
  badge?: string | number;
  disabled?: boolean;
}

/**
 * 面包屑项接口
 */
export interface BreadcrumbItem {
  label: string;
  href?: string;
}

/**
 * 页面配置接口
 */
export interface PageConfig {
  title: string;
  description?: string;
  breadcrumbs?: BreadcrumbItem[];
  actions?: React.ReactNode;
}