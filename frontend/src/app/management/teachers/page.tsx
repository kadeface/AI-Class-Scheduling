/**
 * 教师管理页面
 * 
 * 提供教师信息的增删改查功能界面
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { DataTable, TableColumn } from '@/components/ui/data-table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { ImportDialog } from '@/components/ui/import-dialog';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Plus, Search, Filter, User, BookOpen, Clock, Upload } from 'lucide-react';
import { 
  Teacher, 
  CreateTeacherRequest, 
  teacherApi, 
  SUBJECTS, 
  formatTimeSlot,
  PaginatedResponse 
} from '@/lib/api';
import { formatDateTime, safeTrim } from '@/lib/utils';

/**
 * 教师管理页面组件
 * 
 * Returns:
 *   React.ReactElement: 教师管理页面
 */
export default function TeachersPage() {
  // 状态管理
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });
  
  // 搜索和筛选状态
  const [searchParams, setSearchParams] = useState({
    keyword: '',
    subjects: '',
    isActive: '',
  });
  
  // 对话框状态
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingTeacher, setDeletingTeacher] = useState<Teacher | null>(null);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [clearDialogOpen, setClearDialogOpen] = useState(false);
  const [clearing, setClearing] = useState(false);
  
  // 表单状态
  const [formData, setFormData] = useState<CreateTeacherRequest>({
    name: '',
    employeeId: '',
    department: '',
    position: '',
    subjects: [],
    maxWeeklyHours: 20,
    status: 'active',
    unavailableSlots: [],
    preferences: {},
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  /**
   * 获取教师列表
   */
  const fetchTeachers = async () => {
    try {
      setLoading(true);
      const params: Record<string, any> = {
        page: pagination.current,
        limit: pagination.pageSize,
      };
      
      if (searchParams.keyword) params.keyword = searchParams.keyword;
      if (searchParams.subjects) params.subjects = searchParams.subjects;
      if (searchParams.isActive) params.isActive = searchParams.isActive;
      
      const response = await teacherApi.getList(params);
      
      if (response.success && response.data) {
        setTeachers(response.data.items);
        setPagination(prev => ({
          ...prev,
          total: response.data!.total,
        }));
      }
    } catch (error) {
      console.error('获取教师列表失败:', error);
      // TODO: 显示错误提示
    } finally {
      setLoading(false);
    }
  };

  // 页面加载时获取数据
  useEffect(() => {
    fetchTeachers();
  }, [pagination.current, pagination.pageSize, searchParams]);

  /**
   * 表格列配置
   */  const columns: TableColumn<Teacher>[] = [
    {
      key: 'name',
      title: '姓名',
      dataIndex: 'name',
      render: (value, record) => (
        <div className="flex items-center">
          <div className="flex-shrink-0 h-8 w-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
            <User className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="ml-3">
            <div className="text-sm font-medium">{value}</div>
            <div className="text-xs text-gray-500">工号: {record.employeeId}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'subjects',
      title: '任教学科',
      dataIndex: 'subjects',
      render: (subjects: string[]) => (
        <div className="flex flex-wrap gap-1">
          {subjects.map((subject, index) => (
            <span
              key={index}
              className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200"
            >
              <BookOpen className="h-3 w-3 mr-1" />
              {subject}
            </span>
          ))}
        </div>
      ),
    },
    {
      key: 'maxWeeklyHours',
      title: '周最大课时',
      dataIndex: 'maxWeeklyHours',
      render: (value) => (
        <div className="flex items-center text-sm">
          <Clock className="h-4 w-4 mr-1 text-gray-400" />
          {value} 课时/周
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
          {value ? '活跃' : '停用'}
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
    fetchTeachers();
  };

  /**
   * 重置搜索
   */
  const handleResetSearch = () => {
    setSearchParams({
      keyword: '',
      subjects: '',
      isActive: '',
    });
  };

  /**
   * 打开新建对话框
   */
  const handleCreate = () => {
    setEditingTeacher(null);
    setFormData({
      name: '',
      employeeId: '',
      department: '',
      position: '',
      subjects: [],
      maxWeeklyHours: 20,
      status: 'active',
      unavailableSlots: [],
      preferences: {},
    });
    setFormErrors({});
    setDialogOpen(true);
  };

  /**
   * 打开编辑对话框
   */
  const handleEdit = (teacher: Teacher) => {
    setEditingTeacher(teacher);
    setFormData({
      name: teacher.name,
      employeeId: teacher.employeeId,
      department: teacher.department,
      position: teacher.position,
      subjects: teacher.subjects,
      maxWeeklyHours: teacher.maxWeeklyHours,
      status: teacher.status,
      unavailableSlots: teacher.unavailableSlots,
      preferences: teacher.preferences,
    });
    setFormErrors({});
    setDialogOpen(true);
  };

  /**
   * 打开删除确认对话框
   */
  const handleDelete = (teacher: Teacher) => {
    setDeletingTeacher(teacher);
    setDeleteDialogOpen(true);
  };

  /**
   * 表单验证
   */
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!safeTrim(formData.name)) {
      errors.name = '请输入教师姓名';
    }

    if (!safeTrim(formData.employeeId)) {
      errors.employeeId = '请输入工号';
    }

    if (formData.subjects.length === 0) {
      errors.subjects = '请选择至少一个任教学科';
    }

    if (isNaN(formData.maxWeeklyHours) || formData.maxWeeklyHours < 1 || formData.maxWeeklyHours > 40) {
      errors.maxWeeklyHours = '周最大课时必须在1-40之间';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  /**
   * 提交表单
   */  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      setSubmitting(true);

      if (editingTeacher) {
        // 更新教师
        await teacherApi.update(editingTeacher._id, formData);
      } else {
        // 创建教师
        await teacherApi.create(formData);
      }

      setDialogOpen(false);
      fetchTeachers(); // 重新获取数据
      // TODO: 显示成功提示
    } catch (error) {
      console.error('保存教师失败:', error);
      // TODO: 显示错误提示
    } finally {
      setSubmitting(false);
    }
  };

  /**
   * 确认删除教师
   */
  const handleConfirmDelete = async () => {
    if (!deletingTeacher) return;

    try {
      await teacherApi.delete(deletingTeacher._id);
      setDeleteDialogOpen(false);
      setDeletingTeacher(null);
      fetchTeachers(); // 重新获取数据
      // TODO: 显示成功提示
    } catch (error) {
      console.error('删除教师失败:', error);
      // TODO: 显示错误提示
    }
  };

  /**
   * 处理批量导入
   */
  const handleBatchImport = async (data: CreateTeacherRequest[]) => {
    try {
      // 批量创建教师
      const promises = data.map(teacherData => teacherApi.create(teacherData));
      await Promise.all(promises);
      
      fetchTeachers(); // 重新获取数据
      // TODO: 显示成功提示
    } catch (error) {
      console.error('批量导入失败:', error);
      throw error; // 让导入组件处理错误显示
    }
  };

  /**
   * 处理学科选择
   */
  const handleSubjectToggle = (subject: string) => {
    const newSubjects = formData.subjects.includes(subject)
      ? formData.subjects.filter(s => s !== subject)
      : [...formData.subjects, subject];
    
    setFormData(prev => ({ ...prev, subjects: newSubjects }));
  };

  // 一键清除处理函数
  const handleClearAll = async () => {
    setClearing(true);
    try {
      // 调用后端清空接口
      const res = await fetch('/api/import/teachers/clear', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        alert('已清空全部教师数据');
        // 这里可以触发刷新列表
      } else {
        alert(data.message || '清空失败');
      }
    } catch (err) {
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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">教师管理</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            管理教师基本信息、任教课程和课时安排
          </p>
        </div>
        <div className="flex space-x-3">
          <Button onClick={handleCreate}>
            <Plus className="h-4 w-4 mr-2" />
            新增教师
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
            placeholder="搜索教师姓名、工号..."
            value={searchParams.keyword}
            onChange={(e) => setSearchParams(prev => ({ ...prev, keyword: e.target.value }))}
            className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white"
          />
        </div>
        
        <Select
          value={searchParams.subjects}
          onValueChange={(value) => setSearchParams(prev => ({ ...prev, subjects: value }))}
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
            { value: 'true', label: '活跃' },
            { value: 'false', label: '停用' },
          ]}
          className="w-32"
        />
        
        <Button variant="outline" onClick={handleSearch}>
          <Filter className="h-4 w-4 mr-2" />
          搜索
        </Button>
        
        {(searchParams.keyword || searchParams.subjects || searchParams.isActive) && (
          <Button variant="outline" onClick={handleResetSearch}>
            重置
          </Button>
        )}
      </div>

      {/* 教师列表 */}
      <DataTable
        columns={columns}
        dataSource={teachers}
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

      {/* 新建/编辑教师对话框 */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingTeacher ? '编辑教师' : '新增教师'}
            </DialogTitle>
            <DialogClose onClose={() => setDialogOpen(false)} />
          </DialogHeader>

          <div className="p-6 space-y-4 max-h-96 overflow-y-auto">
            {/* 基本信息 */}
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="教师姓名"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                error={!!formErrors.name}
                helperText={formErrors.name}
                required
              />
              
              <Input
                label="工号"
                value={formData.employeeId}
                onChange={(e) => setFormData(prev => ({ ...prev, employeeId: e.target.value }))}
                error={!!formErrors.employeeId}
                helperText={formErrors.employeeId}
                required
              />
            </div>

            <Input
              label="周最大课时"
              type="number"
              min="1"
              max="40"
              value={formData.maxWeeklyHours}
              onChange={(e) => setFormData(prev => ({ ...prev, maxWeeklyHours: parseInt(e.target.value) || 0 }))}
              error={!!formErrors.maxWeeklyHours}
              helperText={formErrors.maxWeeklyHours}
              required
            />

            {/* 任教学科 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                任教学科 <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-4 gap-2">
                {SUBJECTS.map((subject) => (
                  <label
                    key={subject}
                    className="flex items-center p-2 border rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    <input
                      type="checkbox"
                      checked={formData.subjects.includes(subject)}
                      onChange={() => handleSubjectToggle(subject)}
                      className="mr-2"
                    />
                    <span className="text-sm">{subject}</span>
                  </label>
                ))}
              </div>
              {formErrors.subjects && (
                <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                  {formErrors.subjects}
                </p>
              )}
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
              确定要删除教师 <span className="font-medium">{deletingTeacher?.name}</span> 吗？
              此操作会将教师设为停用状态，不会永久删除数据。
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
        resourceType="teacher"
        onImport={handleBatchImport}
      />

      {/* 二次确认对话框 */}
      <Dialog open={clearDialogOpen} onOpenChange={setClearDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>危险操作：清空全部教师数据</DialogTitle>
          </DialogHeader>
          <div className="py-4 text-red-600">
            此操作将删除所有教师数据，且不可恢复。确定要继续吗？
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