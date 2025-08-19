/**
 * 课表查看页面 - 简化版本
 * 
 * 提供基础的课表展示功能
 * 暂时移除复杂的拖拽功能，确保系统稳定性
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { ScheduleHeader } from './components/ScheduleHeader';
import { ScheduleGrid, ScheduleGridSkeleton } from './components/ScheduleGrid';
import { 
  ViewMode, 
  ScheduleOption, 
  ScheduleFilters, 
  ScheduleViewData, 
  CourseSlot,
  ApiResponse 
} from './types';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, BookOpen, Users, Clock } from 'lucide-react';

/**
 * 课表查看页面
 * 
 * 提供班级、教师、教室的课表查看功能
 */
export default function ScheduleViewPage() {
  // 状态管理
  const [viewMode, setViewMode] = useState<ViewMode>('class');
  const [selectedTarget, setSelectedTarget] = useState<ScheduleOption>();
  const [availableTargets, setAvailableTargets] = useState<ScheduleOption[]>([]);
  const [scheduleData, setScheduleData] = useState<ScheduleViewData>();
  const [filters, setFilters] = useState<ScheduleFilters>({
    academicYear: '2025-2026',
    semester: '1'
  });

  // 加载状态
  const [isLoadingTargets, setIsLoadingTargets] = useState(false);
  const [isLoadingSchedule, setIsLoadingSchedule] = useState(false);
  const [error, setError] = useState<string>();

  /**
   * 加载可选目标列表
   */
  const loadAvailableTargets = useCallback(async (mode: ViewMode) => {
    setIsLoadingTargets(true);
    setError(undefined);

    try {
      const endpoint = mode === 'class' ? 'classes' : 
                     mode === 'teacher' ? 'teachers' : 'rooms';
      
      const response = await fetch(`/api/schedule-view/options/${endpoint}`);
      const data: ApiResponse<ScheduleOption[]> = await response.json();

      if (data.success && data.data) {
        setAvailableTargets(data.data);
        
        // 自动选择第一个目标
        if (data.data.length > 0) {
          setSelectedTarget(data.data[0]);
        } else {
          setSelectedTarget(undefined);
        }
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
        `/api/schedule-view/${endpoint}?${params}`
      );
      
      const data: ApiResponse<ScheduleViewData> = await response.json();

      if (data.success && data.data) {
        console.log('课表数据加载成功:', data.data);
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
   * 处理目标变化
   */
  const handleTargetChange = useCallback((target: ScheduleOption) => {
    setSelectedTarget(target);
  }, []);

  /**
   * 处理筛选条件变化
   */
  const handleFiltersChange = useCallback((newFilters: ScheduleFilters) => {
    setFilters(newFilters);
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
   * 导出课表
   */
  const handleExport = useCallback(() => {
    if (!scheduleData) return;
    
    // 这里可以实现PDF导出或Excel导出功能
    console.log('导出课表:', scheduleData);
    alert('导出功能开发中...');
  }, [scheduleData]);

  /**
   * 打开设置
   */
  const handleSettings = useCallback(() => {
    alert('设置功能开发中...');
  }, []);

  /**
   * 处理课程点击
   */
  const handleCourseClick = useCallback((courseSlot: CourseSlot) => {
    console.log('点击课程:', courseSlot);
    // 可以打开课程详情弹窗
  }, []);

  /**
   * 处理课程悬停
   */
  const handleCourseHover = useCallback((courseSlot: CourseSlot | null) => {
    // 可以显示更详细的悬停信息
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
    <div className="space-y-6">
      {/* 页面头部控制面板 */}
      <ScheduleHeader
        viewMode={viewMode}
        onViewModeChange={handleViewModeChange}
        selectedTarget={selectedTarget}
        onTargetChange={handleTargetChange}
        availableTargets={availableTargets}
        filters={filters}
        onFiltersChange={handleFiltersChange}
        isLoading={isLoadingTargets || isLoadingSchedule}
        lastUpdated={scheduleData?.metadata.lastUpdated ? new Date(scheduleData.metadata.lastUpdated) : undefined}
        onRefresh={handleRefresh}
        onExport={handleExport}
        onSettings={handleSettings}
      />

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
          <Card className="p-4">
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
          </Card>

          <Card className="p-4">
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
          </Card>

          <Card className="p-4">
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
          </Card>
        </div>
      )}

      {/* 课表内容区域 */}
      <div className="min-h-[600px]">
        {isLoadingSchedule ? (
          <ScheduleGridSkeleton />
        ) : scheduleData ? (
          <ScheduleGrid
            weekSchedule={scheduleData.weekSchedule}
            viewMode={viewMode} // 传递视图模式
            onCourseClick={handleCourseClick}
            onCourseHover={handleCourseHover}
          />
        ) : selectedTarget ? (
          <Card className="p-8 text-center">
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
          </Card>
        ) : (
          <Card className="p-8 text-center">
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
          </Card>
        )}
      </div>
    </div>
  );
}