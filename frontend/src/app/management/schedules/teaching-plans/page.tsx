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
  X
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
        <Button onClick={openCreateDialog} className="gap-2">
          <Plus className="h-4 w-4" />
          新建计划
        </Button>
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
    </div>
  );
}