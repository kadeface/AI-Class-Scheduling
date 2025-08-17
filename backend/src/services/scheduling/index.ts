/**
 * 排课服务模块导出
 * 
 * 统一导出排课算法相关的所有类和接口
 */

// 类型定义
export * from './types';

// 核心算法引擎
export { SchedulingEngine } from './scheduling-engine';

// 约束检测器
export { ConstraintDetector } from './constraint-detector';

// 排课服务
export { SchedulingService } from './scheduling-service';
export type { SchedulingRequest } from './scheduling-service';

// 默认配置
export const DEFAULT_ALGORITHM_CONFIG = {
  maxIterations: 10000,
  timeLimit: 300, // 5分钟
  backtrackLimit: 1000,
  enableLocalOptimization: true,
  localOptimizationIterations: 100,
  verbose: false,
  debugLevel: 'minimal' // 默认使用最小调试级别
};

// 工具函数
export const SchedulingUtils = {
  /**
   * 格式化时间段显示
   * 
   * Args:
   *   dayOfWeek: 星期几 (1-7)
   *   period: 节次
   * 
   * Returns:
   *   string: 格式化的时间段字符串
   */
  formatTimeSlot(dayOfWeek: number, period: number): string {
    const dayNames = ['', '周一', '周二', '周三', '周四', '周五', '周六', '周日'];
    return `${dayNames[dayOfWeek]}第${period}节`;
  },

  /**
   * 验证时间段是否有效
   * 
   * Args:
   *   dayOfWeek: 星期几 (1-7)
   *   period: 节次
   *   maxPeriods: 最大节次
   * 
   * Returns:
   *   boolean: 是否有效
   */
  isValidTimeSlot(dayOfWeek: number, period: number, maxPeriods: number = 8): boolean {
    return dayOfWeek >= 1 && dayOfWeek <= 7 && period >= 1 && period <= maxPeriods;
  },

  /**
   * 计算两个时间段的距离
   * 
   * Args:
   *   slot1: 时间段1
   *   slot2: 时间段2
   * 
   * Returns:
   *   number: 时间段距离（以节次为单位）
   */
  calculateTimeSlotDistance(
    slot1: { dayOfWeek: number; period: number },
    slot2: { dayOfWeek: number; period: number }
  ): number {
    if (slot1.dayOfWeek === slot2.dayOfWeek) {
      return Math.abs(slot1.period - slot2.period);
    } else {
      // 跨天的距离计算（简化版本）
      const dayDiff = Math.abs(slot1.dayOfWeek - slot2.dayOfWeek);
      return dayDiff * 10 + Math.abs(slot1.period - slot2.period);
    }
  },

  /**
   * 生成学期字符串
   * 
   * Args:
   *   academicYear: 学年 (如: "2024-2025")
   *   semester: 学期 (1或2)
   * 
   * Returns:
   *   string: 学期字符串 (如: "2024-2025-1")
   */
  generateSemesterString(academicYear: string, semester: number): string {
    return `${academicYear}-${semester}`;
  },

  /**
   * 解析学期字符串
   * 
   * Args:
   *   semesterString: 学期字符串 (如: "2024-2025-1")
   * 
   * Returns:
   *   {academicYear: string, semester: number} | null: 解析结果
   */
  parseSemesterString(semesterString: string): {academicYear: string, semester: number} | null {
    const match = semesterString.match(/^(\d{4}-\d{4})-([12])$/);
    if (match) {
      return {
        academicYear: match[1],
        semester: parseInt(match[2])
      };
    }
    return null;
  }
};