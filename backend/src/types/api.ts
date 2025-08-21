/**
 * API响应类型定义
 * 
 * 定义统一的API响应格式和相关类型
 */

/**
 * 统一API响应接口
 * 
 * Args:
 *   T: 响应数据的类型
 */
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

/**
 * 分页查询参数接口
 */
export interface PaginationQuery {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * 分页响应数据接口
 * 
 * Args:
 *   T: 数据数组中元素的类型
 */
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * 用户创建请求接口
 */
export interface CreateUserRequest {
  username: string;
  password: string;
  role: 'admin' | 'staff' | 'teacher';
  profile: {
    name: string;
    employeeId?: string;
    email?: string;
    phone?: string;
    department?: string;
  };
}

/**
 * 用户更新请求接口
 */
export interface UpdateUserRequest {
  username?: string;
  role?: 'admin' | 'staff' | 'teacher';
  profile?: {
    name?: string;
    employeeId?: string;
    email?: string;
    phone?: string;
    department?: string;
  };
  isActive?: boolean;
}

/**
 * 用户查询条件接口
 */
export interface UserQueryOptions extends PaginationQuery {
  role?: 'admin' | 'staff' | 'teacher';
  isActive?: string | boolean; // 查询参数为字符串，内部转换为boolean
  department?: string;
  keyword?: string; // 搜索用户名或姓名
}

/**
 * 用户响应数据接口（不包含密码）
 */
export interface UserResponse {
  _id: string;
  username: string;
  role: 'admin' | 'staff' | 'teacher';
  profile: {
    name: string;
    employeeId?: string;
    email?: string;
    phone?: string;
    department?: string;
  };
  isActive: boolean;
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// ==================== 教师相关API类型 ====================

/**
 * 时间段接口定义
 */
export interface TimeSlot {
  dayOfWeek: number;
  periods: number[];
}

/**
 * 教师偏好设置接口
 */
export interface TeacherPreferences {
  preferredSlots?: TimeSlot[];
  avoidSlots?: TimeSlot[];
  maxContinuousHours?: number;
  preferMorning?: boolean;
  avoidFridayAfternoon?: boolean;
}

/**
 * 教师创建请求接口
 */
export interface CreateTeacherRequest {
  name: string;
  employeeId: string;
  subjects: string[];
  maxWeeklyHours: number;
  unavailableSlots?: TimeSlot[];
  preferences?: TeacherPreferences;
}

/**
 * 教师更新请求接口
 */
export interface UpdateTeacherRequest {
  name?: string;
  employeeId?: string;
  subjects?: string[];
  maxWeeklyHours?: number;
  unavailableSlots?: TimeSlot[];
  preferences?: TeacherPreferences;
  isActive?: boolean;
}

/**
 * 教师查询条件接口
 */
export interface TeacherQueryOptions extends PaginationQuery {
  subjects?: string; // 支持单个学科筛选
  isActive?: string | boolean;
  keyword?: string; // 搜索姓名或工号
}

/**
 * 教师响应数据接口
 */
export interface TeacherResponse {
  _id: string;
  name: string;
  employeeId: string;
  subjects: string[];
  maxWeeklyHours: number;
  unavailableSlots: TimeSlot[];
  preferences: TeacherPreferences;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ==================== 班级相关API类型 ====================

/**
 * 班级创建请求接口
 */
export interface CreateClassRequest {
  name: string;
  grade: number;
  studentCount: number;
  homeroom?: string; // Room ID
  classTeacher?: string; // Teacher ID
  academicYear: string;
  semester: number;
}

/**
 * 班级更新请求接口
 */
export interface UpdateClassRequest {
  name?: string;
  grade?: number;
  studentCount?: number;
  homeroom?: string;
  classTeacher?: string;
  academicYear?: string;
  semester?: number;
  isActive?: boolean;
}

/**
 * 班级查询条件接口
 */
export interface ClassQueryOptions extends PaginationQuery {
  grade?: number;
  academicYear?: string;
  semester?: number;
  isActive?: string | boolean;
  keyword?: string; // 搜索班级名称
}

/**
 * 班级响应数据接口
 */
export interface ClassResponse {
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
  createdAt: Date;
  updatedAt: Date;
}

// ==================== 课程相关API类型 ====================

/**
 * 场地要求接口
 */
export interface RoomRequirement {
  types: string[];
  specificRoom?: string; // Room ID
  capacity?: number;
  equipment?: string[];
}

/**
 * 课程创建请求接口
 */
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
 * 课程更新请求接口
 */
export interface UpdateCourseRequest {
  name?: string;
  subject?: string;
  courseCode?: string;
  weeklyHours?: number;
  requiresContinuous?: boolean;
  continuousHours?: number;
  roomRequirements?: RoomRequirement;
  isWeeklyAlternating?: boolean;
  description?: string;
  isActive?: boolean;
}

/**
 * 课程查询条件接口
 */
export interface CourseQueryOptions extends PaginationQuery {
  subject?: string;
  requiresContinuous?: string | boolean;
  isActive?: string | boolean;
  keyword?: string; // 搜索课程名称或课程编码
}

/**
 * 课程响应数据接口
 */
export interface CourseResponse {
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
  createdAt: Date;
  updatedAt: Date;
}

// ==================== 场室相关API类型 ====================

/**
 * 不可用时间段接口
 */
export interface UnavailableSlot {
  dayOfWeek: number;
  periods: number[];
  reason?: string;
}

/**
 * 场室创建请求接口
 */
export interface CreateRoomRequest {
  name: string;
  roomNumber: string;
  type: string;
  capacity: number;
  building?: string;
  floor?: number;
  equipment?: string[];
  assignedClass?: string; // Class ID
  unavailableSlots?: UnavailableSlot[];
}

/**
 * 场室更新请求接口
 */
export interface UpdateRoomRequest {
  name?: string;
  roomNumber?: string;
  type?: string;
  capacity?: number;
  building?: string;
  floor?: number;
  equipment?: string[];
  assignedClass?: string;
  unavailableSlots?: UnavailableSlot[];
  isActive?: boolean;
}

/**
 * 场室查询条件接口
 */
export interface RoomQueryOptions extends PaginationQuery {
  type?: string;
  building?: string;
  floor?: number;
  minCapacity?: number;
  maxCapacity?: number;
  equipment?: string; // 支持单个设备筛选
  isActive?: string | boolean;
  keyword?: string; // 搜索教室名称或编号
}

/**
 * 场室响应数据接口
 */
export interface RoomResponse {
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
  createdAt: Date;
  updatedAt: Date;
}
// ==================== 教学计划相关API类型 ====================

/**
 * 课程安排接口定义 (API层)
 */
export interface CourseAssignmentRequest {
  course: string;                      // 课程ID
  teacher: string;                     // 教师ID
  weeklyHours: number;                 // 每周课时数
  requiresContinuous?: boolean;        // 是否需要连排
  continuousHours?: number;            // 连排课时数
  preferredTimeSlots?: TimeSlot[];     // 偏好时间段
  avoidTimeSlots?: TimeSlot[];         // 避免时间段
  notes?: string;                      // 备注信息
}

/**
 * 教学计划创建请求接口
 */
export interface CreateTeachingPlanRequest {
  class: string;                       // 班级ID
  academicYear: string;                // 学年
  semester: number;                    // 学期
  courseAssignments: CourseAssignmentRequest[]; // 课程安排列表
  notes?: string;                      // 计划备注
}

/**
 * 教学计划更新请求接口
 */
export interface UpdateTeachingPlanRequest {
  courseAssignments?: CourseAssignmentRequest[]; // 课程安排列表
  status?: 'draft' | 'approved' | 'active' | 'archived'; // 计划状态
  notes?: string;                      // 计划备注
}

/**
 * 教学计划查询条件接口
 */
export interface TeachingPlanQueryOptions extends PaginationQuery {
  class?: string;                      // 班级筛选
  academicYear?: string;               // 学年筛选
  semester?: number;                   // 学期筛选
  status?: string;                     // 状态筛选
  teacher?: string;                    // 教师筛选 (查找包含该教师的计划)
  course?: string;                     // 课程筛选 (查找包含该课程的计划)
  isActive?: string | boolean;         // 有效性筛选
  keyword?: string;                    // 搜索班级名称或备注
}

/**
 * 教学计划响应数据接口
 */
export interface TeachingPlanResponse {
  _id: string;
  class: {
    _id: string;
    name: string;
    grade: number;
  };
  academicYear: string;
  semester: number;
  courseAssignments: {
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
  }[];
  totalWeeklyHours: number;
  status: 'draft' | 'approved' | 'active' | 'archived';
  approvedBy?: {
    _id: string;
    username: string;
    profile: { name: string };
  };
  approvedAt?: Date;
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
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 教学计划审批请求接口
 */
export interface ApproveTeachingPlanRequest {
  approve: boolean;                    // 是否通过审批
  comments?: string;                   // 审批意见
}

// ==================== 排课规则相关API类型 ====================

/**
 * 时间规则接口定义 (API层)
 */
export interface TimeRulesRequest {
  dailyPeriods: number;                // 每日课时数
  workingDays: number[];               // 工作日
  periodDuration: number;              // 单节课时长(分钟)
  breakDuration: number;               // 课间休息时长(分钟)
  lunchBreakStart: number;             // 午休开始节次
  lunchBreakDuration: number;          // 午休时长(分钟)
  morningPeriods: number[];            // 上午节次
  afternoonPeriods: number[];          // 下午节次
  forbiddenSlots?: TimeSlot[];         // 禁用时间段
}

/**
 * 教师约束规则接口定义 (API层)
 */
export interface TeacherConstraintsRequest {
  maxDailyHours: number;               // 教师每日最大课时数
  maxContinuousHours: number;          // 教师最大连续课时数
  minRestBetweenCourses: number;       // 课程间最小休息时间(分钟)
  avoidFridayAfternoon: boolean;       // 是否避免周五下午排课
  respectTeacherPreferences: boolean;  // 是否尊重教师时间偏好
  allowCrossGradeTeaching: boolean;    // 是否允许跨年级教学
}

/**
 * 教室约束规则接口定义 (API层)
 */
export interface RoomConstraintsRequest {
  respectCapacityLimits: boolean;      // 是否严格遵守教室容量限制
  allowRoomSharing: boolean;           // 是否允许教室共享
  preferFixedClassrooms: boolean;      // 是否优先使用固定教室
  specialRoomPriority: 'strict' | 'preferred' | 'flexible'; // 特殊教室优先级
}

/**
 * 固定时间课程接口定义 (API层)
 */
export interface FixedTimeCourseRequest {
  type: 'class-meeting' | 'flag-raising' | 'eye-exercise' | 'morning-reading' | 'afternoon-reading' | 'cleaning' | 'other';
  courseId: string;                     // 🆕 新增：课程ID，用于关联具体的课程信息
  dayOfWeek: number;                    // 星期几 (1-7)
  period: number;                        // 第几节课 (1-12)
  weekType: 'all' | 'odd' | 'even';    // 周次类型
  startWeek: number;                    // 开始周次
  endWeek: number;                      // 结束周次
  notes?: string;                       // 备注信息
}

/**
 * 固定时间课程全局配置接口 (API层)
 */
export interface FixedTimeCoursesConfigRequest {
  enabled: boolean;                     // 是否启用固定时间课程
  courses: FixedTimeCourseRequest[];    // 固定时间课程列表
  priority: boolean;                    // 是否优先于其他课程
  allowOverride: boolean;               // 是否允许手动调整
  conflictStrategy: 'strict' | 'flexible' | 'warning'; // 冲突处理策略
}

/**
 * 课程排列规则接口定义 (API层)
 */
export interface CourseArrangementRulesRequest {
  allowContinuousCourses: boolean;     // 是否允许连排课程
  maxContinuousHours: number;          // 最大连排课时数
  distributionPolicy: 'balanced' | 'concentrated' | 'flexible'; // 课程分布策略
  avoidFirstLastPeriod: string[];      // 避免第一节或最后一节的科目
  coreSubjectPriority: boolean;        // 核心科目优先安排在黄金时段
  labCoursePreference: 'morning' | 'afternoon' | 'flexible'; // 实验课时间偏好
  
