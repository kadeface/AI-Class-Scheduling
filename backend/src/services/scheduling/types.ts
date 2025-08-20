/**
 * 排课算法相关的类型定义
 * 
 * 定义排课算法中使用的核心数据结构和接口
 */

import mongoose from 'mongoose';

/**
 * 时间段定义
 * 
 * 表示具体的时间段（星期几的第几节课）
 */
export interface TimeSlot {
  dayOfWeek: number;                   // 星期几 (1-7, 1=周一)
  period: number;                      // 第几节课 (1-N)
  startTime?: string;                  // 开始时间 (HH:mm)
  endTime?: string;                    // 结束时间 (HH:mm)
}

/**
 * 教师轮换状态接口
 * 
 * 跟踪教师授课轮换的进度和状态
 */
export interface TeacherRotationState {
  teacherId: mongoose.Types.ObjectId;  // 教师ID
  currentRound: number;                // 当前轮次
  classRotationOrder: string[];        // 班级轮换顺序
  lastAssignedClass: string;           // 最后分配的班级
  rotationProgress: Map<string, number>; // 各班级轮换进度
  roundCompletionStatus: Map<string, boolean>; // 各班级轮次完成状态
}

/**
 * 排课变量定义
 * 
 * 表示一个需要排课的课程实例
 */
export interface ScheduleVariable {
  id: string;                          // 变量唯一标识
  classId: mongoose.Types.ObjectId;    // 班级ID
  courseId: mongoose.Types.ObjectId;   // 课程ID
  teacherId: mongoose.Types.ObjectId;  // 教师ID
  requiredHours: number;               // 需要的课时数
  // 新增：课程信息字段
  courseName?: string;                 // 课程名称
  subject?: string;                    // 科目
  roomRequirements?: {                 // 教室需求
    roomType?: string;                 // 教室类型
    capacity?: number;                 // 容量需求
    equipment?: string[];              // 设备需求
  };
  timePreferences?: TimeSlot[];        // 时间偏好
  timeAvoidance?: TimeSlot[];          // 时间避免
  continuous?: boolean;                // 是否需要连排
  continuousHours?: number;            // 连排课时数
  priority: number;                    // 优先级 (1-10, 10最高)
  domain: TimeSlot[];                  // 可行时间域
}

/**
 * 课程安排结果
 * 
 * 表示一个课程的具体安排结果
 */
export interface CourseAssignment {
  variableId: string;                  // 变量ID
  classId: mongoose.Types.ObjectId;    // 班级ID
  courseId: mongoose.Types.ObjectId;   // 课程ID
  teacherId: mongoose.Types.ObjectId;  // 教师ID
  roomId: mongoose.Types.ObjectId;     // 教室ID
  timeSlot: TimeSlot;                  // 时间段
  isFixed: boolean;                    // 是否为固定安排（不可修改）
  
  // 🆕 新增：固定时间课程相关字段
  weekType?: 'all' | 'odd' | 'even';  // 周次类型（全周/单周/双周）
  startWeek?: number;                  // 开始周次
  endWeek?: number;                    // 结束周次
}

/**
 * 约束类型枚举
 */
export enum ConstraintType {
  HARD_TEACHER_CONFLICT = 'HARD_TEACHER_CONFLICT',     // 教师时间冲突
  HARD_CLASS_CONFLICT = 'HARD_CLASS_CONFLICT',         // 班级时间冲突
  HARD_ROOM_CONFLICT = 'HARD_ROOM_CONFLICT',           // 教室时间冲突
  HARD_ROOM_REQUIREMENT = 'HARD_ROOM_REQUIREMENT',     // 教室需求不满足
  HARD_TIME_FORBIDDEN = 'HARD_TIME_FORBIDDEN',         // 禁用时间段
  SOFT_TIME_PREFERENCE = 'SOFT_TIME_PREFERENCE',       // 时间偏好不满足
  SOFT_WORKLOAD_BALANCE = 'SOFT_WORKLOAD_BALANCE',     // 工作量不均衡
  SOFT_CONTINUOUS_PREFERRED = 'SOFT_CONTINUOUS_PREFERRED', // 连排偏好
  SOFT_CORE_SUBJECT_PRIORITY = 'SOFT_CORE_SUBJECT_PRIORITY', // 核心科目优先级
  
