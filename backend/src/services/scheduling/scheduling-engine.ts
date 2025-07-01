/**
 * 核心排课算法引擎
 * 
 * 实现智能排课算法，支持约束传播、回溯算法和局部优化
 */

import mongoose from 'mongoose';
import {
  ScheduleVariable,
  CourseAssignment,
  ScheduleState,
  AlgorithmConfig,
  SchedulingResult,
  TimeSlot,
  ConflictInfo,
  ConstraintViolation,
  ProgressCallback,
  HeuristicStrategy,
  AlgorithmMode
} from './types';
import { ConstraintDetector } from './constraint-detector';
import { ISchedulingRules } from '../../models/SchedulingRules';

/**
 * 排课算法引擎类
 * 
 * 实现核心的排课算法逻辑
 */
export class SchedulingEngine {
  private rules: ISchedulingRules;
  private constraintDetector: ConstraintDetector;
  private config: AlgorithmConfig;
  private progressCallback?: ProgressCallback;

  /**
   * 构造函数
   * 
   * Args:
   *   rules: 排课规则
   *   config: 算法配置
   *   progressCallback: 进度回调函数
   */
  constructor(
    rules: ISchedulingRules,
    config: AlgorithmConfig,
    progressCallback?: ProgressCallback
  ) {
    this.rules = rules;
    this.constraintDetector = new ConstraintDetector(rules);
    this.config = config;
    this.progressCallback = progressCallback;
  }

  /**
   * 执行排课算法
   * 
   * Args:
   *   variables: 排课变量列表
   *   fixedAssignments: 固定的课程安排（不可修改）
   * 
   * Returns:
   *   Promise<SchedulingResult>: 排课结果
   */
  async solve(
    variables: ScheduleVariable[],
    fixedAssignments: CourseAssignment[] = []
  ): Promise<SchedulingResult> {
    const startTime = Date.now();

    try {
      this.reportProgress('初始化', 0, '正在初始化排课算法...', 0, variables.length);

      // 初始化状态
      const state = this.initializeState(variables, fixedAssignments);

      // 预处理：约束传播
      this.reportProgress('预处理', 10, '正在进行约束传播...', 0, variables.length);
      this.propagateConstraints(state, variables);

      // 主要求解阶段
      this.reportProgress('求解', 20, '正在执行回溯算法...', 0, variables.length);
      const solved = await this.backtrackSearch(state, variables);

      // 局部优化阶段
      if (solved && this.config.enableLocalOptimization) {
        this.reportProgress('优化', 80, '正在进行局部优化...', state.assignments.size, variables.length);
        await this.localOptimization(state, variables);
      }

      const endTime = Date.now();
      const executionTime = endTime - startTime;

      this.reportProgress('完成', 100, '排课算法执行完成', state.assignments.size, variables.length);

      return this.buildResult(solved, state, variables, executionTime);

    } catch (error) {
      const executionTime = Date.now() - startTime;
      console.error('排课算法执行失败:', error);

      return {
        success: false,
        scheduleState: this.initializeState(variables, fixedAssignments),
        statistics: {
          totalVariables: variables.length,
          assignedVariables: 0,
          unassignedVariables: variables.length,
          hardViolations: 0,
          softViolations: 0,
          totalScore: 0,
          iterations: 0,
          executionTime
        },
        conflicts: [],
        violations: [],
        message: `算法执行失败: ${error instanceof Error ? error.message : '未知错误'}`,
        suggestions: ['请检查排课规则配置', '建议减少约束条件', '尝试增加可用时间段']
      };
    }
  }

  /**
   * 初始化排课状态
   * 
   * Args:
   *   variables: 排课变量列表
   *   fixedAssignments: 固定安排
   * 
   * Returns:
   *   ScheduleState: 初始化的状态
   */
  private initializeState(
    variables: ScheduleVariable[],
    fixedAssignments: CourseAssignment[]
  ): ScheduleState {
    const assignments = new Map<string, CourseAssignment>();

    // 添加固定安排
    for (const fixed of fixedAssignments) {
      assignments.set(fixed.variableId, fixed);
    }

    const unassigned = variables
      .filter(v => !assignments.has(v.id))
      .map(v => v.id);

    return {
      assignments,
      unassigned,
      conflicts: [],
      violations: [],
      score: 0,
      isComplete: unassigned.length === 0,
      isFeasible: true
    };
  }

