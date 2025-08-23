/**
 * 教师工作量报告页面
 * 
 * 专注于教师维度的课表查询、工作量统计、打印与导出功能
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  User, 
  Clock,
  BookOpen,
  FileSpreadsheet,
  FileText,
  Printer,
  RefreshCw,
  AlertCircle,
  BarChart3,
  TrendingUp,
  Calendar,
  Search,
  Filter
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

// 导入学年学期选择器组件
import { AcademicPeriodSelector } from '@/app/management/schedules/schedule-view/components/AcademicPeriodSelector';

// 导入导出工具
import { exportSchedule, ExportOptions } from '@/lib/schedule-export';

/**
 * 教师工作量统计接口
 */
interface TeacherWorkloadStats {
  totalHours: number;
  totalCourses: number;
  subjectDistribution: Record<string, number>;
  dailyHours: Record<number, number>;
  busyLevel: 'light' | 'normal' | 'heavy' | 'overloaded';
}

/**
 * 教师工作量报告页面
 * 
 * 专注于教师课表查询和工作量分析
 */
export default function TeacherWorkloadPage() {
  // 状态管理
  const [selectedTeacher, setSelectedTeacher] = useState<ScheduleOption>();
  const [availableTeachers, setAvailableTeachers] = useState<ScheduleOption[]>([]);
  const [scheduleData, setScheduleData] = useState<ScheduleViewData>();
  const [workloadStats, setWorkloadStats] = useState<TeacherWorkloadStats>();
  const [filters, setFilters] = useState<ScheduleFilters>({
    academicYear: '',
    semester: ''
  });

  // 加载状态
  const [isLoadingTeachers, setIsLoadingTeachers] = useState(false);
  const [isLoadingSchedule, setIsLoadingSchedule] = useState(false);
  const [error, setError] = useState<string>();
  const [isExporting, setIsExporting] = useState(false);

  // 搜索和筛选状态
  const [teacherSearch, setTeacherSearch] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'hours'>('hours');

  // 教师课时数据
  const [teacherHoursData, setTeacherHoursData] = useState<Record<string, number>>({});

  /**
   * 加载教师列表
   */
  const loadTeachers = useCallback(async () => {
    setIsLoadingTeachers(true);
    setError(undefined);

    try {
      const response = await fetch('/api/schedule-view/options/teachers');
      const data: ApiResponse<ScheduleOption[]> = await response.json();

      if (data.success && data.data) {
        setAvailableTeachers(data.data);
        setSelectedTeacher(undefined);
        setScheduleData(undefined);
        setWorkloadStats(undefined);
        
        // 加载所有教师的课时数据
        await loadAllTeacherHours(data.data);
      } else {
        throw new Error(data.message || '获取教师列表失败');
      }
    } catch (error) {
      console.error('加载教师列表失败:', error);
      setError('加载教师列表失败');
      setAvailableTeachers([]);
    } finally {
      setIsLoadingTeachers(false);
    }
  }, []);

  /**
   * 加载所有教师的课时数据
   */
  const loadAllTeacherHours = useCallback(async (teachers: ScheduleOption[]) => {
    if (!filters.academicYear || !filters.semester) return;

    try {
      const hoursData: Record<string, number> = {};
      
      // 为每个教师获取课时数据
      for (const teacher of teachers) {
        try {
          const params = new URLSearchParams({
            academicYear: filters.academicYear,
            semester: filters.semester
          });

          const response = await fetch(
            `/api/schedule-view/teacher/${teacher._id}?${params}`
          );
          
          if (response.ok) {
            const data: ApiResponse<ScheduleViewData> = await response.json();
            if (data.success && data.data) {
              hoursData[teacher._id] = data.data.metadata.totalHours;
            } else {
              hoursData[teacher._id] = 0;
            }
          } else {
            hoursData[teacher._id] = 0;
          }
        } catch (error) {
          console.error(`获取教师 ${teacher.name} 课时数据失败:`, error);
          hoursData[teacher._id] = 0;
        }
      }
      
      setTeacherHoursData(hoursData);
    } catch (error) {
      console.error('加载教师课时数据失败:', error);
    }
  }, [filters.academicYear, filters.semester]);

  /**
   * 加载教师课表数据
   */
  const loadTeacherSchedule = useCallback(async (
    teacherId: string, 
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
        `/api/schedule-view/teacher/${teacherId}?${params}`
      );
      
      const data: ApiResponse<ScheduleViewData> = await response.json();

      if (data.success && data.data) {
        setScheduleData(data.data);
        
        // 计算工作量统计
        const stats = calculateWorkloadStats(data.data);
        setWorkloadStats(stats);
      } else {
        throw new Error(data.message || '获取教师课表失败');
      }
    } catch (error) {
      console.error('加载教师课表失败:', error);
      setError('获取教师课表失败，请检查网络连接或联系管理员');
      setScheduleData(undefined);
      setWorkloadStats(undefined);
    } finally {
      setIsLoadingSchedule(false);
    }
  }, []);

  /**
   * 计算教师工作量统计
   */
  const calculateWorkloadStats = (data: ScheduleViewData): TeacherWorkloadStats => {
    const subjectDistribution: Record<string, number> = {};
    const dailyHours: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    let totalHours = 0;
    let totalCourses = 0;

         // 统计各维度数据
     Object.entries(data.weekSchedule).forEach(([day, daySchedule]) => {
       const dayNum = parseInt(day);
       Object.values(daySchedule).forEach(courseSlot => {
         const slot = courseSlot as CourseSlot | null;
         if (slot && slot.subject) {
           totalHours++;
           totalCourses++;
           dailyHours[dayNum]++;
           
           const subject = slot.subject;
           subjectDistribution[subject] = (subjectDistribution[subject] || 0) + 1;
         }
       });
     });

    // 判断工作负荷等级
    let busyLevel: TeacherWorkloadStats['busyLevel'] = 'normal';
    if (totalHours <= 12) busyLevel = 'light';
    else if (totalHours <= 20) busyLevel = 'normal';
    else if (totalHours <= 28) busyLevel = 'heavy';
    else busyLevel = 'overloaded';

    return {
      totalHours,
      totalCourses,
      subjectDistribution,
      dailyHours,
      busyLevel
    };
  };

  /**
   * 获取工作负荷等级样式
   */
  const getBusyLevelStyle = (level: TeacherWorkloadStats['busyLevel']) => {
    const styles = {
      light: { color: 'text-green-600', bg: 'bg-green-100', label: '轻松' },
      normal: { color: 'text-blue-600', bg: 'bg-blue-100', label: '正常' },
      heavy: { color: 'text-yellow-600', bg: 'bg-yellow-100', label: '繁忙' },
      overloaded: { color: 'text-red-600', bg: 'bg-red-100', label: '超负荷' }
    };
    return styles[level];
  };

  /**
   * 获取所有可用学科列表
   */
  const getAvailableSubjects = () => {
    const subjects = new Set<string>();
    availableTeachers.forEach(teacher => {
      if (teacher.subjects) {
        teacher.subjects.forEach(subject => subjects.add(subject));
      }
    });
    return Array.from(subjects).sort();
  };

  /**
   * 获取筛选后的教师列表
   */
  const getFilteredTeachers = () => {
    let filtered = availableTeachers.filter(teacher => {
      // 姓名搜索
      const nameMatch = !teacherSearch || 
        teacher.name.toLowerCase().includes(teacherSearch.toLowerCase());
      
      // 学科筛选
      const subjectMatch = !subjectFilter || 
        (teacher.subjects && teacher.subjects.includes(subjectFilter));
      
      return nameMatch && subjectMatch;
    });

    // 添加课时统计
    const teachersWithHours = filtered.map(teacher => {
      const totalHours = teacherHoursData[teacher._id] || 0;
      
      return {
        ...teacher,
        totalHours
      };
    });

    // 排序
    teachersWithHours.sort((a, b) => {
      if (sortBy === 'hours') {
        // 按课时数降序排列（课时多的在前）
        return b.totalHours - a.totalHours;
      } else {
        // 按姓名排序
        return a.name.localeCompare(b.name, 'zh-CN');
      }
    });

    return teachersWithHours;
  };

  /**
   * 处理教师选择
   */
  const handleTeacherSelect = useCallback((teacher: ScheduleOption) => {
    setSelectedTeacher(teacher);
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
    if (selectedTeacher) {
      loadTeacherSchedule(selectedTeacher._id, filters);
    }
    loadTeachers();
  }, [selectedTeacher, filters, loadTeacherSchedule, loadTeachers]);

  /**
   * 导出Excel
   */
  const handleExportExcel = useCallback(async () => {
    if (!scheduleData) return;

    setIsExporting(true);
    try {
      await exportSchedule(scheduleData, 'class', {
        format: 'excel',
        includeDetails: true,
        fileName: `${scheduleData.targetName}_课表_${scheduleData.academicYear}_${scheduleData.semester}`
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
      exportSchedule(scheduleData, 'class', {
        format: 'print',
        includeDetails: true,
        pageSize: 'A4',
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

  // 效果钩子：初始化加载教师列表
  useEffect(() => {
    loadTeachers();
  }, [loadTeachers]);

  // 效果钩子：教师或筛选条件变化时加载课表数据
  useEffect(() => {
    if (selectedTeacher) {
      loadTeacherSchedule(selectedTeacher._id, filters);
    }
  }, [selectedTeacher, filters, loadTeacherSchedule]);

  // 效果钩子：学年学期变化时重新加载教师课时数据
  useEffect(() => {
    if (availableTeachers.length > 0 && filters.academicYear && filters.semester) {
      loadAllTeacherHours(availableTeachers);
    }
  }, [filters.academicYear, filters.semester, availableTeachers, loadAllTeacherHours]);

  return (
    <div className="p-6 space-y-6">
      {/* 页面标题 */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-gray-900">教师工作量报告</h1>
        <p className="text-gray-600">教师课表查询与工作量统计分析</p>
      </div>

      {/* 筛选控制面板 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            教师选择
          </CardTitle>
          <CardDescription>
            选择教师和学期，查看详细的课表安排和工作量统计
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* 学年学期选择器 */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">学年学期</label>
            <AcademicPeriodSelector
              value={filters}
              onChange={handleFiltersChange}
            />
          </div>

          {/* 教师选择 */}
          {availableTeachers.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700">选择教师</label>
                <Badge variant="secondary" className="gap-1">
                  <Calendar className="h-3 w-3" />
                  {filters.academicYear}-{filters.semester}
                </Badge>
              </div>

              {/* 搜索和筛选区域 */}
              <div className="flex flex-col sm:flex-row gap-3">
                {/* 教师姓名搜索 */}
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="搜索教师姓名..."
                    value={teacherSearch}
                    onChange={(e) => setTeacherSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                </div>

                {/* 学科筛选 */}
                <div className="sm:w-48">
                  <select
                    value={subjectFilter}
                    onChange={(e) => setSubjectFilter(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  >
                    <option value="">所有学科</option>
                    {getAvailableSubjects().map((subject) => (
                      <option key={subject} value={subject}>
                        {subject}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 排序方式 */}
                <div className="sm:w-32">
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as 'name' | 'hours')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  >
                    <option value="hours">按课时排序</option>
                    <option value="name">按姓名排序</option>
                  </select>
                </div>
              </div>

              {/* 搜索结果统计 */}
              <div className="flex items-center justify-between text-sm text-gray-600">
                <div className="space-y-1">
                  <div>
                    共找到 {getFilteredTeachers().length} 位教师
                    {teacherSearch && ` (搜索: "${teacherSearch}")`}
                    {subjectFilter && ` (学科: ${subjectFilter})`}
                  </div>
                  {getFilteredTeachers().length > 0 && (
                    <div className="text-xs text-gray-500">
                      总课时: {getFilteredTeachers().reduce((sum, teacher: any) => sum + teacher.totalHours, 0)} 课时
                      {sortBy === 'hours' && ' (按课时排序)'}
                      {sortBy === 'name' && ' (按姓名排序)'}
                      {Object.keys(teacherHoursData).length === 0 && ' (加载中...)'}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {(teacherSearch || subjectFilter) && (
                    <button
                      onClick={() => {
                        setTeacherSearch('');
                        setSubjectFilter('');
                      }}
                      className="text-blue-600 hover:text-blue-800 underline"
                    >
                      清除筛选
                    </button>
                  )}
                  {Object.keys(teacherHoursData).length === 0 && (
                    <div className="flex items-center gap-1 text-orange-600">
                      <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-orange-600"></div>
                      加载课时数据中...
                    </div>
                  )}
                </div>
              </div>
              
              {/* 教师网格 */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-2 max-h-60 overflow-y-auto border rounded-md p-3">
                {getFilteredTeachers().map((teacher: any) => {
                  const isSelected = selectedTeacher?._id === teacher._id;
                  
                  return (
                    <Button
                      key={teacher._id}
                      variant={isSelected ? "default" : "outline"}
                      size="sm"
                      onClick={() => handleTeacherSelect(teacher)}
                      className="justify-start text-left h-auto p-3 hover:shadow-md transition-shadow"
                    >
                      <div className="space-y-1 w-full">
                        <div className="font-medium text-sm truncate">
                          {teacher.name}
                        </div>
                        
                        {teacher.subjects && (
                          <div className="text-xs text-gray-500 truncate">
                            {teacher.subjects.slice(0, 2).join('、')}
                            {teacher.subjects.length > 2 && '等'}
                          </div>
                        )}

                        {/* 课时数显示 */}
                        <div className={`text-xs font-medium px-2 py-1 rounded mt-1 ${
                          teacher.totalHours >= 30 ? 'text-red-600 bg-red-50' :
                          teacher.totalHours >= 20 ? 'text-orange-600 bg-orange-50' :
                          teacher.totalHours >= 15 ? 'text-yellow-600 bg-yellow-50' :
                          'text-blue-600 bg-blue-50'
                        }`}>
                          {teacher.totalHours} 课时
                          {teacher.totalHours >= 30 && ' (超负荷)'}
                          {teacher.totalHours >= 20 && teacher.totalHours < 30 && ' (繁忙)'}
                          {teacher.totalHours >= 15 && teacher.totalHours < 20 && ' (正常)'}
                          {teacher.totalHours < 15 && ' (轻松)'}
                        </div>
                      </div>
                    </Button>
                  );
                })}
              </div>

              {/* 无搜索结果提示 */}
              {getFilteredTeachers().length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <div className="space-y-2">
                    <div className="text-4xl">🔍</div>
                    <div>没有找到匹配的教师</div>
                    <div className="text-sm">
                      请尝试调整搜索条件或清除筛选
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 操作按钮 */}
          <div className="flex items-center gap-2 pt-4 border-t">
            <Button
              onClick={handleRefresh}
              disabled={isLoadingTeachers || isLoadingSchedule}
              className="gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${(isLoadingTeachers || isLoadingSchedule) ? 'animate-spin' : ''}`} />
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

      {/* 工作量统计 */}
      {workloadStats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Clock className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <div className="text-sm text-gray-500">总课时数</div>
                  <div className="text-2xl font-bold text-gray-900">
                    {workloadStats.totalHours}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <BookOpen className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <div className="text-sm text-gray-500">授课课程</div>
                  <div className="text-2xl font-bold text-gray-900">
                    {Object.keys(workloadStats.subjectDistribution).length}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <BarChart3 className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <div className="text-sm text-gray-500">平均日课时</div>
                  <div className="text-2xl font-bold text-gray-900">
                    {(workloadStats.totalHours / 5).toFixed(1)}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${getBusyLevelStyle(workloadStats.busyLevel).bg}`}>
                  <TrendingUp className={`h-5 w-5 ${getBusyLevelStyle(workloadStats.busyLevel).color}`} />
                </div>
                <div>
                  <div className="text-sm text-gray-500">工作负荷</div>
                  <div className={`text-2xl font-bold ${getBusyLevelStyle(workloadStats.busyLevel).color}`}>
                    {getBusyLevelStyle(workloadStats.busyLevel).label}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 学科分布统计 */}
      {workloadStats && Object.keys(workloadStats.subjectDistribution).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>学科分布</CardTitle>
            <CardDescription>各学科的课时分布情况</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {Object.entries(workloadStats.subjectDistribution).map(([subject, hours]) => (
                <div key={subject} className="text-center">
                  <div className="text-2xl font-bold text-gray-900">{hours}</div>
                  <div className="text-sm text-gray-500">{subject}</div>
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
            <span>教师课表</span>
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
            ) : selectedTeacher ? (
              <div className="text-center py-12">
                <div className="space-y-4">
                  <div className="text-6xl text-gray-300">📅</div>
                  <div className="space-y-2">
                    <h3 className="text-lg font-semibold text-gray-900">
                      暂无课表数据
                    </h3>
                    <p className="text-gray-500">
                      {selectedTeacher.name} 老师在 {filters.academicYear} 学年第 {filters.semester} 学期暂无授课安排
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="space-y-4">
                  <div className="text-6xl text-gray-300">👨‍🏫</div>
                  <div className="space-y-2">
                    <h3 className="text-lg font-semibold text-gray-900">
                      请选择教师
                    </h3>
                    <p className="text-gray-500">
                      在上方选择要查看课表和工作量的教师
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