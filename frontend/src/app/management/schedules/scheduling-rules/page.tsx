/**
 * 排课规则管理页面
 * 
 * 提供排课规则的创建、编辑、查看和设置默认功能
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { DataTable, TableColumn } from '@/components/ui/data-table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { 
  Plus, 
  Search, 
  Settings, 
  Clock, 
  Users,
  Building,
  BookOpen,
  AlertTriangle,
  Copy,
  Star,
  Edit,
  Eye,
  Trash2,
  X
} from 'lucide-react';
import { 
  SchedulingRules,
  CreateSchedulingRulesRequest,
  schedulingRulesApi,
  SchedulingRulesQueryParams,
  PaginatedResponse,
  SCHOOL_TYPES,
  DISTRIBUTION_POLICIES,
  CONFLICT_RESOLUTION_STRATEGIES,
  TIME_PREFERENCES,
  ROOM_PRIORITY_OPTIONS,
  formatSchoolType,
  WEEKDAYS
} from '@/lib/api';
import { formatDateTime, cn } from '@/lib/utils';

/**
 * 排课规则管理页面组件
 * 
 * Returns:
 *   React.ReactElement: 排课规则管理页面
 */
export default function SchedulingRulesPage() {
  // 状态管理
  const [schedulingRules, setSchedulingRules] = useState<SchedulingRules[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });

  // 搜索和筛选状态
  const [searchParams, setSearchParams] = useState<SchedulingRulesQueryParams>({
    keyword: '',
    academicYear: '',
    semester: undefined,
    schoolType: '',
    isDefault: undefined,
  });

  // 对话框状态
  const [dialogState, setDialogState] = useState({
    create: false,
    edit: false,
    view: false,
    copy: false,
  });

  // 当前操作的排课规则
  const [selectedRules, setSelectedRules] = useState<SchedulingRules | null>(null);

  // 表单数据
  const [formData, setFormData] = useState<CreateSchedulingRulesRequest>({
    name: '',
    description: '',
    schoolType: 'high',
    academicYear: new Date().getFullYear().toString(),
    semester: 1,
    timeRules: {
      dailyPeriods: 8,
      workingDays: [1, 2, 3, 4, 5],
      periodDuration: 45,
      breakDuration: 10,
      lunchBreakStart: 4,
      lunchBreakDuration: 90,
      morningPeriods: [1, 2, 3, 4],
      afternoonPeriods: [5, 6, 7, 8],
      forbiddenSlots: [],
    },
    teacherConstraints: {
      maxDailyHours: 6,
      maxContinuousHours: 3,
      minRestBetweenCourses: 1,
      avoidFridayAfternoon: true,
      respectTeacherPreferences: true,
      allowCrossGradeTeaching: true,
    },
    roomConstraints: {
      respectCapacityLimits: true,
      allowRoomSharing: false,
      preferFixedClassrooms: true,
      specialRoomPriority: 'preferred',
    },
    courseArrangementRules: {
      allowContinuousCourses: true,
      maxContinuousHours: 2,
      distributionPolicy: 'balanced',
      avoidFirstLastPeriod: [],
      coreSubjectPriority: true,
      labCoursePreference: 'morning',
    },
    conflictResolutionRules: {
      teacherConflictResolution: 'strict',
      roomConflictResolution: 'strict',
      classConflictResolution: 'strict',
      allowOverride: false,
      priorityOrder: ['teacher', 'room', 'time'],
    },
    isDefault: false,
  });

  // 复制规则表单数据
  const [copyFormData, setCopyFormData] = useState({
    targetAcademicYear: '',
    targetSemester: 1,
    newName: '',
  });

  /**
   * 获取排课规则列表
   */
  const fetchSchedulingRules = async () => {
    try {
      setLoading(true);
      const params = {
        ...searchParams,
        page: pagination.current,
        limit: pagination.pageSize,
      };
      
      const response = await schedulingRulesApi.getList(params);
      if (response.success && response.data) {
        setSchedulingRules(response.data.items);
        setPagination(prev => ({
          ...prev,
          total: response.data!.total,
        }));
      }
    } catch (error) {
      console.error('获取排课规则失败:', error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * 初始化数据
   */
  useEffect(() => {
    fetchSchedulingRules();
  }, [pagination.current, pagination.pageSize]);

  /**
   * 搜索处理
   */
  const handleSearch = () => {
    setPagination(prev => ({ ...prev, current: 1 }));
    fetchSchedulingRules();
  };

  /**
   * 重置搜索
   */
  const handleResetSearch = () => {
    setSearchParams({
      keyword: '',
      academicYear: '',
      semester: undefined,
      schoolType: '',
      isDefault: undefined,
    });
    setPagination(prev => ({ ...prev, current: 1 }));
  };

  /**
   * 打开创建对话框
   */
  const openCreateDialog = () => {
    setFormData({
      name: '',
      description: '',
      schoolType: 'high',
      academicYear: new Date().getFullYear().toString(),
      semester: 1,
      timeRules: {
        dailyPeriods: 8,
        workingDays: [1, 2, 3, 4, 5],
        periodDuration: 45,
        breakDuration: 10,
        lunchBreakStart: 4,
        lunchBreakDuration: 90,
        morningPeriods: [1, 2, 3, 4],
        afternoonPeriods: [5, 6, 7, 8],
        forbiddenSlots: [],
      },
      teacherConstraints: {
        maxDailyHours: 6,
        maxContinuousHours: 3,
        minRestBetweenCourses: 1,
        avoidFridayAfternoon: true,
        respectTeacherPreferences: true,
        allowCrossGradeTeaching: true,
      },
      roomConstraints: {
        respectCapacityLimits: true,
        allowRoomSharing: false,
        preferFixedClassrooms: true,
        specialRoomPriority: 'preferred',
      },
      courseArrangementRules: {
        allowContinuousCourses: true,
        maxContinuousHours: 2,
        distributionPolicy: 'balanced',
        avoidFirstLastPeriod: [],
        coreSubjectPriority: true,
        labCoursePreference: 'morning',
      },
      conflictResolutionRules: {
        teacherConflictResolution: 'strict',
        roomConflictResolution: 'strict',
        classConflictResolution: 'strict',
        allowOverride: false,
        priorityOrder: ['teacher', 'room', 'time'],
      },
      isDefault: false,
    });
    setDialogState(prev => ({ ...prev, create: true }));
  };

  /**
   * 打开编辑对话框
   */
  const openEditDialog = (rules: SchedulingRules) => {
    setSelectedRules(rules);
    setFormData({
      name: rules.name,
      description: rules.description,
      schoolType: rules.schoolType,
      academicYear: rules.academicYear,
      semester: rules.semester,
      timeRules: rules.timeRules,
      teacherConstraints: rules.teacherConstraints,
      roomConstraints: rules.roomConstraints,
      courseArrangementRules: rules.courseArrangementRules,
      conflictResolutionRules: rules.conflictResolutionRules,
      isDefault: rules.isDefault,
    });
    setDialogState(prev => ({ ...prev, edit: true }));
  };

  /**
   * 打开查看对话框
   */
  const openViewDialog = (rules: SchedulingRules) => {
    setSelectedRules(rules);
    setDialogState(prev => ({ ...prev, view: true }));
  };

  /**
   * 打开复制对话框
   */
  const openCopyDialog = (rules: SchedulingRules) => {
    setSelectedRules(rules);
    setCopyFormData({
      targetAcademicYear: (parseInt(rules.academicYear) + 1).toString(),
      targetSemester: rules.semester,
      newName: `${rules.name} (副本)`,
    });
    setDialogState(prev => ({ ...prev, copy: true }));
  };

  /**
   * 关闭所有对话框
   */
  const closeDialogs = () => {
    setDialogState({
      create: false,
      edit: false,
      view: false,
      copy: false,
    });
    setSelectedRules(null);
  };

  /**
   * 创建排课规则
   */
  const handleCreate = async () => {
    try {
      const response = await schedulingRulesApi.create(formData);
      if (response.success) {
        closeDialogs();
        fetchSchedulingRules();
      }
    } catch (error) {
      console.error('创建排课规则失败:', error);
    }
  };

  /**
   * 更新排课规则
   */
  const handleUpdate = async () => {
    if (!selectedRules) return;
    
    try {
      const response = await schedulingRulesApi.update(selectedRules._id, formData);
      if (response.success) {
        closeDialogs();
        fetchSchedulingRules();
      }
    } catch (error) {
      console.error('更新排课规则失败:', error);
    }
  };

  /**
   * 删除排课规则
   */
  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除这个排课规则吗？')) return;
    
    try {
      const response = await schedulingRulesApi.delete(id);
      if (response.success) {
        fetchSchedulingRules();
      }
    } catch (error) {
      console.error('删除排课规则失败:', error);
    }
  };

  /**
   * 设置默认规则
   */
  const handleSetDefault = async (id: string) => {
    try {
      const response = await schedulingRulesApi.setDefault(id);
      if (response.success) {
        fetchSchedulingRules();
      }
    } catch (error) {
      console.error('设置默认规则失败:', error);
    }
  };

  /**
   * 复制规则
   */
  const handleCopy = async () => {
    if (!selectedRules) return;
    
    try {
      const response = await schedulingRulesApi.copy(
        selectedRules._id,
        copyFormData.targetAcademicYear,
        copyFormData.targetSemester,
        copyFormData.newName
      );
      if (response.success) {
        closeDialogs();
        fetchSchedulingRules();
      }
    } catch (error) {
      console.error('复制排课规则失败:', error);
    }
  };

  // 表格列定义
  const columns: TableColumn<SchedulingRules>[] = [
    {
      key: 'name',
      title: '规则名称',
      render: (_, record) => (
        <div>
          <div className="font-medium flex items-center gap-2">
            {record.name}
            {record.isDefault && <Star className="h-4 w-4 text-yellow-500" />}
          </div>
          <div className="text-sm text-muted-foreground">
            {formatSchoolType(record.schoolType)}
          </div>
        </div>
      ),
    },
    {
      key: 'academicYear',
      title: '学年学期',
      render: (_, record) => (
        <div>
          <div className="font-medium">{record.academicYear}学年</div>
          <div className="text-sm text-muted-foreground">
            {record.semester === 1 ? '上学期' : '下学期'}
          </div>
        </div>
      ),
    },
    {
      key: 'timeRules',
      title: '时间设置',
      render: (_, record) => (
        <div className="text-sm">
          <div>{record.timeRules.dailyPeriods}节/天</div>
          <div className="text-muted-foreground">
            {record.timeRules.workingDays.length}个工作日
          </div>
        </div>
      ),
    },
    {
      key: 'constraints',
      title: '约束条件',
      render: (_, record) => (
        <div className="space-y-1">
          <Badge variant="outline">
            教师最大{record.teacherConstraints.maxDailyHours}节/天
          </Badge>
          <Badge variant="outline">
            连续最多{record.teacherConstraints.maxContinuousHours}节
          </Badge>
        </div>
      ),
    },
    {
      key: 'status',
      title: '状态',
      render: (_, record) => (
        <div className="space-y-1">
          {record.isDefault && (
            <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300">
              默认规则
            </Badge>
          )}
          <Badge variant={record.isActive ? 'default' : 'secondary'}>
            {record.isActive ? '启用' : '禁用'}
          </Badge>
        </div>
      ),
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
            onClick={() => openCopyDialog(record)}
          >
            <Copy className="h-4 w-4" />
          </Button>
          {!record.isDefault && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleSetDefault(record._id)}
            >
              <Star className="h-4 w-4" />
            </Button>
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
          <h1 className="text-3xl font-bold tracking-tight">排课规则管理</h1>
          <p className="text-muted-foreground">
            配置排课约束和优化规则
          </p>
        </div>
        <Button onClick={openCreateDialog} className="gap-2">
          <Plus className="h-4 w-4" />
          新建规则
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
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
            <Input
              placeholder="搜索规则名称..."
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
              value={searchParams.schoolType || ''}
              onValueChange={(value) => setSearchParams(prev => ({ 
                ...prev, 
                schoolType: value 
              }))}
            >
              <option value="">全部学校类型</option>
              {SCHOOL_TYPES.map(type => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </Select>
            <Select
              value={searchParams.isDefault?.toString() || ''}
              onValueChange={(value) => setSearchParams(prev => ({ 
                ...prev, 
                isDefault: value === 'true' ? true : value === 'false' ? false : undefined 
              }))}
            >
              <option value="">全部规则</option>
              <option value="true">默认规则</option>
              <option value="false">非默认规则</option>
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

      {/* 排课规则列表 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            排课规则列表
          </CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={schedulingRules}
            loading={loading}
            pagination={pagination}
            onPaginationChange={setPagination}
          />
        </CardContent>
      </Card>
    </div>
  );
}