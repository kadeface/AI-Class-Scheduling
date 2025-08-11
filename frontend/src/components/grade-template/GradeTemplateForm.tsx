'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@radix-ui/react-select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Plus, 
  Trash2, 
  Clock, 
  Calendar,
  BookOpen,
  AlertCircle
} from 'lucide-react';
import { 
  GradeTemplate, 
  StandardCourse, 
  TimeSlot,
  GRADE_OPTIONS,
  COURSE_PRIORITY_OPTIONS,
  CreateGradeTemplateRequest,
  UpdateGradeTemplateRequest
} from '@/types/grade-template';
import { gradeTemplateApi } from '@/lib/grade-template-api';
import { courseApi } from '@/lib/api';

/**
 * 年级课程模板表单组件
 * 
 * 用于创建和编辑年级课程模板
 */
interface GradeTemplateFormProps {
  template?: GradeTemplate | null;
  onClose: () => void;
  onSubmit: () => void;
}

export const GradeTemplateForm: React.FC<GradeTemplateFormProps> = ({
  template,
  onClose,
  onSubmit
}) => {
  const [formData, setFormData] = useState<CreateGradeTemplateRequest>({
    grade: '',
    name: '',
    description: '',
    courses: [],
    isDefault: false
  });
  const [loading, setLoading] = useState(false);
  const [courses, setCourses] = useState<any[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  /**
   * 初始化表单数据
   */
  useEffect(() => {
    if (template) {
      setFormData({
        grade: template.grade,
        name: template.name,
        description: template.description,
        courses: template.courses,
        isDefault: template.isDefault
      });
    }
  }, [template]);

  /**
   * 获取课程列表
   */
  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const response = await courseApi.getList();
        if (response.success && response.data) {
          setCourses(response.data.items);
        }
      } catch (error) {
        console.error('获取课程列表失败:', error);
      }
    };
    fetchCourses();
  }, []);

  /**
   * 验证表单
   */
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.grade) {
      newErrors.grade = '请选择年级';
    }
    if (!formData.name.trim()) {
      newErrors.name = '请输入模板名称';
    }
    if (formData.courses.length === 0) {
      newErrors.courses = '请至少添加一门课程';
    }

    // 验证课程配置
    formData.courses.forEach((course, index) => {
      if (!course.courseId) {
        newErrors[`courses.${index}.courseId`] = '请选择课程';
      }
      if (!course.courseName.trim()) {
        newErrors[`courses.${index}.courseName`] = '请输入课程名称';
      }
      if (!course.weeklyHours || course.weeklyHours < 1) {
        newErrors[`courses.${index}.weeklyHours`] = '请输入有效的周课时数';
      }
      if (course.requiresContinuous && (!course.continuousHours || course.continuousHours < 2)) {
        newErrors[`courses.${index}.continuousHours`] = '连续课时数至少为2';
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /**
   * 提交表单
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);
      
      if (template) {
        // 更新模板
        const updateData: UpdateGradeTemplateRequest = {
          name: formData.name,
          description: formData.description,
          courses: formData.courses,
          isDefault: formData.isDefault
        };
        const response = await gradeTemplateApi.update(template._id, updateData);
        if (response.success) {
          alert('更新模板成功');
          onSubmit();
        } else {
          alert(`更新失败: ${response.error}`);
        }
      } else {
        // 创建新模板
        const response = await gradeTemplateApi.create(formData);
        if (response.success) {
          alert('创建模板成功');
          onSubmit();
        } else {
          alert(`创建失败: ${response.error}`);
        }
      }
    } catch (error) {
      console.error('提交表单失败:', error);
      alert('操作失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  /**
   * 添加课程
   */
  const addCourse = () => {
    const newCourse: StandardCourse = {
      courseId: '',
      courseName: '',
      weeklyHours: 1,
      priority: 'core',
      requiresContinuous: false,
      continuousHours: 2,
      preferredTimeSlots: [],
      avoidTimeSlots: [],
      notes: ''
    };
    setFormData(prev => ({
      ...prev,
      courses: [...prev.courses, newCourse]
    }));
  };

  /**
   * 删除课程
   */
  const removeCourse = (index: number) => {
    setFormData(prev => ({
      ...prev,
      courses: prev.courses.filter((_, i) => i !== index)
    }));
  };

  /**
   * 更新课程配置
   */
  const updateCourse = (index: number, field: keyof StandardCourse, value: any) => {
    setFormData(prev => ({
      ...prev,
      courses: prev.courses.map((course, i) => 
        i === index ? { ...course, [field]: value } : course
      )
    }));
  };

  /**
   * 课程选择变化时的处理
   */
  const handleCourseChange = (index: number, courseId: string) => {
    const course = courses.find(c => c._id === courseId);
    if (course) {
      updateCourse(index, 'courseId', courseId);
      updateCourse(index, 'courseName', course.name);
    }
  };

  /**
   * 添加时间段
   */
  const addTimeSlot = (courseIndex: number, type: 'preferred' | 'avoid') => {
    const newTimeSlot: TimeSlot = { dayOfWeek: 1, period: 1 };
    const field = type === 'preferred' ? 'preferredTimeSlots' : 'avoidTimeSlots';
    
    setFormData(prev => ({
      ...prev,
      courses: prev.courses.map((course, i) => 
        i === courseIndex 
          ? { ...course, [field]: [...course[field], newTimeSlot] }
          : course
      )
    }));
  };

  /**
   * 删除时间段
   */
  const removeTimeSlot = (courseIndex: number, type: 'preferred' | 'avoid', timeSlotIndex: number) => {
    const field = type === 'preferred' ? 'preferredTimeSlots' : 'avoidTimeSlots';
    
    setFormData(prev => ({
      ...prev,
      courses: prev.courses.map((course, i) => 
        i === courseIndex 
          ? { ...course, [field]: course[field].filter((_, j) => j !== timeSlotIndex) }
          : course
      )
    }));
  };

  /**
   * 更新时间段
   */
  const updateTimeSlot = (
    courseIndex: number, 
    type: 'preferred' | 'avoid', 
    timeSlotIndex: number, 
    field: keyof TimeSlot, 
    value: number
  ) => {
    const timeSlotField = type === 'preferred' ? 'preferredTimeSlots' : 'avoidTimeSlots';
    
    setFormData(prev => ({
      ...prev,
      courses: prev.courses.map((course, i) => 
        i === courseIndex 
          ? {
              ...course,
              [timeSlotField]: course[timeSlotField].map((ts, j) => 
                j === timeSlotIndex ? { ...ts, [field]: value } : ts
              )
            }
          : course
      )
    }));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto m-4">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold">
                {template ? '编辑模板' : '新建模板'}
              </h2>
              <p className="text-gray-600">
                {template ? '修改年级课程模板配置' : '创建新的年级课程模板'}
              </p>
            </div>
            <Button variant="ghost" onClick={onClose} size="sm">
              ✕
            </Button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* 基本信息 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">基本信息</CardTitle>
                <CardDescription>设置模板的基本属性</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="grade">年级 *</Label>
                    <Select
                      value={formData.grade}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, grade: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="选择年级" />
                      </SelectTrigger>
                      <SelectContent>
                        {GRADE_OPTIONS.map(grade => (
                          <SelectItem key={grade.value} value={grade.value}>
                            {grade.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.grade && (
                      <p className="text-red-500 text-sm mt-1">{errors.grade}</p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="name">模板名称 *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="输入模板名称"
                    />
                    {errors.name && (
                      <p className="text-red-500 text-sm mt-1">{errors.name}</p>
                    )}
                  </div>
                </div>
                <div>
                  <Label htmlFor="description">描述</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="输入模板描述"
                    rows={3}
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="isDefault"
                    checked={formData.isDefault}
                    onChange={(e) => setFormData(prev => ({ ...prev, isDefault: e.target.checked }))}
                    className="rounded"
                  />
                  <Label htmlFor="isDefault">设为默认模板</Label>
                </div>
              </CardContent>
            </Card>

            {/* 课程配置 */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">课程配置</CardTitle>
                    <CardDescription>配置年级标准课程</CardDescription>
                  </div>
                  <Button type="button" onClick={addCourse} variant="outline" size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    添加课程
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {errors.courses && (
                  <p className="text-red-500 text-sm mb-4">{errors.courses}</p>
                )}
                
                <div className="space-y-4">
                  {formData.courses.map((course, courseIndex) => (
                    <Card key={courseIndex} className="border-2">
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-base">课程 {courseIndex + 1}</CardTitle>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeCourse(courseIndex)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label>课程 *</Label>
                            <Select
                              value={course.courseId}
                              onValueChange={(value) => handleCourseChange(courseIndex, value)}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="选择课程" />
                              </SelectTrigger>
                              <SelectContent>
                                {courses.map(c => (
                                  <SelectItem key={c._id} value={c._id}>
                                    {c.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            {errors[`courses.${courseIndex}.courseId`] && (
                              <p className="text-red-500 text-sm mt-1">
                                {errors[`courses.${courseIndex}.courseId`]}
                              </p>
                            )}
                          </div>
                          <div>
                            <Label>课程名称 *</Label>
                            <Input
                              value={course.courseName}
                              onChange={(e) => updateCourse(courseIndex, 'courseName', e.target.value)}
                              placeholder="输入课程名称"
                            />
                            {errors[`courses.${courseIndex}.courseName`] && (
                              <p className="text-red-500 text-sm mt-1">
                                {errors[`courses.${courseIndex}.courseName`]}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                          <div>
                            <Label>周课时数 *</Label>
                            <Input
                              type="number"
                              min="1"
                              max="30"
                              value={course.weeklyHours}
                              onChange={(e) => updateCourse(courseIndex, 'weeklyHours', parseInt(e.target.value))}
                            />
                            {errors[`courses.${courseIndex}.weeklyHours`] && (
                              <p className="text-red-500 text-sm mt-1">
                                {errors[`courses.${courseIndex}.weeklyHours`]}
                              </p>
                            )}
                          </div>
                          <div>
                            <Label>优先级</Label>
                            <Select
                              value={course.priority}
                              onValueChange={(value) => updateCourse(courseIndex, 'priority', value)}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {COURSE_PRIORITY_OPTIONS.map(option => (
                                  <SelectItem key={option.value} value={option.value}>
                                    {option.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label>连续排课</Label>
                            <div className="flex items-center space-x-2 mt-2">
                              <input
                                type="checkbox"
                                checked={course.requiresContinuous}
                                onChange={(e) => updateCourse(courseIndex, 'requiresContinuous', e.target.checked)}
                                className="rounded"
                              />
                              <span className="text-sm">需要连续</span>
                            </div>
                          </div>
                        </div>

                        {course.requiresContinuous && (
                          <div>
                            <Label>连续课时数</Label>
                            <Input
                              type="number"
                              min="2"
                              max="4"
                              value={course.continuousHours}
                              onChange={(e) => updateCourse(courseIndex, 'continuousHours', parseInt(e.target.value))}
                            />
                            {errors[`courses.${courseIndex}.continuousHours`] && (
                              <p className="text-red-500 text-sm mt-1">
                                {errors[`courses.${courseIndex}.continuousHours`]}
                              </p>
                            )}
                          </div>
                        )}

                        <div>
                          <Label>备注</Label>
                          <Input
                            value={course.notes || ''}
                            onChange={(e) => updateCourse(courseIndex, 'notes', e.target.value)}
                            placeholder="输入备注信息"
                          />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* 操作按钮 */}
            <div className="flex items-center justify-end space-x-4 pt-6 border-t">
              <Button type="button" variant="outline" onClick={onClose}>
                取消
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? '保存中...' : (template ? '更新模板' : '创建模板')}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
