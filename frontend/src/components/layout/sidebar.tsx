/**
 * 侧边导航栏组件
 * 
 * 提供系统的主要导航功能，包括多级菜单和当前页面高亮
 */

'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { NavigationItem } from '@/types/navigation';
import { navigationItems } from '@/lib/navigation';
import { ScrollArea } from '@/components/ui/scroll-area';

/**
 * Sidebar组件属性接口
 */
export interface SidebarProps {
  className?: string;
}

/**
 * 导航项组件属性接口
 */
interface NavItemProps {
  item: NavigationItem;
  level?: number;
}

/**
 * 导航项组件
 * 
 * Args:
 *   item: 导航项数据
 *   level: 嵌套层级
 * 
 * Returns:
 *   React.ReactElement: 导航项组件
 */
const NavItem: React.FC<NavItemProps> = ({ item, level = 0 }) => {
  const pathname = usePathname();
  const hasChildren = item.children && item.children.length > 0;
  
  // 默认展开基础数据管理菜单
  const shouldDefaultOpen = item.id === 'management' || item.id === 'scheduling';
  const [isOpen, setIsOpen] = useState(shouldDefaultOpen);
  
  const isActive = pathname === item.href || 
    (hasChildren && item.children?.some(child => pathname.startsWith(child.href)));

  React.useEffect(() => {
    if (isActive && hasChildren) {
      setIsOpen(true);
    }
  }, [isActive, hasChildren]);

  const Icon = item.icon;
  
  // 使用Tailwind CSS类名而不是内联样式
  const getIndentClass = (level: number) => {
    switch (level) {
      case 0: return 'pl-3';
      case 1: return 'pl-8';
      case 2: return 'pl-12';
      default: return 'pl-16';
    }
  };

  return (
    <div className="w-full">
      {hasChildren ? (
        <button
          onClick={() => {
            console.log(`Toggling ${item.label}: ${!isOpen}`);
            setIsOpen(!isOpen);
          }}
          className={cn(
            "flex items-center justify-between w-full py-2 pr-3 text-sm rounded-lg transition-colors hover:bg-gray-100 dark:hover:bg-gray-800",
            getIndentClass(level),
            isActive && "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
          )}
        >
          <div className="flex items-center space-x-3">
            {Icon && <Icon className="h-4 w-4" />}
            <span className="font-medium">{item.label}</span>
            {item.badge && (
              <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-800 rounded-full dark:bg-blue-900 dark:text-blue-200">
                {item.badge}
              </span>
            )}
          </div>
          <motion.div
            animate={{ rotate: isOpen ? 90 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronRight className="h-4 w-4" />
          </motion.div>
        </button>
      ) : (
        <Link
          href={item.href}
          className={cn(
            "flex items-center space-x-3 py-2 pr-3 text-sm rounded-lg transition-colors hover:bg-gray-100 dark:hover:bg-gray-800",
            getIndentClass(level),
            pathname === item.href && "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
            item.disabled && "opacity-50 cursor-not-allowed"
          )}
        >
          {Icon && <Icon className="h-4 w-4" />}
          <span className="font-medium">{item.label}</span>
          {item.badge && (
            <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-800 rounded-full dark:bg-blue-900 dark:text-blue-200">
              {item.badge}
            </span>
          )}
        </Link>
      )}

      <AnimatePresence>
        {hasChildren && isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="mt-1 space-y-1">
              {item.children?.map((child) => {
                console.log(`Rendering child: ${child.label} (level ${level + 1})`);
                return (
                  <NavItem key={child.id} item={child} level={level + 1} />
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

/**
 * Sidebar组件
 * 
 * Args:
 *   className: 额外的CSS类名
 * 
 * Returns:
 *   React.ReactElement: 侧边导航栏组件
 */
export const Sidebar: React.FC<SidebarProps> = ({ className }) => {
  // 调试信息
  React.useEffect(() => {
    console.log('Sidebar rendered with navigationItems:', navigationItems);
  }, []);

  return (
    <div className={cn("w-64 h-full bg-white border-r border-gray-200 dark:bg-gray-900 dark:border-gray-800", className)}>
      <div className="p-6">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">智</span>
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900 dark:text-white">智能排课系统</h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">K-12版</p>
          </div>
        </div>
      </div>

      <ScrollArea className="flex-1 px-3">
        <nav className="space-y-1 pb-6">
          {navigationItems.map((item) => {
            console.log(`Rendering top-level item: ${item.label}`);
            return (
              <NavItem key={item.id} item={item} />
            );
          })}
        </nav>
      </ScrollArea>
    </div>
  );
};