  // 新增：核心课程策略
  coreSubjectStrategy?: {
    enableCoreSubjectStrategy: boolean;        // 是否启用核心课程策略
    coreSubjects: string[];                    // 核心课程列表
    distributionMode: 'daily' | 'balanced' | 'concentrated'; // 分布模式
    maxDailyOccurrences: number;               // 每日最大出现次数
    minDaysPerWeek: number;                    // 每周最少出现天数
    avoidConsecutiveDays: boolean;             // 是否避免连续天安排
    preferredTimeSlots: number[];              // 偏好时间段
    avoidTimeSlots: number[];                  // 避免时间段
    maxConcentration: number;                  // 最大集中度
    balanceWeight: number;                     // 平衡权重
    enforceEvenDistribution: boolean;          // 是否强制均匀分布
  };
  
  // 新增：固定时间课程配置
  fixedTimeCourses?: FixedTimeCoursesConfigRequest; // 固定时间课程配置
}

/**
 * 冲突处理规则接口定义 (API层)
 */
export interface ConflictResolutionRulesRequest {
  teacherConflictResolution: 'strict' | 'warn' | 'ignore'; // 教师冲突处理
  roomConflictResolution: 'strict' | 'warn' | 'ignore';    // 教室冲突处理
  classConflictResolution: 'strict' | 'warn' | 'ignore';   // 班级冲突处理
  allowOverride: boolean;              // 是否允许手动覆盖冲突
  priorityOrder: string[];             // 冲突解决优先级顺序
}

/**
 * 排课规则创建请求接口
 */
export interface CreateSchedulingRulesRequest {
  name: string;                        // 规则集名称
  description?: string;                // 规则集描述
  schoolType: 'primary' | 'middle' | 'high' | 'mixed'; // 学校类型
  academicYear: string;                // 适用学年
  semester: number;                    // 适用学期
  timeRules: TimeRulesRequest;         // 时间规则
  teacherConstraints: TeacherConstraintsRequest; // 教师约束
  roomConstraints: RoomConstraintsRequest; // 教室约束
  courseArrangementRules: CourseArrangementRulesRequest; // 课程排列规则
  conflictResolutionRules: ConflictResolutionRulesRequest; // 冲突处理规则
  isDefault?: boolean;                 // 是否为默认规则集
  createdBy?: string;                  // 创建人ID（可选，后端会自动设置）
}

/**
 * 排课规则更新请求接口
 */
export interface UpdateSchedulingRulesRequest {
  name?: string;                       // 规则集名称
  description?: string;                // 规则集描述
  schoolType?: 'primary' | 'middle' | 'high' | 'mixed'; // 学校类型
  timeRules?: TimeRulesRequest;        // 时间规则
  teacherConstraints?: TeacherConstraintsRequest; // 教师约束
  roomConstraints?: RoomConstraintsRequest; // 教室约束
  courseArrangementRules?: CourseArrangementRulesRequest; // 课程排列规则
  conflictResolutionRules?: ConflictResolutionRulesRequest; // 冲突处理规则
  isDefault?: boolean;                 // 是否为默认规则集
  isActive?: boolean;                  // 是否有效
}

/**
 * 排课规则查询条件接口
 */
export interface SchedulingRulesQueryOptions extends PaginationQuery {
  schoolType?: string;                 // 学校类型筛选
  academicYear?: string;               // 学年筛选
  semester?: number;                   // 学期筛选
  isDefault?: string | boolean;        // 默认规则筛选
  isActive?: string | boolean;         // 有效性筛选
  keyword?: string;                    // 搜索规则集名称或描述
}

/**
 * 排课规则响应数据接口
 */
export interface SchedulingRulesResponse {
  _id: string;
  name: string;
  description?: string;
  schoolType: 'primary' | 'middle' | 'high' | 'mixed';
  academicYear: string;
  semester: number;
  timeRules: TimeRulesRequest;
  teacherConstraints: TeacherConstraintsRequest;
  roomConstraints: RoomConstraintsRequest;
  courseArrangementRules: CourseArrangementRulesRequest;
  conflictResolutionRules: ConflictResolutionRulesRequest;
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
  createdAt: Date;
  updatedAt: Date;
}