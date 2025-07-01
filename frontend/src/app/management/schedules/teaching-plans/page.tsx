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

  // 表单数据
  const [formData, setFormData] = useState<CreateTeachingPlanRequest>({
    class: '',
    academicYear: '',
    semester: 1,
    courseAssignments: [],
    notes: '',
  });

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
  const fetchBaseData = async () => {
    try {
      const [classesRes, coursesRes, teachersRes] = await Promise.all([
        classApi.getList({ limit: 1000, isActive: true }),
        courseApi.getList({ limit: 1000, isActive: true }),
        teacherApi.getList({ limit: 1000, isActive: true })
      ]);

      if (classesRes.success && classesRes.data) {
        setClasses(classesRes.data.items);
      }
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
    setFormData({
      class: '',
      academicYear: new Date().getFullYear().toString(),
      semester: 1,
      courseAssignments: [],
      notes: '',
    });
    setDialogState(prev => ({ ...prev, create: true }));
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
  };

  /**
   * 创建教学计划
   */
  const handleCreate = async () => {
    try {
      const response = await teachingPlanApi.create(formData);
      if (response.success) {
        closeDialogs();
        fetchTeachingPlans();
      }
    } catch (error) {
      console.error('创建教学计划失败:', error);
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
    if (!confirm('确定要删除这个教学计划吗？')) return;
    
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
            onClick={() => handleDelete(record._id)}
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
            data={teachingPlans}
            loading={loading}
            pagination={pagination}
            onPaginationChange={setPagination}
          />
        </CardContent>
      </Card>
    </div>
  );
}