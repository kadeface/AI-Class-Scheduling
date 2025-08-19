'use client';

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Download, FileText, FileSpreadsheet, FileText as FileCsv, Printer, Settings, Eye, X } from 'lucide-react';
import { ScheduleViewData, ViewMode } from '../types';
import { ExportOptions, ExportStyles, exportSchedule } from '@/lib/schedule-export';
import { BatchPreviewDialog } from './BatchPreviewDialog';

// 年级和班级数据
const GRADE_DATA = {
  '小学': ['一年级', '二年级', '三年级', '四年级', '五年级', '六年级'],
  '初中': ['初一', '初二', '初三'],
  '高中': ['高一', '高二', '高三']
};

// 年级名称到数字的映射
const GRADE_TO_NUMBER = {
  '一年级': 1, '二年级': 2, '三年级': 3, '四年级': 4, '五年级': 5, '六年级': 6,
  '初一': 7, '初二': 8, '初三': 9,
  '高一': 10, '高二': 11, '高三': 12
};

const CLASS_COUNT = {
  '一年级': 4, '二年级': 4, '三年级': 4, '四年级': 4, '五年级': 4, '六年级': 4,
  '初一': 6, '初二': 6, '初三': 6,
  '高一': 8, '高二': 8, '高三': 8
};

/**
 * 导出对话框组件属性接口
 */
interface ExportDialogProps {
  scheduleData: ScheduleViewData;
  viewMode: ViewMode;
  trigger?: React.ReactNode;
}

/**
 * 导出对话框组件
 * 
 * 提供课表导出的多种格式选择和选项设置
 */
