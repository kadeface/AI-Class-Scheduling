/**
 * 用户管理页面
 * 
 * 提供用户的增删改查功能界面
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { DataTable, TableColumn } from '@/components/ui/data-table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Plus, Search, Filter, User, Shield, Mail, Calendar } from 'lucide-react';

// 临时用户数据类型（基于TKS-002的API）
interface User {
  _id: string;
  username: string;
  name: string;
  email: string;
  employeeId?: string;
  role: 'admin' | 'teacher' | 'staff';
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * 用户管理页面组件
 * 
 * Returns:
 *   React.ReactElement: 用户管理页面
 */
export default function UsersPage() {
  // 状态管理
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });

  // 搜索状态
  const [searchParams, setSearchParams] = useState({
    keyword: '',
    role: '',
    isActive: '',
  });

  // 对话框状态
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  // 表单状态
  const [formData, setFormData] = useState({
    username: '',
    name: '',
    email: '',
    employeeId: '',
    role: 'staff' as const,
    password: '',
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  /**
   * 表格列配置
   */
  const columns: TableColumn<User>[] = [
    {
      key: 'user',
      title: '用户信息',
      dataIndex: 'name',
      render: (value, record) => (
        <div className="flex items-center">
          <div className="flex-shrink-0 h-8 w-8 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center">
            <User className="h-4 w-4 text-purple-600 dark:text-purple-400" />
          </div>
          <div className="ml-3">
            <div className="text-sm font-medium">{value}</div>
            <div className="text-xs text-gray-500">@{record.username}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'contact',
      title: '联系信息',
      render: (_, record) => (
        <div className="space-y-1">
          <div className="flex items-center text-sm">
            <Mail className="h-4 w-4 mr-1 text-gray-400" />
            {record.email}
          </div>
          {record.employeeId && (
            <div className="text-xs text-gray-500">
              工号: {record.employeeId}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'role',
      title: '角色',
      dataIndex: 'role',
      render: (value) => {
        const roleMap = {
          admin: { label: '管理员', color: 'red' },
          teacher: { label: '教师', color: 'blue' },
          staff: { label: '职员', color: 'green' },
        };
        const roleInfo = roleMap[value] || { label: '未知', color: 'gray' };
        
        return (
          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-${roleInfo.color}-100 dark:bg-${roleInfo.color}-900 text-${roleInfo.color}-800 dark:text-${roleInfo.color}-200`}>
            <Shield className="h-3 w-3 mr-1" />
            {roleInfo.label}
          </span>
        );
      },
    },
    {
      key: 'status',
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
      render: (value) => (
        <div className="flex items-center text-sm text-gray-500">
          <Calendar className="h-4 w-4 mr-1" />
          {new Date(value).toLocaleDateString('zh-CN')}
        </div>
      ),
    },
  ];

  /**
   * 打开新建对话框
   */
  const handleCreate = () => {
    setEditingUser(null);
    setFormData({
      username: '',
      name: '',
      email: '',
      employeeId: '',
      role: 'staff',
      password: '',
    });
    setFormErrors({});
    setDialogOpen(true);
  };

  /**
   * 打开编辑对话框
   */
  const handleEdit = (user: User) => {
    setEditingUser(user);
    setFormData({
      username: user.username,
      name: user.name,
      email: user.email,
      employeeId: user.employeeId || '',
      role: user.role,
      password: '',
    });
    setFormErrors({});
    setDialogOpen(true);
  };

  /**
   * 模拟删除用户
   */
  const handleDelete = (user: User) => {
    // TODO: 实现删除确认对话框和API调用
    console.log('删除用户:', user);
  };

  /**
   * 表单验证
   */
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.username.trim()) {
      errors.username = '请输入用户名';
    }

    if (!formData.name.trim()) {
      errors.name = '请输入姓名';
    }

    if (!formData.email.trim()) {
      errors.email = '请输入邮箱';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = '邮箱格式不正确';
    }

    if (!editingUser && !formData.password) {
      errors.password = '请输入密码';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  /**
   * 提交表单
   */
  const handleSubmit = async () => {
    if (!validateForm()) return;

    // TODO: 实现API调用
    console.log('保存用户:', formData);
    setDialogOpen(false);
  };

  // 模拟数据（替换为真实API调用）
  useEffect(() => {
    const mockUsers: User[] = [
      {
        _id: '1',
        username: 'admin',
        name: '系统管理员',
        email: 'admin@school.edu',
        role: 'admin',
        isActive: true,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      },
      {
        _id: '2',
        username: 'teacher001',
        name: '张老师',
        email: 'zhang@school.edu',
        employeeId: 'T001',
        role: 'teacher',
        isActive: true,
        createdAt: '2024-01-15T00:00:00Z',
        updatedAt: '2024-01-15T00:00:00Z',
      },
    ];
    
    setUsers(mockUsers);
    setPagination(prev => ({ ...prev, total: mockUsers.length }));
  }, []);

  return (
    <div className="space-y-6">
      {/* 页面头部 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">用户管理</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            管理系统用户账户、角色和权限设置
          </p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="h-4 w-4 mr-2" />
          新增用户
        </Button>
      </div>

      {/* 搜索和筛选栏 */}
      <div className="flex items-center space-x-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="搜索用户名、姓名或邮箱..."
            value={searchParams.keyword}
            onChange={(e) => setSearchParams(prev => ({ ...prev, keyword: e.target.value }))}
            className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white"
          />
        </div>
        
        <Select
          value={searchParams.role}
          onChange={(value) => setSearchParams(prev => ({ ...prev, role: value }))}
          options={[
            { value: '', label: '全部角色' },
            { value: 'admin', label: '管理员' },
            { value: 'teacher', label: '教师' },
            { value: 'staff', label: '职员' },
          ]}
          className="w-32"
        />
        
        <Button variant="outline">
          <Filter className="h-4 w-4 mr-2" />
          筛选
        </Button>
      </div>

      {/* 用户列表 */}
      <DataTable
        columns={columns}
        dataSource={users}
        loading={loading}
        pagination={{
          current: pagination.current,
          pageSize: pagination.pageSize,
          total: pagination.total,
        }}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      {/* 新建/编辑用户对话框 */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingUser ? '编辑用户' : '新增用户'}
            </DialogTitle>
            <DialogClose onClose={() => setDialogOpen(false)} />
          </DialogHeader>

          <div className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="用户名"
                value={formData.username}
                onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                error={!!formErrors.username}
                helperText={formErrors.username}
                required
              />
              
              <Input
                label="姓名"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                error={!!formErrors.name}
                helperText={formErrors.name}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="邮箱"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                error={!!formErrors.email}
                helperText={formErrors.email}
                required
              />
              
              <Input
                label="工号"
                value={formData.employeeId}
                onChange={(e) => setFormData(prev => ({ ...prev, employeeId: e.target.value }))}
                placeholder="可选"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Select
                label="角色"
                value={formData.role}
                onChange={(value) => setFormData(prev => ({ ...prev, role: value as any }))}
                options={[
                  { value: 'admin', label: '管理员' },
                  { value: 'teacher', label: '教师' },
                  { value: 'staff', label: '职员' },
                ]}
                required
              />
              
              <Input
                label={editingUser ? '密码（留空保持不变）' : '密码'}
                type="password"
                value={formData.password}
                onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                error={!!formErrors.password}
                helperText={formErrors.password}
                required={!editingUser}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleSubmit}>
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}