  /**
   * 约束传播：预先筛选变量的可行域
   * 
   * Args:
   *   state: 当前状态
   *   variables: 变量列表
   */
  private propagateConstraints(state: ScheduleState, variables: ScheduleVariable[]): void {
    const { timeRules } = this.rules;

    for (const variable of variables) {
      if (state.assignments.has(variable.id)) {
        continue; // 已分配的变量跳过
      }

      // 生成所有可能的时间段
      const allTimeSlots: TimeSlot[] = [];
      for (const day of timeRules.workingDays) {
        for (let period = 1; period <= timeRules.dailyPeriods; period++) {
          allTimeSlots.push({ dayOfWeek: day, period });
        }
      }

      // 筛选可行时间段
      variable.domain = allTimeSlots.filter(slot => {
        return this.isTimeSlotFeasible(variable, slot, state.assignments);
      });

      // 如果某个变量的域为空，标记为不可行
      if (variable.domain.length === 0) {
        state.isFeasible = false;
        state.conflicts.push({
          type: 'class',
          resourceId: variable.classId,
          timeSlot: { dayOfWeek: 1, period: 1 },
          conflictingVariables: [variable.id],
          severity: 'critical',
          message: `变量 ${variable.id} 没有可行的时间段`
        });
      }
    }
  }

  /**
   * 回溯搜索算法
   * 
   * Args:
   *   state: 当前状态
   *   variables: 变量列表
   * 
   * Returns:
   *   Promise<boolean>: 是否找到解
   */
  private async backtrackSearch(
    state: ScheduleState,
    variables: ScheduleVariable[]
  ): Promise<boolean> {
    let iterations = 0;
    const maxIterations = this.config.maxIterations;
    const timeLimit = this.config.timeLimit * 1000; // 转换为毫秒
    const startTime = Date.now();

    const search = async (): Promise<boolean> => {
      iterations++;

      // 检查终止条件
      if (iterations > maxIterations) {
        console.log(`达到最大迭代次数限制: ${maxIterations}`);
        return false;
      }

      if (Date.now() - startTime > timeLimit) {
        console.log(`达到时间限制: ${this.config.timeLimit}秒`);
        return false;
      }

      // 检查是否完成
      if (state.unassigned.length === 0) {
        state.isComplete = true;
        return true;
      }

      // 选择下一个变量
      const variableId = this.selectVariable(state, variables);
      if (!variableId) {
        return false; // 没有可选变量
      }

      const variable = variables.find(v => v.id === variableId)!;

      // 尝试每个可能的值
      for (const timeSlot of this.orderValues(variable, state)) {
        // 检查是否可以分配
        if (await this.canAssign(variable, timeSlot, state)) {
          // 进行分配
          const assignment = await this.makeAssignment(variable, timeSlot, state);
          
          // 递归搜索
          const result = await search();
          if (result) {
            return true;
          }

          // 回溯
          this.undoAssignment(assignment, state);
        }
      }

      return false;
    };

    return await search();
  }

  /**
   * 选择下一个要分配的变量（最少剩余值启发式）
   * 
   * Args:
   *   state: 当前状态
   *   variables: 变量列表
   * 
   * Returns:
   *   string | null: 选择的变量ID
   */
  private selectVariable(state: ScheduleState, variables: ScheduleVariable[]): string | null {
    const unassignedVars = variables.filter(v => state.unassigned.includes(v.id));

    if (unassignedVars.length === 0) {
      return null;
    }

    // 使用最少剩余值(MRV)启发式
    let bestVar = unassignedVars[0];
    let minDomainSize = bestVar.domain.length;

    for (const variable of unassignedVars) {
      if (variable.domain.length < minDomainSize) {
        bestVar = variable;
        minDomainSize = variable.domain.length;
      } else if (variable.domain.length === minDomainSize) {
        // 同样大小的域，选择优先级更高的
        if (variable.priority > bestVar.priority) {
          bestVar = variable;
        }
      }
    }

    return bestVar.id;
  }

