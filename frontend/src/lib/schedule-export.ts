/**
 * 课表导出工具库
 * 
 * 提供课表数据的Excel导出和打印功能
 */

import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { WeekSchedule, CourseSlot, ScheduleViewData, TIME_CONFIG } from '@/app/management/schedules/schedule-view/types';

/**
 * 导出选项接口
 */
export interface ExportOptions {
  includeEmpty?: boolean;      // 是否包含空课时
  includeMetadata?: boolean;   // 是否包含元数据
  format?: 'xlsx' | 'csv';    // 导出格式
  filename?: string;          // 文件名
}

/**
 * 打印选项接口
 */
export interface PrintOptions {
  title?: string;             // 打印标题
  includeMetadata?: boolean;  // 是否包含元数据
  paperSize?: 'A4' | 'A3';   // 纸张大小
  orientation?: 'portrait' | 'landscape'; // 页面方向
}

/**
 * 将课表数据导出为Excel文件
 * 
 * @param scheduleData 课表数据
 * @param options 导出选项
 */
export function exportScheduleToExcel(
  scheduleData: ScheduleViewData,
  options: ExportOptions = {}
): void {
  const {
    includeEmpty = true,
    includeMetadata = true,
    format = 'xlsx',
    filename
  } = options;

  // 创建工作簿
  const workbook = XLSX.utils.book_new();

  // 创建课表工作表
  const scheduleSheet = createScheduleSheet(scheduleData.weekSchedule, includeEmpty);
  XLSX.utils.book_append_sheet(workbook, scheduleSheet, '课表');

  // 如果包含元数据，创建信息工作表
  if (includeMetadata) {
    const infoSheet = createInfoSheet(scheduleData);
    XLSX.utils.book_append_sheet(workbook, infoSheet, '课表信息');
  }

  // 生成文件名
  const defaultFilename = generateFilename(scheduleData, format);
  const finalFilename = filename || defaultFilename;

  // 导出文件
  if (format === 'xlsx') {
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { 
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
    });
    saveAs(blob, finalFilename);
  } else if (format === 'csv') {
    const csvContent = XLSX.utils.sheet_to_csv(scheduleSheet);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, finalFilename);
  }
}

/**
 * 创建课表工作表
 * 
 * @param weekSchedule 周课表数据
 * @param includeEmpty 是否包含空课时
 * @returns Excel工作表
 */
function createScheduleSheet(
  weekSchedule: WeekSchedule,
  includeEmpty: boolean
): XLSX.WorkSheet {
  // 创建表头
  const headers = ['时间', ...TIME_CONFIG.DAYS.map(day => day.label)];
  
  // 创建数据行
  const rows: string[][] = [headers];
  
  TIME_CONFIG.PERIODS.forEach(period => {
    const row = [period.label];
    
    TIME_CONFIG.DAYS.forEach(day => {
      const courseSlot = weekSchedule[day.value]?.[period.value];
      
      if (courseSlot) {
        // 格式化课程信息
        const courseInfo = formatCourseInfo(courseSlot);
        row.push(courseInfo);
      } else {
        // 空课时处理
        row.push(includeEmpty ? '（空）' : '');
      }
    });
    
    rows.push(row);
  });

  // 转换为工作表
  const worksheet = XLSX.utils.aoa_to_sheet(rows);

  // 设置列宽
  const colWidths = [
    { wch: 12 }, // 时间列
    ...TIME_CONFIG.DAYS.map(() => ({ wch: 20 })) // 星期列
  ];
  worksheet['!cols'] = colWidths;

  // 设置行高
  const rowHeights = rows.map(() => ({ hpt: 60 }));
  worksheet['!rows'] = rowHeights;

  return worksheet;
}

/**
 * 创建信息工作表
 * 
 * @param scheduleData 课表数据
 * @returns Excel工作表
 */
function createInfoSheet(scheduleData: ScheduleViewData): XLSX.WorkSheet {
  const info = [
    ['课表信息'],
    [],
    ['查看对象', scheduleData.targetName],
    ['查看类型', getViewTypeLabel(scheduleData.type)],
    ['学年学期', `${scheduleData.academicYear}学年第${scheduleData.semester}学期`],
    ['总课程数', scheduleData.metadata.totalCourses.toString()],
    ['总课时数', scheduleData.metadata.totalHours.toString()],
    ['冲突数量', scheduleData.metadata.conflicts.toString()],
    ['生成时间', new Date().toLocaleString('zh-CN')],
    [],
    ['课程统计'],
    []
  ];

  // 统计各科目课时
  const subjectStats = getSubjectStatistics(scheduleData.weekSchedule);
  Object.entries(subjectStats).forEach(([subject, hours]) => {
    info.push([subject, `${hours}课时`]);
  });

  return XLSX.utils.aoa_to_sheet(info);
}

