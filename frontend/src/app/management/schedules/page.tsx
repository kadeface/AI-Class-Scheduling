/**
 * 排课管理主页面
 * 
 * 提供教学计划和排课规则的入口导航
 */

'use client';

import React from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  BookOpen, 
  Settings, 
  Calendar, 
  ClipboardList,
  ArrowRight 
} from 'lucide-react';

/**
 * 排课管理主页面组件
 * 
 * Returns:
 *   React.ReactElement: 排课管理主页面
 */
export default function SchedulesPage() {
  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">排课管理</h1>
        <p className="text-muted-foreground">
          管理教学计划和排课规则，为智能排课做好准备
        </p>
      </div>

      {/* 功能卡片网格 */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2">
        {/* 教学计划管理 */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <div className="flex items-center space-x-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900">
                <BookOpen className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <CardTitle>教学计划管理</CardTitle>
                <CardDescription>
                  配置班级课程安排和教师分配
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                为每个班级设置课程安排，指定授课教师，配置时间偏好和连排要求。
              </p>
              <div className="flex items-center justify-between">
                <div className="text-sm">
                  <div className="flex items-center space-x-4 text-muted-foreground">
                    <span>• 课程-教师分配</span>
                    <span>• 时间偏好设置</span>
                    <span>• 审批流程</span>
                  </div>
                </div>
                <Link href="/management/schedules/teaching-plans">
                  <Button className="gap-2">
                    管理计划
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 排课规则管理 */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <div className="flex items-center space-x-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900">
                <Settings className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <CardTitle>排课规则管理</CardTitle>
                <CardDescription>
                  设置全局排课约束和优化规则
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                配置时间约束、教师约束、教室约束和课程安排规则，指导智能排课算法。
              </p>
              <div className="flex items-center justify-between">
                <div className="text-sm">
                  <div className="flex items-center space-x-4 text-muted-foreground">
                    <span>• 时间约束规则</span>
                    <span>• 教师约束规则</span>
                    <span>• 冲突处理策略</span>
                  </div>
                </div>
                <Link href="/management/schedules/scheduling-rules">
                  <Button className="gap-2">
                    管理规则
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 快速统计信息 */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">教学计划</CardTitle>
            <ClipboardList className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">--</div>
            <p className="text-xs text-muted-foreground">
              待完善统计功能
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">排课规则</CardTitle>
            <Settings className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">--</div>
            <p className="text-xs text-muted-foreground">
              待完善统计功能
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">排课状态</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">就绪</div>
            <p className="text-xs text-muted-foreground">
              系统准备排课
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 使用指南 */}
      <Card>
        <CardHeader>
          <CardTitle>使用指南</CardTitle>
          <CardDescription>
            按照以下步骤完成排课前的准备工作
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <h4 className="font-medium">教学计划配置流程</h4>
              <ol className="text-sm text-muted-foreground space-y-1">
                <li>1. 确保已完成教师、班级、课程的基础数据录入</li>
                <li>2. 为每个班级创建教学计划</li>
                <li>3. 分配课程和授课教师</li>
                <li>4. 设置时间偏好和连排要求</li>
                <li>5. 提交审批并激活教学计划</li>
              </ol>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium">排课规则配置流程</h4>
              <ol className="text-sm text-muted-foreground space-y-1">
                <li>1. 设置学校的作息时间和工作日</li>
                <li>2. 配置教师的工作约束条件</li>
                <li>3. 设置教室使用规则</li>
                <li>4. 配置课程排列和分布策略</li>
                <li>5. 设置冲突处理和优先级规则</li>
              </ol>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}