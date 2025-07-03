/**
 * 班级管理页面
 * 
 * 提供班级信息的增删改查功能界面
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { DataTable, TableColumn } from '@/components/ui/data-table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { ImportDialog } from '@/components/ui/import-dialog';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Plus, Search, Filter, Users, GraduationCap, Home, Upload } from 'lucide-react';
import { 
  Class, 
  CreateClassRequest, 
  classApi, 
  Teacher,
  Room,
  teacherApi,
  roomApi,
  formatAcademicYear,
  formatSemester,
  PaginatedResponse 
} from '@/lib/api';
import { formatDateTime } from '@/lib/utils';

/**
 * 班级管理页面组件
 * 
 * Returns:
 *   React.ReactElement: 班级管理页面
 */
export default function ClassesPage() {
  // 状态管理
  const [classes, setClasses] = useState<Class[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });
  
  // 搜索和筛选状态
  const [searchParams, setSearchParams] = useState({
    keyword: '',
    grade: '',
    academicYear: '',
    isActive: '',
  });
  
  // 对话框状态
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<Class | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingClass, setDeletingClass] = useState<Class | null>(null);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  
  // 表单状态
  const [formData, setFormData] = useState<CreateClassRequest>({
    name: '',
    grade: 1,
    studentCount: 30,
    homeroom: '',
    classTeacher: '',
    academicYear: '2024-2025',
    semester: 1,
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  /**
   * 获取班级列表
   */
  const fetchClasses = async () => {
    try {
      setLoading(true);
      const params: Record<string, any> = {
        page: pagination.current,
        limit: pagination.pageSize,
      };
      
      if (searchParams.keyword) params.keyword = searchParams.keyword;
      if (searchParams.grade) params.grade = searchParams.grade;
      if (searchParams.academicYear) params.academicYear = searchParams.academicYear;
      if (searchParams.isActive) params.isActive = searchParams.isActive;
      
      const response = await classApi.getList(params);
      
      if (response.success && response.data) {
        setClasses(response.data.items);
        setPagination(prev => ({
          ...prev,
          total: response.data!.total,
        }));
      }
    } catch (error) {
      console.error('获取班级列表失败:', error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * 获取教师和场室列表用于下拉选择
   */
  const fetchSelectOptions = async () => {
    try {
      const [teachersRes, roomsRes] = await Promise.all([
        teacherApi.getList({ limit: 100 }),
        roomApi.getList({ limit: 100 })
      ]);

      if (teachersRes.success && teachersRes.data) {
        setTeachers(teachersRes.data.items);
      }
      if (roomsRes.success && roomsRes.data) {
        setRooms(roomsRes.data.items);
      }
    } catch (error) {
      console.error('获取选项数据失败:', error);
    }
  };

  // 页面加载时获取数据
  useEffect(() => {
    fetchClasses();
  }, [pagination.current, pagination.pageSize, searchParams]);

  useEffect(() => {
    fetchSelectOptions();
  }, []);

  /**
   * 表格列配置
   */  const columns: TableColumn<Class>[] = [
    {
      key: 'name',
      title: '班级名称',
      dataIndex: 'name',
      render: (value, record) => (
        <div className="flex items-center">
          <div className="flex-shrink-0 h-8 w-8 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center">
            <GraduationCap className="h-4 w-4 text-purple-600 dark:text-purple-400" />
          </div>
          <div className="ml-3">
            <div className="text-sm font-medium">{value}</div>
            <div className="text-xs text-gray-500">{record.grade}年级</div>
          </div>
        </div>
      ),
    },
    {
      key: 'studentCount',
      title: '学生人数',
      dataIndex: 'studentCount',
      render: (value) => (
        <div className="flex items-center text-sm">
          <Users className="h-4 w-4 mr-1 text-gray-400" />
          {value} 人
        </div>
      ),
    },
    {
      key: 'classTeacher',
      title: '班主任',
      dataIndex: 'classTeacher',
      render: (teacher) => teacher ? (
        <div className="text-sm">
          <div className="font-medium">{teacher.name}</div>
          <div className="text-xs text-gray-500">工号: {teacher.employeeId}</div>
        </div>
      ) : (
        <span className="text-gray-400">未分配</span>
      ),
    },
    {
      key: 'homeroom',
      title: '教室',
      dataIndex: 'homeroom',
      render: (room) => room ? (
        <div className="flex items-center text-sm">
          <Home className="h-4 w-4 mr-1 text-gray-400" />
          <div>
            <div className="font-medium">{room.name}</div>
            <div className="text-xs text-gray-500">{room.roomNumber}</div>
          </div>
        </div>
      ) : (
        <span className="text-gray-400">未分配</span>
      ),
    },
    {
      key: 'academicYear',
      title: '学年学期',
      render: (_, record) => (
        <div className="text-sm">
          <div>{formatAcademicYear(record.academicYear)}</div>
          <div className="text-xs text-gray-500">{formatSemester(record.semester)}</div>
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
    fetchClasses();
  };

  /**
   * 重置搜索
   */
  const handleResetSearch = () => {
    setSearchParams({
      keyword: '',
      grade: '',
      academicYear: '',
      isActive: '',
    });
  };

  /**
   * 打开新建对话框
   */
  const handleCreate = () => {
    setEditingClass(null);
    setFormData({
      name: '',
      grade: 1,
      studentCount: 30,
      homeroom: '',
      classTeacher: '',
      academicYear: '2024-2025',
      semester: 1,
    });
    setFormErrors({});
    setDialogOpen(true);
  };

  /**
   * 打开编辑对话框
   */
  const handleEdit = (classItem: Class) => {
    setEditingClass(classItem);
    setFormData({
      name: classItem.name,
      grade: classItem.grade,
      studentCount: classItem.studentCount,
      homeroom: classItem.homeroom?._id || '',
      classTeacher: classItem.classTeacher?._id || '',
      academicYear: classItem.academicYear,
      semester: classItem.semester,
    });
    setFormErrors({});
    setDialogOpen(true);
  };

  /**
   * 打开删除确认对话框
   */
  const handleDelete = (classItem: Class) => {
    setDeletingClass(classItem);
    setDeleteDialogOpen(true);
  };

  /**
   * 表单验证
   */
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.name.trim()) {
      errors.name = '请输入班级名称';
    }

    if (formData.grade < 1 || formData.grade > 12) {
      errors.grade = '年级必须在1-12之间';
    }

    if (formData.studentCount < 1 || formData.studentCount > 60) {
      errors.studentCount = '学生人数必须在1-60之间';
    }

    if (!formData.academicYear.trim()) {
      errors.academicYear = '请输入学年';
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

      const submitData = {
        ...formData,
        homeroom: formData.homeroom || undefined,
        classTeacher: formData.classTeacher || undefined,
      };

      if (editingClass) {
        await classApi.update(editingClass._id, submitData);
      } else {
        await classApi.create(submitData);
      }

      setDialogOpen(false);
      fetchClasses();
    } catch (error) {
      console.error('保存班级失败:', error);
    } finally {
      setSubmitting(false);
    }
  };

  /**
   * 确认删除班级
   */
  const handleConfirmDelete = async () => {
    if (!deletingClass) return;

    try {
      await classApi.delete(deletingClass._id);
      setDeleteDialogOpen(false);
      setDeletingClass(null);
      fetchClasses();
    } catch (error) {
      console.error('删除班级失败:', error);
    }
  };

  /**
   * 处理批量导入
   */
  const handleBatchImport = async (data: CreateClassRequest[]) => {
    try {
      // 批量创建班级
      const promises = data.map(classData => classApi.create(classData));
      await Promise.all(promises);
      
      fetchClasses(); // 重新获取数据
      // TODO: 显示成功提示
    } catch (error) {
      console.error('批量导入失败:', error);
      throw error; // 让导入组件处理错误显示
    }
  };

  // 年级选项
  const gradeOptions = Array.from({ length: 12 }, (_, i) => ({
    value: String(i + 1),
    label: `${i + 1}年级`,
  }));

  // 学年选项
  const academicYearOptions = [
    { value: '2024-2025', label: '2024-2025学年' },
    { value: '2023-2024', label: '2023-2024学年' },
    { value: '2025-2026', label: '2025-2026学年' },
  ];

  return (
    <div className="space-y-6">
      {/* 页面头部 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">班级管理</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            管理班级基本信息、班主任和教室分配
          </p>
        </div>
        <div className="flex space-x-3">
          <Button onClick={handleCreate}>
            <Plus className="h-4 w-4 mr-2" />
            新增班级
          </Button>
          <Button variant="outline" onClick={() => setImportDialogOpen(true)}>
            <Upload className="h-4 w-4 mr-2" />
            批量导入
          </Button>
        </div>
      </div>

      {/* 搜索和筛选栏 */}
      <div className="flex items-center space-x-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="搜索班级名称..."
            value={searchParams.keyword}
            onChange={(e) => setSearchParams(prev => ({ ...prev, keyword: e.target.value }))}
            className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white"
          />
        </div>
        
        <Select
          value={searchParams.grade}
          onValueChange={(value) => setSearchParams(prev => ({ ...prev, grade: value }))}
          options={[{ value: '', label: '全部年级' }, ...gradeOptions]}
          className="w-32"
        />
        
        <Select
          value={searchParams.academicYear}
          onValueChange={(value) => setSearchParams(prev => ({ ...prev, academicYear: value }))}
          options={[{ value: '', label: '全部学年' }, ...academicYearOptions]}
          className="w-40"
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
        
        {(searchParams.keyword || searchParams.grade || searchParams.academicYear || searchParams.isActive) && (
          <Button variant="outline" onClick={handleResetSearch}>
            重置
          </Button>
        )}
      </div>

      {/* 班级列表 */}
      <DataTable
        columns={columns}
        dataSource={classes}
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

      {/* 新建/编辑班级对话框 */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingClass ? '编辑班级' : '新增班级'}
            </DialogTitle>
            <DialogClose onClose={() => setDialogOpen(false)} />
          </DialogHeader>

          <div className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="班级名称"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                error={!!formErrors.name}
                helperText={formErrors.name}
                required
              />
              
              <Select
                label="年级"
                value={String(formData.grade)}
                onValueChange={(value) => setFormData(prev => ({ ...prev, grade: parseInt(value) }))}
                options={gradeOptions}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="学生人数"
                type="number"
                min="1"
                max="60"
                value={formData.studentCount}
                onChange={(e) => setFormData(prev => ({ ...prev, studentCount: parseInt(e.target.value) || 0 }))}
                error={!!formErrors.studentCount}
                helperText={formErrors.studentCount}
                required
              />
              
              <Select
                label="学期"
                value={String(formData.semester)}
                onValueChange={(value) => setFormData(prev => ({ ...prev, semester: parseInt(value) }))}
                options={[
                  { value: '1', label: '上学期' },
                  { value: '2', label: '下学期' },
                ]}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Select
                label="学年"
                value={formData.academicYear}
                onValueChange={(value) => setFormData(prev => ({ ...prev, academicYear: value }))}
                options={academicYearOptions}
                required
              />
              
              <Select
                label="班主任"
                value={formData.classTeacher}
                onValueChange={(value) => setFormData(prev => ({ ...prev, classTeacher: value }))}
                options={[
                  { value: '', label: '请选择班主任' },
                  ...teachers.map(teacher => ({
                    value: teacher._id,
                    label: `${teacher.name} (${teacher.employeeId})`
                  }))
                ]}
              />
            </div>

            <Select
              label="教室"
              value={formData.homeroom}
              onValueChange={(value) => setFormData(prev => ({ ...prev, homeroom: value }))}
              options={[
                { value: '', label: '请选择教室' },
                ...rooms.map(room => ({
                  value: room._id,
                  label: `${room.name} (${room.roomNumber}) - 容量${room.capacity}人`
                }))
              ]}
            />
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
              确定要删除班级 <span className="font-medium">{deletingClass?.name}</span> 吗？
              此操作会将班级设为停用状态，不会永久删除数据。
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
        resourceType="class"
        onImport={handleBatchImport}
      />
    </div>
  );
}