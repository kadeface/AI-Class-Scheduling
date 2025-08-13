'use client';

import React from 'react';
import { ViewMode, ScheduleOption, ScheduleFilters } from '../types';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Calendar, 
  Users, 
  User, 
  Building,
  RefreshCw,
  Download,
  Settings,
  Filter,
  Search
} from 'lucide-react';

/**
 * 课表头部组件属性接口
 */
interface ScheduleHeaderProps {
  // 当前视图模式
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;

  // 当前选中的目标
  selectedTarget?: ScheduleOption;
  onTargetChange: (target: ScheduleOption) => void;

  // 可选目标列表
  availableTargets: ScheduleOption[];

  // 筛选条件
  filters: ScheduleFilters;
  onFiltersChange: (filters: ScheduleFilters) => void;

  // 课表数据状态
  isLoading?: boolean;
  lastUpdated?: Date;

  // 操作回调
  onRefresh?: () => void;
  onExport?: () => void;
  onSettings?: () => void;
}

/**
 * 课表头部控制面板组件
 * 
 * 提供视图切换、目标选择、筛选等控制功能
 */
export function ScheduleHeader({
  viewMode,
  onViewModeChange,
  selectedTarget,
  onTargetChange,
  availableTargets,
  filters,
  onFiltersChange,
  isLoading = false,
  lastUpdated,
  onRefresh,
  onExport,
  onSettings
}: ScheduleHeaderProps) {
  
  // 视图模式选项
  const viewModeOptions = [
    { key: 'class' as ViewMode, label: '班级课表', icon: Users, color: 'bg-blue-500' },
    { key: 'teacher' as ViewMode, label: '教师课表', icon: User, color: 'bg-green-500' },
    { key: 'room' as ViewMode, label: '教室课表', icon: Building, color: 'bg-purple-500' }
  ];

  return (
    <Card className="p-6 space-y-6">
      {/* 顶部区域：标题和操作按钮 */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-gray-900">课表查看</h1>
          <p className="text-gray-600">查看班级、教师、教室的详细课表安排</p>
        </div>

        <div className="flex items-center gap-2">
          {/* 刷新按钮 */}
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            disabled={isLoading}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            刷新
          </Button>

          {/* 导出按钮 */}
          <Button
            variant="outline"
            size="sm"
            onClick={onExport}
            className="gap-2"
          >
            <Download className="h-4 w-4" />
            导出
          </Button>

          {/* 设置按钮 */}
          <Button
            variant="outline"
            size="sm"
            onClick={onSettings}
            className="gap-2"
          >
            <Settings className="h-4 w-4" />
            设置
          </Button>
        </div>
      </div>

      {/* 视图模式切换 */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-gray-500" />
          <span className="text-sm font-medium text-gray-700">查看模式</span>
        </div>
        
        <div className="flex flex-wrap gap-2">
          {viewModeOptions.map((option) => {
            const Icon = option.icon;
            const isActive = viewMode === option.key;
            
            return (
              <Button
                key={option.key}
                variant={isActive ? "default" : "outline"}
                size="sm"
                onClick={() => onViewModeChange(option.key)}
                className={`gap-2 ${isActive ? option.color : ''}`}
              >
                <Icon className="h-4 w-4" />
                {option.label}
              </Button>
            );
          })}
        </div>
      </div>

      {/* 目标选择区域 */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">
              选择{viewModeOptions.find(v => v.key === viewMode)?.label.replace('课表', '')}
            </span>
          </div>
          
          {selectedTarget && (
            <Badge variant="secondary" className="gap-1">
              <Calendar className="h-3 w-3" />
              {filters.academicYear}-{filters.semester}
            </Badge>
          )}
        </div>

        {/* 目标选择列表 */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-2 max-h-40 overflow-y-auto">
          {availableTargets.map((target) => {
            const isSelected = selectedTarget?._id === target._id;
            
            return (
              <Button
                key={target._id}
                variant={isSelected ? "default" : "outline"}
                size="sm"
                onClick={() => onTargetChange(target)}
                className="justify-start text-left h-auto p-3"
              >
                <div className="space-y-1 w-full">
                  <div className="font-medium text-sm truncate">
                    {target.name}
                  </div>
                  
                  {/* 额外信息显示 */}
                  {viewMode === 'class' && target.grade && (
                    <div className="text-xs text-gray-500">
                      {target.grade}年级
                    </div>
                  )}
                  
                  {viewMode === 'teacher' && target.subjects && (
                    <div className="text-xs text-gray-500 truncate">
                      {target.subjects.slice(0, 2).join('、')}
                      {target.subjects.length > 2 && '等'}
                    </div>
                  )}
                  
                  {viewMode === 'room' && (
                    <div className="text-xs text-gray-500">
                      {target.roomNumber ? `${target.roomNumber} - ` : ''}
                      {target.type}
                    </div>
                  )}
                </div>
              </Button>
            );
          })}
        </div>

        {/* 无数据提示 */}
        {availableTargets.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <Building className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p>暂无可用的{viewModeOptions.find(v => v.key === viewMode)?.label.replace('课表', '')}数据</p>
            <p className="text-sm mt-1">请检查数据配置或联系管理员</p>
          </div>
        )}
      </div>

      {/* 筛选条件 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-gray-200">
        {/* 学年选择 */}
        <div className="space-y-1">
          <label className="text-xs font-medium text-gray-500">学年</label>
          <select 
            value={filters.academicYear || '2025-2026'}
            onChange={(e) => onFiltersChange({ ...filters, academicYear: e.target.value })}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="2025-2026">2025-2026</option>
            <option value="2024-2025">2024-2025</option>
            <option value="2023-2024">2023-2024</option>
          </select>
        </div>

        {/* 学期选择 */}
        <div className="space-y-1">
          <label className="text-xs font-medium text-gray-500">学期</label>
          <select 
            value={filters.semester || '1'}
            onChange={(e) => onFiltersChange({ ...filters, semester: e.target.value })}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="1">第一学期</option>
            <option value="2">第二学期</option>
          </select>
        </div>

        {/* 状态信息 */}
        <div className="md:col-span-2 space-y-1">
          <label className="text-xs font-medium text-gray-500">更新状态</label>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            {isLoading ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span>加载中...</span>
              </>
            ) : lastUpdated ? (
              <>
                <Calendar className="h-4 w-4" />
                <span>最后更新：{lastUpdated.toLocaleString()}</span>
              </>
            ) : (
              <>
                <Calendar className="h-4 w-4" />
                <span>等待加载数据</span>
              </>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
} 