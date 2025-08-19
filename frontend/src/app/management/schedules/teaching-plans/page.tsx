/**
 * 教学计划管理页面
 * 
 * 提供教学计划的创建、编辑、查看和审批功能
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { DataTable, TableColumn } from '@/components/ui/data-table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Plus, 
  Search, 
  Filter, 
  BookOpen, 
  CheckCircle, 
  Clock, 
  Users,
  Calendar,
  Edit,
  Eye,
  Trash2,
  FileCheck,
  X,
  FileText,
  Zap,
  AlertCircle
} from 'lucide-react';
import { 
  TeachingPlan,
  CreateTeachingPlanRequest,
  teachingPlanApi,
  classApi,
  courseApi,
  teacherApi,
  Class,
  Course,
  Teacher,
  TeachingPlanQueryParams,
  PaginatedResponse,
  formatTeachingPlanStatus,
  formatAcademicYear,
  formatSemester,
  TEACHING_PLAN_STATUS
} from '@/lib/api';
import { formatDateTime, cn } from '@/lib/utils';
import { BatchTeachingPlanForm, BatchCourseConfig, BatchClassTeacherAssignment } from '@/types/schedule';
import { generateCsv, downloadCsv } from '@/lib/csv';

/**
 * 教学计划管理页面组件
 * 
 * Returns:
 *   React.ReactElement: 教学计划管理页面
 */
