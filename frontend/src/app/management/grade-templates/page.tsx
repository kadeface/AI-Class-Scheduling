/**
 * 年级课程模板管理页面
 * 
 * 提供年级课程模板的创建、编辑、查看和管理功能
 */

'use client';

import React from 'react';
import { GradeTemplateManager } from '@/components/grade-template/GradeTemplateManager';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BookOpen, Star, Users, Clock } from 'lucide-react';

/**
 * 年级课程模板管理页面组件
 * 
 * Returns:
 *   React.ReactElement: 年级课程模板管理页面
 */
export default function GradeTemplatesPage() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">年级课程模板管理</h1>
          <p className="text-gray-600 mt-2">
            管理各年级的标准课程配置模板，支持创建、编辑和复制模板
          </p>
        </div>
      </div>

      {/* 功能说明卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-blue-600" />
              模板管理
            </CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription>
              创建和管理各年级的课程模板，设置课程类型、课时分配和优先级
            </CardDescription>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Star className="h-5 w-5 text-yellow-600" />
              默认模板
            </CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription>
              为每个年级设置默认模板，确保教学计划创建时能快速应用标准配置
            </CardDescription>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="h-5 w-5 text-green-600" />
              批量应用
            </CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription>
              支持模板复制和批量应用，提高教学计划创建效率
            </CardDescription>
          </CardContent>
        </Card>
      </div>

      {/* 年级模板管理器 */}
      <GradeTemplateManager />
    </div>
  );
}
