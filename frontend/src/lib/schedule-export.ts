/**
 * 课表导出工具库
 * 
 * 提供课表数据的多种导出格式和打印功能
 */

import { ScheduleViewData, CourseSlot, ViewMode } from '@/app/management/schedules/schedule-view/types';

/**
 * 导出选项接口
 */
export interface ExportOptions {
  format: 'pdf' | 'excel' | 'csv' | 'print';
  includeDetails?: boolean;
  customStyles?: ExportStyles;
  pageSize?: 'A4' | 'Letter';
  orientation?: 'portrait' | 'landscape';
  fileName?: string;
  // 批量打印选项
  batchPrint?: {
    enabled: boolean;
    targets: Array<{
      id: string;
      name: string;
      type: 'class' | 'teacher' | 'room';
    }>;
    printAll?: boolean;
    filterTeachers?: boolean; // 是否筛选有课的教师
  };
}

/**
 * 导出样式接口
 */
export interface ExportStyles {
  fontSize?: number;
  fontFamily?: string;
  primaryColor?: string;
  secondaryColor?: string;
  showGrid?: boolean;
  showBorders?: boolean;
}

/**
 * 课表导出主函数
 * 
 * @param scheduleData 课表数据
 * @param viewMode 视图模式
 * @param options 导出选项
 */
export async function exportSchedule(
  scheduleData: ScheduleViewData,
  viewMode: ViewMode,
  options: ExportOptions
): Promise<void> {
  try {
    // 检查是否为批量导出
    if (options.batchPrint?.enabled) {
      await batchPrintSchedules(options.batchPrint, options.format);
      return;
    }
    
    switch (options.format) {
      case 'pdf':
        await exportToPDF(scheduleData, viewMode, options);
        break;
      case 'excel':
        await exportToExcel(scheduleData, viewMode, options);
        break;
      case 'csv':
        await exportToCSV(scheduleData, viewMode, options);
        break;
      case 'print':
        printSchedule(scheduleData, viewMode, options);
        break;
      default:
        throw new Error(`不支持的导出格式: ${options.format}`);
    }
  } catch (error) {
    console.error('导出失败:', error);
    throw error;
  }
}

/**
 * 导出为PDF格式
 * 
 * @param scheduleData 课表数据
 * @param viewMode 视图模式
 * @param options 导出选项
 */
async function exportToPDF(
  scheduleData: ScheduleViewData,
  viewMode: ViewMode,
  options: ExportOptions
): Promise<void> {
  // 简化PDF导出：直接使用打印功能，让用户选择"另存为PDF"
  const printHtml = generatePrintHtml(scheduleData, viewMode, options);
  
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    throw new Error('无法打开打印窗口，请检查浏览器设置');
  }
  
  printWindow.document.write(printHtml);
  printWindow.document.close();
  printWindow.focus();
  
  // 延迟执行，确保内容渲染完成
  setTimeout(() => {
    printWindow.print();
  }, 500);
}

/**
 * 导出为Excel格式
 * 
 * @param scheduleData 课表数据
 * @param viewMode 视图模式
 * @param options 导出选项
 */
async function exportToExcel(
  scheduleData: ScheduleViewData,
  viewMode: ViewMode,
  options: ExportOptions
): Promise<void> {
  // 动态导入ExcelJS库
  const ExcelJS = await import('exceljs');
  const workbook = new ExcelJS.Workbook();
  
  // 创建工作表
  const worksheet = workbook.addWorksheet('课表');
  
  // 设置列宽
  worksheet.columns = [
    { header: '时间', key: 'time', width: 15 },
    { header: '周一', key: 'monday', width: 20 },
    { header: '周二', key: 'tuesday', width: 20 },
    { header: '周三', key: 'wednesday', width: 20 },
    { header: '周四', key: 'thursday', width: 20 },
    { header: '周五', key: 'friday', width: 20 }
  ];
  
  // 添加标题行
  worksheet.addRow({
    time: `${scheduleData.targetName} 课表`,
    monday: `${scheduleData.academicYear} 学年第${scheduleData.semester}学期`,
    tuesday: '',
    wednesday: '',
    thursday: '',
    friday: ''
  });
  
  // 动态获取时间配置
  let timeSlots: string[] = [];
  
  try {
    const response = await fetch(`/api/schedule-config/period-times?academicYear=${scheduleData.academicYear}&semester=${scheduleData.semester}`);
    if (response.ok) {
      const data = await response.json();
      if (data.success && data.data.length > 0) {
        timeSlots = data.data.map((config: any) => 
          `第${config.period}节 (${config.startTime}-${config.endTime})`
        );
      }
    }
  } catch (error) {
    console.warn('获取时间配置失败，使用默认时间:', error);
  }
  
  // 如果获取失败，使用默认时间
  if (timeSlots.length === 0) {
    timeSlots = [
      '第1节 (08:00-08:45)',
      '第2节 (08:55-09:40)',
      '第3节 (10:00-10:45)',
      '第4节 (10:55-11:40)',
      '第5节 (14:00-14:45)',
      '第6节 (14:55-15:40)',
      '第7节 (16:00-16:45)',
      '第8节 (16:55-17:40)'
    ];
  }
  
  // 填充课表数据
  for (let period = 1; period <= timeSlots.length; period++) {
    const rowData: any = { time: timeSlots[period - 1] };
    
    for (let day = 1; day <= 5; day++) {
      const courseSlot = scheduleData.weekSchedule[day]?.[period];
      if (courseSlot) {
        rowData[getDayKey(day)] = formatCourseInfo(courseSlot, viewMode);
      } else {
        rowData[getDayKey(day)] = '';
      }
    }
    
    worksheet.addRow(rowData);
  }
  
  // 移除统计信息行
  
  // 设置样式
  worksheet.getRow(1).font = { bold: true, size: 14 };
  worksheet.getRow(2).font = { bold: true, size: 12 };
  
  // 生成文件名
  const fileName = options.fileName || generateFileName(scheduleData, viewMode, 'xlsx');
  
  // 导出文件
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  downloadFile(blob, fileName);
}

