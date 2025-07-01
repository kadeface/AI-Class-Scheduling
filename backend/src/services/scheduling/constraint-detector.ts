/**
 * 约束检测器
 * 
 * 负责检测和验证排课过程中的各种约束条件
 */

import mongoose from 'mongoose';
import {
  TimeSlot,
  CourseAssignment,
  ConflictInfo,
  ConstraintViolation,
  ConstraintType,
  ScheduleVariable
} from './types';
import { ISchedulingRules } from '../../models/SchedulingRules';

/**
 * 约束检测器类
 * 
 * 提供各种约束检测功能，包括硬约束和软约束的验证
 */
export class ConstraintDetector {
  private rules: ISchedulingRules;

  /**
   * 构造函数
   * 
   * Args:
   *   rules: 排课规则配置
   */
  constructor(rules: ISchedulingRules) {
    this.rules = rules;
  }

  /**
   * 检测教师时间冲突
   * 
   * Args:
   *   assignment: 新的课程安排
   *   existingAssignments: 已有的课程安排
   * 
   * Returns:
   *   ConflictInfo | null: 如果有冲突返回冲突信息，否则返回null
   */
  checkTeacherTimeConflict(
    assignment: CourseAssignment,
    existingAssignments: Map<string, CourseAssignment>
  ): ConflictInfo | null {
    const conflictingVariables: string[] = [];

    for (const [variableId, existing] of existingAssignments) {
      if (existing.teacherId.equals(assignment.teacherId) &&
          this.isTimeSlotOverlap(assignment.timeSlot, existing.timeSlot)) {
        conflictingVariables.push(variableId);
      }
    }

    if (conflictingVariables.length > 0) {
      return {
        type: 'teacher',
        resourceId: assignment.teacherId,
        timeSlot: assignment.timeSlot,
        conflictingVariables,
        severity: 'critical',
        message: `教师在 ${this.formatTimeSlot(assignment.timeSlot)} 时间段有冲突安排`
      };
    }

    return null;
  }

  /**
   * 检测班级时间冲突
   * 
   * Args:
   *   assignment: 新的课程安排
   *   existingAssignments: 已有的课程安排
   * 
   * Returns:
   *   ConflictInfo | null: 如果有冲突返回冲突信息，否则返回null
   */
  checkClassTimeConflict(
    assignment: CourseAssignment,
    existingAssignments: Map<string, CourseAssignment>
  ): ConflictInfo | null {
    const conflictingVariables: string[] = [];

    for (const [variableId, existing] of existingAssignments) {
      if (existing.classId.equals(assignment.classId) &&
          this.isTimeSlotOverlap(assignment.timeSlot, existing.timeSlot)) {
        conflictingVariables.push(variableId);
      }
    }

    if (conflictingVariables.length > 0) {
      return {
        type: 'class',
        resourceId: assignment.classId,
        timeSlot: assignment.timeSlot,
        conflictingVariables,
        severity: 'critical',
        message: `班级在 ${this.formatTimeSlot(assignment.timeSlot)} 时间段有冲突安排`
      };
    }

    return null;
  }

  /**
   * 检测教室时间冲突
   * 
   * Args:
   *   assignment: 新的课程安排
   *   existingAssignments: 已有的课程安排
   * 
   * Returns:
   *   ConflictInfo | null: 如果有冲突返回冲突信息，否则返回null
   */
  checkRoomTimeConflict(
    assignment: CourseAssignment,
    existingAssignments: Map<string, CourseAssignment>
  ): ConflictInfo | null {
    // 如果规则允许教室共享，则跳过检测
    if (this.rules.roomConstraints.allowRoomSharing) {
      return null;
    }

    const conflictingVariables: string[] = [];

    for (const [variableId, existing] of existingAssignments) {
      if (existing.roomId.equals(assignment.roomId) &&
          this.isTimeSlotOverlap(assignment.timeSlot, existing.timeSlot)) {
        conflictingVariables.push(variableId);
      }
    }

    if (conflictingVariables.length > 0) {
      return {
        type: 'room',
        resourceId: assignment.roomId,
        timeSlot: assignment.timeSlot,
        conflictingVariables,
        severity: 'critical',
        message: `教室在 ${this.formatTimeSlot(assignment.timeSlot)} 时间段有冲突安排`
      };
    }

    return null;
  }

