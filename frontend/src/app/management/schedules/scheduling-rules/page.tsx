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
  WEEKDAY_OPTIONS
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
                      <Input
                        id="academicYear"
                        placeholder="如：2024-2025"
                        value={formData.academicYear}
                        onChange={(e) => setFormData(prev => ({ ...prev, academicYear: e.target.value }))}
                      />
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

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setDialogState(prev => ({ ...prev, create: false }))}
            >
              取消
            </Button>
            <Button 
              onClick={handleCreate}
              disabled={!formData.name || !formData.academicYear}
            >
              创建排课规则
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
                      <Input
                        id="edit-academicYear"
                        placeholder="如：2024-2025"
                        value={formData.academicYear}
                        onChange={(e) => setFormData(prev => ({ ...prev, academicYear: e.target.value }))}
                      />
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

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={closeDialogs}
            >
              取消
            </Button>
            <Button 
              onClick={handleUpdate}
              disabled={!formData.name || !formData.academicYear}
            >
              保存修改
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
              <Input
                id="copy-targetAcademicYear"
                placeholder="如：2025-2026"
                value={copyFormData.targetAcademicYear}
                onChange={(e) => setCopyFormData(prev => ({ ...prev, targetAcademicYear: e.target.value }))}
              />
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