  // 新增：科目特定约束类型
  SOFT_SUBJECT_CONSTRAINT = 'SOFT_SUBJECT_CONSTRAINT', // 科目特定约束
  HARD_SUBJECT_CONSTRAINT = 'HARD_SUBJECT_CONSTRAINT', // 科目特定硬约束
  SOFT_TEACHER_ROTATION = 'SOFT_TEACHER_ROTATION',    // 教师轮换约束
  
  // 新增：核心课程分布约束类型
  SOFT_CORE_SUBJECT_DISTRIBUTION = 'SOFT_CORE_SUBJECT_DISTRIBUTION', // 核心课程分布约束（软约束）
  SOFT_CORE_SUBJECT_TIME_PREFERENCE = 'SOFT_CORE_SUBJECT_TIME_PREFERENCE', // 核心课程时间偏好约束
  HARD_CORE_SUBJECT_DISTRIBUTION = 'HARD_CORE_SUBJECT_DISTRIBUTION', // 核心课程分布约束（硬约束）
}

/**
 * 约束定义
 */
export interface Constraint {
  type: ConstraintType;                // 约束类型
  isHard: boolean;                     // 是否为硬约束
  weight: number;                      // 权重 (软约束使用)
  variables: string[];                 // 涉及的变量ID
  description: string;                 // 约束描述
  check(assignments: Map<string, CourseAssignment>): ConstraintViolation | null;
}

/**
 * 约束违反信息
 */
export interface ConstraintViolation {
  constraintType: ConstraintType;      // 违反的约束类型
  isHard: boolean;                     // 是否为硬约束违反
  penalty: number;                     // 惩罚分数
  variables: string[];                 // 涉及的变量
  message: string;                     // 错误信息
  suggestion?: string;                 // 修复建议
}

/**
 * 冲突信息
 */
export interface ConflictInfo {
  type: 'teacher' | 'class' | 'room' | 'special_course_room';  // 冲突类型
  resourceId: mongoose.Types.ObjectId; // 冲突资源ID
  timeSlot: TimeSlot;                  // 冲突时间段
  conflictingVariables: string[];      // 冲突的变量ID
  severity: 'critical' | 'warning' | 'info'; // 严重程度
  message: string;                     // 冲突描述
}

/**
 * 排课状态
 */
export interface ScheduleState {
  assignments: Map<string, CourseAssignment>; // 当前分配结果
  unassigned: string[];                // 未分配的变量ID
  conflicts: ConflictInfo[];           // 冲突列表
  violations: ConstraintViolation[];   // 约束违反列表
  score: number;                       // 当前方案评分
  isComplete: boolean;                 // 是否完成分配
  isFeasible: boolean;                 // 是否可行（无硬约束违反）
}

/**
 * 调试级别枚举
 */
export enum DebugLevel {
  NONE = 'none',           // 无调试信息
  MINIMAL = 'minimal',     // 最小调试信息（仅错误和警告）
  DETAILED = 'detailed'    // 详细调试信息（包含所有步骤）
}

/**
 * 算法配置
 */
export interface AlgorithmConfig {
  maxIterations: number;               // 最大迭代次数
  timeLimit: number;                   // 时间限制（秒）
  backtrackLimit: number;              // 回溯次数限制
  randomSeed?: number;                 // 随机种子
  enableLocalOptimization: boolean;    // 是否启用局部优化
  localOptimizationIterations: number; // 局部优化迭代次数
  verbose: boolean;                    // 是否输出详细日志
  debugLevel: DebugLevel;              // 调试级别控制
}

/**
 * 算法结果
 */
export interface SchedulingResult {
  success: boolean;                    // 是否成功
  scheduleState: ScheduleState;        // 最终排课状态
  statistics: {                       // 统计信息
    totalVariables: number;            // 总变量数
    assignedVariables: number;         // 已分配变量数
    unassignedVariables: number;       // 未分配变量数
    hardViolations: number;            // 硬约束违反数
    softViolations: number;            // 软约束违反数
    totalScore: number;                // 总评分
    iterations: number;                // 迭代次数
    executionTime: number;             // 执行时间（毫秒）
  };
  conflicts: ConflictInfo[];           // 冲突列表
  violations: ConstraintViolation[];   // 约束违反列表
  message: string;                     // 结果信息
  suggestions: string[];               // 改进建议
}