  /**
   * 对值进行排序（最少约束值启发式）
   * 
   * Args:
   *   variable: 变量
   *   state: 当前状态
   * 
   * Returns:
   *   TimeSlot[]: 排序后的时间段列表
   */
  private orderValues(variable: ScheduleVariable, state: ScheduleState): TimeSlot[] {
    // 复制域以避免修改原始数据
    const values = [...variable.domain];

    // 按照冲突程度排序（最少冲突优先）
    values.sort((a, b) => {
      const conflictsA = this.countPotentialConflicts(variable, a, state);
      const conflictsB = this.countPotentialConflicts(variable, b, state);
      
      if (conflictsA !== conflictsB) {
        return conflictsA - conflictsB;
      }

      // 如果冲突数相同，优先选择偏好时间
      const preferenceA = this.getTimeSlotPreference(variable, a);
      const preferenceB = this.getTimeSlotPreference(variable, b);
      
      return preferenceB - preferenceA; // 偏好值高的优先
    });

    return values;
  }

  /**
   * 检查是否可以进行分配
   * 
   * Args:
   *   variable: 变量
   *   timeSlot: 时间段
   *   state: 当前状态
   * 
   * Returns:
   *   Promise<boolean>: 是否可以分配
   */
  private async canAssign(
    variable: ScheduleVariable,
    timeSlot: TimeSlot,
    state: ScheduleState
  ): Promise<boolean> {
    // 选择合适的教室
    const roomId = await this.selectRoom(variable, timeSlot, state);
    if (!roomId) {
      return false; // 没有可用教室
    }

    // 创建临时分配
    const tempAssignment: CourseAssignment = {
      variableId: variable.id,
      classId: variable.classId,
      courseId: variable.courseId,
      teacherId: variable.teacherId,
      roomId,
      timeSlot,
      isFixed: false
    };

    // 检查硬约束
    const conflicts = this.constraintDetector.checkAllConflicts(tempAssignment, state.assignments);
    return conflicts.length === 0;
  }

  /**
   * 进行课程分配
   * 
   * Args:
   *   variable: 变量
   *   timeSlot: 时间段
   *   state: 当前状态
   * 
   * Returns:
   *   Promise<CourseAssignment>: 分配结果
   */
  private async makeAssignment(
    variable: ScheduleVariable,
    timeSlot: TimeSlot,
    state: ScheduleState
  ): Promise<CourseAssignment> {
    const roomId = await this.selectRoom(variable, timeSlot, state);

    const assignment: CourseAssignment = {
      variableId: variable.id,
      classId: variable.classId,
      courseId: variable.courseId,
      teacherId: variable.teacherId,
      roomId: roomId!,
      timeSlot,
      isFixed: false
    };

    // 更新状态
    state.assignments.set(variable.id, assignment);
    state.unassigned = state.unassigned.filter(id => id !== variable.id);

    // 更新进度
    const assignedCount = state.assignments.size;
    const totalCount = assignedCount + state.unassigned.length;
    const percentage = 20 + (assignedCount / totalCount) * 60; // 20-80%为求解阶段

    this.reportProgress(
      '求解',
      percentage,
      `已分配 ${assignedCount}/${totalCount} 个课程`,
      assignedCount,
      totalCount
    );

    return assignment;
  }

  /**
   * 撤销分配（回溯）
   * 
   * Args:
   *   assignment: 要撤销的分配
   *   state: 当前状态
   */
  private undoAssignment(assignment: CourseAssignment, state: ScheduleState): void {
    state.assignments.delete(assignment.variableId);
    state.unassigned.push(assignment.variableId);
  }

