/**
 * 教室利用率报告页面
 * 
 * 专注于教室维度的课表查询、利用率统计、打印与导出功能
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Building, 
  Clock,
  BarChart3,
  FileSpreadsheet,
  FileText,
  Printer,
  RefreshCw,
  AlertCircle,
  Activity,
  Target,
  Calendar,
  PieChart
} from 'lucide-react';

// 导入课表相关类型和组件
import {
  ScheduleOption,
  ScheduleFilters,
  ScheduleViewData,
  CourseSlot,
  ApiResponse
} from '@/app/management/schedules/schedule-view/types';

import { ScheduleGrid, ScheduleGridSkeleton } from '@/app/management/schedules/schedule-view/components/ScheduleGrid';

// 导入导出工具
import { exportScheduleToExcel, printSchedule, ExportOptions, PrintOptions } from '@/lib/schedule-export';

/**
 * 教室利用率统计接口
 */
interface RoomUtilizationStats {
  totalSlots: number;          // 总时段数 (5天 × 8节 = 40)
  usedSlots: number;           // 已使用时段数
  utilizationRate: number;     // 利用率百分比
  dailyUtilization: Record<number, number>; // 每日利用率
  periodUtilization: Record<number, number>; // 各节次利用率
  subjectDistribution: Record<string, number>; // 学科分布
  level: 'low' | 'normal' | 'high' | 'full'; // 利用率等级
}

/**
 * 教室利用率报告页面
 * 
 * 专注于教室课表查询和利用率分析
 */