/**
 * 轮换进度数据接口
 * 
 * 提供详细的教师轮换状态信息
 */
export interface RotationProgressData {
  teacherId: mongoose.Types.ObjectId;           // 教师ID
  teacherName?: string;                         // 教师姓名
  currentRound: number;                         // 当前轮次
  totalRounds: number;                          // 总轮次数
  roundProgress: number;                        // 当前轮次进度 (0-100)
  overallProgress: number;                      // 总体进度 (0-100)
  classRotationOrder: string[];                 // 班级轮换顺序
  completedClasses: string[];                   // 已完成的班级
  pendingClasses: string[];                     // 待完成的班级
  lastAssignedClass: string;                    // 最后分配的班级
  constraintViolations: number;                 // 轮换约束违反次数
  rotationScore: number;                        // 轮换策略评分
  suggestions: string[];                        // 优化建议
}

/**
 * 轮换状态摘要接口
 * 
 * 提供整体轮换状态的概览信息
 */
export interface RotationSummary {
  totalTeachers: number;                        // 参与轮换的教师总数
  averageRoundProgress: number;                 // 平均轮次进度
  teachersWithViolations: number;               // 存在约束违反的教师数
  overallRotationScore: number;                 // 整体轮换评分
  criticalIssues: string[];                     // 关键问题列表
  optimizationOpportunities: string[];          // 优化机会
}

/**
 * 扩展的进度回调类型
 * 
 * 支持轮换状态监控的进度报告
 */
export type ProgressCallback = (progress: {
  stage: string;                                // 当前阶段
  percentage: number;                           // 完成百分比 (0-100)
  message: string;                              // 当前操作信息
  assignedCount: number;                        // 已分配数量
  totalCount: number;                           // 总数量
  rotationData?: {                              // 轮换状态数据（可选）
    individualProgress: RotationProgressData[]; // 各教师轮换进度
    summary: RotationSummary;                   // 轮换状态摘要
    timestamp: number;                          // 时间戳
  };
}) => void;

/**
 * 启发式策略枚举
 */
export enum HeuristicStrategy {
  MINIMUM_REMAINING_VALUES = 'mrv',    // 最小剩余值
  DEGREE_HEURISTIC = 'degree',         // 度启发式
  LEAST_CONSTRAINING_VALUE = 'lcv',    // 最少约束值
  RANDOM = 'random',                   // 随机选择
}

/**
 * 算法模式枚举
 */
export enum AlgorithmMode {
  BASIC_BACKTRACKING = 'basic_backtracking',           // 基础回溯
  CONSTRAINT_PROPAGATION = 'constraint_propagation',   // 约束传播
  HYBRID_ALGORITHM = 'hybrid',                         // 混合算法
  GENETIC_ALGORITHM = 'genetic',                       // 遗传算法
}
/**
 * 分阶段排课相关类型定义
 */

/**
 * 课程优先级枚举
 */
export enum CoursePriority {
  CORE = 'core',           // 核心课程
  GENERAL = 'general',     // 一般课程
  SPECIAL = 'special'      // 特殊需求课程
}

/**
 * 排课阶段枚举
 */
export enum SchedulingStage {
  CORE_COURSES = 'core_courses',
  GENERAL_COURSES = 'general_courses',
  SPECIAL_REQUIREMENTS = 'special_requirements'
}

/**
 * 阶段配置接口
 */
export interface StageConfig {
  maxIterations: number;           // 最大迭代次数
  timeLimit: number;               // 时间限制（秒）
  enableOptimization: boolean;     // 是否启用优化
  constraintPriority: 'high' | 'medium' | 'low'; // 约束优先级
}

/**
 * 分阶段排课结果接口
 */
export interface StagedSchedulingResult {
  success: boolean;                 // 是否成功
  stage: SchedulingStage;          // 当前阶段
  schedule: ScheduleState | null;  // 排课结果
  message: string;                 // 结果信息
  executionTime: number;           // 执行时间（毫秒）
  iterations: number;              // 迭代次数
  nextStage?: SchedulingStage;     // 下一阶段
  stageProgress: number;           // 阶段进度 (0-100)
  overallProgress: number;         // 总体进度 (0-100)
}