  /**
   * 选择合适的教室
   * 
   * Args:
   *   variable: 变量
   *   timeSlot: 时间段
   *   state: 当前状态
   * 
   * Returns:
   *   Promise<mongoose.Types.ObjectId | null>: 选择的教室ID
   */
  private async selectRoom(
    variable: ScheduleVariable,
    timeSlot: TimeSlot,
    state: ScheduleState
  ): Promise<mongoose.Types.ObjectId | null> {
    // 这里应该从数据库查询可用教室
    // 为了简化，暂时返回一个模拟的教室ID
    return new mongoose.Types.ObjectId();
  }

  /**
   * 计算潜在冲突数
   * 
   * Args:
   *   variable: 变量
   *   timeSlot: 时间段
   *   state: 当前状态
   * 
   * Returns:
   *   number: 潜在冲突数
   */
  private countPotentialConflicts(
    variable: ScheduleVariable,
    timeSlot: TimeSlot,
    state: ScheduleState
  ): number {
    let conflicts = 0;

    for (const assignment of state.assignments.values()) {
      if (assignment.timeSlot.dayOfWeek === timeSlot.dayOfWeek &&
          assignment.timeSlot.period === timeSlot.period) {
        
        // 教师冲突
        if (assignment.teacherId.equals(variable.teacherId)) {
          conflicts += 100;
        }
        
        // 班级冲突
        if (assignment.classId.equals(variable.classId)) {
          conflicts += 100;
        }
      }
    }

    return conflicts;
  }

  /**
   * 获取时间段偏好分数
   * 
   * Args:
   *   variable: 变量
   *   timeSlot: 时间段
   * 
   * Returns:
   *   number: 偏好分数
   */
  private getTimeSlotPreference(variable: ScheduleVariable, timeSlot: TimeSlot): number {
    let score = 0;

    // 检查时间偏好
    if (variable.timePreferences) {
      for (const pref of variable.timePreferences) {
        if (pref.dayOfWeek === timeSlot.dayOfWeek && pref.period === timeSlot.period) {
          score += 50;
        }
      }
    }

    // 检查时间避免
    if (variable.timeAvoidance) {
      for (const avoid of variable.timeAvoidance) {
        if (avoid.dayOfWeek === timeSlot.dayOfWeek && avoid.period === timeSlot.period) {
          score -= 50;
        }
      }
    }

    return score;
  }

  /**
   * 检查时间段是否可行
   * 
   * Args:
   *   variable: 变量
   *   timeSlot: 时间段
   *   assignments: 当前分配
   * 
   * Returns:
   *   boolean: 是否可行
   */
  private isTimeSlotFeasible(
    variable: ScheduleVariable,
    timeSlot: TimeSlot,
    assignments: Map<string, CourseAssignment>
  ): boolean {
    // 检查禁用时间段
    const { timeRules } = this.rules;
    
    if (timeRules.forbiddenSlots) {
      for (const forbidden of timeRules.forbiddenSlots) {
        if (forbidden.dayOfWeek === timeSlot.dayOfWeek &&
            forbidden.periods.includes(timeSlot.period)) {
          return false;
        }
      }
    }

    // 检查避免时间段
    if (variable.timeAvoidance) {
      for (const avoid of variable.timeAvoidance) {
        if (avoid.dayOfWeek === timeSlot.dayOfWeek && avoid.period === timeSlot.period) {
          return false;
        }
      }
    }

    return true;
  }

