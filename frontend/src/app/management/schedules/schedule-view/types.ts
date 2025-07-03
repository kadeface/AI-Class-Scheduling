/**
 * 课表展示相关的类型定义
 */

/**
 * 课程时段接口定义
 */
export interface CourseSlot {
  scheduleId?: string;  // 添加课程安排记录ID，用于调课操作
  courseId: string;
  courseName: string;
  subject: string;
  teacherId: string;
  teacherName: string;
  roomId: string;
  roomName: string;
  duration: number;
  notes?: string;
}

/**
 * 周课表接口定义
 */
export interface WeekSchedule {
  [dayOfWeek: number]: {
    [period: number]: CourseSlot | null;
  };
}

/**
 * 课表数据接口
 */
export interface ScheduleViewData {
  id: string;
  type: 'class' | 'teacher' | 'room';
  targetId: string;
  targetName: string;
  academicYear: string;
  semester: string;
  weekSchedule: WeekSchedule;
  metadata: {
    totalCourses: number;
    totalHours: number;
    conflicts: number;
    lastUpdated: Date;
  };
}

/**
 * 视图模式类型
 */
export type ViewMode = 'class' | 'teacher' | 'room';

/**
 * 筛选条件接口
 */
export interface ScheduleFilters {
  academicYear?: string;
  semester?: string;
  grade?: number;
  subject?: string;
  teacher?: string;
}

/**
 * 课表选项接口
 */
export interface ScheduleOption {
  _id: string;
  name: string;
  grade?: number;
  subjects?: string[];
  roomNumber?: string;
  type?: string;
}

/**
 * 学科颜色映射
 */
export const SUBJECT_COLORS: Record<string, string> = {
  '语文': '#ff6b6b',
  '数学': '#4ecdc4',
  '英语': '#45b7d1',
  '物理': '#96ceb4',
  '化学': '#feca57',
  '生物': '#ff9ff3',
  '历史': '#54a0ff',
  '地理': '#5f27cd',
  '政治': '#00d2d3',
  '体育': '#ff6348',
  '音乐': '#ff9f43',
  '美术': '#ee5a24',
  '信息技术': '#10ac84'
};

/**
 * 时间配置
 */
export const TIME_CONFIG = {
  DAYS: [
    { value: 1, label: '周一', short: '一' },
    { value: 2, label: '周二', short: '二' },
    { value: 3, label: '周三', short: '三' },
    { value: 4, label: '周四', short: '四' },
    { value: 5, label: '周五', short: '五' }
  ],
  PERIODS: [
    { value: 1, label: '第1节', time: '08:00-08:45' },
    { value: 2, label: '第2节', time: '08:55-09:40' },
    { value: 3, label: '第3节', time: '10:00-10:45' },
    { value: 4, label: '第4节', time: '10:55-11:40' },
    { value: 5, label: '第5节', time: '14:00-14:45' },
    { value: 6, label: '第6节', time: '14:55-15:40' },
    { value: 7, label: '第7节', time: '16:00-16:45' },
    { value: 8, label: '第8节', time: '16:55-17:40' }
  ]
};

/**
 * API响应接口
 */
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
} 