/**
 * 分阶段排课配置接口
 */
export interface StagedSchedulingConfig {
  coreCourses: StageConfig;        // 核心课程阶段配置
  generalCourses: StageConfig;     // 一般课程阶段配置
  specialRequirements: StageConfig; // 特殊需求阶段配置
  enableProgressiveMode: boolean;  // 是否启用渐进模式
  maxTotalTime: number;            // 最大总时间（秒）
  enableFallback: boolean;         // 是否启用回退机制
}

/**
 * 核心课程约束类型
 */
export interface CoreConstraint {
  id: string;
  type: 'teacher_conflict' | 'class_conflict' | 'room_conflict' | 'time_preference';
  priority: 'high' | 'medium' | 'low';
  description: string;
  isHard: boolean;
}

/**
 * 分阶段进度回调接口
 */
export type StagedProgressCallback = (progress: {
  currentStage: SchedulingStage;   // 当前阶段
  stageProgress: number;           // 阶段进度 (0-100)
  overallProgress: number;         // 总体进度 (0-100)
  message: string;                 // 当前操作信息
  stageResults: Map<SchedulingStage, StagedSchedulingResult>; // 各阶段结果
  timestamp: number;               // 时间戳
}) => void;

/**
 * 分阶段排课相关类型定义
 */

/**
 * 阶段类型枚举
 */
export enum StageType {
  CORE_COURSES = 'core_courses',           // 核心课程阶段
  GENERAL_COURSES = 'general_courses'      // 一般课程阶段
}

/**
 * 分阶段配置
 */
export interface StagedSchedulingStageConfig {
  stageType: StageType;                    // 阶段类型
  maxIterations: number;                   // 最大迭代次数
  timeLimit: number;                       // 时间限制（秒）
  enableLocalOptimization: boolean;        // 是否启用局部优化
  localOptimizationIterations: number;     // 局部优化迭代次数
  constraintPriority: 'high' | 'medium' | 'low';  // 约束优先级
  enableBacktracking: boolean;             // 是否启用回溯搜索
  // 新增：一般课程特定配置
  enableConflictAvoidance?: boolean;       // 是否启用冲突避免
  enableSubjectOptimization?: boolean;     // 是否启用科目优化
  enableContinuousOptimization?: boolean;  // 是否启用连排优化
}

/**
 * 分阶段结果
 */
export interface StageResult {
  stageType: StageType;                    // 阶段类型
  success: boolean;                         // 是否成功
  scheduleState: ScheduleState;             // 排课状态
  assignedVariables: number;                // 已分配变量数
  unassignedVariables: number;             // 未分配变量数
  hardViolations: number;                  // 硬约束违反数
  softViolations: number;                  // 软约束违反数
  executionTime: number;                   // 执行时间
  message: string;                          // 结果消息
  suggestions: string[];                    // 改进建议
}

/**
 * 分阶段进度信息
 */
export interface StageProgress {
  currentStage: StageType;                 // 当前阶段
  totalStages: number;                     // 总阶段数
  stageProgress: number;                   // 当前阶段进度 (0-100)
  overallProgress: number;                 // 总体进度 (0-100)
  stageMessage: string;                    // 阶段消息
  stageStatistics: {                       // 阶段统计
    assignedVariables: number;             // 已分配变量数
    unassignedVariables: number;           // 未分配变量数
    hardViolations: number;                // 硬约束违反数
    softViolations: number;                // 软约束违反数
  };
  timestamp: number;                        // 时间戳
}

/**
 * 课程分类结果
 */
export interface CourseClassification {
  coreCourses: ScheduleVariable[];         // 核心课程变量
  generalCourses: ScheduleVariable[];      // 一般课程变量
  coreSubjects: string[];                  // 核心科目列表
  classificationStats: {                   // 分类统计
    totalVariables: number;                // 总变量数
    coreCourseCount: number;               // 核心课程数量
    generalCourseCount: number;            // 一般课程数量
    coreSubjects: string[];                // 识别的核心科目
  };
}

/**
 * K12排课特有类型定义
 */

/**
 * K12排课阶段枚举
 */
