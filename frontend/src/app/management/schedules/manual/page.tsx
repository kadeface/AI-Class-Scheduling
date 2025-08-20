/**
 * 手动排课页面
 * 
 * 提供手动创建和编辑课程安排的功能界面
 * 包含课程列表可视化、临时调课功能和动态时间配置
 */

'use client';

import React, { useState, useEffect } from 'react';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AcademicPeriodSelector } from '../schedule-view/components/AcademicPeriodSelector';
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
  Building2,
  RefreshCw,
  ArrowLeftRight
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
 * 课程颜色配置
 * 为不同学科设置美观的背景色
 */
const COURSE_COLORS: { [key: string]: string } = {
  // 主要学科 - 使用温暖的色调
  '语文': 'bg-gradient-to-br from-orange-400 to-orange-500',
  '数学': 'bg-gradient-to-br from-blue-500 to-blue-600',
  '英语': 'bg-gradient-to-br from-green-500 to-green-600',
  
  // 理科 - 使用清新的色调
  '物理': 'bg-gradient-to-br from-indigo-500 to-indigo-600',
  '化学': 'bg-gradient-to-br from-purple-500 to-purple-600',
  '生物': 'bg-gradient-to-br from-teal-500 to-teal-600',
  
  // 文科 - 使用优雅的色调
  '历史': 'bg-gradient-to-br from-amber-500 to-amber-600',
  '地理': 'bg-gradient-to-br from-cyan-500 to-cyan-600',
  '政治': 'bg-gradient-to-br from-rose-500 to-rose-600',
  
  // 艺术类 - 使用活泼的色调
  '音乐': 'bg-gradient-to-br from-pink-500 to-pink-600',
  '美术': 'bg-gradient-to-br from-violet-500 to-violet-600',
  '体育': 'bg-gradient-to-br from-emerald-500 to-emerald-600',
  
  // 其他课程 - 使用中性的色调
  '写字': 'bg-gradient-to-br from-slate-500 to-slate-600',
  '品德': 'bg-gradient-to-br from-stone-500 to-stone-600',
  '科学': 'bg-gradient-to-br from-sky-500 to-sky-600',
  
  // 默认颜色
  'default': 'bg-gradient-to-br from-gray-500 to-gray-600'
};

/**
 * 临时调课接口
 */
interface TemporarySubstitution {
  originalScheduleId: string;
  substituteTeacherId: string;
  substituteTeacherName: string;
  reason: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
}

/**
 * 时间配置接口
 */