  /**
   * 检测禁用时间段约束
   * 
   * Args:
   *   assignment: 课程安排
   * 
   * Returns:
   *   ConstraintViolation | null: 如果违反约束返回违反信息，否则返回null
   */
  checkForbiddenTimeSlot(assignment: CourseAssignment): ConstraintViolation | null {
    const { timeRules } = this.rules;
    const { timeSlot } = assignment;

    // 检查是否在工作日
    if (!timeRules.workingDays.includes(timeSlot.dayOfWeek)) {
      return {
        constraintType: ConstraintType.HARD_TIME_FORBIDDEN,
        isHard: true,
        penalty: 1000,
        variables: [assignment.variableId],
        message: `星期${timeSlot.dayOfWeek}不是工作日`,
        suggestion: '请选择工作日进行排课'
      };
    }

    // 检查是否在有效课时范围内
    if (timeSlot.period < 1 || timeSlot.period > timeRules.dailyPeriods) {
      return {
        constraintType: ConstraintType.HARD_TIME_FORBIDDEN,
        isHard: true,
        penalty: 1000,
        variables: [assignment.variableId],
        message: `第${timeSlot.period}节课超出有效课时范围(1-${timeRules.dailyPeriods})`,
        suggestion: `请选择1-${timeRules.dailyPeriods}节课进行排课`
      };
    }

    // 检查禁用时间段
    if (timeRules.forbiddenSlots) {
      for (const forbidden of timeRules.forbiddenSlots) {
        if (forbidden.dayOfWeek === timeSlot.dayOfWeek &&
            forbidden.periods.includes(timeSlot.period)) {
          return {
            constraintType: ConstraintType.HARD_TIME_FORBIDDEN,
            isHard: true,
            penalty: 1000,
            variables: [assignment.variableId],
            message: `${this.formatTimeSlot(timeSlot)} 是禁用时间段`,
            suggestion: '请选择其他时间段进行排课'
          };
        }
      }
    }

    return null;
  }

  /**
   * 检测教师工作时间约束
   * 
   * Args:
   *   teacherId: 教师ID
   *   assignments: 该教师的所有课程安排
   * 
   * Returns:
   *   ConstraintViolation[]: 约束违反列表
   */
  checkTeacherWorkloadConstraints(
    teacherId: mongoose.Types.ObjectId,
    assignments: CourseAssignment[]
  ): ConstraintViolation[] {
    const violations: ConstraintViolation[] = [];
    const { teacherConstraints } = this.rules;

    // 按天分组课程
    const dailyAssignments = new Map<number, CourseAssignment[]>();
    
    for (const assignment of assignments) {
      if (assignment.teacherId.equals(teacherId)) {
        const day = assignment.timeSlot.dayOfWeek;
        if (!dailyAssignments.has(day)) {
          dailyAssignments.set(day, []);
        }
        dailyAssignments.get(day)!.push(assignment);
      }
    }

    // 检查每日最大课时约束
    for (const [day, dayAssignments] of dailyAssignments) {
      if (dayAssignments.length > teacherConstraints.maxDailyHours) {
        violations.push({
          constraintType: ConstraintType.SOFT_WORKLOAD_BALANCE,
          isHard: false,
          penalty: (dayAssignments.length - teacherConstraints.maxDailyHours) * 50,
          variables: dayAssignments.map(a => a.variableId),
          message: `教师星期${day}课时数(${dayAssignments.length})超过每日最大课时限制(${teacherConstraints.maxDailyHours})`,
          suggestion: '建议调整课程分布，均衡工作量'
        });
      }

      // 检查连续课时约束
      const continuousViolation = this.checkContinuousHoursConstraint(dayAssignments, teacherConstraints.maxContinuousHours);
      if (continuousViolation) {
        violations.push(continuousViolation);
      }
    }

    return violations;
  }