/**
 * 导出为CSV格式
 * 
 * @param scheduleData 课表数据
 * @param viewMode 视图模式
 * @param options 导出选项
 */
async function exportToCSV(
  scheduleData: ScheduleViewData,
  viewMode: ViewMode,
  options: ExportOptions
): Promise<void> {
  const csvData = [];
  
  // 添加标题行
  csvData.push(['时间', '周一', '周二', '周三', '周四', '周五']);
  csvData.push([`${scheduleData.targetName} 课表`, `${scheduleData.academicYear} 学年第${scheduleData.semester}学期`, '', '', '', '']);
  
  // 动态获取时间配置
  let timeSlots: string[] = [];
  
  try {
    const response = await fetch(`/api/schedule-config/period-times?academicYear=${scheduleData.academicYear}&semester=${scheduleData.semester}`);
    if (response.ok) {
      const data = await response.json();
      if (data.success && data.data.length > 0) {
        timeSlots = data.data.map((config: any) => 
          `第${config.period}节 (${config.startTime}-${config.endTime})`
        );
      }
    }
  } catch (error) {
    console.warn('获取时间配置失败，使用默认时间:', error);
  }
  
  // 如果获取失败，使用默认时间
  if (timeSlots.length === 0) {
    timeSlots = [
      '第1节 (08:00-08:45)',
      '第2节 (08:55-09:40)',
      '第3节 (10:00-10:45)',
      '第4节 (10:55-11:40)',
      '第5节 (14:00-14:45)',
      '第6节 (14:55-15:40)',
      '第7节 (16:00-16:45)',
      '第8节 (16:55-17:40)'
    ];
  }
  
  // 填充课表数据
  for (let period = 1; period <= timeSlots.length; period++) {
    const rowData = [timeSlots[period - 1]];
    
    for (let day = 1; day <= 5; day++) {
      const courseSlot = scheduleData.weekSchedule[day]?.[period];
      if (courseSlot) {
        rowData.push(formatCourseInfo(courseSlot, viewMode));
      } else {
        rowData.push('');
      }
    }
    
    csvData.push(rowData);
  }
  
  // 移除统计信息行
  
  // 转换为CSV字符串
  const csvContent = csvData.map(row => 
    row.map(cell => `"${cell}"`).join(',')
  ).join('\n');
  
  // 生成文件名
  const fileName = options.fileName || generateFileName(scheduleData, viewMode, 'csv');
  
  // 导出文件
  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
  downloadFile(blob, fileName);
}

/**
 * 打印课表
 * 
 * @param scheduleData 课表数据
 * @param viewMode 视图模式
 * @param options 导出选项
 */
function printSchedule(
  scheduleData: ScheduleViewData,
  viewMode: ViewMode,
  options: ExportOptions
): void {
  const printHtml = generatePrintHtml(scheduleData, viewMode, options);
  
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    throw new Error('无法打开打印窗口，请检查浏览器设置');
  }
  
  printWindow.document.write(printHtml);
  printWindow.document.close();
  printWindow.focus();
  
  // 延迟打印，确保内容渲染完成
  setTimeout(() => {
    printWindow.print();
    printWindow.close();
  }, 300);
}

/**
 * 生成打印HTML
 * 
 * @param scheduleData 课表数据
 * @param viewMode 视图模式
 * @param options 导出选项
 * @returns HTML字符串
 */
