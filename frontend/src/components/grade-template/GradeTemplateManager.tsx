'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Plus, 
  Edit, 
  Copy, 
  Trash2, 
  Star, 
  StarOff,
  BookOpen,
  Users,
  Clock
} from 'lucide-react';
import { 
  GradeTemplate, 
  GRADE_OPTIONS,
  COURSE_PRIORITY_OPTIONS 
} from '@/types/grade-template';
import { gradeTemplateApi } from '@/lib/grade-template-api';
import { GradeTemplateForm } from './GradeTemplateForm';
import { GradeTemplateView } from './GradeTemplateView';

/**
 * 年级课程模板管理组件
 * 
 * 提供模板的查看、创建、编辑、删除等功能
 */
export const GradeTemplateManager: React.FC = () => {
  const [templates, setTemplates] = useState<GradeTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState<GradeTemplate | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showView, setShowView] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<GradeTemplate | null>(null);
  const [selectedGrade, setSelectedGrade] = useState<string>('');

  /**
   * 获取模板列表
   */
  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (selectedGrade) params.grade = selectedGrade;
      
      const response = await gradeTemplateApi.getList(params);
      if (response.success) {
        setTemplates(response.data);
      } else {
        console.error('获取模板列表失败:', response.error);
      }
    } catch (error) {
      console.error('获取模板列表失败:', error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * 创建新模板
   */
  const handleCreate = () => {
    setEditingTemplate(null);
    setShowForm(true);
  };

  /**
   * 编辑模板
   */
  const handleEdit = (template: GradeTemplate) => {
    setEditingTemplate(template);
    setShowForm(true);
  };

  /**
   * 查看模板详情
   */
  const handleView = (template: GradeTemplate) => {
    setSelectedTemplate(template);
    setShowView(true);
  };

  /**
   * 删除模板
   */
  const handleDelete = async (template: GradeTemplate) => {
    if (!confirm(`确定要删除模板"${template.name}"吗？`)) {
      return;
    }

    try {
      const response = await gradeTemplateApi.delete(template._id);
      if (response.success) {
        await fetchTemplates();
      } else {
        alert(`删除失败: ${response.error}`);
      }
    } catch (error) {
      console.error('删除模板失败:', error);
      alert('删除模板失败');
    }
  };

  /**
   * 设置默认模板
   */
  const handleSetDefault = async (template: GradeTemplate) => {
    try {
      const response = await gradeTemplateApi.setDefault(template._id);
      if (response.success) {
        await fetchTemplates();
      } else {
        alert(`设置默认模板失败: ${response.error}`);
      }
    } catch (error) {
      console.error('设置默认模板失败:', error);
      alert('设置默认模板失败');
    }
  };

  /**
   * 复制模板
   */
  const handleCopy = async (template: GradeTemplate) => {
    const newName = prompt('请输入新模板名称:', `${template.name} - 副本`);
    if (!newName) return;

    try {
      const response = await gradeTemplateApi.copy(template._id, { newName });
      if (response.success) {
        await fetchTemplates();
        alert('复制模板成功');
      } else {
        alert(`复制模板失败: ${response.error}`);
      }
    } catch (error) {
      console.error('复制模板失败:', error);
      alert('复制模板失败');
    }
  };

  /**
   * 表单提交完成后的处理
   */
  const handleFormSubmit = async () => {
    setShowForm(false);
    setEditingTemplate(null);
    await fetchTemplates();
  };

  /**
   * 获取优先级标签颜色
   */
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'core':
        return 'bg-red-100 text-red-800';
      case 'elective':
        return 'bg-blue-100 text-blue-800';
      case 'activity':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  /**
   * 获取优先级标签文本
   */
  const getPriorityLabel = (priority: string) => {
    const option = COURSE_PRIORITY_OPTIONS.find(opt => opt.value === priority);
    return option ? option.label : priority;
  };

  useEffect(() => {
    fetchTemplates();
  }, [selectedGrade]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">加载中...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 头部操作区 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">年级课程模板管理</h2>
          <p className="text-gray-600">管理各年级的标准课程配置模板</p>
        </div>
        <Button onClick={handleCreate} className="gap-2">
          <Plus className="h-4 w-4" />
          新建模板
        </Button>
      </div>

      {/* 筛选器 */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700">年级筛选</label>
              <select
                value={selectedGrade}
                onChange={(e) => setSelectedGrade(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              >
                <option value="">全部年级</option>
                {GRADE_OPTIONS.map(grade => (
                  <option key={grade.value} value={grade.value}>
                    {grade.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 模板列表 */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {templates.map((template) => (
          <Card key={template._id} className="hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-lg flex items-center gap-2">
                    {template.name}
                    {template.isDefault && (
                      <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                        <Star className="h-3 w-3 mr-1" />
                        默认
                      </Badge>
                    )}
                  </CardTitle>
                  <CardDescription className="text-sm">
                    {template.grade} • {template.courses.length}门课程
                  </CardDescription>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleView(template)}
                    title="查看详情"
                  >
                    <BookOpen className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEdit(template)}
                    title="编辑模板"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleCopy(template)}
                    title="复制模板"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(template)}
                    title="删除模板"
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <p className="text-sm text-gray-600">{template.description || '暂无描述'}</p>
                
                {/* 课程概览 */}
                <div className="space-y-2">
                  <div className="text-sm font-medium text-gray-700">课程配置</div>
                  <div className="grid grid-cols-2 gap-2">
                    {template.courses.slice(0, 4).map((course, index) => (
                      <div key={index} className="flex items-center gap-2 text-xs">
                        <Badge 
                          variant="outline" 
                          className={getPriorityColor(course.priority)}
                        >
                          {getPriorityLabel(course.priority)}
                        </Badge>
                        <span className="truncate">{course.courseName}</span>
                        <span className="text-gray-500">{course.weeklyHours}课时</span>
                      </div>
                    ))}
                    {template.courses.length > 4 && (
                      <div className="text-xs text-gray-500">
                        还有 {template.courses.length - 4} 门课程...
                      </div>
                    )}
                  </div>
                </div>

                {/* 操作按钮 */}
                <div className="flex items-center gap-2 pt-2">
                  {!template.isDefault && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSetDefault(template)}
                      className="text-xs"
                    >
                      <Star className="h-3 w-3 mr-1" />
                      设为默认
                    </Button>
                  )}
                  <div className="text-xs text-gray-500 ml-auto">
                    创建于 {new Date(template.createdAt).toLocaleDateString()}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 空状态 */}
      {templates.length === 0 && (
        <Card>
          <CardContent className="pt-12 pb-12">
            <div className="text-center">
              <BookOpen className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">暂无模板</h3>
              <p className="mt-1 text-sm text-gray-500">
                {selectedGrade ? `还没有为${selectedGrade}创建课程模板` : '还没有创建任何课程模板'}
              </p>
              <div className="mt-6">
                <Button onClick={handleCreate}>
                  <Plus className="h-4 w-4 mr-2" />
                  创建第一个模板
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 模板表单对话框 */}
      {showForm && (
        <GradeTemplateForm
          template={editingTemplate}
          onClose={() => {
            setShowForm(false);
            setEditingTemplate(null);
          }}
          onSubmit={handleFormSubmit}
        />
      )}

      {/* 模板详情对话框 */}
      {showView && selectedTemplate && (
        <GradeTemplateView
          template={selectedTemplate}
          onClose={() => {
            setShowView(false);
            setSelectedTemplate(null);
          }}
        />
      )}
    </div>
  );
};
