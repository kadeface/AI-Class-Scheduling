'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  BookOpen, 
  Clock, 
  Calendar,
  Star,
  Users,
  FileText
} from 'lucide-react';
import { 
  GradeTemplate, 
  COURSE_PRIORITY_OPTIONS 
} from '@/types/grade-template';

/**
 * 年级课程模板查看组件
 * 
 * 用于查看模板的详细信息
 */
interface GradeTemplateViewProps {
  template: GradeTemplate;
  onClose: () => void;
}

export const GradeTemplateView: React.FC<GradeTemplateViewProps> = ({
  template,
  onClose
}) => {
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

  /**
   * 获取星期几文本
   */
  const getDayText = (day: number) => {
    const days = ['', '周一', '周二', '周三', '周四', '周五', '周六', '周日'];
    return days[day] || `周${day}`;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto m-4">
        <div className="p-6">
          {/* 头部 */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <BookOpen className="h-8 w-8 text-blue-600" />
              <div>
                <h2 className="text-2xl font-bold">{template.name}</h2>
                <p className="text-gray-600">年级课程模板详情</p>
              </div>
            </div>
            <Button variant="ghost" onClick={onClose} size="sm">
              ✕
            </Button>
          </div>

          <div className="space-y-6">
            {/* 基本信息 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  基本信息
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700">年级</label>
                    <p className="text-lg font-semibold">{template.grade}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">状态</label>
                    <div className="flex items-center gap-2 mt-1">
                      {template.isDefault && (
                        <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                          <Star className="h-3 w-3 mr-1" />
                          默认模板
                        </Badge>
                      )}
                      <Badge variant={template.isActive ? "default" : "secondary"}>
                        {template.isActive ? '激活' : '停用'}
                      </Badge>
                    </div>
                  </div>
                </div>
                {template.description && (
                  <div>
                    <label className="text-sm font-medium text-gray-700">描述</label>
                    <p className="text-gray-600 mt-1">{template.description}</p>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700">创建时间</label>
                    <p className="text-gray-600 mt-1">
                      {new Date(template.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">更新时间</label>
                    <p className="text-gray-600 mt-1">
                      {new Date(template.updatedAt).toLocaleString()}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 课程配置 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <BookOpen className="h-5 w-5" />
                  课程配置 ({template.courses.length}门课程)
                </CardTitle>
                <CardDescription>
                  该年级的标准课程设置和课时分配
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {template.courses.map((course, index) => (
                    <Card key={index} className="border">
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-semibold">
                              {index + 1}
                            </div>
                            <div>
                              <h4 className="font-semibold text-lg">{course.courseName}</h4>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge 
                                  variant="outline" 
                                  className={getPriorityColor(course.priority)}
                                >
                                  {getPriorityLabel(course.priority)}
                                </Badge>
                                <Badge variant="outline">
                                  <Clock className="h-3 w-3 mr-1" />
                                  {course.weeklyHours}课时/周
                                </Badge>
                                {course.requiresContinuous && (
                                  <Badge variant="outline" className="bg-orange-100 text-orange-800">
                                    连续{course.continuousHours}节
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {course.notes && (
                          <div>
                            <label className="text-sm font-medium text-gray-700">备注</label>
                            <p className="text-gray-600 mt-1">{course.notes}</p>
                          </div>
                        )}
                        
                        {/* 时间段偏好 */}
                        {(course.preferredTimeSlots.length > 0 || course.avoidTimeSlots.length > 0) && (
                          <div className="grid grid-cols-2 gap-4">
                            {course.preferredTimeSlots.length > 0 && (
                              <div>
                                <label className="text-sm font-medium text-green-700">偏好时间段</label>
                                <div className="mt-1 space-y-1">
                                  {course.preferredTimeSlots.map((slot, slotIndex) => (
                                    <Badge key={slotIndex} variant="outline" className="bg-green-100 text-green-800">
                                      {getDayText(slot.dayOfWeek)} 第{slot.period}节
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            )}
                            {course.avoidTimeSlots.length > 0 && (
                              <div>
                                <label className="text-sm font-medium text-red-700">避免时间段</label>
                                <div className="mt-1 space-y-1">
                                  {course.avoidTimeSlots.map((slot, slotIndex) => (
                                    <Badge key={slotIndex} variant="outline" className="bg-red-100 text-red-800">
                                      {getDayText(slot.dayOfWeek)} 第{slot.period}节
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* 统计信息 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  统计信息
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {template.courses.length}
                    </div>
                    <div className="text-sm text-gray-600">总课程数</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {template.courses.reduce((sum, course) => sum + course.weeklyHours, 0)}
                    </div>
                    <div className="text-sm text-gray-600">总周课时</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-600">
                      {template.courses.filter(course => course.requiresContinuous).length}
                    </div>
                    <div className="text-sm text-gray-600">连续排课课程</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 底部按钮 */}
          <div className="flex items-center justify-end pt-6 border-t mt-6">
            <Button onClick={onClose}>
              关闭
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
