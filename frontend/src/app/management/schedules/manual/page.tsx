/**
 * 手动排课页面
 * 
 * 提供手动创建和编辑课程安排的功能界面
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Plus, 
  Search, 
  Calendar, 
  Clock, 
  Users, 
  MapPin,
  BookOpen,
  GraduationCap,
  AlertTriangle,
  CheckCircle,
  Edit2,
  Trash2,
  Save,
  Building2
} from 'lucide-react';

// 导入安全的数据访问助手函数
import { 
  getClassName, 
  getTeacherName, 
  getCourseName, 
  getRoomName,
  safeMapToOptions,
  safeSearch,
  isValidSchedule,
  getScheduleDisplayInfo
} from '@/lib/data-helpers';

// 导入共享类型
import { ScheduleItem, ConflictInfo, Option } from '@/types/schedule';

/**
 * 手动排课页面组件
 */
export default function ManualSchedulePage() {
  // 基础数据状态
  const [classes, setClasses] = useState<Option[]>([]);
  const [courses, setCourses] = useState<Option[]>([]);
  const [teachers, setTeachers] = useState<Option[]>([]);
  const [rooms, setRooms] = useState<Option[]>([]);

  // 课程安排状态
  const [schedules, setSchedules] = useState<ScheduleItem[]>([]);
  const [editingSchedule, setEditingSchedule] = useState<ScheduleItem | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  // 表单状态
  const [formData, setFormData] = useState({
    classId: '',
    courseId: '',
    teacherId: '',
    roomId: '',
    dayOfWeek: '',
    period: '',
    academicYear: '2024-2025',
    semester: '1'
  });

  // 筛选状态
  const [filters, setFilters] = useState({
    academicYear: '2024-2025',
    semester: '1',
    searchTerm: ''
  });

  // UI状态
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();
  const [conflicts, setConflicts] = useState<ConflictInfo[]>([]);

  // 时间配置
  const WEEKDAYS = ['周一', '周二', '周三', '周四', '周五'];
  const PERIODS = [1, 2, 3, 4, 5, 6, 7, 8];

  /**
   * 页面初始化
   */
  useEffect(() => {
    loadBasicData();
    loadSchedules();
  }, [filters.academicYear, filters.semester]);

  /**
   * 加载基础数据
   */
  const loadBasicData = async () => {
    try {
      setLoading(true);
      const [classRes, courseRes, teacherRes, roomRes] = await Promise.all([
        fetch('/api/classes'),
        fetch('/api/courses'),
        fetch('/api/teachers'),
        fetch('/api/rooms')
      ]);

      const [classData, courseData, teacherData, roomData] = await Promise.all([
        classRes.json(),
        courseRes.json(),
        teacherRes.json(),
        roomRes.json()
      ]);

      if (classData.success) setClasses(classData.data.items || classData.data || []);
      if (courseData.success) setCourses(courseData.data.items || courseData.data || []);
      if (teacherData.success) setTeachers(teacherData.data.items || teacherData.data || []);
      if (roomData.success) setRooms(roomData.data.items || roomData.data || []);
    } catch (error) {
      console.error('加载基础数据失败:', error);
      setError('加载基础数据失败');
    } finally {
      setLoading(false);
    }
  };

  /**
   * 加载课程安排
   */
  const loadSchedules = async () => {
    try {
      const response = await fetch(
        `/api/schedules?academicYear=${filters.academicYear}&semester=${filters.semester}`
      );
      const data = await response.json();
      
      if (data.success) {
        setSchedules(data.data || []);
      } else {
        console.error('加载课程安排失败:', data.message);
        setError(data.message || '加载课程安排失败');
      }
    } catch (error) {
      console.error('加载课程安排失败:', error);
      setError('加载课程安排失败');
    }
  };

  /**
   * 检查冲突
   */
  const checkConflicts = async (scheduleData: any) => {
    try {
      const response = await fetch('/api/manual-scheduling/check-conflicts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          academicYear: scheduleData.academicYear,
          semester: `${scheduleData.academicYear}-${scheduleData.semester}`,
          dayOfWeek: parseInt(scheduleData.dayOfWeek),
          period: parseInt(scheduleData.period),
          teacherId: scheduleData.teacherId,
          classId: scheduleData.classId,
          roomId: scheduleData.roomId,
          excludeScheduleIds: editingSchedule ? [editingSchedule._id] : []
        })
      });

      const data = await response.json();
      
      if (data.success && data.data.hasConflicts) {
        const conflictMessages: ConflictInfo[] = (data.data.conflicts || []).map((conflict: any) => ({
          type: conflict.teacher ? 'teacher' : conflict.class ? 'class' : 'room',
          message: `${conflict.teacher ? '教师' : conflict.class ? '班级' : '教室'}时间冲突`,
          conflictingSchedule: conflict
        }));
        setConflicts(conflictMessages);
        return false;
      }

      setConflicts([]);
      return true;
    } catch (error) {
      console.error('检查冲突失败:', error);
      return false;
    }
  };

  /**
   * 保存课程安排
   */
  const saveSchedule = async () => {
    if (!formData.classId || !formData.courseId || !formData.teacherId || !formData.roomId || 
        !formData.dayOfWeek || !formData.period) {
      setError('请填写所有必需字段');
      return;
    }

    // 检查冲突
    const isValid = await checkConflicts(formData);
    if (!isValid && conflicts.length > 0) {
      setError('存在时间冲突，请选择其他时间段');
      return;
    }

    try {
      setLoading(true);
      
      const scheduleData = {
        class: formData.classId,
        course: formData.courseId,
        teacher: formData.teacherId,
        room: formData.roomId,
        dayOfWeek: parseInt(formData.dayOfWeek),
        period: parseInt(formData.period),
        academicYear: formData.academicYear,
        semester: `${formData.academicYear}-${formData.semester}`,
        status: 'active'
      };

      const url = editingSchedule 
        ? `/api/schedules/${editingSchedule._id}`
        : '/api/schedules';
      
      const method = editingSchedule ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(scheduleData)
      });

      const data = await response.json();
      
      if (data.success) {
        await loadSchedules();
        resetForm();
        setError(undefined);
      } else {
        setError(data.message || '保存失败');
      }
    } catch (error) {
      console.error('保存课程安排失败:', error);
      setError('保存课程安排失败');
    } finally {
      setLoading(false);
    }
  };

  /**
   * 删除课程安排
   */
  const deleteSchedule = async (id: string) => {
    if (!confirm('确定要删除这个课程安排吗？')) return;

    try {
              const response = await fetch(`/api/schedules/${id}`, {
        method: 'DELETE'
      });

      const data = await response.json();
      
      if (data.success) {
        await loadSchedules();
      } else {
        setError(data.message || '删除失败');
      }
    } catch (error) {
      console.error('删除课程安排失败:', error);
      setError('删除课程安排失败');
    }
  };

  /**
   * 编辑课程安排
   */
  const editSchedule = (schedule: ScheduleItem) => {
    // 验证数据完整性
    if (!isValidSchedule(schedule)) {
      setError('课程安排数据不完整，无法编辑');
      return;
    }

    setEditingSchedule(schedule);
    // 从完整的semester格式("2024-2025-1")中提取学期部分("1")
    const semesterPart = schedule.semester.split('-')[2] || schedule.semester;
    setFormData({
      classId: schedule.class?._id || '',
      courseId: schedule.course?._id || '',
      teacherId: schedule.teacher?._id || '',
      roomId: schedule.room?._id || '',
      dayOfWeek: schedule.dayOfWeek.toString(),
      period: schedule.period.toString(),
      academicYear: schedule.academicYear,
      semester: semesterPart
    });
    setIsCreating(true);
    setConflicts([]);
  };

  /**
   * 重置表单
   */
  const resetForm = () => {
    setFormData({
      classId: '',
      courseId: '',
      teacherId: '',
      roomId: '',
      dayOfWeek: '',
      period: '',
      academicYear: filters.academicYear,
      semester: filters.semester
    });
    setEditingSchedule(null);
    setIsCreating(false);
    setConflicts([]);
    setError(undefined);
  };

  /**
   * 过滤课程安排
   */
  const filteredSchedules = safeSearch(
    schedules,
    filters.searchTerm,
    ['class.name', 'course.name', 'teacher.name', 'room.name']
  );

  return (
    <div className="p-6 space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">手动排课</h1>
          <p className="text-muted-foreground">手动创建和编辑课程安排</p>
        </div>
        
        <Button 
          onClick={() => setIsCreating(true)}
          className="flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          新建课程安排
        </Button>
      </div>

      {/* 筛选和搜索 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">筛选条件</CardTitle>
        </CardHeader>
        <CardContent className="flex gap-4 items-end">
          <div className="grid grid-cols-3 gap-4 flex-1">
            <div>
              <Label>学年</Label>
              <Select 
                value={filters.academicYear} 
                onValueChange={(value) => setFilters(prev => ({ ...prev, academicYear: value }))}
                options={[
                  { value: "2024-2025", label: "2024-2025学年" },
                  { value: "2023-2024", label: "2023-2024学年" }
                ]}
              />
            </div>
            
            <div>
              <Label>学期</Label>
              <Select 
                value={filters.semester} 
                onValueChange={(value) => setFilters(prev => ({ ...prev, semester: value }))}
                options={[
                  { value: "1", label: "第一学期" },
                  { value: "2", label: "第二学期" }
                ]}
              />
            </div>
            
            <div>
              <Label>搜索</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="搜索班级、课程、教师或教室..."
                  value={filters.searchTerm}
                  onChange={(e) => setFilters(prev => ({ ...prev, searchTerm: e.target.value }))}
                  className="pl-10"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 新建/编辑表单 */}
      {isCreating && (
        <Card>
          <CardHeader>
            <CardTitle>{editingSchedule ? '编辑' : '新建'}课程安排</CardTitle>
            <CardDescription>
              {editingSchedule ? '修改现有的课程安排信息' : '创建新的课程安排'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {conflicts.length > 0 && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-1">
                    <div className="font-medium">检测到时间冲突：</div>
                    {(conflicts || []).map((conflict, index) => (
                      <div key={index} className="text-sm">
                        • {conflict.message}
                      </div>
                    ))}
                  </div>
                </AlertDescription>
              </Alert>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>班级</Label>
                <Select 
                  value={formData.classId} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, classId: value }))}
                  placeholder="选择班级"
                  options={safeMapToOptions(classes)}
                />
              </div>

              <div>
                <Label>课程</Label>
                <Select 
                  value={formData.courseId} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, courseId: value }))}
                  placeholder="选择课程"
                  options={safeMapToOptions(courses)}
                />
              </div>

              <div>
                <Label>教师</Label>
                <Select 
                  value={formData.teacherId} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, teacherId: value }))}
                  placeholder="选择教师"
                  options={safeMapToOptions(teachers)}
                />
              </div>

              <div>
                <Label>教室</Label>
                <Select 
                  value={formData.roomId} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, roomId: value }))}
                  placeholder="选择教室"
                  options={safeMapToOptions(rooms)}
                />
              </div>

              <div>
                <Label>星期</Label>
                <Select 
                  value={formData.dayOfWeek} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, dayOfWeek: value }))}
                  placeholder="选择星期"
                  options={WEEKDAYS.map((day, index) => ({ value: (index + 1).toString(), label: day }))}
                />
              </div>

              <div>
                <Label>节次</Label>
                <Select 
                  value={formData.period} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, period: value }))}
                  placeholder="选择节次"
                  options={PERIODS.map(period => ({ value: period.toString(), label: `第${period}节` }))}
                />
              </div>
            </div>

            <div className="flex gap-2 pt-4">
              <Button onClick={saveSchedule} disabled={loading}>
                <Save className="h-4 w-4 mr-2" />
                {loading ? '保存中...' : '保存'}
              </Button>
              <Button variant="outline" onClick={resetForm}>
                取消
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 课程安排列表 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            课程安排列表
            <Badge variant="secondary">{filteredSchedules.length}个</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredSchedules.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              暂无课程安排
            </div>
          ) : (
            <div className="space-y-4">
              {filteredSchedules.map(schedule => {
                const displayInfo = getScheduleDisplayInfo(schedule);
                return (
                  <div key={schedule._id} className="border rounded-lg p-4 hover:bg-muted/30 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-blue-500" />
                          <span className="font-medium">{displayInfo.className}</span>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <BookOpen className="h-4 w-4 text-green-500" />
                          <span>{displayInfo.courseName}</span>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <GraduationCap className="h-4 w-4 text-purple-500" />
                          <span>{displayInfo.teacherName}</span>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-orange-500" />
                          <span>{displayInfo.roomName}</span>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-gray-500" />
                          <span>{displayInfo.timeSlot}</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Badge variant={schedule.status === 'active' ? 'default' : 'secondary'}>
                          {displayInfo.statusText}
                        </Badge>
                        
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => editSchedule(schedule)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => deleteSchedule(schedule._id!)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}