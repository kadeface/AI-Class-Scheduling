'use client';

import React, { useState, useMemo } from 'react';
import { ViewMode, ScheduleOption, ScheduleFilters } from '../types';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  Calendar, 
  Users, 
  User, 
  Building,
  RefreshCw,
  Download,
  Settings,
  Filter,
  Search,
  ChevronLeft,
  ChevronRight,
  X
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
 * 优化了数据展示，支持搜索、筛选和分页
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
  
  // 本地状态管理
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(12); // 每页显示12个项目

  // 视图模式选项
  const viewModeOptions = [
    { key: 'class' as ViewMode, label: '班级课表', icon: Users, color: 'bg-blue-500' },
    { key: 'teacher' as ViewMode, label: '教师课表', icon: User, color: 'bg-green-500' },
    { key: 'room' as ViewMode, label: '教室课表', icon: Building, color: 'bg-purple-500' }
  ];

  // 搜索和筛选逻辑
  const filteredTargets = useMemo(() => {
    if (!searchTerm.trim()) {
      return availableTargets;
    }

    const searchLower = searchTerm.toLowerCase();
    return availableTargets.filter(target => {
      // 基础名称搜索
      if (target.name.toLowerCase().includes(searchLower)) {
        return true;
      }

      // 班级：按年级搜索
      if (viewMode === 'class' && target.grade) {
        if (`${target.grade}年级`.includes(searchLower)) {
          return true;
        }
      }

      // 教师：按科目搜索
      if (viewMode === 'teacher' && target.subjects) {
        if (target.subjects.some(subject => 
          subject.toLowerCase().includes(searchLower)
        )) {
          return true;
        }
      }

      // 教室：按类型和编号搜索
      if (viewMode === 'room') {
        if (target.type?.toLowerCase().includes(searchLower) ||
            target.roomNumber?.toLowerCase().includes(searchLower)) {
          return true;
        }
      }

      return false;
    });
  }, [availableTargets, searchTerm, viewMode]);

  // 分页计算
  const totalPages = Math.ceil(filteredTargets.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentTargets = filteredTargets.slice(startIndex, endIndex);

  // 分组显示逻辑
  const groupedTargets = useMemo(() => {
    if (viewMode === 'class') {
      // 按年级分组
      const groups: { [key: number]: ScheduleOption[] } = {};
      currentTargets.forEach(target => {
        const grade = target.grade || 0;
        if (!groups[grade]) groups[grade] = [];
        groups[grade].push(target);
      });
      return Object.entries(groups)
        .sort(([a], [b]) => parseInt(a) - parseInt(b))
        .map(([grade, targets]) => ({ grade: parseInt(grade), targets }));
    } else if (viewMode === 'teacher') {
      // 按科目分组
      const groups: { [key: string]: ScheduleOption[] } = {};
      currentTargets.forEach(target => {
        if (target.subjects && target.subjects.length > 0) {
          const primarySubject = target.subjects[0];
          if (!groups[primarySubject]) groups[primarySubject] = [];
          groups[primarySubject].push(target);
        } else {
          if (!groups['其他']) groups['其他'] = [];
          groups['其他'].push(target);
        }
      });
      return Object.entries(groups)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([subject, targets]) => ({ subject, targets }));
    } else if (viewMode === 'room') {
      // 按教室类型分组
      const groups: { [key: string]: ScheduleOption[] } = {};
      currentTargets.forEach(target => {
        const type = target.type || '其他';
        if (!groups[type]) groups[type] = [];
        groups[type].push(target);
      });
      return Object.entries(groups)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([type, targets]) => ({ type, targets }));
    }
    return [];
  }, [currentTargets, viewMode]);

  // 处理搜索变化
  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1); // 重置到第一页
  };

  // 处理页面变化
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  // 清除搜索
  const clearSearch = () => {
    setSearchTerm('');
    setCurrentPage(1);
  };

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

      {/* 搜索和筛选区域 */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Search className="h-4 w-4 text-gray-500" />
          <span className="text-sm font-medium text-gray-700">
            搜索{viewModeOptions.find(v => v.key === viewMode)?.label.replace('课表', '')}
          </span>
        </div>
        
        <div className="relative">
          <Input
            type="text"
            placeholder={`搜索${viewMode === 'class' ? '班级名称或年级' : 
                         viewMode === 'teacher' ? '教师姓名或科目' : 
                         '教室名称或类型'}...`}
            value={searchTerm}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pr-10"
          />
          {searchTerm && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearSearch}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* 搜索结果统计 */}
        {searchTerm && (
          <div className="text-sm text-gray-500">
            找到 {filteredTargets.length} 个结果
            {filteredTargets.length !== availableTargets.length && 
              `（共 ${availableTargets.length} 个）`}
          </div>
        )}
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

        {/* 分组显示目标选择列表 */}
        {groupedTargets.length > 0 ? (
          <div className="space-y-4">
            {groupedTargets.map((group, groupIndex) => (
              <div key={groupIndex} className="space-y-2">
                {/* 分组标题 */}
                <div className="flex items-center gap-2">
                  <div className="h-px flex-1 bg-gray-200"></div>
                  <span className="text-xs font-medium text-gray-500 px-2">
                    {viewMode === 'class' ? `${group.grade}年级` :
                     viewMode === 'teacher' ? group.subject :
                     group.type}
                  </span>
                  <div className="h-px flex-1 bg-gray-200"></div>
                </div>

                {/* 分组内容 */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-2">
                  {group.targets.map((target) => {
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
              </div>
            ))}
          </div>
        ) : (
          /* 无数据提示 */
          <div className="text-center py-8 text-gray-500">
            <Building className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p>
              {searchTerm ? '没有找到匹配的结果' : 
               `暂无可用的${viewModeOptions.find(v => v.key === viewMode)?.label.replace('课表', '')}数据`}
            </p>
            {searchTerm && (
              <p className="text-sm mt-1">
                尝试调整搜索关键词或清除搜索条件
              </p>
            )}
          </div>
        )}

        {/* 分页控制 */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-4 border-t border-gray-200">
            <div className="text-sm text-gray-500">
              显示第 {startIndex + 1}-{Math.min(endIndex, filteredTargets.length)} 项，
              共 {filteredTargets.length} 项
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="gap-1"
              >
                <ChevronLeft className="h-4 w-4" />
                上一页
              </Button>
              
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }
                  
                  return (
                    <Button
                      key={pageNum}
                      variant={currentPage === pageNum ? "default" : "outline"}
                      size="sm"
                      onClick={() => handlePageChange(pageNum)}
                      className="w-8 h-8 p-0"
                    >
                      {pageNum}
                    </Button>
                  );
                })}
              </div>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="gap-1"
              >
                下一页
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
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