interface PeriodTimeConfig {
  period: number;
  startTime: string;
  endTime: string;
  breakTime: number;
}

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

  // 临时调课状态
  const [temporarySubstitutions, setTemporarySubstitutions] = useState<TemporarySubstitution[]>([]);
  const [substitutionDialogOpen, setSubstitutionDialogOpen] = useState(false);
  const [selectedScheduleForSubstitution, setSelectedScheduleForSubstitution] = useState<ScheduleItem | null>(null);
  
  // 临时调课表单数据
  const [substitutionForm, setSubstitutionForm] = useState({
    substituteTeacherId: '',
    substituteTeacherName: '',
    reason: '',
    startDate: '',
    endDate: ''
  });
  
  // 代课教师选项状态
  const [substituteTeacherOptions, setSubstituteTeacherOptions] = useState<any[]>([]);
  const [loadingSubstituteTeachers, setLoadingSubstituteTeachers] = useState(false);

  // 时间配置状态
  const [periodTimes, setPeriodTimes] = useState<PeriodTimeConfig[]>([]);
  const [timeConfigLoading, setTimeConfigLoading] = useState(false);

  // 表单状态
  const [formData, setFormData] = useState({
    classId: '',
    courseId: '',
    teacherId: '',
    roomId: '',
    dayOfWeek: '',
    period: '',
    academicYear: '2025-2026',
    semester: '1'
  });

  // 筛选状态
  const [filters, setFilters] = useState({
    academicYear: '2025-2026',
    semester: '1',
    searchTerm: '',
    selectedGrade: '', // 新增年级筛选
    selectedClassId: '' // 选中的班级ID
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
    loadPeriodTimes();
  }, [filters.academicYear, filters.semester]);

  /**
   * 加载基础数据
   */
  const loadBasicData = async () => {
    try {
      setLoading(true);
      
      // 并行加载所有基础数据
      const [classesRes, coursesRes, teachersRes, roomsRes] = await Promise.all([
        fetch('/api/classes'),
        fetch('/api/courses'),
        fetch('/api/teachers'),
        fetch('/api/rooms')
      ]);

      if (classesRes.ok) {
        const classesData = await classesRes.json();
        // 后端返回的是分页数据，班级列表在 data.items 中
        const classesList = classesData.data?.items || [];
        console.log('加载的班级数据:', classesList);
        setClasses(classesList);
      }

      if (coursesRes.ok) {
        const coursesData = await coursesRes.json();
        // 后端返回的是分页数据，课程列表在 data.items 中
        setCourses(coursesData.data?.items || []);
      }

      if (teachersRes.ok) {
        const teachersData = await teachersRes.json();
        // 后端返回的是分页数据，教师列表在 data.items 中
        setTeachers(teachersData.data?.items || []);
      }

      if (roomsRes.ok) {
        const roomsData = await roomsRes.json();
        // 后端返回的是分页数据，教室列表在 data.items 中
        setRooms(roomsData.data?.items || []);
      }
    } catch (error) {
      console.error('加载基础数据失败:', error);
      setError('加载基础数据失败');
    } finally {
      setLoading(false);
    }
  };

  /**
   * 加载时间配置
   */
  const loadPeriodTimes = async () => {
    try {
      setTimeConfigLoading(true);
      const response = await fetch(
        `/api/schedule-config/period-times?academicYear=${filters.academicYear}&semester=${filters.semester}`
      );
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setPeriodTimes(data.data);
        }
      }
    } catch (error) {
      console.error('加载时间配置失败:', error);
    } finally {
      setTimeConfigLoading(false);
    }
  };

  /**
   * 加载课程安排
   */
  const loadSchedules = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/schedules?academicYear=${filters.academicYear}&semester=${filters.semester}`
      );
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setSchedules(data.data || []);
        }
      }
    } catch (error) {
      console.error('加载课程安排失败:', error);
      setError('加载课程安排失败');
    } finally {
      setLoading(false);
    }
  };

  /**
   * 获取时间显示文本
   */
  const getTimeDisplayText = (period: number): string => {
    const timeConfig = periodTimes.find(t => t.period === period);
    if (timeConfig) {
      return `${timeConfig.startTime}-${timeConfig.endTime}`;
    }
    return `第${period}节`;
  };

  /**
   * 获取筛选后的班级选项
   */
  const getFilteredClassOptions = () => {
    let filteredClasses = classes;
    
    // 如果选择了年级，筛选对应年级的班级
    if (filters.selectedGrade) {
      filteredClasses = classes.filter(c => c.grade === parseInt(filters.selectedGrade));
    }
    
    return safeMapToOptions(filteredClasses);
  };

  /**
   * 获取筛选后的课程选项（基于教师学科）
   */
  const getFilteredCourseOptions = () => {
    // 如果没有选择教师，返回所有课程
    if (!formData.teacherId) {
      return safeMapToOptions(courses);
    }
    
    // 获取选中教师的学科
    const selectedTeacher = teachers.find(t => t._id === formData.teacherId);
    if (!selectedTeacher || !selectedTeacher.subjects || !Array.isArray(selectedTeacher.subjects)) {
      return safeMapToOptions(courses);
    }
    
    // 根据教师学科筛选课程
    const filteredCourses = courses.filter(course => {
      const courseName = course.name;
      
      // 检查课程名称是否包含教师的任何学科
      return selectedTeacher.subjects.some(subject => 
        courseName.includes(subject)
      );
    });
    
    // 如果没有找到匹配学科的课程，返回所有课程并显示提示
    if (filteredCourses.length === 0) {
      console.warn(`未找到教师${selectedTeacher.name}学科(${selectedTeacher.subjects.join(',')})的课程，显示所有课程`);
      return safeMapToOptions(courses);
    }
    
    return safeMapToOptions(filteredCourses);
  };

  /**
   * 检查教师时间冲突
   */
  const checkTeacherTimeConflict = async (teacherId: string, dayOfWeek: number, period: number): Promise<boolean> => {
    try {
      // 查询该教师在该时间段的课程安排
      const response = await fetch(
        `/api/schedules?teacherId=${teacherId}&dayOfWeek=${dayOfWeek}&period=${period}&academicYear=${filters.academicYear}&semester=${filters.semester}`
      );
      
      if (response.ok) {
        const data = await response.json();
        // 如果有课程安排，说明时间冲突
        return data.success && data.data && data.data.length > 0;
      }
      
      return false;
    } catch (error) {
      console.error('检查教师时间冲突失败:', error);
      return false;
    }
  };

  /**
   * 获取合适的代课教师列表
   */
  const getSuitableSubstituteTeachers = async (originalSchedule: ScheduleItem): Promise<any[]> => {
    if (!originalSchedule) return [];
    
    const courseName = getCourseName(originalSchedule.course);
    const courseSubject = getCourseSubject(courseName);
    const courseGrade = getCourseGrade(courseName);
    const { dayOfWeek, period } = originalSchedule;
    
    // 筛选合适的教师
    let suitableTeachers = teachers.filter(teacher => 
      teacher.isActive && // 教师处于活跃状态
      (teacher as any).subjects && (teacher as any).subjects.includes(courseSubject) && // 教师教授该学科
      (teacher as any).maxWeeklyHours > 0 // 教师还有可用课时
    );
    
    // 检查时间冲突并计算匹配度
    const teachersWithScore = await Promise.all(
      suitableTeachers.map(async (teacher) => {
        const hasTimeConflict = await checkTeacherTimeConflict(teacher._id, dayOfWeek, period);
        
        // 计算匹配分数
        let score = 0;
        
        // 基础分数：学科匹配
        score += 10;
        
        // 年级匹配加分：同年级优先
        if (courseGrade > 0 && (teacher as any).grade === courseGrade) {
          score += 8;
        } else if (courseGrade > 0 && Math.abs((teacher as any).grade - courseGrade) <= 2) {
          score += 4; // 相近年级
        }
        
        // 时间可用性加分
        if (!hasTimeConflict) {
          score += 6;
        }
        
        // 课时可用性加分
        const availableHours = (teacher as any).maxWeeklyHours - ((teacher as any).currentWeeklyHours || 0);
        if (availableHours > 0) {
          score += Math.min(availableHours, 5); // 最多加5分
        }
        
        // 教师经验加分（基于教龄或其他指标）
        if ((teacher as any).experienceYears && (teacher as any).experienceYears > 5) {
          score += 2;
        }
        
        return {
          ...teacher,
          score,
          hasTimeConflict,
          availableHours: availableHours || 0
        };
      })
    );
    
    // 按分数排序，分数高的优先
    return teachersWithScore
      .sort((a, b) => b.score - a.score)
      .map(teacher => ({
        ...teacher,
        label: `${teacher.name} (${(teacher as any).subjects?.join(', ') || '未知学科'}) - ${teacher.hasTimeConflict ? '时间冲突' : '可用'} - 评分:${teacher.score}`,
        value: teacher._id
      }));
  };

  /**
   * 获取课程背景色
   */
  const getCourseBackgroundColor = (courseName: string): string => {
    // 移除年级前缀，获取纯课程名称
    const cleanCourseName = courseName.replace(/^[一二三四五六七八九十年级]+/, '').trim();
    
    // 查找匹配的颜色
    for (const [key, color] of Object.entries(COURSE_COLORS)) {
      if (cleanCourseName.includes(key)) {
        return color;
      }
    }
    
    // 如果没有找到匹配，返回默认颜色
    return COURSE_COLORS.default;
  };

  /**
   * 获取课程学科
   */
  const getCourseSubject = (courseName: string): string => {
    // 移除年级前缀，获取纯课程名称
    const cleanCourseName = courseName.replace(/^[一二三四五六七八九十年级]+/, '').trim();
    
    // 常见的学科映射
    const subjectMap: { [key: string]: string } = {
      '语文': '语文',
      '数学': '数学',
      '英语': '英语',
      '物理': '物理',
      '化学': '化学',
      '生物': '生物',
      '历史': '历史',
      '地理': '地理',
      '政治': '政治',
      '音乐': '音乐',
      '美术': '美术',
      '体育': '体育',
      '写字': '语文', // 写字课归类为语文
      '品德': '政治', // 品德课归类为政治
      '科学': '科学'
    };
    
    for (const [key, subject] of Object.entries(subjectMap)) {
      if (cleanCourseName.includes(key)) {
        return subject;
      }
    }
    
    return '其他';
  };

  /**
   * 获取课程年级
   */
  const getCourseGrade = (courseName: string): number => {
    const gradeMap: { [key: string]: number } = {
      '一年级': 1, '二年级': 2, '三年级': 3, '四年级': 4, '五年级': 5, '六年级': 6,
      '初一': 7, '初二': 8, '初三': 9,
      '高一': 10, '高二': 11, '高三': 12
    };
    
    for (const [key, grade] of Object.entries(gradeMap)) {
      if (courseName.includes(key)) {
        return grade;
      }
    }
    
    return 0; // 未知年级
  };

  /**
   * 获取筛选后的课程安排
   */
  const filteredSchedules = schedules.filter(schedule => {
    // 如果选择了班级，只显示该班级的课程
    if (filters.selectedClassId) {
      if (schedule.class?._id !== filters.selectedClassId) {
        return false;
      }
    }
    
    // 搜索筛选
    if (filters.searchTerm) {
      const searchLower = filters.searchTerm.toLowerCase();
      const className = getClassName(schedule.class).toLowerCase();
      const courseName = getCourseName(schedule.course).toLowerCase();
      const teacherName = getTeacherName(schedule.teacher).toLowerCase();
      const roomName = getRoomName(schedule.room).toLowerCase();
      
      return className.includes(searchLower) || 
             courseName.includes(searchLower) || 
             teacherName.includes(searchLower) || 
             roomName.includes(searchLower);
    }
    return true;
  });

  /**
   * 处理筛选条件变化
   */
  const handleFiltersChange = (newFilters: Partial<typeof filters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  };

  /**
   * 处理表单数据变化
   */
  const handleFormChange = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // 当教师变化时，清空课程选择，避免学科不匹配
    if (field === 'teacherId') {
      setFormData(prev => ({ ...prev, courseId: '' }));
    }
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
  };

  /**
   * 打开编辑对话框
   */
  const editSchedule = (schedule: ScheduleItem) => {
    setEditingSchedule(schedule);
    setFormData({
      classId: schedule.class?._id || '',
      courseId: schedule.course?._id || '',
      teacherId: schedule.teacher?._id || '',
      roomId: schedule.room?._id || '',
      dayOfWeek: schedule.dayOfWeek?.toString() || '',
      period: schedule.period?.toString() || '',
      academicYear: schedule.academicYear,
      semester: schedule.semester
    });
    setIsCreating(false);
  };

  /**
   * 打开新建对话框
   */
  const openNewDialog = () => {
    resetForm();
    setIsCreating(true);
  };

  /**
   * 验证课程和教师学科匹配
   */
  const validateSubjectMatch = (): boolean => {
    if (!formData.teacherId || !formData.courseId) return true;
    
    const selectedTeacher = teachers.find(t => t._id === formData.teacherId);
    const selectedCourse = courses.find(c => c._id === formData.courseId);
    
    if (!selectedTeacher || !selectedCourse) return true;
    
    const teacherSubjects = selectedTeacher.subjects || [];
    const courseName = selectedCourse.name;
    
    // 检查课程是否匹配教师的任何学科
    const matchedSubject = teacherSubjects.find(subject => 
      courseName.includes(subject)
    );
    
    if (!matchedSubject) {
      setError(`学科不匹配：教师${selectedTeacher.name}不教授此课程。教师学科：${teacherSubjects.join(', ')}`);
      return false;
    }
    
    return true;
  };

  /**
   * 保存课程安排
   */
  const saveSchedule = async () => {
    // 验证必填字段
    if (!formData.classId || !formData.courseId || !formData.teacherId || 
        !formData.roomId || !formData.dayOfWeek || !formData.period) {
      setError('请填写所有必填字段');
      return;
    }
    
    // 验证学科匹配
    if (!validateSubjectMatch()) {
      return;
    }
    
    try {
      setLoading(true);
      
      const scheduleData = {
        ...formData,
        dayOfWeek: parseInt(formData.dayOfWeek),
        period: parseInt(formData.period)
      };

      const url = editingSchedule 
        ? `/api/schedules/${editingSchedule._id}`
        : '/api/schedules';
      
      const method = editingSchedule ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(scheduleData)
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          resetForm();
          loadSchedules();
          setError(undefined);
        }
      }
    } catch (error) {
      console.error('保存课程安排失败:', error);
      setError('保存失败');
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

      if (response.ok) {
        loadSchedules();
      }
    } catch (error) {
      console.error('删除课程安排失败:', error);
      setError('删除失败');
    }
  };

  /**
   * 打开临时调课对话框
   */
  const openSubstitutionDialog = async (schedule: ScheduleItem) => {
    setSelectedScheduleForSubstitution(schedule);
    // 重置表单数据
    setSubstitutionForm({
      substituteTeacherId: '',
      substituteTeacherName: '',
      reason: '',
      startDate: '',
      endDate: ''
    });
    
    // 加载合适的代课教师
    setLoadingSubstituteTeachers(true);
    try {
      const suitableTeachers = await getSuitableSubstituteTeachers(schedule);
      setSubstituteTeacherOptions(suitableTeachers);
    } catch (error) {
      console.error('加载代课教师失败:', error);
      setSubstituteTeacherOptions([]);
    } finally {
      setLoadingSubstituteTeachers(false);
    }
    
    setSubstitutionDialogOpen(true);
  };

  /**
   * 保存临时调课
   */
  const saveTemporarySubstitution = async (substitutionData: Omit<TemporarySubstitution, 'originalScheduleId'>) => {
    if (!selectedScheduleForSubstitution) return;

    try {
      const newSubstitution: TemporarySubstitution = {
        ...substitutionData,
        originalScheduleId: selectedScheduleForSubstitution._id!,
        isActive: true
      };

      // 这里应该调用后端API保存临时调课信息
      // 暂时先添加到本地状态
      setTemporarySubstitutions(prev => [...prev, newSubstitution]);
      setSubstitutionDialogOpen(false);
      setSelectedScheduleForSubstitution(null);
    } catch (error) {
      console.error('保存临时调课失败:', error);
    }
  };

  /**
   * 渲染课程列表视图
   */
  const renderScheduleList = () => {
    console.log('渲染列表视图，课程数据:', filteredSchedules);
    
    return (
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
                  {periodTimes.length > 0 && (
                    <span className="text-sm text-gray-400">
                      ({getTimeDisplayText(schedule.period || 0)})
                    </span>
                  )}
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
                  onClick={() => openSubstitutionDialog(schedule)}
                  title="临时调课"
                >
                  <ArrowLeftRight className="h-4 w-4" />
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
  );
  };

  /**
   * 渲染课程网格视图（班级课表模式）
   */
  const renderScheduleGrid = () => {
    console.log('渲染班级课表网格视图，课程数据:', filteredSchedules);
    
    // 如果没有选择班级，显示提示
    if (!filters.selectedClassId) {
      return (
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            <Building2 className="h-16 w-16 mx-auto" />
          </div>
          <h3 className="text-lg font-medium text-gray-600 mb-2">请选择班级</h3>
          <p className="text-gray-500">在左侧筛选条件中选择年级和班级，查看对应的课表</p>
        </div>
      );
    }

    // 构建班级课表网格数据
    const gridData: (ScheduleItem | null)[][] = Array(8).fill(null).map(() => Array(5).fill(null));
    
    // 填充网格数据
    filteredSchedules.forEach(schedule => {
      const dayIndex = (schedule.dayOfWeek || 1) - 1;
      const periodIndex = (schedule.period || 1) - 1;
      console.log(`课程 ${getCourseName(schedule.course)}: 星期${schedule.dayOfWeek}, 第${schedule.period}节, 索引[${periodIndex}][${dayIndex}]`);
      if (dayIndex >= 0 && dayIndex < 5 && periodIndex >= 0 && periodIndex < 8) {
        gridData[periodIndex][dayIndex] = schedule;
      }
    });

    // 获取选中的班级信息
    const selectedClass = classes.find(c => c._id === filters.selectedClassId);
    const selectedClassName = selectedClass ? selectedClass.name : '未知班级';

    return (
      <div className="space-y-4">
        {/* 班级课表标题 */}
        <div className="text-center py-4">
          <h2 className="text-2xl font-bold text-gray-800">{selectedClassName} 课表</h2>
          <p className="text-gray-600 mt-2">
            {filters.academicYear} 学年第{filters.semester}学期
          </p>
        </div>

        {/* 课表网格 */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px]">
              {/* 表头 */}
              <thead>
                <tr className="bg-gradient-to-r from-blue-50 to-indigo-50">
                  {/* 时间列标题 */}
                  <th className="w-24 p-4 text-left border-r border-gray-200">
                    <div className="text-sm font-semibold text-gray-600">时间</div>
                  </th>
                  
                  {/* 星期列标题 */}
                  {WEEKDAYS.map((day, index) => (
                    <th
                      key={index}
                      className="p-4 text-center border-r border-gray-200 last:border-r-0"
                    >
                      <div className="space-y-1">
                        <div className="text-lg font-bold text-gray-800">
                          {day}
                        </div>
                        <div className="text-xs text-gray-500">
                          {day}
                        </div>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>

              {/* 表体 */}
              <tbody>
                {Array.from({ length: 8 }, (_, periodIndex) => (
                  <tr key={periodIndex} className="border-b border-gray-200">
                    {/* 时间信息列 */}
                    <td className="w-24 p-4 bg-gray-50 border-r border-gray-200">
                      <div className="text-center space-y-1">
                        <div className="text-sm font-semibold text-gray-800">
                          第{periodIndex + 1}节
                        </div>
                        {periodTimes.length > 0 && (
                          <div className="text-xs text-gray-500">
                            {getTimeDisplayText(periodIndex + 1)}
                          </div>
                        )}
                      </div>
                    </td>

                    {/* 课程内容列 */}
                    {Array.from({ length: 5 }, (_, dayIndex) => {
                      const schedule = gridData[periodIndex][dayIndex];
                      
                      return (
                        <td
                          key={`${dayIndex}-${periodIndex}`}
                          className="p-2 border-r border-gray-200 last:border-r-0 align-top"
                        >
                          <div className="min-h-[80px] w-full">
                            {schedule ? (
                              <div className={`${getCourseBackgroundColor(getCourseName(schedule.course))} text-white rounded-lg p-3 text-sm cursor-pointer hover:shadow-lg hover:scale-105 transition-all duration-200`}>
                                {/* 课程名称 */}
                                <div className="font-semibold text-base leading-tight mb-2">
                                  {getCourseName(schedule.course)}
                                </div>
                                
                                {/* 教师信息 */}
                                <div className="text-white/90 text-xs mb-1">
                                  👨‍🏫 {getTeacherName(schedule.teacher)}
                                </div>
                                
                                {/* 教室信息 */}
                                <div className="text-white/90 text-xs mb-2">
                                  🏢 {getRoomName(schedule.room)}
                                </div>
                                
                                {/* 操作按钮 */}
                                <div className="flex gap-1 mt-2">
                                  <Button 
                                    size="sm" 
                                    variant="outline" 
                                    className="h-6 px-2 text-xs bg-white/20 border-white/30 text-white hover:bg-white/30"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      editSchedule(schedule);
                                    }}
                                  >
                                    <Edit2 className="h-3 w-3" />
                                  </Button>
                                  <Button 
                                    size="sm" 
                                    variant="outline" 
                                    className="h-6 px-2 text-xs bg-white/20 border-white/30 text-white hover:bg-white/30"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      openSubstitutionDialog(schedule);
                                    }}
                                    title="临时调课"
                                  >
                                    <ArrowLeftRight className="h-3 w-3" />
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <div className="text-gray-400 text-xs text-center py-6">
                                空闲
                              </div>
                            )}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">手动排课</h1>
          <p className="text-gray-600">手动创建和编辑课程安排，支持临时调课</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => loadPeriodTimes()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            刷新时间配置
          </Button>
          <Button onClick={openNewDialog}>
            <Plus className="h-4 w-4 mr-2" />
            新建课程安排
          </Button>
        </div>
      </div>

      {/* 筛选条件 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">筛选条件</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <AcademicPeriodSelector
            value={filters}
            onChange={handleFiltersChange}
            className="justify-start"
          />
          
          {/* 年级和班级筛选器 */}
          <div className="border-t pt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* 年级筛选器 */}
              <div>
                <Label className="text-sm font-medium mb-2 block">选择年级</Label>
                <Select
                  value={filters.selectedGrade}
                  onValueChange={(value) => {
                    handleFiltersChange({ selectedGrade: value, selectedClassId: '' });
                  }}
                  placeholder="请选择年级"
                  options={[
                    { value: '', label: '全部年级' },
                    { value: '1', label: '一年级' },
                    { value: '2', label: '二年级' },
                    { value: '3', label: '三年级' },
                    { value: '4', label: '四年级' },
                    { value: '5', label: '五年级' },
                    { value: '6', label: '六年级' },
                    { value: '7', label: '初一' },
                    { value: '8', label: '初二' },
                    { value: '9', label: '初三' },
                    { value: '10', label: '高一' },
                    { value: '11', label: '高二' },
                    { value: '12', label: '高三' }
                  ]}
                />
              </div>
              
              {/* 班级筛选器 */}
              <div>
                <Label className="text-sm font-medium mb-2 block">选择班级</Label>
                <Select
                  value={filters.selectedClassId}
                  onValueChange={(value) => handleFiltersChange({ selectedClassId: value })}
                  placeholder="请选择要查看的班级"
                  options={getFilteredClassOptions()}
                />
              </div>
            </div>
            
            <div className="mt-4 text-sm text-gray-500">
              选择年级和班级后，将显示该班级的完整课表
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <Input
                placeholder="搜索班级、课程、教师或教室..."
                value={filters.searchTerm}
                onChange={(e) => handleFiltersChange({ searchTerm: e.target.value })}
                className="max-w-md"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 错误提示 */}
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* 冲突提示 */}
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

      {/* 新建/编辑对话框 */}
      {(isCreating || editingSchedule) && (
        <Card>
          <CardHeader>
            <CardTitle>
              {isCreating ? '新建课程安排' : '编辑课程安排'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>班级</Label>
                <Select 
                  value={formData.classId} 
                  onValueChange={(value) => handleFormChange('classId', value)}
                  placeholder="选择班级"
                  options={safeMapToOptions(classes)}
                />
              </div>

              <div>
                <Label>课程</Label>
                <Select 
                  value={formData.courseId} 
                  onValueChange={(value) => handleFormChange('courseId', value)}
                  placeholder="选择课程"
                  options={getFilteredCourseOptions()}
                />
                {/* 显示课程筛选提示 */}
                {formData.teacherId && (
                  <div className="text-xs text-blue-500 mt-1">
                    已根据选中教师学科筛选课程
                    {(() => {
                      const selectedTeacher = teachers.find(t => t._id === formData.teacherId);
                      const filteredCourses = courses.filter(course => {
                        if (!selectedTeacher || !selectedTeacher.subjects) return true;
                        const courseName = course.name;
                        return selectedTeacher.subjects.some(subject => 
                          courseName.includes(subject)
                        );
                      });
                      return ` (显示 ${filteredCourses.length}/${courses.length} 门课程)`;
                    })()}
                  </div>
                )}
                {/* 显示学科匹配提示 */}
                {formData.teacherId && formData.courseId && (() => {
                  const selectedTeacher = teachers.find(t => t._id === formData.teacherId);
                  const selectedCourse = courses.find(c => c._id === formData.courseId);
                  
                  if (!selectedTeacher || !selectedCourse) return null;
                  
                  const teacherSubjects = selectedTeacher.subjects || [];
                  const courseName = selectedCourse.name;
                  
                  // 检查课程是否匹配教师的任何学科
                  const matchedSubject = teacherSubjects.find(subject => 
                    courseName.includes(subject)
                  );
                  
                  if (matchedSubject) {
                    return (
                      <div className="text-xs text-green-500 mt-1">
                        ✅ 学科匹配：{selectedTeacher.name} 教授 {matchedSubject}
                      </div>
                    );
                  } else {
                    return (
                      <div className="text-xs text-red-500 mt-1">
                        ⚠️ 学科不匹配：{selectedTeacher.name} 不教授此课程
                      </div>
                    );
                  }
                })()}
              </div>

              <div>
                <Label>教师</Label>
                <Select 
                  value={formData.teacherId} 
                  onValueChange={(value) => handleFormChange('teacherId', value)}
                  placeholder="选择教师"
                  options={safeMapToOptions(teachers)}
                />
              </div>

              <div>
                <Label>教室</Label>
                <Select 
                  value={formData.roomId} 
                  onValueChange={(value) => handleFormChange('roomId', value)}
                  placeholder="选择教室"
                  options={safeMapToOptions(rooms)}
                />
              </div>

              <div>
                <Label>星期</Label>
                <Select 
                  value={formData.dayOfWeek} 
                  onValueChange={(value) => handleFormChange('dayOfWeek', value)}
                  placeholder="选择星期"
                  options={WEEKDAYS.map((day, index) => ({ value: (index + 1).toString(), label: day }))}
                />
              </div>

              <div>
                <Label>节次</Label>
                <Select 
                  value={formData.period} 
                  onValueChange={(value) => handleFormChange('period', value)}
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
            {timeConfigLoading && (
              <Badge variant="outline" className="animate-pulse">
                <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                加载时间配置中...
              </Badge>
            )}
          </CardTitle>
          <CardDescription>
            网格视图：直观显示每周课程安排，支持快速编辑和临时调课
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* 调试信息 */}
          <div className="mb-4 p-3 bg-gray-50 rounded-lg text-sm">
            <div>总课程数: <strong>{schedules.length}</strong></div>
            <div>筛选后课程数: <strong>{filteredSchedules.length}</strong></div>
            <div>时间配置数量: <strong>{periodTimes.length}</strong></div>
            <div>已选择年级: <strong>{filters.selectedGrade || '全部'}</strong></div>
            <div>已选择班级: <strong>{filters.selectedClassId ? classes.find(c => c._id === filters.selectedClassId)?.name || '未知' : '未选择'}</strong></div>
          </div>
          
                              {filteredSchedules.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        暂无课程安排
                      </div>
                    ) : (
                      renderScheduleGrid()
                    )}
        </CardContent>
      </Card>

      {/* 临时调课对话框 */}
      <Dialog open={substitutionDialogOpen} onOpenChange={setSubstitutionDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>临时调课</DialogTitle>
          </DialogHeader>
          
          {selectedScheduleForSubstitution && (
            <div className="space-y-4">
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="text-sm text-gray-600 mb-2">原课程安排：</div>
                <div className="text-sm">
                  <div>班级：{getClassName(selectedScheduleForSubstitution.class)}</div>
                  <div>课程：{getCourseName(selectedScheduleForSubstitution.course)}</div>
                  <div>原教师：{getTeacherName(selectedScheduleForSubstitution.teacher)}</div>
                  <div>时间：周{selectedScheduleForSubstitution.dayOfWeek} 第{selectedScheduleForSubstitution.period}节</div>
                </div>
              </div>
              
              <div>
                <Label>代课教师</Label>
                <div className="text-xs text-gray-500 mb-2">
                  系统将根据学科匹配、年级匹配、时间冲突等因素智能推荐
                </div>
                <Select 
                  value={substitutionForm.substituteTeacherId}
                  placeholder={loadingSubstituteTeachers ? "正在加载..." : "选择代课教师"}
                  options={substituteTeacherOptions}
                  onValueChange={(value) => {
                    const teacher = substituteTeacherOptions.find(t => t.value === value);
                    if (teacher) {
                      setSubstitutionForm(prev => ({
                        ...prev,
                        substituteTeacherId: value,
                        substituteTeacherName: teacher.name
                      }));
                    }
                  }}
                />
                {loadingSubstituteTeachers && (
                  <div className="text-xs text-blue-500 mt-1">正在智能筛选合适的代课教师...</div>
                )}
                {!loadingSubstituteTeachers && substituteTeacherOptions.length === 0 && (
                  <div className="text-xs text-orange-500 mt-1">未找到合适的代课教师，请检查教师配置</div>
                )}
              </div>
              
              <div>
                <Label>调课原因</Label>
                <Input 
                  placeholder="请输入调课原因" 
                  value={substitutionForm.reason}
                  onChange={(e) => setSubstitutionForm(prev => ({
                    ...prev,
                    reason: e.target.value
                  }))}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>开始日期</Label>
                  <Input 
                    type="date" 
                    value={substitutionForm.startDate}
                    onChange={(e) => setSubstitutionForm(prev => ({
                      ...prev,
                      startDate: e.target.value
                    }))}
                  />
                </div>
                <div>
                  <Label>结束日期</Label>
                  <Input 
                    type="date" 
                    value={substitutionForm.endDate}
                    onChange={(e) => setSubstitutionForm(prev => ({
                      ...prev,
                      endDate: e.target.value
                    }))}
                  />
                </div>
              </div>
              
              <div className="flex gap-2 pt-4">
                <Button onClick={() => saveTemporarySubstitution({
                  substituteTeacherId: substitutionForm.substituteTeacherId,
                  substituteTeacherName: substitutionForm.substituteTeacherName,
                  reason: substitutionForm.reason,
                  startDate: substitutionForm.startDate,
                  endDate: substitutionForm.endDate,
                  isActive: true
                })}>
                  <Save className="h-4 w-4 mr-2" />
                  保存调课
                </Button>
                <Button variant="outline" onClick={() => setSubstitutionDialogOpen(false)}>
                  取消
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}