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
// Simple inline Progress component to avoid module resolution issues
const Progress = ({ value = 0, className = '' }: { value?: number; className?: string }) => (
  <div className={`relative h-2 w-full overflow-hidden rounded-full bg-gray-200 ${className}`}>
    <div 
      className="h-full bg-blue-600 transition-all duration-300" 
      style={{ width: `${Math.min(Math.max(value, 0), 100)}%` }} 
    />
  </div>
);
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
  const [currentTask, setCurrentTask] = useState<SchedulingTask>();
  const [isStartingTask, setIsStartingTask] = useState(false);

  // 课表查看状态
  const [viewMode, setViewMode] = useState<ViewMode>('class');
  const [selectedTarget, setSelectedTarget] = useState<ScheduleOption>();
  const [availableTargets, setAvailableTargets] = useState<ScheduleOption[]>([]);
  const [scheduleData, setScheduleData] = useState<ScheduleViewData>();
  const [filters, setFilters] = useState<ScheduleFilters>({
    academicYear: '2024-2025',
    semester: '1'
  });

  // 拖拽调课状态
  const [isDragging, setIsDragging] = useState(false);
  const [draggedCourse, setDraggedCourse] = useState<CourseSlot>();
  const [dropTarget, setDropTarget] = useState<{ dayOfWeek: number; period: number }>();

  // 加载状态
  const [isLoadingTargets, setIsLoadingTargets] = useState(false);
  const [isLoadingSchedule, setIsLoadingSchedule] = useState(false);
  const [error, setError] = useState<string>();

  /**
   * 启动一键排课任务
   */
  const startScheduling = useCallback(async () => {
    setIsStartingTask(true);
    setError(undefined);

    try {
      const response = await fetch('http://localhost:5000/api/scheduling/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          academicYear: filters.academicYear,
          semester: filters.semester,
          algorithm: 'balanced' // 使用均衡模式
        })
      });

      const data: ApiResponse<{ taskId: string }> = await response.json();

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
  }, [filters]);

  /**
   * 监控排课任务进度
   */
  const monitorTask = useCallback(async (taskId: string) => {
    const checkStatus = async () => {
      try {
        const response = await fetch(`http://localhost:5000/api/scheduling/tasks/${taskId}`);
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
      await fetch(`http://localhost:5000/api/scheduling/tasks/${currentTask.id}/stop`, {
        method: 'POST'
      });
      setCurrentTask(undefined);
    } catch (error) {
      console.error('停止任务失败:', error);
    }
  }, [currentTask]);

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

      const response = await fetch('http://localhost:5000/api/manual-scheduling/move', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(moveRequest)
      });

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
      {/* 页面标题 */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">智能排课中心</h1>
        <p className="text-muted-foreground">
          一键排课、可视化展示、拖拽调课的完整解决方案
        </p>
      </div>

      {/* 系统状态概览 */}
      <div className="grid gap-4 md:grid-cols-4">
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
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-yellow-500" />
            一键排课
          </CardTitle>
          <CardDescription>
            基于教学计划和排课规则，自动生成最优课表
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 排课控制 */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">学年:</label>
                          <Select 
              value={filters.academicYear} 
              onValueChange={(value) => setFilters(prev => ({ ...prev, academicYear: value }))}
              options={[
                { value: "2024-2025", label: "2024-2025" },
                { value: "2023-2024", label: "2023-2024" }
              ]}
              className="w-32"
            />
            </div>

            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">学期:</label>
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

            <Separator orientation="vertical" className="h-6" />

            {currentTask?.status === 'running' ? (
              <Button onClick={stopScheduling} variant="destructive" className="flex items-center gap-2">
                <Square className="h-4 w-4" />
                停止排课
              </Button>
            ) : (
              <Button onClick={startScheduling} disabled={isStartingTask} className="flex items-center gap-2">
                <Play className="h-4 w-4" />
                {isStartingTask ? '启动中...' : '开始排课'}
              </Button>
            )}
          </div>

          {/* 排课进度 */}
          {currentTask && (
            <div className="space-y-3">
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
                <div className="grid grid-cols-3 gap-4 p-4 bg-green-50 rounded-lg">
                  <div className="text-center">
                    <div className="text-lg font-bold text-green-600">
                      {currentTask.result.totalScheduled}
                    </div>
                    <div className="text-xs text-green-500">成功安排</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-red-600">
                      {currentTask.result.conflicts}
                    </div>
                    <div className="text-xs text-red-500">冲突课程</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-blue-600">
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
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* 课表展示和调课区域 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-purple-500" />
            课表展示与调课
            {isDragging && (
              <Badge variant="secondary" className="ml-2">
                拖拽模式
              </Badge>
            )}
          </CardTitle>
          <CardDescription>
            查看课表并通过拖拽进行调课
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 课表控制面板 */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">查看:</label>
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

            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">目标:</label>
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
          <div className="min-h-[600px]">
            {isLoadingSchedule ? (
              <ScheduleGridSkeleton />
            ) : scheduleData ? (
              <ScheduleGrid
                weekSchedule={scheduleData.weekSchedule}
                onCourseClick={() => {}}
                onCourseHover={() => {}}
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
                      请先进行一键排课生成课表
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
        </CardContent>
      </Card>

      {/* 使用提示 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">使用流程</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3 text-sm">
            <div className="flex items-start gap-2">
              <div className="h-6 w-6 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-medium text-blue-600">1</span>
              </div>
              <div>
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
              <div>
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
              <div>
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