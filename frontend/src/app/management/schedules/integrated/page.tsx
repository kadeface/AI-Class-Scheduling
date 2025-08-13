/**
 * 智能排课整合页面
 * 
 * 整合一键排课、课表展示、拖拽调课等功能的完整页面流程
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Select } from '@/components/ui/select';
import { 
  Play, 
  Square, 
  RefreshCw, 
  Calendar, 
  Clock, 
  Users,
  BookOpen,
  Settings,
  CheckCircle,
  AlertCircle,
  Zap,
  Target,
  TrendingUp
} from 'lucide-react';

// 导入课表相关组件
import { ScheduleGrid, ScheduleGridSkeleton } from '../schedule-view/components/ScheduleGrid';
import { 
  ViewMode, 
  ScheduleOption, 
  ScheduleFilters, 
  ScheduleViewData, 
  CourseSlot,
  ApiResponse 
} from '../schedule-view/types';

// Simple inline Progress component to avoid module resolution issues
const Progress = ({ value = 0, className = '' }: { value?: number; className?: string }) => (
  <div className={`relative h-2 w-full overflow-hidden rounded-full bg-gray-200 ${className}`}>
    <div 
      className="h-full bg-blue-600 transition-all duration-300" 
      style={{ width: `${Math.min(Math.max(value, 0), 100)}%` }} 
    />
  </div>
);

/**
 * 排课任务状态
 */
interface SchedulingTask {
  id: string;
  status: 'running' | 'completed' | 'failed';
  progress: {
    percentage: number;
    stage: string;
    message: string;
  };
  startTime: string;
  endTime?: string;
  result?: {
    success: boolean;
    totalScheduled: number;
    conflicts: number;
    statistics: any;
  };
  error?: string;
}

/**
 * 课程移动请求
 */
interface MoveCourseRequest {
  scheduleId: string;
  targetTimeSlot: {
    dayOfWeek: number;
    period: number;
  };
  targetRoomId?: string;
  forceMove?: boolean;
}

/**
 * 智能排课整合页面组件
 */
