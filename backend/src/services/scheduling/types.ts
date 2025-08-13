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
}

/**
 * 约束类型枚举
 */
export enum ConstraintType {
  HARD_TEACHER_CONFLICT = 'hard_teacher_conflict',     // 教师时间冲突
  HARD_CLASS_CONFLICT = 'hard_class_conflict',         // 班级时间冲突
  HARD_ROOM_CONFLICT = 'hard_room_conflict',           // 教室时间冲突
  HARD_ROOM_REQUIREMENT = 'hard_room_requirement',     // 教室需求不满足
  HARD_TIME_FORBIDDEN = 'hard_time_forbidden',         // 禁用时间段
  SOFT_TIME_PREFERENCE = 'soft_time_preference',       // 时间偏好不满足
  SOFT_WORKLOAD_BALANCE = 'soft_workload_balance',     // 工作量不均衡
  SOFT_CONTINUOUS_PREFERRED = 'soft_continuous_preferred', // 连排偏好
  SOFT_CORE_SUBJECT_PRIORITY = 'soft_core_subject_priority', // 核心科目优先级
  
  // 新增：科目特定约束类型
  SOFT_SUBJECT_CONSTRAINT = 'soft_subject_constraint', // 科目特定约束
  HARD_SUBJECT_CONSTRAINT = 'hard_subject_constraint', // 科目特定硬约束
  SOFT_TEACHER_ROTATION = 'soft_teacher_rotation',    // 教师轮换约束
  
  // 新增：核心课程分布约束类型
  SOFT_CORE_SUBJECT_DISTRIBUTION = 'soft_core_subject_distribution', // 核心课程分布约束（软约束）
  SOFT_CORE_SUBJECT_TIME_PREFERENCE = 'soft_core_subject_time_preference', // 核心课程时间偏好约束
  HARD_CORE_SUBJECT_DISTRIBUTION = 'hard_core_subject_distribution', // 核心课程分布约束（硬约束）
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
  type: 'teacher' | 'class' | 'room';  // 冲突类型
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
