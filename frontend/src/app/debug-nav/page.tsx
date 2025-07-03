/**
 * 导航调试页面
 * 
 * 用于检查导航配置数据的结构
 */

'use client';

import React from 'react';
import { navigationItems } from '@/lib/navigation';

export default function DebugNavPage() {
  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">导航配置调试</h1>
      
      <div className="bg-gray-100 p-4 rounded-lg">
        <h2 className="text-lg font-semibold mb-4">原始导航数据：</h2>
        <pre className="text-sm overflow-auto bg-white p-4 rounded border">
          {JSON.stringify(navigationItems, null, 2)}
        </pre>
      </div>
      
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">导航结构分析：</h2>
        {navigationItems.map((item) => (
          <div key={item.id} className="border p-4 rounded">
            <div className="font-medium">
              {item.label} (ID: {item.id})
            </div>
            <div className="text-sm text-gray-600">
              路径: {item.href}
            </div>
            {item.children && item.children.length > 0 && (
              <div className="mt-2">
                <div className="text-sm font-medium">子菜单 ({item.children.length}个):</div>
                <ul className="ml-4 space-y-1">
                  {item.children.map((child) => (
                    <li key={child.id} className="text-sm">
                      • {child.label} ({child.href})
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
} 