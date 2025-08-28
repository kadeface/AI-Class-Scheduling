'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { AcademicPeriodSelector } from '../../schedules/schedule-view/components/AcademicPeriodSelector';
import { Calendar, Plus, Edit, Trash2, Save, X } from 'lucide-react';

/**
 * 特殊日期接口
 */
interface SpecialDay {
  date: string;
  type: 'holiday' | 'exam' | 'activity' | 'makeup';
  description: string;
  isActive: boolean;
}

/**
 * 学期日历接口
 */
interface SemesterCalendar {
  _id: string;
  academicYear: string;
  semester: string;
  startDate: string;
  endDate: string;
  weekDays: number[];
  holidays: string[];
  specialDays: SpecialDay[];
  isActive: boolean;
  description?: string;
}

/**
 * 学期日历表单数据接口
 */
interface CalendarFormData {
  academicYear: string;    // 新增：学年
  semester: string;         // 新增：学期
  startDate: string;
  endDate: string;
  weekDays: number[];
  holidays: string[];
  specialDays: SpecialDay[];
  description: string;
}

/**
 * 学期日历管理页面
 */
export default function SemesterCalendarPage() {
  // 状态管理
  const [filters, setFilters] = useState({
    academicYear: '2025-2026',
    semester: '1'
  });
  
  const [calendar, setCalendar] = useState<SemesterCalendar | null>(null);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCalendar, setEditingCalendar] = useState<SemesterCalendar | null>(null);
  const [formData, setFormData] = useState<CalendarFormData>({
    academicYear: '',
    semester: '',
    startDate: '',
    endDate: '',
    weekDays: [1, 2, 3, 4, 5],
    holidays: [],
    specialDays: [],
    description: ''
  });

  /**
   * 获取学期日历
   */
  const fetchCalendar = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/schedule-config/semester-calendar?academicYear=${filters.academicYear}&semester=${filters.semester}`
      );
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setCalendar(data.data);
        } else {
          setCalendar(null);
        }
      }
    } catch (error) {
      console.error('获取学期日历失败:', error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * 处理筛选条件变化
   */
  const handleFiltersChange = (newFilters: Partial<typeof filters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  };

  /**
   * 处理表单数据变化
   */
  const handleFormChange = (field: keyof CalendarFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  /**
   * 处理星期几选择
   */
  const handleWeekDayChange = (day: number, checked: boolean) => {
    if (checked) {
      setFormData(prev => ({
        ...prev,
        weekDays: [...prev.weekDays, day].sort()
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        weekDays: prev.weekDays.filter(d => d !== day)
      }));
    }
  };

  /**
   * 添加节假日
   */
  const addHoliday = () => {
    const newHoliday = prompt('请输入节假日日期 (YYYY-MM-DD):');
    if (newHoliday && /^\d{4}-\d{2}-\d{2}$/.test(newHoliday)) {
      setFormData(prev => ({
        ...prev,
        holidays: [...prev.holidays, newHoliday]
      }));
    }
  };

  /**
   * 删除节假日
   */
  const removeHoliday = (holiday: string) => {
    setFormData(prev => ({
      ...prev,
      holidays: prev.holidays.filter(h => h !== holiday)
    }));
  };

  /**
   * 添加特殊日期
   */
  const addSpecialDay = () => {
    const date = prompt('请输入特殊日期 (YYYY-MM-DD):');
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return;

    const type = prompt('请输入类型 (holiday/exam/activity/makeup):') as SpecialDay['type'];
    if (!['holiday', 'exam', 'activity', 'makeup'].includes(type)) return;

    const description = prompt('请输入描述:') || '';

    const newSpecialDay: SpecialDay = {
      date,
      type,
      description,
      isActive: true
    };

    setFormData(prev => ({
      ...prev,
      specialDays: [...prev.specialDays, newSpecialDay]
    }));
  };

  /**
   * 删除特殊日期
   */
  const removeSpecialDay = (index: number) => {
    setFormData(prev => ({
      ...prev,
      specialDays: prev.specialDays.filter((_, i) => i !== index)
    }));
  };

  /**
   * 重置表单
   */
  const resetForm = () => {
    setFormData({
      academicYear: '',
      semester: '',
      startDate: '',
      endDate: '',
      weekDays: [1, 2, 3, 4, 5],
      holidays: [],
      specialDays: [],
      description: ''
    });
    setEditingCalendar(null);
  };

  /**
   * 打开编辑对话框
   */
  const openEditDialog = (calendarData: SemesterCalendar) => {
    setEditingCalendar(calendarData);
    setFormData({
      academicYear: calendarData.academicYear,
      semester: calendarData.semester,
      startDate: calendarData.startDate.split('T')[0],
      endDate: calendarData.endDate.split('T')[0],
      weekDays: calendarData.weekDays,
      holidays: calendarData.holidays.map(h => h.split('T')[0]),
      specialDays: calendarData.specialDays.map(sd => ({
        ...sd,
        date: sd.date.split('T')[0]
      })),
      description: calendarData.description || ''
    });
    setDialogOpen(true);
  };

  /**
   * 打开新建对话框
   */
  const openNewDialog = () => {
    resetForm();
    // 设置当前筛选条件中的学年学期
    setFormData(prev => ({
      ...prev,
      academicYear: filters.academicYear,
      semester: filters.semester
    }));
    setDialogOpen(true);
  };

  /**
   * 保存学期日历
   */
  const handleSave = async () => {
    try {
      // 表单验证
      if (!editingCalendar) {
        // 新建时的验证
        if (!formData.academicYear.trim()) {
          alert('请输入学年');
          return;
        }
        if (!formData.semester.trim()) {
          alert('请选择学期');
          return;
        }
      }
      
      if (!formData.startDate) {
        alert('请选择开始日期');
        return;
      }
      if (!formData.endDate) {
        alert('请选择结束日期');
        return;
      }
      if (formData.weekDays.length === 0) {
        alert('请至少选择一个上课日');
        return;
      }

      const response = await fetch('/api/schedule-config/semester-calendar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...formData,
          // 使用表单数据中的学年学期，而不是筛选条件
          academicYear: formData.academicYear,
          semester: formData.semester
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setDialogOpen(false);
          resetForm();
          fetchCalendar(); // 刷新数据
        }
      }
    } catch (error) {
      console.error('保存学期日历失败:', error);
    }
  };

  /**
   * 获取星期几名称
   */
  const getWeekDayName = (day: number): string => {
    const names = ['', '周一', '周二', '周三', '周四', '周五', '周六', '周日'];
    return names[day] || '';
  };

  /**
   * 获取特殊日期类型名称
   */
  const getSpecialDayTypeName = (type: SpecialDay['type']): string => {
    const names = {
      holiday: '节假日',
      exam: '考试',
      activity: '活动',
      makeup: '补课'
    };
    return names[type];
  };

  // 监听筛选条件变化
  useEffect(() => {
    fetchCalendar();
  }, [filters.academicYear, filters.semester]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">学期日历管理</h1>
          <p className="text-gray-600">管理学期开始结束日期、上课日和节假日，支持新建学期</p>
        </div>
        <Button onClick={openNewDialog}>
          <Plus className="h-4 w-4 mr-2" />
          新建学期日历
        </Button>
      </div>

      {/* 筛选条件 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">筛选条件</CardTitle>
        </CardHeader>
        <CardContent>
          <AcademicPeriodSelector
            value={filters}
            onChange={handleFiltersChange}
            className="justify-start"
          />
        </CardContent>
      </Card>

      {/* 学期日历信息 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            学期日历信息
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-gray-600">加载中...</p>
            </div>
          ) : !calendar ? (
            <div className="text-center py-8 text-gray-500">
              暂无学期日历配置
            </div>
          ) : (
            <div className="space-y-6">
              {/* 基本信息 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-semibold mb-3">基本信息</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">开始日期:</span>
                      <span>{new Date(calendar.startDate).toLocaleDateString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">结束日期:</span>
                      <span>{new Date(calendar.endDate).toLocaleDateString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">总周数:</span>
                      <span>{Math.ceil((new Date(calendar.endDate).getTime() - new Date(calendar.startDate).getTime()) / (1000 * 60 * 60 * 24 * 7))}周</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold mb-3">上课日</h3>
                  <div className="flex flex-wrap gap-2">
                    {calendar.weekDays.map(day => (
                      <Badge key={day} variant="outline">
                        {getWeekDayName(day)}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>

              {/* 节假日 */}
              {calendar.holidays.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-3">节假日</h3>
                  <div className="flex flex-wrap gap-2">
                    {calendar.holidays.map((holiday, index) => (
                      <Badge key={index} variant="secondary">
                        {new Date(holiday).toLocaleDateString()}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* 特殊日期 */}
              {calendar.specialDays.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-3">特殊日期</h3>
                  <div className="space-y-2">
                    {calendar.specialDays.map((specialDay, index) => (
                      <div key={index} className="flex items-center gap-3 p-2 border rounded">
                        <Badge variant="outline">
                          {new Date(specialDay.date).toLocaleDateString()}
                        </Badge>
                        <Badge variant="secondary">
                          {getSpecialDayTypeName(specialDay.type)}
                        </Badge>
                        <span className="text-sm">{specialDay.description}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 操作按钮 */}
              <div className="flex justify-end">
                <Button onClick={() => openEditDialog(calendar)}>
                  <Edit className="h-4 w-4 mr-2" />
                  编辑日历
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 新建/编辑对话框 */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingCalendar ? '编辑学期日历' : '新建学期日历'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* 基本信息 */}
            <div className="grid grid-cols-2 gap-4">
              {/* 学年学期选择（仅在新建时显示） */}
              {!editingCalendar && (
                <>
                  <div>
                    <Label htmlFor="academicYear">学年</Label>
                    <Input
                      id="academicYear"
                      type="text"
                      placeholder="例如：2025-2026"
                      value={formData.academicYear}
                      onChange={(e) => handleFormChange('academicYear', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="semester">学期</Label>
                    <select
                      id="semester"
                      value={formData.semester}
                      onChange={(e) => handleFormChange('semester', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">请选择学期</option>
                      <option value="1">第一学期</option>
                      <option value="2">第二学期</option>
                  
                    </select>
                  </div>
                </>
              )}
              <div>
                <Label htmlFor="startDate">开始日期</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => handleFormChange('startDate', e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="endDate">结束日期</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => handleFormChange('endDate', e.target.value)}
                />
              </div>
            </div>

            {/* 上课日选择 */}
            <div>
              <Label className="mb-3 block">上课日选择</Label>
              <div className="flex flex-wrap gap-3">
                {[1, 2, 3, 4, 5, 6, 7].map(day => (
                  <div key={day} className="flex items-center gap-2">
                    <Switch
                      checked={formData.weekDays.includes(day)}
                      onCheckedChange={(checked) => handleWeekDayChange(day, checked)}
                    />
                    <span className="text-sm">{getWeekDayName(day)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* 节假日管理 */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <Label>节假日</Label>
                <Button variant="outline" size="sm" onClick={addHoliday}>
                  <Plus className="h-4 w-4 mr-2" />
                  添加
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {formData.holidays.map((holiday, index) => (
                  <Badge key={index} variant="secondary" className="flex items-center gap-1">
                    {holiday}
                    <button
                      onClick={() => removeHoliday(holiday)}
                      className="ml-1 hover:text-red-600"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>

            {/* 特殊日期管理 */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <Label>特殊日期</Label>
                <Button variant="outline" size="sm" onClick={addSpecialDay}>
                  <Plus className="h-4 w-4 mr-2" />
                  添加
                </Button>
              </div>
              <div className="space-y-2">
                {formData.specialDays.map((specialDay, index) => (
                  <div key={index} className="flex items-center gap-2 p-2 border rounded">
                    <Badge variant="outline">{specialDay.date}</Badge>
                    <Badge variant="secondary">{getSpecialDayTypeName(specialDay.type)}</Badge>
                    <span className="text-sm flex-1">{specialDay.description}</span>
                    <button
                      onClick={() => removeSpecialDay(index)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* 描述 */}
            <div>
              <Label htmlFor="description">描述</Label>
              <Input
                id="description"
                placeholder="学期日历描述信息"
                value={formData.description}
                onChange={(e) => handleFormChange('description', e.target.value)}
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleSave}>
              <Save className="h-4 w-4 mr-2" />
              保存
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
