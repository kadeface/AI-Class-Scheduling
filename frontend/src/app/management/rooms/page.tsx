/**
 * 场室管理页面
 */

import { Button } from '@/components/ui/button';
import { Plus, Search, Filter } from 'lucide-react';

export default function RoomsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">场室管理</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            管理教室、实验室、功能室等场地信息
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          新增场室
        </Button>
      </div>

      <div className="flex items-center space-x-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="搜索场室名称、编号或类型..."
            className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white"
          />
        </div>
        <Button variant="outline">
          <Filter className="h-4 w-4 mr-2" />
          筛选
        </Button>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="p-6">
          <div className="text-center py-12">
            <div className="mx-auto w-24 h-24 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4">
              <Plus className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              开始管理场室
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-sm mx-auto">
              这里将显示场室列表。点击"新增场室"按钮来添加第一个场室。
            </p>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              新增场室
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}