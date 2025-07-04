/**
 * 课程管理页面
 * 
 * 提供课程信息的增删改查功能界面
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { DataTable, TableColumn } from '@/components/ui/data-table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { ImportDialog } from '@/components/ui/import-dialog';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Plus, Search, Filter, BookOpen, Clock, MapPin, Settings, Upload } from 'lucide-react';
import { 
  Course, 
  CreateCourseRequest, 
  courseApi, 
  SUBJECTS,
  ROOM_TYPES,
  EQUIPMENT_TYPES,
  PaginatedResponse 
} from '@/lib/api';
import { formatDateTime, safeTrim } from '@/lib/utils';

/**
 * 课程管理页面组件
 * 
 * Returns:
 *   React.ReactElement: 课程管理页面
 */
export default function CoursesPage() {
  // 状态管理
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });
  
  // 搜索和筛选状态
  const [searchParams, setSearchParams] = useState({
    keyword: '',
    subject: '',
    isActive: 'true',
  });
  
  // 对话框状态
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingCourse, setDeletingCourse] = useState<Course | null>(null);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [clearDialogOpen, setClearDialogOpen] = useState(false);
  const [clearing, setClearing] = useState(false);
  
  // 表单状态
  const [formData, setFormData] = useState<CreateCourseRequest>({
    name: '',
    subject: '',
    courseCode: '',
    weeklyHours: 2,
    requiresContinuous: false,
    continuousHours: 2,
    roomRequirements: {
      types: [],
      capacity: 30,
      equipment: [],
    },
    isWeeklyAlternating: false,
    description: '',
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  /**
   * 获取课程列表
   */
  const fetchCourses = async () => {
    try {
      setLoading(true);
      const params: Record<string, any> = {
        page: pagination.current,
        limit: pagination.pageSize,
      };
      
      if (searchParams.keyword) params.keyword = searchParams.keyword;
      if (searchParams.subject) params.subject = searchParams.subject;
      if (searchParams.isActive) params.isActive = searchParams.isActive;
      
      const response = await courseApi.getList(params);
      
      if (response.success && response.data) {
        setCourses(response.data.items);
        setPagination(prev => ({
          ...prev,
          total: response.data!.total,
        }));
      }
    } catch (error) {
      console.error('获取课程列表失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 页面加载时获取数据
  useEffect(() => {
    fetchCourses();
  }, [pagination.current, pagination.pageSize, searchParams]);

  /**
   * 表格列配置
   */  const columns: TableColumn<Course>[] = [
    {
      key: 'name',
      title: '课程信息',
      dataIndex: 'name',
      render: (value, record) => (
        <div className="flex items-center">
          <div className="flex-shrink-0 h-8 w-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
            <BookOpen className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="ml-3">
            <div className="text-sm font-medium">{value}</div>
            <div className="text-xs text-gray-500">
              {record.courseCode} · {record.subject}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: 'weeklyHours',
      title: '课时设置',
      render: (_, record) => (
        <div className="space-y-1">
          <div className="flex items-center text-sm">
            <Clock className="h-4 w-4 mr-1 text-gray-400" />
            {record.weeklyHours} 课时/周
          </div>
          {record.requiresContinuous && (
            <div className="text-xs text-blue-600 dark:text-blue-400">
              连排 {record.continuousHours} 课时
            </div>
          )}
          {record.isWeeklyAlternating && (
            <div className="text-xs text-green-600 dark:text-green-400">
              双周轮换
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'roomRequirements',
      title: '场地要求',
      dataIndex: 'roomRequirements',
      render: (requirements) => (
        <div className="space-y-1">
          <div className="flex items-center text-sm">
            <MapPin className="h-4 w-4 mr-1 text-gray-400" />
            容量: {requirements.capacity || '不限'}人
          </div>
          {requirements.types.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {requirements.types.slice(0, 2).map((type: any, index: number) => (
                <span
                  key={index}
                  className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200"
                >
                  {type}
                </span>
              ))}
              {requirements.types.length > 2 && (
                <span className="text-xs text-gray-500">
                  +{requirements.types.length - 2}
                </span>
              )}
            </div>
          )}
          {requirements.equipment && requirements.equipment.length > 0 && (
            <div className="text-xs text-gray-500">
              设备: {requirements.equipment.slice(0, 2).join(', ')}
              {requirements.equipment.length > 2 && '...'}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'isActive',
      title: '状态',
      dataIndex: 'isActive',
      render: (value) => (
        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
          value 
            ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
            : 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
        }`}>
          {value ? '启用' : '停用'}
        </span>
      ),
    },
    {
      key: 'createdAt',
      title: '创建时间',
      dataIndex: 'createdAt',
      render: (value) => formatDateTime(value),
    },
  ];

  /**
   * 处理分页变化
   */
  const handlePageChange = (page: number, pageSize: number) => {
    setPagination(prev => ({ ...prev, current: page, pageSize }));
  };

  /**
   * 处理搜索
   */
  const handleSearch = () => {
    setPagination(prev => ({ ...prev, current: 1 }));
    // 强制重新获取数据
    fetchCourses();
  };

  /**
   * 重置搜索
   */
  const handleResetSearch = () => {
    setSearchParams({
      keyword: '',
      subject: '',
      isActive: 'true',
    });
  };

  /**
   * 打开新建对话框
   */
  const handleCreate = () => {
    setEditingCourse(null);
    setFormData({
      name: '',
      subject: '',
      courseCode: '',
      weeklyHours: 2,
      requiresContinuous: false,
      continuousHours: 2,
      roomRequirements: {
        types: [],
        capacity: 30,
        equipment: [],
      },
      isWeeklyAlternating: false,
      description: '',
    });
    setFormErrors({});
    setDialogOpen(true);
  };

  /**
   * 打开编辑对话框
   */
  const handleEdit = (course: Course) => {
    setEditingCourse(course);
    setFormData({
      name: course.name,
      subject: course.subject,
      courseCode: course.courseCode,
      weeklyHours: course.weeklyHours,
      requiresContinuous: course.requiresContinuous,
      continuousHours: course.continuousHours || 2,
      roomRequirements: course.roomRequirements,
      isWeeklyAlternating: course.isWeeklyAlternating,
      description: course.description || '',
    });
    setFormErrors({});
    setDialogOpen(true);
  };

  /**
   * 打开删除确认对话框
   */
  const handleDelete = (course: Course) => {
    setDeletingCourse(course);
    setDeleteDialogOpen(true);
  };

  /**
   * 表单验证
   */
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!safeTrim(formData.name)) {
      errors.name = '请输入课程名称';
    }

    if (!formData.subject) {
      errors.subject = '请选择学科';
    }

    if (!formData.courseCode.trim()) {
      errors.courseCode = '请输入课程代码';
    }

    if (isNaN(formData.weeklyHours) || formData.weeklyHours < 1 || formData.weeklyHours > 20) {
      errors.weeklyHours = '周课时必须在1-20之间';
    }

    if (formData.requiresContinuous) {
      if (
        formData.continuousHours === undefined ||
        isNaN(formData.continuousHours) ||
        formData.continuousHours < 2
      ) {
        errors.continuousHours = '连排课时必须至少2课时';
      }
    }

    if (
      formData.roomRequirements.capacity === undefined ||
      isNaN(formData.roomRequirements.capacity) ||
      formData.roomRequirements.capacity < 1 ||
      formData.roomRequirements.capacity > 200
    ) {
      errors.capacity = '容量要求必须在1-200之间';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  /**
   * 提交表单
   */
  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      setSubmitting(true);

      if (editingCourse) {
        await courseApi.update(editingCourse._id, formData);
      } else {
        await courseApi.create(formData);
      }

      setDialogOpen(false);
      fetchCourses();
    } catch (error) {
      console.error('保存课程失败:', error);
    } finally {
      setSubmitting(false);
    }
  };

  /**
   * 确认删除课程
   */
  const handleConfirmDelete = async () => {
    if (!deletingCourse) return;

    try {
      await courseApi.delete(deletingCourse._id);
      setDeleteDialogOpen(false);
      setDeletingCourse(null);
      fetchCourses();
    } catch (error) {
      console.error('删除课程失败:', error);
    }
  };

  /**
   * 处理批量导入
   */
  const handleBatchImport = async () => {
    // 这里什么都不用做，或者只刷新课程列表
    fetchCourses();
  };

  /**
   * 处理场地类型选择
   */
  const handleRoomTypeToggle = (type: string) => {
    const newTypes = formData.roomRequirements.types.includes(type)
      ? formData.roomRequirements.types.filter(t => t !== type)
      : [...formData.roomRequirements.types, type];
    
    setFormData(prev => ({
      ...prev,
      roomRequirements: {
        ...prev.roomRequirements,
        types: newTypes,
      },
    }));
  };

  /**
   * 处理设备要求选择
   */
  const handleEquipmentToggle = (equipment: string) => {
    const newEquipment = formData.roomRequirements.equipment?.includes(equipment)
      ? formData.roomRequirements.equipment.filter(e => e !== equipment)
      : [...(formData.roomRequirements.equipment || []), equipment];
    
    setFormData(prev => ({
      ...prev,
      roomRequirements: {
        ...prev.roomRequirements,
        equipment: newEquipment,
      },
    }));
  };

  // 一键清除处理函数
  const handleClearAll = async () => {
    setClearing(true);
    try {
      console.log('handleClearAll called');
      const res = await fetch('/api/import/courses/clear', { method: 'POST' });
      const data = await res.json();
      console.log('清空返回:', data);
      if (data.success) {
        alert('已清空全部课程数据');
        fetchCourses(); // 刷新列表
      } else {
        alert(data.message || '清空失败');
      }
    } catch (err) {
      console.error('清空异常:', err);
      alert('清空失败，请重试');
    } finally {
      setClearing(false);
      setClearDialogOpen(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 页面头部 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">课程管理</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            管理课程基本信息、课时安排和场地要求
          </p>
        </div>
        <div className="flex space-x-3">
          <Button onClick={handleCreate}>
            <Plus className="h-4 w-4 mr-2" />
            新增课程
          </Button>
          <Button variant="outline" onClick={() => setImportDialogOpen(true)}>
            <Upload className="h-4 w-4 mr-2" />
            批量导入
          </Button>
          <Button variant="destructive" onClick={() => setClearDialogOpen(true)}>
            一键清除全部
          </Button>
        </div>
      </div>

      {/* 搜索和筛选栏 */}
      <div className="flex items-center space-x-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="搜索课程名称、代码..."
            value={searchParams.keyword}
            onChange={(e) => setSearchParams(prev => ({ ...prev, keyword: e.target.value }))}
            className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white"
          />
        </div>
        
        <Select
          value={searchParams.subject}
          onValueChange={(value) => setSearchParams(prev => ({ ...prev, subject: value }))}
          options={[
            { value: '', label: '全部学科' },
            ...SUBJECTS.map(subject => ({ value: subject, label: subject }))
          ]}
          className="w-32"
        />
        
        <Select
          value={searchParams.isActive}
          onValueChange={(value) => setSearchParams(prev => ({ ...prev, isActive: value }))}
          options={[
            { value: '', label: '全部状态' },
            { value: 'true', label: '启用' },
            { value: 'false', label: '停用' },
          ]}
          className="w-32"
        />
        
        <Button variant="outline" onClick={handleSearch}>
          <Filter className="h-4 w-4 mr-2" />
          搜索
        </Button>
        
        {(searchParams.keyword || searchParams.subject || searchParams.isActive) && (
          <Button variant="outline" onClick={handleResetSearch}>
            重置
          </Button>
        )}
      </div>

      {/* 课程列表 */}
      <DataTable
        columns={columns}
        dataSource={courses}
        loading={loading}
        pagination={{
          current: pagination.current,
          pageSize: pagination.pageSize,
          total: pagination.total,
        }}
        onPageChange={handlePageChange}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      {/* 新建/编辑课程对话框 */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingCourse ? '编辑课程' : '新增课程'}
            </DialogTitle>
            <DialogClose onClose={() => setDialogOpen(false)} />
          </DialogHeader>

          <div className="p-6 space-y-6">
            {/* 基本信息 */}
            <div>
              <h3 className="text-lg font-medium mb-4 flex items-center">
                <BookOpen className="h-5 w-5 mr-2" />
                基本信息
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="课程名称"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  error={!!formErrors.name}
                  helperText={formErrors.name}
                  required
                />
                
                <Input
                  label="课程代码"
                  value={formData.courseCode}
                  onChange={(e) => setFormData(prev => ({ ...prev, courseCode: e.target.value }))}
                  error={!!formErrors.courseCode}
                  helperText={formErrors.courseCode}
                  required
                />

                              <Select
                label="学科"
                value={formData.subject}
                onValueChange={(value) => setFormData(prev => ({ ...prev, subject: value }))}
                options={SUBJECTS.map(subject => ({ value: subject, label: subject }))}
                error={!!formErrors.subject}
                helperText={formErrors.subject}
                required
              />

                <Input
                  label="周课时数"
                  type="number"
                  min="1"
                  max="20"
                  value={formData.weeklyHours}
                  onChange={(e) => setFormData(prev => ({ ...prev, weeklyHours: parseInt(e.target.value) || 0 }))}
                  error={!!formErrors.weeklyHours}
                  helperText={formErrors.weeklyHours}
                  required
                />
              </div>

              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  课程描述
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
                  placeholder="输入课程描述..."
                />
              </div>
            </div>

            {/* 课时设置 */}
            <div>
              <h3 className="text-lg font-medium mb-4 flex items-center">
                <Clock className="h-5 w-5 mr-2" />
                课时设置
              </h3>
              <div className="space-y-4">
                <div className="flex items-center space-x-4">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.requiresContinuous}
                      onChange={(e) => setFormData(prev => ({ ...prev, requiresContinuous: e.target.checked }))}
                      className="mr-2"
                    />
                    <span className="text-sm">需要连排</span>
                  </label>
                  
                  {formData.requiresContinuous && (
                    <Input
                      label="连排课时数"
                      type="number"
                      min="2"
                      max="6"
                      value={formData.continuousHours}
                      onChange={(e) => setFormData(prev => ({ ...prev, continuousHours: parseInt(e.target.value) || 0 }))}
                      error={!!formErrors.continuousHours}
                      helperText={formErrors.continuousHours}
                      className="w-32"
                    />
                  )}
                </div>

                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.isWeeklyAlternating}
                    onChange={(e) => setFormData(prev => ({ ...prev, isWeeklyAlternating: e.target.checked }))}
                    className="mr-2"
                  />
                  <span className="text-sm">双周轮换课程</span>
                </label>
              </div>
            </div>

            {/* 场地要求 */}
            <div>
              <h3 className="text-lg font-medium mb-4 flex items-center">
                <MapPin className="h-5 w-5 mr-2" />
                场地要求
              </h3>
              
              <div className="space-y-4">
                <Input
                  label="容量要求（人数）"
                  type="number"
                  min="1"
                  max="200"
                  value={formData.roomRequirements.capacity || ''}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    roomRequirements: {
                      ...prev.roomRequirements,
                      capacity: parseInt(e.target.value) || undefined,
                    },
                  }))}
                  error={!!formErrors.capacity}
                  helperText={formErrors.capacity}
                  placeholder="留空表示无要求"
                />

                {/* 教室类型要求 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    教室类型要求
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {ROOM_TYPES.map((type) => (
                      <label
                        key={type}
                        className="flex items-center p-2 border rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700"
                      >
                        <input
                          type="checkbox"
                          checked={formData.roomRequirements.types.includes(type)}
                          onChange={() => handleRoomTypeToggle(type)}
                          className="mr-2"
                        />
                        <span className="text-sm">{type}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* 设备要求 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    设备要求
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {EQUIPMENT_TYPES.map((equipment) => (
                      <label
                        key={equipment}
                        className="flex items-center p-2 border rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700"
                      >
                        <input
                          type="checkbox"
                          checked={formData.roomRequirements.equipment?.includes(equipment) || false}
                          onChange={() => handleEquipmentToggle(equipment)}
                          className="mr-2"
                        />
                        <span className="text-sm">{equipment}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting ? '保存中...' : '保存'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 删除确认对话框 */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认删除</DialogTitle>
            <DialogClose onClose={() => setDeleteDialogOpen(false)} />
          </DialogHeader>

          <div className="p-6">
            <p className="text-gray-600 dark:text-gray-400">
              确定要删除课程 <span className="font-medium">{deletingCourse?.name}</span> 吗？
              此操作会将课程设为停用状态，不会永久删除数据。
            </p>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              取消
            </Button>
            <Button 
              onClick={handleConfirmDelete}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              确认删除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 批量导入对话框 */}
      <ImportDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
        resourceType="course"
        onImport={handleBatchImport}
      />

      {/* 二次确认对话框 */}
      <Dialog open={clearDialogOpen} onOpenChange={setClearDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>危险操作：清空全部课程数据</DialogTitle>
          </DialogHeader>
          <div className="py-4 text-red-600">
            此操作将删除所有课程数据，且不可恢复。确定要继续吗？
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setClearDialogOpen(false)}>
              取消
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleClearAll}
              disabled={clearing}
            >
              {clearing ? '正在清空...' : '确认清空'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}