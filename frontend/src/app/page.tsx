"use client";

/**
 * 系统主页面
 * 
 * 展示系统仪表盘，包括统计概览、快捷操作和最近活动
 */

import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { 
  Users, 
  GraduationCap, 
  School, 
  BookOpen, 
  MapPin, 
  Calendar,
  TrendingUp,
  Activity,
  Clock
} from 'lucide-react';
import { useEffect, useState } from 'react';

/**
 * 统计卡片组件
 */
const StatCard = ({ 
  title, 
  value, 
  icon: Icon, 
  trend 
}: {
  title: string;
  value: string;
  icon: React.ElementType;
  trend?: string;
}) => (
  <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{title}</p>
        <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
        {trend && (
          <p className="text-sm text-green-600 dark:text-green-400 flex items-center mt-1">
            <TrendingUp className="h-4 w-4 mr-1" />
            {trend}
          </p>
        )}
      </div>
      <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900 rounded-lg flex items-center justify-center">
        <Icon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
      </div>
    </div>
  </div>
);

/**
 * 快捷操作组件
 */
const QuickActions = () => (
  <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">快捷操作</h3>
    <div className="grid grid-cols-2 gap-3">
      <Link href="/management/users" className="w-full">
        <Button variant="outline" className="justify-start h-auto p-4 w-full">
          <Users className="h-5 w-5 mr-2" />
          <div className="text-left">
            <div className="font-medium">用户管理</div>
            <div className="text-xs text-gray-500">添加或编辑用户</div>
          </div>
        </Button>
      </Link>
      <Link href="/management/teachers" className="w-full">
        <Button variant="outline" className="justify-start h-auto p-4 w-full">
          <GraduationCap className="h-5 w-5 mr-2" />
          <div className="text-left">
            <div className="font-medium">教师管理</div>
            <div className="text-xs text-gray-500">管理教师信息</div>
          </div>
        </Button>
      </Link>
      <Link href="/management/schedules/integrated" className="w-full">
        <Button variant="outline" className="justify-start h-auto p-4 w-full">
          <Calendar className="h-5 w-5 mr-2" />
          <div className="text-left">
            <div className="font-medium">智能排课</div>
            <div className="text-xs text-gray-500">自动生成课表</div>
          </div>
        </Button>
      </Link>
      <Link href="/reports" className="w-full">
        <Button variant="outline" className="justify-start h-auto p-4 w-full">
          <Activity className="h-5 w-5 mr-2" />
          <div className="text-left">
            <div className="font-medium">查看报表</div>
            <div className="text-xs text-gray-500">统计分析</div>
          </div>
        </Button>
      </Link>
    </div>
  </div>
);

/**
 * 最近活动组件
 */
const RecentActivity = () => (
  <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">最近活动</h3>
    <div className="space-y-4">
      {[
        { action: '新增了教师', detail: '张老师 - 数学组', time: '2分钟前' },
        { action: '更新了班级信息', detail: '高一(1)班', time: '5分钟前' },
        { action: '生成了课表', detail: '第一周课表', time: '10分钟前' },
        { action: '修改了场室信息', detail: '实验室A', time: '15分钟前' }
      ].map((item, index) => (
        <div key={index} className="flex items-center space-x-3">
          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-900 dark:text-white">{item.action}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">{item.detail}</p>
          </div>
          <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
            <Clock className="h-3 w-3 mr-1" />
            {item.time}
          </div>
        </div>
      ))}
    </div>
  </div>
);

/**
 * 主页面组件
 * 
 * Returns:
 *   React.ReactElement: 系统仪表盘页面
 */
export default function Home() {
  const [stats, setStats] = useState({
    userCount: 0,
    teacherCount: 0,
    classCount: 0,
    courseCount: 0,
    roomCount: 0,
  });

  useEffect(() => {
    fetch('/api/statistics/overview')
      .then(res => res.json())
      .then(res => {
        if (res.success && res.data) setStats(res.data);
      });
  }, []);

  return (
    <DashboardLayout title="系统仪表盘">
      <div className="space-y-6">
        {/* 统计概览 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="教师数量"
            value={stats.teacherCount.toString()}
            icon={GraduationCap}
            trend="+3 本月"
          />
          <StatCard
            title="班级数量"
            value={stats.classCount.toString()}
            icon={School}
          />
          <StatCard
            title="课程数量"
            value={stats.courseCount.toString()}
            icon={BookOpen}
            trend="+2 本月"
          />
          <StatCard
            title="课室数量"
            value={stats.roomCount.toString()}
            icon={MapPin}
          />
        </div>

        {/* 主要内容区域 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <QuickActions />
          </div>
          <div>
            <RecentActivity />
          </div>
        </div>

        {/* 欢迎信息 */}
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg p-6 text-white">
          <h2 className="text-xl font-bold mb-2">欢迎使用长师附小智能排课系统</h2>
          <p className="text-blue-100 mb-4">
            这是一个面向K-12阶段的智能排课与场室管理系统，提供完整的教务管理解决方案。
          </p>
          <Button variant="secondary" size="sm">
            查看使用指南
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
}
