'use client';

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Settings, Palette, Eye, Download, Bell, X } from 'lucide-react';

/**
 * 设置对话框组件属性接口
 */
interface SettingsDialogProps {
  trigger?: React.ReactNode;
}

/**
 * 设置对话框组件
 * 
 * 提供课表显示和导出的个性化设置
 */
export function SettingsDialog({ trigger }: SettingsDialogProps) {
  // 对话框状态
  const [open, setOpen] = useState(false);
  
  // 设置状态
  const [settings, setSettings] = useState({
    // 显示设置
    display: {
      showEmptySlots: true,
      showTimeLabels: true,
      showSubjectColors: true,
      showTeacherAvatars: false,
      compactMode: false,
      highlightConflicts: true
    },
    // 导出设置
    export: {
      defaultFormat: 'pdf' as 'pdf' | 'excel' | 'csv' | 'print',
      includeMetadata: true,
      includeStatistics: true,
      autoGenerateFileName: true,
      rememberLastSettings: true
    },
    // 通知设置
    notifications: {
      enableNotifications: true,
      notifyOnConflicts: true,
      notifyOnScheduleChanges: false,
      notifyOnExportComplete: true
    }
  });

  /**
   * 处理显示设置变化
   */
  const handleDisplayChange = (key: keyof typeof settings.display, value: boolean) => {
    setSettings(prev => ({
      ...prev,
      display: {
        ...prev.display,
        [key]: value
      }
    }));
  };

  /**
   * 处理导出设置变化
   */
  const handleExportChange = (key: keyof typeof settings.export, value: any) => {
    setSettings(prev => ({
      ...prev,
      export: {
        ...prev.export,
        [key]: value
      }
    }));
  };

  /**
   * 处理通知设置变化
   */
  const handleNotificationChange = (key: keyof typeof settings.notifications, value: boolean) => {
    setSettings(prev => ({
      ...prev,
      notifications: {
        ...prev.notifications,
        [key]: value
      }
    }));
  };

  /**
   * 重置设置
   */
  const handleReset = () => {
    if (confirm('确定要重置所有设置吗？此操作不可撤销。')) {
      setSettings({
        display: {
          showEmptySlots: true,
          showTimeLabels: true,
          showSubjectColors: true,
          showTeacherAvatars: false,
          compactMode: false,
          highlightConflicts: true
        },
        export: {
          defaultFormat: 'pdf',
          includeMetadata: true,
          includeStatistics: true,
          autoGenerateFileName: true,
          rememberLastSettings: true
        },
        notifications: {
          enableNotifications: true,
          notifyOnConflicts: true,
          notifyOnScheduleChanges: false,
          notifyOnExportComplete: true
        }
      });
    }
  };

  /**
   * 保存设置
   */
  const handleSave = () => {
    // 这里可以保存到localStorage或发送到后端
    localStorage.setItem('schedule-settings', JSON.stringify(settings));
    alert('设置已保存');
  };

  return (
    <>
      <div onClick={() => setOpen(true)}>
        {trigger || (
          <Button variant="outline" size="sm">
            <Settings className="h-4 w-4 mr-2" />
            设置
          </Button>
        )}
      </div>
      
      <Dialog open={open} onOpenChange={setOpen}>
      
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            课表设置
          </DialogTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setOpen(false)}
            className="absolute right-4 top-4 h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </DialogHeader>

        <div className="space-y-6">
          {/* 显示设置 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Eye className="h-5 w-5" />
                显示设置
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium">显示空课时</label>
                    <p className="text-xs text-gray-500">在课表中显示没有安排课程的时间段</p>
                  </div>
                  <Switch
                    checked={settings.display.showEmptySlots}
                    onCheckedChange={(checked) => handleDisplayChange('showEmptySlots', checked)}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium">显示时间标签</label>
                    <p className="text-xs text-gray-500">显示每节课的具体时间</p>
                  </div>
                  <Switch
                    checked={settings.display.showTimeLabels}
                    onCheckedChange={(checked) => handleDisplayChange('showTimeLabels', checked)}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium">显示学科颜色</label>
                    <p className="text-xs text-gray-500">为不同学科设置不同的背景颜色</p>
                  </div>
                  <Switch
                    checked={settings.display.showSubjectColors}
                    onCheckedChange={(checked) => handleDisplayChange('showSubjectColors', checked)}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium">显示教师头像</label>
                    <p className="text-xs text-gray-500">在课表中显示教师头像（如果可用）</p>
                  </div>
                  <Switch
                    checked={settings.display.showTeacherAvatars}
                    onCheckedChange={(checked) => handleDisplayChange('showTeacherAvatars', checked)}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium">紧凑模式</label>
                    <p className="text-xs text-gray-500">减少课表单元格的内边距</p>
                  </div>
                  <Switch
                    checked={settings.display.compactMode}
                    onCheckedChange={(checked) => handleDisplayChange('compactMode', checked)}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium">高亮冲突</label>
                    <p className="text-xs text-gray-500">突出显示时间冲突的课程</p>
                  </div>
                  <Switch
                    checked={settings.display.highlightConflicts}
                    onCheckedChange={(checked) => handleDisplayChange('highlightConflicts', checked)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 导出设置 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Download className="h-5 w-5" />
                导出设置
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">默认导出格式</label>
                  <select
                    value={settings.export.defaultFormat}
                    onChange={(e) => handleExportChange('defaultFormat', e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="pdf">PDF文档</option>
                    <option value="excel">Excel表格</option>
                    <option value="csv">CSV文件</option>
                    <option value="print">直接打印</option>
                  </select>
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium">包含元数据</label>
                    <p className="text-xs text-gray-500">在导出文件中包含课表的基本信息</p>
                  </div>
                  <Switch
                    checked={settings.export.includeMetadata}
                    onCheckedChange={(checked) => handleExportChange('includeMetadata', checked)}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium">包含统计信息</label>
                    <p className="text-xs text-gray-500">在导出文件中包含课程统计信息</p>
                  </div>
                  <Switch
                    checked={settings.export.includeStatistics}
                    onCheckedChange={(checked) => handleExportChange('includeStatistics', checked)}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium">自动生成文件名</label>
                    <p className="text-xs text-gray-500">根据课表信息自动生成文件名</p>
                  </div>
                  <Switch
                    checked={settings.export.autoGenerateFileName}
                    onCheckedChange={(checked) => handleExportChange('autoGenerateFileName', checked)}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium">记住上次设置</label>
                    <p className="text-xs text-gray-500">记住上次导出时的选项设置</p>
                  </div>
                  <Switch
                    checked={settings.export.rememberLastSettings}
                    onCheckedChange={(checked) => handleExportChange('rememberLastSettings', checked)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 通知设置 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Bell className="h-5 w-5" />
                通知设置
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium">启用通知</label>
                    <p className="text-xs text-gray-500">启用系统通知功能</p>
                  </div>
                  <Switch
                    checked={settings.notifications.enableNotifications}
                    onCheckedChange={(checked) => handleNotificationChange('enableNotifications', checked)}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium">冲突通知</label>
                    <p className="text-xs text-gray-500">发现时间冲突时通知</p>
                  </div>
                  <Switch
                    checked={settings.notifications.notifyOnConflicts}
                    onCheckedChange={(checked) => handleNotificationChange('notifyOnConflicts', checked)}
                    disabled={!settings.notifications.enableNotifications}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium">课表变更通知</label>
                    <p className="text-xs text-gray-500">课表发生变更时通知</p>
                  </div>
                  <Switch
                    checked={settings.notifications.notifyOnScheduleChanges}
                    onCheckedChange={(checked) => handleNotificationChange('notifyOnScheduleChanges', checked)}
                    disabled={!settings.notifications.enableNotifications}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium">导出完成通知</label>
                    <p className="text-xs text-gray-500">导出完成后通知</p>
                  </div>
                  <Switch
                    checked={settings.notifications.notifyOnExportComplete}
                    onCheckedChange={(checked) => handleNotificationChange('notifyOnExportComplete', checked)}
                    disabled={!settings.notifications.enableNotifications}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 操作按钮 */}
          <div className="flex justify-between items-center pt-4 border-t border-gray-200">
            <Button
              variant="outline"
              onClick={handleReset}
              className="text-red-600 border-red-200 hover:bg-red-50"
            >
              重置设置
            </Button>
            
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => {}}>
                取消
              </Button>
              <Button onClick={handleSave}>
                保存设置
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
      </Dialog>
    </>
  );
}
