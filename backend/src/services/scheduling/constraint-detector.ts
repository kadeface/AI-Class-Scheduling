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
  
  // 新增：科目名称缓存
  private subjectNameCache: Map<string, string> = new Map();

  /**
   * 构造函数
   * 
   * Args:
   *   rules: 排课规则配置
   */
  constructor(rules: ISchedulingRules) {
    this.rules = rules;
    
    // 延迟初始化科目名称缓存
    this.initializeSubjectNameCache().catch(error => {
      console.warn('科目名称缓存初始化失败:', error);
    });
  }

  /**
   * 初始化科目名称缓存
   */
  private async initializeSubjectNameCache(): Promise<void> {
    try {
      // 从数据库预加载常用科目名称
      const Course = mongoose.model('Course');
      const courses = await Course.find({}).select('_id name').lean();
      
      for (const course of courses) {
        this.subjectNameCache.set((course as any)._id.toString(), (course as any).name || '未知科目');
      }
      
      console.log(`✅ 科目名称缓存初始化完成，共缓存 ${this.subjectNameCache.size} 个科目`);
    } catch (error) {
      console.warn('科目名称缓存初始化失败:', error);
      // 缓存初始化失败不影响主要功能
    }
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

    for (const [variableId, existing] of Array.from(existingAssignments.entries())) {
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

    for (const [variableId, existing] of Array.from(existingAssignments.entries())) {
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
   *   Promise<ConflictInfo | null>: 如果有冲突返回冲突信息，否则返回null
   */
  async checkRoomTimeConflict(
    assignment: CourseAssignment,
    existingAssignments: Map<string, CourseAssignment>
  ): Promise<ConflictInfo | null> {
    try {
      // 如果规则允许教室共享，则跳过检测
      if (this.rules.roomConstraints.allowRoomSharing) {
        return null;
      }

      // 检查是否为行政班使用固定教室
      const classInfo = await mongoose.model('Class').findById(assignment.classId);
      if (classInfo?.homeroom && classInfo.homeroom.equals(assignment.roomId)) {
        // 行政班使用固定教室，只需要检查班级时间冲突
        // 教室时间冲突检测可以跳过，因为班级冲突检测已经覆盖了这种情况
        console.log(`✅ 行政班 ${classInfo.name} 使用固定教室，跳过教室冲突检测`);
        return null;
      }

      // 检查其他教室的时间冲突
      const conflictingVariables: string[] = [];

      for (const [variableId, existing] of Array.from(existingAssignments.entries())) {
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
    } catch (error) {
      console.error('教室冲突检测失败:', error);
      // 如果检测失败，返回null以避免阻塞排课流程
      return null;
    }
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
    for (const [day, dayAssignments] of Array.from(dailyAssignments.entries())) {
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
   *   Promise<ConflictInfo[]>: 冲突列表
   */
  async checkAllConflicts(
    assignment: CourseAssignment,
    existingAssignments: Map<string, CourseAssignment>
  ): Promise<ConflictInfo[]> {
    const conflicts: ConflictInfo[] = [];

    // 检测教师冲突
    const teacherConflict = this.checkTeacherTimeConflict(assignment, existingAssignments);
    if (teacherConflict) conflicts.push(teacherConflict);

    // 检测班级冲突
    const classConflict = this.checkClassTimeConflict(assignment, existingAssignments);
    if (classConflict) conflicts.push(classConflict);

    // 检测教室冲突（异步）
    const roomConflict = await this.checkRoomTimeConflict(assignment, existingAssignments);
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

  /**
   * 检测科目特定约束
   * 
   * Args:
   *   assignment: 新的课程安排
   *   existingAssignments: 已有的课程安排
   * 
   * Returns:
   *   ConstraintViolation[]: 约束违反列表
   */
  checkSubjectSpecificConstraints(
    assignment: CourseAssignment,
    existingAssignments: Map<string, CourseAssignment>
  ): ConstraintViolation[] {
    const violations: ConstraintViolation[] = [];
    
    if (!this.rules.courseArrangementRules.enableSubjectConstraints) {
      return violations;
    }

    // 获取科目名称（这里需要根据实际的课程数据结构调整）
    const subjectName = this.getSubjectNameSync(assignment.courseId);
    if (!subjectName) return violations;

    // 查找科目特定规则
    const subjectRule = this.rules.courseArrangementRules.subjectSpecificRules.find(
      rule => rule.subjectName === subjectName
    );
    
    if (!subjectRule) return violations;

    // 检查避免连续安排约束
    if (subjectRule.avoidConsecutive) {
      const consecutiveViolation = this.checkConsecutiveConstraint(
        assignment, existingAssignments, subjectRule
      );
      if (consecutiveViolation) {
        violations.push(consecutiveViolation);
      }
    }

    // 检查最小间隔约束
    if (subjectRule.minInterval > 0) {
      const intervalViolation = this.checkMinIntervalConstraint(
        assignment, existingAssignments, subjectRule
      );
      if (intervalViolation) {
        violations.push(intervalViolation);
      }
    }

    // 检查每日最大出现次数约束
    const dailyOccurrenceViolation = this.checkDailyOccurrenceConstraint(
      assignment, existingAssignments, subjectRule
    );
    if (dailyOccurrenceViolation) {
      violations.push(dailyOccurrenceViolation);
    }

    // 检查特殊约束（如体育课需要休息）
    if (subjectRule.specialConstraints?.requiresRest) {
      const restViolation = this.checkRestRequirementConstraint(
        assignment, existingAssignments, subjectRule
      );
      if (restViolation) {
        violations.push(restViolation);
      }
    }

    // 新增：增强的科目特定约束检测
    const enhancedViolations = this.checkEnhancedSubjectConstraints(
      assignment, existingAssignments, subjectName
    );
    violations.push(...enhancedViolations);

    return violations;
  }

  /**
   * 检测增强的科目特定约束
   */
  private checkEnhancedSubjectConstraints(
    assignment: CourseAssignment,
    existingAssignments: Map<string, CourseAssignment>,
    subjectName: string
  ): ConstraintViolation[] {
    const violations: ConstraintViolation[] = [];

    // 1. 非核心课程每日限制检测（新增）
    const dailyLimitViolation = this.checkNonCoreSubjectDailyLimit(assignment, existingAssignments);
    if (dailyLimitViolation) {
      violations.push(dailyLimitViolation);
    }

    // 2. 体育课特殊约束
    if (subjectName === '体育') {
      const peViolations = this.checkPhysicalEducationConstraints(assignment, existingAssignments);
      violations.push(...peViolations);
    }

    // 3. 艺术课特殊约束
    if (['音乐', '美术'].includes(subjectName)) {
      const artViolations = this.checkArtSubjectConstraints(assignment, existingAssignments);
      violations.push(...artViolations);
    }

    // 4. 实验课特殊约束
    if (['物理', '化学', '生物'].includes(subjectName)) {
      const labViolations = this.checkLabSubjectConstraints(assignment, existingAssignments);
      violations.push(...labViolations);
    }

    // 5. 核心课程黄金时段保护
    if (this.isCoreSubject(subjectName)) {
      const coreViolations = this.checkCoreSubjectGoldenTimeProtection(assignment, existingAssignments);
      violations.push(...coreViolations);
    }

    return violations;
  }

  /**
   * 检测连续安排约束
   */
  private checkConsecutiveConstraint(
    assignment: CourseAssignment,
    existingAssignments: Map<string, CourseAssignment>,
    subjectRule: any
  ): ConstraintViolation | null {
    const subjectName = this.getSubjectNameSync(assignment.courseId);
    if (!subjectName) return null;

    // 检查是否有连续安排
    for (const [_, existing] of Array.from(existingAssignments.entries())) {
      if (existing.classId.equals(assignment.classId) && 
          this.getSubjectNameSync(existing.courseId) === subjectName) {
        
        // 检查是否连续安排（同一天相邻节次）
        if (assignment.timeSlot.dayOfWeek === existing.timeSlot.dayOfWeek &&
            Math.abs(assignment.timeSlot.period - existing.timeSlot.period) === 1) {
          
          return {
            constraintType: ConstraintType.SOFT_SUBJECT_CONSTRAINT,
            isHard: false,
            penalty: 100,
            variables: [assignment.variableId],
            message: `${subjectName}课不能连续安排，班级${assignment.classId}在相邻节次已有${subjectName}课`,
            suggestion: '建议调整时间安排，避免连续安排'
          };
        }
      }
    }
    
    return null;
  }

  /**
   * 检测最小间隔约束
   */
  private checkMinIntervalConstraint(
    assignment: CourseAssignment,
    existingAssignments: Map<string, CourseAssignment>,
    subjectRule: any
  ): ConstraintViolation | null {
    const subjectName = this.getSubjectNameSync(assignment.courseId);
    if (!subjectName) return null;
    const minInterval = subjectRule.minInterval;
    
    for (const [_, existing] of Array.from(existingAssignments.entries())) {
      if (existing.classId.equals(assignment.classId) && 
          this.getSubjectNameSync(existing.courseId) === subjectName) {
        
        // 检查间隔是否满足要求
        if (assignment.timeSlot.dayOfWeek === existing.timeSlot.dayOfWeek) {
          const interval = Math.abs(assignment.timeSlot.period - existing.timeSlot.period);
          if (interval < minInterval) {
            return {
              constraintType: ConstraintType.SOFT_SUBJECT_CONSTRAINT,
              isHard: false,
              penalty: 50,
              variables: [assignment.variableId],
              message: `${subjectName}课间隔不足，需要至少${minInterval}节间隔，当前间隔${interval}节`,
              suggestion: '建议增加课程间隔时间'
            };
          }
        }
      }
    }
    
    return null;
  }

  /**
   * 检测每日最大出现次数约束
   */
  private checkDailyOccurrenceConstraint(
    assignment: CourseAssignment,
    existingAssignments: Map<string, CourseAssignment>,
    subjectRule: any
  ): ConstraintViolation | null {
    const subjectName = this.getSubjectNameSync(assignment.courseId);
    if (!subjectName) return null;
    const maxDaily = subjectRule.maxDailyOccurrences;
    
    let dailyCount = 1; // 当前要安排的课程
    
    for (const [_, existing] of Array.from(existingAssignments.entries())) {
      if (existing.classId.equals(assignment.classId) && 
          this.getSubjectNameSync(existing.courseId) === subjectName &&
          existing.timeSlot.dayOfWeek === assignment.timeSlot.dayOfWeek) {
        dailyCount++;
      }
    }
    
    if (dailyCount > maxDaily) {
      return {
        constraintType: ConstraintType.SOFT_SUBJECT_CONSTRAINT,
        isHard: false,
        penalty: 80,
        variables: [assignment.variableId],
        message: `${subjectName}课每日最多${maxDaily}次，当前已安排${dailyCount}次`,
        suggestion: '建议调整到其他日期'
      };
    }
    
    return null;
  }

  /**
   * 检测休息要求约束
   */
  private checkRestRequirementConstraint(
    assignment: CourseAssignment,
    existingAssignments: Map<string, CourseAssignment>,
    subjectRule: any
  ): ConstraintViolation | null {
    const subjectName = this.getSubjectNameSync(assignment.courseId);
    if (!subjectName) return null;
    const minRestPeriods = subjectRule.specialConstraints?.minRestPeriods || 0;
    
    if (minRestPeriods === 0) return null;
    
    for (const [_, existing] of Array.from(existingAssignments.entries())) {
      if (existing.classId.equals(assignment.classId) && 
          this.getSubjectNameSync(existing.courseId) === subjectName) {
        
        // 检查休息时间是否足够
        if (assignment.timeSlot.dayOfWeek === existing.timeSlot.dayOfWeek) {
          const interval = Math.abs(assignment.timeSlot.period - existing.timeSlot.period);
          if (interval < minRestPeriods + 1) { // +1 因为要包含休息的节次
            return {
              constraintType: ConstraintType.SOFT_SUBJECT_CONSTRAINT,
              isHard: false,
              penalty: 60,
              variables: [assignment.variableId],
              message: `${subjectName}课需要${minRestPeriods}节休息时间，当前间隔不足`,
              suggestion: '建议增加休息时间间隔'
            };
          }
        }
      }
    }
    
    return null;
  }

  /**
   * 检测体育课特殊约束
   */
  private checkPhysicalEducationConstraints(
    assignment: CourseAssignment,
    existingAssignments: Map<string, CourseAssignment>
  ): ConstraintViolation[] {
    const violations: ConstraintViolation[] = [];

    // 1. 检查是否与核心课程冲突（体育课不应占用核心课程黄金时段）
    if (this.isGoldenTimeForCoreSubjects(assignment.timeSlot)) {
      violations.push({
        constraintType: ConstraintType.SOFT_SUBJECT_CONSTRAINT,
        isHard: false,
        penalty: 80,
        variables: [assignment.variableId],
        message: '体育课不应占用核心课程黄金时段',
        suggestion: '建议将体育课调整到非黄金时段'
      });
    }

    // 2. 检查连排体育课约束（硬约束：体育课不能连排）
    if (this.isContinuousPhysicalEducation(assignment, existingAssignments)) {
      violations.push({
        constraintType: ConstraintType.HARD_SUBJECT_CONSTRAINT,
        isHard: true,
        penalty: 1000, // 高惩罚分数，确保不会被违反
        variables: [assignment.variableId],
        message: '体育课不能进行连排',
        suggestion: '必须将体育课安排在不同时间段'
      });
    }

    // 3. 检查同一天体育课数量约束（硬约束：不能同一天两节体育课）
    const dailyPEViolation = this.checkDailyPhysicalEducationLimit(assignment, existingAssignments);
    if (dailyPEViolation) {
      violations.push(dailyPEViolation);
    }

    // 4. 检查体育课与理论课的间隔
    const theoryIntervalViolation = this.checkPETheoryInterval(assignment, existingAssignments);
    if (theoryIntervalViolation) {
      violations.push(theoryIntervalViolation);
    }

    return violations;
  }

  /**
   * 检测艺术课特殊约束
   */
  private checkArtSubjectConstraints(
    assignment: CourseAssignment,
    existingAssignments: Map<string, CourseAssignment>
  ): ConstraintViolation[] {
    const violations: ConstraintViolation[] = [];

    // 1. 检查艺术课与核心课程的间隔
    const coreIntervalViolation = this.checkArtCoreInterval(assignment, existingAssignments);
    if (coreIntervalViolation) {
      violations.push(coreIntervalViolation);
    }

    // 2. 检查艺术课的时间安排合理性
    if (!this.isSuitableForArtSubject(assignment.timeSlot)) {
      violations.push({
        constraintType: ConstraintType.SOFT_SUBJECT_CONSTRAINT,
        isHard: false,
        penalty: 40,
        variables: [assignment.variableId],
        message: '艺术课时间安排不合理',
        suggestion: '建议调整到更适合艺术创作的时段'
      });
    }

    return violations;
  }

  /**
   * 检测实验课特殊约束
   */
  private checkLabSubjectConstraints(
    assignment: CourseAssignment,
    existingAssignments: Map<string, CourseAssignment>
  ): ConstraintViolation[] {
    const violations: ConstraintViolation[] = [];

    // 1. 检查实验课与理论课的关联性
    const theoryCorrelationViolation = this.checkLabTheoryCorrelation(assignment, existingAssignments);
    if (theoryCorrelationViolation) {
      violations.push(theoryCorrelationViolation);
    }

    // 2. 检查实验课的时间安排合理性
    if (!this.isSuitableForLabSubject(assignment.timeSlot)) {
      violations.push({
        constraintType: ConstraintType.SOFT_SUBJECT_CONSTRAINT,
        isHard: false,
        penalty: 50,
        variables: [assignment.variableId],
        message: '实验课时间安排不合理',
        suggestion: '建议调整到更适合实验操作的时段'
      });
    }

    return violations;
  }

  /**
   * 检测核心课程黄金时段保护
   */
  private checkCoreSubjectGoldenTimeProtection(
    assignment: CourseAssignment,
    existingAssignments: Map<string, CourseAssignment>
  ): ConstraintViolation[] {
    const violations: ConstraintViolation[] = [];
    
    for (const [_, existing] of Array.from(existingAssignments.entries())) {
      if (existing.classId.equals(assignment.classId) && 
          this.isCoreSubject(this.getSubjectNameSync(existing.courseId) || '')) {
        // 检查核心课程是否被安排在非黄金时段
        if (!this.isGoldenTimeForCoreSubjects(existing.timeSlot)) {
          violations.push({
            constraintType: ConstraintType.SOFT_CORE_SUBJECT_PRIORITY,
            isHard: false,
            penalty: 100,
            variables: [existing.variableId],
            message: '核心课程应优先安排在黄金时段',
            suggestion: '建议将核心课程调整到上午1-4节或下午5-6节'
          });
        }
      }
    }

    return violations;
  }

  /**
   * 检测核心课程分布约束
   * 
   * Args:
   *   assignment: 新的课程安排
   *   existingAssignments: 已有的课程安排
   * 
   * Returns:
   *   ConstraintViolation[]: 约束违反列表
   */
  checkCoreSubjectDistributionConstraints(
    assignment: CourseAssignment,
    existingAssignments: Map<string, CourseAssignment>
  ): ConstraintViolation[] {
    const violations: ConstraintViolation[] = [];
    
    // 检查是否启用核心课程策略
    if (!this.rules.courseArrangementRules.coreSubjectStrategy?.enableCoreSubjectStrategy) {
      return violations;
    }

    const strategy = this.rules.courseArrangementRules.coreSubjectStrategy;
    const subjectName = this.getSubjectNameSync(assignment.courseId);
    
    // 检查是否为核心课程
    if (!subjectName || !strategy.coreSubjects.includes(subjectName)) {
      return violations;
    }

    // 1. 检测每日最大出现次数约束
    const dailyOccurrenceViolation = this.checkCoreSubjectDailyOccurrence(
      assignment, existingAssignments, strategy, subjectName
    );
    if (dailyOccurrenceViolation) {
      violations.push(dailyOccurrenceViolation);
    }

    // 2. 检测每周最少出现天数约束
    const weeklyDistributionViolation = this.checkCoreSubjectWeeklyDistribution(
      assignment, existingAssignments, strategy, subjectName
    );
    if (weeklyDistributionViolation) {
      violations.push(weeklyDistributionViolation);
    }

    // 3. 检测连续天安排约束
    if (strategy.avoidConsecutiveDays) {
      const consecutiveDayViolation = this.checkCoreSubjectConsecutiveDays(
        assignment, existingAssignments, strategy, subjectName
      );
      if (consecutiveDayViolation) {
        violations.push(consecutiveDayViolation);
      }
    }

    // 4. 检测集中度约束
    const concentrationViolation = this.checkCoreSubjectConcentration(
      assignment, existingAssignments, strategy, subjectName
    );
    if (concentrationViolation) {
      violations.push(concentrationViolation);
    }

    // 5. 检测时间偏好约束
    const timePreferenceViolation = this.checkCoreSubjectTimePreference(
      assignment, strategy, subjectName
    );
    if (timePreferenceViolation) {
      violations.push(timePreferenceViolation);
    }

    return violations;
  }

  /**
   * 检测核心课程每日最大出现次数约束
   */
  private checkCoreSubjectDailyOccurrence(
    assignment: CourseAssignment,
    existingAssignments: Map<string, CourseAssignment>,
    strategy: any,
    subjectName: string
  ): ConstraintViolation | null {
    const maxDaily = strategy.maxDailyOccurrences;
    let dailyCount = 1; // 当前要安排的课程
    
    for (const [_, existing] of Array.from(existingAssignments.entries())) {
      if (existing.classId.equals(assignment.classId) && 
          this.getSubjectNameSync(existing.courseId) === subjectName &&
          existing.timeSlot.dayOfWeek === assignment.timeSlot.dayOfWeek) {
        dailyCount++;
      }
    }
    
    if (dailyCount > maxDaily) {
      return {
        constraintType: ConstraintType.HARD_CORE_SUBJECT_DISTRIBUTION, // 改为硬约束
        isHard: true, // 改为硬约束
        penalty: 1000, // 提高惩罚值
        variables: [assignment.variableId],
        message: `核心课程${subjectName}每日最多${maxDaily}次，当前已安排${dailyCount}次`,
        suggestion: `建议将${subjectName}课调整到其他日期，确保每日分布均衡`
      };
    }
    
    return null;
  }

  /**
   * 检测核心课程每周最少出现天数约束
   */
  private checkCoreSubjectWeeklyDistribution(
    assignment: CourseAssignment,
    existingAssignments: Map<string, CourseAssignment>,
    strategy: any,
    subjectName: string
  ): ConstraintViolation | null {
    const minDaysPerWeek = strategy.minDaysPerWeek;
    const classId = assignment.classId;
    
    // 统计当前已安排的天数
    const scheduledDays = new Set<number>();
    
    for (const [_, existing] of Array.from(existingAssignments.entries())) {
      if (existing.classId.equals(classId) && 
          this.getSubjectNameSync(existing.courseId) === subjectName) {
        scheduledDays.add(existing.timeSlot.dayOfWeek);
      }
    }
    
    // 添加当前要安排的天数
    scheduledDays.add(assignment.timeSlot.dayOfWeek);
    
    if (scheduledDays.size < minDaysPerWeek) {
      return {
        constraintType: ConstraintType.SOFT_CORE_SUBJECT_DISTRIBUTION,
        isHard: false,
        penalty: 100,
        variables: [assignment.variableId],
        message: `核心课程${subjectName}每周至少需要${minDaysPerWeek}天，当前仅${scheduledDays.size}天`,
        suggestion: `建议将${subjectName}课分散到更多工作日，确保每周分布均衡`
      };
    }
    
    return null;
  }

  /**
   * 检测核心课程连续天安排约束
   */
  private checkCoreSubjectConsecutiveDays(
    assignment: CourseAssignment,
    existingAssignments: Map<string, CourseAssignment>,
    strategy: any,
    subjectName: string
  ): ConstraintViolation | null {
    const classId = assignment.classId;
    const currentDay = assignment.timeSlot.dayOfWeek;
    
    // 检查前一天和后一天是否已有该核心课程
    const prevDay = currentDay === 1 ? 5 : currentDay - 1; // 假设周一到周五
    const nextDay = currentDay === 5 ? 1 : currentDay + 1;
    
    let hasPrevDay = false;
    let hasNextDay = false;
    
    for (const [_, existing] of Array.from(existingAssignments.entries())) {
      if (existing.classId.equals(classId) && 
          this.getSubjectNameSync(existing.courseId) === subjectName) {
        if (existing.timeSlot.dayOfWeek === prevDay) {
          hasPrevDay = true;
        }
        if (existing.timeSlot.dayOfWeek === nextDay) {
          hasNextDay = true;
        }
      }
    }
    
    if (hasPrevDay || hasNextDay) {
      return {
        constraintType: ConstraintType.HARD_CORE_SUBJECT_DISTRIBUTION, // 改为硬约束
        isHard: true, // 改为硬约束
        penalty: 1000, // 提高惩罚值
        variables: [assignment.variableId],
        message: `核心课程${subjectName}不能连续天安排，当前与相邻天冲突`,
        suggestion: `建议将${subjectName}课调整到其他日期，避免连续天安排`
      };
    }
    
    return null;
  }

  /**
   * 检测核心课程集中度约束
   */
  private checkCoreSubjectConcentration(
    assignment: CourseAssignment,
    existingAssignments: Map<string, CourseAssignment>,
    strategy: any,
    subjectName: string
  ): ConstraintViolation | null {
    const maxConcentration = strategy.maxConcentration;
    const classId = assignment.classId;
    
    // 统计连续安排的天数
    let maxConsecutiveDays = 1;
    let currentConsecutiveDays = 1;
    
    // 按天排序，检查连续安排
    const scheduledDays = new Set<number>();
    for (const [_, existing] of Array.from(existingAssignments.entries())) {
      if (existing.classId.equals(classId) && 
          this.getSubjectNameSync(existing.courseId) === subjectName) {
        scheduledDays.add(existing.timeSlot.dayOfWeek);
      }
    }
    scheduledDays.add(assignment.timeSlot.dayOfWeek);
    
    const sortedDays = Array.from(scheduledDays).sort();
    
    for (let i = 1; i < sortedDays.length; i++) {
      if (sortedDays[i] === sortedDays[i-1] + 1) {
        currentConsecutiveDays++;
        maxConsecutiveDays = Math.max(maxConsecutiveDays, currentConsecutiveDays);
      } else {
        currentConsecutiveDays = 1;
      }
    }
    
    if (maxConsecutiveDays > maxConcentration) {
      return {
        constraintType: ConstraintType.SOFT_CORE_SUBJECT_DISTRIBUTION,
        isHard: false,
        penalty: 90,
        variables: [assignment.variableId],
        message: `核心课程${subjectName}连续安排天数(${maxConsecutiveDays})超过限制(${maxConcentration})`,
        suggestion: `建议将${subjectName}课分散安排，避免过度集中`
      };
    }
    
    return null;
  }

  /**
   * 检测核心课程时间偏好约束
   */
  private checkCoreSubjectTimePreference(
    assignment: CourseAssignment,
    strategy: any,
    subjectName: string
  ): ConstraintViolation | null {
    const { preferredTimeSlots, avoidTimeSlots } = strategy;
    const currentPeriod = assignment.timeSlot.period;
    
    // 检查是否在避免时间段（硬约束）
    if (avoidTimeSlots && avoidTimeSlots.includes(currentPeriod)) {
      return {
        constraintType: ConstraintType.HARD_CORE_SUBJECT_DISTRIBUTION, // 改为硬约束
        isHard: true, // 改为硬约束
        penalty: 1000, // 提高惩罚值
        variables: [assignment.variableId],
        message: `核心课程${subjectName}不能在${currentPeriod}节安排，该时段被禁止`,
        suggestion: `请选择其他时段安排${subjectName}课`
      };
    }
    
    // 检查是否在偏好时间段（软约束，保持原样）
    if (preferredTimeSlots && preferredTimeSlots.length > 0 && preferredTimeSlots.includes(currentPeriod)) {
      return {
        constraintType: ConstraintType.SOFT_CORE_SUBJECT_DISTRIBUTION,
        isHard: false,
        penalty: 0, // 偏好时间段不扣分
        variables: [assignment.variableId],
        message: `${subjectName}课安排在偏好时段${currentPeriod}节`,
        suggestion: '继续保持'
      };
    }
    
    return null;
  }

  /**
   * 检测核心课程整体分布质量
   * 
   * Args:
   *   classId: 班级ID
   *   existingAssignments: 已有的课程安排
   * 
   * Returns:
   *   ConstraintViolation[]: 分布质量约束违反列表
   */
  checkCoreSubjectDistributionQuality(
    classId: mongoose.Types.ObjectId,
    existingAssignments: Map<string, CourseAssignment>
  ): ConstraintViolation[] {
    const violations: ConstraintViolation[] = [];
    
    if (!this.rules.courseArrangementRules.coreSubjectStrategy?.enableCoreSubjectStrategy) {
      return violations;
    }

    const strategy = this.rules.courseArrangementRules.coreSubjectStrategy;
    
    // 按科目统计分布情况
    for (const coreSubject of strategy.coreSubjects) {
      const subjectViolations = this.analyzeCoreSubjectDistribution(
        classId, existingAssignments, strategy, coreSubject
      );
      violations.push(...subjectViolations);
    }
    
    return violations;
  }

  /**
   * 分析单个核心课程的分布情况
   */
  private analyzeCoreSubjectDistribution(
    classId: mongoose.Types.ObjectId,
    existingAssignments: Map<string, CourseAssignment>,
    strategy: any,
    subjectName: string
  ): ConstraintViolation[] {
    const violations: ConstraintViolation[] = [];
    
    // 统计每周各天的课程数量
    const dailyCounts = new Map<number, number>();
    const workingDays = this.rules.timeRules.workingDays;
    
    // 初始化每天计数为0
    for (const day of workingDays) {
      dailyCounts.set(day, 0);
    }
    
    // 统计已有安排
    for (const [_, existing] of Array.from(existingAssignments.entries())) {
      if (existing.classId.equals(classId) && 
          this.getSubjectNameSync(existing.courseId) === subjectName) {
        const day = existing.timeSlot.dayOfWeek;
        dailyCounts.set(day, (dailyCounts.get(day) || 0) + 1);
      }
    }
    
    // 检查分布是否均匀
    if (strategy.enforceEvenDistribution) {
      const counts = Array.from(dailyCounts.values());
      const maxCount = Math.max(...counts);
      const minCount = Math.min(...counts);
      
      if (maxCount - minCount > 1) {
        violations.push({
          constraintType: ConstraintType.SOFT_CORE_SUBJECT_DISTRIBUTION,
          isHard: false,
          penalty: 70,
          variables: [], // 这里需要具体的变量ID
          message: `核心课程${subjectName}分布不均匀，最多${maxCount}次/天，最少${minCount}次/天`,
          suggestion: `建议调整${subjectName}课安排，确保每周分布更加均匀`
        });
      }
    }
    
    return violations;
  }

  /**
   * 判断是否为核心课程
   */
  private isCoreSubject(subjectName: string): boolean {
    const coreSubjects = ['语文', '数学', '英语', '物理', '化学', '生物'];
    return coreSubjects.includes(subjectName);
  }

  /**
   * 检测非核心课程每日限制约束（硬约束）
   * 
   * Args:
   *   assignment: 当前课程安排
   *   existingAssignments: 现有安排
   * 
   * Returns:
   *   ConstraintViolation | null: 约束违反信息
   */
  private checkNonCoreSubjectDailyLimit(
    assignment: CourseAssignment,
    existingAssignments: Map<string, CourseAssignment>
  ): ConstraintViolation | null {
    const subjectName = this.getSubjectNameSync(assignment.courseId);
    if (!subjectName) {
      return null;
    }

    // 跳过核心课程检查
    if (this.isCoreSubject(subjectName)) {
      return null;
    }

    const classId = assignment.classId;
    const dayOfWeek = assignment.timeSlot.dayOfWeek;
    let dailyCount = 1; // 当前要安排的课程

    // 统计当天该科目的课程数量
    for (const [_, existing] of Array.from(existingAssignments.entries())) {
      if (existing.classId.equals(classId) && 
          existing.timeSlot.dayOfWeek === dayOfWeek &&
          this.getSubjectNameSync(existing.courseId) === subjectName) {
        dailyCount++;
      }
    }

    // 非核心课程每日最多1节
    if (dailyCount > 1) {
      return {
        constraintType: ConstraintType.HARD_SUBJECT_CONSTRAINT,
        isHard: true,
        penalty: 1500, // 高惩罚分数，确保不会被违反
        variables: [assignment.variableId],
        message: `非核心课程 ${subjectName} 在同一天安排了 ${dailyCount} 节课，超过每日限制`,
        suggestion: `必须将 ${subjectName} 安排到其他天，每日最多1节`
      };
    }

    return null;
  }

  /**
   * 判断是否为核心课程黄金时段
   */
  private isGoldenTimeForCoreSubjects(timeSlot: TimeSlot): boolean {
    return (timeSlot.period >= 1 && timeSlot.period <= 4) || // 上午1-4节
           (timeSlot.period >= 5 && timeSlot.period <= 6);   // 下午5-6节
  }

  /**
   * 判断是否为连排体育课
   */
  private isContinuousPhysicalEducation(
    assignment: CourseAssignment,
    existingAssignments: Map<string, CourseAssignment>
  ): boolean {
    // 检查同一天相邻节次是否有体育课
    for (const [_, existing] of Array.from(existingAssignments.entries())) {
      if (existing.classId.equals(assignment.classId) && 
          this.getSubjectNameSync(existing.courseId) === '体育' &&
          existing.timeSlot.dayOfWeek === assignment.timeSlot.dayOfWeek &&
          Math.abs(existing.timeSlot.period - assignment.timeSlot.period) === 1) {
        return true;
      }
    }
    return false;
  }

  /**
   * 判断是否适合连排体育课
   */
  private isSuitableForContinuousPE(timeSlot: TimeSlot): boolean {
    // 连排体育课最佳时段：上午3-4节，下午5-6节
    return (timeSlot.period >= 3 && timeSlot.period <= 4) || 
           (timeSlot.period >= 5 && timeSlot.period <= 6);
  }

  /**
   * 判断是否适合艺术课
   */
  private isSuitableForArtSubject(timeSlot: TimeSlot): boolean {
    // 艺术课最佳时段：上午3-4节，下午5-6节
    return (timeSlot.period >= 3 && timeSlot.period <= 6);
  }

  /**
   * 判断是否适合实验课
   */
  private isSuitableForLabSubject(timeSlot: TimeSlot): boolean {
    // 实验课最佳时段：上午2-4节，下午5节
    return (timeSlot.period >= 2 && timeSlot.period <= 4) || timeSlot.period === 5;
  }

  /**
   * 检查体育课与理论课的间隔
   */
  private checkPETheoryInterval(
    assignment: CourseAssignment,
    existingAssignments: Map<string, CourseAssignment>
  ): ConstraintViolation | null {
    const theorySubjects = ['语文', '数学', '英语', '物理', '化学', '生物', '历史', '地理', '政治'];
    
    for (const [_, existing] of Array.from(existingAssignments.entries())) {
      if (existing.classId.equals(assignment.classId) && 
          this.getSubjectNameSync(existing.courseId) === '体育' &&
          theorySubjects.includes(this.getSubjectNameSync(existing.courseId) || '')) {
        
        // 检查是否在同一天且间隔过小
        if (existing.timeSlot.dayOfWeek === assignment.timeSlot.dayOfWeek &&
            Math.abs(existing.timeSlot.period - assignment.timeSlot.period) <= 1) {
          
          return {
            constraintType: ConstraintType.SOFT_SUBJECT_CONSTRAINT,
            isHard: false,
            penalty: 70,
            variables: [assignment.variableId],
            message: '体育课与理论课间隔过小',
            suggestion: '建议在体育课与理论课之间安排至少1节课的间隔'
          };
        }
      }
    }
    
    return null;
  }

  /**
   * 检查艺术课与核心课程的间隔
   */
  private checkArtCoreInterval(
    assignment: CourseAssignment,
    existingAssignments: Map<string, CourseAssignment>
  ): ConstraintViolation | null {
    for (const [_, existing] of Array.from(existingAssignments.entries())) {
      if (existing.classId.equals(assignment.classId) && 
          this.isCoreSubject(this.getSubjectNameSync(existing.courseId) || '')) {
        
        // 检查是否在同一天且间隔过小
        if (existing.timeSlot.dayOfWeek === assignment.timeSlot.dayOfWeek &&
            Math.abs(existing.timeSlot.period - assignment.timeSlot.period) <= 1) {
          
          return {
            constraintType: ConstraintType.SOFT_SUBJECT_CONSTRAINT,
            isHard: false,
            penalty: 50,
            variables: [assignment.variableId],
            message: '艺术课与核心课程间隔过小',
            suggestion: '建议在艺术课与核心课程之间安排至少1节课的间隔'
          };
        }
      }
    }
    
    return null;
  }

  /**
   * 检查实验课与理论课的关联性
   */
  private checkLabTheoryCorrelation(
    assignment: CourseAssignment,
    existingAssignments: Map<string, CourseAssignment>
  ): ConstraintViolation | null {
    const subjectName = this.getSubjectNameSync(assignment.courseId);
    if (!subjectName) return null;
    
    const theorySubject = this.getTheorySubjectForLab(subjectName);
    
    if (!theorySubject) return null;
    
    // 检查是否在同一天有对应的理论课
    let hasTheoryClass = false;
    for (const [_, existing] of Array.from(existingAssignments.entries())) {
      if (existing.classId.equals(assignment.classId) && 
          this.getSubjectNameSync(existing.courseId) === theorySubject &&
          existing.timeSlot.dayOfWeek === assignment.timeSlot.dayOfWeek) {
        hasTheoryClass = true;
        break;
      }
    }
    
    if (!hasTheoryClass) {
      return {
        constraintType: ConstraintType.SOFT_SUBJECT_CONSTRAINT,
        isHard: false,
        penalty: 60,
        variables: [assignment.variableId],
        message: `实验课应在对应理论课之后安排`,
        suggestion: `建议先安排${theorySubject}理论课，再安排${subjectName}实验课`
      };
    }
    
    return null;
  }

  /**
   * 获取实验课对应的理论课
   */
  private getTheorySubjectForLab(labSubject: string): string | null {
    const labTheoryMap: { [key: string]: string } = {
      '物理实验': '物理',
      '化学实验': '化学',
      '生物实验': '生物'
    };
    
    return labTheoryMap[labSubject] || null;
  }

  /**
   * 获取科目名称（辅助方法）
   * 
   * Args:
   *   courseId: 课程ID
   * 
   * Returns:
   *   string | null: 科目名称，如果无法获取则返回null
   */
  private async getSubjectName(courseId: mongoose.Types.ObjectId): Promise<string | null> {
    try {
      // 从数据库获取课程信息
      const Course = mongoose.model('Course');
      const course = await Course.findById(courseId).select('name').lean();
      return (course as any)?.name || null;
    } catch (error) {
      console.warn(`获取科目名称失败 (ID: ${courseId}):`, error);
      return null;
    }
  }

  /**
   * 同步版本的科目名称获取（用于性能关键场景）
   */
  public getSubjectNameSync(courseId: mongoose.Types.ObjectId): string | null {
    // 如果科目名称缓存存在，直接返回
    if (this.subjectNameCache && this.subjectNameCache.has(courseId.toString())) {
      return this.subjectNameCache.get(courseId.toString())!;
    }
    return null;
  }



  /**
   * 检测同一天体育课数量约束（硬约束）
   * 
   * @deprecated 已废弃，请使用 checkNonCoreSubjectDailyLimit 方法
   */
  private checkDailyPhysicalEducationLimit(
    assignment: CourseAssignment,
    existingAssignments: Map<string, CourseAssignment>
  ): ConstraintViolation | null {
    const subjectName = this.getSubjectNameSync(assignment.courseId);
    if (!subjectName || subjectName !== '体育') {
      return null; // 只对体育课进行同一天两节限制
    }

    let dailyCount = 0;
    for (const [_, existing] of Array.from(existingAssignments.entries())) {
      if (existing.classId.equals(assignment.classId) && 
          this.getSubjectNameSync(existing.courseId) === '体育' &&
          existing.timeSlot.dayOfWeek === assignment.timeSlot.dayOfWeek) {
        dailyCount++;
      }
    }

    if (dailyCount >= 2) {
      return {
        constraintType: ConstraintType.HARD_SUBJECT_CONSTRAINT,
        isHard: true,
        penalty: 1000, // 高惩罚分数，确保不会被违反
        variables: [assignment.variableId],
        message: '体育课不能在同一天安排两节',
        suggestion: '必须将体育课安排在不同时间段'
      };
    }

    return null;
  }
}