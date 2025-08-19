'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { 
  Eye, 
  Download, 
  FileText, 
  FileImage, 
  Printer, 
  X,
  ChevronLeft,
  ChevronRight,
  Grid3X3
} from 'lucide-react';
import { exportSchedule, ExportOptions } from '@/lib/schedule-export';
import { ScheduleViewData, ViewMode } from '../types';

/**
 * 批量预览对话框组件属性接口
 */
interface BatchPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targets: Array<{
    id: string;
    name: string;
    type: 'class' | 'teacher' | 'room';
  }>;
  format: 'pdf' | 'excel' | 'csv' | 'print';
}

/**
 * 批量预览对话框组件
 * 
 * 提供批量导出前的预览功能，用户可以查看所有要导出的课表
 */
export function BatchPreviewDialog({ 
  open, 
  onOpenChange, 
  targets, 
  format 
}: BatchPreviewDialogProps) {
  // 状态管理
  const [currentIndex, setCurrentIndex] = useState(0);
  const [scheduleData, setScheduleData] = useState<ScheduleViewData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'preview'>('list');

  /**
   * 获取所有课表数据
   */
  const fetchAllScheduleData = async () => {
    if (targets.length === 0) {
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const dataPromises = targets.map(async (target) => {
        // 使用与单个调用相同的API格式和参数
        const params = new URLSearchParams({
          academicYear: '2025-2026', // 使用默认学年
          semester: '1'               // 使用默认学期
        });
        
        const apiUrl = `/api/schedule-view/${target.type}/${target.id}?${params}`;
        
        const response = await fetch(apiUrl);
        
        if (response.ok) {
          const data = await response.json();
          return {
            target,
            data: data.data
          };
        } else {
          console.warn(`获取 ${target.name} 课表失败:`, response.status);
          return {
            target,
            data: null
          };
        }
      });
      
      const results = await Promise.all(dataPromises);
      
      const validData = results
        .filter(item => item.data !== null)
        .map(item => item.data);
      
      setScheduleData(validData);
      setCurrentIndex(0);
    } catch (err) {
      console.error('获取课表数据失败:', err);
      setError('获取课表数据失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  /**
   * 执行批量导出
   */
  const handleBatchExport = async () => {
    try {
      console.log('开始执行批量导出，格式:', format, '目标数量:', targets.length);
      
      // 根据格式执行不同的导出逻辑
      if (format === 'print') {
        // 打印格式：生成合并的HTML
        await batchPrintToHtml();
      } else if (format === 'pdf') {
        // PDF格式：生成合并的HTML，只打开一个打印窗口
        await batchPrintToHtml();
      } else {
        // Excel和CSV格式：为每个目标生成单独的文件
        await batchExportToFiles();
      }
      
      onOpenChange(false);
    } catch (error) {
      console.error('批量导出失败:', error);
      setError('批量导出失败，请重试');
    }
  };

  /**
   * 批量打印到HTML（合并显示）
   */
  const batchPrintToHtml = async () => {
    if (scheduleData.length === 0) {
      throw new Error('没有课表数据可打印');
    }

    console.log('开始生成批量打印HTML，课表数量:', scheduleData.length);
    console.log('课表数据:', scheduleData);
    console.log('目标列表:', targets);

    // 生成合并的HTML
    let allSchedulesHtml = '';
    
    for (let i = 0; i < scheduleData.length; i++) {
      const data = scheduleData[i];
      const target = targets[i];
      
      console.log(`正在处理第${i + 1}个课表: ${target.name}`);
      
      const singleScheduleHtml = generatePreviewHTML(data, target.name, target.type as ViewMode);
      
      // 提取表格部分，添加标题和分页
      const scheduleSection = `
        <div class="schedule-section" style="page-break-after: always;">
          <div class="header">
            <div class="title">${target.name} 课表</div>
            <div class="academic-info">${data.academicYear} 学年第${data.semester}学期</div>
          </div>
          ${singleScheduleHtml}
        </div>
      `;
      
      allSchedulesHtml += scheduleSection;
      console.log(`第${i + 1}个课表HTML生成完成，长度:`, singleScheduleHtml.length);
    }
    
    // 根据格式确定标题和按钮文本
    const isPDF = format === 'pdf';
    const pageTitle = isPDF ? '批量课表导出' : '批量打印课表';
    const buttonText = isPDF ? '打印所有课表' : '批量打印课表';
    const subtitleText = isPDF ? '批量导出' : '批量打印';
    
    // 创建完整的批量打印HTML
    const batchHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>${pageTitle}</title>
        <style>
          @page { size: A4 portrait; margin: 1cm; }
          body { font-family: 'Microsoft YaHei', Arial, sans-serif; margin: 0; padding: 20px; }
          .schedule-section { 
            margin-bottom: 30px; 
            page-break-inside: avoid;
          }
          .header { 
            text-align: center; 
            margin-bottom: 20px; 
            border-bottom: 2px solid #333; 
            padding-bottom: 15px; 
          }
          .title { 
            font-size: 24px; 
            font-weight: bold; 
            margin-bottom: 10px; 
          }
          .academic-info {
            font-size: 14px;
            color: #888;
          }
          .schedule-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
          }
          .schedule-table th,
          .schedule-table td {
            border: 1px solid #ddd;
            padding: 8px;
            text-align: center;
            vertical-align: top;
            min-height: 60px;
          }
          .schedule-table th {
            background-color: #f5f5f5;
            font-weight: bold;
          }
          @media print { 
            .schedule-section { 
              page-break-after: always; 
              page-break-inside: avoid;
            }
            body { margin: 0; }
          }
        </style>
      </head>
      <body>
        ${allSchedulesHtml}
        <div style="text-align: center; margin-top: 20px;">
          <button onclick="window.print()">${buttonText}</button>
          <button onclick="window.close()">关闭窗口</button>
        </div>
      </body>
      </html>
    `;
    
    // 打开打印窗口
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      throw new Error('无法打开打印窗口，请检查浏览器设置');
    }
    
    printWindow.document.write(batchHtml);
    printWindow.document.close();
    printWindow.focus();
    
    // 延迟打印
    setTimeout(() => {
      printWindow.print();
      setTimeout(() => printWindow.close(), 1000);
    }, 500);
  };

  /**
   * 批量导出到文件（每个目标一个文件）
   */
  const batchExportToFiles = async () => {
    if (scheduleData.length === 0) {
      throw new Error('没有课表数据可导出');
    }

    // PDF格式已经在handleBatchExport中处理，这里只处理Excel和CSV
    if (format === 'pdf') {
      console.log('PDF格式已在handleBatchExport中处理，跳过batchExportToFiles');
      return;
    }

    console.log(`开始批量导出到${format}文件...`);
    
    for (let i = 0; i < scheduleData.length; i++) {
      const data = scheduleData[i];
      const target = targets[i];
      
      try {
        console.log(`正在导出 ${target.name} 的课表...`);
        
        // 使用exportSchedule函数，为每个目标创建单独的导出选项
        const exportOptions: ExportOptions = {
          format,
          fileName: `${target.name}_课表.${format === 'excel' ? 'xlsx' : 'csv'}`
        };
        
        await exportSchedule(data, target.type as ViewMode, exportOptions);
        
        console.log(`成功导出 ${target.name} 的课表到${format}文件`);
      } catch (error) {
        console.error(`导出 ${target.name} 时出错:`, error);
        // 继续导出其他目标，不中断整个流程
      }
    }
    
    console.log('批量导出完成');
  };

  /**
   * 生成预览HTML
   */
  const generatePreviewHTML = (data: ScheduleViewData, targetName: string, targetType: ViewMode) => {
    if (!data || !data.weekSchedule) {
      return '<div style="text-align: center; padding: 40px; color: #666;">暂无课表数据</div>';
    }

    const timeSlots = [
      '第1节<br>08:00-08:45',
      '第2节<br>08:55-09:40',
      '第3节<br>10:00-10:45',
      '第4节<br>10:55-11:40',
      '第5节<br>14:00-14:45',
      '第6节<br>14:55-15:40',
      '第7节<br>16:00-16:45',
      '第8节<br>16:55-17:40'
    ];

    let tableRows = '';
    for (let period = 1; period <= 8; period++) {
      tableRows += '<tr>';
      tableRows += `<td style="border: 1px solid #ddd; padding: 8px; background: #f9f9f9; font-weight: bold;">${timeSlots[period - 1]}</td>`;
      
      for (let day = 1; day <= 5; day++) {
        const courseSlot = data.weekSchedule[day]?.[period];
        if (courseSlot) {
          let courseInfo = courseSlot.courseName.replace(/^[一二三四五六初高]\w*年级\s*/, '');
          let details = '';
          
          if (targetType === 'class') {
            details = `<div style="font-size: 11px; color: #666;">👨‍🏫 ${courseSlot.teacherName}<br>🏢 ${courseSlot.roomName}</div>`;
          } else if (targetType === 'teacher') {
            details = `<div style="font-size: 11px; color: #666;">👥 ${courseSlot.className}<br>🏢 ${courseSlot.roomName}</div>`;
          } else if (targetType === 'room') {
            details = `<div style="font-size: 11px; color: #666;">👥 ${courseSlot.className}<br>👨‍🏫 ${courseSlot.teacherName}</div>`;
          }
          
          tableRows += `<td style="border: 1px solid #ddd; padding: 8px; text-align: center; vertical-align: top;">
            <div style="font-weight: bold; margin-bottom: 4px;">${courseInfo}</div>
            ${details}
          </td>`;
        } else {
          tableRows += '<td style="border: 1px solid #ddd; padding: 8px;"></td>';
        }
      }
      tableRows += '</tr>';
    }

    // 只返回表格内容，不包含完整的HTML结构
    return `
      <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
        <thead>
          <tr>
            <th style="border: 1px solid #ddd; padding: 8px; background: #f5f5f5; font-weight: bold; width: 120px;">时间</th>
            <th style="border: 1px solid #ddd; padding: 8px; background: #f5f5f5; font-weight: bold;">周一</th>
            <th style="border: 1px solid #ddd; padding: 8px; background: #f5f5f5; font-weight: bold;">周二</th>
            <th style="border: 1px solid #ddd; padding: 8px; background: #f5f5f5; font-weight: bold;">周三</th>
            <th style="border: 1px solid #ddd; padding: 8px; background: #f5f5f5; font-weight: bold;">周四</th>
            <th style="border: 1px solid #ddd; padding: 8px; background: #f5f5f5; font-weight: bold;">周五</th>
          </tr>
        </thead>
        <tbody>
          ${tableRows}
        </tbody>
      </table>
    `;
  };

  // 监听开启状态，自动获取数据
  useEffect(() => {
    if (open && targets.length > 0) {
      fetchAllScheduleData();
    } else if (open && targets.length === 0) {
      setError('没有找到要导出的目标，请检查批量导出设置');
    }
  }, [open, targets]);

  const formatLabel = {
    pdf: 'PDF文档',
    excel: 'Excel表格',
    csv: 'CSV文件',
    print: '直接打印'
  }[format];

  const formatIcon = {
    pdf: FileImage,
    excel: FileText,
    csv: FileText,
    print: Printer
  }[format];

  const IconComponent = formatIcon;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            批量导出预览 - {formatLabel}
          </DialogTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="absolute right-4 top-4 h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </DialogHeader>

        <div className="flex flex-col h-[75vh]">
          {/* 顶部操作栏 */}
          <div className="flex items-center justify-between p-4 border-b">
            <div className="flex items-center gap-3">
              <IconComponent className="h-5 w-5" />
              <span className="font-medium">
                共 {targets.length} 个课表 · {formatLabel}
              </span>
            </div>
            
            <div className="flex items-center gap-2">
              {/* 视图切换 */}
              <Button
                variant={viewMode === 'list' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('list')}
              >
                <Grid3X3 className="h-4 w-4 mr-1" />
                列表
              </Button>
              <Button
                variant={viewMode === 'preview' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('preview')}
              >
                <Eye className="h-4 w-4 mr-1" />
                预览
              </Button>
              
              <Separator orientation="vertical" className="h-6" />
              
              {/* 导航按钮 */}
              {viewMode === 'preview' && scheduleData.length > 0 && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
                    disabled={currentIndex === 0}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm text-gray-500">
                    {currentIndex + 1} / {scheduleData.length}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentIndex(Math.min(scheduleData.length - 1, currentIndex + 1))}
                    disabled={currentIndex === scheduleData.length - 1}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* 内容区域 */}
          <div className="flex-1 overflow-auto">
            {loading && (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <p className="text-gray-500">正在加载课表数据...</p>
                </div>
              </div>
            )}

            {error && (
              <div className="flex items-center justify-center h-full">
                <div className="text-center text-red-500">
                  <p>{error}</p>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={fetchAllScheduleData}
                    className="mt-4"
                  >
                    重试
                  </Button>
                </div>
              </div>
            )}

            {!loading && !error && scheduleData.length === 0 && (
              <div className="flex items-center justify-center h-full">
                <p className="text-gray-500">没有找到课表数据</p>
              </div>
            )}

            {!loading && !error && scheduleData.length > 0 && (
              <>
                {viewMode === 'list' && (
                  <div className="p-4 space-y-4">
                    {targets.map((target, index) => (
                      <Card key={target.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => {
                        setCurrentIndex(index);
                        setViewMode('preview');
                      }}>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-base flex items-center gap-2">
                            <IconComponent className="h-4 w-4" />
                            {target.name}
                            <span className="text-sm text-gray-500">
                              ({target.type === 'class' ? '班级' : target.type === 'teacher' ? '教师' : '教室'})
                            </span>
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-0">
                          <div className="text-sm text-gray-600">
                            {scheduleData[index] ? '✅ 数据加载完成' : '❌ 暂无数据'}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}

                {viewMode === 'preview' && scheduleData[currentIndex] && (
                  <div className="h-full">
                    <iframe
                      srcDoc={generatePreviewHTML(
                        scheduleData[currentIndex], 
                        targets[currentIndex].name,
                        targets[currentIndex].type as ViewMode
                      )}
                      className="w-full h-full border-0"
                      title={`${targets[currentIndex].name} 课表预览`}
                    />
                  </div>
                )}
              </>
            )}
          </div>

          {/* 底部操作栏 */}
          <div className="flex items-center justify-between p-4 border-t">
            <div className="text-sm text-gray-500">
              {scheduleData.length > 0 && `已加载 ${scheduleData.length} 个课表`}
            </div>
            
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                取消
              </Button>
              <Button 
                onClick={handleBatchExport}
                disabled={scheduleData.length === 0}
                className="gap-2"
              >
                <Download className="h-4 w-4" />
                开始导出 ({scheduleData.length} 个)
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