  /**
   * 检测连续课时约束
   * 
   * Args:
   *   assignments: 某天的课程安排
   *   maxContinuous: 最大连续课时
   * 
   * Returns:
   *   ConstraintViolation | null: 约束违反信息
   */
  private checkContinuousHoursConstraint(
    assignments: CourseAssignment[],
    maxContinuous: number
  ): ConstraintViolation | null {
    if (assignments.length <= maxContinuous) {
      return null;
    }

    // 按课时排序
    const sorted = assignments.sort((a, b) => a.timeSlot.period - b.timeSlot.period);
    
    let continuousCount = 1;
    let maxContinuousFound = 1;
    const violatingVariables: string[] = [];

    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i].timeSlot.period === sorted[i-1].timeSlot.period + 1) {
        continuousCount++;
        if (continuousCount > maxContinuous) {
          violatingVariables.push(sorted[i].variableId);
        }
      } else {
        maxContinuousFound = Math.max(maxContinuousFound, continuousCount);
        continuousCount = 1;
      }
    }

    maxContinuousFound = Math.max(maxContinuousFound, continuousCount);

    if (maxContinuousFound > maxContinuous) {
      return {
        constraintType: ConstraintType.SOFT_WORKLOAD_BALANCE,
        isHard: false,
        penalty: (maxContinuousFound - maxContinuous) * 30,
        variables: violatingVariables,
        message: `连续课时数(${maxContinuousFound})超过最大限制(${maxContinuous})`,
        suggestion: '建议在连续课程之间安排休息时间'
      };
    }

    return null;
  }

  /**
   * 检测时间偏好约束
   * 
   * Args:
   *   variable: 排课变量
   *   assignment: 课程安排
   * 
   * Returns:
   *   ConstraintViolation | null: 约束违反信息
   */
  checkTimePreferenceConstraint(
    variable: ScheduleVariable,
    assignment: CourseAssignment
  ): ConstraintViolation | null {
    if (!variable.timePreferences || variable.timePreferences.length === 0) {
      return null;
    }

    const isPreferred = variable.timePreferences.some(pref => 
      pref.dayOfWeek === assignment.timeSlot.dayOfWeek &&
      pref.period === assignment.timeSlot.period
    );

    if (!isPreferred) {
      return {
        constraintType: ConstraintType.SOFT_TIME_PREFERENCE,
        isHard: false,
        penalty: 20,
        variables: [assignment.variableId],
        message: `${this.formatTimeSlot(assignment.timeSlot)} 不是偏好时间段`,
        suggestion: '建议安排在偏好时间段'
      };
    }

    return null;
  }

  /**
   * 检测所有冲突
   * 
   * Args:
   *   assignment: 新的课程安排
   *   existingAssignments: 已有的课程安排
   * 
   * Returns:
   *   ConflictInfo[]: 冲突列表
   */
  checkAllConflicts(
    assignment: CourseAssignment,
    existingAssignments: Map<string, CourseAssignment>
  ): ConflictInfo[] {
    const conflicts: ConflictInfo[] = [];

    // 检测教师冲突
    const teacherConflict = this.checkTeacherTimeConflict(assignment, existingAssignments);
    if (teacherConflict) conflicts.push(teacherConflict);

    // 检测班级冲突
    const classConflict = this.checkClassTimeConflict(assignment, existingAssignments);
    if (classConflict) conflicts.push(classConflict);

    // 检测教室冲突
    const roomConflict = this.checkRoomTimeConflict(assignment, existingAssignments);
    if (roomConflict) conflicts.push(roomConflict);

    return conflicts;
  }

  /**
   * 判断两个时间段是否重叠
   * 
   * Args:
   *   slot1: 时间段1
   *   slot2: 时间段2
   * 
   * Returns:
   *   boolean: 是否重叠
   */
  private isTimeSlotOverlap(slot1: TimeSlot, slot2: TimeSlot): boolean {
    return slot1.dayOfWeek === slot2.dayOfWeek && slot1.period === slot2.period;
  }

  /**
   * 格式化时间段显示
   * 
   * Args:
   *   timeSlot: 时间段
   * 
   * Returns:
   *   string: 格式化的时间段字符串
   */
  private formatTimeSlot(timeSlot: TimeSlot): string {
    const dayNames = ['', '周一', '周二', '周三', '周四', '周五', '周六', '周日'];
    return `${dayNames[timeSlot.dayOfWeek]}第${timeSlot.period}节`;
  }
}