/**
 * 格式化课程信息
 * 
 * @param courseSlot 课程时段
 * @returns 格式化后的课程信息
 */
function formatCourseInfo(courseSlot: CourseSlot): string {
  const parts = [
    courseSlot.courseName,
    courseSlot.teacherName,
    courseSlot.roomName
  ].filter(Boolean);

  return parts.join('\n');
}

/**
 * 获取视图类型标签
 * 
 * @param type 视图类型
 * @returns 中文标签
 */
function getViewTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    'class': '班级课表',
    'teacher': '教师课表',
    'room': '教室课表'
  };
  return labels[type] || type;
}

/**
 * 获取学科统计信息
 * 
 * @param weekSchedule 周课表数据
 * @returns 学科统计
 */
function getSubjectStatistics(weekSchedule: WeekSchedule): Record<string, number> {
  const stats: Record<string, number> = {};

  Object.values(weekSchedule).forEach(daySchedule => {
    Object.values(daySchedule).forEach(courseSlot => {
      const slot = courseSlot as CourseSlot | null;
      if (slot && slot.subject) {
        const subject = slot.subject;
        stats[subject] = (stats[subject] || 0) + 1;
      }
    });
  });

  return stats;
}

/**
 * 生成默认文件名
 * 
 * @param scheduleData 课表数据
 * @param format 文件格式
 * @returns 文件名
 */
function generateFilename(scheduleData: ScheduleViewData, format: string): string {
  const timestamp = new Date().toISOString().slice(0, 10);
  const typeLabel = getViewTypeLabel(scheduleData.type);
  
  return `${typeLabel}-${scheduleData.targetName}-${scheduleData.academicYear}-${scheduleData.semester}-${timestamp}.${format}`;
}

/**
 * 打印课表
 * 
 * @param scheduleData 课表数据
 * @param options 打印选项
 */
export function printSchedule(
  scheduleData: ScheduleViewData,
  options: PrintOptions = {}
): void {
  const {
    title,
    includeMetadata = true,
    paperSize = 'A4',
    orientation = 'landscape'
  } = options;

  // 创建打印窗口
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('无法打开打印窗口，请检查浏览器设置');
    return;
  }

  // 生成打印HTML
  const printHtml = generatePrintHtml(scheduleData, {
    title,
    includeMetadata,
    paperSize,
    orientation
  });

  // 写入HTML并打印
  printWindow.document.write(printHtml);
  printWindow.document.close();
  
  // 等待内容加载完成后打印
  printWindow.onload = () => {
    printWindow.print();
    printWindow.close();
  };
}

/**
 * 生成打印HTML
 * 
 * @param scheduleData 课表数据
 * @param options 打印选项
 * @returns HTML字符串
 */