export enum K12SchedulingStage {
  CORE_SUBJECTS = 'core_subjects',           // 阶段1：主科优先排课
  ELECTIVE_SUBJECTS = 'elective_subjects',   // 阶段2：副科填充排课
  SPECIAL_CONSTRAINTS = 'special_constraints' // 阶段3：特殊约束处理
}

/**
 * K12课程类型枚举
 */
export enum K12CourseType {
  CORE = 'core',           // 核心课程（语文、数学、英语）
  ELECTIVE = 'elective',   // 副科课程（音体美、信息技术等）
  SPECIAL = 'special'      // 特殊课程（连堂课、班主任课程等）
}

/**
 * K12约束类型枚举
 */
export enum K12ConstraintType {
  // 硬约束（必须满足）
  HARD_TEACHER_CONFLICT = 'hard_teacher_conflict',     // 教师不可同时在两个班上课
  HARD_CLASS_TIME_CONFLICT = 'hard_class_time_conflict', // 同一班级不能在同一时间槽安排多门课
  HARD_ROOM_CONFLICT = 'hard_room_conflict',           // 同一课室不能在同一时间槽安排多门课
  HARD_ROOM_REQUIREMENT = 'hard_room_requirement',     // 课室必须满足课程的基本要求
  
  // 软约束（尽量满足）
  SOFT_CORE_SUBJECT_DISTRIBUTION = 'soft_core_subject_distribution', // 主科分散度
  SOFT_TEACHER_WORKLOAD_BALANCE = 'soft_teacher_workload_balance',   // 教师工作量平衡
  SOFT_STUDENT_FATIGUE_REDUCTION = 'soft_student_fatigue_reduction', // 学生疲劳度减少
  SOFT_COURSE_DISPERSION = 'soft_course_dispersion',                 // 课程分布均匀性
  SOFT_TIME_PREFERENCE = 'soft_time_preference',                     // 时间偏好满足
  SOFT_CONTINUOUS_COURSE = 'soft_continuous_course'                 // 连堂课安排
}

/**
 * K12约束定义
 */
export interface K12Constraint {
  type: K12ConstraintType;                  // 约束类型
  isHard: boolean;                          // 是否为硬约束
  weight: number;                           // 权重 (软约束使用)
  description: string;                      // 约束描述
  check(assignments: Map<string, CourseAssignment>): K12ConstraintViolation | null;
}

/**
 * K12约束违反信息
 */
export interface K12ConstraintViolation {
  constraintType: K12ConstraintType;        // 违反的约束类型
  isHard: boolean;                          // 是否为硬约束违反
  penalty: number;                          // 惩罚分数
  message: string;                          // 错误信息
  suggestion?: string;                      // 修复建议
}

/**
 * K12排课变量（扩展版）
 */
export interface K12ScheduleVariable extends ScheduleVariable {
  subject: string;                           // 科目名称
  weeklyHours: number;                       // 每周课时数
  requiresContinuous: boolean;               // 是否需要连排
  continuousHours: number;                   // 连排课时数
  courseType: K12CourseType;                 // 课程类型
  priority: number;                          // 优先级 (1-10, 10最高)
  timePreferences?: TimeSlot[];              // 时间偏好
  avoidTimeSlots?: TimeSlot[];               // 避免时间段
}

/**
 * K12课程分配结果
 */
export interface K12CourseAssignment extends CourseAssignment {
  id: string;                                // 分配ID
  semester: number;                          // 学期
  academicYear: string;                      // 学年
  courseType: K12CourseType;                 // 课程类型
  subject: string;                           // 科目名称
  softConstraintScore: number;               // 软约束评分
}

/**
 * K12排课结果
 */
export interface K12ScheduleResult {
  success: boolean;                          // 是否成功
  assignedVariables: number;                 // 已分配变量数
  unassignedVariables: number;               // 未分配变量数
  hardConstraintViolations: number;          // 硬约束违反数
  softConstraintViolations: number;          // 软约束违反数
  totalScore: number;                        // 总评分
  // 🔧 新增：返回实际的排课分配结果
  assignments?: K12CourseAssignment[];       // 排课分配结果
  stageResults: Map<K12SchedulingStage, {   // 各阶段结果
    assignedCount: number;                   // 已分配数量
    unassignedCount: number;                // 未分配数量
    executionTime: number;                  // 执行时间
    message: string;                         // 阶段消息
  }>;
  message: string;                           // 结果信息
  suggestions: string[];                     // 改进建议
}

