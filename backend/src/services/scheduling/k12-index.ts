/**
 * K12排课系统组件索引文件
 * 
 * 导出所有K12排课相关的组件和接口
 */

// 核心引擎
export { K12SchedulingEngine } from './k12-scheduling-engine';

// 约束检测器
export { K12ConstraintChecker } from './k12-constraint-checker';

// 评分优化器
export { K12ScoreOptimizer } from './k12-score-optimizer';

// 教室分配器
export { K12RoomAllocator } from './k12-room-allocator';

// 排课服务
export { K12SchedulingService } from './k12-scheduling-service';

// 类型定义
export {
  K12SchedulingStage,
  K12CourseType,
  K12ConstraintType,
  K12Constraint,
  K12ConstraintViolation,
  K12ScheduleVariable,
  K12CourseAssignment,
  K12ScheduleResult,
  K12SchedulingConfig,
  K12RoomAllocationStrategy,
  K12RoomAllocation,
  K12ScoreDimensions,
  K12SchedulingProgress,
  K12SchedulingStatistics
} from './types';

// 默认配置
export const DEFAULT_K12_CONFIG = {
  coreSubjects: {
    maxIterations: 1000,
    timeLimit: 300,
    priorityOrder: ['语文', '数学', '英语']
  },
  electiveSubjects: {
    maxIterations: 1000,
    timeLimit: 300,
    enableDispersionOptimization: true
  },
  specialConstraints: {
    maxIterations: 500,
    timeLimit: 120,
    enableContinuousOptimization: true
  },
  constraintWeights: {
    coreSubjectDistribution: 1.0,
    teacherWorkloadBalance: 1.0,
    studentFatigueReduction: 1.0,
    courseDispersion: 1.0,
    timePreference: 0.8
  },
  timePreferences: {
    coreSubjectsMorning: true,
    avoidConsecutiveCoreSubjects: true,
    maxDailyCoreSubjects: 3,
    preferredTimeSlots: [],
    avoidTimeSlots: []
  }
};

// 版本信息
export const K12_VERSION = '1.0.0';
export const K12_DESCRIPTION = 'K12智能排课系统 - 专门为K12阶段设计的智能排课解决方案';
