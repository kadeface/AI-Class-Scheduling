/**
 * 年级课程模板相关类型定义
 * 
 * 定义年级课程模板组件中使用的数据结构和接口
 */

/**
 * 时间段定义
 */
export interface TimeSlot {
  dayOfWeek: number;    // 星期几 (1-7, 1=周一)
  period: number;       // 第几节课 (1-8)
}

/**
 * 标准课程配置
 */
export interface StandardCourse {
  courseId: string;                 // 课程ID
  courseName: string;               // 课程名称
  weeklyHours: number;              // 周课时数
  priority: 'core' | 'elective' | 'activity';  // 课程优先级
  requiresContinuous: boolean;      // 是否需要连续排课
  continuousHours?: number;         // 连续课时数
  preferredTimeSlots: TimeSlot[];   // 偏好时间段
  avoidTimeSlots: TimeSlot[];       // 避免时间段
  notes?: string;                   // 备注
}

/**
 * 年级课程模板
 */
export interface GradeTemplate {
  _id: string;
  grade: string;                    // 年级标识
  name: string;                     // 模板名称
  description: string;              // 模板描述
  courses: StandardCourse[];        // 标准课程配置
  isDefault: boolean;               // 是否为默认模板
  isActive: boolean;                // 是否激活
  createdBy: string;                // 创建者ID
  createdAt: string;                // 创建时间
  updatedAt: string;                // 更新时间
}

/**
 * 创建模板请求
 */
export interface CreateGradeTemplateRequest {
  grade: string;
  name: string;
  description?: string;
  courses: StandardCourse[];
  isDefault?: boolean;
}

/**
 * 更新模板请求
 */
export interface UpdateGradeTemplateRequest {
  name?: string;
  description?: string;
  courses?: StandardCourse[];
  isDefault?: boolean;
  isActive?: boolean;
}

/**
 * 模板查询参数
 */
export interface GradeTemplateQueryParams {
  grade?: string;
  isActive?: boolean;
  isDefault?: boolean;
  keyword?: string;
}

/**
 * 模板列表响应
 */
export interface GradeTemplateListResponse {
  success: boolean;
  data: GradeTemplate[];
  message?: string;
  error?: string;
}

/**
 * 单个模板响应
 */
export interface GradeTemplateResponse {
  success: boolean;
  data: GradeTemplate;
  message?: string;
  error?: string;
}

/**
 * 复制模板请求
 */
export interface CopyTemplateRequest {
  newName: string;
  newGrade?: string;
}

/**
 * 模板优先级选项
 */
export const COURSE_PRIORITY_OPTIONS = [
  { value: 'core', label: '核心课程', description: '主要学科课程' },
  { value: 'elective', label: '选修课程', description: '可选学科课程' },
  { value: 'activity', label: '活动课程', description: '体育、艺术等活动' }
] as const;

/**
 * 年级选项
 */
export const GRADE_OPTIONS = [
  { value: '一年级', label: '一年级' },
  { value: '二年级', label: '二年级' },
  { value: '三年级', label: '三年级' },
  { value: '四年级', label: '四年级' },
  { value: '五年级', label: '五年级' },
  { value: '六年级', label: '六年级' },
  { value: '七年级', label: '七年级' },
  { value: '八年级', label: '八年级' },
  { value: '九年级', label: '九年级' },
  { value: '高一', label: '高一' },
  { value: '高二', label: '高二' },
  { value: '高三', label: '高三' }
] as const;