/**
 * K12排课配置
 */
export interface K12SchedulingConfig {
  // 阶段配置
  coreSubjects: {
    maxIterations: number;                   // 最大迭代次数
    timeLimit: number;                       // 时间限制（秒）
    priorityOrder: string[];                 // 优先级顺序
  };
  electiveSubjects: {
    maxIterations: number;                   // 最大迭代次数
    timeLimit: number;                       // 时间限制（秒）
    enableDispersionOptimization: boolean;   // 是否启用分散度优化
  };
  specialConstraints: {
    maxIterations: number;                   // 最大迭代次数
    timeLimit: number;                       // 时间限制（秒）
    enableContinuousOptimization: boolean;   // 是否启用连排优化
  };
  
  // 约束权重配置
  constraintWeights: {
    coreSubjectDistribution: number;         // 主科分散度权重
    teacherWorkloadBalance: number;          // 教师工作量平衡权重
    studentFatigueReduction: number;         // 学生疲劳度减少权重
    courseDispersion: number;                // 课程分布均匀性权重
    timePreference: number;                  // 时间偏好权重
  };
  
  // 时间偏好配置
  timePreferences: {
    coreSubjectsMorning: boolean;            // 主科是否优先安排在上午
    avoidConsecutiveCoreSubjects: boolean;   // 是否避免连续安排主科
    maxDailyCoreSubjects: number;            // 每天最大主科数量
    preferredTimeSlots: TimeSlot[];          // 偏好时间段
    avoidTimeSlots: TimeSlot[];              // 避免时间段
  };
}

/**
 * K12教室分配策略枚举
 */
export enum K12RoomAllocationStrategy {
  FIXED_CLASSROOM = 'fixed_classroom',       // 固定课室策略（行政班）
  INTELLIGENT_MATCHING = 'intelligent_matching', // 智能匹配策略
  FALLBACK_ALLOCATION = 'fallback_allocation'    // 备用分配策略
}

/**
 * K12教室分配结果
 */
export interface K12RoomAllocation {
  roomId: mongoose.Types.ObjectId;           // 分配的课室ID
  strategy: K12RoomAllocationStrategy;       // 使用的分配策略
  score: number;                             // 分配评分
  message: string;                           // 分配说明
  isFixedClassroom: boolean;                 // 是否为固定课室
}

/**
 * K12评分维度
 */
export interface K12ScoreDimensions {
  coreSubjectDistribution: number;           // 主科分散度评分 (0-25)
  teacherWorkloadBalance: number;            // 教师工作量平衡评分 (0-25)
  studentFatigueReduction: number;           // 学生疲劳度评分 (0-25)
  courseDispersion: number;                  // 课程分布均匀性评分 (0-25)
  totalScore: number;                        // 总评分 (0-100)
}

/**
 * K12排课进度信息
 */
export interface K12SchedulingProgress {
  currentStage: K12SchedulingStage;          // 当前阶段
  totalStages: number;                       // 总阶段数
  stageProgress: number;                     // 当前阶段进度 (0-100)
  overallProgress: number;                   // 总体进度 (0-100)
  stageMessage: string;                      // 阶段消息
  currentOperation: string;                  // 当前操作
  assignedCount: number;                     // 已分配数量
  totalCount: number;                        // 总数量
  timestamp: number;                         // 时间戳
}

/**
 * K12排课统计信息
 */
export interface K12SchedulingStatistics {
  totalVariables: number;                    // 总变量数
  assignedVariables: number;                 // 已分配变量数
  unassignedVariables: number;               // 未分配变量数
  hardConstraintViolations: number;          // 硬约束违反数
  softConstraintViolations: number;          // 软约束违反数
  totalScore: number;                        // 总评分
  stageResults: Map<K12SchedulingStage, {    // 各阶段统计
    assignedCount: number;                   // 已分配数量
    unassignedCount: number;                // 未分配数量
    executionTime: number;                  // 执行时间
    constraintViolations: number;            // 约束违反数
  }>;
  executionTime: number;                     // 总执行时间
  message: string;                           // 统计信息
}