export function ExportDialog({ scheduleData, viewMode, trigger }: ExportDialogProps) {
  // 对话框状态
  const [open, setOpen] = useState(false);
  
  // 导出选项状态
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    format: 'pdf',
    includeDetails: true,
    customStyles: {
      fontSize: 12,
      fontFamily: 'Microsoft YaHei',
      primaryColor: '#3b82f6',
      secondaryColor: '#6b7280',
      showGrid: true,
      showBorders: true
    },
    pageSize: 'A4',
    orientation: 'portrait',
    // 批量导出选项
    batchPrint: {
      enabled: false,
      targets: [],
      printAll: false,
      filterTeachers: true // 默认启用教师筛选
    }
  });

  // 年级班级选择状态
  const [gradeSelection, setGradeSelection] = useState({
    schoolType: '小学',
    grade: '一年级',
    classCount: 4,
    targetType: 'class' as 'class' | 'teacher'
  });

  // 导出状态
  const [isExporting, setIsExporting] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showBatchPreview, setShowBatchPreview] = useState(false);

  /**
   * 处理导出格式变化
   */
  const handleFormatChange = (format: ExportOptions['format']) => {
    setExportOptions(prev => ({ ...prev, format }));
  };

  /**
   * 处理样式选项变化
   */
  const handleStyleChange = (key: keyof ExportStyles, value: any) => {
    setExportOptions(prev => ({
      ...prev,
      customStyles: {
        ...prev.customStyles!,
        [key]: value
      }
    }));
  };

  /**
   * 处理页面设置变化
   */
  const handlePageSettingChange = (key: 'pageSize' | 'orientation', value: any) => {
    setExportOptions(prev => ({ ...prev, [key]: value }));
  };

  /**
   * 处理批量导出选项变化
   */
  const handleBatchPrintChange = async (enabled: boolean) => {
    setExportOptions(prev => ({
      ...prev,
      // 不再自动切换格式，保持用户的选择
      batchPrint: {
        ...prev.batchPrint!,
        enabled,
        targets: enabled ? [] : [] // 先设置为空，然后异步获取真实数据
      }
    }));

    // 如果启用批量导出，尝试获取真实班级数据
    if (enabled) {
      try {
        const realClasses = await fetchRealData(gradeSelection.grade, 'class');
        if (realClasses.length > 0) {
          // 使用真实班级数据，并更新班级数量
          const actualClassCount = realClasses.length;
          setGradeSelection(prev => ({
            ...prev,
            classCount: actualClassCount
          }));
          
          setExportOptions(prev => ({
            ...prev,
            batchPrint: {
              ...prev.batchPrint!,
              targets: realClasses
            }
          }));
          
          console.log(`启用批量导出，年级${gradeSelection.grade}实际班级数量: ${actualClassCount}`);
        } else {
          // 如果获取失败，使用模拟数据
          const fallbackClassCount = CLASS_COUNT[gradeSelection.grade as keyof typeof CLASS_COUNT];
          setGradeSelection(prev => ({
            ...prev,
            classCount: fallbackClassCount
          }));
          
          setExportOptions(prev => ({
            ...prev,
            batchPrint: {
              ...prev.batchPrint!,
              targets: generateClassTargets(gradeSelection.grade, fallbackClassCount)
            }
          }));
          
          console.log(`启用批量导出，年级${gradeSelection.grade}使用备选班级数量: ${fallbackClassCount}`);
        }
      } catch (error) {
        console.error('获取真实班级失败，使用模拟数据:', error);
        // 使用模拟数据作为备选
        const fallbackClassCount = CLASS_COUNT[gradeSelection.grade as keyof typeof CLASS_COUNT];
        setGradeSelection(prev => ({
          ...prev,
          classCount: fallbackClassCount
        }));
        
        setExportOptions(prev => ({
          ...prev,
          batchPrint: {
            ...prev.batchPrint!,
            targets: generateClassTargets(gradeSelection.grade, fallbackClassCount)
          }
        }));
      }
    }
  };

  /**
   * 生成班级目标列表（仅作为备选方案）
   */
  const generateClassTargets = (grade: string, classCount: number) => {
    return Array.from({ length: classCount }, (_, index) => ({
      id: `mock-${grade}-${index + 1}`, // 使用mock前缀，避免与真实ID冲突
      name: `${grade}${index + 1}班`,
      type: 'class' as const
    }));
  };

  /**
   * 从数据库获取真实数据列表（班级或教师）
   */
  const fetchRealData = async (grade: string, targetType: 'class' | 'teacher') => {
    try {
      if (targetType === 'class') {
        // 获取班级数据
        const response = await fetch('/api/classes');
        if (response.ok) {
          const data = await response.json();
          console.log('API响应数据结构:', data);
          
          // 正确的数据访问路径：data.data.items
          const classes = data.data?.items || [];
          const gradeNumber = GRADE_TO_NUMBER[grade as keyof typeof GRADE_TO_NUMBER];
          
          console.log(`查找年级${grade}(${gradeNumber})的班级，总班级数:`, classes.length);
          
          const gradeClasses = classes.filter((cls: any) => {
            console.log(`检查班级: ${cls.name}, 年级: ${cls.grade}, 类型: ${typeof cls.grade}`);
            // 处理年级字段可能是字符串或数字的情况
            const clsGrade = typeof cls.grade === 'string' ? parseInt(cls.grade) : cls.grade;
            return clsGrade === gradeNumber;
          });
          
          console.log(`年级${grade}(${gradeNumber})的班级:`, gradeClasses);
          
          return gradeClasses.map((cls: any) => ({
            id: cls._id, // 使用真实的MongoDB ObjectId
            name: cls.name,
            type: 'class' as const
          }));
        }
      } else if (targetType === 'teacher') {
        // 获取教师数据
        const response = await fetch('/api/teachers');
        if (response.ok) {
          const data = await response.json();
          console.log('获取教师数据:', data);
          
          const teachers = data.data?.items || [];
          console.log(`获取到教师总数: ${teachers.length}`);
          
          // 根据用户选择决定是否筛选
          if (exportOptions.batchPrint?.filterTeachers !== false) {
            // 智能筛选：优先使用优化API，失败时回退到原有方案
            const teachersWithSchedules = await smartFilterTeachers(teachers);
            console.log(`筛选后有课的教师数量: ${teachersWithSchedules.length}`);
            
            if (teachersWithSchedules.length === 0) {
              console.warn('筛选后没有找到有课的教师，可能的原因：');
              console.warn('1. 教师课表API有问题');
              console.warn('2. 课表数据结构与预期不符');
              console.warn('3. 所有教师确实都没有课');
              console.warn('4. 优化API和回退方案都失败');
              console.warn('建议：检查教师课表API或选择"不筛选"选项');
            }
            
            return teachersWithSchedules;
          } else {
            // 返回所有教师（不筛选）
            console.log('用户选择不筛选，返回所有教师');
            return teachers.map((teacher: any) => ({
              id: teacher._id,
              name: teacher.name,
              type: 'teacher' as const
            }));
          }
        }
      }
      
      // 错误处理已在各自的if块中处理
    } catch (error) {
      console.error(`获取${targetType === 'class' ? '班级' : '教师'}列表失败:`, error);
    }
    return [];
  };

  /**
   * 智能教师筛选（混合优化）
   * 优先使用优化的API，失败时回退到原有方案
   */
  const smartFilterTeachers = async (teachers: Array<{ _id: string; name: string }>) => {
    try {
      console.log('开始智能教师筛选...');
      
      // 使用当前课表的学年学期参数
      const params = new URLSearchParams({
        academicYear: scheduleData.academicYear,
        semester: scheduleData.semester
      });
      
      // 首先尝试使用优化的API
      const response = await fetch(`/api/schedule-view/teachers-with-schedules?${params}`);
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data.length > 0) {
          console.log('✅ 使用优化API获取有课教师成功:', data.data.length);
          console.log('优化API返回的教师数据:', data.data);
          
          // 转换数据格式以匹配现有接口
          const optimizedTeachers = data.data.map((teacher: any) => ({
            id: teacher.id,
            name: teacher.name,
            type: 'teacher' as const,
            courseCount: teacher.courseCount
          }));
          
          return optimizedTeachers;
        } else {
          console.warn('⚠️ 优化API返回空数据，回退到原有方案');
        }
      } else {
        console.warn(`⚠️ 优化API调用失败 (${response.status})，回退到原有方案`);
        const errorText = await response.text();
        console.log('错误详情:', errorText);
      }
      
      // 如果优化API失败，回退到原有方案
      console.log('🔄 回退到原有筛选方案...');
      return await filterTeachersWithSchedules(teachers);
      
    } catch (error) {
      console.error('❌ 智能筛选失败，回退到原有方案:', error);
      return await filterTeachersWithSchedules(teachers);
    }
  };

  /**
   * 筛选有课表的教师（原有方案）
   */
  const filterTeachersWithSchedules = async (teachers: Array<{ _id: string; name: string }>) => {
    console.log('开始筛选有课表的教师...');
    const teachersWithSchedules = [];
    
    for (const teacher of teachers) {
      try {
        console.log(`正在检查教师 ${teacher.name} (ID: ${teacher._id}) 的课表...`);
        
        // 检查该教师是否有课表数据
        const scheduleResponse = await fetch(`/api/schedule-view/teacher/${teacher._id}`);
        if (scheduleResponse.ok) {
          const scheduleData = await scheduleResponse.json();
          console.log(`教师 ${teacher.name} 课表API响应:`, scheduleData);
          
          // 检查是否有课表数据且不为空
          if (scheduleData.data && scheduleData.data.weekSchedule) {
            console.log(`教师 ${teacher.name} 课表数据结构:`, scheduleData.data.weekSchedule);
            
            // 更宽松的筛选逻辑：检查是否有任何课程数据
            let hasSchedule = false;
            let courseCount = 0;
            
            for (let day = 1; day <= 5; day++) {
              const daySchedule = scheduleData.data.weekSchedule[day];
              if (daySchedule) {
                for (let period = 1; period <= 8; period++) {
                  const courseSlot = daySchedule[period];
                  if (courseSlot && courseSlot.courseName) {
                    courseCount++;
                    hasSchedule = true;
                    console.log(`教师 ${teacher.name} 第${day}天第${period}节有课: ${courseSlot.courseName}`);
                  }
                }
              }
            }
            
            if (hasSchedule) {
              teachersWithSchedules.push({
                id: teacher._id,
                name: teacher.name,
                type: 'teacher' as const
              });
              console.log(`教师 ${teacher.name} 有课表 (${courseCount}节课)，已添加到筛选列表`);
            } else {
              console.log(`教师 ${teacher.name} 课表为空，跳过`);
            }
          } else {
            console.log(`教师 ${teacher.name} 没有课表数据，跳过`);
          }
        } else {
          console.log(`获取教师 ${teacher.name} 课表失败:`, scheduleResponse.status);
          const errorText = await scheduleResponse.text();
          console.log(`错误详情:`, errorText);
        }
      } catch (error) {
        console.error(`检查教师 ${teacher.name} 课表时出错:`, error);
      }
    }
    
    console.log(`筛选完成，有课的教师: ${teachersWithSchedules.length}/${teachers.length}`);
    return teachersWithSchedules;
  };

  /**
   * 处理学校类型变化
   */
  const handleSchoolTypeChange = async (schoolType: string) => {
    const newGrade = GRADE_DATA[schoolType as keyof typeof GRADE_DATA][0];
    
    // 如果批量导出已启用，尝试获取真实班级数据
    if (exportOptions.batchPrint?.enabled) {
      try {
        const realClasses = await fetchRealData(newGrade, 'class');
        if (realClasses.length > 0) {
          // 使用真实班级数据，并更新班级数量
          const actualClassCount = realClasses.length;
          setGradeSelection({
            schoolType,
            grade: newGrade,
            classCount: actualClassCount,
            targetType: 'class'
          });
          
          setExportOptions(prev => ({
            ...prev,
            batchPrint: {
              ...prev.batchPrint!,
              targets: realClasses
            }
          }));
          
          console.log(`学校类型${schoolType}，年级${newGrade}实际班级数量: ${actualClassCount}`);
        } else {
          // 如果获取失败，使用模拟数据
          const fallbackClassCount = CLASS_COUNT[newGrade as keyof typeof CLASS_COUNT];
          setGradeSelection({
            schoolType,
            grade: newGrade,
            classCount: fallbackClassCount,
            targetType: 'class'
          });
          
          setExportOptions(prev => ({
            ...prev,
            batchPrint: {
              ...prev.batchPrint!,
              targets: generateClassTargets(newGrade, fallbackClassCount)
            }
          }));
          
          console.log(`学校类型${schoolType}，年级${newGrade}使用备选班级数量: ${fallbackClassCount}`);
        }
      } catch (error) {
        console.error('获取真实班级失败，使用模拟数据:', error);
        // 使用模拟数据作为备选
        const fallbackClassCount = CLASS_COUNT[newGrade as keyof typeof CLASS_COUNT];
        setGradeSelection({
          schoolType,
          grade: newGrade,
          classCount: fallbackClassCount,
          targetType: 'class'
        });
        
        setExportOptions(prev => ({
          ...prev,
          batchPrint: {
            ...prev.batchPrint!,
            targets: generateClassTargets(newGrade, fallbackClassCount)
          }
        }));
      }
    } else {
      // 如果批量导出未启用，使用默认班级数量
      const defaultClassCount = CLASS_COUNT[newGrade as keyof typeof CLASS_COUNT];
      setGradeSelection({
        schoolType,
        grade: newGrade,
        classCount: defaultClassCount,
        targetType: 'class'
      });
    }
  };

  /**
   * 处理年级变化
   */
  const handleGradeChange = async (grade: string) => {
    // 如果批量导出已启用，尝试获取真实班级数据
    if (exportOptions.batchPrint?.enabled) {
      try {
        const realClasses = await fetchRealData(grade, 'class');
        if (realClasses.length > 0) {
          // 使用真实班级数据，并更新班级数量
          const actualClassCount = realClasses.length;
          setGradeSelection(prev => ({
            ...prev,
            grade,
            classCount: actualClassCount
          }));
          
          setExportOptions(prev => ({
            ...prev,
            batchPrint: {
              ...prev.batchPrint!,
              targets: realClasses
            }
          }));
          
          console.log(`年级${grade}实际班级数量: ${actualClassCount}`);
        } else {
          // 如果获取失败，使用模拟数据
          const fallbackClassCount = CLASS_COUNT[grade as keyof typeof CLASS_COUNT];
          setGradeSelection(prev => ({
            ...prev,
            grade,
            classCount: fallbackClassCount
          }));
          
          setExportOptions(prev => ({
            ...prev,
            batchPrint: {
              ...prev.batchPrint!,
              targets: generateClassTargets(grade, fallbackClassCount)
            }
          }));
          
          console.log(`年级${grade}使用备选班级数量: ${fallbackClassCount}`);
        }
      } catch (error) {
        console.error('获取真实班级失败，使用模拟数据:', error);
        // 使用模拟数据作为备选
        const fallbackClassCount = CLASS_COUNT[grade as keyof typeof CLASS_COUNT];
        setGradeSelection(prev => ({
          ...prev,
          grade,
          classCount: fallbackClassCount
        }));
        
        setExportOptions(prev => ({
          ...prev,
          batchPrint: {
            ...prev.batchPrint!,
            targets: generateClassTargets(grade, fallbackClassCount)
          }
        }));
      }
    } else {
      // 如果批量导出未启用，使用默认班级数量
      const defaultClassCount = CLASS_COUNT[grade as keyof typeof CLASS_COUNT];
      setGradeSelection(prev => ({
        ...prev,
        grade,
        classCount: defaultClassCount
      }));
    }
  };

  /**
   * 处理目标类型变化
   */
  const handleTargetTypeChange = async (targetType: 'class' | 'teacher') => {
    if (exportOptions.batchPrint?.enabled) {
      try {
        if (targetType === 'class') {
          // 获取班级数据
          const realClasses = await fetchRealData(gradeSelection.grade, 'class');
          if (realClasses.length > 0) {
            const actualClassCount = realClasses.length;
            setGradeSelection(prev => ({
              ...prev,
              classCount: actualClassCount
            }));
            
            setExportOptions(prev => ({
              ...prev,
              batchPrint: {
                ...prev.batchPrint!,
                targets: realClasses
              }
            }));
            
            console.log(`目标类型改为班级，年级${gradeSelection.grade}实际班级数量: ${actualClassCount}`);
          }
        } else if (targetType === 'teacher') {
          // 获取教师数据
          const realTeachers = await fetchRealData(gradeSelection.grade, 'teacher');
          if (realTeachers.length > 0) {
            const actualTeacherCount = realTeachers.length;
            setGradeSelection(prev => ({
              ...prev,
              classCount: actualTeacherCount
            }));
            
            setExportOptions(prev => ({
              ...prev,
              batchPrint: {
                ...prev.batchPrint!,
                targets: realTeachers
              }
            }));
            
            console.log(`目标类型改为教师，实际教师数量: ${actualTeacherCount}`);
          }
        }
      } catch (error) {
        console.error('获取真实数据失败:', error);
      }
    }
  };

  /**
   * 处理批量导出目标变化
   */
  const handleBatchTargetChange = (index: number, field: 'name' | 'type', value: string) => {
    setExportOptions(prev => ({
      ...prev,
      batchPrint: {
        ...prev.batchPrint!,
        targets: prev.batchPrint!.targets.map((target, i) => 
          i === index ? { ...target, [field]: value } : target
        )
      }
    }));
  };

  /**
   * 添加批量导出目标
   */
  const addBatchTarget = () => {
    setExportOptions(prev => ({
      ...prev,
      batchPrint: {
        ...prev.batchPrint!,
        targets: [...prev.batchPrint!.targets, { id: `target${Date.now()}`, name: '', type: 'class' as const }]
      }
    }));
  };

  /**
   * 移除批量导出目标
   */
  const removeBatchTarget = (index: number) => {
    setExportOptions(prev => ({
      ...prev,
      batchPrint: {
        ...prev.batchPrint!,
        targets: prev.batchPrint!.targets.filter((_, i) => i !== index)
      }
    }));
  };

  /**
   * 执行导出
   */
  const handleExport = async () => {
    if (!scheduleData) return;

    setIsExporting(true);
    try {
      // 如果是批量导出，先强制刷新真实班级数据
      if (exportOptions.batchPrint?.enabled) {
        console.log('启用批量导出，显示预览...');
        try {
          // 根据用户选择的目标类型获取数据
          const targetType = gradeSelection.targetType || 'class';
          const realData = await fetchRealData(gradeSelection.grade, targetType);
          console.log(`获取到的真实${targetType === 'class' ? '班级' : '教师'}数据:`, realData);
          
          if (realData.length > 0) {
            console.log(`更新批量导出目标为真实${targetType === 'class' ? '班级' : '教师'}数据:`, realData);
            
            // 更新导出选项
            setExportOptions(prev => ({
              ...prev,
              batchPrint: {
                ...prev.batchPrint!,
                targets: realData
              }
            }));
            
            // 关闭导出状态，显示批量预览对话框
            setIsExporting(false);
            setShowBatchPreview(true);
            return; // 直接返回，不执行实际导出
          } else {
            console.warn(`未获取到真实${targetType === 'class' ? '班级' : '教师'}数据，将使用模拟数据`);
          }
        } catch (error) {
          console.error(`刷新真实${gradeSelection.targetType === 'class' ? '班级' : '教师'}数据失败:`, error);
        }
      }
      
      await exportSchedule(scheduleData, viewMode, exportOptions);
    } catch (error) {
      console.error('导出失败:', error);
      alert(`导出失败：${error instanceof Error ? error.message : '未知错误'}\n\n请检查控制台获取详细信息。`);
    } finally {
      setIsExporting(false);
    }
  };

  /**
   * 生成预览HTML
   */
  const generatePreviewHtml = () => {
    // 这里可以调用导出库的预览功能
    // 暂时返回简单的预览信息
    return `
      <div style="padding: 20px; font-family: ${exportOptions.customStyles?.fontFamily};">
        <h2 style="color: ${exportOptions.customStyles?.primaryColor}; text-align: center;">
          ${scheduleData.targetName} 课表预览
        </h2>
        <p style="text-align: center; color: ${exportOptions.customStyles?.secondaryColor};">
          ${scheduleData.academicYear} 学年第${scheduleData.semester}学期
        </p>
        <div style="margin-top: 20px;">
          <p><strong>导出格式:</strong> ${exportOptions.format.toUpperCase()}</p>
          <p><strong>页面大小:</strong> ${exportOptions.pageSize}</p>
          <p><strong>页面方向:</strong> ${exportOptions.orientation === 'portrait' ? '纵向' : '横向'}</p>
          <p><strong>字体大小:</strong> ${exportOptions.customStyles?.fontSize}px</p>
          <p><strong>显示网格:</strong> ${exportOptions.customStyles?.showGrid ? '是' : '否'}</p>
          <p><strong>显示边框:</strong> ${exportOptions.customStyles?.showBorders ? '是' : '否'}</p>
        </div>
      </div>
    `;
  };

  return (
    <>
      <div onClick={() => setOpen(true)}>
        {trigger || (
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            导出课表
          </Button>
        )}
      </div>
      
      <Dialog open={open} onOpenChange={setOpen}>
      
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            导出课表
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

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 左侧：导出选项 */}
          <div className="space-y-6">
            {/* 导出格式选择 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">导出格式</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    variant={exportOptions.format === 'pdf' ? 'default' : 'outline'}
                    onClick={() => handleFormatChange('pdf')}
                    className="h-auto p-4 flex-col gap-2"
                  >
                    <FileText className="h-6 w-6" />
                    <span>PDF文档</span>
                    <Badge variant="secondary" className="text-xs">推荐</Badge>
                  </Button>
                  
                  <Button
                    variant={exportOptions.format === 'excel' ? 'default' : 'outline'}
                    onClick={() => handleFormatChange('excel')}
                    className="h-auto p-4 flex-col gap-2"
                  >
                    <FileSpreadsheet className="h-6 w-6" />
                    <span>Excel表格</span>
                    <Badge variant="secondary" className="text-xs">可编辑</Badge>
                  </Button>
                  
                  <Button
                    variant={exportOptions.format === 'csv' ? 'default' : 'outline'}
                    onClick={() => handleFormatChange('csv')}
                    className="h-auto p-4 flex-col gap-2"
                  >
                    <FileCsv className="h-6 w-6" />
                    <span>CSV文件</span>
                    <Badge variant="secondary" className="text-xs">轻量</Badge>
                  </Button>
                  
                  <Button
                    variant={exportOptions.format === 'print' ? 'default' : 'outline'}
                    onClick={() => handleFormatChange('print')}
                    className="h-auto p-4 flex-col gap-2"
                  >
                    <Printer className="h-6 w-6" />
                    <span>直接打印</span>
                    <Badge variant="secondary" className="text-xs">快速</Badge>
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* 批量导出选项 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Download className="h-5 w-5" />
                  批量导出
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium">启用批量导出</label>
                    <p className="text-xs text-gray-500">一次性导出多个课表</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={exportOptions.batchPrint?.enabled}
                    onChange={(e) => handleBatchPrintChange(e.target.checked)}
                    className="h-4 w-4"
                  />
                </div>
                
                {/* 教师筛选选项 */}
                {exportOptions.batchPrint?.enabled && gradeSelection.targetType === 'teacher' && (
                  <div className="flex items-center justify-between p-3 bg-blue-50 rounded border border-blue-200">
                    <div>
                      <label className="text-sm font-medium text-blue-800">智能筛选教师</label>
                      <p className="text-xs text-blue-600">只导出有课表的教师，跳过空课表</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={exportOptions.batchPrint?.filterTeachers || true}
                      onChange={(e) => {
                        setExportOptions(prev => ({
                          ...prev,
                          batchPrint: {
                            ...prev.batchPrint!,
                            filterTeachers: e.target.checked
                          }
                        }));
                      }}
                      className="h-4 w-4 text-blue-600"
                    />
                  </div>
                )}
                
                {exportOptions.batchPrint?.enabled && (
                  <div className="space-y-3">
                    {/* 年级班级选择 */}
                    <div className="space-y-3 p-3 bg-gray-50 rounded">
                      <div className="flex items-center gap-3">
                        <div className="flex-1">
                          <label className="text-xs font-medium text-gray-600 block mb-1">学校类型</label>
                          <select
                            value={gradeSelection.schoolType}
                            onChange={(e) => handleSchoolTypeChange(e.target.value)}
                            className="w-full text-xs px-2 py-1 border rounded"
                          >
                            {Object.keys(GRADE_DATA).map(type => (
                              <option key={type} value={type}>{type}</option>
                            ))}
                          </select>
                        </div>
                        <div className="flex-1">
                          <label className="text-xs font-medium text-gray-600 block mb-1">年级</label>
                          <select
                            value={gradeSelection.grade}
                            onChange={(e) => handleGradeChange(e.target.value)}
                            className="w-full text-xs px-2 py-1 border rounded"
                          >
                            {GRADE_DATA[gradeSelection.schoolType as keyof typeof GRADE_DATA].map(grade => (
                              <option key={grade} value={grade}>{grade}</option>
                            ))}
                          </select>
                        </div>
                        <div className="flex-1">
                          <label className="text-xs font-medium text-gray-600 block mb-1">目标类型</label>
                          <select
                            value={gradeSelection.targetType || 'class'}
                            onChange={(e) => {
                              const newTargetType = e.target.value as 'class' | 'teacher';
                              setGradeSelection(prev => ({ ...prev, targetType: newTargetType }));
                              // 当目标类型改变时，重新获取数据
                              if (exportOptions.batchPrint?.enabled) {
                                handleTargetTypeChange(newTargetType);
                              }
                            }}
                            className="w-full text-xs px-2 py-1 border rounded"
                          >
                            <option value="class">班级</option>
                            <option value="teacher">教师</option>
                          </select>
                        </div>
                        <div className="flex-1">
                          <label className="text-xs font-medium text-gray-600 block mb-1">数量</label>
                          <select
                            value={gradeSelection.classCount === -1 ? 'all' : gradeSelection.classCount}
                            onChange={(e) => {
                              const newValue = e.target.value;
                              if (newValue === 'all') {
                                // 处理"全部教师"选项
                                setGradeSelection(prev => ({ ...prev, classCount: -1 })); // -1 表示全部
                                if (exportOptions.batchPrint?.enabled && gradeSelection.targetType === 'teacher') {
                                  // 获取所有教师数据
                                  handleTargetTypeChange('teacher');
                                }
                              } else {
                                const newCount = parseInt(newValue);
                                setGradeSelection(prev => ({ ...prev, classCount: newCount }));
                                if (exportOptions.batchPrint?.enabled) {
                                  setExportOptions(prev => ({
                                    ...prev,
                                    batchPrint: {
                                      ...prev.batchPrint!,
                                      targets: generateClassTargets(gradeSelection.grade, newCount)
                                    }
                                  }));
                                }
                              }
                            }}
                            className="w-full text-xs px-2 py-1 border rounded"
                          >
                            {gradeSelection.targetType === 'teacher' ? (
                              <>
                                <option value="all">全部教师</option>
                                {Array.from({ length: 50 }, (_, i) => i + 1).map(count => (
                                  <option key={count} value={count}>
                                    {count}个教师
                                  </option>
                                ))}
                              </>
                            ) : (
                              Array.from({ length: 12 }, (_, i) => i + 1).map(count => (
                                <option key={count} value={count}>
                                  {count}个班
                                </option>
                              ))
                            )}
                          </select>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-600">
                          当前选择：{gradeSelection.grade}，共{
                            gradeSelection.classCount === -1 
                              ? '全部' 
                              : gradeSelection.classCount
                          }个{gradeSelection.targetType === 'class' ? '班' : '教师'}
                        </span>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={async () => {
                              const targetType = gradeSelection.targetType || 'class';
                              console.log(`测试获取真实${targetType === 'class' ? '班级' : '教师'}数据...`);
                              const realData = await fetchRealData(gradeSelection.grade, targetType);
                              console.log('测试结果:', realData);
                              alert(`获取到 ${realData.length} 个真实${targetType === 'class' ? '班级' : '教师'}`);
                            }}
                            className="h-6 px-2 text-xs"
                          >
                            测试API
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              if (exportOptions.batchPrint?.enabled) {
                                setExportOptions(prev => ({
                                  ...prev,
                                  batchPrint: {
                                    ...prev.batchPrint!,
                                    targets: generateClassTargets(gradeSelection.grade, gradeSelection.classCount)
                                  }
                                }));
                              }
                            }}
                            className="h-6 px-2 text-xs"
                          >
                            更新目标
                          </Button>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">导出目标</span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={addBatchTarget}
                        className="h-7 px-2 text-xs"
                      >
                        添加目标
                      </Button>
                    </div>
                    
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {exportOptions.batchPrint.targets.map((target, index) => (
                        <div key={target.id} className="flex items-center gap-2 p-2 border rounded">
                          <select
                            value={target.type}
                            onChange={(e) => handleBatchTargetChange(index, 'type', e.target.value)}
                            className="text-xs px-2 py-1 border rounded"
                          >
                            <option value="class">班级</option>
                            <option value="teacher">教师</option>
                            <option value="room">教室</option>
                          </select>
                          <input
                            type="text"
                            value={target.name}
                            onChange={(e) => handleBatchTargetChange(index, 'name', e.target.value)}
                            placeholder="输入名称"
                            className="flex-1 text-xs px-2 py-1 border rounded"
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeBatchTarget(index)}
                            className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                          >
                            ×
                          </Button>
                        </div>
                      ))}
                    </div>
                    
                    <p className="text-xs text-gray-500">
                      每个目标将单独打印一页，支持班级、教师、教室三种类型
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 页面设置 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">页面设置</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">纸张大小</label>
                  <div className="flex gap-2">
                    <Button
                      variant={exportOptions.pageSize === 'A4' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handlePageSettingChange('pageSize', 'A4')}
                    >
                      A4
                    </Button>
                    <Button
                      variant={exportOptions.pageSize === 'Letter' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handlePageSettingChange('pageSize', 'Letter')}
                    >
                      Letter
                    </Button>
                  </div>
                </div>
                
                <div>
                  <label className="text-sm font-medium mb-2 block">页面方向</label>
                  <div className="flex gap-2">
                    <Button
                      variant={exportOptions.orientation === 'portrait' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handlePageSettingChange('orientation', 'portrait')}
                    >
                      纵向
                    </Button>
                    <Button
                      variant={exportOptions.orientation === 'landscape' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handlePageSettingChange('orientation', 'landscape')}
                    >
                      横向
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 样式设置 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  样式设置
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">字体大小</label>
                  <input
                    type="range"
                    min="8"
                    max="16"
                    value={exportOptions.customStyles?.fontSize || 12}
                    onChange={(e) => handleStyleChange('fontSize', parseInt(e.target.value))}
                    className="w-full"
                  />
                  <div className="text-xs text-gray-500 mt-1">
                    {exportOptions.customStyles?.fontSize}px
                  </div>
                </div>
                
                <div className="flex gap-4">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="showGrid"
                      checked={exportOptions.customStyles?.showGrid || false}
                      onChange={(e) => handleStyleChange('showGrid', e.target.checked)}
                    />
                    <label htmlFor="showGrid" className="text-sm">显示网格</label>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="showBorders"
                      checked={exportOptions.customStyles?.showBorders || false}
                      onChange={(e) => handleStyleChange('showBorders', e.target.checked)}
                    />
                    <label htmlFor="showBorders" className="text-sm">显示边框</label>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 右侧：预览和操作 */}
          <div className="space-y-6">
            {/* 预览区域 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Eye className="h-5 w-5" />
                  预览效果
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="border rounded-lg p-4 bg-gray-50 min-h-[300px]">
                  <div
                    dangerouslySetInnerHTML={{ __html: generatePreviewHtml() }}
                  />
                </div>
              </CardContent>
            </Card>

            {/* 导出信息 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">导出信息</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">课表对象:</span>
                  <span className="font-medium">{scheduleData.targetName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">视图模式:</span>
                  <Badge variant="outline">
                    {viewMode === 'class' ? '班级' : viewMode === 'teacher' ? '教师' : '教室'}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">学年学期:</span>
                  <span>{scheduleData.academicYear} 学年第{scheduleData.semester}学期</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">总课程数:</span>
                  <span>{scheduleData.metadata.totalCourses}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">总课时数:</span>
                  <span>{scheduleData.metadata.totalHours}</span>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span className="text-gray-600">预计文件大小:</span>
                  <span className="text-sm text-gray-500">
                    {exportOptions.format === 'pdf' ? '100-200KB' :
                     exportOptions.format === 'excel' ? '50-100KB' :
                     exportOptions.format === 'csv' ? '10-20KB' : 'N/A'}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* 操作按钮 */}
            <div className="flex gap-3">
              <Button
                onClick={handleExport}
                disabled={isExporting}
                className="flex-1"
              >
                {isExporting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    导出中...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    开始导出
                  </>
                )}
              </Button>
              
              <Button
                variant="outline"
                onClick={() => setShowPreview(!showPreview)}
              >
                <Eye className="h-4 w-4 mr-2" />
                详细预览
              </Button>
            </div>
          </div>
        </div>

        {/* 详细预览弹窗 */}
        {showPreview && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-4xl max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">详细预览</h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowPreview(false)}
                >
                  关闭
                </Button>
              </div>
              <div
                className="border rounded-lg p-4"
                dangerouslySetInnerHTML={{ __html: generatePreviewHtml() }}
              />
            </div>
          </div>
        )}
      </DialogContent>
      </Dialog>

      {/* 批量预览对话框 */}
      <BatchPreviewDialog
        open={showBatchPreview}
        onOpenChange={setShowBatchPreview}
        targets={exportOptions.batchPrint?.targets || []}
        format={exportOptions.format}
      />
      

    </>
  );
}