export default function RoomUtilizationPage() {
  // 状态管理
  const [selectedRoom, setSelectedRoom] = useState<ScheduleOption>();
  const [availableRooms, setAvailableRooms] = useState<ScheduleOption[]>([]);
  const [scheduleData, setScheduleData] = useState<ScheduleViewData>();
  const [utilizationStats, setUtilizationStats] = useState<RoomUtilizationStats>();
  const [filters, setFilters] = useState<ScheduleFilters>({
    academicYear: '2024-2025',
    semester: '1'
  });

  // 加载状态
  const [isLoadingRooms, setIsLoadingRooms] = useState(false);
  const [isLoadingSchedule, setIsLoadingSchedule] = useState(false);
  const [error, setError] = useState<string>();
  const [isExporting, setIsExporting] = useState(false);

  /**
   * 加载教室列表
   */
  const loadRooms = useCallback(async () => {
    setIsLoadingRooms(true);
    setError(undefined);

    try {
      const response = await fetch('http://localhost:5000/api/schedule-view/options/rooms');
      const data: ApiResponse<ScheduleOption[]> = await response.json();

      if (data.success && data.data) {
        setAvailableRooms(data.data);
        setSelectedRoom(undefined);
        setScheduleData(undefined);
        setUtilizationStats(undefined);
      } else {
        throw new Error(data.message || '获取教室列表失败');
      }
    } catch (error) {
      console.error('加载教室列表失败:', error);
      setError('加载教室列表失败');
      setAvailableRooms([]);
    } finally {
      setIsLoadingRooms(false);
    }
  }, []);

  /**
   * 加载教室课表数据
   */
  const loadRoomSchedule = useCallback(async (
    roomId: string, 
    currentFilters: ScheduleFilters
  ) => {
    setIsLoadingSchedule(true);
    setError(undefined);

    try {
      const params = new URLSearchParams({
        academicYear: currentFilters.academicYear || '2024-2025',
        semester: currentFilters.semester || '1'
      });

      const response = await fetch(
        `http://localhost:5000/api/schedule-view/room/${roomId}?${params}`
      );
      
      const data: ApiResponse<ScheduleViewData> = await response.json();

      if (data.success && data.data) {
        setScheduleData(data.data);
        
        // 计算利用率统计
        const stats = calculateUtilizationStats(data.data);
        setUtilizationStats(stats);
      } else {
        throw new Error(data.message || '获取教室课表失败');
      }
    } catch (error) {
      console.error('加载教室课表失败:', error);
      setError('获取教室课表失败，请检查网络连接或联系管理员');
      setScheduleData(undefined);
      setUtilizationStats(undefined);
    } finally {
      setIsLoadingSchedule(false);
    }
  }, []);

  /**
   * 计算教室利用率统计
   */
  const calculateUtilizationStats = (data: ScheduleViewData): RoomUtilizationStats => {
    const totalSlots = 5 * 8; // 5天 × 8节课
    const subjectDistribution: Record<string, number> = {};
    const dailyUtilization: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    const periodUtilization: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0 };
    let usedSlots = 0;

    // 统计各维度数据
    Object.entries(data.weekSchedule).forEach(([day, daySchedule]) => {
      const dayNum = parseInt(day);
      let dailyUsed = 0;
      
      Object.entries(daySchedule).forEach(([period, courseSlot]) => {
        const periodNum = parseInt(period);
        const slot = courseSlot as CourseSlot | null;
        
        if (slot && slot.subject) {
          usedSlots++;
          dailyUsed++;
          periodUtilization[periodNum]++;
          
          const subject = slot.subject;
          subjectDistribution[subject] = (subjectDistribution[subject] || 0) + 1;
        }
      });
      
      dailyUtilization[dayNum] = (dailyUsed / 8) * 100; // 转换为百分比
    });

    // 转换节次利用率为百分比 (每节课在5天中的使用情况)
    Object.keys(periodUtilization).forEach(period => {
      const periodNum = parseInt(period);
      periodUtilization[periodNum] = (periodUtilization[periodNum] / 5) * 100;
    });

    const utilizationRate = (usedSlots / totalSlots) * 100;

    // 判断利用率等级
    let level: RoomUtilizationStats['level'] = 'normal';
    if (utilizationRate <= 25) level = 'low';
    else if (utilizationRate <= 75) level = 'normal';
    else if (utilizationRate < 100) level = 'high';
    else level = 'full';

    return {
      totalSlots,
      usedSlots,
      utilizationRate,
      dailyUtilization,
      periodUtilization,
      subjectDistribution,
      level
    };
  };

  /**
   * 获取利用率等级样式
   */
  const getUtilizationLevelStyle = (level: RoomUtilizationStats['level']) => {
    const styles = {
      low: { color: 'text-red-600', bg: 'bg-red-100', label: '利用率偏低' },
      normal: { color: 'text-blue-600', bg: 'bg-blue-100', label: '利用率正常' },
      high: { color: 'text-green-600', bg: 'bg-green-100', label: '利用率较高' },
      full: { color: 'text-purple-600', bg: 'bg-purple-100', label: '满负荷' }
    };
    return styles[level];
  };

  /**
   * 处理教室选择
   */
  const handleRoomSelect = useCallback((room: ScheduleOption) => {
    setSelectedRoom(room);
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
    if (selectedRoom) {
      loadRoomSchedule(selectedRoom._id, filters);
    }
    loadRooms();
  }, [selectedRoom, filters, loadRoomSchedule, loadRooms]);

  /**
   * 导出Excel
   */
  const handleExportExcel = useCallback(async () => {
    if (!scheduleData) return;

    setIsExporting(true);
    try {
      await exportScheduleToExcel(scheduleData, {
        includeEmpty: true,
        includeMetadata: true,
        format: 'xlsx'
      });
    } catch (error) {
      console.error('导出Excel失败:', error);
      setError('导出Excel失败，请重试');
    } finally {
      setIsExporting(false);
    }
  }, [scheduleData]);

  /**
   * 打印课表
   */
  const handlePrint = useCallback(() => {
    if (!scheduleData) return;

    try {
      printSchedule(scheduleData, {
        includeMetadata: true,
        paperSize: 'A4',
        orientation: 'landscape'
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
  }, []);

  // 效果钩子：初始化加载教室列表
  useEffect(() => {
    loadRooms();
  }, [loadRooms]);

  // 效果钩子：教室或筛选条件变化时加载课表数据
  useEffect(() => {
    if (selectedRoom) {
      loadRoomSchedule(selectedRoom._id, filters);
    }
  }, [selectedRoom, filters, loadRoomSchedule]);

  return (
    <div className="p-6 space-y-6">
      {/* 页面标题 */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-gray-900">教室利用率报告</h1>
        <p className="text-gray-600">教室课表查询与利用率统计分析</p>
      </div>

      {/* 筛选控制面板 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building className="h-5 w-5" />
            教室选择
          </CardTitle>
          <CardDescription>
            选择教室和学期，查看详细的使用安排和利用率统计
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
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

          {/* 教室选择 */}
          {availableRooms.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700">选择教室</label>
                <Badge variant="secondary" className="gap-1">
                  <Calendar className="h-3 w-3" />
                  {filters.academicYear}-{filters.semester}
                </Badge>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-2 max-h-40 overflow-y-auto border rounded-md p-3">
                {availableRooms.map((room) => {
                  const isSelected = selectedRoom?._id === room._id;
                  
                  return (
                    <Button
                      key={room._id}
                      variant={isSelected ? "default" : "outline"}
                      size="sm"
                      onClick={() => handleRoomSelect(room)}
                      className="justify-start text-left h-auto p-3"
                    >
                      <div className="space-y-1 w-full">
                        <div className="font-medium text-sm truncate">
                          {room.name}
                        </div>
                        
                        {room.roomNumber && (
                          <div className="text-xs text-gray-500">
                            {room.roomNumber}
                          </div>
                        )}
                        
                        {room.type && (
                          <div className="text-xs text-gray-500">
                            {room.type}
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
              disabled={isLoadingRooms || isLoadingSchedule}
              className="gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${(isLoadingRooms || isLoadingSchedule) ? 'animate-spin' : ''}`} />
              刷新数据
            </Button>

            {scheduleData && (
              <>
                <Button
                  onClick={handleExportExcel}
                  disabled={isExporting}
                  variant="outline"
                  className="gap-2"
                >
                  <FileSpreadsheet className="h-4 w-4" />
                  导出Excel
                </Button>

                <Button
                  onClick={handlePrint}
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

      {/* 利用率统计 */}
      {utilizationStats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Clock className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <div className="text-sm text-gray-500">使用时段</div>
                  <div className="text-2xl font-bold text-gray-900">
                    {utilizationStats.usedSlots}/{utilizationStats.totalSlots}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Target className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <div className="text-sm text-gray-500">利用率</div>
                  <div className="text-2xl font-bold text-gray-900">
                    {utilizationStats.utilizationRate.toFixed(1)}%
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <PieChart className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <div className="text-sm text-gray-500">授课学科</div>
                  <div className="text-2xl font-bold text-gray-900">
                    {Object.keys(utilizationStats.subjectDistribution).length}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${getUtilizationLevelStyle(utilizationStats.level).bg}`}>
                  <Activity className={`h-5 w-5 ${getUtilizationLevelStyle(utilizationStats.level).color}`} />
                </div>
                <div>
                  <div className="text-sm text-gray-500">利用等级</div>
                  <div className={`text-sm font-bold ${getUtilizationLevelStyle(utilizationStats.level).color}`}>
                    {getUtilizationLevelStyle(utilizationStats.level).label}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 每日利用率分析 */}
      {utilizationStats && (
        <Card>
          <CardHeader>
            <CardTitle>每日利用率分析</CardTitle>
            <CardDescription>周一至周五的教室使用情况</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-5 gap-4">
              {Object.entries(utilizationStats.dailyUtilization).map(([day, rate]) => {
                const dayNames = ['', '周一', '周二', '周三', '周四', '周五'];
                const dayNum = parseInt(day);
                return (
                  <div key={day} className="text-center">
                    <div className="text-lg font-bold text-gray-900">{rate.toFixed(1)}%</div>
                    <div className="text-sm text-gray-500">{dayNames[dayNum]}</div>
                    <div className="mt-2 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-500 h-2 rounded-full transition-all"
                        style={{ width: `${rate}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 学科分布统计 */}
      {utilizationStats && Object.keys(utilizationStats.subjectDistribution).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>学科使用分布</CardTitle>
            <CardDescription>各学科在该教室的使用情况</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {Object.entries(utilizationStats.subjectDistribution).map(([subject, hours]) => (
                <div key={subject} className="text-center">
                  <div className="text-2xl font-bold text-gray-900">{hours}</div>
                  <div className="text-sm text-gray-500">{subject}</div>
                  <div className="text-xs text-gray-400">课时</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 课表展示区域 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>教室课表</span>
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
            ) : selectedRoom ? (
              <div className="text-center py-12">
                <div className="space-y-4">
                  <div className="text-6xl text-gray-300">📅</div>
                  <div className="space-y-2">
                    <h3 className="text-lg font-semibold text-gray-900">
                      暂无课表数据
                    </h3>
                    <p className="text-gray-500">
                      {selectedRoom.name} 在 {filters.academicYear} 学年第 {filters.semester} 学期暂无使用安排
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="space-y-4">
                  <div className="text-6xl text-gray-300">🏫</div>
                  <div className="space-y-2">
                    <h3 className="text-lg font-semibold text-gray-900">
                      请选择教室
                    </h3>
                    <p className="text-gray-500">
                      在上方选择要查看课表和利用率的教室
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