/**
 * 报表统计主页
 * 
 * 提供各种统计报表的入口和概览
 */

'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  BarChart3, 
  Users, 
  MapPin, 
  Calendar, 
  TrendingUp,
  FileText,
  Download,
  Eye,
  BookOpen
} from 'lucide-react';
import Link from 'next/link';

/**
 * 报表统计主页组件
 */
export default function ReportsPage() {
  const reportCards = [
    {
      title: '教师工作量统计',
      description: '查看教师的课时分配、工作负荷等统计信息',
      href: '/reports/teacher-workload',
      icon: Users,
      color: 'text-blue-500',
      bgColor: 'bg-blue-50',
      status: '开发中'
    },
    {
      title: '场室利用率统计',
      description: '分析教室的使用频率、空闲时段等数据',
      href: '/reports/room-utilization',
      icon: MapPin,
      color: 'text-green-500',
      bgColor: 'bg-green-50',
      status: '开发中'
    },
    {
      title: '班级课表统计',
      description: '查看班级课程安排、学时分布等统计报表',
      href: '/reports/class-schedule',
      icon: Calendar,
      color: 'text-purple-500',
      bgColor: 'bg-purple-50',
      status: '开发中'
    }
  ];

  return (
    <div className="p-6 space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">报表统计</h1>
          <p className="text-muted-foreground">查看各种教学数据统计和分析报表</p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="outline" className="flex items-center gap-2">
            <Download className="h-4 w-4" />
            导出报表
          </Button>
          <Button className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            生成报表
          </Button>
        </div>
      </div>

      {/* 统计概览 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">总课程数</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">152</div>
            <p className="text-xs text-muted-foreground">
              +12% 较上学期
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">活跃教师</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">42</div>
            <p className="text-xs text-muted-foreground">
              +3 新增教师
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">教室利用率</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">87%</div>
            <p className="text-xs text-muted-foreground">
              +5% 较上月
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">排课完成率</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">94%</div>
            <p className="text-xs text-muted-foreground">
              +2% 较上周
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 报表入口 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {reportCards.map((report, index) => {
          const IconComponent = report.icon;
          
          return (
            <Card key={index} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className={`p-2 rounded-lg ${report.bgColor}`}>
                    <IconComponent className={`h-6 w-6 ${report.color}`} />
                  </div>
                  <Badge variant="secondary">{report.status}</Badge>
                </div>
                <CardTitle className="text-lg">{report.title}</CardTitle>
                <CardDescription>{report.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  <Link href={report.href} className="flex-1">
                    <Button className="w-full flex items-center gap-2">
                      <Eye className="h-4 w-4" />
                      查看报表
                    </Button>
                  </Link>
                  <Button variant="outline" size="icon">
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* 快速操作 */}
      <Card>
        <CardHeader>
          <CardTitle>快速操作</CardTitle>
          <CardDescription>常用的报表生成和导出功能</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Button variant="outline" className="flex items-center gap-2 justify-start">
              <FileText className="h-4 w-4" />
              周课表报表
            </Button>
            <Button variant="outline" className="flex items-center gap-2 justify-start">
              <BarChart3 className="h-4 w-4" />
              月度统计
            </Button>
            <Button variant="outline" className="flex items-center gap-2 justify-start">
              <TrendingUp className="h-4 w-4" />
              学期分析
            </Button>
            <Button variant="outline" className="flex items-center gap-2 justify-start">
              <Download className="h-4 w-4" />
              导出全部
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}