export default function IntegratedSchedulePage() {
  // 排课任务状态
  const [currentTask, setCurrentTask] = useState<SchedulingTask | undefined>(undefined);
  const [isStartingTask, setIsStartingTask] = useState(false);

  // 课表查看状态
  const [viewMode, setViewMode] = useState<ViewMode>('class');
  const [selectedTarget, setSelectedTarget] = useState<ScheduleOption | undefined>(undefined);
  const [availableTargets, setAvailableTargets] = useState<ScheduleOption[]>([]);
  const [scheduleData, setScheduleData] = useState<ScheduleViewData | undefined>(undefined);
  
  // 可用学年状态
  const [availableAcademicYears, setAvailableAcademicYears] = useState<string[]>([]);
  const [isLoadingAcademicYears, setIsLoadingAcademicYears] = useState(true);
  
  // 排课规则选择状态
  const [availableSchedulingRules, setAvailableSchedulingRules] = useState<Array<{
    _id: string;
    name: string;
    description?: string;
    isDefault: boolean;
    isActive: boolean;
    schoolType: string;
  }>>([]);
  const [selectedRulesId, setSelectedRulesId] = useState<string>('');
  const [isLoadingRules, setIsLoadingRules] = useState(false);
  
  const [filters, setFilters] = useState<ScheduleFilters>({
    academicYear: '', // 初始为空，等待动态加载
    semester: '1'
  });

  // 拖拽调课状态
  const [isDragging, setIsDragging] = useState(false);
  const [draggedCourse, setDraggedCourse] = useState<CourseSlot | undefined>(undefined);
  const [dropTarget, setDropTarget] = useState<{ dayOfWeek: number; period: number } | undefined>(undefined);

  // 加载状态
  const [isLoadingTargets, setIsLoadingTargets] = useState(false);
  const [isLoadingSchedule, setIsLoadingSchedule] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);

  /**
   * 监控排课任务进度
   */
  const monitorTask = useCallback(async (taskId: string) => {
    const checkStatus = async () => {
      try {
        const response = await fetch(`http://localhost:3001/api/scheduling/tasks/${taskId}`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data: ApiResponse<SchedulingTask> = await response.json();

        if (data.success && data.data) {
          setCurrentTask(data.data);

          // 如果任务完成，刷新课表数据
          if (data.data.status === 'completed') {
            if (selectedTarget) {
              loadScheduleData(viewMode, selectedTarget._id, filters);
            }
            return; // 停止轮询
          }

          // 如果任务失败，显示错误
          if (data.data.status === 'failed') {
            setError(data.data.error || '排课任务执行失败');
            return; // 停止轮询
          }

          // 继续轮询
          setTimeout(checkStatus, 2000);
        } else {
          throw new Error(data.message || '获取任务状态失败');
        }
      } catch (error) {
        console.error('查询任务状态失败:', error);
        setError('无法获取排课进度，请刷新页面重试');
      }
    };

    checkStatus();
  }, [viewMode, selectedTarget, filters]);

  /**
   * 停止排课任务
   */
  const stopScheduling = useCallback(async () => {
    if (!currentTask) return;

    try {
      const response = await fetch(`http://localhost:3001/api/scheduling/tasks/${currentTask.id}/stop`, {
        method: 'POST'
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      setCurrentTask(undefined);
    } catch (error) {
      console.error('停止任务失败:', error);
      setError('停止任务失败，请重试');
    }
  }, [currentTask]);

  /**
   * 获取可用的学年列表
   */
  const loadAvailableAcademicYears = useCallback(async () => {
    setIsLoadingAcademicYears(true);
    setError(undefined);

    try {
      const response = await fetch('http://localhost:3001/api/teaching-plans/academic-years');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data: ApiResponse<{ academicYears: string[] }> = await response.json();

      if (data.success && data.data) {
        const years = data.data.academicYears;
        setAvailableAcademicYears(years);
        
        // 自动选择第一个可用学年
        if (years.length > 0) {
          setFilters(prev => ({
            ...prev,
            academicYear: years[0]
          }));
        }
      } else {
        throw new Error(data.message || '获取学年列表失败');
      }
    } catch (error) {
      console.error('加载可用学年失败:', error);
      setError('获取可用学年失败，请检查网络连接');
      setAvailableAcademicYears([]);
    } finally {
      setIsLoadingAcademicYears(false);
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
      
      const response = await fetch(`http://localhost:3001/api/schedule-view/options/${endpoint}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
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
        academicYear: currentFilters.academicYear || '',
        semester: currentFilters.semester || ''
      });

      const response = await fetch(
        `http://localhost:3001/api/schedule-view/${endpoint}?${params}`
      );
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
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
   * 加载可用的排课规则列表
   */
  const loadAvailableSchedulingRules = useCallback(async () => {
    if (!filters.academicYear || !filters.semester) return;
    
    setIsLoadingRules(true);
    setError(undefined);

    try {
      const response = await fetch(`http://localhost:3001/api/scheduling-rules?academicYear=${filters.academicYear}&semester=${filters.semester}&isActive=true&limit=100`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data: ApiResponse<{ items: any[]; total: number }> = await response.json();

      if (data.success && data.data) {
        const rules = data.data.items;
        setAvailableSchedulingRules(rules);
        
        // 自动选择默认规则或第一个规则
        const defaultRule = rules.find(rule => rule.isDefault);
        if (defaultRule) {
          setSelectedRulesId(defaultRule._id);
        } else if (rules.length > 0) {
          setSelectedRulesId(rules[0]._id);
        }
      } else {
        throw new Error(data.message || '加载排课规则失败');
      }
    } catch (error) {
      console.error('加载排课规则失败:', error);
      setError('无法加载排课规则，将使用默认规则');
    } finally {
      setIsLoadingRules(false);
    }
  }, [filters.academicYear, filters.semester]);

  /**
   * 启动一键排课任务
   */
  const startScheduling = useCallback(async () => {
    setIsStartingTask(true);
    setError(undefined);

    // 添加详细的排课规则检查日志
    console.log('🔍 前端排课规则检查:');
    console.log('   selectedRulesId:', selectedRulesId);
    console.log('   selectedRulesId类型:', typeof selectedRulesId);
    console.log('   selectedRulesId是否为空:', !selectedRulesId);
    console.log('   availableSchedulingRules数量:', availableSchedulingRules.length);
    
    if (selectedRulesId) {
      const selectedRule = availableSchedulingRules.find(rule => rule._id === selectedRulesId);
      console.log('   ✅ 选中的排课规则:', selectedRule ? {
        id: selectedRule._id,
        name: selectedRule.name,
        description: selectedRule.description,
        isDefault: selectedRule.isDefault,
        isActive: selectedRule.isActive
      } : '未找到');
    } else {
      const defaultRule = availableSchedulingRules.find(rule => rule.isDefault);
      console.log('   ⚠️ 未选择排课规则，默认规则:', defaultRule ? {
        id: defaultRule._id,
        name: defaultRule.name,
        isDefault: defaultRule.isDefault
      } : '无默认规则');
    }

    try {
      const requestBody: any = {
        academicYear: filters.academicYear,
        semester: filters.semester,
        algorithm: 'balanced' // 使用均衡模式
      };

      // 如果选择了特定规则，添加到请求中
      if (selectedRulesId) {
        requestBody.rulesId = selectedRulesId;
        console.log('   📤 已添加排课规则ID到请求:', selectedRulesId);
      } else {
        console.log('   📤 未添加排课规则ID，将使用后端默认规则');
      }

      console.log('   📤 完整请求体:', requestBody);

      const response = await fetch('http://localhost:3001/api/scheduling/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: ApiResponse<{ taskId: string }> = await response.json();
      console.log('   📥 后端响应:', data);

      if (data.success && data.data) {
        // 开始监控任务
        monitorTask(data.data.taskId);
      } else {
        throw new Error(data.message || '启动排课任务失败');
      }
    } catch (error) {
      console.error('启动排课失败:', error);
      setError(error instanceof Error ? error.message : '启动排课失败');
    } finally {
      setIsStartingTask(false);
    }
  }, [filters, selectedRulesId, monitorTask, availableSchedulingRules]);

  /**
   * 处理课程拖拽开始
   */
  const handleDragStart = useCallback((courseSlot: CourseSlot) => {
    setIsDragging(true);
    setDraggedCourse(courseSlot);
  }, []);

  /**
   * 处理拖拽结束
   */
  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
    setDraggedCourse(undefined);
    setDropTarget(undefined);
  }, []);

  /**
   * 处理拖拽悬停
   */
  const handleDragOver = useCallback((dayOfWeek: number, period: number) => {
    if (isDragging) {
      setDropTarget({ dayOfWeek, period });
    }
  }, [isDragging]);

  /**
   * 处理课程拖拽放置
   */
  const handleDrop = useCallback(async (dayOfWeek: number, period: number) => {
    if (!draggedCourse || !draggedCourse.scheduleId) {
      handleDragEnd();
      return;
    }

    try {
      const moveRequest: MoveCourseRequest = {
        scheduleId: draggedCourse.scheduleId,
        targetTimeSlot: {
          dayOfWeek,
          period
        }
      };

      const response = await fetch('http://localhost:3001/api/manual-scheduling/move', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(moveRequest)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: ApiResponse<any> = await response.json();

      if (data.success) {
        // 刷新课表数据
        if (selectedTarget) {
          loadScheduleData(viewMode, selectedTarget._id, filters);
        }
      } else {
        // 显示冲突信息
        setError(data.error || '移动课程失败');
      }
    } catch (error) {
      console.error('移动课程失败:', error);
      setError('移动课程失败，请重试');
    } finally {
      handleDragEnd();
    }
  }, [draggedCourse, selectedTarget, viewMode, filters, loadScheduleData, handleDragEnd]);

  // 效果钩子：页面加载时获取可用学年
  useEffect(() => {
    loadAvailableAcademicYears();
  }, [loadAvailableAcademicYears]);

  // 效果钩子：学年或学期变化时加载排课规则
  useEffect(() => {
    if (filters.academicYear && filters.semester) {
      loadAvailableSchedulingRules();
    }
  }, [filters.academicYear, filters.semester, loadAvailableSchedulingRules]);

  // 效果钩子：目标或筛选条件变化时加载课表数据
  useEffect(() => {
    if (selectedTarget) {
      loadScheduleData(viewMode, selectedTarget._id, filters);
    }
  }, [selectedTarget, filters, viewMode, loadScheduleData]);

  // 效果钩子：视图模式变化时加载目标列表
  useEffect(() => {
    if (viewMode) {
      loadAvailableTargets(viewMode);
    }
  }, [viewMode, loadAvailableTargets]);

  return (
    <div className="space-y-4 sm:space-y-6 p-4 sm:p-6">
      {/* 页面标题 */}
      <div className="space-y-2">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">智能排课中心</h1>
        <p className="text-sm sm:text-base text-muted-foreground">
          一键排课、可视化展示、拖拽调课的完整解决方案
        </p>
      </div>

      {/* 系统状态概览 */}
      <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">排课状态</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {currentTask?.status === 'running' ? '进行中' :
               currentTask?.status === 'completed' ? '已完成' :
               currentTask?.status === 'failed' ? '失败' : '就绪'}
            </div>
            <p className="text-xs text-muted-foreground">
              {currentTask?.status === 'running' ? currentTask.progress.stage :
               currentTask?.status === 'completed' ? '排课任务完成' :
               '可以开始新的排课任务'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">总课程数</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {scheduleData?.metadata.totalCourses || '--'}
            </div>
            <p className="text-xs text-muted-foreground">
              {scheduleData ? '已安排课程' : '暂无数据'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">总课时数</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {scheduleData?.metadata.totalHours || '--'}
            </div>
            <p className="text-xs text-muted-foreground">
              {scheduleData ? '本周课时' : '暂无数据'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">冲突数量</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {scheduleData?.metadata.conflicts || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              需要手动调整
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 一键排课区域 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
            <Zap className="h-5 w-5 text-yellow-500" />
            一键排课
          </CardTitle>
          <CardDescription className="text-sm">
            基于教学计划和排课规则，自动生成最优课表
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 sm:space-y-4">
          {/* 排课控制 */}
          <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
            <div className="flex items-center gap-2 min-w-0">
              <label className="text-sm font-medium whitespace-nowrap">学年:</label>
              {isLoadingAcademicYears ? (
                <div className="w-32 h-9 bg-muted animate-pulse rounded-md" />
              ) : (
                <Select 
                  value={filters.academicYear} 
                  onValueChange={(value) => setFilters(prev => ({ ...prev, academicYear: value }))}
                  options={availableAcademicYears.map(year => ({
                    value: year,
                    label: year
                  }))}
                  className="w-32"
                  disabled={availableAcademicYears.length === 0}
                />
              )}
            </div>

            <div className="flex items-center gap-2 min-w-0">
              <label className="text-sm font-medium whitespace-nowrap">学期:</label>
              <Select 
                value={filters.semester} 
                onValueChange={(value) => setFilters(prev => ({ ...prev, semester: value }))}
                options={[
                  { value: "1", label: "第1学期" },
                  { value: "2", label: "第2学期" }
                ]}
                className="w-20"
              />
            </div>

            <Separator orientation="vertical" className="h-6 hidden sm:block" />

            <div className="flex items-center gap-2 min-w-0">
              <label className="text-sm font-medium whitespace-nowrap">排课规则:</label>
              {isLoadingRules ? (
                <div className="w-48 h-9 bg-muted animate-pulse rounded-md" />
              ) : (
                <Select 
                  value={selectedRulesId} 
                  onValueChange={setSelectedRulesId}
                  options={availableSchedulingRules.map(rule => ({
                    value: rule._id,
                    label: rule.isDefault ? `${rule.name} (默认)` : rule.name
                  }))}
                  className="w-48"
                  disabled={availableSchedulingRules.length === 0}
                />
              )}
            </div>

            <Separator orientation="vertical" className="h-6 hidden sm:block" />

            {currentTask?.status === 'running' ? (
              <Button onClick={stopScheduling} variant="destructive" className="flex items-center gap-2">
                <Square className="h-4 w-4" />
                停止排课
              </Button>
            ) : (
              <Button 
                onClick={startScheduling} 
                disabled={isStartingTask || !filters.academicYear || availableAcademicYears.length === 0} 
                className="flex items-center gap-2"
              >
                <Play className="h-4 w-4" />
                {isStartingTask ? '启动中...' : '开始排课'}
              </Button>
            )}
          </div>

          {/* 排课规则信息 */}
          {selectedRulesId && availableSchedulingRules.length > 0 && (
            <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 text-sm">
                <div className="flex items-center gap-2">
                  <Settings className="h-4 w-4 text-blue-600" />
                  <span className="font-medium text-blue-800">当前排课规则:</span>
                  <span className="text-blue-700">
                    {availableSchedulingRules.find(rule => rule._id === selectedRulesId)?.name}
                  </span>
                  {availableSchedulingRules.find(rule => rule._id === selectedRulesId)?.isDefault && (
                    <Badge variant="secondary" className="text-xs">默认规则</Badge>
                  )}
                </div>
              </div>
              {availableSchedulingRules.find(rule => rule._id === selectedRulesId)?.description && (
                <p className="text-xs text-blue-600 mt-1 ml-0 sm:ml-6">
                  {availableSchedulingRules.find(rule => rule._id === selectedRulesId)?.description}
                </p>
              )}
            </div>
          )}

          {/* 排课进度 */}
          {currentTask && (
            <div className="space-y-2 sm:space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {currentTask.status === 'running' && <RefreshCw className="h-4 w-4 animate-spin text-blue-500" />}
                  {currentTask.status === 'completed' && <CheckCircle className="h-4 w-4 text-green-500" />}
                  {currentTask.status === 'failed' && <AlertCircle className="h-4 w-4 text-red-500" />}
                  <span className="text-sm font-medium">
                    {currentTask.status === 'running' ? '排课进行中' :
                     currentTask.status === 'completed' ? '排课完成' :
                     '排课失败'}
                  </span>
                </div>
                <span className="text-sm text-muted-foreground">
                  {currentTask.progress.percentage}%
                </span>
              </div>

              <Progress value={currentTask.progress.percentage} className="h-2" />

              <div className="text-sm text-muted-foreground">
                {currentTask.progress.message}
              </div>

              {/* 排课结果统计 */}
              {currentTask.status === 'completed' && currentTask.result && (
                <div className="grid gap-3 sm:gap-4 p-3 sm:p-4 bg-green-50 rounded-lg grid-cols-1 sm:grid-cols-3">
                  <div className="text-center">
                    <div className="text-base sm:text-lg font-bold text-green-600">
                      {currentTask.result.totalScheduled}
                    </div>
                    <div className="text-xs text-green-500">成功安排</div>
                  </div>
                  <div className="text-center">
                    <div className="text-base sm:text-lg font-bold text-red-600">
                      {currentTask.result.conflicts}
                    </div>
                    <div className="text-xs text-red-500">冲突课程</div>
                  </div>
                  <div className="text-center">
                    <div className="text-base sm:text-lg font-bold text-blue-600">
                      {Math.round((currentTask.result.totalScheduled / (currentTask.result.totalScheduled + currentTask.result.conflicts)) * 100)}%
                    </div>
                    <div className="text-xs text-blue-500">成功率</div>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 错误提示 */}
      {error && (
        <Alert variant="destructive" className="mx-4 sm:mx-0">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-sm">{error}</AlertDescription>
        </Alert>
      )}

      {/* 学年提示 */}
      {!isLoadingAcademicYears && availableAcademicYears.length === 0 && (
        <Alert className="mx-4 sm:mx-0">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-sm">
            当前没有可用的教学计划学年。请先创建并审批教学计划，然后重新加载页面。
          </AlertDescription>
        </Alert>
      )}

      {/* 课表展示和调课区域 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
            <Calendar className="h-5 w-5 text-purple-500" />
            课表展示与调课
            {isDragging && (
              <Badge variant="secondary" className="ml-2 text-xs">
                拖拽模式
              </Badge>
            )}
          </CardTitle>
          <CardDescription className="text-sm">
            查看课表并通过拖拽进行调课
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 sm:space-y-4">
          {/* 课表控制面板 */}
          <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
            <div className="flex items-center gap-2 min-w-0">
              <label className="text-sm font-medium whitespace-nowrap">查看:</label>
              <Select 
                value={viewMode} 
                onValueChange={(value: string) => {
                  const newViewMode = value as ViewMode;
                  setViewMode(newViewMode);
                  setSelectedTarget(undefined);
                  setScheduleData(undefined);
                  if (newViewMode) {
                    loadAvailableTargets(newViewMode);
                  }
                }}
                options={[
                  { value: "class", label: "班级课表" },
                  { value: "teacher", label: "教师课表" },
                  { value: "room", label: "教室课表" }
                ]}
                className="w-32"
              />
            </div>

            <div className="flex items-center gap-2 min-w-0">
              <label className="text-sm font-medium whitespace-nowrap">目标:</label>
              <Select 
                value={selectedTarget?._id} 
                onValueChange={(value) => {
                  const target = availableTargets.find(t => t._id === value);
                  if (target) setSelectedTarget(target);
                }}
                disabled={isLoadingTargets}
                options={availableTargets.map(target => ({
                  value: target._id,
                  label: target.name
                }))}
                placeholder={`选择${viewMode === 'class' ? '班级' : viewMode === 'teacher' ? '教师' : '教室'}`}
                className="w-48"
              />
            </div>

            <Button 
              onClick={() => {
                if (selectedTarget) {
                  loadScheduleData(viewMode, selectedTarget._id, filters);
                }
                loadAvailableTargets(viewMode);
              }}
              variant="outline" 
              size="sm"
              disabled={isLoadingSchedule}
            >
              <RefreshCw className={`h-4 w-4 ${isLoadingSchedule ? 'animate-spin' : ''}`} />
            </Button>
          </div>

          {/* 课表内容 */}
          <div className="min-h-[400px] sm:min-h-[600px]">
            {isLoadingSchedule ? (
              <ScheduleGridSkeleton />
            ) : scheduleData ? (
              <ScheduleGrid
                weekSchedule={scheduleData.weekSchedule}
                onCourseClick={() => {}}
                onCourseHover={() => {}}
              />
            ) : selectedTarget ? (
              <Card className="p-4 sm:p-8 text-center">
                <div className="space-y-4">
                  <div className="text-4xl sm:text-6xl text-gray-300">📅</div>
                  <div className="space-y-2">
                    <h3 className="text-base sm:text-lg font-semibold text-gray-900">
                      暂无课表数据
                    </h3>
                    <p className="text-sm sm:text-base text-gray-500">
                      {selectedTarget.name} 在 {filters.academicYear} 学年第 {filters.semester} 学期暂无排课数据
                    </p>
                    <p className="text-xs sm:text-sm text-gray-400">
                      请先进行一键排课生成课表
                    </p>
                  </div>
                </div>
              </Card>
            ) : (
              <Card className="p-4 sm:p-8 text-center">
                <div className="space-y-4">
                  <div className="text-4xl sm:text-6xl text-gray-300">🔍</div>
                  <div className="space-y-2">
                    <h3 className="text-base sm:text-lg font-semibold text-gray-900">
                      请选择查看目标
                    </h3>
                    <p className="text-sm sm:text-base text-gray-500">
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
        </CardContent>
      </Card>

      {/* 使用提示 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base sm:text-lg">使用流程</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:gap-4 grid-cols-1 md:grid-cols-3 text-sm">
            <div className="flex items-start gap-2">
              <div className="h-6 w-6 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-medium text-blue-600">1</span>
              </div>
              <div className="min-w-0">
                <div className="font-medium">执行一键排课</div>
                <div className="text-muted-foreground text-xs">
                  设置学年学期，点击"开始排课"生成初始课表
                </div>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <div className="h-6 w-6 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-medium text-green-600">2</span>
              </div>
              <div className="min-w-0">
                <div className="font-medium">查看课表结果</div>
                <div className="text-muted-foreground text-xs">
                  选择班级/教师/教室查看对应的课表安排
                </div>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <div className="h-6 w-6 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-medium text-purple-600">3</span>
              </div>
              <div className="min-w-0">
                <div className="font-medium">拖拽调整课程</div>
                <div className="text-muted-foreground text-xs">
                  直接拖拽课程卡片到新位置进行微调
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 