export default function TeachingPlansPage() {
  // 状态管理
  const [teachingPlans, setTeachingPlans] = useState<TeachingPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });

  // 搜索和筛选状态
  const [searchParams, setSearchParams] = useState<TeachingPlanQueryParams>({
    keyword: '',
    academicYear: '',
    semester: undefined,
    status: '',
    class: '',
  });

  // 对话框状态
  const [dialogState, setDialogState] = useState({
    create: false,
    edit: false,
    view: false,
    approve: false,
  });

  // 当前操作的教学计划
  const [selectedPlan, setSelectedPlan] = useState<TeachingPlan | null>(null);

  // 基础数据
  const [classes, setClasses] = useState<Class[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  
  // 按年级筛选的课程数据
  const [filteredCoursesByGrade, setFilteredCoursesByGrade] = useState<{ [grade: string]: Course[] }>({});
  const [coursesLoading, setCoursesLoading] = useState(false);

  // 学年选项
  const generateAcademicYears = () => {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let i = -2; i <= 3; i++) {
      const startYear = currentYear + i;
      years.push(`${startYear}-${startYear + 1}`);
    }
    return years;
  };

  // 表单数据
  const [formData, setFormData] = useState<CreateTeachingPlanRequest>({
    class: '',
    academicYear: '',
    semester: 1,
    courseAssignments: [],
    notes: '',
  });

  // 审批意见
  const [approvalComments, setApprovalComments] = useState('');

  // 删除确认对话框状态
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [planToDelete, setPlanToDelete] = useState<TeachingPlan | null>(null);

  // 年级批量设置Dialog状态
  const [batchDialogOpen, setBatchDialogOpen] = useState(false);
  // 年级批量表单状态（存储批量设置的表单数据）
  const [batchForm, setBatchForm] = useState<BatchTeachingPlanForm | null>(null);
  /**
   * 年级批量表单错误状态
   * 
   * 记录课程结构区和班级-教师分配区的校验错误信息
   * courses: 每门课程的错误（名称、课时、连排）
   * assignments: 每个班级每门课程的教师分配错误
   */
  const [batchFormErrors, setBatchFormErrors] = useState<{
    courses?: { name?: string; weeklyHours?: string; continuous?: string }[];
    assignments?: { [classId: string]: { [courseId: string]: string } };
  } | null>(null);
  /**
   * 年级批量表单提交loading状态
   * 控制批量提交按钮的禁用与loading动画
   */
  const [batchLoading, setBatchLoading] = useState(false);
  /**
   * 年级批量表单导出loading状态
   * 控制导出按钮的禁用与loading动画
   */
  const [exportLoading, setExportLoading] = useState(false);

  // 年级选项（从班级name字段前3个字符提取，如“一年级”）
  const gradeOptions = Array.from(new Set(classes.map(cls => cls.name.slice(0, 3))));

  /**
   * 获取教学计划列表
   */
  const fetchTeachingPlans = async () => {
    try {
      setLoading(true);
      const params = {
        ...searchParams,
        page: pagination.current,
        limit: pagination.pageSize,
      };
      
      const response = await teachingPlanApi.getList(params);
      if (response.success && response.data) {
        setTeachingPlans(response.data.items);
        setPagination(prev => ({
          ...prev,
          total: response.data!.total,
        }));
      }
    } catch (error) {
      console.error('获取教学计划失败:', error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * 获取基础数据
   */
  /**
   * 获取指定学年学期的班级数据
   */
  const fetchClassesForAcademicYear = async (academicYear: string, semester: number) => {
    try {
      const classesRes = await classApi.getList({ 
        limit: 1000, 
        isActive: true,
        academicYear,
        semester
      });
      
      if (classesRes.success && classesRes.data) {
        setClasses(classesRes.data.items);
      }
    } catch (error) {
      console.error('获取班级数据失败:', error);
      setClasses([]);
    }
  };

  const fetchBaseData = async () => {
    try {
      const [coursesRes, teachersRes] = await Promise.all([
        courseApi.getList({ limit: 1000, isActive: true }),
        teacherApi.getList({ limit: 1000, isActive: true })
      ]);

      if (coursesRes.success && coursesRes.data) {
        setCourses(coursesRes.data.items);
      }
      if (teachersRes.success && teachersRes.data) {
        setTeachers(teachersRes.data.items);
      }
    } catch (error) {
      console.error('获取基础数据失败:', error);
    }
  };

  /**
   * 根据年级获取课程列表
   * 
   * Args:
   *   grade: 年级标识（如"一年级"）
   * 
   * Returns:
   *   Promise<Course[]>: 该年级的课程列表
   */
  const fetchCoursesByGrade = async (grade: string): Promise<Course[]> => {
    try {
      setCoursesLoading(true);
      
      // 直接从课程名称中筛选包含年级信息的课程
      const filteredCourses = courses.filter(course => {
        // 检查课程名称是否包含该年级
        return course.name.includes(grade);
      });
      
      // 缓存结果
      setFilteredCoursesByGrade(prev => ({
        ...prev,
        [grade]: filteredCourses
      }));
      
      return filteredCourses;
    } catch (error) {
      console.error(`获取${grade}课程失败:`, error);
      // 出错时返回所有课程（降级方案）
      return courses;
    } finally {
      setCoursesLoading(false);
    }
  };

  /**
   * 验证已选择的课程是否在新的年级中仍然有效
   * 
   * Args:
   *   grade: 年级标识
   *   selectedCourses: 已选择的课程列表
   * 
   * Returns:
   *   { valid: boolean; invalidCourses: string[] }: 验证结果
   */
  const validateCoursesForGrade = (grade: string, selectedCourses: BatchCourseConfig[]) => {
    if (!grade || !filteredCoursesByGrade[grade]) {
      return { valid: true, invalidCourses: [] };
    }
    
    const gradeCourses = filteredCoursesByGrade[grade];
    const gradeCourseIds = gradeCourses.map(c => c._id);
    
    const invalidCourses = selectedCourses
      .filter(course => course.courseId && !gradeCourseIds.includes(course.courseId))
      .map(course => course.name || course.courseId);
    
    return {
      valid: invalidCourses.length === 0,
      invalidCourses
    };
  };

  /**
   * 获取可选的课程列表（排除已选择的课程）
   * 
   * Args:
   *   grade: 年级标识
   *   selectedCourses: 已选择的课程列表
   *   excludeCourseId: 要排除的课程ID（用于编辑时保持当前选择）
   * 
   * Returns:
   *   Course[]: 可选的课程列表
   */
  const getAvailableCourses = (grade: string, selectedCourses: BatchCourseConfig[], excludeCourseId?: string) => {
    const availableCourses = grade && filteredCoursesByGrade[grade] 
      ? filteredCoursesByGrade[grade] 
      : courses;
    
    return availableCourses.filter(course => 
      !selectedCourses.some(selectedCourse => 
        selectedCourse.courseId === course._id && selectedCourse.courseId !== excludeCourseId
      )
    );
  };

  /**
   * 初始化数据
   */
  useEffect(() => {
    fetchTeachingPlans();
    fetchBaseData();
  }, [pagination.current, pagination.pageSize]);

  /**
   * 搜索处理
   */
  const handleSearch = () => {
    setPagination(prev => ({ ...prev, current: 1 }));
    fetchTeachingPlans();
  };

  /**
   * 重置搜索
   */
  const handleResetSearch = () => {
    setSearchParams({
      keyword: '',
      academicYear: '',
      semester: undefined,
      status: '',
      class: '',
    });
    setPagination(prev => ({ ...prev, current: 1 }));
  };

  /**
   * 打开创建对话框
   */
  const openCreateDialog = () => {
    // 重置班级列表，等待用户选择学年学期后再加载
    setClasses([]);
    
    // 设置默认学年为当前学年
    const currentYear = new Date().getFullYear();
    const defaultAcademicYear = `${currentYear}-${currentYear + 1}`;
    
    setFormData({
      class: '',
      academicYear: defaultAcademicYear,
      semester: 1,
      courseAssignments: [],
      notes: '',
    });
    
    setDialogState(prev => ({ ...prev, create: true }));
    
    // 自动加载默认学年学期的班级数据
    fetchClassesForAcademicYear(defaultAcademicYear, 1);
  };

  /**
   * 打开编辑对话框
   */
  const openEditDialog = (plan: TeachingPlan) => {
    setSelectedPlan(plan);
    setFormData({
      class: plan.class._id,
      academicYear: plan.academicYear,
      semester: plan.semester,
      courseAssignments: plan.courseAssignments.map(ca => ({
        course: ca.course._id,
        teacher: ca.teacher._id,
        weeklyHours: ca.weeklyHours,
        requiresContinuous: ca.requiresContinuous,
        continuousHours: ca.continuousHours,
        preferredTimeSlots: ca.preferredTimeSlots,
        avoidTimeSlots: ca.avoidTimeSlots,
        notes: ca.notes,
      })),
      notes: plan.notes,
    });
    setDialogState(prev => ({ ...prev, edit: true }));
  };

  /**
   * 打开查看对话框
   */
  const openViewDialog = (plan: TeachingPlan) => {
    setSelectedPlan(plan);
    setDialogState(prev => ({ ...prev, view: true }));
  };

  /**
   * 打开审批对话框
   */
  const openApprovalDialog = (plan: TeachingPlan) => {
    setSelectedPlan(plan);
    setDialogState(prev => ({ ...prev, approve: true }));
  };

  /**
   * 关闭所有对话框
   */
  const closeDialogs = () => {
    setDialogState({
      create: false,
      edit: false,
      view: false,
      approve: false,
    });
    setSelectedPlan(null);
    setApprovalComments('');
  };

  /**
   * 创建教学计划
   */
  const handleCreate = async () => {
    try {
      // 计算总周课时数
      const totalWeeklyHours = formData.courseAssignments.reduce(
        (sum, assignment) => sum + (assignment.weeklyHours || 0), 
        0
      );
      
      const payload = {
        ...formData,
        totalWeeklyHours
      };
      
      console.log('创建教学计划数据:', payload);
      
      const response = await teachingPlanApi.create(payload);
      if (response.success) {
        alert('教学计划创建成功！');
        closeDialogs();
        fetchTeachingPlans();
      } else {
        alert('创建失败：' + (response.error || '未知错误'));
      }
    } catch (error) {
      console.error('创建教学计划失败:', error);
      alert('创建失败，请检查网络连接或联系管理员');
    }
  };

  /**
   * 更新教学计划
   */
  const handleUpdate = async () => {
    if (!selectedPlan) return;
    
    try {
      const response = await teachingPlanApi.update(selectedPlan._id, formData);
      if (response.success) {
        closeDialogs();
        fetchTeachingPlans();
      }
    } catch (error) {
      console.error('更新教学计划失败:', error);
    }
  };

  /**
   * 删除教学计划
   */
  const handleDelete = async (id: string) => {
    try {
      const response = await teachingPlanApi.delete(id);
      if (response.success) {
        fetchTeachingPlans();
      }
    } catch (error) {
      console.error('删除教学计划失败:', error);
    }
  };

  /**
   * 审批教学计划
   */
  const handleApproval = async (approve: boolean, comments?: string) => {
    if (!selectedPlan) return;
    
    try {
      const response = await teachingPlanApi.approve(selectedPlan._id, approve, comments);
      if (response.success) {
        closeDialogs();
        fetchTeachingPlans();
      }
    } catch (error) {
      console.error('审批教学计划失败:', error);
    }
  };

  // 打开年级批量设置Dialog
  const openBatchDialog = async () => {
    setBatchDialogOpen(true);
    setBatchForm({ grade: '', courses: [], assignments: [] });
    // 拉取所有班级，确保年级下拉有数据
    try {
      const res = await classApi.getList({ limit: 1000, isActive: true });
      if (res.success && res.data) {
        setClasses(res.data.items);
      }
    } catch (e) {
      setClasses([]);
    }
  };

  /**
   * 关闭年级批量设置Dialog并重置所有相关状态
   * 
   * Args: None
   * Returns: void
   */
  const closeBatchDialog = () => {
    setBatchDialogOpen(false);
    setBatchForm(null);
    setBatchFormErrors(null);
    setBatchLoading(false);
    setExportLoading(false);
  };

  /**
   * 将batchForm转换为后端API所需的批量教学计划创建请求体
   * Returns: CreateTeachingPlanRequest[]
   */
  function convertBatchFormToApiRequests(batchForm: BatchTeachingPlanForm, academicYear: string, semester: number): CreateTeachingPlanRequest[] {
    // 1. 获取所有班级ID
    const classIds = batchForm.assignments.map(a => a.classId);
    // 2. 对每个班级生成CreateTeachingPlanRequest
    return classIds.map(classId => {
      const assignment = batchForm.assignments.find(a => a.classId === classId);
      // 计算总周课时数
      const totalWeeklyHours = batchForm.courses.reduce((sum, course) => sum + (course.weeklyHours && Number.isFinite(course.weeklyHours) ? course.weeklyHours : 0), 0);
      return {
        class: classId,
        academicYear,
        semester,
        courseAssignments: batchForm.courses.map(course => ({
          course: course.courseId || course.name, // 若无courseId则用name
          teacher: assignment?.teachers[course.courseId] || '',
          weeklyHours: course.weeklyHours,
          requiresContinuous: !!course.continuous,
        })),
        notes: '',
        totalWeeklyHours,
      };
    });
  }

  // 表格列定义
  const columns: TableColumn<TeachingPlan>[] = [
    {
      key: 'class.name',
      title: '班级',
      render: (_, record) => (
        <div className="font-medium">{record.class.name}</div>
      ),
    },
    {
      key: 'academicYear',
      title: '学年学期',
      render: (_, record) => (
        <div>
          <div className="font-medium">{formatAcademicYear(record.academicYear)}</div>
          <div className="text-sm text-muted-foreground">
            {formatSemester(record.semester)}
          </div>
        </div>
      ),
    },
    {
      key: 'totalWeeklyHours',
      title: '总课时',
      render: (_, record) => (
        <Badge variant="outline">
          {record.totalWeeklyHours}节/周
        </Badge>
      ),
    },
    {
      key: 'courseAssignments',
      title: '课程数量',
      render: (_, record) => (
        <div className="text-center">
          {record.courseAssignments.length}门
        </div>
      ),
    },
    {
      key: 'status',
      title: '状态',
      render: (_, record) => {
        const statusInfo = formatTeachingPlanStatus(record.status);
        return (
          <Badge 
            variant={statusInfo.color === 'green' ? 'default' : 'secondary'}
            className={cn(
              statusInfo.color === 'green' && 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
              statusInfo.color === 'blue' && 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
              statusInfo.color === 'yellow' && 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'
            )}
          >
            {statusInfo.label}
          </Badge>
        );
      },
    },
    {
      key: 'updatedAt',
      title: '更新时间',
      render: (_, record) => (
        <div className="text-sm text-muted-foreground">
          {formatDateTime(record.updatedAt)}
        </div>
      ),
    },
    {
      key: 'actions',
      title: '操作',
      render: (_, record) => (
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => openViewDialog(record)}
          >
            <Eye className="h-4 w-4" />
          </Button>
          {record.status === 'draft' && (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => openEditDialog(record)}
              >
                <Edit className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => openApprovalDialog(record)}
              >
                <FileCheck className="h-4 w-4" />
              </Button>
            </>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setPlanToDelete(record);
              setDeleteDialogOpen(true);
            }}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">教学计划管理</h1>
          <p className="text-muted-foreground">
            管理班级的课程安排和教师分配
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={openCreateDialog} className="gap-2">
            <Plus className="h-4 w-4" />
            新建计划
          </Button>
          {/* 年级批量设置入口按钮 */}
          <Button variant="secondary" onClick={openBatchDialog} className="gap-2">
            <Users className="h-4 w-4" />
            年级批量设置
          </Button>
        </div>
      </div>

      {/* 搜索和筛选 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            搜索筛选
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            <Input
              placeholder="搜索班级或备注..."
              value={searchParams.keyword || ''}
              onChange={(e) => setSearchParams(prev => ({ 
                ...prev, 
                keyword: e.target.value 
              }))}
            />
            <Input
              placeholder="学年 (如: 2024)"
              value={searchParams.academicYear || ''}
              onChange={(e) => setSearchParams(prev => ({ 
                ...prev, 
                academicYear: e.target.value 
              }))}
            />
            <Select
              value={searchParams.semester?.toString() || ''}
              onValueChange={(value) => setSearchParams(prev => ({ 
                ...prev, 
                semester: value ? parseInt(value) : undefined 
              }))}
            >
              <option value="">全部学期</option>
              <option value="1">上学期</option>
              <option value="2">下学期</option>
            </Select>
            <Select
              value={searchParams.status || ''}
              onValueChange={(value) => setSearchParams(prev => ({ 
                ...prev, 
                status: value 
              }))}
            >
              <option value="">全部状态</option>
              {TEACHING_PLAN_STATUS.map(status => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
            </Select>
            <div className="flex gap-2">
              <Button onClick={handleSearch} className="flex-1">
                搜索
              </Button>
              <Button variant="outline" onClick={handleResetSearch}>
                重置
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 教学计划列表 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            教学计划列表
          </CardTitle>
        </CardHeader>
        <CardContent>
                  <DataTable
          columns={columns}
          dataSource={teachingPlans}
          loading={loading}
          pagination={pagination}
          onPageChange={(page, pageSize) => 
            setPagination(prev => ({ ...prev, current: page, pageSize }))
          }
        />
        </CardContent>
      </Card>

      {/* 新建教学计划对话框 */}
      <Dialog open={dialogState.create} onOpenChange={(open) => 
        setDialogState(prev => ({ ...prev, create: open }))
      }>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>新建教学计划</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* 基本信息 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">基本信息</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-3">
                  <div>
                    <Label htmlFor="academicYear">学年 *</Label>
                    <Select
                      value={formData.academicYear}
                      onValueChange={(value) => {
                        setFormData(prev => ({ ...prev, academicYear: value, class: '' }));
                        // 当学年和学期都有值时，获取对应的班级列表
                        if (value && formData.semester) {
                          fetchClassesForAcademicYear(value, formData.semester);
                        }
                      }}
                    >
                      <option value="">请选择学年</option>
                      {generateAcademicYears().map((year) => (
                        <option key={year} value={year}>
                          {year}
                        </option>
                      ))}
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="semester">学期 *</Label>
                    <Select
                      value={formData.semester.toString()}
                      onValueChange={(value) => {
                        const newSemester = parseInt(value);
                        setFormData(prev => ({ ...prev, semester: newSemester, class: '' }));
                        // 当学年和学期都有值时，获取对应的班级列表
                        if (formData.academicYear && newSemester) {
                          fetchClassesForAcademicYear(formData.academicYear, newSemester);
                        }
                      }}
                    >
                      <option value="1">第一学期</option>
                      <option value="2">第二学期</option>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="class">班级 *</Label>
                    <Select
                      value={formData.class}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, class: value }))}
                      disabled={!formData.academicYear || !formData.semester}
                    >
                      <option value="">
                        {!formData.academicYear || !formData.semester 
                          ? '请先选择学年和学期' 
                          : classes.length === 0 
                            ? '该学年学期暂无班级数据'
                            : '请选择班级'
                        }
                      </option>
                      {classes.map((cls) => (
                        <option key={cls._id} value={cls._id}>
                          {cls.grade}年级{cls.name}班 ({cls.studentCount}人)
                        </option>
                      ))}
                    </Select>
                    {formData.academicYear && formData.semester && (
                      <p className="text-xs text-gray-500 mt-1">
                        显示 {formData.academicYear} 学年第{formData.semester}学期的班级
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 课程安排 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center justify-between">
                  课程安排
                  <Button 
                    type="button"
                    onClick={() => {
                      setFormData(prev => ({
                        ...prev,
                        courseAssignments: [
                          ...prev.courseAssignments,
                          {
                            course: '',
                            teacher: '',
                            weeklyHours: 2,
                            requiresContinuous: false,
                            continuousHours: 2,
                            preferredTimeSlots: [],
                            avoidTimeSlots: [],
                            notes: ''
                          }
                        ]
                      }));
                    }}
                    className="gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    添加课程
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {formData.courseAssignments.map((assignment, index) => (
                    <Card key={index} className="border-l-4 border-l-blue-500">
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium">课程 {index + 1}</h4>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setFormData(prev => ({
                                ...prev,
                                courseAssignments: prev.courseAssignments.filter((_, i) => i !== index)
                              }));
                            }}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="grid gap-4 md:grid-cols-3">
                          <div>
                            <Label>课程 *</Label>
                            <Select
                              value={assignment.course}
                              onValueChange={(value) => {
                                const newAssignments = [...formData.courseAssignments];
                                newAssignments[index].course = value;
                                setFormData(prev => ({ ...prev, courseAssignments: newAssignments }));
                              }}
                            >
                              <option value="">请选择课程</option>
                              {courses.map((course) => (
                                <option key={course._id} value={course._id}>
                                  {course.name}
                                </option>
                              ))}
                            </Select>
                          </div>
                          
                          <div>
                            <Label>授课教师 *</Label>
                            <Select
                              value={assignment.teacher}
                              onValueChange={(value) => {
                                const newAssignments = [...formData.courseAssignments];
                                newAssignments[index].teacher = value;
                                setFormData(prev => ({ ...prev, courseAssignments: newAssignments }));
                              }}
                            >
                              <option value="">请选择教师</option>
                              {teachers.map((teacher) => (
                                <option key={teacher._id} value={teacher._id}>
                                  {teacher.name} - {teacher.subjects?.join(', ') || '未设置科目'}
                                </option>
                              ))}
                            </Select>
                          </div>
                          
                          <div>
                            <Label>周课时 *</Label>
                            <Input
                              type="number"
                              min="1"
                              max="30"
                              value={assignment.weeklyHours}
                              onChange={(e) => {
                                const newAssignments = [...formData.courseAssignments];
                                newAssignments[index].weeklyHours = parseInt(e.target.value) || 1;
                                setFormData(prev => ({ ...prev, courseAssignments: newAssignments }));
                              }}
                            />
                          </div>
                        </div>
                        
                        <div className="mt-4 space-y-2">
                          <div className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              id={`continuous-${index}`}
                              checked={assignment.requiresContinuous || false}
                              onChange={(e) => {
                                const newAssignments = [...formData.courseAssignments];
                                newAssignments[index].requiresContinuous = e.target.checked;
                                // 当勾选连续排课时，自动设置连续课时数为2
                                if (e.target.checked && (!newAssignments[index].continuousHours || newAssignments[index].continuousHours < 2)) {
                                  newAssignments[index].continuousHours = 2;
                                }
                                setFormData(prev => ({ ...prev, courseAssignments: newAssignments }));
                              }}
                            />
                            <Label htmlFor={`continuous-${index}`}>需要连续排课</Label>
                          </div>
                          
                          {assignment.requiresContinuous && (
                            <div className="ml-6">
                              <Label>连续课时数</Label>
                              <Input
                                type="number"
                                min="2"
                                max="4"
                                value={assignment.continuousHours || 2}
                                onChange={(e) => {
                                  const newAssignments = [...formData.courseAssignments];
                                  newAssignments[index].continuousHours = parseInt(e.target.value) || 2;
                                  setFormData(prev => ({ ...prev, courseAssignments: newAssignments }));
                                }}
                                className="w-24"
                              />
                            </div>
                          )}
                          
                          <div>
                            <Label>备注</Label>
                            <Input
                              placeholder="课程安排备注"
                              value={assignment.notes || ''}
                              onChange={(e) => {
                                const newAssignments = [...formData.courseAssignments];
                                newAssignments[index].notes = e.target.value;
                                setFormData(prev => ({ ...prev, courseAssignments: newAssignments }));
                              }}
                            />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  
                  {formData.courseAssignments.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <BookOpen className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p>暂无课程安排，点击"添加课程"开始配置</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* 备注 */}
            <div>
              <Label htmlFor="notes">备注</Label>
              <Textarea
                id="notes"
                placeholder="教学计划备注"
                rows={3}
                value={formData.notes || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              />
            </div>
          </div>

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setDialogState(prev => ({ ...prev, create: false }))}
            >
              取消
            </Button>
            <Button 
              onClick={handleCreate}
              disabled={!formData.class || !formData.academicYear || formData.courseAssignments.length === 0}
            >
              创建教学计划
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 审批教学计划对话框 */}
      <Dialog open={dialogState.approve} onOpenChange={(open) => 
        setDialogState(prev => ({ ...prev, approve: open }))
      }>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>审批教学计划</DialogTitle>
          </DialogHeader>
          
          {/* 审批表单内容 */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="approvalComments">审批意见</Label>
              <Textarea
                id="approvalComments"
                placeholder="请输入审批意见..."
                rows={4}
                value={approvalComments}
                onChange={(e) => setApprovalComments(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeDialogs}>
              取消
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => handleApproval(false, approvalComments)}
            >
              拒绝
            </Button>
            <Button onClick={() => handleApproval(true, approvalComments)}>
              通过
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 删除确认对话框 */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认删除</DialogTitle>
          </DialogHeader>
          <div>确定要删除该教学计划吗？此操作不可恢复。</div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>取消</Button>
            <Button
              variant="destructive"
              onClick={async () => {
                if (planToDelete) {
                  await handleDelete(planToDelete._id);
                  setDeleteDialogOpen(false);
                  setPlanToDelete(null);
                }
              }}
            >
              确认删除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 编辑教学计划对话框 */}
      <Dialog open={dialogState.edit} onOpenChange={(open) => setDialogState(prev => ({ ...prev, edit: open }))}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>编辑教学计划</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            {/* 基本信息 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">基本信息</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-3">
                  <div>
                    <Label htmlFor="academicYear">学年 *</Label>
                    <Select
                      value={formData.academicYear}
                      onValueChange={(value) => {
                        setFormData(prev => ({ ...prev, academicYear: value, class: '' }));
                        if (value && formData.semester) {
                          fetchClassesForAcademicYear(value, formData.semester);
                        }
                      }}
                    >
                      <option value="">请选择学年</option>
                      {generateAcademicYears().map((year) => (
                        <option key={year} value={year}>
                          {year}
                        </option>
                      ))}
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="semester">学期 *</Label>
                    <Select
                      value={formData.semester.toString()}
                      onValueChange={(value) => {
                        const newSemester = parseInt(value);
                        setFormData(prev => ({ ...prev, semester: newSemester, class: '' }));
                        if (formData.academicYear && newSemester) {
                          fetchClassesForAcademicYear(formData.academicYear, newSemester);
                        }
                      }}
                    >
                      <option value="1">第一学期</option>
                      <option value="2">第二学期</option>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="class">班级 *</Label>
                    <Select
                      value={formData.class}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, class: value }))}
                      disabled={!formData.academicYear || !formData.semester}
                    >
                      <option value="">
                        {!formData.academicYear || !formData.semester 
                          ? '请先选择学年和学期' 
                          : classes.length === 0 
                            ? '该学年学期暂无班级数据'
                            : '请选择班级'
                        }
                      </option>
                      {classes.map((cls) => (
                        <option key={cls._id} value={cls._id}>
                          {cls.grade}年级{cls.name}班 ({cls.studentCount}人)
                        </option>
                      ))}
                    </Select>
                    {formData.academicYear && formData.semester && (
                      <p className="text-xs text-gray-500 mt-1">
                        显示 {formData.academicYear} 学年第{formData.semester}学期的班级
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 课程安排 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center justify-between">
                  课程安排
                  <Button 
                    type="button"
                    onClick={() => {
                      setFormData(prev => ({
                        ...prev,
                        courseAssignments: [
                          ...prev.courseAssignments,
                          {
                            course: '',
                            teacher: '',
                            weeklyHours: 2,
                            requiresContinuous: false,
                            continuousHours: 2,
                            preferredTimeSlots: [],
                            avoidTimeSlots: [],
                            notes: ''
                          }
                        ]
                      }));
                    }}
                    className="gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    添加课程
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {formData.courseAssignments.map((assignment, index) => (
                    <Card key={index} className="border-l-4 border-l-blue-500">
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium">课程 {index + 1}</h4>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setFormData(prev => ({
                                ...prev,
                                courseAssignments: prev.courseAssignments.filter((_, i) => i !== index)
                              }));
                            }}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="grid gap-4 md:grid-cols-3">
                          <div>
                            <Label>课程 *</Label>
                            <Select
                              value={assignment.course}
                              onValueChange={(value) => {
                                const newAssignments = [...formData.courseAssignments];
                                newAssignments[index].course = value;
                                setFormData(prev => ({ ...prev, courseAssignments: newAssignments }));
                              }}
                            >
                              <option value="">请选择课程</option>
                              {courses.map((course) => (
                                <option key={course._id} value={course._id}>
                                  {course.name}
                                </option>
                              ))}
                            </Select>
                          </div>
                          <div>
                            <Label>授课教师 *</Label>
                            <Select
                              value={assignment.teacher}
                              onValueChange={(value) => {
                                const newAssignments = [...formData.courseAssignments];
                                newAssignments[index].teacher = value;
                                setFormData(prev => ({ ...prev, courseAssignments: newAssignments }));
                              }}
                            >
                              <option value="">请选择教师</option>
                              {teachers.map((teacher) => (
                                <option key={teacher._id} value={teacher._id}>
                                  {teacher.name} - {teacher.subjects?.join(', ') || '未设置科目'}
                                </option>
                              ))}
                            </Select>
                          </div>
                          <div>
                            <Label>周课时 *</Label>
                            <Input
                              type="number"
                              min="1"
                              max="30"
                              value={assignment.weeklyHours}
                              onChange={(e) => {
                                const newAssignments = [...formData.courseAssignments];
                                newAssignments[index].weeklyHours = parseInt(e.target.value) || 1;
                                setFormData(prev => ({ ...prev, courseAssignments: newAssignments }));
                              }}
                            />
                          </div>
                        </div>
                        <div className="mt-4 space-y-2">
                          <div className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              id={`continuous-edit-${index}`}
                              checked={assignment.requiresContinuous || false}
                              onChange={(e) => {
                                const newAssignments = [...formData.courseAssignments];
                                newAssignments[index].requiresContinuous = e.target.checked;
                                if (e.target.checked && (!newAssignments[index].continuousHours || newAssignments[index].continuousHours < 2)) {
                                  newAssignments[index].continuousHours = 2;
                                }
                                setFormData(prev => ({ ...prev, courseAssignments: newAssignments }));
                              }}
                            />
                            <Label htmlFor={`continuous-edit-${index}`}>需要连续排课</Label>
                          </div>
                          {assignment.requiresContinuous && (
                            <div className="ml-6">
                              <Label>连续课时数</Label>
                              <Input
                                type="number"
                                min="2"
                                max="4"
                                value={assignment.continuousHours || 2}
                                onChange={(e) => {
                                  const newAssignments = [...formData.courseAssignments];
                                  newAssignments[index].continuousHours = parseInt(e.target.value) || 2;
                                  setFormData(prev => ({ ...prev, courseAssignments: newAssignments }));
                                }}
                                className="w-24"
                              />
                            </div>
                          )}
                          <div>
                            <Label>备注</Label>
                            <Input
                              placeholder="课程安排备注"
                              value={assignment.notes || ''}
                              onChange={(e) => {
                                const newAssignments = [...formData.courseAssignments];
                                newAssignments[index].notes = e.target.value;
                                setFormData(prev => ({ ...prev, courseAssignments: newAssignments }));
                              }}
                            />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  {formData.courseAssignments.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <BookOpen className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p>暂无课程安排，点击"添加课程"开始配置</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* 备注 */}
            <div>
              <Label htmlFor="notes-edit">备注</Label>
              <Textarea
                id="notes-edit"
                placeholder="教学计划备注"
                rows={3}
                value={formData.notes || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialogs}>取消</Button>
            <Button onClick={handleUpdate}>保存修改</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 年级批量设置Dialog */}
      <Dialog open={batchDialogOpen} onOpenChange={(open) => {
        if (!open) closeBatchDialog();
        else setBatchDialogOpen(true);
      }}>
        <DialogContent className="max-w-[90vw] w-full overflow-x-auto">
          <DialogHeader>
            <DialogTitle>年级批量设置教学计划</DialogTitle>
            {/* 导出按钮，右上角 */}
            {batchForm && batchForm.grade && batchForm.courses.length > 0 && batchForm.assignments.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                className="absolute right-8 top-6"
                disabled={exportLoading || batchLoading}
                /**
                 * 导出当前批量表单为CSV文件
                 * 
                 * Args: None
                 * Returns: void
                 */
                onClick={async () => {
                  setExportLoading(true);
                  try {
                    // 组装导出数据，按年级、班级、课程、课时、连排、教师输出
                    const filteredClasses = classes.filter(cls => String(cls.name.slice(0, 3)) === String(batchForm.grade));
                    const rows: Array<{ 年级: string; 班级: string; 课程: string; 课时: string; 连排: string; 教师: string }> = [];
                    filteredClasses.forEach(cls => {
                      batchForm.courses.forEach(course => {
                        const assignment = batchForm.assignments.find(a => a.classId === cls._id);
                        const teacherId = assignment?.teachers[course.courseId] || '';
                        // 查找教师姓名
                        const teacherName = teachers.find(t => t._id === teacherId)?.name || '';
                        rows.push({
                          年级: String(batchForm.grade),
                          班级: cls.name,
                          课程: course.name,
                          课时: String(course.weeklyHours),
                          连排: course.continuous ? '是' : '否',
                          教师: teacherName,
                        });
                      });
                    });
                    // 生成CSV内容
                    const headers = ['年级', '班级', '课程', '课时', '连排', '教师'];
                    const csvContent = generateCsv(rows, headers, item => [item.年级, item.班级, item.课程, item.课时, item.连排, item.教师]);
                    // 文件名
                    const now = new Date();
                    const ts = `${now.getFullYear()}${(now.getMonth()+1).toString().padStart(2,'0')}${now.getDate().toString().padStart(2,'0')}_${now.getHours().toString().padStart(2,'0')}${now.getMinutes().toString().padStart(2,'0')}`;
                    const filename = `教学计划批量配置_${batchForm.grade}_${ts}.csv`;
                    downloadCsv(csvContent, filename);
                  } finally {
                    setExportLoading(false);
                  }
                }}
              >{exportLoading ? '导出中...' : '导出'}</Button>
            )}
          </DialogHeader>
          <div className="p-6 flex flex-col gap-6">
            {/* 年级选择区 */}
            <div>

              <Label>选择年级</Label>
 
              <Select
                value={batchForm?.grade || ''}
                onValueChange={async (grade) => {
                  // 验证当前已选择的课程是否在新年级中有效
                  if (batchForm?.grade && batchForm.courses.length > 0) {
                    const validation = validateCoursesForGrade(grade, batchForm.courses);
                    if (!validation.valid) {
                      // 如果有无效课程，给出警告但允许继续
                      console.warn(`年级切换后，以下课程在${grade}中不存在:`, validation.invalidCourses);
                    }
                  }
                  
                  // 设置年级
                  setBatchForm(f => f ? { ...f, grade, courses: [], assignments: [] } : null);
                  
                  // 清空之前的课程选择
                  setBatchFormErrors(null);
                  
                  // 获取该年级的课程
                  if (grade) {
                    await fetchCoursesByGrade(grade);
                  }
                }}
                options={gradeOptions.map(grade => ({ value: grade, label: grade }))}
                placeholder="请选择年级"
                className="w-48 mt-2"
              />
            </div>
            <Separator />
            {/* 课程结构配置区（动态增删） */}
            <div>
              <Label>课程结构配置</Label>
              
              {/* 课程筛选提示 */}
              {batchForm?.grade && (
                <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                  {coursesLoading ? (
                    <div className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                      正在加载{batchForm.grade}的课程...
                    </div>
                  ) : filteredCoursesByGrade[batchForm.grade] ? (
                    <div className="flex items-center gap-2 text-green-600">
                      <CheckCircle size={16} />
                      已筛选{batchForm.grade}的课程（{filteredCoursesByGrade[batchForm.grade].length}门）

                      {batchForm.courses.length > 0 && (
                        <span className="text-blue-600 ml-2">
                          （当前已选择{batchForm.courses.length}门，剩余{getAvailableCourses(batchForm.grade, batchForm.courses).length}门可选）
                        </span>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-amber-600">
                      <AlertCircle size={16} />
                      未找到{batchForm.grade}的课程，显示所有课程（{courses.length}门）
                    </div>
                  )}
                </div>
              )}
              
              <div className="border rounded p-4 min-h-[80px] flex flex-col gap-4">
                {/* 课程列表 */}
                {batchForm?.courses && batchForm.courses.length > 0 ? (
                  batchForm.courses.map((course, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <Select
                        className="w-48"
                        value={course.courseId}
                        onValueChange={courseId => setBatchForm(f => {
                          if (!f) return f;
                          const coursesArr = [...f.courses];
                          // 优先使用按年级筛选的课程，如果没有则使用全局课程
                          const availableCourses = batchForm.grade && filteredCoursesByGrade[batchForm.grade] 
                            ? filteredCoursesByGrade[batchForm.grade] 
                            : courses;
                          const selected = availableCourses.find(c => c._id === courseId);
                          coursesArr[idx] = { 
                            ...coursesArr[idx], 
                            courseId, 
                            name: selected?.name || '',
                            subject: selected?.subject || ''
                          };
                          return { ...f, courses: coursesArr };
                        })}
                        options={getAvailableCourses(batchForm.grade, batchForm.courses, course.courseId)
                          .map(c => ({ value: c._id, label: c.name }))}
                        placeholder={`请选择课程 (${getAvailableCourses(batchForm.grade, batchForm.courses, course.courseId).length}门可选)`}
                      />
                      <Input
                        className="w-24"
                        type="number"
                        min={1}
                        placeholder="课时/周"
                        value={course.weeklyHours}
                        onChange={e => setBatchForm(f => {
                          if (!f) return f;
                          const coursesArr = [...f.courses];
                          coursesArr[idx] = { ...coursesArr[idx], weeklyHours: Number(e.target.value) };
                          return { ...f, courses: coursesArr };
                        })}
                      />
                      <label className="flex items-center gap-1 text-sm">
                        <input
                          type="checkbox"
                          checked={!!course.continuous}
                          onChange={e => setBatchForm(f => {
                            if (!f) return f;
                            const coursesArr = [...f.courses];
                            coursesArr[idx] = { ...coursesArr[idx], continuous: e.target.checked };
                            return { ...f, courses: coursesArr };
                          })}
                        /> 连排
                      </label>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setBatchForm(f => {
                          if (!f) return f;
                          const coursesArr = f.courses.filter((_, i) => i !== idx);
                          return { ...f, courses: coursesArr };
                        })}
                        title="删除课程"
                      >
                        <X size={16} />
                      </Button>
                    </div>
                  ))
                ) : (
                  <div className="text-gray-400 text-sm">暂无课程，请添加</div>
                )}
                {/* 添加课程按钮 */}
                <Button
                  variant="outline"
                  size="sm"
                  className="w-32 mt-2"
                  onClick={() => setBatchForm(f => {
                    if (!f) return f;
                    return {
                      ...f,
                      courses: [
                        ...f.courses,
                        { courseId: '', name: '', subject: '', weeklyHours: 1, continuous: false }
                      ]
                    };
                  })}
                >
                  <Plus size={14} className="mr-1" /> 添加课程
                </Button>
              </div>
            </div>
            <Separator />
            {/* 班级-教师分配表格（动态渲染） */}
            <div>
              <Label>班级-教师分配</Label>
              {/* 快捷操作区 */}
              {batchForm?.grade && batchForm.courses.length > 0 && teachers.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-2 items-center">
                  {/* 批量分配：为所有班级的某课程一键分配同一教师 */}
                  {batchForm.courses.map((course, cidx) => (
                    <div key={cidx} className="flex items-center gap-1">
                      <Select
                        value={''}
                        onValueChange={teacherId => {
                          setBatchForm(f => {
                            if (!f) return f;
                            const newAssignments = f.assignments.map(a => ({
                              ...a,
                              teachers: { ...a.teachers, [course.courseId]: teacherId }
                            }));
                            return { ...f, assignments: newAssignments };
                          });
                        }}
                        options={teachers
                          .filter(t => {
                            const subs = t.subjects || [];
                            return subs.length === 0 || subs.includes(course.subject);
                          })
                          .map(t => ({ value: t._id, label: `批量分配: ${course.name}→${t.name}` }))}
                        placeholder={`批量分配${course.name}`}
                        className="w-40"
                      />
                    </div>
                  ))}
                  <span className="text-gray-400 mx-2">|</span>
                  {/* 复制上一班级分配 */}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setBatchForm(f => {
                      if (!f) return f;
                      if (f.assignments.length < 2) return f;
                      const prev = f.assignments[f.assignments.length - 2];
                      const last = f.assignments[f.assignments.length - 1];
                      const newAssignments = f.assignments.map((a, i) =>
                        i === f.assignments.length - 1
                          ? { ...a, teachers: { ...prev.teachers } }
                          : a
                      );
                      return { ...f, assignments: newAssignments };
                    })}
                  >复制上一班级分配</Button>
                  {/* 清空本班分配 */}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setBatchForm(f => {
                      if (!f) return f;
                      if (f.assignments.length === 0) return f;
                      const newAssignments = f.assignments.map((a, i) =>
                        i === f.assignments.length - 1
                          ? { ...a, teachers: {} }
                          : a
                      );
                      return { ...f, assignments: newAssignments };
                    })}
                  >清空本班分配</Button>
                </div>
              )}
              <div
                className="border rounded p-4 min-h-[120px] w-max"
              >
                {/* 仅在选定年级和有课程时渲染表格 */}
                {batchForm?.grade && batchForm.courses.length > 0 ? (
                  (() => {
                    // 1. 根据年级筛选班级
                    const filteredClasses = classes
                      .filter(cls => String(cls.name.slice(0, 3)) === String(batchForm.grade))
                      .sort((a, b) => {
                        // 提取数字部分进行自然排序
                        const numA = parseInt(a.name.replace(/[^0-9]/g, ''), 10) || 0;
                        const numB = parseInt(b.name.replace(/[^0-9]/g, ''), 10) || 0;
                        return numA - numB;
                      });
                    // 2. 构建班级-教师分配数据结构
                    // 若assignments未覆盖所有班级，自动补全
                    const assignments = filteredClasses.map(cls => {
                      let found = batchForm.assignments.find(a => a.classId === cls._id);
                      if (!found) {
                        found = { classId: cls._id, teachers: {} };
                      }
                      return found;
                    });
                    // 3. 渲染表格
                    return (
                      <table className="min-w-max border-collapse text-sm">
                        <thead>
                          <tr>
                            <th className="border px-2 py-1 bg-gray-50">班级</th>
                            {batchForm.courses.map((course, cidx) => (
                              <th key={cidx} className="border px-2 py-1 bg-gray-50">{course.name || `课程${cidx+1}`}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {assignments.map((assignment, ridx) => {
                            const cls = filteredClasses[ridx];
                            return (
                              <tr key={cls._id}>
                                <td className="border px-2 py-1 font-medium whitespace-nowrap">{cls.name}</td>
                                {batchForm.courses.map((course, cidx) => {
                                  // 只显示可授该课程的教师
                                  const eligibleTeachers = teachers.filter(t => {
                                    // 根据课程学科匹配教师学科
                                    const subs = t.subjects || [];
                                    return subs.length === 0 || subs.includes(course.subject);
                                  });
                                  return (
                                    <td key={cidx} className="border px-2 py-1 min-w-[120px]">
                                      <Select
                                        value={assignment.teachers[course.courseId] || ''}
                                        onValueChange={teacherId => {
                                          setBatchForm(f => {
                                            if (!f) return f;
                                            const newAssignments = f.assignments.map(a =>
                                              a.classId === cls._id
                                                ? { ...a, teachers: { ...a.teachers, [course.courseId]: teacherId } }
                                                : a
                                            );
                                            // 若当前班级assignment不存在则补充
                                            if (!f.assignments.some(a => a.classId === cls._id)) {
                                              newAssignments.push({ classId: cls._id, teachers: { [course.courseId]: teacherId } });
                                            }
                                            return { ...f, assignments: newAssignments };
                                          });
                                        }}
                                        options={eligibleTeachers.map(t => ({ value: t._id, label: t.name }))}
                                        placeholder="选择教师"
                                        className="w-28"
                                      />
                                    </td>
                                  );
                                })}
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    );
                  })()
                ) : (
                  <div className="text-gray-400 text-sm">请先选择年级并配置课程</div>
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeBatchDialog} disabled={batchLoading || exportLoading}>取消</Button>
            <Button
              disabled={!batchForm || !batchForm.grade || batchForm.courses.length === 0 || batchForm.assignments.length === 0 || batchLoading || exportLoading}
              /**
               * 批量提交前校验表单并发起批量创建请求
               * 
               * Args: None
               * Returns: void
               */
              onClick={async () => {
                if (!batchForm) return;
                setBatchLoading(true);
                // 校验逻辑
                /**
                 * 校验批量表单数据
                 * 1. 校验课程结构区：名称、课时、连排
                 * 2. 校验班级-教师分配区：每班每课均需分配教师
                 * 错误信息写入batchFormErrors
                 */
                const errors: typeof batchFormErrors = { courses: [], assignments: {} };
                let hasError = false;
                // 1. 校验课程结构区
                batchForm.courses.forEach((course, idx) => {
                  const courseErr: { name?: string; weeklyHours?: string; continuous?: string } = {};
                  if (!course.name || course.name.trim() === '') {
                    courseErr.name = '课程名称不能为空';
                    hasError = true;
                  }
                  if (!course.weeklyHours || course.weeklyHours <= 0 || !Number.isInteger(course.weeklyHours)) {
                    courseErr.weeklyHours = '课时必须为正整数';
                    hasError = true;
                  }
                  if (course.continuous && (typeof course.continuous !== 'boolean')) {
                    courseErr.continuous = '连排设置非法';
                    hasError = true;
                  }
                  errors.courses![idx] = courseErr;
                });
                // 2. 校验班级-教师分配
                const filteredClasses = classes.filter(cls => String(cls.name.slice(0, 3)) === String(batchForm.grade));
                batchForm.assignments.forEach(assignment => {
                  const classErr: { [courseId: string]: string } = {};
                  batchForm.courses.forEach(course => {
                    if (!assignment.teachers[course.courseId] || assignment.teachers[course.courseId] === '') {
                      classErr[course.courseId] = '请选择教师';
                      hasError = true;
                    }
                  });
                  if (Object.keys(classErr).length > 0) {
                    errors.assignments![assignment.classId] = classErr;
                  }
                });
                setBatchFormErrors(errors);
                if (hasError) {
                  setBatchLoading(false);
                  // 自动聚焦第一个错误项
                  setTimeout(() => {
                    // 课程结构区错误优先
                    const courseIdx = errors.courses?.findIndex(c => c && (c.name || c.weeklyHours));
                    if (courseIdx !== undefined && courseIdx >= 0) {
                      const el = document.querySelectorAll('input[placeholder="课程名称"]')[courseIdx] as HTMLElement;
                      if (el) el.focus();
                      return;
                    }
                    // 班级-教师分配区错误
                    if (errors.assignments) {
                      const classId = Object.keys(errors.assignments)[0];
                      const courseId = classId && Object.keys(errors.assignments[classId] || {})[0];
                      if (classId && courseId) {
                        // 定位到对应Select
                        const el = document.querySelector(`select[name="teacher-select-${classId}-${courseId}"]`) as HTMLElement;
                        if (el) el.focus();
                      }
                    }
                  }, 100);
                  alert('请修正表单中的错误后再提交！');
                  return;
                }
                // 校验通过，继续批量提交
                const currentYear = new Date().getFullYear();
                const academicYear = `${currentYear}-${currentYear + 1}`;
                const semester = 1;
                const apiRequests = convertBatchFormToApiRequests(batchForm, academicYear, semester);
                try {
                  // 并发批量创建教学计划
                  const results = await Promise.all(apiRequests.map(req => teachingPlanApi.create(req)));
                  const successCount = results.filter(r => r.success).length;
                  const failCount = results.length - successCount;
                  alert(`批量创建完成：成功${successCount}条，失败${failCount}条`);
                  closeBatchDialog();
                  fetchTeachingPlans();
                } catch (err) {
                  alert('批量创建失败，请检查网络或数据！');
                } finally {
                  setBatchLoading(false);
                }
              }}
            >{batchLoading ? '提交中...' : '批量提交'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}