function generatePrintHtml(
  scheduleData: ScheduleViewData,
  viewMode: ViewMode,
  options: ExportOptions
): string {
  const pageSize = options.pageSize || 'A4';
  const orientation = options.orientation || 'portrait';
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>${scheduleData.targetName} 课表</title>
      <style>
        @page {
          size: ${pageSize} ${orientation};
          margin: 1cm;
        }
        body {
          font-family: 'Microsoft YaHei', Arial, sans-serif;
          margin: 0;
          padding: 20px;
          background: white;
        }
        .header {
          text-align: center;
          margin-bottom: 30px;
          border-bottom: 2px solid #333;
          padding-bottom: 20px;
        }
        .title {
          font-size: 24px;
          font-weight: bold;
          margin-bottom: 10px;
        }
        .subtitle {
          font-size: 16px;
          color: #666;
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
        .time-column {
          width: 120px;
          background-color: #f9f9f9;
        }
        .course-cell {
          min-height: 60px;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
        }
        .course-name {
          font-weight: bold;
          margin-bottom: 4px;
        }
        .course-details {
          font-size: 12px;
          color: #666;
        }
        .footer {
          margin-top: 30px;
          text-align: center;
          font-size: 12px;
          color: #999;
          border-top: 1px solid #eee;
          padding-top: 20px;
        }
        @media print {
          body { margin: 0; }
          .no-print { display: none; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="title">${scheduleData.targetName} 课表</div>
        <div class="subtitle">${scheduleData.academicYear} 学年第${scheduleData.semester}学期</div>
      </div>
      
      <table class="schedule-table">
        <thead>
          <tr>
            <th class="time-column">时间</th>
            <th>周一</th>
            <th>周二</th>
            <th>周三</th>
            <th>周四</th>
            <th>周五</th>
          </tr>
        </thead>
        <tbody>
          ${generateTableRows(scheduleData, viewMode)}
        </tbody>
      </table>
      
      <div class="footer">
        <p>生成时间: ${new Date().toLocaleString()}</p>
      </div>
      
      <div class="no-print" style="text-align: center; margin-top: 20px;">
        <button onclick="window.print()">打印课表</button>
        <button onclick="window.close()">关闭窗口</button>
      </div>
    </body>
    </html>
  `;
}

/**
 * 生成表格行HTML
 * 
 * @param scheduleData 课表数据
 * @param viewMode 视图模式
 * @returns HTML字符串
 */
function generateTableRows(scheduleData: ScheduleViewData, viewMode: ViewMode): string {
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
  
  let rows = '';
  
  for (let period = 1; period <= 8; period++) {
    rows += '<tr>';
    rows += `<td class="time-column">${timeSlots[period - 1]}</td>`;
    
    for (let day = 1; day <= 5; day++) {
      const courseSlot = scheduleData.weekSchedule[day]?.[period];
      if (courseSlot) {
        rows += `<td><div class="course-cell">${formatCourseHtml(courseSlot, viewMode)}</div></td>`;
      } else {
        rows += '<td></td>';
      }
    }
    
    rows += '</tr>';
  }
  
  return rows;
}

/**
 * 格式化课程HTML
 * 
 * @param courseSlot 课程时段
 * @param viewMode 视图模式
 * @returns HTML字符串
 */
function formatCourseHtml(courseSlot: CourseSlot, viewMode: ViewMode): string {
  let details = '';
  
  if (viewMode === 'class') {
    details = `👨‍🏫 ${courseSlot.teacherName}<br>🏢 ${courseSlot.roomName}`;
  } else if (viewMode === 'teacher') {
    details = `👥 ${courseSlot.className}<br>🏢 ${courseSlot.roomName}`;
  } else if (viewMode === 'room') {
    details = `👥 ${courseSlot.className}<br>👨‍🏫 ${courseSlot.teacherName}`;
  }
  
  return `
    <div class="course-name">${removeGradeFromCourseName(courseSlot.courseName)}</div>
    <div class="course-details">${details}</div>
  `;
}

/**
 * 格式化课程信息（用于Excel/CSV）
 * 
 * @param courseSlot 课程时段
 * @param viewMode 视图模式
 * @returns 格式化字符串
 */
function formatCourseInfo(courseSlot: CourseSlot, viewMode: ViewMode): string {
  let details = '';
  
  if (viewMode === 'class') {
    details = `${courseSlot.teacherName} | ${courseSlot.roomName}`;
  } else if (viewMode === 'teacher') {
    details = `${courseSlot.className} | ${courseSlot.roomName}`;
  } else if (viewMode === 'room') {
    details = `${courseSlot.className} | ${courseSlot.teacherName}`;
  }
  
  return `${removeGradeFromCourseName(courseSlot.courseName)}\n${details}`;
}

/**
 * 移除课程名称中的年级信息
 * 
 * @param courseName 原始课程名称
 * @returns 移除年级信息后的课程名称
 */
function removeGradeFromCourseName(courseName: string): string {
  // 移除常见的年级前缀模式
  const gradePatterns = [
    /^一年级\s*/,
    /^二年级\s*/,
    /^三年级\s*/,
    /^四年级\s*/,
    /^五年级\s*/,
    /^六年级\s*/,
    /^初一\s*/,
    /^初二\s*/,
    /^初三\s*/,
    /^高一\s*/,
    /^高二\s*/,
    /^高三\s*/
  ];
  
  let cleanName = courseName;
  for (const pattern of gradePatterns) {
    if (pattern.test(cleanName)) {
      cleanName = cleanName.replace(pattern, '');
      break;
    }
  }
  
  return cleanName.trim();
}

/**
 * 获取星期几的键名
 * 
 * @param day 星期几 (1-5)
 * @returns 键名
 */
function getDayKey(day: number): string {
  const dayKeys = ['', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
  return dayKeys[day] || '';
}

/**
 * 生成文件名
 * 
 * @param scheduleData 课表数据
 * @param viewMode 视图模式
 * @param extension 文件扩展名
 * @returns 文件名
 */
function generateFileName(scheduleData: ScheduleViewData, viewMode: ViewMode, extension: string): string {
  const viewModeText = {
    class: '班级',
    teacher: '教师',
    room: '教室'
  }[viewMode];
  
  const timestamp = new Date().toISOString().slice(0, 10);
  return `${scheduleData.targetName}_${viewModeText}课表_${scheduleData.academicYear}学年第${scheduleData.semester}学期_${timestamp}.${extension}`;
}

/**
 * 批量导出课表
 * 
 * @param batchOptions 批量导出选项
 * @param exportFormat 导出格式
 */
async function batchPrintSchedules(batchOptions: ExportOptions['batchPrint'], exportFormat: 'pdf' | 'excel' | 'csv' | 'print'): Promise<void> {
  if (!batchOptions?.targets || batchOptions.targets.length === 0) {
    throw new Error('批量导出需要指定目标列表');
  }

  console.log(`批量${exportFormat === 'print' ? '打印' : '导出'}开始，目标列表:`, batchOptions.targets);

  try {
    if (exportFormat === 'print') {
      // 批量打印：生成合并的HTML
      await batchPrintToHtml(batchOptions);
    } else {
      // 批量导出：为每个目标生成单独的文件
      await batchExportToFiles(batchOptions, exportFormat);
    }
  } catch (error) {
    console.error(`批量${exportFormat === 'print' ? '打印' : '导出'}失败:`, error);
    throw error;
  }
}

/**
 * 批量打印到HTML（合并显示）
 */
async function batchPrintToHtml(batchOptions: ExportOptions['batchPrint']): Promise<void> {
  // 为每个目标单独生成打印HTML，然后合并
  let allSchedulesHtml = '';
  
  for (const target of batchOptions.targets) {
    console.log(`正在处理目标: ${target.name}`);
    
    try {
      // 直接获取单个目标的课表数据
      const apiUrl = `/api/schedule-view/${target.type}/${target.id}`;
      const response = await fetch(apiUrl);
      
      if (response.ok) {
        const data = await response.json();
        const scheduleData = data.data;
        
        if (scheduleData) {
          // 使用现有的单独打印HTML生成函数
          const singleScheduleHtml = generatePrintHtml(scheduleData, target.type as ViewMode, {
            format: 'print',
            pageSize: 'A4',
            orientation: 'portrait'
          });
          
          // 提取表格部分，添加标题和分页
          const scheduleSection = `
            <div class="schedule-section" style="page-break-after: always;">
              <div class="header">
                <div class="title">${target.name} 课表</div>
                <div class="subtitle">批量打印 - ${target.type === 'class' ? '班级' : target.type === 'teacher' ? '教师' : '教室'}</div>
              </div>
              ${singleScheduleHtml.split('<table class="schedule-table">')[1].split('</table>')[0]}
              <div class="footer">
                <p>生成时间: ${new Date().toLocaleString()}</p>
              </div>
            </div>
          `;
          
          allSchedulesHtml += scheduleSection;
          console.log(`成功生成 ${target.name} 的课表HTML`);
        } else {
          console.warn(`目标 ${target.name} 没有课表数据`);
        }
      } else {
        console.warn(`获取 ${target.name} 课表失败:`, response.status);
      }
    } catch (error) {
      console.error(`处理目标 ${target.name} 时出错:`, error);
    }
  }
  
  if (!allSchedulesHtml) {
    throw new Error('没有成功生成任何课表HTML');
  }
  
  // 创建完整的批量打印HTML
  const batchHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>批量打印课表</title>
      <style>
        @page {
          size: A4 portrait;
          margin: 1cm;
        }
        body {
          font-family: 'Microsoft YaHei', Arial, sans-serif;
          margin: 0;
          padding: 20px;
          background: white;
        }
        .schedule-section {
          margin-bottom: 30px;
        }
        .header {
          text-align: center;
          margin-bottom: 30px;
          border-bottom: 2px solid #333;
          padding-bottom: 20px;
        }
        .title {
          font-size: 24px;
          font-weight: bold;
          margin-bottom: 10px;
        }
        .subtitle {
          font-size: 16px;
          color: #666;
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
        .time-column {
          width: 120px;
          background-color: #f9f9f9;
        }
        .course-cell {
          min-height: 60px;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
        }
        .course-name {
          font-weight: bold;
          margin-bottom: 4px;
        }
        .course-details {
          font-size: 12px;
          color: #666;
        }
        .footer {
          margin-top: 30px;
          text-align: center;
          font-size: 12px;
          color: #999;
          border-top: 1px solid #eee;
          padding-top: 20px;
        }
        @media print {
          body { margin: 0; }
          .no-print { display: none; }
          .schedule-section { page-break-after: always; }
        }
      </style>
    </head>
    <body>
      ${allSchedulesHtml}
      
      <div class="no-print" style="text-align: center; margin-top: 20px;">
        <button onclick="window.print()">批量打印课表</button>
        <button onclick="window.close()">关闭窗口</button>
      </div>
    </body>
    </html>
  `;
  
  console.log('批量打印HTML生成完成，准备打开打印窗口');
  
  // 尝试打开打印窗口
  let printWindow: Window | null = null;
  
  try {
    // 使用更友好的方式打开窗口
    printWindow = window.open('', '_blank', 'width=800,height=600,scrollbars=yes,resizable=yes');
    
    if (!printWindow) {
      // 如果弹窗被阻止，尝试在当前窗口打开
      console.warn('弹窗被阻止，尝试在当前窗口打开打印预览');
      printWindow = window;
    }
    
    // 写入HTML内容
    if (printWindow !== window) {
      printWindow.document.write(batchHtml);
      printWindow.document.close();
      printWindow.focus();
    } else {
      // 在当前窗口显示内容
      document.body.innerHTML = batchHtml;
    }
    
    // 延迟打印
    setTimeout(() => {
      try {
        if (printWindow && printWindow !== window) {
          printWindow.print();
          setTimeout(() => {
            printWindow?.close();
          }, 1000);
        } else {
          // 在当前窗口打印
          window.print();
        }
      } catch (e) {
        console.warn('自动打印失败，用户可能需要手动打印:', e);
        // 显示手动打印提示
        if (printWindow && printWindow !== window) {
          printWindow.document.body.innerHTML += `
            <div style="text-align: center; margin-top: 20px; padding: 20px; background: #f0f0f0; border: 1px solid #ccc;">
              <h3>打印提示</h3>
              <p>自动打印失败，请手动按 Ctrl+P (Windows) 或 Cmd+P (Mac) 进行打印</p>
              <p>或者选择"另存为PDF"选项保存文件</p>
            </div>
          `;
        }
      }
    }, 500);
    
  } catch (error) {
    console.error('打开打印窗口失败:', error);
    throw new Error(`打开打印窗口失败: ${error instanceof Error ? error.message : '未知错误'}`);
  }
}



/**
 * 批量导出到文件（每个目标一个文件）
 */
async function batchExportToFiles(batchOptions: ExportOptions['batchPrint'], exportFormat: 'pdf' | 'excel' | 'csv'): Promise<void> {
  console.log(`开始批量导出到${exportFormat}文件...`);
  
  if (exportFormat === 'pdf') {
    // PDF格式：生成合并的HTML，只打开一个打印窗口
    await batchExportToMergedPDF(batchOptions);
    return;
  }
  
  // Excel和CSV格式：为每个目标生成单独的文件
  for (const target of batchOptions.targets) {
    console.log(`正在导出目标: ${target.name}`);
    
    try {
      // 获取课表数据
      const apiUrl = `/api/schedule-view/${target.type}/${target.id}`;
      const response = await fetch(apiUrl);
      
      if (response.ok) {
        const data = await response.json();
        const scheduleData = data.data;
        
        if (scheduleData) {
          // 根据格式调用相应的导出函数
          switch (exportFormat) {
            case 'excel':
              await exportToExcel(scheduleData, target.type as ViewMode, {
                format: 'excel',
                fileName: `${target.name}_课表.xlsx`
              });
              break;
            case 'csv':
              await exportToCSV(scheduleData, target.type as ViewMode, {
                format: 'csv',
                fileName: `${target.name}_课表.csv`
              });
              break;
          }
          
          console.log(`成功导出 ${target.name} 的课表到${exportFormat}文件`);
        } else {
          console.warn(`目标 ${target.name} 没有课表数据`);
        }
      } else {
        console.warn(`获取 ${target.name} 课表失败:`, response.status);
      }
    } catch (error) {
      console.error(`导出目标 ${target.name} 时出错:`, error);
    }
  }
  
  console.log('批量导出完成');
}



/**
 * 批量导出到合并的PDF（一个文件包含所有课表）
 */
async function batchExportToMergedPDF(batchOptions: ExportOptions['batchPrint']): Promise<void> {
  console.log('开始生成合并的PDF HTML...');
  
  // 收集所有课表数据
  const allScheduleData = [];
  
  for (const target of batchOptions.targets) {
    console.log(`正在获取 ${target.name} 的课表数据...`);
    
    try {
      const apiUrl = `/api/schedule-view/${target.type}/${target.id}`;
      const response = await fetch(apiUrl);
      
      if (response.ok) {
        const data = await response.json();
        const scheduleData = data.data;
        
        if (scheduleData) {
          allScheduleData.push({
            target,
            scheduleData,
            viewMode: target.type as ViewMode
          });
          console.log(`成功获取 ${target.name} 的课表数据`);
        } else {
          console.warn(`目标 ${target.name} 没有课表数据`);
        }
      } else {
        console.warn(`获取 ${target.name} 课表失败:`, response.status);
      }
    } catch (error) {
      console.error(`获取 ${target.name} 课表出错:`, error);
    }
  }
  
  if (allScheduleData.length === 0) {
    throw new Error('没有成功获取任何课表数据');
  }
  
  console.log(`成功获取 ${allScheduleData.length} 个课表数据，开始生成合并HTML...`);
  
  // 生成合并的HTML
  const mergedHtml = generateMergedPDFHtml(allScheduleData);
  
  // 打开打印窗口
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    throw new Error('无法打开打印窗口，请检查浏览器设置');
  }
  
  printWindow.document.write(mergedHtml);
  printWindow.document.close();
  printWindow.focus();
  
  // 延迟打印，确保内容渲染完成
  setTimeout(() => {
    try {
      printWindow.print();
      console.log('合并PDF打印窗口已打开，用户可以选择"另存为PDF"');
    } catch (e) {
      console.warn('自动打印失败，用户可能需要手动打印:', e);
    }
  }, 500);
}



/**
 * 生成合并的PDF HTML（包含所有课表）
 */
function generateMergedPDFHtml(allScheduleData: Array<{
  target: { id: string; name: string; type: 'class' | 'teacher' | 'room' };
  scheduleData: any;
  viewMode: ViewMode;
}>): string {
  let allSchedulesHtml = '';
  
  // 为每个课表生成HTML
  for (let i = 0; i < allScheduleData.length; i++) {
    const { target, scheduleData, viewMode } = allScheduleData[i];
    
    // 生成单个课表的表格HTML
    const tableHtml = generateTableRows(scheduleData, viewMode);
    
    // 添加课表部分，包含标题和分页
    const scheduleSection = `
      <div class="schedule-section" style="page-break-after: always;">
        <div class="header">
          <div class="title">${target.name} 课表</div>
          <div class="subtitle">${target.type === 'class' ? '班级' : target.type === 'teacher' ? '教师' : '教室'}课表</div>
          <div class="academic-info">${scheduleData.academicYear} 学年第${scheduleData.semester}学期</div>
        </div>
        
        <table class="schedule-table">
          <thead>
            <tr>
              <th class="time-column">时间</th>
              <th>周一</th>
              <th>周二</th>
              <th>周三</th>
              <th>周四</th>
              <th>周五</th>
            </tr>
          </thead>
          <tbody>
            ${tableHtml}
          </tbody>
        </table>
        
        <div class="footer">
          <p>生成时间: ${new Date().toLocaleString()}</p>
        </div>
      </div>
    `;
    
    allSchedulesHtml += scheduleSection;
  }
  
  // 创建完整的合并HTML文档
  const mergedHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>批量课表导出 - ${allScheduleData.length}个课表</title>
      <style>
        @page {
          size: A4 portrait;
          margin: 1cm;
        }
        body {
          font-family: 'Microsoft YaHei', Arial, sans-serif;
          margin: 0;
          padding: 20px;
          background: white;
        }
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
        .subtitle {
          font-size: 16px;
          color: #666;
          margin-bottom: 8px;
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
        .time-column {
          width: 120px;
          background-color: #f9f9f9;
        }
        .course-cell {
          min-height: 60px;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
        }
        .course-name {
          font-weight: bold;
          margin-bottom: 4px;
        }
        .course-details {
          font-size: 12px;
          color: #666;
        }
        .footer {
          margin-top: 30px;
          text-align: center;
          font-size: 12px;
          color: #999;
          border-top: 1px solid #eee;
          padding-top: 20px;
        }
        @media print {
          body { margin: 0; }
          .no-print { display: none; }
          .schedule-section { 
            page-break-after: always; 
            page-break-inside: avoid;
          }
        }
      </style>
    </head>
    <body>
      ${allSchedulesHtml}
      
      <div class="no-print" style="text-align: center; margin-top: 20px;">
        <button onclick="window.print()">打印所有课表</button>
        <button onclick="window.close()">关闭窗口</button>
        <p style="margin-top: 10px; color: #666; font-size: 14px;">
          提示：在打印对话框中选择"另存为PDF"可以保存为PDF文件
        </p>
      </div>
    </body>
    </html>
  `;
  
  return mergedHtml;
}


/**
 * 获取所有目标的课表数据
 * 
 * @param targets 批量打印目标列表
 * @returns 所有目标的课表数据
 */
async function fetchAllScheduleData(targets: Array<{ id: string; name: string; type: 'class' | 'teacher' | 'room' }>) {
  const allData = [];
  
  for (const target of targets) {
    let apiUrl = '';
    let viewMode: ViewMode = 'class';
    
    // 根据目标类型确定API地址和视图模式
    if (target.type === 'class') {
      apiUrl = `/api/schedule-view/class/${target.id}`;
      viewMode = 'class';
    } else if (target.type === 'teacher') {
      apiUrl = `/api/schedule-view/teacher/${target.id}`;
      viewMode = 'teacher';
    } else if (target.type === 'room') {
      apiUrl = `/api/schedule-view/room/${target.id}`;
      viewMode = 'room';
    }
    
    try {
      
      // 获取课表数据
      const response = await fetch(apiUrl);
      if (response.ok) {
        const data = await response.json();
        allData.push({
          target,
          viewMode,
          scheduleData: data.data
        });
      } else {
        console.warn(`获取${target.name}课表失败:`, response.status);
        // 如果获取失败，添加空数据占位
        allData.push({
          target,
          viewMode,
          scheduleData: null
        });
      }
    } catch (error) {
      console.error(`获取${target.name}课表出错:`, error);
      // 如果出错，添加空数据占位
      allData.push({
        target,
        viewMode,
        scheduleData: null
      });
    }
  }
  
  return allData;
}

/**
 * 生成包含实际数据的批量打印HTML
 * 
 * @param batchOptions 批量打印选项
 * @param allScheduleData 所有目标的课表数据
 * @returns HTML字符串
 */
function generateBatchPrintHtmlWithData(
  batchOptions: ExportOptions['batchPrint'],
  allScheduleData: Array<{
    target: { id: string; name: string; type: 'class' | 'teacher' | 'room' };
    viewMode: ViewMode;
    scheduleData: any;
  }>
): string {
  const pageSize = 'A4';
  const orientation = 'portrait';
  
  let schedulesHtml = '';
  
  // 为每个目标生成课表HTML
  for (const item of allScheduleData) {
    const { target, viewMode, scheduleData } = item;
    
    schedulesHtml += `
      <div class="schedule-section" style="page-break-after: always;">
        <div class="header">
          <div class="title">${target.name} 课表</div>
          <div class="subtitle">批量打印 - ${target.type === 'class' ? '班级' : target.type === 'teacher' ? '教师' : '教室'}</div>
        </div>
        
        <table class="schedule-table">
          <thead>
            <tr>
              <th class="time-column">时间</th>
              <th>周一</th>
              <th>周二</th>
              <th>周三</th>
              <th>周四</th>
              <th>周五</th>
            </tr>
          </thead>
          <tbody>
            ${scheduleData ? generateTableRowsWithData(scheduleData, viewMode) : generateEmptyTableRows()}
          </tbody>
        </table>
        
        <div class="footer">
          <p>生成时间: ${new Date().toLocaleString()}</p>
        </div>
      </div>
    `;
  }
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>批量打印课表</title>
      <style>
        @page {
          size: ${pageSize} ${orientation};
          margin: 1cm;
        }
        body {
          font-family: 'Microsoft YaHei', Arial, sans-serif;
          margin: 0;
          padding: 20px;
          background: white;
        }
        .schedule-section {
          margin-bottom: 30px;
        }
        .header {
          text-align: center;
          margin-bottom: 30px;
          border-bottom: 2px solid #333;
          padding-bottom: 20px;
        }
        .title {
          font-size: 24px;
          font-weight: bold;
          margin-bottom: 10px;
        }
        .subtitle {
          font-size: 16px;
          color: #666;
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
        .time-column {
          width: 120px;
          background-color: #f9f9f9;
        }
        .course-cell {
          min-height: 60px;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
        }
        .course-name {
          font-weight: bold;
          margin-bottom: 4px;
        }
        .course-details {
          font-size: 12px;
          color: #666;
        }
        .footer {
          margin-top: 30px;
          text-align: center;
          font-size: 12px;
          color: #999;
          border-top: 1px solid #eee;
          padding-top: 20px;
        }
        @media print {
          body { margin: 0; }
          .no-print { display: none; }
          .schedule-section { page-break-after: always; }
        }
      </style>
    </head>
    <body>
      ${schedulesHtml}
      
      <div class="no-print" style="text-align: center; margin-top: 20px;">
        <button onclick="window.print()">批量打印课表</button>
        <button onclick="window.close()">关闭窗口</button>
      </div>
    </body>
    </html>
  `;
}

/**
 * 生成包含实际数据的表格行HTML
 * 
 * @param scheduleData 课表数据
 * @param viewMode 视图模式
 * @returns HTML字符串
 */
function generateTableRowsWithData(scheduleData: any, viewMode: ViewMode): string {
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
  
  let rows = '';
  
  for (let period = 1; period <= 8; period++) {
    rows += '<tr>';
    rows += `<td class="time-column">${timeSlots[period - 1]}</td>`;
    
    for (let day = 1; day <= 5; day++) {
      const courseSlot = scheduleData.weekSchedule?.[day]?.[period];
      if (courseSlot) {
        rows += `<td><div class="course-cell">${formatCourseHtml(courseSlot, viewMode)}</div></td>`;
      } else {
        rows += '<td></td>';
      }
    }
    
    rows += '</tr>';
  }
  
  return rows;
}

/**
 * 生成批量打印HTML
 * 
 * @param batchOptions 批量打印选项
 * @returns HTML字符串
 */
function generateBatchPrintHtml(batchOptions: ExportOptions['batchPrint']): string {
  const pageSize = 'A4';
  const orientation = 'portrait';
  
  let schedulesHtml = '';
  
  // 为每个目标生成课表HTML
  for (const target of batchOptions!.targets) {
    schedulesHtml += `
      <div class="schedule-section" style="page-break-after: always;">
        <div class="header">
          <div class="title">${target.name} 课表</div>
          <div class="subtitle">批量打印 - ${target.type === 'class' ? '班级' : target.type === 'teacher' ? '教师' : '教室'}</div>
        </div>
        
        <table class="schedule-table">
          <thead>
            <tr>
              <th class="time-column">时间</th>
              <th>周一</th>
              <th>周二</th>
              <th>周三</th>
              <th>周四</th>
              <th>周五</th>
            </tr>
          </thead>
          <tbody>
            ${generateEmptyTableRows()}
          </tbody>
        </table>
        
        <div class="footer">
          <p>生成时间: ${new Date().toLocaleString()}</p>
        </div>
      </div>
    `;
  }
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>批量打印课表</title>
      <style>
        @page {
          size: ${pageSize} ${orientation};
          margin: 1cm;
        }
        body {
          font-family: 'Microsoft YaHei', Arial, sans-serif;
          margin: 0;
          padding: 20px;
          background: white;
        }
        .schedule-section {
          margin-bottom: 30px;
        }
        .header {
          text-align: center;
          margin-bottom: 30px;
          border-bottom: 2px solid #333;
          padding-bottom: 20px;
        }
        .title {
          font-size: 24px;
          font-weight: bold;
          margin-bottom: 10px;
        }
        .subtitle {
          font-size: 16px;
          color: #666;
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
        .time-column {
          width: 120px;
          background-color: #f9f9f9;
        }
        .footer {
          margin-top: 30px;
          text-align: center;
          font-size: 12px;
          color: #999;
          border-top: 1px solid #eee;
          padding-top: 20px;
        }
        @media print {
          body { margin: 0; }
          .no-print { display: none; }
          .schedule-section { page-break-after: always; }
        }
      </style>
    </head>
    <body>
      ${schedulesHtml}
      
      <div class="no-print" style="text-align: center; margin-top: 20px;">
        <button onclick="window.print()">批量打印课表</button>
        <button onclick="window.close()">关闭窗口</button>
      </div>
    </body>
    </html>
  `;
}

/**
 * 生成空表格行（用于批量打印模板）
 * 
 * @returns HTML字符串
 */
function generateEmptyTableRows(): string {
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
  
  let rows = '';
  
  for (let period = 1; period <= 8; period++) {
    rows += '<tr>';
    rows += `<td class="time-column">${timeSlots[period - 1]}</td>`;
    
    for (let day = 1; day <= 5; day++) {
      rows += '<td></td>';
    }
    
    rows += '</tr>';
  }
  
  return rows;
}

/**
 * 下载文件
 * 
 * @param blob 文件blob
 * @param fileName 文件名
 */
function downloadFile(blob: Blob, fileName: string): void {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
} 