  /**
   * 局部优化算法
   * 
   * Args:
   *   state: 当前状态
   *   variables: 变量列表
   */
  private async localOptimization(state: ScheduleState, variables: ScheduleVariable[]): Promise<void> {
    const maxIterations = this.config.localOptimizationIterations;
    
    for (let i = 0; i < maxIterations; i++) {
      let improved = false;

      // 尝试改进每个分配
      for (const [variableId, assignment] of state.assignments) {
        if (assignment.isFixed) {
          continue; // 跳过固定分配
        }

        const variable = variables.find(v => v.id === variableId)!;
        const currentScore = this.evaluateAssignment(variable, assignment, state);

        // 尝试其他时间段
        for (const timeSlot of variable.domain) {
          if (timeSlot.dayOfWeek === assignment.timeSlot.dayOfWeek &&
              timeSlot.period === assignment.timeSlot.period) {
            continue; // 跳过当前时间段
          }

          if (await this.canAssign(variable, timeSlot, state)) {
            // 临时更改分配
            const originalTimeSlot = assignment.timeSlot;
            assignment.timeSlot = timeSlot;

            const newScore = this.evaluateAssignment(variable, assignment, state);
            
            if (newScore > currentScore) {
              improved = true;
              break; // 找到改进，保持新分配
            } else {
              // 恢复原分配
              assignment.timeSlot = originalTimeSlot;
            }
          }
        }
      }

      if (!improved) {
        break; // 没有改进，停止优化
      }
    }
  }

  /**
   * 评估分配的质量
   * 
   * Args:
   *   variable: 变量
   *   assignment: 分配
   *   state: 状态
   * 
   * Returns:
   *   number: 评分
   */
  private evaluateAssignment(
    variable: ScheduleVariable,
    assignment: CourseAssignment,
    state: ScheduleState
  ): number {
    let score = 0;

    // 时间偏好奖励
    const preferenceScore = this.getTimeSlotPreference(variable, assignment.timeSlot);
    score += preferenceScore;

    // 软约束检查
    const violation = this.constraintDetector.checkTimePreferenceConstraint(variable, assignment);
    if (violation) {
      score -= violation.penalty;
    }

    return score;
  }

  /**
   * 构建最终结果
   * 
   * Args:
   *   success: 是否成功
   *   state: 最终状态
   *   variables: 变量列表
   *   executionTime: 执行时间
   * 
   * Returns:
   *   SchedulingResult: 排课结果
   */
  private buildResult(
    success: boolean,
    state: ScheduleState,
    variables: ScheduleVariable[],
    executionTime: number
  ): SchedulingResult {
    // 计算统计信息
    const totalVariables = variables.length;
    const assignedVariables = state.assignments.size;
    const unassignedVariables = state.unassigned.length;

    // 计算约束违反
    const hardViolations = state.violations.filter(v => v.isHard).length;
    const softViolations = state.violations.filter(v => !v.isHard).length;

    // 计算总评分
    let totalScore = 0;
    for (const violation of state.violations) {
      totalScore -= violation.penalty;
    }

    // 生成建议
    const suggestions: string[] = [];
    if (!success) {
      suggestions.push('建议放宽约束条件');
      suggestions.push('考虑增加可用教室');
      suggestions.push('调整教师时间偏好');
    }
    if (hardViolations > 0) {
      suggestions.push('存在硬约束违反，需要手动调整');
    }
    if (softViolations > 5) {
      suggestions.push('软约束违反较多，建议优化排课规则');
    }

    return {
      success,
      scheduleState: state,
      statistics: {
        totalVariables,
        assignedVariables,
        unassignedVariables,
        hardViolations,
        softViolations,
        totalScore,
        iterations: 0, // TODO: 实际迭代次数
        executionTime
      },
      conflicts: state.conflicts,
      violations: state.violations,
      message: success ? '排课成功完成' : '排课未能完全成功',
      suggestions
    };
  }

  /**
   * 报告进度
   * 
   * Args:
   *   stage: 当前阶段
   *   percentage: 完成百分比
   *   message: 消息
   *   assignedCount: 已分配数量
   *   totalCount: 总数量
   */
  private reportProgress(
    stage: string,
    percentage: number,
    message: string,
    assignedCount: number,
    totalCount: number
  ): void {
    if (this.progressCallback) {
      this.progressCallback({
        stage,
        percentage,
        message,
        assignedCount,
        totalCount
      });
    }
  }
}