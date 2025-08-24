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
import { ExportDialog } from './components/ExportDialog';
import { SettingsDialog } from './components/SettingsDialog';
import { AcademicPeriodSelector } from './components/AcademicPeriodSelector';
import { 
  ViewMode, 
  ScheduleOption, 
  ScheduleFilters, 
  ScheduleViewData, 
  CourseSlot,
  ApiResponse,
  PeriodTimeConfig
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
  const [periodTimeConfigs, setPeriodTimeConfigs] = useState<PeriodTimeConfig[]>([]);
  const [filters, setFilters] = useState<ScheduleFilters>({
    academicYear: '2025-2026',
    semester: '1'
  });

  // 加载状态
  const [isLoadingTargets, setIsLoadingTargets] = useState(false);
  const [isLoadingSchedule, setIsLoadingSchedule] = useState(false);
  const [isLoadingTimeConfigs, setIsLoadingTimeConfigs] = useState(false);
  const [error, setError] = useState<string>();

  /**
   * 加载时间段配置
   */
  const loadPeriodTimeConfigs = useCallback(async (academicYear: string, semester: string) => {
    setIsLoadingTimeConfigs(true);
    try {
      const params = new URLSearchParams({
        academicYear,
        semester
      });

      const response = await fetch(`/api/schedule-config/period-times?${params}`);
      const data: ApiResponse<PeriodTimeConfig[]> = await response.json();

      if (data.success && data.data) {
        setPeriodTimeConfigs(data.data);
      } else {
        setPeriodTimeConfigs([]);
      }
    } catch (error) {
      setPeriodTimeConfigs([]);
    } finally {
      setIsLoadingTimeConfigs(false);
    }
  }, []);

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
    loadPeriodTimeConfigs(filters.academicYear, filters.semester);
  }, [viewMode, selectedTarget, filters, loadScheduleData, loadAvailableTargets, loadPeriodTimeConfigs]);

  /**
   * 导出课表
   */
  const handleExport = useCallback(() => {
    if (!scheduleData) return;
    
    // 导出功能已集成到ExportDialog组件中
    console.log('导出课表:', scheduleData);
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

  // 效果钩子：页面初始化时加载时间段配置
  useEffect(() => {
    loadPeriodTimeConfigs(filters.academicYear, filters.semester);
  }, []);

  // 效果钩子：视图模式变化时加载目标列表
  useEffect(() => {
    loadAvailableTargets(viewMode);
  }, [viewMode, loadAvailableTargets]);

  // 效果钩子：筛选条件变化时重新加载时间段配置
  useEffect(() => {
    loadPeriodTimeConfigs(filters.academicYear, filters.semester);
  }, [filters.academicYear, filters.semester, loadPeriodTimeConfigs]);

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
        isLoading={isLoadingTargets || isLoadingSchedule || isLoadingTimeConfigs}
        lastUpdated={scheduleData?.metadata.lastUpdated ? new Date(scheduleData.metadata.lastUpdated) : undefined}
        onRefresh={handleRefresh}
        onExport={handleExport}
        onSettings={handleSettings}
        exportDialog={
          scheduleData ? (
            <ExportDialog
              scheduleData={scheduleData}
              viewMode={viewMode}
            />
          ) : undefined
        }
        settingsDialog={
          <SettingsDialog />
        }
      />

      {/* 学年学期选择器 */}
      <Card className="p-4">
        <AcademicPeriodSelector
          value={filters}
          onChange={handleFiltersChange}
          className="justify-center"
        />
        
        {/* 时间段配置状态显示 */}
        {periodTimeConfigs.length > 0 && (
          <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <div className="text-sm text-blue-800">
              <span className="font-medium">当前时间段配置：</span>
              {periodTimeConfigs.length} 个节次
              {periodTimeConfigs.slice(0, 3).map(config => (
                <span key={config._id} className="ml-2 px-2 py-1 bg-blue-100 rounded text-xs">
                  {config.period}: {config.startTime}-{config.endTime}
                </span>
              ))}
              {periodTimeConfigs.length > 3 && (
                <span className="ml-2 text-xs text-blue-600">
                  等 {periodTimeConfigs.length} 个节次
                </span>
              )}
            </div>
          </div>
        )}
      </Card>

      {/* 错误提示 */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* 时间段配置加载状态提示 */}
      {isLoadingTimeConfigs && (
        <Alert>
          <Clock className="h-4 w-4" />
          <AlertDescription>正在加载时间段配置...</AlertDescription>
        </Alert>
      )}

      {/* 时间段配置加载失败提示 */}
      {!isLoadingTimeConfigs && periodTimeConfigs.length === 0 && (
        <Alert variant="default">
          <Clock className="h-4 w-4" />
          <AlertDescription>使用默认时间段配置</AlertDescription>
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
        {isLoadingSchedule || isLoadingTimeConfigs ? (
          <ScheduleGridSkeleton />
        ) : scheduleData ? (
          <ScheduleGrid
            weekSchedule={scheduleData.weekSchedule}
            periodTimeConfigs={periodTimeConfigs}
            viewMode={viewMode}
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