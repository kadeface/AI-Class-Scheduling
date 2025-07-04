/**
 * 数据访问安全包装函数
 * 
 * 用于安全地访问可能为null/undefined的对象属性，
 * 避免运行时错误，提供默认值。
 */

import { ScheduleItem } from '@/types/schedule';
import * as XLSX from 'xlsx';
import { ImportTemplate } from './import-templates';

/**
 * 安全获取班级名称
 * 
 * Args:
 *   classObj: 班级对象，可能为null
 * 
 * Returns:
 *   string: 班级名称或默认值
 */
export function getClassName(classObj: any): string {
  return classObj?.name || '未知班级';
}

/**
 * 安全获取教师名称
 * 
 * Args:
 *   teacher: 教师对象，可能为null
 * 
 * Returns:
 *   string: 教师名称或默认值
 */
export function getTeacherName(teacher: any): string {
  return teacher?.name || '未知教师';
}

/**
 * 安全获取课程名称
 * 
 * Args:
 *   course: 课程对象，可能为null
 * 
 * Returns:
 *   string: 课程名称或默认值
 */
export function getCourseName(course: any): string {
  return course?.name || '未知课程';
}

/**
 * 安全获取教室名称
 * 
 * Args:
 *   room: 教室对象，可能为null
 * 
 * Returns:
 *   string: 教室名称或默认值
 */
export function getRoomName(room: any): string {
  return room?.name || '未知教室';
}

/**
 * 安全获取课程安排显示信息
 * 
 * Args:
 *   schedule: 课程安排对象
 * 
 * Returns:
 *   object: 包含安全访问属性的对象
 */
export function getScheduleDisplayInfo(schedule: ScheduleItem) {
  return {
    className: getClassName(schedule.class),
    teacherName: getTeacherName(schedule.teacher),
    courseName: getCourseName(schedule.course),
    roomName: getRoomName(schedule.room),
    timeSlot: `周${schedule.dayOfWeek || '?'} 第${schedule.period || '?'}节`,
    statusText: schedule.status === 'active' ? '生效' : 
                schedule.status === 'suspended' ? '暂停' :
                schedule.status === 'replaced' ? '已调课' : '草稿'
  };
}

/**
 * 检查课程安排数据完整性
 * 
 * Args:
 *   schedule: 课程安排对象
 * 
 * Returns:
 *   boolean: 数据是否完整
 */
export function isValidSchedule(schedule: any): boolean {
  return !!(
    schedule &&
    schedule.class &&
    schedule.teacher &&
    schedule.room &&
    schedule.course &&
    schedule.dayOfWeek &&
    schedule.period
  );
}

/**
 * 安全的下拉选项映射函数
 * 
 * Args:
 *   items: 数据项数组，可能为null/undefined
 *   valueKey: 作为value的字段名，默认'_id'
 *   labelKey: 作为label的字段名，默认'name'
 * 
 * Returns:
 *   Array: 格式化的选项数组
 */
export function safeMapToOptions(
  items: any[] | null | undefined,
  valueKey: string = '_id',
  labelKey: string = 'name'
): Array<{ value: string; label: string }> {
  if (!Array.isArray(items)) {
    return [];
  }
  
  return items
    .filter(item => item && item[valueKey] && item[labelKey])
    .map(item => ({
      value: item[valueKey],
      label: item[labelKey]
    }));
}

/**
 * 安全的搜索过滤函数
 * 
 * Args:
 *   items: 要搜索的数组
 *   searchTerm: 搜索词
 *   searchFields: 要搜索的字段路径数组
 * 
 * Returns:
 *   Array: 过滤后的数组
 */
export function safeSearch<T>(
  items: T[] | null | undefined,
  searchTerm: string,
  searchFields: string[]
): T[] {
  if (!Array.isArray(items) || !searchTerm) {
    return items || [];
  }
  
  const searchLower = searchTerm.toLowerCase();
  
  return items.filter(item => {
    return searchFields.some(field => {
      const value = getNestedValue(item, field);
      return typeof value === 'string' && 
             value.toLowerCase().includes(searchLower);
    });
  });
}

/**
 * 安全获取嵌套对象属性
 * 
 * Args:
 *   obj: 源对象
 *   path: 属性路径，如 'class.name'
 * 
 * Returns:
 *   any: 属性值或undefined
 */
export function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((current, key) => {
    return current?.[key];
  }, obj);
}

/**
 * 类型守卫：检查是否为有效的选项对象
 * 
 * Args:
 *   item: 待检查的对象
 * 
 * Returns:
 *   boolean: 是否为有效选项
 */
export function isValidOption(item: any): item is { _id: string; name: string } {
  return item && 
         typeof item._id === 'string' && 
         typeof item.name === 'string';
} 

function downloadXlsxTemplate(template: ImportTemplate<any>) {
  const ws = XLSX.utils.json_to_sheet(template.exampleData, { header: template.headers });
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, template.name);
  XLSX.writeFile(wb, `${template.name}导入模板.xlsx`);
}