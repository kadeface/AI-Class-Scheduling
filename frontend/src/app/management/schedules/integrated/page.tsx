/**
 * 排课管理集成页面
 * 
 * 将教学计划、排课规则、课表查看等功能集成在一个页面中
 */

'use client';

import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  BookOpen, 
  Settings, 
  Calendar, 
  ClipboardList,
  Users,
  Building,
  Clock
} from 'lucide-react';

// 导入各个功能组件
import TeachingPlansPage from '../teaching-plans/page';
import SchedulingRulesPage from '../scheduling-rules/page';
import ScheduleViewPage from '../schedule-view/page';

/**
 * 排课管理集成页面组件
 * 
 * Returns:
 *   React.ReactElement: 集成的排课管理页面
 */
export default function IntegratedSchedulePage() {
  const [activeTab, setActiveTab] = useState('teaching-plans');

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">排课管理中心</h1>
        <p className="text-muted-foreground">
          集成教学计划、排课规则和课表查看功能的统一管理界面
        </p>
      </div>

      {/* 快速状态概览 */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">教学计划</CardTitle>
            <ClipboardList className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">--</div>
            <p className="text-xs text-muted-foreground">
              已制定计划数量
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
              活跃规则数量
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">课表状态</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">就绪</div>
            <p className="text-xs text-muted-foreground">
              系统准备状态
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">当前模块</CardTitle>
            <div className="h-4 w-4 flex items-center justify-center">
              {activeTab === 'teaching-plans' && <BookOpen className="h-4 w-4 text-blue-500" />}
              {activeTab === 'scheduling-rules' && <Settings className="h-4 w-4 text-green-500" />}
              {activeTab === 'schedule-view' && <Calendar className="h-4 w-4 text-purple-500" />}
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-sm font-medium">
              {activeTab === 'teaching-plans' && '教学计划'}
              {activeTab === 'scheduling-rules' && '排课规则'}
              {activeTab === 'schedule-view' && '课表查看'}
            </div>
            <p className="text-xs text-muted-foreground">
              当前活跃功能
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 主要功能区域 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center">
              <div className="h-3 w-3 rounded-full bg-white" />
            </div>
            排课管理功能
          </CardTitle>
          <CardDescription>
            通过标签切换访问不同的排课管理功能模块
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="teaching-plans" className="flex items-center gap-2">
                <BookOpen className="h-4 w-4" />
                教学计划管理
              </TabsTrigger>
              <TabsTrigger value="scheduling-rules" className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                排课规则管理
              </TabsTrigger>
              <TabsTrigger value="schedule-view" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                课表查看
              </TabsTrigger>
            </TabsList>

            {/* 模块描述卡片 */}
            <div className="grid gap-4 md:grid-cols-3 mb-6">
              <Card className={`transition-all ${activeTab === 'teaching-plans' ? 'ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-950' : ''}`}>
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-lg bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                      <BookOpen className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    <CardTitle className="text-sm">教学计划</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="text-xs text-muted-foreground">
                    配置班级课程安排、教师分配、时间偏好和连排要求
                  </p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    <Badge variant="outline" className="text-xs">课程分配</Badge>
                    <Badge variant="outline" className="text-xs">教师指派</Badge>
                    <Badge variant="outline" className="text-xs">时间偏好</Badge>
                  </div>
                </CardContent>
              </Card>

              <Card className={`transition-all ${activeTab === 'scheduling-rules' ? 'ring-2 ring-green-500 bg-green-50 dark:bg-green-950' : ''}`}>
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-lg bg-green-100 dark:bg-green-900 flex items-center justify-center">
                      <Settings className="h-4 w-4 text-green-600 dark:text-green-400" />
                    </div>
                    <CardTitle className="text-sm">排课规则</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="text-xs text-muted-foreground">
                    设置全局排课约束、优化规则和冲突解决策略
                  </p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    <Badge variant="outline" className="text-xs">时间约束</Badge>
                    <Badge variant="outline" className="text-xs">教师约束</Badge>
                    <Badge variant="outline" className="text-xs">教室约束</Badge>
                  </div>
                </CardContent>
              </Card>

              <Card className={`transition-all ${activeTab === 'schedule-view' ? 'ring-2 ring-purple-500 bg-purple-50 dark:bg-purple-950' : ''}`}>
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-lg bg-purple-100 dark:bg-purple-900 flex items-center justify-center">
                      <Calendar className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                    </div>
                    <CardTitle className="text-sm">课表查看</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="text-xs text-muted-foreground">
                    可视化课表展示，支持多视图和实时冲突检测
                  </p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    <Badge variant="outline" className="text-xs">班级视图</Badge>
                    <Badge variant="outline" className="text-xs">教师视图</Badge>
                    <Badge variant="outline" className="text-xs">教室视图</Badge>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* 功能模块内容 */}
            <div className="border rounded-lg">
              <TabsContent value="teaching-plans" className="mt-0 border-0 p-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-2 pb-4 border-b">
                    <BookOpen className="h-5 w-5 text-blue-500" />
                    <h3 className="text-lg font-semibold">教学计划管理</h3>
                    <Badge variant="secondary">核心模块</Badge>
                  </div>
                  <TeachingPlansPage />
                </div>
              </TabsContent>

              <TabsContent value="scheduling-rules" className="mt-0 border-0 p-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-2 pb-4 border-b">
                    <Settings className="h-5 w-5 text-green-500" />
                    <h3 className="text-lg font-semibold">排课规则管理</h3>
                    <Badge variant="secondary">配置模块</Badge>
                  </div>
                  <SchedulingRulesPage />
                </div>
              </TabsContent>

              <TabsContent value="schedule-view" className="mt-0 border-0 p-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-2 pb-4 border-b">
                    <Calendar className="h-5 w-5 text-purple-500" />
                    <h3 className="text-lg font-semibold">课表查看</h3>
                    <Badge variant="secondary">展示模块</Badge>
                  </div>
                  <ScheduleViewPage />
                </div>
              </TabsContent>
            </div>
          </Tabs>
        </CardContent>
      </Card>

      {/* 使用提示 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">使用提示</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-3 text-sm">
            <div className="flex items-start gap-2">
              <div className="h-5 w-5 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-medium text-blue-600">1</span>
              </div>
              <div>
                <div className="font-medium">配置教学计划</div>
                <div className="text-muted-foreground text-xs">
                  首先为各班级配置课程安排和教师分配
                </div>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <div className="h-5 w-5 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-medium text-green-600">2</span>
              </div>
              <div>
                <div className="font-medium">设置排课规则</div>
                <div className="text-muted-foreground text-xs">
                  配置时间约束、教师约束等排课规则
                </div>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <div className="h-5 w-5 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-medium text-purple-600">3</span>
              </div>
              <div>
                <div className="font-medium">查看排课结果</div>
                <div className="text-muted-foreground text-xs">
                  通过多种视图查看和调整课表安排
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 