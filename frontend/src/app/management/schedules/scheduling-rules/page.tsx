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
  WEEKDAY_OPTIONS,
  DEFAULT_CORE_SUBJECT_STRATEGY,
  getRecommendedCoreSubjects,
  CORE_SUBJECT_DISTRIBUTION_MODES
} from '@/lib/api';
import { formatDateTime, cn } from '@/lib/utils';

/**
 * 生成学年选项列表
 * 
 * Returns:
 *   Array<{value: string, label: string}>: 学年选项
 */
const generateAcademicYearOptions = () => {
  const currentYear = new Date().getFullYear();
  const options = [];
  
  // 生成前2年到后5年的学年选项
  for (let i = -2; i <= 5; i++) {
    const startYear = currentYear + i;
    const endYear = startYear + 1;
    const value = `${startYear}-${endYear}`;
    options.push({
      value,
      label: `${startYear}-${endYear}学年`
    });
  }
  
  return options;
};

const ACADEMIC_YEAR_OPTIONS = generateAcademicYearOptions();

/**
 * 排课规则管理页面组件
 * 
 * Returns:
 *   React.ReactElement: 排课规则管理页面
 */
export default function SchedulingRulesPage() {
  // 安全的访问函数，用于避免 coreSubjectStrategy 字段缺失导致的错误
  const getSafeCoreSubjectStrategy = () => {
    return formData.courseArrangementRules?.coreSubjectStrategy && 
      typeof formData.courseArrangementRules.coreSubjectStrategy === 'object' &&
      'enableCoreSubjectStrategy' in formData.courseArrangementRules.coreSubjectStrategy
      ? formData.courseArrangementRules.coreSubjectStrategy
      : DEFAULT_CORE_SUBJECT_STRATEGY;
  };

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
    isActive: true, // 默认只显示活跃的规则
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
  
  // 操作状态
  const [isCreating, setIsCreating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [operationError, setOperationError] = useState<string>('');

  // 表单数据
  const [formData, setFormData] = useState<CreateSchedulingRulesRequest>({
    name: '',
    description: '',
    schoolType: 'mixed',
    academicYear: '',
    semester: 1,
    timeRules: {
      dailyPeriods: 8,
      workingDays: [1, 2, 3, 4, 5],
      periodDuration: 45,
      breakDuration: 10,
      lunchBreakStart: 5,
      lunchBreakDuration: 60,
      morningPeriods: [1, 2, 3, 4],
      afternoonPeriods: [5, 6, 7, 8],

    },
    teacherConstraints: {
      maxDailyHours: 6,
      maxContinuousHours: 3,
      minRestBetweenCourses: 10,
      avoidFridayAfternoon: true,
      respectTeacherPreferences: true,
      allowCrossGradeTeaching: false,
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
      coreSubjectStrategy: DEFAULT_CORE_SUBJECT_STRATEGY,
      fixedTimeCourses: {
        enabled: false,
        courses: [],
        priority: false,
        allowOverride: false,
        conflictStrategy: 'strict'
      },
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
      
      console.log('获取排课规则列表，参数:', params);
      
      const response = await schedulingRulesApi.getList(params);
      console.log('获取排课规则列表响应:', response);
      
      if (response.success && response.data) {
        console.log('设置排课规则数据:', response.data.items);
        setSchedulingRules(response.data.items);
        setPagination(prev => ({
          ...prev,
          total: response.data!.total,
        }));
      } else {
        console.warn('获取排课规则列表失败:', response);
        setSchedulingRules([]);
      }
    } catch (error) {
      console.error('获取排课规则失败:', error);
      setSchedulingRules([]);
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
      isActive: true, // 默认只显示活跃的规则
    });
    setPagination(prev => ({ ...prev, current: 1 }));
    // 重置后立即刷新数据
    setTimeout(() => {
      fetchSchedulingRules();
    }, 100);
  };

  /**
   * 打开创建对话框
   */
  const openCreateDialog = () => {
    setFormData({
      name: '',
      description: '',
      schoolType: 'mixed',
      academicYear: '',
      semester: 1,
      timeRules: {
        dailyPeriods: 8,
        workingDays: [1, 2, 3, 4, 5],
        periodDuration: 45,
        breakDuration: 10,
        lunchBreakStart: 5,
        lunchBreakDuration: 60,
        morningPeriods: [1, 2, 3, 4],
        afternoonPeriods: [5, 6, 7, 8],
      },
      teacherConstraints: {
        maxDailyHours: 6,
        maxContinuousHours: 3,
        minRestBetweenCourses: 10,
        avoidFridayAfternoon: true,
        respectTeacherPreferences: true,
        allowCrossGradeTeaching: false,
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
        coreSubjectStrategy: DEFAULT_CORE_SUBJECT_STRATEGY,
        fixedTimeCourses: {
          enabled: false,
          courses: [],
          priority: false,
          allowOverride: false,
          conflictStrategy: 'strict'
        },
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
    
    // 确保 coreSubjectStrategy 字段存在并且有正确的结构
    const safeCoreSubjectStrategy = rules.courseArrangementRules?.coreSubjectStrategy && 
      typeof rules.courseArrangementRules.coreSubjectStrategy === 'object' &&
      'enableCoreSubjectStrategy' in rules.courseArrangementRules.coreSubjectStrategy
      ? rules.courseArrangementRules.coreSubjectStrategy
      : DEFAULT_CORE_SUBJECT_STRATEGY;
    
    setFormData({
      name: rules.name,
      description: rules.description,
      schoolType: rules.schoolType,
      academicYear: rules.academicYear,
      semester: rules.semester,
      timeRules: {
        ...rules.timeRules,
        morningPeriods: rules.timeRules.morningPeriods || [1, 2, 3, 4],
        afternoonPeriods: rules.timeRules.afternoonPeriods || [5, 6, 7, 8],
      },
      teacherConstraints: rules.teacherConstraints,
      roomConstraints: rules.roomConstraints,
      courseArrangementRules: {
        ...rules.courseArrangementRules,
        coreSubjectStrategy: safeCoreSubjectStrategy,
        fixedTimeCourses: rules.courseArrangementRules?.fixedTimeCourses || {
          enabled: false,
          courses: [],
          priority: false,
          allowOverride: false,
          conflictStrategy: 'strict'
        }
      },
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
      targetAcademicYear: '',
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
    setOperationError('');
    setIsCreating(false);
    setIsUpdating(false);
  };

  /**
   * 创建排课规则
   */
  const handleCreate = async () => {
    if (!formData.name.trim()) {
      setOperationError('请输入规则名称');
      return;
    }
    
    if (!formData.academicYear.trim()) {
      setOperationError('请输入学年');
      return;
    }

    setIsCreating(true);
    setOperationError('');
    
    try {
      console.log('开始创建排课规则:', formData);
      const response = await schedulingRulesApi.create(formData);
      
      console.log('API响应:', response);
      
      if (response.success) {
        console.log('创建成功，关闭对话框并刷新列表');
        
        // 重置分页到第一页，确保能看到新创建的数据
        setPagination(prev => ({ ...prev, current: 1 }));
        
        // 清空搜索条件，确保新数据不被过滤
        setSearchParams({
          keyword: '',
          academicYear: '',
          semester: undefined,
          schoolType: '',
          isDefault: undefined,
          isActive: true, // 保持只显示活跃规则
        });
        
        closeDialogs();
        
        // 延迟刷新，确保状态更新完成
        setTimeout(async () => {
          await fetchSchedulingRules();
          alert('排课规则创建成功！新规则已显示在列表中。');
        }, 100);
      } else {
        setOperationError(response.message || '创建失败，请重试');
      }
    } catch (error: any) {
      console.error('创建排课规则失败:', error);
      const errorMessage = error.response?.data?.message || 
                          error.message || 
                          '网络错误，请检查后端服务是否正常运行';
      setOperationError(errorMessage);
    } finally {
      setIsCreating(false);
    }
  };

  /**
   * 更新排课规则
   */
  const handleUpdate = async () => {
    if (!selectedRules) return;
    
    if (!formData.name.trim()) {
      setOperationError('请输入规则名称');
      return;
    }
    
    if (!formData.academicYear.trim()) {
      setOperationError('请输入学年');
      return;
    }

    setIsUpdating(true);
    setOperationError('');
    
    try {
      console.log('开始更新排课规则:', formData);
      const response = await schedulingRulesApi.update(selectedRules._id, formData);
      if (response.success) {
        closeDialogs();
        await fetchSchedulingRules();
        alert('排课规则更新成功！');
      } else {
        setOperationError(response.message || '更新失败，请重试');
      }
    } catch (error: any) {
      console.error('更新排课规则失败:', error);
      const errorMessage = error.response?.data?.message || 
                          error.message || 
                          '网络错误，请检查后端服务是否正常运行';
      setOperationError(errorMessage);
    } finally {
      setIsUpdating(false);
    }
  };

  /**
   * 删除排课规则
   */
  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除这个排课规则吗？\n注意：删除后规则将被停用，但不会从数据库中彻底删除。')) return;
    
    try {
      console.log('开始删除排课规则:', id);
      const response = await schedulingRulesApi.delete(id);
      
      console.log('删除API响应:', response);
      
      if (response.success) {
        console.log('删除成功，刷新列表');
        await fetchSchedulingRules();
        alert('排课规则已成功删除（停用）');
      } else {
        alert(`删除失败: ${response.message || '未知错误'}`);
      }
    } catch (error: any) {
      console.error('删除排课规则失败:', error);
      const errorMessage = error.response?.data?.message || 
                          error.message || 
                          '网络错误，请检查后端服务是否正常运行';
      alert(`删除失败: ${errorMessage}`);
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
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
            <Input
              placeholder="搜索规则名称..."
              value={searchParams.keyword || ''}
              onChange={(e) => setSearchParams(prev => ({ 
                ...prev, 
                keyword: e.target.value 
              }))}
            />
            <Select
              value={searchParams.academicYear || ''}
              onValueChange={(value) => setSearchParams(prev => ({ 
                ...prev, 
                academicYear: value 
              }))}
            >
              <option value="">全部学年</option>
              {ACADEMIC_YEAR_OPTIONS.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
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
            <Select
              value={searchParams.isActive?.toString() || ''}
              onValueChange={(value) => setSearchParams(prev => ({ 
                ...prev, 
                isActive: value === 'true' ? true : value === 'false' ? false : undefined 
              }))}
            >
              <option value="">全部状态</option>
              <option value="true">活跃规则</option>
              <option value="false">已删除规则</option>
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
            dataSource={schedulingRules}
            loading={loading}
            pagination={pagination}
            onPageChange={(page, pageSize) => setPagination(prev => ({ ...prev, current: page, pageSize }))}
          />
        </CardContent>
      </Card>

      {/* 新建排课规则对话框 */}
      <Dialog open={dialogState.create} onOpenChange={(open) => 
        setDialogState(prev => ({ ...prev, create: open }))
      }>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>新建排课规则</DialogTitle>
          </DialogHeader>
          
          <Tabs defaultValue="basic" className="space-y-4">
            <TabsList className="grid w-full grid-cols-6">
              <TabsTrigger value="basic">基本信息</TabsTrigger>
              <TabsTrigger value="time">时间规则</TabsTrigger>
              <TabsTrigger value="teacher">教师约束</TabsTrigger>
              <TabsTrigger value="room">教室约束</TabsTrigger>
              <TabsTrigger value="course">课程规则</TabsTrigger>
              <TabsTrigger value="conflict">冲突解决</TabsTrigger>
            </TabsList>

            {/* 基本信息 */}
            <TabsContent value="basic" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="h-5 w-5" />
                    基本信息
                  </CardTitle>
                  <CardDescription>
                    配置排课规则的基本信息和适用范围
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <Label htmlFor="name">规则名称 *</Label>
                      <Input
                        id="name"
                        placeholder="如：高中部2024-2025学年排课规则"
                        value={formData.name}
                        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="schoolType">学校类型 *</Label>
                      <Select
                        value={formData.schoolType}
                        onValueChange={(value) => setFormData(prev => ({ ...prev, schoolType: value as any }))}
                      >
                        {SCHOOL_TYPES.map(type => (
                          <option key={type.value} value={type.value}>
                            {type.label}
                          </option>
                        ))}
                      </Select>
                    </div>
                    
                    <div>
                      <Label htmlFor="academicYear">学年 *</Label>
                      <Select
                        value={formData.academicYear}
                        onValueChange={(value) => setFormData(prev => ({ ...prev, academicYear: value }))}
                      >
                        {ACADEMIC_YEAR_OPTIONS.map(option => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </Select>
                    </div>
                    
                    <div>
                      <Label htmlFor="semester">学期 *</Label>
                      <Select
                        value={formData.semester.toString()}
                        onValueChange={(value) => setFormData(prev => ({ ...prev, semester: parseInt(value) }))}
                      >
                        <option value="1">第一学期</option>
                        <option value="2">第二学期</option>
                      </Select>
                    </div>
                  </div>
                  
                  <div className="mt-4">
                    <Label htmlFor="description">规则描述</Label>
                    <Textarea
                      id="description"
                      placeholder="描述这个排课规则的特点和适用场景"
                      rows={3}
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    />
                  </div>
                  
                  <div className="mt-4 flex items-center space-x-2">
                    <Switch
                      id="isDefault"
                      checked={formData.isDefault}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isDefault: checked }))}
                    />
                    <Label htmlFor="isDefault">设为默认规则</Label>
                    <p className="text-xs text-gray-500">
                      (默认规则将自动应用于新的排课任务)
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* 时间规则 */}
            <TabsContent value="time" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    时间安排规则
                  </CardTitle>
                  <CardDescription>
                    配置每日课时安排、休息时间和禁用时段
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-3">
                    <div>
                      <Label htmlFor="dailyPeriods">每日课时数 *</Label>
                      <Input
                        id="dailyPeriods"
                        type="number"
                        min="6"
                        max="12"
                        value={formData.timeRules.dailyPeriods}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          timeRules: { ...prev.timeRules, dailyPeriods: parseInt(e.target.value) || 8 }
                        }))}
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="periodDuration">课时时长(分钟) *</Label>
                      <Input
                        id="periodDuration"
                        type="number"
                        min="40"
                        max="60"
                        value={formData.timeRules.periodDuration}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          timeRules: { ...prev.timeRules, periodDuration: parseInt(e.target.value) || 45 }
                        }))}
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="breakDuration">课间休息(分钟) *</Label>
                      <Input
                        id="breakDuration"
                        type="number"
                        min="5"
                        max="20"
                        value={formData.timeRules.breakDuration}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          timeRules: { ...prev.timeRules, breakDuration: parseInt(e.target.value) || 10 }
                        }))}
                      />
                    </div>
                  </div>
                  
                  <Separator className="my-4" />
                  
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <Label htmlFor="lunchBreakStart">午休开始课时 *</Label>
                      <Input
                        id="lunchBreakStart"
                        type="number"
                        min="3"
                        max="6"
                        value={formData.timeRules.lunchBreakStart}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          timeRules: { ...prev.timeRules, lunchBreakStart: parseInt(e.target.value) || 4 }
                        }))}
                      />
                      <p className="text-xs text-gray-500 mt-1">午休从第几课时后开始</p>
                    </div>
                    
                    <div>
                      <Label htmlFor="lunchBreakDuration">午休时长(分钟) *</Label>
                      <Input
                        id="lunchBreakDuration"
                        type="number"
                        min="60"
                        max="120"
                        value={formData.timeRules.lunchBreakDuration}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          timeRules: { ...prev.timeRules, lunchBreakDuration: parseInt(e.target.value) || 90 }
                        }))}
                      />
                    </div>
                  </div>
                  
                  <div className="mt-4">
                    <Label>工作日设置</Label>
                    <div className="flex gap-2 mt-2">
                      {WEEKDAY_OPTIONS.map(day => (
                        <label key={day.value} className="flex items-center space-x-1">
                          <input
                            type="checkbox"
                            checked={formData.timeRules.workingDays.includes(day.value)}
                            onChange={(e) => {
                              const newWorkingDays = e.target.checked
                                ? [...formData.timeRules.workingDays, day.value]
                                : formData.timeRules.workingDays.filter(d => d !== day.value);
                              setFormData(prev => ({
                                ...prev,
                                timeRules: { ...prev.timeRules, workingDays: newWorkingDays }
                              }));
                            }}
                          />
                          <span className="text-sm">{day.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <Separator className="my-4" />
                {/* 上下午节次设置 */}
                <Separator className="my-4" />

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label>上午节次设置</Label>
                    <div className="mt-2 space-y-2">
                      <div className="flex flex-wrap gap-1">
                        {[1, 2, 3, 4, 5, 6, 7, 8].map(period => (
                          <button
                            key={period}
                            type="button"
                            onClick={() => {
                              const current = formData.timeRules.morningPeriods;
                              const newPeriods = current.includes(period)
                                ? current.filter(p => p !== period)
                                : [...current, period];
                              setFormData(prev => ({
                                ...prev,
                                timeRules: { ...prev.timeRules, morningPeriods: newPeriods }
                              }));
                            }}
                            className={cn(
                              'px-2 py-1 text-xs rounded border',
                              formData.timeRules.morningPeriods.includes(period)
                                ? 'bg-blue-500 text-white border-blue-500'
                                : 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200'
                            )}
                          >
                            第{period}节
                          </button>
                        ))}
                      </div>
                      <p className="text-xs text-gray-500">点击选择上午的节次</p>
                    </div>
                  </div>

                  <div>
                    <Label>下午节次设置</Label>
                    <div className="mt-2 space-y-2">
                      <div className="flex flex-wrap gap-1">
                        {[1, 2, 3, 4, 5, 6, 7, 8].map(period => (
                          <button
                            key={period}
                            type="button"
                            onClick={() => {
                              const current = formData.timeRules.afternoonPeriods;
                              const newPeriods = current.includes(period)
                                ? current.filter(p => p !== period)
                                : [...current, period];
                              setFormData(prev => ({
                                ...prev,
                                timeRules: { ...prev.timeRules, afternoonPeriods: newPeriods }
                              }));
                            }}
                            className={cn(
                              'px-2 py-1 text-xs rounded border',
                              formData.timeRules.afternoonPeriods.includes(period)
                                ? 'bg-blue-500 text-white border-blue-500'
                                : 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200'
                            )}
                          >
                            第{period}节
                          </button>
                        ))}
                      </div>
                      <p className="text-xs text-gray-500">点击选择下午的节次</p>
                    </div>
                  </div>
                </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* 教师约束 */}
            <TabsContent value="teacher" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    教师工作约束
                  </CardTitle>
                  <CardDescription>
                    配置教师的工作时间限制和偏好规则
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-3">
                    <div>
                      <Label htmlFor="maxDailyHours">每日最大课时 *</Label>
                      <Input
                        id="maxDailyHours"
                        type="number"
                        min="4"
                        max="8"
                        value={formData.teacherConstraints.maxDailyHours}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          teacherConstraints: { ...prev.teacherConstraints, maxDailyHours: parseInt(e.target.value) || 6 }
                        }))}
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="maxContinuousHours">最大连续课时 *</Label>
                      <Input
                        id="maxContinuousHours"
                        type="number"
                        min="2"
                        max="4"
                        value={formData.teacherConstraints.maxContinuousHours}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          teacherConstraints: { ...prev.teacherConstraints, maxContinuousHours: parseInt(e.target.value) || 3 }
                        }))}
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="minRestBetweenCourses">课间最小休息 *</Label>
                      <Input
                        id="minRestBetweenCourses"
                        type="number"
                        min="0"
                        max="3"
                        value={formData.teacherConstraints.minRestBetweenCourses}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          teacherConstraints: { ...prev.teacherConstraints, minRestBetweenCourses: parseInt(e.target.value) || 1 }
                        }))}
                      />
                      <p className="text-xs text-gray-500 mt-1">连续课程间的最小间隔课时</p>
                    </div>
                  </div>
                  
                  <Separator className="my-4" />
                  
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="avoidFridayAfternoon"
                        checked={formData.teacherConstraints.avoidFridayAfternoon}
                        onCheckedChange={(checked) => setFormData(prev => ({
                          ...prev,
                          teacherConstraints: { ...prev.teacherConstraints, avoidFridayAfternoon: checked }
                        }))}
                      />
                      <Label htmlFor="avoidFridayAfternoon">避免周五下午排课</Label>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="respectTeacherPreferences"
                        checked={formData.teacherConstraints.respectTeacherPreferences}
                        onCheckedChange={(checked) => setFormData(prev => ({
                          ...prev,
                          teacherConstraints: { ...prev.teacherConstraints, respectTeacherPreferences: checked }
                        }))}
                      />
                      <Label htmlFor="respectTeacherPreferences">尊重教师时间偏好</Label>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="allowCrossGradeTeaching"
                        checked={formData.teacherConstraints.allowCrossGradeTeaching}
                        onCheckedChange={(checked) => setFormData(prev => ({
                          ...prev,
                          teacherConstraints: { ...prev.teacherConstraints, allowCrossGradeTeaching: checked }
                        }))}
                      />
                      <Label htmlFor="allowCrossGradeTeaching">允许跨年级授课</Label>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* 教室约束 */}
            <TabsContent value="room" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building className="h-5 w-5" />
                    教室使用约束
                  </CardTitle>
                  <CardDescription>
                    配置教室容量、共享和特殊教室的使用规则
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="respectCapacityLimits"
                        checked={formData.roomConstraints.respectCapacityLimits}
                        onCheckedChange={(checked) => setFormData(prev => ({
                          ...prev,
                          roomConstraints: { ...prev.roomConstraints, respectCapacityLimits: checked }
                        }))}
                      />
                      <Label htmlFor="respectCapacityLimits">严格遵守教室容量限制</Label>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="allowRoomSharing"
                        checked={formData.roomConstraints.allowRoomSharing}
                        onCheckedChange={(checked) => setFormData(prev => ({
                          ...prev,
                          roomConstraints: { ...prev.roomConstraints, allowRoomSharing: checked }
                        }))}
                      />
                      <Label htmlFor="allowRoomSharing">允许教室共享使用</Label>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="preferFixedClassrooms"
                        checked={formData.roomConstraints.preferFixedClassrooms}
                        onCheckedChange={(checked) => setFormData(prev => ({
                          ...prev,
                          roomConstraints: { ...prev.roomConstraints, preferFixedClassrooms: checked }
                        }))}
                      />
                      <Label htmlFor="preferFixedClassrooms">优先使用固定教室</Label>
                    </div>
                    
                    <div>
                      <Label htmlFor="specialRoomPriority">特殊教室优先级</Label>
                      <Select
                        value={formData.roomConstraints.specialRoomPriority}
                        onValueChange={(value) => setFormData(prev => ({
                          ...prev,
                          roomConstraints: { ...prev.roomConstraints, specialRoomPriority: value as any }
                        }))}
                      >
                        {ROOM_PRIORITY_OPTIONS.map(option => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </Select>
                      <p className="text-xs text-gray-500 mt-1">
                        实验室、机房等特殊教室的使用优先级
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* 课程安排规则 */}
            <TabsContent value="course" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BookOpen className="h-5 w-5" />
                    课程安排规则
                  </CardTitle>
                  <CardDescription>
                    配置课程分布策略和时间偏好
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <Label htmlFor="distributionPolicy">课程分布策略 *</Label>
                      <Select
                        value={formData.courseArrangementRules.distributionPolicy}
                        onValueChange={(value) => setFormData(prev => ({
                          ...prev,
                          courseArrangementRules: { ...prev.courseArrangementRules, distributionPolicy: value as any }
                        }))}
                      >
                        {DISTRIBUTION_POLICIES.map(policy => (
                          <option key={policy.value} value={policy.value}>
                            {policy.label}
                          </option>
                        ))}
                      </Select>
                    </div>
                    
                    <div>
                      <Label htmlFor="labCoursePreference">实验课时间偏好</Label>
                      <Select
                        value={formData.courseArrangementRules.labCoursePreference}
                        onValueChange={(value) => setFormData(prev => ({
                          ...prev,
                          courseArrangementRules: { ...prev.courseArrangementRules, labCoursePreference: value as any }
                        }))}
                      >
                        {TIME_PREFERENCES.map(pref => (
                          <option key={pref.value} value={pref.value}>
                            {pref.label}
                          </option>
                        ))}
                      </Select>
                    </div>
                  </div>
                  
                  <Separator className="my-4" />
                  
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="allowContinuousCourses"
                        checked={formData.courseArrangementRules.allowContinuousCourses}
                        onCheckedChange={(checked) => setFormData(prev => ({
                          ...prev,
                          courseArrangementRules: { ...prev.courseArrangementRules, allowContinuousCourses: checked }
                        }))}
                      />
                      <Label htmlFor="allowContinuousCourses">允许连续课程安排</Label>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="coreSubjectPriority"
                        checked={formData.courseArrangementRules.coreSubjectPriority}
                        onCheckedChange={(checked) => setFormData(prev => ({
                          ...prev,
                          courseArrangementRules: { ...prev.courseArrangementRules, coreSubjectPriority: checked }
                        }))}
                      />
                      <Label htmlFor="coreSubjectPriority">核心课程优先安排</Label>
                    </div>
                    
                    {formData.courseArrangementRules.allowContinuousCourses && (
                      <div>
                        <Label htmlFor="maxContinuousHours">最大连续课时</Label>
                        <Input
                          id="maxContinuousHours"
                          type="number"
                          min="2"
                          max="4"
                          value={formData.courseArrangementRules.maxContinuousHours}
                          onChange={(e) => setFormData(prev => ({
                            ...prev,
                            courseArrangementRules: { ...prev.courseArrangementRules, maxContinuousHours: parseInt(e.target.value) || 2 }
                          }))}
                          className="w-24"
                        />
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* 核心课程策略配置 */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BookOpen className="h-5 w-5" />
                    核心课程策略
                  </CardTitle>
                  <CardDescription>
                    配置核心课程的分布策略，确保核心课程均匀分布在一周内
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {/* 启用开关 */}
                  <div className="flex items-center space-x-2 mb-4">
                    <Switch
                      id="enableCoreSubjectStrategy"
                      checked={getSafeCoreSubjectStrategy().enableCoreSubjectStrategy}
                      onCheckedChange={(checked) => setFormData(prev => ({
                        ...prev,
                        courseArrangementRules: {
                          ...prev.courseArrangementRules,
                          coreSubjectStrategy: {
                            ...getSafeCoreSubjectStrategy(),
                            enableCoreSubjectStrategy: checked
                          }
                        }
                      }))}
                    />
                    <Label htmlFor="enableCoreSubjectStrategy" className="text-base font-medium">
                      启用核心课程策略
                    </Label>
                  </div>

                  {getSafeCoreSubjectStrategy().enableCoreSubjectStrategy && (
                    <div className="space-y-6">
                      {/* 核心课程列表 */}
                      <div>
                        <Label htmlFor="coreSubjects">核心课程列表 *</Label>
                        <div className="mt-2 space-y-2">
                          <div className="flex flex-wrap gap-2">
                            {getSafeCoreSubjectStrategy().coreSubjects.map((subject, index) => (
                              <div key={index} className="flex items-center gap-2 bg-blue-50 px-3 py-1 rounded-full">
                                <span className="text-sm">{subject}</span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const newSubjects = getSafeCoreSubjectStrategy().coreSubjects.filter((_, i) => i !== index);
                                    setFormData(prev => ({
                                      ...prev,
                                      courseArrangementRules: {
                                        ...prev.courseArrangementRules,
                                        coreSubjectStrategy: {
                                          ...prev.courseArrangementRules.coreSubjectStrategy,
                                          coreSubjects: newSubjects
                                        }
                                      }
                                    }));
                                  }}
                                  className="text-red-500 hover:text-red-700"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </div>
                            ))}
                          </div>
                          <div className="flex gap-2">
                            <Select
                              value=""
                              onValueChange={(value) => {
                                if (value && !getSafeCoreSubjectStrategy().coreSubjects.includes(value)) {
                                  setFormData(prev => ({
                                    ...prev,
                                    courseArrangementRules: {
                                      ...prev.courseArrangementRules,
                                      coreSubjectStrategy: {
                                        ...prev.courseArrangementRules.coreSubjectStrategy,
                                        coreSubjects: [...getSafeCoreSubjectStrategy().coreSubjects, value]
                                      }
                                    }
                                  }));
                                }
                              }}
                            >
                              <option value="">选择课程...</option>
                              {['语文', '数学', '英语', '物理', '化学', '生物', '历史', '地理', '政治', '科学', '道德与法治'].map(subject => (
                                <option key={subject} value={subject}>
                                  {subject}
                                </option>
                              ))}
                            </Select>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                const recommendedSubjects = getRecommendedCoreSubjects(formData.schoolType);
                                setFormData(prev => ({
                                  ...prev,
                                  courseArrangementRules: {
                                    ...prev.courseArrangementRules,
                                    coreSubjectStrategy: {
                                      ...prev.courseArrangementRules.coreSubjectStrategy,
                                      coreSubjects: recommendedSubjects
                                    }
                                  }
                                }));
                              }}
                            >
                              推荐配置
                            </Button>
                          </div>
                        </div>
                      </div>

                      {/* 分布模式和时间设置 */}
                      <div className="grid gap-4 md:grid-cols-2">
                        <div>
                          <Label htmlFor="distributionMode">分布模式 *</Label>
                          <Select
                            value={getSafeCoreSubjectStrategy().distributionMode}
                            onValueChange={(value) => setFormData(prev => ({
                              ...prev,
                              courseArrangementRules: {
                                ...prev.courseArrangementRules,
                                coreSubjectStrategy: {
                                  ...prev.courseArrangementRules.coreSubjectStrategy,
                                  distributionMode: value as any
                                }
                              }
                            }))}
                          >
                            {CORE_SUBJECT_DISTRIBUTION_MODES.map(mode => (
                              <option key={mode.value} value={mode.value}>
                                {mode.label}
                              </option>
                            ))}
                          </Select>
                          <p className="text-xs text-gray-500 mt-1">
                            {getSafeCoreSubjectStrategy().distributionMode === 'daily' && '每日分布：核心课程每天都有安排'}
                            {getSafeCoreSubjectStrategy().distributionMode === 'balanced' && '平衡分布：核心课程在一周内均匀分布'}
                            {getSafeCoreSubjectStrategy().distributionMode === 'concentrated' && '集中分布：核心课程集中在特定几天'}
                          </p>
                        </div>

                        <div>
                          <Label htmlFor="maxDailyOccurrences">每日最大出现次数 *</Label>
                          <Input
                            id="maxDailyOccurrences"
                            type="number"
                            min="1"
                            max="4"
                            value={getSafeCoreSubjectStrategy().maxDailyOccurrences}
                            onChange={(e) => setFormData(prev => ({
                              ...prev,
                              courseArrangementRules: {
                                ...prev.courseArrangementRules,
                                coreSubjectStrategy: {
                                  ...prev.courseArrangementRules.coreSubjectStrategy,
                                  maxDailyOccurrences: parseInt(e.target.value) || 2
                                }
                              }
                            }))}
                          />
                          <p className="text-xs text-gray-500 mt-1">建议：1-2次，避免某一天课程过重</p>
                        </div>
                      </div>

                      {/* 每周要求和连续天控制 */}
                      <div className="grid gap-4 md:grid-cols-2">
                        <div>
                          <Label htmlFor="minDaysPerWeek">每周最少出现天数 *</Label>
                          <Input
                            id="minDaysPerWeek"
                            type="number"
                            min="3"
                            max="7"
                            value={getSafeCoreSubjectStrategy().minDaysPerWeek}
                            onChange={(e) => setFormData(prev => ({
                              ...prev,
                              courseArrangementRules: {
                                ...prev.courseArrangementRules,
                                coreSubjectStrategy: {
                                  ...prev.courseArrangementRules.coreSubjectStrategy,
                                  minDaysPerWeek: parseInt(e.target.value) || 5
                                }
                              }
                            }))}
                          />
                          <p className="text-xs text-gray-500 mt-1">建议：4-5天，确保核心课程覆盖足够的天数</p>
                        </div>

                        <div>
                          <Label htmlFor="maxConcentration">最大集中度</Label>
                          <Input
                            id="maxConcentration"
                            type="number"
                            min="1"
                            max="5"
                            value={getSafeCoreSubjectStrategy().maxConcentration}
                            onChange={(e) => setFormData(prev => ({
                              ...prev,
                              courseArrangementRules: {
                                ...prev.courseArrangementRules,
                                coreSubjectStrategy: {
                                  ...prev.courseArrangementRules.coreSubjectStrategy,
                                  maxConcentration: parseInt(e.target.value) || 3
                                }
                              }
                            }))}
                          />
                          <p className="text-xs text-gray-500 mt-1">连续天数限制，避免核心课程过于集中</p>
                        </div>
                      </div>

                      {/* 时间段偏好设置 */}
                      <div>
                        <Label>时间段偏好设置</Label>
                        <div className="mt-2 grid gap-4 md:grid-cols-2">
                          <div>
                            <Label htmlFor="preferredTimeSlots" className="text-sm">偏好时间段</Label>
                            <div className="mt-1 flex flex-wrap gap-1">
                              {[1, 2, 3, 4, 5, 6, 7, 8].map(period => (
                                <button
                                  key={period}
                                  type="button"
                                  onClick={() => {
                                    const current = getSafeCoreSubjectStrategy().preferredTimeSlots;
                                    const newPeriods = current.includes(period)
                                      ? current.filter(p => p !== period)
                                      : [...current, period];
                                    setFormData(prev => ({
                                      ...prev,
                                      courseArrangementRules: {
                                        ...prev.courseArrangementRules,
                                        coreSubjectStrategy: {
                                          ...prev.courseArrangementRules.coreSubjectStrategy,
                                          preferredTimeSlots: newPeriods
                                        }
                                      }
                                    }));
                                  }}
                                  className={cn(
                                    'px-2 py-1 text-xs rounded border',
                                    getSafeCoreSubjectStrategy().preferredTimeSlots.includes(period)
                                      ? 'bg-blue-500 text-white border-blue-500'
                                      : 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200'
                                  )}
                                >
                                  第{period}节
                                </button>
                              ))}
                            </div>
                            <p className="text-xs text-gray-500 mt-1">选择核心课程偏好的时间段</p>
                          </div>

                          <div>
                            <Label htmlFor="avoidTimeSlots" className="text-sm">避免时间段</Label>
                            <div className="mt-1 flex flex-wrap gap-1">
                              {[1, 2, 3, 4, 5, 6, 7, 8].map(period => (
                                <button
                                  key={period}
                                  type="button"
                                  onClick={() => {
                                    const current = getSafeCoreSubjectStrategy().avoidTimeSlots;
                                    const newPeriods = current.includes(period)
                                      ? current.filter(p => p !== period)
                                      : [...current, period];
                                    setFormData(prev => ({
                                      ...prev,
                                      courseArrangementRules: {
                                        ...prev.courseArrangementRules,
                                        coreSubjectStrategy: {
                                          ...prev.courseArrangementRules.coreSubjectStrategy,
                                          avoidTimeSlots: newPeriods
                                        }
                                      }
                                    }));
                                  }}
                                  className={cn(
                                    'px-2 py-1 text-xs rounded border',
                                    getSafeCoreSubjectStrategy().avoidTimeSlots.includes(period)
                                      ? 'bg-red-500 text-white border-red-500'
                                      : 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200'
                                  )}
                                >
                                  第{period}节
                                </button>
                              ))}
                            </div>
                            <p className="text-xs text-gray-500 mt-1">选择核心课程要避免的时间段</p>
                          </div>
                        </div>
                      </div>

                      {/* 高级选项 */}
                      <div className="space-y-4">
                        <Separator />
                        <h4 className="font-medium text-gray-900">高级选项</h4>
                        
                        <div className="grid gap-4 md:grid-cols-2">
                          <div className="flex items-center space-x-2">
                            <Switch
                              id="avoidConsecutiveDays"
                              checked={getSafeCoreSubjectStrategy().avoidConsecutiveDays}
                              onCheckedChange={(checked) => setFormData(prev => ({
                                ...prev,
                                courseArrangementRules: {
                                  ...prev.courseArrangementRules,
                                  coreSubjectStrategy: {
                                    ...prev.courseArrangementRules.coreSubjectStrategy,
                                    avoidConsecutiveDays: checked
                                  }
                                }
                              }))}
                            />
                            <Label htmlFor="avoidConsecutiveDays">避免连续天安排</Label>
                          </div>

                          <div className="flex items-center space-x-2">
                            <Switch
                              id="enforceEvenDistribution"
                              checked={getSafeCoreSubjectStrategy().enforceEvenDistribution}
                              onCheckedChange={(checked) => setFormData(prev => ({
                                ...prev,
                                courseArrangementRules: {
                                  ...prev.courseArrangementRules,
                                  coreSubjectStrategy: {
                                    ...prev.courseArrangementRules.coreSubjectStrategy,
                                    enforceEvenDistribution: checked
                                  }
                                }
                              }))}
                            />
                            <Label htmlFor="enforceEvenDistribution">强制均匀分布</Label>
                          </div>
                        </div>

                        <div>
                          <Label htmlFor="balanceWeight">平衡权重</Label>
                          <div className="mt-1 flex items-center gap-2">
                            <Input
                              id="balanceWeight"
                              type="range"
                              min="0"
                              max="100"
                              value={getSafeCoreSubjectStrategy().balanceWeight}
                              onChange={(e) => setFormData(prev => ({
                                ...prev,
                                courseArrangementRules: {
                                  ...prev.courseArrangementRules,
                                  coreSubjectStrategy: {
                                    ...prev.courseArrangementRules.coreSubjectStrategy,
                                    balanceWeight: parseInt(e.target.value) || 80
                                  }
                                }
                              }))}
                              className="flex-1"
                            />
                            <span className="text-sm font-medium w-12 text-right">
                              {getSafeCoreSubjectStrategy().balanceWeight}%
                            </span>
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            调整核心课程分布策略在排课算法中的重要性权重
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* 固定时间课程配置 */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    固定时间课程配置
                  </CardTitle>
                  <CardDescription>
                    配置班会、升旗仪式等每周固定时间进行的课程安排
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {/* 启用开关 */}
                  <div className="flex items-center space-x-2 mb-4">
                    <Switch
                      id="enableFixedTimeCourses"
                      checked={formData.courseArrangementRules.fixedTimeCourses?.enabled || false}
                      onCheckedChange={(checked) => setFormData(prev => ({
                        ...prev,
                        courseArrangementRules: {
                          ...prev.courseArrangementRules,
                          fixedTimeCourses: {
                            ...prev.courseArrangementRules.fixedTimeCourses,
                            enabled: checked
                          }
                        }
                      }))}
                    />
                    <Label htmlFor="enableFixedTimeCourses" className="text-base font-medium">
                      启用固定时间课程
                    </Label>
                  </div>

                  {formData.courseArrangementRules.fixedTimeCourses?.enabled && (
                    <div className="space-y-6">
                      {/* 固定时间课程列表 */}
                      <div>
                        <Label>固定时间课程列表</Label>
                        <div className="mt-2 space-y-3">
                          {(formData.courseArrangementRules.fixedTimeCourses?.courses || []).map((course, index) => (
                            <div key={index} className="border rounded-lg p-4 bg-gray-50">
                              <div className="grid gap-4 md:grid-cols-4">
                                <div>
                                  <Label className="text-sm">课程类型</Label>
                                  <Select
                                    value={course.type}
                                    onValueChange={(value) => {
                                      const newCourses = [...(formData.courseArrangementRules.fixedTimeCourses?.courses || [])];
                                      newCourses[index] = { ...newCourses[index], type: value as any };
                                      setFormData(prev => ({
                                        ...prev,
                                        courseArrangementRules: {
                                          ...prev.courseArrangementRules,
                                          fixedTimeCourses: {
                                            ...prev.courseArrangementRules.fixedTimeCourses,
                                            courses: newCourses
                                          }
                                        }
                                      }));
                                    }}
                                  >
                                    <option value="class-meeting">班会</option>
                                    <option value="flag-raising">升旗仪式</option>
                                    <option value="eye-exercise">眼保健操</option>
                                    <option value="morning-reading">晨读</option>
                                    <option value="afternoon-reading">午读</option>
                                    <option value="cleaning">大扫除</option>
                                    <option value="other">其他</option>
                                  </Select>
                                </div>
                                
                                <div>
                                  <Label className="text-sm">星期</Label>
                                  <Select
                                    value={course.dayOfWeek.toString()}
                                    onValueChange={(value) => {
                                      const newCourses = [...(formData.courseArrangementRules.fixedTimeCourses?.courses || [])];
                                      newCourses[index] = { ...newCourses[index], dayOfWeek: parseInt(value) };
                                      setFormData(prev => ({
                                        ...prev,
                                        courseArrangementRules: {
                                          ...prev.courseArrangementRules,
                                          fixedTimeCourses: {
                                            ...prev.courseArrangementRules.fixedTimeCourses,
                                            courses: newCourses
                                          }
                                        }
                                      }));
                                    }}
                                  >
                                    <option value="1">周一</option>
                                    <option value="2">周二</option>
                                    <option value="3">周三</option>
                                    <option value="4">周四</option>
                                    <option value="5">周五</option>
                                    <option value="6">周六</option>
                                    <option value="7">周日</option>
                                  </Select>
                                </div>
                                
                                <div>
                                  <Label className="text-sm">节次</Label>
                                  <Select
                                    value={course.period.toString()}
                                    onValueChange={(value) => {
                                      const newCourses = [...(formData.courseArrangementRules.fixedTimeCourses?.courses || [])];
                                      newCourses[index] = { ...newCourses[index], period: parseInt(value) };
                                      setFormData(prev => ({
                                        ...prev,
                                        courseArrangementRules: {
                                          ...prev.courseArrangementRules,
                                          fixedTimeCourses: {
                                            ...prev.courseArrangementRules.fixedTimeCourses,
                                            courses: newCourses
                                          }
                                        }
                                      }));
                                    }}
                                  >
                                    {[1, 2, 3, 4, 5, 6, 7, 8].map(period => (
                                      <option key={period} value={period.toString()}>
                                        第{period}节
                                      </option>
                                    ))}
                                  </Select>
                                </div>
                                
                                <div className="flex items-end">
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      const newCourses = (formData.courseArrangementRules.fixedTimeCourses?.courses || []).filter((_, i) => i !== index);
                                      setFormData(prev => ({
                                        ...prev,
                                        courseArrangementRules: {
                                          ...prev.courseArrangementRules,
                                          fixedTimeCourses: {
                                            ...prev.courseArrangementRules.fixedTimeCourses,
                                            courses: newCourses
                                          }
                                        }
                                      }));
                                    }}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                              
                              {/* 周次设置 */}
                              <div className="mt-3 grid gap-4 md:grid-cols-3">
                                <div>
                                  <Label className="text-sm">周次类型</Label>
                                  <Select
                                    value={course.weekType || 'all'}
                                    onValueChange={(value) => {
                                      const newCourses = [...(formData.courseArrangementRules.fixedTimeCourses?.courses || [])];
                                      newCourses[index] = { ...newCourses[index], weekType: value as any };
                                      setFormData(prev => ({
                                        ...prev,
                                        courseArrangementRules: {
                                          ...prev.courseArrangementRules,
                                          fixedTimeCourses: {
                                            ...prev.courseArrangementRules.fixedTimeCourses,
                                            courses: newCourses
                                          }
                                        }
                                      }));
                                    }}
                                  >
                                    <option value="all">全周</option>
                                    <option value="odd">单周</option>
                                    <option value="even">双周</option>
                                  </Select>
                                </div>
                                
                                <div>
                                  <Label className="text-sm">开始周次</Label>
                                  <Input
                                    type="number"
                                    min="1"
                                    max="30"
                                    value={course.startWeek || 1}
                                    onChange={(e) => {
                                      const newCourses = [...(formData.courseArrangementRules.fixedTimeCourses?.courses || [])];
                                      newCourses[index] = { ...newCourses[index], startWeek: parseInt(e.target.value) || 1 };
                                      setFormData(prev => ({
                                        ...prev,
                                        courseArrangementRules: {
                                          ...prev.courseArrangementRules,
                                          fixedTimeCourses: {
                                            ...prev.courseArrangementRules.fixedTimeCourses,
                                            courses: newCourses
                                          }
                                        }
                                      }));
                                    }}
                                  />
                                </div>
                                
                                <div>
                                  <Label className="text-sm">结束周次</Label>
                                  <Input
                                    type="number"
                                    min="1"
                                    max="30"
                                    value={course.endWeek || 20}
                                    onChange={(e) => {
                                      const newCourses = [...(formData.courseArrangementRules.fixedTimeCourses?.courses || [])];
                                      newCourses[index] = { ...newCourses[index], endWeek: parseInt(e.target.value) || 20 };
                                      setFormData(prev => ({
                                        ...prev,
                                        courseArrangementRules: {
                                          ...prev.courseArrangementRules,
                                          fixedTimeCourses: {
                                            ...prev.courseArrangementRules.fixedTimeCourses,
                                            courses: newCourses
                                          }
                                        }
                                      }));
                                    }}
                                  />
                                </div>
                              </div>
                              
                              {/* 备注 */}
                              <div className="mt-3">
                                <Label className="text-sm">备注</Label>
                                <Input
                                  placeholder="课程说明或特殊要求"
                                  value={course.notes || ''}
                                  onChange={(e) => {
                                    const newCourses = [...(formData.courseArrangementRules.fixedTimeCourses?.courses || [])];
                                    newCourses[index] = { ...newCourses[index], notes: e.target.value };
                                    setFormData(prev => ({
                                      ...prev,
                                      courseArrangementRules: {
                                        ...prev.courseArrangementRules,
                                        fixedTimeCourses: {
                                          ...prev.courseArrangementRules.fixedTimeCourses,
                                          courses: newCourses
                                        }
                                      }
                                    }));
                                  }}
                                />
                              </div>
                            </div>
                          ))}
                          
                          {/* 添加新课程按钮 */}
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                              const newCourse = {
                                type: 'class-meeting' as const,
                                dayOfWeek: 1,
                                period: 1,
                                weekType: 'all' as const,
                                startWeek: 1,
                                endWeek: 20,
                                notes: ''
                              };
                              const newCourses = [...(formData.courseArrangementRules.fixedTimeCourses?.courses || []), newCourse];
                              setFormData(prev => ({
                                ...prev,
                                courseArrangementRules: {
                                  ...prev.courseArrangementRules,
                                  fixedTimeCourses: {
                                    ...prev.courseArrangementRules.fixedTimeCourses,
                                    courses: newCourses
                                  }
                                }
                              }));
                            }}
                            className="w-full"
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            添加固定时间课程
                          </Button>
                        </div>
                      </div>

                      {/* 全局设置 */}
                      <div className="space-y-4">
                        <Separator />
                        <h4 className="font-medium text-gray-900">全局设置</h4>
                        
                        <div className="grid gap-4 md:grid-cols-2">
                          <div className="flex items-center space-x-2">
                            <Switch
                              id="fixedTimePriority"
                              checked={formData.courseArrangementRules.fixedTimeCourses?.priority || false}
                              onCheckedChange={(checked) => setFormData(prev => ({
                                ...prev,
                                courseArrangementRules: {
                                  ...prev.courseArrangementRules,
                                  fixedTimeCourses: {
                                    ...prev.courseArrangementRules.fixedTimeCourses,
                                    priority: checked
                                  }
                                }
                              }))}
                            />
                            <Label htmlFor="fixedTimePriority">固定时间课程优先</Label>
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            <Switch
                              id="allowFixedTimeOverride"
                              checked={formData.courseArrangementRules.fixedTimeCourses?.allowOverride || false}
                              onCheckedChange={(checked) => setFormData(prev => ({
                                ...prev,
                                courseArrangementRules: {
                                  ...prev.courseArrangementRules,
                                  fixedTimeCourses: {
                                    ...prev.courseArrangementRules.fixedTimeCourses,
                                    allowOverride: checked
                                  }
                                }
                              }))}
                            />
                            <Label htmlFor="allowFixedTimeOverride">允许手动调整</Label>
                          </div>
                        </div>
                        
                        <div>
                          <Label className="text-sm">冲突处理策略</Label>
                          <Select
                            value={formData.courseArrangementRules.fixedTimeCourses?.conflictStrategy || 'strict'}
                            onValueChange={(value) => setFormData(prev => ({
                              ...prev,
                              courseArrangementRules: {
                                ...prev.courseArrangementRules,
                                fixedTimeCourses: {
                                  ...prev.courseArrangementRules.fixedTimeCourses,
                                  conflictStrategy: value as any
                                }
                              }
                            }))}
                          >
                            <option value="strict">严格模式（不允许冲突）</option>
                            <option value="flexible">灵活模式（允许调整其他课程）</option>
                            <option value="warning">警告模式（提示冲突但允许继续）</option>
                          </Select>
                          <p className="text-xs text-gray-500 mt-1">
                            当固定时间课程与其他课程冲突时的处理方式
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* 冲突解决 */}
            <TabsContent value="conflict" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5" />
                    冲突解决策略
                  </CardTitle>
                  <CardDescription>
                    配置在出现排课冲突时的处理策略
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-3">
                    <div>
                      <Label htmlFor="teacherConflictResolution">教师冲突处理</Label>
                      <Select
                        value={formData.conflictResolutionRules.teacherConflictResolution}
                        onValueChange={(value) => setFormData(prev => ({
                          ...prev,
                          conflictResolutionRules: { ...prev.conflictResolutionRules, teacherConflictResolution: value as any }
                        }))}
                      >
                        {CONFLICT_RESOLUTION_STRATEGIES.map(strategy => (
                          <option key={strategy.value} value={strategy.value}>
                            {strategy.label}
                          </option>
                        ))}
                      </Select>
                    </div>
                    
                    <div>
                      <Label htmlFor="roomConflictResolution">教室冲突处理</Label>
                      <Select
                        value={formData.conflictResolutionRules.roomConflictResolution}
                        onValueChange={(value) => setFormData(prev => ({
                          ...prev,
                          conflictResolutionRules: { ...prev.conflictResolutionRules, roomConflictResolution: value as any }
                        }))}
                      >
                        {CONFLICT_RESOLUTION_STRATEGIES.map(strategy => (
                          <option key={strategy.value} value={strategy.value}>
                            {strategy.label}
                          </option>
                        ))}
                      </Select>
                    </div>
                    
                    <div>
                      <Label htmlFor="classConflictResolution">班级冲突处理</Label>
                      <Select
                        value={formData.conflictResolutionRules.classConflictResolution}
                        onValueChange={(value) => setFormData(prev => ({
                          ...prev,
                          conflictResolutionRules: { ...prev.conflictResolutionRules, classConflictResolution: value as any }
                        }))}
                      >
                        {CONFLICT_RESOLUTION_STRATEGIES.map(strategy => (
                          <option key={strategy.value} value={strategy.value}>
                            {strategy.label}
                          </option>
                        ))}
                      </Select>
                    </div>
                  </div>
                  
                  <div className="mt-4 flex items-center space-x-2">
                    <Switch
                      id="allowOverride"
                      checked={formData.conflictResolutionRules.allowOverride}
                      onCheckedChange={(checked) => setFormData(prev => ({
                        ...prev,
                        conflictResolutionRules: { ...prev.conflictResolutionRules, allowOverride: checked }
                      }))}
                    />
                    <Label htmlFor="allowOverride">允许手动覆盖冲突</Label>
                    <p className="text-xs text-gray-500">
                      允许用户在排课时手动处理冲突情况
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* 错误信息显示 */}
          {operationError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <div className="flex items-center">
                <AlertTriangle className="h-4 w-4 text-red-500 mr-2" />
                <span className="text-red-700 text-sm">{operationError}</span>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setDialogState(prev => ({ ...prev, create: false }));
                setOperationError('');
              }}
              disabled={isCreating}
            >
              取消
            </Button>
            <Button 
              onClick={handleCreate}
              disabled={!formData.name || !formData.academicYear || isCreating}
            >
              {isCreating ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  创建中...
                </>
              ) : (
                '创建排课规则'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 编辑排课规则对话框 */}
      <Dialog open={dialogState.edit} onOpenChange={(open) => 
        setDialogState(prev => ({ ...prev, edit: open }))
      }>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>编辑排课规则</DialogTitle>
          </DialogHeader>
          
          <Tabs defaultValue="basic" className="space-y-4">
            <TabsList className="grid w-full grid-cols-6">
              <TabsTrigger value="basic">基本信息</TabsTrigger>
              <TabsTrigger value="time">时间规则</TabsTrigger>
              <TabsTrigger value="teacher">教师约束</TabsTrigger>
              <TabsTrigger value="room">教室约束</TabsTrigger>
              <TabsTrigger value="course">课程规则</TabsTrigger>
              <TabsTrigger value="conflict">冲突解决</TabsTrigger>
            </TabsList>

            {/* 编辑时的基本信息 */}
            <TabsContent value="basic" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="h-5 w-5" />
                    基本信息
                  </CardTitle>
                  <CardDescription>
                    修改排课规则的基本信息和适用范围
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <Label htmlFor="edit-name">规则名称 *</Label>
                      <Input
                        id="edit-name"
                        placeholder="如：高中部2024-2025学年排课规则"
                        value={formData.name}
                        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="edit-schoolType">学校类型 *</Label>
                      <Select
                        value={formData.schoolType}
                        onValueChange={(value) => setFormData(prev => ({ ...prev, schoolType: value as any }))}
                      >
                        {SCHOOL_TYPES.map(type => (
                          <option key={type.value} value={type.value}>
                            {type.label}
                          </option>
                        ))}
                      </Select>
                    </div>
                    
                    <div>
                      <Label htmlFor="edit-academicYear">学年 *</Label>
                      <Select
                        value={formData.academicYear}
                        onValueChange={(value) => setFormData(prev => ({ ...prev, academicYear: value }))}
                      >
                        {ACADEMIC_YEAR_OPTIONS.map(option => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </Select>
                    </div>
                    
                    <div>
                      <Label htmlFor="edit-semester">学期 *</Label>
                      <Select
                        value={formData.semester.toString()}
                        onValueChange={(value) => setFormData(prev => ({ ...prev, semester: parseInt(value) }))}
                      >
                        <option value="1">第一学期</option>
                        <option value="2">第二学期</option>
                      </Select>
                    </div>
                  </div>
                  
                  <div className="mt-4">
                    <Label htmlFor="edit-description">规则描述</Label>
                    <Textarea
                      id="edit-description"
                      placeholder="描述这个排课规则的特点和适用场景"
                      rows={3}
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    />
                  </div>
                  
                  <div className="mt-4 flex items-center space-x-2">
                    <Switch
                      id="edit-isDefault"
                      checked={formData.isDefault}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isDefault: checked }))}
                    />
                    <Label htmlFor="edit-isDefault">设为默认规则</Label>
                    <p className="text-xs text-gray-500">
                      (默认规则将自动应用于新的排课任务)
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* 其他标签页复用创建对话框的内容，只是ID不同 */}
            <TabsContent value="time" className="space-y-4">
              {/* 时间规则内容与创建对话框相同 */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    时间安排规则
                  </CardTitle>
                  <CardDescription>
                    配置每日课时安排、休息时间和禁用时段
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-3">
                    <div>
                      <Label htmlFor="edit-dailyPeriods">每日课时数 *</Label>
                      <Input
                        id="edit-dailyPeriods"
                        type="number"
                        min="6"
                        max="12"
                        value={formData.timeRules.dailyPeriods}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          timeRules: { ...prev.timeRules, dailyPeriods: parseInt(e.target.value) || 8 }
                        }))}
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="edit-periodDuration">课时时长(分钟) *</Label>
                      <Input
                        id="edit-periodDuration"
                        type="number"
                        min="40"
                        max="60"
                        value={formData.timeRules.periodDuration}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          timeRules: { ...prev.timeRules, periodDuration: parseInt(e.target.value) || 45 }
                        }))}
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="edit-breakDuration">课间休息(分钟) *</Label>
                      <Input
                        id="edit-breakDuration"
                        type="number"
                        min="5"
                        max="20"
                        value={formData.timeRules.breakDuration}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          timeRules: { ...prev.timeRules, breakDuration: parseInt(e.target.value) || 10 }
                        }))}
                      />
                    </div>
                  </div>
                  
                  <Separator className="my-4" />
                  
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <Label htmlFor="edit-lunchBreakStart">午休开始课时 *</Label>
                      <Input
                        id="edit-lunchBreakStart"
                        type="number"
                        min="3"
                        max="6"
                        value={formData.timeRules.lunchBreakStart}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          timeRules: { ...prev.timeRules, lunchBreakStart: parseInt(e.target.value) || 4 }
                        }))}
                      />
                      <p className="text-xs text-gray-500 mt-1">午休从第几课时后开始</p>
                    </div>
                    
                    <div>
                      <Label htmlFor="edit-lunchBreakDuration">午休时长(分钟) *</Label>
                      <Input
                        id="edit-lunchBreakDuration"
                        type="number"
                        min="60"
                        max="120"
                        value={formData.timeRules.lunchBreakDuration}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          timeRules: { ...prev.timeRules, lunchBreakDuration: parseInt(e.target.value) || 90 }
                        }))}
                      />
                    </div>
                  </div>
                  
                  <div className="mt-4">
                    <Label>工作日设置</Label>
                    <div className="flex gap-2 mt-2">
                      {WEEKDAY_OPTIONS.map(day => (
                        <label key={day.value} className="flex items-center space-x-1">
                          <input
                            type="checkbox"
                            checked={formData.timeRules.workingDays.includes(day.value)}
                            onChange={(e) => {
                              const newWorkingDays = e.target.checked
                                ? [...formData.timeRules.workingDays, day.value]
                                : formData.timeRules.workingDays.filter(d => d !== day.value);
                              setFormData(prev => ({
                                ...prev,
                                timeRules: { ...prev.timeRules, workingDays: newWorkingDays }
                              }));
                            }}
                          />
                          <span className="text-sm">{day.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                        
      {/* 上下午节次设置 - 在编辑对话框中添加 */}
      <Separator className="my-4" />
      
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <Label>上午节次设置</Label>
          <div className="mt-2 space-y-2">
            <div className="flex flex-wrap gap-1">
              {[1, 2, 3, 4, 5, 6, 7, 8].map(period => (
                <button
                  key={period}
                  type="button"
                  onClick={() => {
                    const current = formData.timeRules.morningPeriods;
                    const newPeriods = current.includes(period)
                      ? current.filter(p => p !== period)
                      : [...current, period];
                    setFormData(prev => ({
                      ...prev,
                      timeRules: { ...prev.timeRules, morningPeriods: newPeriods }
                    }));
                  }}
                  className={cn(
                    'px-2 py-1 text-xs rounded border',
                    formData.timeRules.morningPeriods.includes(period)
                      ? 'bg-blue-500 text-white border-blue-500'
                      : 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200'
                  )}
                >
                  第{period}节
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-500">点击选择上午的节次</p>
          </div>
        </div>

        <div>
          <Label>下午节次设置</Label>
          <div className="mt-2 space-y-2">
            <div className="flex flex-wrap gap-1">
              {[1, 2, 3, 4, 5, 6, 7, 8].map(period => (
                <button
                  key={period}
                  type="button"
                  onClick={() => {
                    const current = formData.timeRules.afternoonPeriods;
                    const newPeriods = current.includes(period)
                      ? current.filter(p => p !== period)
                      : [...current, period];
                    setFormData(prev => ({
                      ...prev,
                      timeRules: { ...prev.timeRules, afternoonPeriods: newPeriods }
                    }));
                  }}
                  className={cn(
                    'px-2 py-1 text-xs rounded border',
                    formData.timeRules.afternoonPeriods.includes(period)
                      ? 'bg-blue-500 text-white border-blue-500'
                      : 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200'
                  )}
                >
                  第{period}节
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-500">点击选择下午的节次</p>
          </div>
        </div>
      </div>
    </CardContent>
  </Card>
</TabsContent>

            {/* 教师约束 - 复用创建对话框内容 */}
            <TabsContent value="teacher" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    教师工作约束
                  </CardTitle>
                  <CardDescription>
                    配置教师的工作时间限制和偏好规则
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-3">
                    <div>
                      <Label htmlFor="edit-maxDailyHours">每日最大课时 *</Label>
                      <Input
                        id="edit-maxDailyHours"
                        type="number"
                        min="4"
                        max="8"
                        value={formData.teacherConstraints.maxDailyHours}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          teacherConstraints: { ...prev.teacherConstraints, maxDailyHours: parseInt(e.target.value) || 6 }
                        }))}
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="edit-maxContinuousHours">最大连续课时 *</Label>
                      <Input
                        id="edit-maxContinuousHours"
                        type="number"
                        min="2"
                        max="4"
                        value={formData.teacherConstraints.maxContinuousHours}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          teacherConstraints: { ...prev.teacherConstraints, maxContinuousHours: parseInt(e.target.value) || 3 }
                        }))}
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="edit-minRestBetweenCourses">课间最小休息 *</Label>
                      <Input
                        id="edit-minRestBetweenCourses"
                        type="number"
                        min="0"
                        max="3"
                        value={formData.teacherConstraints.minRestBetweenCourses}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          teacherConstraints: { ...prev.teacherConstraints, minRestBetweenCourses: parseInt(e.target.value) || 1 }
                        }))}
                      />
                      <p className="text-xs text-gray-500 mt-1">连续课程间的最小间隔课时</p>
                    </div>
                  </div>
                  
                  <Separator className="my-4" />
                  
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="edit-avoidFridayAfternoon"
                        checked={formData.teacherConstraints.avoidFridayAfternoon}
                        onCheckedChange={(checked) => setFormData(prev => ({
                          ...prev,
                          teacherConstraints: { ...prev.teacherConstraints, avoidFridayAfternoon: checked }
                        }))}
                      />
                      <Label htmlFor="edit-avoidFridayAfternoon">避免周五下午排课</Label>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="edit-respectTeacherPreferences"
                        checked={formData.teacherConstraints.respectTeacherPreferences}
                        onCheckedChange={(checked) => setFormData(prev => ({
                          ...prev,
                          teacherConstraints: { ...prev.teacherConstraints, respectTeacherPreferences: checked }
                        }))}
                      />
                      <Label htmlFor="edit-respectTeacherPreferences">尊重教师时间偏好</Label>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="edit-allowCrossGradeTeaching"
                        checked={formData.teacherConstraints.allowCrossGradeTeaching}
                        onCheckedChange={(checked) => setFormData(prev => ({
                          ...prev,
                          teacherConstraints: { ...prev.teacherConstraints, allowCrossGradeTeaching: checked }
                        }))}
                      />
                      <Label htmlFor="edit-allowCrossGradeTeaching">允许跨年级授课</Label>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* 教室约束 - 复用创建对话框内容 */}
            <TabsContent value="room" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building className="h-5 w-5" />
                    教室使用约束
                  </CardTitle>
                  <CardDescription>
                    配置教室容量、共享和特殊教室的使用规则
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="edit-respectCapacityLimits"
                        checked={formData.roomConstraints.respectCapacityLimits}
                        onCheckedChange={(checked) => setFormData(prev => ({
                          ...prev,
                          roomConstraints: { ...prev.roomConstraints, respectCapacityLimits: checked }
                        }))}
                      />
                      <Label htmlFor="edit-respectCapacityLimits">严格遵守教室容量限制</Label>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="edit-allowRoomSharing"
                        checked={formData.roomConstraints.allowRoomSharing}
                        onCheckedChange={(checked) => setFormData(prev => ({
                          ...prev,
                          roomConstraints: { ...prev.roomConstraints, allowRoomSharing: checked }
                        }))}
                      />
                      <Label htmlFor="edit-allowRoomSharing">允许教室共享使用</Label>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="edit-preferFixedClassrooms"
                        checked={formData.roomConstraints.preferFixedClassrooms}
                        onCheckedChange={(checked) => setFormData(prev => ({
                          ...prev,
                          roomConstraints: { ...prev.roomConstraints, preferFixedClassrooms: checked }
                        }))}
                      />
                      <Label htmlFor="edit-preferFixedClassrooms">优先使用固定教室</Label>
                    </div>
                    
                    <div>
                      <Label htmlFor="edit-specialRoomPriority">特殊教室优先级</Label>
                      <Select
                        value={formData.roomConstraints.specialRoomPriority}
                        onValueChange={(value) => setFormData(prev => ({
                          ...prev,
                          roomConstraints: { ...prev.roomConstraints, specialRoomPriority: value as any }
                        }))}
                      >
                        {ROOM_PRIORITY_OPTIONS.map(option => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </Select>
                      <p className="text-xs text-gray-500 mt-1">
                        实验室、机房等特殊教室的使用优先级
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* 课程安排规则 - 复用创建对话框内容 */}
            <TabsContent value="course" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BookOpen className="h-5 w-5" />
                    课程安排规则
                  </CardTitle>
                  <CardDescription>
                    配置课程分布策略和时间偏好
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <Label htmlFor="edit-distributionPolicy">课程分布策略 *</Label>
                      <Select
                        value={formData.courseArrangementRules.distributionPolicy}
                        onValueChange={(value) => setFormData(prev => ({
                          ...prev,
                          courseArrangementRules: { ...prev.courseArrangementRules, distributionPolicy: value as any }
                        }))}
                      >
                        {DISTRIBUTION_POLICIES.map(policy => (
                          <option key={policy.value} value={policy.value}>
                            {policy.label}
                          </option>
                        ))}
                      </Select>
                    </div>
                    
                    <div>
                      <Label htmlFor="edit-labCoursePreference">实验课时间偏好</Label>
                      <Select
                        value={formData.courseArrangementRules.labCoursePreference}
                        onValueChange={(value) => setFormData(prev => ({
                          ...prev,
                          courseArrangementRules: { ...prev.courseArrangementRules, labCoursePreference: value as any }
                        }))}
                      >
                        {TIME_PREFERENCES.map(pref => (
                          <option key={pref.value} value={pref.value}>
                            {pref.label}
                          </option>
                        ))}
                      </Select>
                    </div>
                  </div>
                  
                  <Separator className="my-4" />
                  
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="edit-allowContinuousCourses"
                        checked={formData.courseArrangementRules.allowContinuousCourses}
                        onCheckedChange={(checked) => setFormData(prev => ({
                          ...prev,
                          courseArrangementRules: { ...prev.courseArrangementRules, allowContinuousCourses: checked }
                        }))}
                      />
                      <Label htmlFor="edit-allowContinuousCourses">允许连续课程安排</Label>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="edit-coreSubjectPriority"
                        checked={formData.courseArrangementRules.coreSubjectPriority}
                        onCheckedChange={(checked) => setFormData(prev => ({
                          ...prev,
                          courseArrangementRules: { ...prev.courseArrangementRules, coreSubjectPriority: checked }
                        }))}
                      />
                      <Label htmlFor="edit-coreSubjectPriority">核心课程优先安排</Label>
                    </div>
                    
                    {formData.courseArrangementRules.allowContinuousCourses && (
                      <div>
                        <Label htmlFor="edit-maxContinuousHours">最大连续课时</Label>
                        <Input
                          id="edit-maxContinuousHours"
                          type="number"
                          min="2"
                          max="4"
                          value={formData.courseArrangementRules.maxContinuousHours}
                          onChange={(e) => setFormData(prev => ({
                            ...prev,
                            courseArrangementRules: { ...prev.courseArrangementRules, maxContinuousHours: parseInt(e.target.value) || 2 }
                          }))}
                          className="w-24"
                        />
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* 核心课程策略配置 */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BookOpen className="h-5 w-5" />
                    核心课程策略
                  </CardTitle>
                  <CardDescription>
                    配置核心课程的分布策略，确保核心课程均匀分布在一周内
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {/* 启用开关 */}
                  <div className="flex items-center space-x-2 mb-4">
                    <Switch
                      id="edit-enableCoreSubjectStrategy"
                      checked={getSafeCoreSubjectStrategy().enableCoreSubjectStrategy}
                      onCheckedChange={(checked) => setFormData(prev => ({
                        ...prev,
                        courseArrangementRules: {
                          ...prev.courseArrangementRules,
                          coreSubjectStrategy: {
                            ...prev.courseArrangementRules.coreSubjectStrategy,
                            enableCoreSubjectStrategy: checked
                          }
                        }
                      }))}
                    />
                    <Label htmlFor="edit-enableCoreSubjectStrategy" className="text-base font-medium">
                      启用核心课程策略
                    </Label>
                  </div>

                  {getSafeCoreSubjectStrategy().enableCoreSubjectStrategy && (
                    <div className="space-y-6">
                      {/* 核心课程列表 */}
                      <div>
                        <Label htmlFor="edit-coreSubjects">核心课程列表 *</Label>
                        <div className="mt-2 space-y-2">
                          <div className="flex flex-wrap gap-2">
                            {getSafeCoreSubjectStrategy().coreSubjects.map((subject, index) => (
                              <div key={index} className="flex items-center gap-2 bg-blue-50 px-3 py-1 rounded-full">
                                <span className="text-sm">{subject}</span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const newSubjects = getSafeCoreSubjectStrategy().coreSubjects.filter((_, i) => i !== index);
                                    setFormData(prev => ({
                                      ...prev,
                                      courseArrangementRules: {
                                        ...prev.courseArrangementRules,
                                        coreSubjectStrategy: {
                                          ...prev.courseArrangementRules.coreSubjectStrategy,
                                          coreSubjects: newSubjects
                                        }
                                      }
                                    }));
                                  }}
                                  className="text-red-500 hover:text-red-700"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </div>
                            ))}
                          </div>
                          <div className="flex gap-2">
                            <Select
                              value=""
                              onValueChange={(value) => {
                                if (value && !getSafeCoreSubjectStrategy().coreSubjects.includes(value)) {
                                  setFormData(prev => ({
                                    ...prev,
                                    courseArrangementRules: {
                                      ...prev.courseArrangementRules,
                                      coreSubjectStrategy: {
                                        ...prev.courseArrangementRules.coreSubjectStrategy,
                                        coreSubjects: [...getSafeCoreSubjectStrategy().coreSubjects, value]
                                      }
                                    }
                                  }));
                                }
                              }}
                            >
                              <option value="">选择课程...</option>
                              {['语文', '数学', '英语', '物理', '化学', '生物', '历史', '地理', '政治', '科学', '道德与法治'].map(subject => (
                                <option key={subject} value={subject}>
                                  {subject}
                                </option>
                              ))}
                            </Select>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                const recommendedSubjects = getRecommendedCoreSubjects(formData.schoolType);
                                setFormData(prev => ({
                                  ...prev,
                                  courseArrangementRules: {
                                    ...prev.courseArrangementRules,
                                    coreSubjectStrategy: {
                                      ...prev.courseArrangementRules.coreSubjectStrategy,
                                      coreSubjects: recommendedSubjects
                                    }
                                  }
                                }));
                              }}
                            >
                              推荐配置
                            </Button>
                          </div>
                        </div>
                      </div>

                      {/* 分布模式和时间设置 */}
                      <div className="grid gap-4 md:grid-cols-2">
                        <div>
                          <Label htmlFor="edit-distributionMode">分布模式 *</Label>
                          <Select
                            value={getSafeCoreSubjectStrategy().distributionMode}
                            onValueChange={(value) => setFormData(prev => ({
                              ...prev,
                              courseArrangementRules: {
                                ...prev.courseArrangementRules,
                                coreSubjectStrategy: {
                                  ...prev.courseArrangementRules.coreSubjectStrategy,
                                  distributionMode: value as any
                                }
                              }
                            }))}
                          >
                            {CORE_SUBJECT_DISTRIBUTION_MODES.map(mode => (
                              <option key={mode.value} value={mode.value}>
                                {mode.label}
                              </option>
                            ))}
                          </Select>
                          <p className="text-xs text-gray-500 mt-1">
                            {getSafeCoreSubjectStrategy().distributionMode === 'daily' && '每日分布：核心课程每天都有安排'}
                            {getSafeCoreSubjectStrategy().distributionMode === 'balanced' && '平衡分布：核心课程在一周内均匀分布'}
                            {getSafeCoreSubjectStrategy().distributionMode === 'concentrated' && '集中分布：核心课程集中在特定几天'}
                          </p>
                        </div>

                        <div>
                          <Label htmlFor="edit-maxDailyOccurrences">每日最大出现次数 *</Label>
                          <Input
                            id="edit-maxDailyOccurrences"
                            type="number"
                            min="1"
                            max="4"
                            value={getSafeCoreSubjectStrategy().maxDailyOccurrences}
                            onChange={(e) => setFormData(prev => ({
                              ...prev,
                              courseArrangementRules: {
                                ...prev.courseArrangementRules,
                                coreSubjectStrategy: {
                                  ...prev.courseArrangementRules.coreSubjectStrategy,
                                  maxDailyOccurrences: parseInt(e.target.value) || 2
                                }
                              }
                            }))}
                          />
                          <p className="text-xs text-gray-500 mt-1">建议：1-2次，避免某一天课程过重</p>
                        </div>
                      </div>

                      {/* 每周要求和连续天控制 */}
                      <div className="grid gap-4 md:grid-cols-2">
                        <div>
                          <Label htmlFor="edit-minDaysPerWeek">每周最少出现天数 *</Label>
                          <Input
                            id="edit-minDaysPerWeek"
                            type="number"
                            min="3"
                            max="7"
                            value={getSafeCoreSubjectStrategy().minDaysPerWeek}
                            onChange={(e) => setFormData(prev => ({
                              ...prev,
                              courseArrangementRules: {
                                ...prev.courseArrangementRules,
                                coreSubjectStrategy: {
                                  ...prev.courseArrangementRules.coreSubjectStrategy,
                                  minDaysPerWeek: parseInt(e.target.value) || 5
                                }
                              }
                            }))}
                          />
                          <p className="text-xs text-gray-500 mt-1">建议：4-5天，确保核心课程覆盖足够的天数</p>
                        </div>

                        <div>
                          <Label htmlFor="edit-maxConcentration">最大集中度</Label>
                          <Input
                            id="edit-maxConcentration"
                            type="number"
                            min="1"
                            max="5"
                            value={getSafeCoreSubjectStrategy().maxConcentration}
                            onChange={(e) => setFormData(prev => ({
                              ...prev,
                              courseArrangementRules: {
                                ...prev.courseArrangementRules,
                                coreSubjectStrategy: {
                                  ...prev.courseArrangementRules.coreSubjectStrategy,
                                  maxConcentration: parseInt(e.target.value) || 3
                                }
                              }
                            }))}
                          />
                          <p className="text-xs text-gray-500 mt-1">连续天数限制，避免核心课程过于集中</p>
                        </div>
                      </div>

                      {/* 时间段偏好设置 */}
                      <div>
                        <Label>时间段偏好设置</Label>
                        <div className="mt-2 grid gap-4 md:grid-cols-2">
                          <div>
                            <Label htmlFor="edit-preferredTimeSlots" className="text-sm">偏好时间段</Label>
                            <div className="mt-1 flex flex-wrap gap-1">
                              {[1, 2, 3, 4, 5, 6, 7, 8].map(period => (
                                <button
                                  key={period}
                                  type="button"
                                  onClick={() => {
                                    const current = getSafeCoreSubjectStrategy().preferredTimeSlots;
                                    const newPeriods = current.includes(period)
                                      ? current.filter(p => p !== period)
                                      : [...current, period];
                                    setFormData(prev => ({
                                      ...prev,
                                      courseArrangementRules: {
                                        ...prev.courseArrangementRules,
                                        coreSubjectStrategy: {
                                          ...prev.courseArrangementRules.coreSubjectStrategy,
                                          preferredTimeSlots: newPeriods
                                        }
                                      }
                                    }));
                                  }}
                                  className={cn(
                                    'px-2 py-1 text-xs rounded border',
                                    getSafeCoreSubjectStrategy().preferredTimeSlots.includes(period)
                                      ? 'bg-blue-500 text-white border-blue-500'
                                      : 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200'
                                  )}
                                >
                                  第{period}节
                                </button>
                              ))}
                            </div>
                            <p className="text-xs text-gray-500 mt-1">选择核心课程偏好的时间段</p>
                          </div>

                          <div>
                            <Label htmlFor="edit-avoidTimeSlots" className="text-sm">避免时间段</Label>
                            <div className="mt-1 flex flex-wrap gap-1">
                              {[1, 2, 3, 4, 5, 6, 7, 8].map(period => (
                                <button
                                  key={period}
                                  type="button"
                                  onClick={() => {
                                    const current = getSafeCoreSubjectStrategy().avoidTimeSlots;
                                    const newPeriods = current.includes(period)
                                      ? current.filter(p => p !== period)
                                      : [...current, period];
                                    setFormData(prev => ({
                                      ...prev,
                                      courseArrangementRules: {
                                        ...prev.courseArrangementRules,
                                        coreSubjectStrategy: {
                                          ...prev.courseArrangementRules.coreSubjectStrategy,
                                          avoidTimeSlots: newPeriods
                                        }
                                      }
                                    }));
                                  }}
                                  className={cn(
                                    'px-2 py-1 text-xs rounded border',
                                    getSafeCoreSubjectStrategy().avoidTimeSlots.includes(period)
                                      ? 'bg-red-500 text-white border-red-500'
                                      : 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200'
                                  )}
                                >
                                  第{period}节
                                </button>
                              ))}
                            </div>
                            <p className="text-xs text-gray-500 mt-1">选择核心课程要避免的时间段</p>
                          </div>
                        </div>
                      </div>

                      {/* 高级选项 */}
                      <div className="space-y-4">
                        <Separator />
                        <h4 className="font-medium text-gray-900">高级选项</h4>
                        
                        <div className="grid gap-4 md:grid-cols-2">
                          <div className="flex items-center space-x-2">
                            <Switch
                              id="edit-avoidConsecutiveDays"
                              checked={getSafeCoreSubjectStrategy().avoidConsecutiveDays}
                              onCheckedChange={(checked) => setFormData(prev => ({
                                ...prev,
                                courseArrangementRules: {
                                  ...prev.courseArrangementRules,
                                  coreSubjectStrategy: {
                                    ...prev.courseArrangementRules.coreSubjectStrategy,
                                    avoidConsecutiveDays: checked
                                  }
                                }
                              }))}
                            />
                            <Label htmlFor="edit-avoidConsecutiveDays">避免连续天安排</Label>
                          </div>

                          <div className="flex items-center space-x-2">
                            <Switch
                              id="edit-enforceEvenDistribution"
                              checked={getSafeCoreSubjectStrategy().enforceEvenDistribution}
                              onCheckedChange={(checked) => setFormData(prev => ({
                                ...prev,
                                courseArrangementRules: {
                                  ...prev.courseArrangementRules,
                                  coreSubjectStrategy: {
                                    ...prev.courseArrangementRules.coreSubjectStrategy,
                                    enforceEvenDistribution: checked
                                  }
                                }
                              }))}
                            />
                            <Label htmlFor="edit-enforceEvenDistribution">强制均匀分布</Label>
                          </div>
                        </div>

                        <div>
                          <Label htmlFor="edit-balanceWeight">平衡权重</Label>
                          <div className="mt-1 flex items-center gap-2">
                            <Input
                              id="edit-balanceWeight"
                              type="range"
                              min="0"
                              max="100"
                              value={getSafeCoreSubjectStrategy().balanceWeight}
                              onChange={(e) => setFormData(prev => ({
                                ...prev,
                                courseArrangementRules: {
                                  ...prev.courseArrangementRules,
                                  coreSubjectStrategy: {
                                    ...prev.courseArrangementRules.coreSubjectStrategy,
                                    balanceWeight: parseInt(e.target.value) || 80
                                  }
                                }
                              }))}
                              className="flex-1"
                            />
                            <span className="text-sm font-medium w-12 text-right">
                              {getSafeCoreSubjectStrategy().balanceWeight}%
                            </span>
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            调整核心课程分布策略在排课算法中的重要性权重
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* 固定时间课程配置 */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    固定时间课程配置
                  </CardTitle>
                  <CardDescription>
                    配置班会、升旗仪式等每周固定时间进行的课程安排
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {/* 启用开关 */}
                  <div className="flex items-center space-x-2 mb-4">
                    <Switch
                      id="edit-enableFixedTimeCourses"
                      checked={formData.courseArrangementRules.fixedTimeCourses?.enabled || false}
                      onCheckedChange={(checked) => setFormData(prev => ({
                        ...prev,
                        courseArrangementRules: {
                          ...prev.courseArrangementRules,
                          fixedTimeCourses: {
                            ...prev.courseArrangementRules.fixedTimeCourses,
                            enabled: checked
                          }
                        }
                      }))}
                    />
                    <Label htmlFor="edit-enableFixedTimeCourses" className="text-base font-medium">
                      启用固定时间课程
                    </Label>
                  </div>

                  {formData.courseArrangementRules.fixedTimeCourses?.enabled && (
                    <div className="space-y-6">
                      {/* 固定时间课程列表 */}
                      <div>
                        <Label>固定时间课程列表</Label>
                        <div className="mt-2 space-y-3">
                          {(formData.courseArrangementRules.fixedTimeCourses?.courses || []).map((course, index) => (
                            <div key={index} className="border rounded-lg p-4 bg-gray-50">
                              <div className="grid gap-4 md:grid-cols-4">
                                <div>
                                  <Label className="text-sm">课程类型</Label>
                                  <Select
                                    value={course.type}
                                    onValueChange={(value) => {
                                      const newCourses = [...(formData.courseArrangementRules.fixedTimeCourses?.courses || [])];
                                      newCourses[index] = { ...newCourses[index], type: value as any };
                                      setFormData(prev => ({
                                        ...prev,
                                        courseArrangementRules: {
                                          ...prev.courseArrangementRules,
                                          fixedTimeCourses: {
                                            ...prev.courseArrangementRules.fixedTimeCourses,
                                            courses: newCourses
                                          }
                                        }
                                      }));
                                    }}
                                  >
                                    <option value="class-meeting">班会</option>
                                    <option value="flag-raising">升旗仪式</option>
                                    <option value="eye-exercise">眼保健操</option>
                                    <option value="morning-reading">晨读</option>
                                    <option value="afternoon-reading">午读</option>
                                    <option value="cleaning">大扫除</option>
                                    <option value="other">其他</option>
                                  </Select>
                                </div>
                                
                                <div>
                                  <Label className="text-sm">星期</Label>
                                  <Select
                                    value={course.dayOfWeek.toString()}
                                    onValueChange={(value) => {
                                      const newCourses = [...(formData.courseArrangementRules.fixedTimeCourses?.courses || [])];
                                      newCourses[index] = { ...newCourses[index], dayOfWeek: parseInt(value) };
                                      setFormData(prev => ({
                                        ...prev,
                                        courseArrangementRules: {
                                          ...prev.courseArrangementRules,
                                          fixedTimeCourses: {
                                            ...prev.courseArrangementRules.fixedTimeCourses,
                                            courses: newCourses
                                          }
                                        }
                                      }));
                                    }}
                                  >
                                    <option value="1">周一</option>
                                    <option value="2">周二</option>
                                    <option value="3">周三</option>
                                    <option value="4">周四</option>
                                    <option value="5">周五</option>
                                    <option value="6">周六</option>
                                    <option value="7">周日</option>
                                  </Select>
                                </div>
                                
                                <div>
                                  <Label className="text-sm">节次</Label>
                                  <Select
                                    value={course.period.toString()}
                                    onValueChange={(value) => {
                                      const newCourses = [...(formData.courseArrangementRules.fixedTimeCourses?.courses || [])];
                                      newCourses[index] = { ...newCourses[index], period: parseInt(value) };
                                      setFormData(prev => ({
                                        ...prev,
                                        courseArrangementRules: {
                                          ...prev.courseArrangementRules,
                                          fixedTimeCourses: {
                                            ...prev.courseArrangementRules.fixedTimeCourses,
                                            courses: newCourses
                                          }
                                        }
                                      }));
                                    }}
                                  >
                                    {[1, 2, 3, 4, 5, 6, 7, 8].map(period => (
                                      <option key={period} value={period.toString()}>
                                        第{period}节
                                      </option>
                                    ))}
                                  </Select>
                                </div>
                                
                                <div className="flex items-end">
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      const newCourses = (formData.courseArrangementRules.fixedTimeCourses?.courses || []).filter((_, i) => i !== index);
                                      setFormData(prev => ({
                                        ...prev,
                                        courseArrangementRules: {
                                          ...prev.courseArrangementRules,
                                          fixedTimeCourses: {
                                            ...prev.courseArrangementRules.fixedTimeCourses,
                                            courses: newCourses
                                          }
                                        }
                                      }));
                                    }}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                              
                              {/* 周次设置 */}
                              <div className="mt-3 grid gap-4 md:grid-cols-3">
                                <div>
                                  <Label className="text-sm">周次类型</Label>
                                  <Select
                                    value={course.weekType || 'all'}
                                    onValueChange={(value) => {
                                      const newCourses = [...(formData.courseArrangementRules.fixedTimeCourses?.courses || [])];
                                      newCourses[index] = { ...newCourses[index], weekType: value as any };
                                      setFormData(prev => ({
                                        ...prev,
                                        courseArrangementRules: {
                                          ...prev.courseArrangementRules,
                                          fixedTimeCourses: {
                                            ...prev.courseArrangementRules.fixedTimeCourses,
                                            courses: newCourses
                                          }
                                        }
                                      }));
                                    }}
                                  >
                                    <option value="all">全周</option>
                                    <option value="odd">单周</option>
                                    <option value="even">双周</option>
                                  </Select>
                                </div>
                                
                                <div>
                                  <Label className="text-sm">开始周次</Label>
                                  <Input
                                    type="number"
                                    min="1"
                                    max="30"
                                    value={course.startWeek || 1}
                                    onChange={(e) => {
                                      const newCourses = [...(formData.courseArrangementRules.fixedTimeCourses?.courses || [])];
                                      newCourses[index] = { ...newCourses[index], startWeek: parseInt(e.target.value) || 1 };
                                      setFormData(prev => ({
                                        ...prev,
                                        courseArrangementRules: {
                                          ...prev.courseArrangementRules,
                                          fixedTimeCourses: {
                                            ...prev.courseArrangementRules.fixedTimeCourses,
                                            courses: newCourses
                                          }
                                        }
                                      }));
                                    }}
                                  />
                                </div>
                                
                                <div>
                                  <Label className="text-sm">结束周次</Label>
                                  <Input
                                    type="number"
                                    min="1"
                                    max="30"
                                    value={course.endWeek || 20}
                                    onChange={(e) => {
                                      const newCourses = [...(formData.courseArrangementRules.fixedTimeCourses?.courses || [])];
                                      newCourses[index] = { ...newCourses[index], endWeek: parseInt(e.target.value) || 20 };
                                      setFormData(prev => ({
                                        ...prev,
                                        courseArrangementRules: {
                                          ...prev.courseArrangementRules,
                                          fixedTimeCourses: {
                                            ...prev.courseArrangementRules.fixedTimeCourses,
                                            courses: newCourses
                                          }
                                        }
                                      }));
                                    }}
                                  />
                                </div>
                              </div>
                              
                              {/* 备注 */}
                              <div className="mt-3">
                                <Label className="text-sm">备注</Label>
                                <Input
                                  placeholder="课程说明或特殊要求"
                                  value={course.notes || ''}
                                  onChange={(e) => {
                                    const newCourses = [...(formData.courseArrangementRules.fixedTimeCourses?.courses || [])];
                                    newCourses[index] = { ...newCourses[index], notes: e.target.value };
                                    setFormData(prev => ({
                                      ...prev,
                                      courseArrangementRules: {
                                        ...prev.courseArrangementRules,
                                        fixedTimeCourses: {
                                          ...prev.courseArrangementRules.fixedTimeCourses,
                                          courses: newCourses
                                        }
                                      }
                                    }));
                                  }}
                                />
                              </div>
                            </div>
                          ))}
                          
                          {/* 添加新课程按钮 */}
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                              const newCourse = {
                                type: 'class-meeting' as const,
                                dayOfWeek: 1,
                                period: 1,
                                weekType: 'all' as const,
                                startWeek: 1,
                                endWeek: 20,
                                notes: ''
                              };
                              const newCourses = [...(formData.courseArrangementRules.fixedTimeCourses?.courses || []), newCourse];
                              setFormData(prev => ({
                                ...prev,
                                courseArrangementRules: {
                                  ...prev.courseArrangementRules,
                                  fixedTimeCourses: {
                                    ...prev.courseArrangementRules.fixedTimeCourses,
                                    courses: newCourses
                                  }
                                }
                              }));
                            }}
                            className="w-full"
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            添加固定时间课程
                          </Button>
                        </div>
                      </div>

                      {/* 全局设置 */}
                      <div className="space-y-4">
                        <Separator />
                        <h4 className="font-medium text-gray-900">全局设置</h4>
                        
                        <div className="grid gap-4 md:grid-cols-2">
                          <div className="flex items-center space-x-2">
                            <Switch
                              id="edit-fixedTimePriority"
                              checked={formData.courseArrangementRules.fixedTimeCourses?.priority || false}
                              onCheckedChange={(checked) => setFormData(prev => ({
                                ...prev,
                                courseArrangementRules: {
                                  ...prev.courseArrangementRules,
                                  fixedTimeCourses: {
                                    ...prev.courseArrangementRules.fixedTimeCourses,
                                    priority: checked
                                  }
                                }
                              }))}
                            />
                            <Label htmlFor="edit-fixedTimePriority">固定时间课程优先</Label>
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            <Switch
                              id="edit-allowFixedTimeOverride"
                              checked={formData.courseArrangementRules.fixedTimeCourses?.allowOverride || false}
                              onCheckedChange={(checked) => setFormData(prev => ({
                                ...prev,
                                courseArrangementRules: {
                                  ...prev.courseArrangementRules,
                                  fixedTimeCourses: {
                                    ...prev.courseArrangementRules.fixedTimeCourses,
                                    allowOverride: checked
                                  }
                                }
                              }))}
                            />
                            <Label htmlFor="edit-allowFixedTimeOverride">允许手动调整</Label>
                          </div>
                        </div>
                        
                        <div>
                          <Label className="text-sm">冲突处理策略</Label>
                          <Select
                            value={formData.courseArrangementRules.fixedTimeCourses?.conflictStrategy || 'strict'}
                            onValueChange={(value) => setFormData(prev => ({
                              ...prev,
                              courseArrangementRules: {
                                ...prev.courseArrangementRules,
                                fixedTimeCourses: {
                                  ...prev.courseArrangementRules.fixedTimeCourses,
                                  conflictStrategy: value as any
                                }
                              }
                            }))}
                          >
                            <option value="strict">严格模式（不允许冲突）</option>
                            <option value="flexible">灵活模式（允许调整其他课程）</option>
                            <option value="warning">警告模式（提示冲突但允许继续）</option>
                          </Select>
                          <p className="text-xs text-gray-500 mt-1">
                            当固定时间课程与其他课程冲突时的处理方式
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* 冲突解决 - 复用创建对话框内容 */}
            <TabsContent value="conflict" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5" />
                    冲突解决策略
                  </CardTitle>
                  <CardDescription>
                    配置在出现排课冲突时的处理策略
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-3">
                    <div>
                      <Label htmlFor="edit-teacherConflictResolution">教师冲突处理</Label>
                      <Select
                        value={formData.conflictResolutionRules.teacherConflictResolution}
                        onValueChange={(value) => setFormData(prev => ({
                          ...prev,
                          conflictResolutionRules: { ...prev.conflictResolutionRules, teacherConflictResolution: value as any }
                        }))}
                      >
                        {CONFLICT_RESOLUTION_STRATEGIES.map(strategy => (
                          <option key={strategy.value} value={strategy.value}>
                            {strategy.label}
                          </option>
                        ))}
                      </Select>
                    </div>
                    
                    <div>
                      <Label htmlFor="edit-roomConflictResolution">教室冲突处理</Label>
                      <Select
                        value={formData.conflictResolutionRules.roomConflictResolution}
                        onValueChange={(value) => setFormData(prev => ({
                          ...prev,
                          conflictResolutionRules: { ...prev.conflictResolutionRules, roomConflictResolution: value as any }
                        }))}
                      >
                        {CONFLICT_RESOLUTION_STRATEGIES.map(strategy => (
                          <option key={strategy.value} value={strategy.value}>
                            {strategy.label}
                          </option>
                        ))}
                      </Select>
                    </div>
                    
                    <div>
                      <Label htmlFor="edit-classConflictResolution">班级冲突处理</Label>
                      <Select
                        value={formData.conflictResolutionRules.classConflictResolution}
                        onValueChange={(value) => setFormData(prev => ({
                          ...prev,
                          conflictResolutionRules: { ...prev.conflictResolutionRules, classConflictResolution: value as any }
                        }))}
                      >
                        {CONFLICT_RESOLUTION_STRATEGIES.map(strategy => (
                          <option key={strategy.value} value={strategy.value}>
                            {strategy.label}
                          </option>
                        ))}
                      </Select>
                    </div>
                  </div>
                  
                  <div className="mt-4 flex items-center space-x-2">
                    <Switch
                      id="edit-allowOverride"
                      checked={formData.conflictResolutionRules.allowOverride}
                      onCheckedChange={(checked) => setFormData(prev => ({
                        ...prev,
                        conflictResolutionRules: { ...prev.conflictResolutionRules, allowOverride: checked }
                      }))}
                    />
                    <Label htmlFor="edit-allowOverride">允许手动覆盖冲突</Label>
                    <p className="text-xs text-gray-500">
                      允许用户在排课时手动处理冲突情况
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* 错误信息显示 */}
          {operationError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <div className="flex items-center">
                <AlertTriangle className="h-4 w-4 text-red-500 mr-2" />
                <span className="text-red-700 text-sm">{operationError}</span>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={closeDialogs}
              disabled={isUpdating}
            >
              取消
            </Button>
            <Button 
              onClick={handleUpdate}
              disabled={!formData.name || !formData.academicYear || isUpdating}
            >
              {isUpdating ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  保存中...
                </>
              ) : (
                '保存修改'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 查看排课规则对话框 */}
      <Dialog open={dialogState.view} onOpenChange={(open) => 
        setDialogState(prev => ({ ...prev, view: open }))
      }>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>查看排课规则详情</DialogTitle>
          </DialogHeader>
          
          {selectedRules && (
            <div className="space-y-6">
              {/* 基本信息 */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="h-5 w-5" />
                    基本信息
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <Label>规则名称</Label>
                      <p className="text-sm font-medium">{selectedRules.name}</p>
                    </div>
                    <div>
                      <Label>学校类型</Label>
                      <p className="text-sm">{formatSchoolType(selectedRules.schoolType)}</p>
                    </div>
                    <div>
                      <Label>学年</Label>
                      <p className="text-sm">{selectedRules.academicYear}</p>
                    </div>
                    <div>
                      <Label>学期</Label>
                      <p className="text-sm">{selectedRules.semester === 1 ? '第一学期' : '第二学期'}</p>
                    </div>
                    <div className="md:col-span-2">
                      <Label>规则描述</Label>
                      <p className="text-sm">{selectedRules.description || '暂无描述'}</p>
                    </div>
                    <div>
                      <Label>状态</Label>
                      <div className="flex gap-2">
                        {selectedRules.isDefault && (
                          <Badge className="bg-yellow-100 text-yellow-800">默认规则</Badge>
                        )}
                        <Badge variant={selectedRules.isActive ? 'default' : 'secondary'}>
                          {selectedRules.isActive ? '启用' : '禁用'}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* 时间规则 */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    时间安排规则
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-3">
                    <div>
                      <Label>每日课时数</Label>
                      <p className="text-sm">{selectedRules.timeRules.dailyPeriods}节</p>
                    </div>
                    <div>
                      <Label>课时时长</Label>
                      <p className="text-sm">{selectedRules.timeRules.periodDuration}分钟</p>
                    </div>
                    <div>
                      <Label>课间休息</Label>
                      <p className="text-sm">{selectedRules.timeRules.breakDuration}分钟</p>
                    </div>
                    <div>
                      <Label>午休开始</Label>
                      <p className="text-sm">第{selectedRules.timeRules.lunchBreakStart}节课后</p>
                    </div>
                    <div>
                      <Label>午休时长</Label>
                      <p className="text-sm">{selectedRules.timeRules.lunchBreakDuration}分钟</p>
                    </div>
                    <div>
                      <Label>工作日</Label>
                      <p className="text-sm">
                        {selectedRules.timeRules.workingDays.map(day => 
                          WEEKDAY_OPTIONS.find(d => d.value === day)?.label
                        ).join('、')}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* 教师约束 */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    教师工作约束
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-3">
                    <div>
                      <Label>每日最大课时</Label>
                      <p className="text-sm">{selectedRules.teacherConstraints.maxDailyHours}节</p>
                    </div>
                    <div>
                      <Label>最大连续课时</Label>
                      <p className="text-sm">{selectedRules.teacherConstraints.maxContinuousHours}节</p>
                    </div>
                    <div>
                      <Label>课间最小休息</Label>
                      <p className="text-sm">{selectedRules.teacherConstraints.minRestBetweenCourses}节课间隔</p>
                    </div>
                  </div>
                  <Separator className="my-4" />
                  <div className="grid gap-4 md:grid-cols-3">
                    <div>
                      <Label>避免周五下午</Label>
                      <Badge variant={selectedRules.teacherConstraints.avoidFridayAfternoon ? 'default' : 'secondary'}>
                        {selectedRules.teacherConstraints.avoidFridayAfternoon ? '是' : '否'}
                      </Badge>
                    </div>
                    <div>
                      <Label>尊重教师偏好</Label>
                      <Badge variant={selectedRules.teacherConstraints.respectTeacherPreferences ? 'default' : 'secondary'}>
                        {selectedRules.teacherConstraints.respectTeacherPreferences ? '是' : '否'}
                      </Badge>
                    </div>
                    <div>
                      <Label>允许跨年级授课</Label>
                      <Badge variant={selectedRules.teacherConstraints.allowCrossGradeTeaching ? 'default' : 'secondary'}>
                        {selectedRules.teacherConstraints.allowCrossGradeTeaching ? '是' : '否'}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* 教室约束 */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building className="h-5 w-5" />
                    教室使用约束
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <Label>特殊教室优先级</Label>
                      <p className="text-sm">
                        {ROOM_PRIORITY_OPTIONS.find(opt => opt.value === selectedRules.roomConstraints.specialRoomPriority)?.label}
                      </p>
                    </div>
                  </div>
                  <Separator className="my-4" />
                  <div className="grid gap-4 md:grid-cols-3">
                    <div>
                      <Label>遵守容量限制</Label>
                      <Badge variant={selectedRules.roomConstraints.respectCapacityLimits ? 'default' : 'secondary'}>
                        {selectedRules.roomConstraints.respectCapacityLimits ? '是' : '否'}
                      </Badge>
                    </div>
                    <div>
                      <Label>允许教室共享</Label>
                      <Badge variant={selectedRules.roomConstraints.allowRoomSharing ? 'default' : 'secondary'}>
                        {selectedRules.roomConstraints.allowRoomSharing ? '是' : '否'}
                      </Badge>
                    </div>
                    <div>
                      <Label>优先固定教室</Label>
                      <Badge variant={selectedRules.roomConstraints.preferFixedClassrooms ? 'default' : 'secondary'}>
                        {selectedRules.roomConstraints.preferFixedClassrooms ? '是' : '否'}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* 课程安排规则 */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BookOpen className="h-5 w-5" />
                    课程安排规则
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <Label>课程分布策略</Label>
                      <p className="text-sm">
                        {DISTRIBUTION_POLICIES.find(p => p.value === selectedRules.courseArrangementRules.distributionPolicy)?.label}
                      </p>
                    </div>
                    <div>
                      <Label>实验课时间偏好</Label>
                      <p className="text-sm">
                        {TIME_PREFERENCES.find(p => p.value === selectedRules.courseArrangementRules.labCoursePreference)?.label}
                      </p>
                    </div>
                  </div>
                  <Separator className="my-4" />
                  <div className="grid gap-4 md:grid-cols-3">
                    <div>
                      <Label>允许连续课程</Label>
                      <Badge variant={selectedRules.courseArrangementRules.allowContinuousCourses ? 'default' : 'secondary'}>
                        {selectedRules.courseArrangementRules.allowContinuousCourses ? '是' : '否'}
                      </Badge>
                    </div>
                    <div>
                      <Label>核心课程优先</Label>
                      <Badge variant={selectedRules.courseArrangementRules.coreSubjectPriority ? 'default' : 'secondary'}>
                        {selectedRules.courseArrangementRules.coreSubjectPriority ? '是' : '否'}
                      </Badge>
                    </div>
                    {selectedRules.courseArrangementRules.allowContinuousCourses && (
                      <div>
                        <Label>最大连续课时</Label>
                        <p className="text-sm">{selectedRules.courseArrangementRules.maxContinuousHours}节</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* 冲突解决规则 */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5" />
                    冲突解决策略
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-3">
                    <div>
                      <Label>教师冲突处理</Label>
                      <p className="text-sm">
                        {CONFLICT_RESOLUTION_STRATEGIES.find(s => s.value === selectedRules.conflictResolutionRules.teacherConflictResolution)?.label}
                      </p>
                    </div>
                    <div>
                      <Label>教室冲突处理</Label>
                      <p className="text-sm">
                        {CONFLICT_RESOLUTION_STRATEGIES.find(s => s.value === selectedRules.conflictResolutionRules.roomConflictResolution)?.label}
                      </p>
                    </div>
                    <div>
                      <Label>班级冲突处理</Label>
                      <p className="text-sm">
                        {CONFLICT_RESOLUTION_STRATEGIES.find(s => s.value === selectedRules.conflictResolutionRules.classConflictResolution)?.label}
                      </p>
                    </div>
                  </div>
                  <Separator className="my-4" />
                  <div>
                    <Label>允许手动覆盖</Label>
                    <Badge variant={selectedRules.conflictResolutionRules.allowOverride ? 'default' : 'secondary'}>
                      {selectedRules.conflictResolutionRules.allowOverride ? '是' : '否'}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={closeDialogs}>
              关闭
            </Button>
            <Button onClick={() => {
              if (selectedRules) {
                openEditDialog(selectedRules);
              }
            }}>
              编辑规则
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 复制排课规则对话框 */}
      <Dialog open={dialogState.copy} onOpenChange={(open) => 
        setDialogState(prev => ({ ...prev, copy: open }))
      }>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>复制排课规则</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="copy-targetAcademicYear">目标学年 *</Label>
              <Select
                value={copyFormData.targetAcademicYear}
                onValueChange={(value) => setCopyFormData(prev => ({ ...prev, targetAcademicYear: value }))}
              >
                <option value="">请选择学年</option>
                {ACADEMIC_YEAR_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </div>
            
            <div>
              <Label htmlFor="copy-targetSemester">目标学期 *</Label>
              <Select
                value={copyFormData.targetSemester.toString()}
                onValueChange={(value) => setCopyFormData(prev => ({ ...prev, targetSemester: parseInt(value) }))}
              >
                <option value="1">第一学期</option>
                <option value="2">第二学期</option>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="copy-newName">新规则名称 *</Label>
              <Input
                id="copy-newName"
                placeholder="新规则的名称"
                value={copyFormData.newName}
                onChange={(e) => setCopyFormData(prev => ({ ...prev, newName: e.target.value }))}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeDialogs}>
              取消
            </Button>
            <Button 
              onClick={handleCopy}
              disabled={!copyFormData.targetAcademicYear || !copyFormData.newName}
            >
              复制规则
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}