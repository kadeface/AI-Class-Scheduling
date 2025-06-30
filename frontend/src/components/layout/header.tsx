/**
 * 页面头部组件
 * 
 * 提供页面标题、面包屑导航和用户操作区域
 */

'use client';

import React from 'react';
import Link from 'next/link';
import { Bell, Search, Settings, User, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/**
 * Header组件属性接口
 */
export interface HeaderProps {
  title?: string;
  className?: string;
}

/**
 * 面包屑组件
 * 
 * Returns:
 *   React.ReactElement: 面包屑导航组件
 */
const Breadcrumb: React.FC = () => {
  return (
    <nav className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
      <Link href="/" className="hover:text-gray-700 dark:hover:text-gray-200">
        首页
      </Link>
      <span>/</span>
      <span className="text-gray-900 dark:text-white">基础数据管理</span>
    </nav>
  );
};

/**
 * 用户菜单组件
 * 
 * Returns:
 *   React.ReactElement: 用户菜单组件
 */
const UserMenu: React.FC = () => {
  return (
    <div className="flex items-center space-x-4">
      {/* 搜索框 */}
      <div className="hidden md:flex items-center space-x-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="搜索..."
            className="pl-10 pr-4 py-2 w-64 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white"
          />
        </div>
      </div>

      {/* 通知按钮 */}
      <Button variant="ghost" size="icon" className="relative">
        <Bell className="h-5 w-5" />
        <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
          3
        </span>
      </Button>

      {/* 设置按钮 */}
      <Button variant="ghost" size="icon">
        <Settings className="h-5 w-5" />
      </Button>

      {/* 用户头像和菜单 */}
      <div className="relative group">
        <Button variant="ghost" className="flex items-center space-x-2 px-3">
          <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
            <User className="h-4 w-4 text-white" />
          </div>
          <div className="hidden md:block text-left">
            <div className="text-sm font-medium text-gray-900 dark:text-white">管理员</div>
            <div className="text-xs text-gray-500 dark:text-gray-400">admin@school.com</div>
          </div>
        </Button>

        {/* 下拉菜单 */}
        <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
          <div className="py-2">
            <Link
              href="/profile"
              className="flex items-center space-x-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <User className="h-4 w-4" />
              <span>个人资料</span>
            </Link>
            <Link
              href="/settings"
              className="flex items-center space-x-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <Settings className="h-4 w-4" />
              <span>系统设置</span>
            </Link>
            <hr className="my-2 border-gray-200 dark:border-gray-700" />
            <button className="flex items-center space-x-2 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950">
              <LogOut className="h-4 w-4" />
              <span>退出登录</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Header组件
 * 
 * Args:
 *   title: 页面标题
 *   className: 额外的CSS类名
 * 
 * Returns:
 *   React.ReactElement: 页面头部组件
 */
export const Header: React.FC<HeaderProps> = ({ title = "基础数据管理", className }) => {
  return (
    <header className={cn("bg-white border-b border-gray-200 dark:bg-gray-900 dark:border-gray-800", className)}>
      <div className="px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <Breadcrumb />
            <h1 className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">{title}</h1>
          </div>
          <UserMenu />
        </div>
      </div>
    </header>
  );
};