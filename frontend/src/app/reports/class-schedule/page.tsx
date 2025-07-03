/**
 * 课表查询报告页面
 * 
 * 提供多维度课表查询、打印与导出功能
 * 实现TKS-013任务要求的所有功能
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Calendar, 
  Users, 
  User, 
  Building,
  Download,
  Printer,
  RefreshCw,
  FileSpreadsheet,
  FileText,
  Search,
  Filter,
  AlertCircle,
  BookOpen,
  Clock
} from 'lucide-react';

// 导入课表相关类型和组件
import {
  ViewMode,
  ScheduleOption,
  ScheduleFilters,
  ScheduleViewData,
  CourseSlot,
  ApiResponse,
  TIME_CONFIG
} from '@/app/management/schedules/schedule-view/types';

import { ScheduleGrid, ScheduleGridSkeleton } from '@/app/management/schedules/schedule-view/components/ScheduleGrid';

// 导入导出工具
import { exportScheduleToExcel, printSchedule, ExportOptions, PrintOptions } from '@/lib/schedule-export';

/**
 * 课表查询报告页面
 * 
 * 集成了多维度查询、打印和导出功能
 */
export default function ClassScheduleReportPage() {
  // 基础状态管理
  const [viewMode, setViewMode] = useState<ViewMode>('class');
  const [selectedTarget, setSelectedTarget] = useState<ScheduleOption>();
  const [availableTargets, setAvailableTargets] = useState<ScheduleOption[]>([]);
  const [scheduleData, setScheduleData] = useState<ScheduleViewData>();
  const [filters, setFilters] = useState<ScheduleFilters>({
    academicYear: '2024-2025',
    semester: '1'
  });

  // 加载状态
  const [isLoadingTargets, setIsLoadingTargets] = useState(false);
  const [isLoadingSchedule, setIsLoadingSchedule] = useState(false);
  const [error, setError] = useState<string>();

  // 导出状态
  const [isExporting, setIsExporting] = useState(false);

  /**
   * 视图模式选项配置
   */
  const viewModeOptions = [
    { 
      key: 'class' as ViewMode, 
      label: '班级课表', 
      icon: Users, 
      color: 'bg-blue-500',
      description: '按班级查看课表安排'
    },
    { 
      key: 'teacher' as ViewMode, 
      label: '教师课表', 
      icon: User, 
      color: 'bg-green-500',
      description: '按教师查看授课安排'
    },
    { 
      key: 'room' as ViewMode, 
      label: '教室课表', 
      icon: Building, 
      color: 'bg-purple-500',
      description: '按教室查看使用情况'
    }
  ];

  /**
   * 加载可选目标列表
   */
  const loadAvailableTargets = useCallback(async (mode: ViewMode) => {
    setIsLoadingTargets(true);
    setError(undefined);

    try {
      const endpoint = mode === 'class' ? 'classes' : 
                     mode === 'teacher' ? 'teachers' : 'rooms';
      
      const response = await fetch(`http://localhost:5000/api/schedule-view/options/${endpoint}`);
      const data: ApiResponse<ScheduleOption[]> = await response.json();

      if (data.success && data.data) {
        setAvailableTargets(data.data);
        
        // 清除之前的选择
        setSelectedTarget(undefined);
        setScheduleData(undefined);
      } else {
        throw new Error(data.message || '获取选项列表失败');
      }
    } catch (error) {
      console.error('加载可选目标失败:', error);
      setError(`加载${mode === 'class' ? '班级' : mode === 'teacher' ? '教师' : '教室'}列表失败`);
      setAvailableTargets([]);
      setSelectedTarget(undefined);
    } finally {
      setIsLoadingTargets(false);
    }
  }, []);

  /**
   * 加载课表数据
   */
  const loadScheduleData = useCallback(async (
    mode: ViewMode, 
    targetId: string, 
    currentFilters: ScheduleFilters
  ) => {
    setIsLoadingSchedule(true);
    setError(undefined);

    try {
      const endpoint = mode === 'class' ? `class/${targetId}` :
                     mode === 'teacher' ? `teacher/${targetId}` :
                     `room/${targetId}`;
      
      const params = new URLSearchParams({
        academicYear: currentFilters.academicYear || '2024-2025',
        semester: currentFilters.semester || '1'
      });

      const response = await fetch(
        `http://localhost:5000/api/schedule-view/${endpoint}?${params}`
      );
      
      const data: ApiResponse<ScheduleViewData> = await response.json();

      if (data.success && data.data) {
        setScheduleData(data.data);
      } else {
        throw new Error(data.message || '获取课表数据失败');
      }
    } catch (error) {
      console.error('加载课表数据失败:', error);
      setError('获取课表数据失败，请检查网络连接或联系管理员');
      setScheduleData(undefined);
    } finally {
      setIsLoadingSchedule(false);
    }
  }, []);

  /**
   * 处理视图模式变化
   */
  const handleViewModeChange = useCallback((mode: ViewMode) => {
    setViewMode(mode);
    setSelectedTarget(undefined);
    setScheduleData(undefined);
  }, []);

  /**
   * 处理目标选择
   */
  const handleTargetSelect = useCallback((target: ScheduleOption) => {
    setSelectedTarget(target);
  }, []);

  /**
   * 处理筛选条件变化
   */
  const handleFiltersChange = useCallback((newFilters: Partial<ScheduleFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  }, []);

  /**
   * 刷新数据
   */
  const handleRefresh = useCallback(() => {
    if (selectedTarget) {
      loadScheduleData(viewMode, selectedTarget._id, filters);
    }
    loadAvailableTargets(viewMode);
  }, [viewMode, selectedTarget, filters, loadScheduleData, loadAvailableTargets]);

  /**
   * 导出Excel
   */
  const handleExportExcel = useCallback(async (options: Partial<ExportOptions> = {}) => {
    if (!scheduleData) return;

    setIsExporting(true);
    try {
      await exportScheduleToExcel(scheduleData, {
        includeEmpty: true,
        includeMetadata: true,
        format: 'xlsx',
        ...options
      });
    } catch (error) {
      console.error('导出Excel失败:', error);
      setError('导出Excel失败，请重试');
    } finally {
      setIsExporting(false);
    }
  }, [scheduleData]);

  /**
   * 导出CSV
   */
  const handleExportCSV = useCallback(async () => {
    if (!scheduleData) return;

    setIsExporting(true);
    try {
      await exportScheduleToExcel(scheduleData, {
        includeEmpty: true,
        includeMetadata: false,
        format: 'csv'
      });
    } catch (error) {
      console.error('导出CSV失败:', error);
      setError('导出CSV失败，请重试');
    } finally {
      setIsExporting(false);
    }
  }, [scheduleData]);

  /**
   * 打印课表
   */
  const handlePrint = useCallback((options: Partial<PrintOptions> = {}) => {
    if (!scheduleData) return;

    try {
      printSchedule(scheduleData, {
        includeMetadata: true,
        paperSize: 'A4',
        orientation: 'landscape',
        ...options
      });
    } catch (error) {
      console.error('打印失败:', error);
      setError('打印失败，请检查浏览器设置');
    }
  }, [scheduleData]);

  /**
   * 处理课程点击
   */
  const handleCourseClick = useCallback((courseSlot: CourseSlot) => {
    console.log('点击课程:', courseSlot);
    // 可以显示课程详情弹窗
  }, []);

  // 效果钩子：视图模式变化时加载目标列表
  useEffect(() => {
    loadAvailableTargets(viewMode);
  }, [viewMode, loadAvailableTargets]);

  // 效果钩子：目标或筛选条件变化时加载课表数据
  useEffect(() => {
    if (selectedTarget) {
      loadScheduleData(viewMode, selectedTarget._id, filters);
    }
  }, [selectedTarget, filters, viewMode, loadScheduleData]);

  return (
    <div className="p-6 space-y-6">
      {/* 页面标题 */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-gray-900">课表查询报告</h1>
        <p className="text-gray-600">多维度课表查询、打印与导出功能</p>
      </div>

      {/* 控制面板 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            查询设置
          </CardTitle>
          <CardDescription>
            选择查看模式、目标对象和筛选条件
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* 视图模式选择 */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-gray-700">查看模式</label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {viewModeOptions.map((option) => {
                const Icon = option.icon;
                const isActive = viewMode === option.key;
                
                return (
                  <Button
                    key={option.key}
                    variant={isActive ? "default" : "outline"}
                    size="lg"
                    onClick={() => handleViewModeChange(option.key)}
                    className={`justify-start gap-3 h-auto py-4 ${isActive ? option.color : ''}`}
                  >
                    <Icon className="h-5 w-5" />
                    <div className="text-left">
                      <div className="font-medium">{option.label}</div>
                      <div className="text-xs opacity-75">{option.description}</div>
                    </div>
                  </Button>
                );
              })}
            </div>
          </div>

          {/* 筛选条件 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">学年</label>
              <select
                value={filters.academicYear || '2024-2025'}
                onChange={(e) => handleFiltersChange({ academicYear: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="2024-2025">2024-2025学年</option>
                <option value="2023-2024">2023-2024学年</option>
                <option value="2025-2026">2025-2026学年</option>
              </select>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">学期</label>
              <select
                value={filters.semester || '1'}
                onChange={(e) => handleFiltersChange({ semester: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="1">第一学期</option>
                <option value="2">第二学期</option>
              </select>
            </div>
          </div>

          {/* 目标选择 */}
          {availableTargets.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700">
                  选择{viewModeOptions.find(v => v.key === viewMode)?.label.replace('课表', '')}
                </label>
                <Badge variant="secondary" className="gap-1">
                  <Calendar className="h-3 w-3" />
                  {filters.academicYear}-{filters.semester}
                </Badge>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-2 max-h-40 overflow-y-auto border rounded-md p-3">
                {availableTargets.map((target) => {
                  const isSelected = selectedTarget?._id === target._id;
                  
                  return (
                    <Button
                      key={target._id}
                      variant={isSelected ? "default" : "outline"}
                      size="sm"
                      onClick={() => handleTargetSelect(target)}
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
                        
                        {viewMode === 'room' && target.type && (
                          <div className="text-xs text-gray-500">
                            {target.type}
                          </div>
                        )}
                      </div>
                    </Button>
                  );
                })}
              </div>
            </div>
          )}

          {/* 操作按钮 */}
          <div className="flex items-center gap-2 pt-4 border-t">
            <Button
              onClick={handleRefresh}
              disabled={isLoadingTargets || isLoadingSchedule}
              className="gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${(isLoadingTargets || isLoadingSchedule) ? 'animate-spin' : ''}`} />
              刷新数据
            </Button>

            {scheduleData && (
              <>
                <Button
                  onClick={() => handleExportExcel()}
                  disabled={isExporting}
                  variant="outline"
                  className="gap-2"
                >
                  <FileSpreadsheet className="h-4 w-4" />
                  导出Excel
                </Button>

                <Button
                  onClick={handleExportCSV}
                  disabled={isExporting}
                  variant="outline"
                  className="gap-2"
                >
                  <FileText className="h-4 w-4" />
                  导出CSV
                </Button>

                <Button
                  onClick={() => handlePrint()}
                  variant="outline"
                  className="gap-2"
                >
                  <Printer className="h-4 w-4" />
                  打印
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 错误提示 */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* 课表统计信息 */}
      {scheduleData && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <BookOpen className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <div className="text-sm text-gray-500">总课程数</div>
                  <div className="text-2xl font-bold text-gray-900">
                    {scheduleData.metadata.totalCourses}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Clock className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <div className="text-sm text-gray-500">总课时数</div>
                  <div className="text-2xl font-bold text-gray-900">
                    {scheduleData.metadata.totalHours}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Users className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <div className="text-sm text-gray-500">冲突数量</div>
                  <div className="text-2xl font-bold text-gray-900">
                    {scheduleData.metadata.conflicts}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 课表展示区域 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>课表展示</span>
            {scheduleData && (
              <Badge variant="outline">
                {scheduleData.targetName} - {scheduleData.academicYear}学年第{scheduleData.semester}学期
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="min-h-[600px]">
            {isLoadingSchedule ? (
              <ScheduleGridSkeleton />
            ) : scheduleData ? (
              <ScheduleGrid
                weekSchedule={scheduleData.weekSchedule}
                onCourseClick={handleCourseClick}
                onCourseHover={() => {}}
              />
            ) : selectedTarget ? (
              <div className="text-center py-12">
                <div className="space-y-4">
                  <div className="text-6xl text-gray-300">📅</div>
                  <div className="space-y-2">
                    <h3 className="text-lg font-semibold text-gray-900">
                      暂无课表数据
                    </h3>
                    <p className="text-gray-500">
                      {selectedTarget.name} 在 {filters.academicYear} 学年第 {filters.semester} 学期暂无排课数据
                    </p>
                    <p className="text-sm text-gray-400">
                      请检查排课计划是否已生成，或联系管理员
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="space-y-4">
                  <div className="text-6xl text-gray-300">🔍</div>
                  <div className="space-y-2">
                    <h3 className="text-lg font-semibold text-gray-900">
                      请选择查看目标
                    </h3>
                    <p className="text-gray-500">
                      在上方选择要查看课表的{
                        viewMode === 'class' ? '班级' :
                        viewMode === 'teacher' ? '教师' : '教室'
                      }
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}