function generatePrintHtml(
  scheduleData: ScheduleViewData,
  options: PrintOptions
): string {
  const { title, includeMetadata, paperSize, orientation } = options;
  
  const defaultTitle = `${getViewTypeLabel(scheduleData.type)} - ${scheduleData.targetName}`;
  const finalTitle = title || defaultTitle;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${finalTitle}</title>
  <style>
    ${generatePrintCSS(paperSize, orientation)}
  </style>
</head>
<body>
  <div class="print-container">
    ${generatePrintHeader(scheduleData, finalTitle, includeMetadata)}
    ${generatePrintTable(scheduleData.weekSchedule)}
    ${includeMetadata ? generatePrintFooter(scheduleData) : ''}
  </div>
</body>
</html>`;
}

/**
 * 生成打印CSS样式
 * 
 * @param paperSize 纸张大小
 * @param orientation 页面方向
 * @returns CSS字符串
 */
function generatePrintCSS(paperSize?: string, orientation?: string): string {
  return `
    @page {
      size: ${paperSize} ${orientation};
      margin: 20mm;
    }
    
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: 'Microsoft YaHei', Arial, sans-serif;
      font-size: 12px;
      color: #333;
      line-height: 1.4;
    }
    
    .print-container {
      width: 100%;
      max-width: 100%;
    }
    
    .print-header {
      text-align: center;
      margin-bottom: 20px;
      padding-bottom: 15px;
      border-bottom: 2px solid #333;
    }
    
    .print-title {
      font-size: 20px;
      font-weight: bold;
      margin-bottom: 10px;
    }
    
    .print-info {
      font-size: 14px;
      color: #666;
    }
    
    .schedule-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
    }
    
    .schedule-table th,
    .schedule-table td {
      border: 1px solid #333;
      padding: 8px 4px;
      text-align: center;
      vertical-align: middle;
      word-wrap: break-word;
    }
    
    .schedule-table th {
      background-color: #f5f5f5;
      font-weight: bold;
      font-size: 13px;
    }
    
    .schedule-table .time-column {
      width: 80px;
      background-color: #f9f9f9;
      font-weight: bold;
    }
    
    .schedule-table .course-cell {
      height: 60px;
      font-size: 10px;
      line-height: 1.2;
    }
    
    .course-name {
      font-weight: bold;
      margin-bottom: 2px;
    }
    
    .course-teacher {
      color: #666;
      margin-bottom: 1px;
    }
    
    .course-room {
      color: #888;
      font-size: 9px;
    }
    
    .empty-cell {
      color: #ccc;
      font-style: italic;
    }
    
    .print-footer {
      margin-top: 20px;
      padding-top: 15px;
      border-top: 1px solid #ddd;
      font-size: 11px;
      color: #666;
    }
    
    .statistics {
      display: flex;
      flex-wrap: wrap;
      gap: 15px;
      margin-bottom: 10px;
    }
    
    .stat-item {
      flex: 1;
      min-width: 120px;
    }
    
    .stat-label {
      font-weight: bold;
    }
    
    @media print {
      body {
        font-size: 10px;
      }
      
      .print-container {
        width: 100%;
      }
      
      .schedule-table th,
      .schedule-table td {
        padding: 6px 3px;
      }
      
      .schedule-table .course-cell {
        height: 50px;
        font-size: 9px;
      }
    }
  `;
}

/**
 * 生成打印头部
 * 
 * @param scheduleData 课表数据
 * @param title 标题
 * @param includeMetadata 是否包含元数据
 * @returns HTML字符串
 */
function generatePrintHeader(
  scheduleData: ScheduleViewData,
  title: string,
  includeMetadata?: boolean
): string {
  const metadataHtml = includeMetadata ? `
    <div class="print-info">
      ${scheduleData.academicYear}学年第${scheduleData.semester}学期 | 
      总课程：${scheduleData.metadata.totalCourses}门 | 
      总课时：${scheduleData.metadata.totalHours}节 |
      生成时间：${new Date().toLocaleString('zh-CN')}
    </div>
  ` : '';

  return `
    <div class="print-header">
      <div class="print-title">${title}</div>
      ${metadataHtml}
    </div>
  `;
}

/**
 * 生成打印表格
 * 
 * @param weekSchedule 周课表数据
 * @returns HTML字符串
 */
function generatePrintTable(weekSchedule: WeekSchedule): string {
  const headerRow = `
    <tr>
      <th class="time-column">时间</th>
      ${TIME_CONFIG.DAYS.map(day => `<th>${day.label}</th>`).join('')}
    </tr>
  `;

  const bodyRows = TIME_CONFIG.PERIODS.map(period => {
    const cells = TIME_CONFIG.DAYS.map(day => {
      const courseSlot = weekSchedule[day.value]?.[period.value];
      
      if (courseSlot) {
        return `
          <td class="course-cell">
            <div class="course-name">${courseSlot.courseName}</div>
            <div class="course-teacher">${courseSlot.teacherName}</div>
            <div class="course-room">${courseSlot.roomName}</div>
          </td>
        `;
      } else {
        return `<td class="course-cell empty-cell">-</td>`;
      }
    }).join('');

    return `
      <tr>
        <td class="time-column">${period.label}<br><small>${period.time}</small></td>
        ${cells}
      </tr>
    `;
  }).join('');

  return `
    <table class="schedule-table">
      <thead>${headerRow}</thead>
      <tbody>${bodyRows}</tbody>
    </table>
  `;
}

/**
 * 生成打印页脚
 * 
 * @param scheduleData 课表数据
 * @returns HTML字符串
 */
function generatePrintFooter(scheduleData: ScheduleViewData): string {
  const subjectStats = getSubjectStatistics(scheduleData.weekSchedule);
  const statsHtml = Object.entries(subjectStats)
    .map(([subject, hours]) => `
      <div class="stat-item">
        <span class="stat-label">${subject}:</span> ${hours}课时
      </div>
    `).join('');

  return `
    <div class="print-footer">
      <div class="statistics">
        ${statsHtml}
      </div>
      <div style="text-align: center; margin-top: 10px;">
        <small>此课表由智能排课系统生成 © ${new Date().getFullYear()}</small>
      </div>
    </div>
  `;
} 