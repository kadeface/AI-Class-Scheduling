/**
 * API调用工具函数
 * 
 * 提供与后端API交互的统一接口，包括错误处理和类型安全
 */

import subjects from './subjects.json';

// 基础配置
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

/**
 * 统一API响应类型
 */
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

/**
 * 分页响应类型
 */ 
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * HTTP请求配置
 */
interface RequestConfig {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  headers?: Record<string, string>;
  body?: any;
}

/**
 * 发送HTTP请求的基础函数
 * 
 * Args:
 *   endpoint: API端点路径
 *   config: 请求配置
 * 
 * Returns:
 *   Promise<ApiResponse<T>>: API响应
 * 
 * Raises:
 *   Error: 网络错误或API错误
 */async function apiRequest<T>(
  endpoint: string,
  config: RequestConfig = {}
): Promise<ApiResponse<T>> {
  try {
    const url = `${API_BASE_URL}${endpoint}`;
    const { method = 'GET', headers = {}, body } = config;

    const requestHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      ...headers,
    };

    const requestConfig: RequestInit = {
      method,
      headers: requestHeaders,
    };

    if (body && method !== 'GET') {
      requestConfig.body = JSON.stringify(body);
    }

    const response = await fetch(url, requestConfig);
    const data: ApiResponse<T> = await response.json();

    if (!response.ok) {
      throw new Error(data.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return data;
  } catch (error) {
    console.error('API请求失败:', error);
    throw error;
  }
}

// ==================== 教师API ====================

/**
 * 教师数据类型
 */
export interface Teacher {
  _id: string;
  name: string;
  employeeId: string;
  department: string;
  position: string;
  subjects: string[];
  maxWeeklyHours: number;
  status: string;
  unavailableSlots: any[];
  preferences: Record<string, any>;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TimeSlot {
  dayOfWeek: number;
  periods: number[];
}

export interface TeacherPreferences {
  preferredSlots?: TimeSlot[];
  avoidSlots?: TimeSlot[];
  maxContinuousHours?: number;
  preferMorning?: boolean;
  avoidFridayAfternoon?: boolean;
}

export interface CreateTeacherRequest {
  name: string;
  employeeId: string;
  department: string;
  position: string;
  subjects: string[];
  maxWeeklyHours: number;
  status: string;
  unavailableSlots?: any[];
  preferences?: Record<string, any>;
}

/**
 * 教师API函数
 */
export const teacherApi = {
  // 获取教师列表
  getList: (params?: Record<string, any>) => {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    return apiRequest<PaginatedResponse<Teacher>>(`/teachers${query}`);
  },

  // 获取单个教师
  getById: (id: string) => apiRequest<Teacher>(`/teachers/${id}`),

  // 创建教师
  create: (data: CreateTeacherRequest) => 
    apiRequest<Teacher>('/teachers', { method: 'POST', body: data }),

  // 更新教师
  update: (id: string, data: Partial<CreateTeacherRequest>) =>
    apiRequest<Teacher>(`/teachers/${id}`, { method: 'PUT', body: data }),

  // 删除教师
  delete: (id: string) =>
    apiRequest<Teacher>(`/teachers/${id}`, { method: 'DELETE' }),

  // 永久删除教师
  permanentDelete: (id: string) =>
    apiRequest<void>(`/teachers/${id}/permanent`, { method: 'DELETE' }),
};// ==================== 班级API ====================

/**
 * 班级数据类型
 */
export interface Class {
  _id: string;
  name: string;
  grade: number;
  studentCount: number;
  homeroom?: {
    _id: string;
    name: string;
    roomNumber: string;
  };
  classTeacher?: {
    _id: string;
    name: string;
    employeeId: string;
  };
  academicYear: string;
  semester: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateClassRequest {
  name: string;
  grade: number;
  studentCount: number;
  homeroom?: string;
  classTeacher?: string;
  academicYear: string;
  semester: number;
}

/**
 * 班级API函数
 */
export const classApi = {
  getList: (params?: Record<string, any>) => {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    return apiRequest<PaginatedResponse<Class>>(`/classes${query}`);
  },

  getById: (id: string) => apiRequest<Class>(`/classes/${id}`),

  create: (data: CreateClassRequest) => 
    apiRequest<Class>('/classes', { method: 'POST', body: data }),

  update: (id: string, data: Partial<CreateClassRequest>) =>
    apiRequest<Class>(`/classes/${id}`, { method: 'PUT', body: data }),

  delete: (id: string) =>
    apiRequest<Class>(`/classes/${id}`, { method: 'DELETE' }),

  permanentDelete: (id: string) =>
    apiRequest<void>(`/classes/${id}/permanent`, { method: 'DELETE' }),
};

// ==================== 课程API ====================

/**
 * 课程数据类型
 */
export interface Course {
  _id: string;
  name: string;
  subject: string;
  courseCode: string;
  weeklyHours: number;
  requiresContinuous: boolean;
  continuousHours?: number;
  roomRequirements: RoomRequirement;
  isWeeklyAlternating: boolean;
  description?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface RoomRequirement {
  types: string[];
  specificRoom?: string;
  capacity?: number;
  equipment?: string[];
}

export interface CreateCourseRequest {
  name: string;
  subject: string;
  courseCode: string;
  weeklyHours: number;
  requiresContinuous?: boolean;
  continuousHours?: number;
  roomRequirements: RoomRequirement;
  isWeeklyAlternating?: boolean;
  description?: string;
}

/**
 * 课程API函数
 */
export const courseApi = {
  getList: (params?: Record<string, any>) => {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    return apiRequest<PaginatedResponse<Course>>(`/courses${query}`);
  },

  getById: (id: string) => apiRequest<Course>(`/courses/${id}`),

  create: (data: CreateCourseRequest) => 
    apiRequest<Course>('/courses', { method: 'POST', body: data }),

  update: (id: string, data: Partial<CreateCourseRequest>) =>
    apiRequest<Course>(`/courses/${id}`, { method: 'PUT', body: data }),

  delete: (id: string) =>
    apiRequest<Course>(`/courses/${id}`, { method: 'DELETE' }),

  permanentDelete: (id: string) =>
    apiRequest<void>(`/courses/${id}/permanent`, { method: 'DELETE' }),
};// ==================== 场室API ====================

/**
 * 场室数据类型
 */
export interface Room {
  _id: string;
  name: string;
  roomNumber: string;
  type: string;
  capacity: number;
  building?: string;
  floor?: number;
  equipment: string[];
  assignedClass?: {
    _id: string;
    name: string;
    grade: number;
  };
  unavailableSlots: UnavailableSlot[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UnavailableSlot {
  dayOfWeek: number;
  periods: number[];
  reason?: string;
}

export interface CreateRoomRequest {
  name: string;
  roomNumber: string;
  type: string;
  capacity: number;
  building?: string;
  floor?: number;
  equipment?: string[];
  assignedClass?: string;
  unavailableSlots?: UnavailableSlot[];
}

/**
 * 场室API函数
 */
export const roomApi = {
  getList: (params?: Record<string, any>) => {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    return apiRequest<PaginatedResponse<Room>>(`/rooms${query}`);
  },

  getById: (id: string) => apiRequest<Room>(`/rooms/${id}`),

  create: (data: CreateRoomRequest) => 
    apiRequest<Room>('/rooms', { method: 'POST', body: data }),

  update: (id: string, data: Partial<CreateRoomRequest>) =>
    apiRequest<Room>(`/rooms/${id}`, { method: 'PUT', body: data }),

  delete: (id: string) =>
    apiRequest<Room>(`/rooms/${id}`, { method: 'DELETE' }),

  permanentDelete: (id: string) =>
    apiRequest<void>(`/rooms/${id}/permanent`, { method: 'DELETE' }),
};

// ==================== 工具函数 ====================

/**
 * 星期数字转中文
 */
export const WEEKDAYS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

/**
 * 学科列表（自动与后端同步）
 */
export const SUBJECTS = subjects as string[];

/**
 * 教室类型列表
 */
export const ROOM_TYPES = [
  '普通教室', '多媒体教室', '实验室', '计算机房',
  '语音室', '美术室', '音乐室', '舞蹈室',
  '体育馆', '操场', '图书馆', '会议室'
];

/**
 * 设备类型列表
 */
export const EQUIPMENT_TYPES = [
  '投影仪', '电脑', '智慧黑板', '音响设备', '空调',
  '实验台', '显微镜', '钢琴', '体育器材', '网络设备'
];

/**
 * 格式化时间段显示
 */
export function formatTimeSlot(slot: TimeSlot): string {
  const dayName = WEEKDAYS[slot.dayOfWeek];
  const periods = slot.periods.join(',');
  return `${dayName} 第${periods}节`;
}

/**
 * 格式化学年显示
 */
export function formatAcademicYear(year: string): string {
  return `${year}学年`;
}

/**
 * 格式化学期显示
 */
export function formatSemester(semester: number): string {
  return semester === 1 ? '上学期' : '下学期';
}// ==================== 教学计划API ====================

/**
 * 课程安排接口定义
 */
export interface CourseAssignment {
  course: {
    _id: string;
    name: string;
    subject: string;
    courseCode: string;
    weeklyHours: number;
  };
  teacher: {
    _id: string;
    name: string;
    employeeId: string;
    subjects: string[];
  };
  weeklyHours: number;
  requiresContinuous?: boolean;
  continuousHours?: number;
  preferredTimeSlots?: TimeSlot[];
  avoidTimeSlots?: TimeSlot[];
  notes?: string;
}

/**
 * 教学计划数据类型
 */
export interface TeachingPlan {
  _id: string;
  class: {
    _id: string;
    name: string;
    grade: number;
  };
  academicYear: string;
  semester: number;
  courseAssignments: CourseAssignment[];
  totalWeeklyHours: number;
  status: 'draft' | 'approved' | 'active' | 'archived';
  approvedBy?: {
    _id: string;
    username: string;
    profile: { name: string };
  };
  approvedAt?: string;
  notes?: string;
  createdBy: {
    _id: string;
    username: string;
    profile: { name: string };
  };
  updatedBy?: {
    _id: string;
    username: string;
    profile: { name: string };
  };
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * 创建教学计划请求接口
 */
export interface CreateTeachingPlanRequest {
  class: string;
  academicYear: string;
  semester: number;
  courseAssignments: {
    course: string;
    teacher: string;
    weeklyHours: number;
    requiresContinuous?: boolean;
    continuousHours?: number;
    preferredTimeSlots?: TimeSlot[];
    avoidTimeSlots?: TimeSlot[];
    notes?: string;
  }[];
  notes?: string;
}

/**
 * 教学计划查询参数
 */
export interface TeachingPlanQueryParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  class?: string;
  academicYear?: string;
  semester?: number;
  status?: string;
  teacher?: string;
  course?: string;
  isActive?: boolean;
  keyword?: string;
}

/**
 * 教学计划API调用函数
 */
export const teachingPlanApi = {
  getList: (params?: TeachingPlanQueryParams) => 
    apiRequest<PaginatedResponse<TeachingPlan>>('/teaching-plans', { 
      method: 'GET',
      body: params 
    }),

  getById: (id: string) => 
    apiRequest<TeachingPlan>(`/teaching-plans/${id}`),

  create: (data: CreateTeachingPlanRequest) => 
    apiRequest<TeachingPlan>('/teaching-plans', { 
      method: 'POST', 
      body: data 
    }),

  update: (id: string, data: Partial<CreateTeachingPlanRequest>) =>
    apiRequest<TeachingPlan>(`/teaching-plans/${id}`, { 
      method: 'PUT', 
      body: data 
    }),

  delete: (id: string) =>
    apiRequest<void>(`/teaching-plans/${id}`, { method: 'DELETE' }),

  permanentDelete: (id: string) =>
    apiRequest<void>(`/teaching-plans/${id}/permanent`, { method: 'DELETE' }),

  approve: (id: string, approve: boolean, comments?: string) =>
    apiRequest<TeachingPlan>(`/teaching-plans/${id}/approve`, {
      method: 'POST',
      body: { approve, comments }
    }),

  getCurrent: (classId: string, academicYear: string, semester: number) =>
    apiRequest<TeachingPlan>(`/teaching-plans/current/${classId}/${academicYear}/${semester}`)
};

// ==================== 排课规则API ====================

/**
 * 时间规则接口定义
 */
export interface TimeRules {
  dailyPeriods: number;
  workingDays: number[];
  periodDuration: number;
  breakDuration: number;
  lunchBreakStart: number;
  lunchBreakDuration: number;
  morningPeriods: number[];
  afternoonPeriods: number[];
  forbiddenSlots?: TimeSlot[];

}

/**
 * 教师约束接口定义
 */
export interface TeacherConstraints {
  maxDailyHours: number;
  maxContinuousHours: number;
  minRestBetweenCourses: number;
  avoidFridayAfternoon: boolean;
  respectTeacherPreferences: boolean;
  allowCrossGradeTeaching: boolean;
}

/**
 * 教室约束接口定义
 */
export interface RoomConstraints {
  respectCapacityLimits: boolean;
  allowRoomSharing: boolean;
  preferFixedClassrooms: boolean;
  specialRoomPriority: 'strict' | 'preferred' | 'flexible';
}

/**
 * 核心课程策略接口定义
 */
export interface ICoreSubjectStrategy {
  enableCoreSubjectStrategy: boolean;        // 是否启用核心课程策略
  coreSubjects: string[];                    // 核心课程列表（如：语文、数学、英语等）
  distributionMode: 'daily' | 'balanced' | 'concentrated'; // 分布模式
  maxDailyOccurrences: number;               // 每日最大出现次数（建议：1-2次）
  minDaysPerWeek: number;                    // 每周最少出现天数（建议：4-5天）
  avoidConsecutiveDays: boolean;             // 是否避免连续天安排
  preferredTimeSlots: number[];              // 偏好时间段（节次数组）
  avoidTimeSlots: number[];                  // 避免时间段（节次数组）
  maxConcentration: number;                  // 最大集中度（连续天数限制）
  balanceWeight: number;                     // 平衡权重（0-100）
  enforceEvenDistribution: boolean;          // 是否强制均匀分布
}

/**
 * 课程排列规则接口定义
 */
export interface CourseArrangementRules {
  allowContinuousCourses: boolean;
  maxContinuousHours: number;
  distributionPolicy: 'balanced' | 'concentrated' | 'flexible';
  avoidFirstLastPeriod: string[];
  coreSubjectPriority: boolean;
  labCoursePreference: 'morning' | 'afternoon' | 'flexible';
  
  // 新增：核心课程策略
  coreSubjectStrategy: ICoreSubjectStrategy;
}

/**
 * 冲突处理规则接口定义
 */
export interface ConflictResolutionRules {
  teacherConflictResolution: 'strict' | 'warn' | 'ignore';
  roomConflictResolution: 'strict' | 'warn' | 'ignore';
  classConflictResolution: 'strict' | 'warn' | 'ignore';
  allowOverride: boolean;
  priorityOrder: string[];
}

/**
 * 排课规则数据类型
 */
export interface SchedulingRules {
  _id: string;
  name: string;
  description?: string;
  schoolType: 'primary' | 'middle' | 'high' | 'mixed';
  academicYear: string;
  semester: number;
  timeRules: TimeRules;
  teacherConstraints: TeacherConstraints;
  roomConstraints: RoomConstraints;
  courseArrangementRules: CourseArrangementRules;
  conflictResolutionRules: ConflictResolutionRules;
  isDefault: boolean;
  isActive: boolean;
  createdBy: {
    _id: string;
    username: string;
    profile: { name: string };
  };
  updatedBy?: {
    _id: string;
    username: string;
    profile: { name: string };
  };
  createdAt: string;
  updatedAt: string;
}

/**
 * 创建排课规则请求接口
 */
export interface CreateSchedulingRulesRequest {
  name: string;
  description?: string;
  schoolType: 'primary' | 'middle' | 'high' | 'mixed';
  academicYear: string;
  semester: number;
  timeRules: TimeRules;
  teacherConstraints: TeacherConstraints;
  roomConstraints: RoomConstraints;
  courseArrangementRules: CourseArrangementRules;
  conflictResolutionRules: ConflictResolutionRules;
  isDefault?: boolean;
  createdBy?: string;                  // 创建人ID（可选，后端会自动设置）
}

/**
 * 排课规则查询参数
 */
export interface SchedulingRulesQueryParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  schoolType?: string;
  academicYear?: string;
  semester?: number;
  isDefault?: boolean;
  isActive?: boolean;
  keyword?: string;
}

/**
 * 排课规则API调用函数
 */
export const schedulingRulesApi = {
  getList: (params?: SchedulingRulesQueryParams) => 
    apiRequest<PaginatedResponse<SchedulingRules>>('/scheduling-rules', { 
      method: 'GET',
      body: params 
    }),

  getById: (id: string) => 
    apiRequest<SchedulingRules>(`/scheduling-rules/${id}`),

  create: (data: CreateSchedulingRulesRequest) => 
    apiRequest<SchedulingRules>('/scheduling-rules', { 
      method: 'POST', 
      body: data 
    }),

  update: (id: string, data: Partial<CreateSchedulingRulesRequest>) =>
    apiRequest<SchedulingRules>(`/scheduling-rules/${id}`, { 
      method: 'PUT', 
      body: data 
    }),

  delete: (id: string) =>
    apiRequest<void>(`/scheduling-rules/${id}`, { method: 'DELETE' }),

  permanentDelete: (id: string) =>
    apiRequest<void>(`/scheduling-rules/${id}/permanent`, { method: 'DELETE' }),

  setDefault: (id: string) =>
    apiRequest<SchedulingRules>(`/scheduling-rules/${id}/set-default`, { 
      method: 'POST' 
    }),

  getDefault: (academicYear: string, semester: number) =>
    apiRequest<SchedulingRules>(`/scheduling-rules/default/${academicYear}/${semester}`),

  copy: (id: string, targetAcademicYear: string, targetSemester: number, newName: string) =>
    apiRequest<SchedulingRules>(`/scheduling-rules/${id}/copy`, {
      method: 'POST',
      body: { targetAcademicYear, targetSemester, newName }
    })
};

// ==================== 核心课程策略API ====================

/**
 * 获取核心课程策略配置
 * 
 * Args:
 *   rulesId: 排课规则ID
 * 
 * Returns:
 *   Promise<ApiResponse<{rulesId: string, coreSubjectStrategy: ICoreSubjectStrategy | null, isEnabled: boolean}>>: 核心课程策略配置
 * 
 * Raises:
 *   Error: 网络错误或API错误
 */
export async function getCoreSubjectStrategy(rulesId: string): Promise<ApiResponse<{
  rulesId: string;
  coreSubjectStrategy: ICoreSubjectStrategy | null;
  isEnabled: boolean;
}>> {
  return apiRequest(`/scheduling-rules/${rulesId}/core-subject-strategy`);
}

/**
 * 更新核心课程策略配置
 * 
 * Args:
 *   rulesId: 排课规则ID
 *   strategy: 核心课程策略配置
 * 
 * Returns:
 *   Promise<ApiResponse<{rulesId: string, coreSubjectStrategy: ICoreSubjectStrategy, message: string}>>: 更新结果
 * 
 * Raises:
 *   Error: 网络错误或API错误
 */
export async function updateCoreSubjectStrategy(
  rulesId: string, 
  strategy: ICoreSubjectStrategy
): Promise<ApiResponse<{
  rulesId: string;
  coreSubjectStrategy: ICoreSubjectStrategy;
  message: string;
}>> {
  return apiRequest(`/scheduling-rules/${rulesId}/core-subject-strategy`, {
    method: 'PUT',
    body: strategy
  });
}

/**
 * 验证核心课程策略配置
 * 
 * Args:
 *   rulesId: 排课规则ID
 *   strategy: 核心课程策略配置
 * 
 * Returns:
 *   Promise<ApiResponse<{isValid: boolean, errors: string[], suggestions: string[]}>>: 验证结果
 * 
 * Raises:
 *   Error: 网络错误或API错误
 */
export async function validateCoreSubjectStrategy(
  rulesId: string, 
  strategy: ICoreSubjectStrategy
): Promise<ApiResponse<{
  isValid: boolean;
  errors: string[];
  suggestions: string[];
}>> {
  return apiRequest(`/scheduling-rules/${rulesId}/core-subject-strategy/validate`, {
    method: 'POST',
    body: strategy
  });
}

/**
 * 分析核心课程分布情况
 * 
 * Args:
 *   rulesId: 排课规则ID
 * 
 * Returns:
 *   Promise<ApiResponse<{currentDistribution: Record<string, number>, recommendations: string[], quality: string}>>: 分布分析结果
 * 
 * Raises:
 *   Error: 网络错误或API错误
 */
export async function analyzeCoreSubjectDistribution(rulesId: string): Promise<ApiResponse<{
  currentDistribution: Record<string, number>;
  recommendations: string[];
  quality: string;
}>> {
  return apiRequest(`/scheduling-rules/${rulesId}/core-subject-distribution-analysis`);
}

// ==================== 常量定义 ====================

/**
 * 学校类型列表
 */
export const SCHOOL_TYPES = [
  { value: 'primary', label: '小学' },
  { value: 'middle', label: '初中' },
  { value: 'high', label: '高中' },
  { value: 'mixed', label: '完全中学' }
];

/**
 * 教学计划状态列表
 */
export const TEACHING_PLAN_STATUS = [
  { value: 'draft', label: '草稿', color: 'gray' },
  { value: 'approved', label: '已审批', color: 'blue' },
  { value: 'active', label: '激活', color: 'green' },
  { value: 'archived', label: '已归档', color: 'yellow' }
];

/**
 * 课程分布策略列表
 */
export const DISTRIBUTION_POLICIES = [
  { value: 'balanced', label: '均衡分布' },
  { value: 'concentrated', label: '集中安排' },
  { value: 'flexible', label: '灵活安排' }
];

/**
 * 冲突处理策略列表
 */
export const CONFLICT_RESOLUTION_STRATEGIES = [
  { value: 'strict', label: '严格禁止' },
  { value: 'warn', label: '警告提示' },
  { value: 'ignore', label: '忽略冲突' }
];

/**
 * 时间偏好选项
 */
export const TIME_PREFERENCES = [
  { value: 'morning', label: '上午' },
  { value: 'afternoon', label: '下午' },
  { value: 'flexible', label: '灵活安排' }
];

/**
 * 特殊教室优先级选项
 */
export const ROOM_PRIORITY_OPTIONS = [
  { value: 'strict', label: '严格要求' },
  { value: 'preferred', label: '优先安排' },
  { value: 'flexible', label: '灵活调整' }
];

/**
 * 工作日选项列表（用于排课规则配置）
 */
export const WEEKDAY_OPTIONS = [
  { value: 1, label: '周一' },
  { value: 2, label: '周二' },
  { value: 3, label: '周三' },
  { value: 4, label: '周四' },
  { value: 5, label: '周五' },
  { value: 6, label: '周六' },
  { value: 7, label: '周日' }
];

/**
 * 核心课程策略分布模式选项
 */
export const CORE_SUBJECT_DISTRIBUTION_MODES = [
  { value: 'daily', label: '每日分布' },
  { value: 'balanced', label: '平衡分布' },
  { value: 'concentrated', label: '集中分布' }
] as const;

/**
 * 核心课程策略默认配置
 */
export const DEFAULT_CORE_SUBJECT_STRATEGY: ICoreSubjectStrategy = {
  enableCoreSubjectStrategy: true,
  coreSubjects: ['语文', '数学', '英语'],
  distributionMode: 'daily',
  maxDailyOccurrences: 2,
  minDaysPerWeek: 5,
  avoidConsecutiveDays: true,
  preferredTimeSlots: [1, 2, 3, 5, 6],
  avoidTimeSlots: [7, 8],
  maxConcentration: 3,
  balanceWeight: 80,
  enforceEvenDistribution: true
};

/**
 * 根据学校类型获取推荐的核心课程列表
 */
export function getRecommendedCoreSubjects(schoolType: string): string[] {
  switch (schoolType) {
    case 'primary':
      return ['语文', '数学', '英语', '科学', '道德与法治'];
    case 'middle':
      return ['语文', '数学', '英语', '物理', '化学', '生物'];
    case 'high':
      return ['语文', '数学', '英语', '物理', '化学', '生物', '历史', '地理', '政治'];
    default:
      return ['语文', '数学', '英语'];
  }
}

/**
 * 格式化教学计划状态显示
 */
export function formatTeachingPlanStatus(status: string): { label: string; color: string } {
  const statusInfo = TEACHING_PLAN_STATUS.find(s => s.value === status);
  return statusInfo || { label: status, color: 'gray' };
}

/**
 * 格式化学校类型显示
 */
export function formatSchoolType(schoolType: string): string {
  const type = SCHOOL_TYPES.find(t => t.value === schoolType);
  return type?.label || schoolType;
}