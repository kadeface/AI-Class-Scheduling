/**
 * 课表相关类型定义
 * 
 * 定义课表组件中使用的数据结构和接口
 */

/**
 * 时间段定义
 */
export interface TimeSlot {
  dayOfWeek: number;    // 星期几 (1-7, 1=周一)
  period: number;       // 第几节课 (1-8)
  startTime: string;    // 开始时间 (HH:mm)
  endTime: string;      // 结束时间 (HH:mm)
}

/**
 * 课程信息
 */
export interface Course {
  _id: string;
  name: string;         // 课程名称
  code: string;         // 课程代码
  subject: string;      // 学科分类
  color?: string;       // 课程颜色（用于UI显示）
}

/**
 * 教师信息
 */
export interface Teacher {
  _id: string;
  name: string;         // 教师姓名
  employeeId: string;   // 工号
  department: string;   // 部门
}

/**
 * 班级信息
 */
export interface Class {
  _id: string;
  name: string;         // 班级名称
  grade: string;        // 年级
  studentCount: number; // 学生人数
}

/**
 * 场室信息
 */
export interface Room {
  _id: string;
  name: string;         // 场室名称
  code: string;         // 场室编号
  type: string;         // 场室类型
  building: string;     // 所在建筑
  capacity: number;     // 容纳人数
}

/**
 * 课程安排项
 */
export interface ScheduleItem {
  _id?: string;
  class: {
    _id: string;
    name: string;
    grade: number;
  } | null;
  course: {
    _id: string;
    name: string;
    subject: string;
  } | null;
  teacher: {
    _id: string;
    name: string;
  } | null;
  room: {
    _id: string;
    name: string;
    type: string;
  } | null;
  dayOfWeek: number;
  period: number;
  academicYear: string;
  semester: string;
  status: 'active' | 'draft' | 'suspended' | 'replaced';
}

/**
 * 课表网格单元格
 */
export interface ScheduleGridCell {
  dayOfWeek: number;
  period: number;
  item?: ScheduleItem;    // 课程安排项（可为空）
  isAvailable: boolean;   // 是否可用
  conflictLevel?: 'none' | 'soft' | 'hard'; // 冲突级别
}

/**
 * 课表网格数据
 */
export interface ScheduleGrid {
  rows: number;           // 行数（课时数）
  columns: number;        // 列数（工作日数）
  cells: ScheduleGridCell[][]; // 网格单元格
  timeSlots: TimeSlot[];  // 时间段定义
  weekdays: string[];     // 工作日名称
}

/**
 * 拖拽操作数据
 */
export interface DragData {
  scheduleItem: ScheduleItem;
  sourcePosition: {
    dayOfWeek: number;
    period: number;
  };
}

/**
 * 放置操作数据
 */
export interface DropData {
  targetPosition: {
    dayOfWeek: number;
    period: number;
  };
  isValidDrop: boolean;
  conflictInfo?: {
    type: 'teacher' | 'room' | 'class';
    message: string;
  };
}

/**
 * 课表视图类型
 */
export type ScheduleViewType = 'class' | 'teacher' | 'room' | 'overview';

/**
 * 课表配置
 */
export interface ScheduleConfig {
  viewType: ScheduleViewType;
  targetId?: string;      // 查看目标ID（班级/教师/场室ID）
  showTimeSlots: boolean; // 是否显示时间段
  showWeekends: boolean;  // 是否显示周末
  enableDragDrop: boolean; // 是否启用拖拽
  compactMode: boolean;   // 是否启用紧凑模式
  highlightConflicts: boolean; // 是否高亮冲突
}

/**
 * 课表操作类型
 */
export type ScheduleAction = 
  | { type: 'MOVE_ITEM'; payload: { item: ScheduleItem; from: TimeSlot; to: TimeSlot } }
  | { type: 'ADD_ITEM'; payload: { item: ScheduleItem; position: TimeSlot } }
  | { type: 'REMOVE_ITEM'; payload: { itemId: string } }
  | { type: 'UPDATE_ITEM'; payload: { item: ScheduleItem } }
  | { type: 'LOAD_SCHEDULE'; payload: { items: ScheduleItem[] } }
  | { type: 'CLEAR_SCHEDULE' };

/**
 * 课表组件Props
 */
export interface ScheduleGridProps {
  schedule: ScheduleGrid;
  config: ScheduleConfig;
  onItemMove?: (item: ScheduleItem, from: TimeSlot, to: TimeSlot) => Promise<boolean>;
  onItemClick?: (item: ScheduleItem) => void;
  onCellClick?: (dayOfWeek: number, period: number) => void;
  onItemEdit?: (item: ScheduleItem) => void;
  onItemDelete?: (item: ScheduleItem) => void;
  loading?: boolean;
  className?: string;
}

/**
 * 课程卡片Props
 */
export interface CourseCardProps {
  item: ScheduleItem;
  isDragging?: boolean;
  isDroppable?: boolean;
  onClick?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  showDetails?: boolean;
  compact?: boolean;
  className?: string;
}

/**
 * 课程安排相关类型定义
 */

export interface ConflictInfo {
  type: 'teacher' | 'class' | 'room';
  message: string;
  conflictingSchedule: ScheduleItem;
}

export interface Option {
  _id: string;
  name: string;
  [key: string]: any;
}