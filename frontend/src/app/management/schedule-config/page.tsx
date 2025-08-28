'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
// 移除不存在的Select子组件导入
import { AcademicPeriodSelector } from '../schedules/schedule-view/components/AcademicPeriodSelector';
import { Clock, Plus, Edit, Trash2, Save, X } from 'lucide-react';

/**
 * 课程时间配置接口
 */
interface PeriodTimeConfig {
  _id: string;
  period: number;
  startTime: string;
  endTime: string;
  breakTime: number;
  isActive: boolean;
  academicYear: string;
  semester: string;
  description?: string;
}

/**
 * 时间配置表单数据接口
 */
interface PeriodTimeFormData {
  period: number;
  startTime: string;
  endTime: string;
  breakTime: number;
  description: string;
}

/**
 * 时间配置管理页面
 */
export default function ScheduleConfigPage() {
  // 状态管理
  const [filters, setFilters] = useState({
    academicYear: '2025-2026',
    semester: '1'
  });
  
  const [periodTimes, setPeriodTimes] = useState<PeriodTimeConfig[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingConfig, setEditingConfig] = useState<PeriodTimeConfig | null>(null);
  const [formData, setFormData] = useState<PeriodTimeFormData>({
    period: 1,
    startTime: '08:00',
    endTime: '08:45',
    breakTime: 10,
    description: ''
  });

  /**
   * 获取时间配置列表
   */
  const fetchPeriodTimes = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/schedule-config/period-times?academicYear=${filters.academicYear}&semester=${filters.semester}`
      );
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setPeriodTimes(data.data);
        }
      }
    } catch (error) {
      console.error('获取时间配置失败:', error);
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
   * 计算课程时长（分钟）
   */
  const calculateDuration = (startTime: string, endTime: string): number => {
    const start = new Date(`2000-01-01T${startTime}:00`);
    const end = new Date(`2000-01-01T${endTime}:00`);
    return Math.round((end.getTime() - start.getTime()) / (1000 * 60));
  };

  /**
   * 计算休息时间（分钟）
   * 基于标准课程时间表动态计算休息时间
   */
  const calculateBreakTime = (startTime: string, endTime: string, period: number): number => {
    // 如果是最后一节（第12节），休息时间设为0
    if (period >= 12) {
      return 0;
    }
    
    // 标准课程时间表（每节课45分钟，课间休息10分钟，大课间20分钟，午休2小时）
    const standardSchedule = {
      1: { start: '08:00', end: '08:45', nextStart: '08:55' },   // 第1节到第2节：课间休息10分钟
      2: { start: '08:55', end: '09:40', nextStart: '10:00' },  // 第2节到第3节：大课间20分钟
      3: { start: '10:00', end: '10:45', nextStart: '10:55' },  // 第3节到第4节：课间休息10分钟
      4: { start: '10:55', end: '11:40', nextStart: '12:00' },  // 第4节到第5节：午休前20分钟
      5: { start: '12:00', end: '12:45', nextStart: '14:00' },  // 第5节到第6节：午休2小时15分钟
      6: { start: '14:00', end: '14:45', nextStart: '14:55' },  // 第6节到第7节：课间休息10分钟
      7: { start: '14:55', end: '15:40', nextStart: '15:50' },  // 第7节到第8节：课间休息10分钟
      8: { start: '15:50', end: '16:35', nextStart: '16:45' },  // 第8节到第9节：课间休息10分钟
      9: { start: '16:45', end: '17:30', nextStart: '17:40' },  // 第9节到第10节：课间休息10分钟
      10: { start: '17:40', end: '18:25', nextStart: '18:35' }, // 第10节到第11节：课间休息10分钟
      11: { start: '18:35', end: '19:20', nextStart: '19:30' }  // 第11节到第12节：课间休息10分钟
    };
    
    const currentPeriod = standardSchedule[period as keyof typeof standardSchedule];
    if (!currentPeriod) {
      return 10; // 默认休息时间
    }
    
    // 计算当前节次的结束时间
    const currentEnd = new Date(`2000-01-01T${endTime}:00`);
    
    // 获取下一节的开始时间
    const nextStart = new Date(`2000-01-01T${currentPeriod.nextStart}:00`);
    
    // 计算休息时间（分钟）
    const breakTime = Math.round((nextStart.getTime() - currentEnd.getTime()) / (1000 * 60));
    
    // 返回休息时间，如果计算结果为负数或过大，则返回标准值
    if (breakTime > 0 && breakTime <= 180) {
      return breakTime;
    }
    
    // 返回标准休息时间
    if (period === 2) return 20;  // 大课间
    if (period === 4) return 20;  // 午休前
    if (period === 5) return 135; // 午休
    return 10; // 标准课间休息
  };

  /**
   * 处理表单数据变化
   */
  const handleFormChange = (field: keyof PeriodTimeFormData, value: string | number) => {
    setFormData(prev => {
      const newData = { ...prev, [field]: value };
      
      // 当开始时间、结束时间或节次变化时，自动计算休息时间
      if (field === 'startTime' || field === 'endTime' || field === 'period') {
        const breakTime = calculateBreakTime(
          newData.startTime, 
          newData.endTime, 
          newData.period
        );
        newData.breakTime = breakTime;
      }
      
      return newData;
    });
  };

  /**
   * 重置表单
   */
  const resetForm = () => {
    setFormData({
      period: 1,
      startTime: '08:00',
      endTime: '08:45',
      breakTime: 10,
      description: ''
    });
    setEditingConfig(null);
  };

  /**
   * 打开编辑对话框
   */
  const openEditDialog = (config: PeriodTimeConfig) => {
    setEditingConfig(config);
    setFormData({
      period: config.period,
      startTime: config.startTime,
      endTime: config.endTime,
      breakTime: config.breakTime,
      description: config.description || ''
    });
    setDialogOpen(true);
  };

  /**
   * 打开新建对话框
   */
  const openNewDialog = () => {
    resetForm();
    setDialogOpen(true);
  };

  /**
   * 保存时间配置
   */
  const handleSave = async () => {
    try {
      const response = await fetch('/api/schedule-config/period-times', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...formData,
          academicYear: filters.academicYear,
          semester: filters.semester
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setDialogOpen(false);
          resetForm();
          fetchPeriodTimes(); // 刷新列表
        }
      }
    } catch (error) {
      console.error('保存时间配置失败:', error);
    }
  };

  /**
   * 删除时间配置
   */
  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除这个时间配置吗？')) return;

    try {
      const response = await fetch(`/api/schedule-config/period-times/${id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        fetchPeriodTimes(); // 刷新列表
      }
    } catch (error) {
      console.error('删除时间配置失败:', error);
    }
  };

  // 监听筛选条件变化
  useEffect(() => {
    fetchPeriodTimes();
  }, [filters.academicYear, filters.semester]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">课程时间配置</h1>
          <p className="text-gray-600">管理每节课的具体时间安排</p>
        </div>
        <Button onClick={openNewDialog}>
          <Plus className="h-4 w-4 mr-2" />
          新建时间配置
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

      {/* 时间配置列表 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="h-5 w-5" />
            时间配置列表
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-gray-600">加载中...</p>
            </div>
          ) : periodTimes.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              暂无时间配置数据
            </div>
          ) : (
            <div className="space-y-4">
              {periodTimes.map((config) => (
                <div
                  key={config._id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                >
                  <div className="flex items-center gap-4">
                    <Badge variant="outline" className="min-w-[60px] text-center">
                      第{config.period}节
                    </Badge>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-lg">{config.startTime}</span>
                      <span className="text-gray-400">-</span>
                      <span className="font-mono text-lg">{config.endTime}</span>
                    </div>
                    <div className="text-sm text-gray-600">
                      ({calculateDuration(config.startTime, config.endTime)}分钟)
                    </div>
                    {config.breakTime > 0 && (
                      <Badge variant="secondary">
                        休息{config.breakTime}分钟
                      </Badge>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {config.description && (
                      <span className="text-sm text-gray-600">{config.description}</span>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditDialog(config)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(config._id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 新建/编辑对话框 */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader className="pb-4">
            <DialogTitle className="text-xl font-semibold">
              {editingConfig ? '编辑时间配置' : '新建时间配置'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* 第一行：节次选择 */}
            <div className="space-y-2">
              <Label htmlFor="period" className="text-sm font-medium text-gray-700">
                节次
              </Label>
              <div className="max-w-xs">
                <select
                  id="period"
                  value={formData.period.toString()}
                  onChange={(e) => handleFormChange('period', parseInt(e.target.value))}
                  className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                >
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((num) => (
                    <option key={num} value={num.toString()}>
                      第{num}节
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* 第二行：时间设置 */}
            <div className="space-y-3">
              <Label className="text-sm font-medium text-gray-700">时间设置</Label>
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="startTime" className="text-xs text-gray-600">
                    开始时间
                  </Label>
                  <Input
                    id="startTime"
                    type="time"
                    value={formData.startTime}
                    onChange={(e) => handleFormChange('startTime', e.target.value)}
                    className="h-10"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endTime" className="text-xs text-gray-600">
                    结束时间
                  </Label>
                  <Input
                    id="endTime"
                    type="time"
                    value={formData.endTime}
                    onChange={(e) => handleFormChange('endTime', e.target.value)}
                    className="h-10"
                  />
                </div>
              </div>
            </div>

            {/* 第三行：休息时间和描述 */}
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="breakTime" className="text-sm font-medium text-gray-700">
                  休息时间
                </Label>
                <div className="relative">
                  <Input
                    id="breakTime"
                    type="number"
                    min="0"
                    max="180"
                    value={formData.breakTime}
                    onChange={(e) => handleFormChange('breakTime', parseInt(e.target.value))}
                    className="h-10 pr-12"
                  />
                  <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-sm text-gray-500">
                    分钟
                  </span>
                </div>
                <p className="text-xs text-gray-500">
                  休息时间会根据节次自动计算，您也可以手动调整
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description" className="text-sm font-medium text-gray-700">
                  描述
                </Label>
                <Input
                  id="description"
                  placeholder="例如：第一节、午休等"
                  value={formData.description}
                  onChange={(e) => handleFormChange('description', e.target.value)}
                  className="h-10"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-6 border-t border-gray-200 mt-6">
            <Button 
              variant="outline" 
              onClick={() => setDialogOpen(false)}
              className="px-6 h-10"
            >
              取消
            </Button>
            <Button 
              onClick={handleSave}
              className="px-6 h-10"
            >
              <Save className="h-4 w-4 mr-2" />
              保存
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
