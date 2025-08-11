/**
 * 基础数据管理首页
 * 
 * 展示各个管理模块的入口和概览信息
 */

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { 
  Users, 
  GraduationCap, 
  School, 
  BookOpen, 
  MapPin,
  ArrowRight
} from 'lucide-react';

// 强制动态渲染以绕过构建问题
export const dynamic = 'force-dynamic';

/**
 * 管理模块卡片组件
 */
const ModuleCard = ({
  title,
  description,
  href,
  icon: Icon,
  count
}: {
  title: string;
  description: string;
  href: string;
  icon: any;
  count?: number;
}) => (
  <Link href={href} className="block">
    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900 rounded-lg flex items-center justify-center">
            <Icon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white">{title}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{description}</p>
            {count !== undefined && (
              <p className="text-sm font-medium text-blue-600 dark:text-blue-400 mt-2">
                当前数量: {count}
              </p>
            )}
          </div>
        </div>
        <ArrowRight className="h-5 w-5 text-gray-400" />
      </div>
    </div>
  </Link>
);

/**
 * 基础数据管理页面
 * 
 * Returns:
 *   React.ReactElement: 管理首页组件
 */
export default function ManagementPage() {
  return (
    <div className="space-y-6">
      {/* 页面标题和描述 */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">基础数据管理</h1>
        <p className="text-gray-600 dark:text-gray-400">
          管理系统的基础数据，包括用户、教师、班级、课程和场室信息
        </p>
      </div>

      {/* 管理模块网格 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <ModuleCard
          title="用户管理"
          description="管理系统用户账户和权限"
          href="/management/users"
          icon={Users}
          count={156}
        />
        
        <ModuleCard
          title="教师管理"
          description="管理教师基本信息和课程安排"
          href="/management/teachers"
          icon={GraduationCap}
          count={45}
        />
        
        <ModuleCard
          title="班级管理"
          description="管理班级信息和学生分配"
          href="/management/classes"
          icon={School}
          count={24}
        />
        
        <ModuleCard
          title="课程管理"
          description="管理课程设置和课时安排"
          href="/management/courses"
          icon={BookOpen}
          count={18}
        />
        
        <ModuleCard
          title="场室管理"
          description="管理教室、实验室等场地信息"
          href="/management/rooms"
          icon={MapPin}
          count={32}
        />
      </div>

      {/* 快捷操作区域 */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">快捷操作</h3>
        <div className="flex flex-wrap gap-3">
          <Button size="sm">
            <Users className="h-4 w-4 mr-2" />
            新增用户
          </Button>
          <Button variant="outline" size="sm">
            <GraduationCap className="h-4 w-4 mr-2" />
            添加教师
          </Button>
          <Button variant="outline" size="sm">
            <School className="h-4 w-4 mr-2" />
            创建班级
          </Button>
          <Button variant="outline" size="sm">
            <BookOpen className="h-4 w-4 mr-2" />
            新增课程
          </Button>
          <Button variant="outline" size="sm">
            <MapPin className="h-4 w-4 mr-2" />
            添加场室
          </Button>
        </div>
      </div>
    </div>
  );
}