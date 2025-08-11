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
  AlgorithmMode,
  TeacherRotationState,
  ConstraintType,
  RotationProgressData,
  RotationSummary
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
  
  // 新增：教师轮换状态管理
  private teacherRotationStates: Map<string, TeacherRotationState> = new Map();
  
  // 新增：课程名称缓存
  private courseNameCache: Map<string, string> = new Map();

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
    
    // 初始化教师轮换状态
    this.initializeTeacherRotation([]);
    
    // 延迟初始化课程名称缓存
    this.initializeCourseNameCache().catch(error => {
      console.warn('课程名称缓存初始化失败:', error);
    });
  }

  /**
   * 初始化教师轮换状态
   * 
   * Args:
   *   variables: 排课变量列表
   */
  private initializeTeacherRotation(variables: ScheduleVariable[]): void {
    // 按教师分组变量
    const teacherGroups = new Map<string, ScheduleVariable[]>();
    
    for (const variable of variables) {
      const teacherKey = variable.teacherId.toString();
      if (!teacherGroups.has(teacherKey)) {
        teacherGroups.set(teacherKey, []);
      }
      teacherGroups.get(teacherKey)!.push(variable);
    }

    // 为每个教师初始化轮换状态
    for (const [teacherKey, teacherVariables] of teacherGroups) {
      const teacherId = new mongoose.Types.ObjectId(teacherKey);
      
      // 获取班级列表
      const classIds = [...new Set(teacherVariables.map(v => v.classId.toString()))];
      
      // 确定轮换顺序
      let rotationOrder: string[];
      if (this.rules.teacherConstraints.rotationStrategy.rotationOrder === 'alphabetical') {
        rotationOrder = classIds.sort();
      } else if (this.rules.teacherConstraints.rotationStrategy.rotationOrder === 'grade_based') {
        rotationOrder = this.sortClassesByGrade(classIds);
      } else {
        rotationOrder = this.rules.teacherConstraints.rotationStrategy.customRotationOrder || classIds;
      }

      const rotationState: TeacherRotationState = {
        teacherId,
        currentRound: 1,
        classRotationOrder: rotationOrder,
        lastAssignedClass: '',
        rotationProgress: new Map(),
        roundCompletionStatus: new Map()
      };

      // 初始化各班级的轮换进度
      for (const classId of rotationOrder) {
        rotationState.rotationProgress.set(classId, 0);
        rotationState.roundCompletionStatus.set(classId, false);
      }

      this.teacherRotationStates.set(teacherKey, rotationState);
    }
  }

  /**
   * 按年级排序班级
   */
  private sortClassesByGrade(classIds: string[]): string[] {
    // 这里需要根据实际的班级命名规则来实现
    // 暂时按字母顺序排序
    return classIds.sort();
  }

  /**
   * 初始化课程名称缓存
   */
  private async initializeCourseNameCache(): Promise<void> {
    try {
      // 从数据库预加载常用课程名称
      const Course = mongoose.model('Course');
      const courses = await Course.find({}).select('_id name').lean();
      
      for (const course of courses) {
        this.courseNameCache.set((course as any)._id.toString(), (course as any).name || '未知课程');
      }
      
      console.log(`✅ 课程名称缓存初始化完成，共缓存 ${this.courseNameCache.size} 个课程`);
    } catch (error) {
      console.warn('课程名称缓存初始化失败:', error);
      // 缓存初始化失败不影响主要功能
    }
  }

  /**
   * 检查教师轮换约束
   * 
   * Args:
   *   variable: 排课变量
   *   timeSlot: 时间段
   *   state: 排课状态
   * 
   * Returns:
   *   ConstraintViolation | null: 如果违反轮换约束返回违规信息
   */
  private checkTeacherRotationConstraint(
    variable: ScheduleVariable,
    timeSlot: TimeSlot,
    state: ScheduleState
  ): ConstraintViolation | null {
    if (!this.rules.teacherConstraints.rotationStrategy.enableRotation) {
      return null;
    }

    const teacherKey = variable.teacherId.toString();
    const rotationState = this.teacherRotationStates.get(teacherKey);
    
    if (!rotationState) {
      return null;
    }

    const classKey = variable.classId.toString();
    const { roundCompletion, minIntervalBetweenClasses } = this.rules.teacherConstraints.rotationStrategy;

    // 检查是否要求完成一轮后再下一轮
    if (roundCompletion) {
      const isCurrentRoundComplete = this.isCurrentRoundComplete(rotationState, classKey);
      if (!isCurrentRoundComplete) {
        return {
          constraintType: ConstraintType.SOFT_TEACHER_ROTATION,
          isHard: false,
          penalty: 200,
          variables: [variable.id],
          message: `教师轮换策略要求完成当前轮次后再安排下一轮，班级${classKey}当前轮次未完成`,
          suggestion: '建议先完成当前轮次的其他班级安排'
        };
      }
    }

    // 检查同一班级间最小间隔
    if (minIntervalBetweenClasses > 0) {
      const lastAssignment = this.findLastAssignmentForClass(variable.teacherId, variable.classId, state);
      if (lastAssignment) {
        const interval = this.calculateTimeInterval(lastAssignment.timeSlot, timeSlot);
        if (interval < minIntervalBetweenClasses) {
          return {
            constraintType: ConstraintType.SOFT_TEACHER_ROTATION,
            isHard: false,
            penalty: 150,
            variables: [variable.id],
            message: `同一班级间最小间隔不足，需要至少${minIntervalBetweenClasses}节间隔`,
            suggestion: '建议增加时间间隔'
          };
        }
      }
    }

    return null;
  }

  /**
   * 检查当前轮次是否完成
   */
  private isCurrentRoundComplete(rotationState: TeacherRotationState, classKey: string): boolean {
    const currentRound = rotationState.currentRound;
    
    for (const [classId, round] of rotationState.rotationProgress) {
      if (round < currentRound) {
        return false;
      }
    }
    
    return true;
  }

  /**
   * 查找班级的最后一次安排
   */
  private findLastAssignmentForClass(
    teacherId: mongoose.Types.ObjectId,
    classId: mongoose.Types.ObjectId,
    state: ScheduleState
  ): CourseAssignment | null {
    let lastAssignment: CourseAssignment | null = null;
    
    for (const assignment of state.assignments.values()) {
      if (assignment.teacherId.equals(teacherId) && assignment.classId.equals(classId)) {
        if (!lastAssignment || this.isTimeSlotLater(assignment.timeSlot, lastAssignment.timeSlot)) {
          lastAssignment = assignment;
        }
      }
    }
    
    return lastAssignment;
  }

  /**
   * 计算两个时间段的间隔
   */
  private calculateTimeInterval(slot1: TimeSlot, slot2: TimeSlot): number {
    if (slot1.dayOfWeek === slot2.dayOfWeek) {
      return Math.abs(slot1.period - slot2.period);
    }
    
    // 跨天的情况，简单计算
    const dayDiff = Math.abs(slot1.dayOfWeek - slot2.dayOfWeek);
    return dayDiff * 8 + Math.abs(slot1.period - slot2.period); // 假设每天8节课
  }

  /**
   * 判断时间段1是否晚于时间段2
   */
  private isTimeSlotLater(slot1: TimeSlot, slot2: TimeSlot): boolean {
    if (slot1.dayOfWeek !== slot2.dayOfWeek) {
      return slot1.dayOfWeek > slot2.dayOfWeek;
    }
    return slot1.period > slot2.period;
  }

  /**
   * 更新教师轮换状态
   */
  private updateTeacherRotationState(
    variable: ScheduleVariable,
    assignment: CourseAssignment
  ): void {
    const teacherKey = variable.teacherId.toString();
    const rotationState = this.teacherRotationStates.get(teacherKey);
    
    if (!rotationState) return;

    const classKey = variable.classId.toString();
    const currentProgress = rotationState.rotationProgress.get(classKey) || 0;
    
    // 更新轮换进度
    rotationState.rotationProgress.set(classKey, currentProgress + 1);
    rotationState.lastAssignedClass = classKey;
    
    // 检查是否需要进入下一轮
    if (this.shouldAdvanceToNextRound(rotationState)) {
      rotationState.currentRound++;
      this.resetRoundCompletionStatus(rotationState);
    }
  }

  /**
   * 判断是否应该进入下一轮
   */
  private shouldAdvanceToNextRound(rotationState: TeacherRotationState): boolean {
    const currentRound = rotationState.currentRound;
    
    for (const progress of rotationState.rotationProgress.values()) {
      if (progress < currentRound) {
        return false;
      }
    }
    
    return true;
  }

  /**
   * 重置轮次完成状态
   */
  private resetRoundCompletionStatus(rotationState: TeacherRotationState): void {
    for (const classId of rotationState.classRotationOrder) {
      rotationState.roundCompletionStatus.set(classId, false);
    }
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
      
      // 初始化教师轮换状态
      this.initializeTeacherRotation(variables);

      // 报告轮换状态初始化结果
      this.reportProgress('轮换初始化', 5, '教师轮换状态初始化完成', 0, variables.length, true);

      // 预处理：约束传播
      this.reportProgress('预处理', 10, '正在进行约束传播...', 0, variables.length);
      this.propagateConstraints(state, variables);

      // 报告轮换约束预筛选结果
      this.reportProgress('轮换约束检查', 15, '轮换约束预筛选完成', 0, variables.length, true);

      // 主要求解阶段
      this.reportProgress('求解', 20, '正在执行回溯算法...', 0, variables.length);
      const solved = await this.backtrackSearch(state, variables);

      // 局部优化阶段
      if (solved && this.config.enableLocalOptimization) {
        this.reportProgress('优化', 80, '正在进行局部优化...', state.assignments.size, variables.length);
        await this.localOptimization(state, variables);
        
        // 报告轮换优化效果
        this.reportProgress('轮换优化', 85, '轮换优化完成', state.assignments.size, variables.length, true);
      }

      const endTime = Date.now();
      const executionTime = endTime - startTime;

      this.reportProgress('完成', 100, '排课算法执行完成', state.assignments.size, variables.length, true);

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

      // 定期报告轮换进度（每10次迭代报告一次）
      if (iterations % 10 === 0) {
        const progress = Math.min(80, 20 + (iterations / maxIterations) * 60);
        this.reportProgress('轮换搜索', progress, `正在进行轮换搜索，已迭代${iterations}次`, state.assignments.size, variables.length, true);
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
          this.undoAssignment(assignment, state, variables);
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

    // 使用增强的MRV启发式策略
    let bestVar = unassignedVars[0];
    let bestScore = this.calculateVariableScore(bestVar, state);

    for (const variable of unassignedVars) {
      const currentScore = this.calculateVariableScore(variable, state);
      
      // 分数越低优先级越高（MRV原则）
      if (currentScore < bestScore) {
        bestVar = variable;
        bestScore = currentScore;
      }
    }

    return bestVar.id;
  }

  /**
   * 计算变量评分（增强的MRV启发式）
   * 
   * Args:
   *   variable: 排课变量
   *   state: 当前状态
   * 
   * Returns:
   *   number: 评分（越低优先级越高）
   */
  private calculateVariableScore(variable: ScheduleVariable, state: ScheduleState): number {
    let score = 0;
    
    // 1. 域大小权重 (40%) - 剩余可用时间槽数量
    const domainSize = variable.domain.length;
    score += domainSize * 0.4;
    
    // 2. 优先级权重 (25%) - 核心课程优先
    const priorityScore = this.getPriorityScore(variable);
    score += priorityScore * 0.25;
    
    // 3. 约束度权重 (20%) - 与其他变量的冲突程度
    const constraintDegree = this.getConstraintDegree(variable, state);
    score += constraintDegree * 0.20;
    
    // 4. 时间紧迫性权重 (15%) - 特殊时间要求
    const timeUrgency = this.getTimeUrgency(variable);
    score += timeUrgency * 0.15;
    
    return score;
  }

  /**
   * 获取优先级评分
   */
  private getPriorityScore(variable: ScheduleVariable): number {
    // 核心课程优先级最高
    if (this.isCoreSubject(variable)) {
      return 0; // 最低分数，最高优先级
    }
    
    // 根据优先级等级计算
    if (variable.priority >= 8) return 0;      // 核心课程
    if (variable.priority >= 6) return 20;     // 重要课程
    if (variable.priority >= 4) return 40;     // 一般课程
    if (variable.priority >= 2) return 60;     // 选修课程
    return 80;                                 // 活动课程
  }

  /**
   * 获取约束度评分
   */
  private getConstraintDegree(variable: ScheduleVariable, state: ScheduleState): number {
    let degree = 0;
    
    // 检查教师约束
    if (variable.teacherId) {
      degree += this.getTeacherConstraintDegree(variable.teacherId, state);
    }
    
    // 检查教室约束
    if (variable.roomRequirements) {
      degree += this.getRoomConstraintDegree(variable.roomRequirements);
    }
    
    // 检查时间约束
    if (variable.timePreferences || variable.timeAvoidance) {
      degree += this.getTimeConstraintDegree(variable);
    }
    
    // 检查连排约束
    if (variable.continuous) {
      degree += 30; // 连排课程约束度较高
    }
    
    return degree;
  }

  /**
   * 获取教师约束度
   */
  private getTeacherConstraintDegree(teacherId: mongoose.Types.ObjectId, state: ScheduleState): number {
    // 检查教师在其他班级的课程安排
    let degree = 0;
    
    for (const [_, assignment] of state.assignments) {
      if (assignment.teacherId?.equals(teacherId)) {
        degree += 10; // 每个已安排的课程增加约束度
      }
    }
    
    return degree;
  }

  /**
   * 获取教室约束度
   */
  private getRoomConstraintDegree(requirements: any): number {
    // 根据教室要求的严格程度计算约束度
    let degree = 0;
    
    if (requirements.specialized) degree += 20;  // 专业教室
    if (requirements.capacity) degree += 15;     // 容量要求
    if (requirements.equipment) degree += 25;    // 设备要求
    
    return degree;
  }

  /**
   * 获取时间约束度
   */
  private getTimeConstraintDegree(variable: ScheduleVariable): number {
    let degree = 0;
    
    // 时间偏好约束
    if (variable.timePreferences && variable.timePreferences.length > 0) {
      degree += variable.timePreferences.length * 5;
    }
    
    // 时间避免约束
    if (variable.timeAvoidance && variable.timeAvoidance.length > 0) {
      degree += variable.timeAvoidance.length * 8; // 避免约束比偏好约束更严格
    }
    
    return degree;
  }

  /**
   * 获取时间紧迫性评分
   */
  private getTimeUrgency(variable: ScheduleVariable): number {
    let urgency = 0;
    
    // 检查是否有特定的时间要求
    if (variable.timePreferences && variable.timePreferences.length > 0) {
      urgency += 20;
    }
    
    // 检查是否有时间避免要求
    if (variable.timeAvoidance && variable.timeAvoidance.length > 0) {
      urgency += 25;
    }
    
    // 检查是否有连续课程要求
    if (variable.continuous) {
      urgency += 30;
    }
    
    // 检查是否有特定的教师轮换要求
    if (variable.teacherId) {
      urgency += 15;
    }
    
    return urgency;
  }

  /**
   * 对值进行排序（增强的最少约束值启发式）
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

    // 按照综合评分排序（冲突、偏好、轮换约束等）
    values.sort((a, b) => {
      // 1. 冲突程度（最少冲突优先）
      const conflictsA = this.countPotentialConflicts(variable, a, state);
      const conflictsB = this.countPotentialConflicts(variable, b, state);
      
      if (conflictsA !== conflictsB) {
        return conflictsA - conflictsB;
      }

      // 2. 教师轮换约束评分（轮换友好优先）
      const rotationScoreA = this.getTeacherRotationScore(variable, a, state);
      const rotationScoreB = this.getTeacherRotationScore(variable, b, state);
      
      if (rotationScoreA !== rotationScoreB) {
        return rotationScoreB - rotationScoreA; // 轮换分数高的优先
      }

      // 3. 时间偏好（偏好时间优先）
      const preferenceA = this.getTimeSlotPreference(variable, a);
      const preferenceB = this.getTimeSlotPreference(variable, b);
      
      if (preferenceA !== preferenceB) {
        return preferenceB - preferenceA; // 偏好值高的优先
      }

      // 4. 核心课程黄金时段保护
      if (this.isCoreSubject(variable)) {
        const goldenTimeA = this.isGoldenTimeSlot(a);
        const goldenTimeB = this.isGoldenTimeSlot(b);
        
        if (goldenTimeA !== goldenTimeB) {
          return goldenTimeB ? 1 : -1; // 核心课程优先选择黄金时段
        }
      }

      // 5. 科目类型时间适配性
      const subjectAdaptationA = this.getSubjectTimeAdaptation(variable, a);
      const subjectAdaptationB = this.getSubjectTimeAdaptation(variable, b);
      
      if (subjectAdaptationA !== subjectAdaptationB) {
        return subjectAdaptationB - subjectAdaptationA;
      }

      return 0; // 其他条件相同时保持原有顺序
    });

    return values;
  }

  /**
   * 判断是否为黄金时段
   */
  private isGoldenTimeSlot(timeSlot: TimeSlot): boolean {
    return (timeSlot.period >= 1 && timeSlot.period <= 4) || // 上午1-4节
           (timeSlot.period >= 5 && timeSlot.period <= 6);   // 下午5-6节
  }

  /**
   * 获取科目时间适配性评分
   */
  private getSubjectTimeAdaptation(variable: ScheduleVariable, timeSlot: TimeSlot): number {
    const courseName = this.getCourseNameSync(variable.courseId);
    
    // 体育课时间适配性
    if (courseName === '体育') {
      return this.getPhysicalEducationTimeAdaptation(timeSlot);
    }
    
    // 艺术课时间适配性
    if (['音乐', '美术'].includes(courseName)) {
      return this.getArtSubjectTimeAdaptation(timeSlot);
    }
    
    // 实验课时间适配性
    if (['物理', '化学', '生物'].includes(courseName)) {
      return this.getLabSubjectTimeAdaptation(timeSlot);
    }
    
    // 核心课程时间适配性
    if (this.isCoreSubject(variable)) {
      return this.getCoreSubjectTimeAdaptation(timeSlot);
    }
    
    return 0;
  }

  /**
   * 体育课时间适配性
   */
  private getPhysicalEducationTimeAdaptation(timeSlot: TimeSlot): number {
    let score = 0;
    
    // 最佳时段：上午3-4节，下午5-6节
    if ((timeSlot.period >= 3 && timeSlot.period <= 4) || 
        (timeSlot.period >= 5 && timeSlot.period <= 6)) {
      score += 100;
    }
    
    // 次佳时段：上午2节，下午7节
    if (timeSlot.period === 2 || timeSlot.period === 7) {
      score += 70;
    }
    
    // 避免时段：第一节和最后一节
    if (timeSlot.period === 1 || timeSlot.period === 8) {
      score -= 80;
    }
    
    return score;
  }

  /**
   * 艺术课时间适配性
   */
  private getArtSubjectTimeAdaptation(timeSlot: TimeSlot): number {
    let score = 0;
    
    // 上午3-4节（学生精力充沛，适合创造性活动）
    if (timeSlot.period >= 3 && timeSlot.period <= 4) {
      score += 80;
    }
    
    // 下午5-6节（下午适合艺术创作）
    if (timeSlot.period >= 5 && timeSlot.period <= 6) {
      score += 70;
    }
    
    // 避免第一节和最后一节
    if (timeSlot.period === 1 || timeSlot.period === 8) {
      score -= 40;
    }
    
    return score;
  }

  /**
   * 实验课时间适配性
   */
  private getLabSubjectTimeAdaptation(timeSlot: TimeSlot): number {
    let score = 0;
    
    // 上午2-4节（学生注意力集中，适合技术学习）
    if (timeSlot.period >= 2 && timeSlot.period <= 4) {
      score += 90;
    }
    
    // 下午5节（下午适合实践操作）
    if (timeSlot.period === 5) {
      score += 60;
    }
    
    // 避免第一节和最后一节
    if (timeSlot.period === 1 || timeSlot.period === 8) {
      score -= 50;
    }
    
    return score;
  }

  /**
   * 核心课程时间适配性
   */
  private getCoreSubjectTimeAdaptation(timeSlot: TimeSlot): number {
    let score = 0;
    
    // 上午黄金时段 (1-4节)
    if (timeSlot.period >= 1 && timeSlot.period <= 4) {
      score += 100;
      
      // 第一节和第二节为最佳时段
      if (timeSlot.period === 1 || timeSlot.period === 2) {
        score += 50;
      }
    }
    
    // 下午黄金时段 (5-6节)
    if (timeSlot.period >= 5 && timeSlot.period <= 6) {
      score += 80;
      
      // 第五节为下午最佳时段
      if (timeSlot.period === 5) {
        score += 30;
      }
    }
    
    // 避免下午7-8节
    if (timeSlot.period >= 7) {
      score -= 40;
    }
    
    return score;
  }

  /**
   * 计算教师轮换约束的评分
   * 
   * Args:
   *   variable: 排课变量
   *   timeSlot: 时间段
   *   state: 当前状态
   * 
   * Returns:
   *   number: 轮换约束评分（越高越好）
   */
  private getTeacherRotationScore(variable: ScheduleVariable, timeSlot: TimeSlot, state: ScheduleState): number {
    const teacherKey = variable.teacherId.toString();
    const rotationState = this.teacherRotationStates.get(teacherKey);
    
    if (!rotationState || !this.rules.teacherConstraints.rotationStrategy.enableRotation) {
      return 0; // 未启用轮换
    }

    let score = 0;
    const classKey = variable.classId.toString();
    
    // 检查是否有助于完成当前轮次
    const currentProgress = rotationState.rotationProgress.get(classKey) || 0;
    const targetProgress = rotationState.currentRound;
    
    if (currentProgress < targetProgress) {
      score += 100; // 有助于完成当前轮次
    }
    
    // 检查是否有助于平衡轮换
    const allProgress = Array.from(rotationState.rotationProgress.values());
    const minProgress = Math.min(...allProgress, 0);
    const maxProgress = Math.max(...allProgress, 0);
    const progressGap = maxProgress - minProgress;
    
    if (progressGap > 1) {
      // 如果进度差距较大，优先选择进度较低的班级
      if (currentProgress <= minProgress) {
        score += 50; // 优先选择进度最低的班级
      }
    }
    
    // 检查时间间隔约束
    const lastAssignment = this.findLastAssignmentForClass(variable.teacherId, variable.classId, state);
    if (lastAssignment) {
      const interval = this.calculateTimeInterval(lastAssignment.timeSlot, timeSlot);
      const minInterval = this.rules.teacherConstraints.rotationStrategy.minIntervalBetweenClasses;
      
      if (interval >= minInterval) {
        score += 30; // 满足最小间隔要求
      } else {
        score -= 50; // 违反最小间隔要求
      }
    }
    
    return score;
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
    if (conflicts.length > 0) {
      return false;
    }

    // 检查禁用时间段约束（硬约束）
    const forbiddenViolation = this.constraintDetector.checkForbiddenTimeSlot(tempAssignment);
    if (forbiddenViolation && forbiddenViolation.isHard) {
      return false;
    }

    // 暂时注释掉核心课程分布约束检查，以诊断问题
    /*
    // 检查核心课程分布约束（硬约束）
    const coreSubjectViolations = this.constraintDetector.checkCoreSubjectDistributionConstraints(
      tempAssignment,
      state.assignments
    );
    const hardCoreSubjectViolations = coreSubjectViolations.filter(v => v.isHard);
    if (hardCoreSubjectViolations.length > 0) {
      return false; // 硬核心课程约束违反
    }
    */

    // 检查教师轮换约束（软约束）
    const rotationViolation = this.checkTeacherRotationConstraint(variable, timeSlot, state);
    if (rotationViolation && rotationViolation.isHard) {
      return false; // 硬轮换约束违反
    }

    // 检查科目特定约束（软约束）
    const subjectViolations = this.constraintDetector.checkSubjectSpecificConstraints(tempAssignment, state.assignments);
    const hardSubjectViolations = subjectViolations.filter(v => v.isHard);
    if (hardSubjectViolations.length > 0) {
      return false; // 硬科目约束违反
    }

    return true;
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

    // 更新教师轮换状态
    this.updateTeacherRotationState(variable, assignment);

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
   *   variables: 排课变量列表（用于查找变量信息）
   */
  private undoAssignment(assignment: CourseAssignment, state: ScheduleState, variables: ScheduleVariable[]): void {
    state.assignments.delete(assignment.variableId);
    state.unassigned.push(assignment.variableId);

    // 回滚教师轮换状态
    this.rollbackTeacherRotationState(assignment, variables);
  }

  /**
   * 回滚教师轮换状态
   * 
   * Args:
   *   assignment: 要撤销的分配
   *   variables: 排课变量列表
   */
  private rollbackTeacherRotationState(assignment: CourseAssignment, variables: ScheduleVariable[]): void {
    // 查找对应的变量
    const variable = variables.find(v => v.id === assignment.variableId);
    if (!variable) return;

    const teacherKey = variable.teacherId.toString();
    const rotationState = this.teacherRotationStates.get(teacherKey);
    if (!rotationState) return;

    const classKey = variable.classId.toString();
    const currentProgress = rotationState.rotationProgress.get(classKey) || 0;
    
    // 回滚轮换进度
    if (currentProgress > 0) {
      rotationState.rotationProgress.set(classKey, currentProgress - 1);
    }

    // 如果回滚后当前轮次不完整，可能需要回退到上一轮
    if (this.shouldRollbackToPreviousRound(rotationState)) {
      rotationState.currentRound = Math.max(1, rotationState.currentRound - 1);
      this.resetRoundCompletionStatus(rotationState);
    }
  }

  /**
   * 判断是否应该回退到上一轮
   * 
   * Args:
   *   rotationState: 轮换状态
   * 
   * Returns:
   *   boolean: 是否应该回退
   */
  private shouldRollbackToPreviousRound(rotationState: TeacherRotationState): boolean {
    const currentRound = rotationState.currentRound;
    
    for (const progress of rotationState.rotationProgress.values()) {
      if (progress >= currentRound) {
        return false;
      }
    }
    
    return true;
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
   * 获取时间段偏好评分
   * 
   * Args:
   *   variable: 排课变量
   *   timeSlot: 时间段
   * 
   * Returns:
   *   number: 偏好评分（越高越好）
   */
  private getTimeSlotPreference(variable: ScheduleVariable, timeSlot: TimeSlot): number {
    let score = 0;

    // 1. 基础时间偏好 (25%)
    score += this.getBasicTimePreference(variable, timeSlot) * 0.25;
    
    // 2. 核心课程黄金时段奖励 (30%)
    score += this.getCoreSubjectGoldenTimeBonus(variable, timeSlot) * 0.30;
    
    // 3. 科目类型时间偏好 (25%)
    score += this.getSubjectTypeTimePreference(variable, timeSlot) * 0.25;
    
    // 4. 连排课程偏好 (20%)
    score += this.getContinuousCoursePreference(variable, timeSlot) * 0.20;

    return score;
  }

  /**
   * 获取基础时间偏好评分
   */
  private getBasicTimePreference(variable: ScheduleVariable, timeSlot: TimeSlot): number {
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
   * 获取核心课程黄金时段奖励
   */
  private getCoreSubjectGoldenTimeBonus(variable: ScheduleVariable, timeSlot: TimeSlot): number {
    // 检查是否为核心课程
    const isCoreSubject = this.isCoreSubject(variable);
    if (!isCoreSubject) return 0;
    
    let bonus = 0;
    
    // 上午黄金时段 (1-4节)
    if (timeSlot.period >= 1 && timeSlot.period <= 4) {
      bonus += 100; // 上午核心课程基础奖励
      
      // 第一节和第二节为最佳时段
      if (timeSlot.period === 1 || timeSlot.period === 2) {
        bonus += 50;
      }
      
      // 避免第四节（接近午餐时间）
      if (timeSlot.period === 4) {
        bonus -= 20;
      }
    }
    
    // 下午黄金时段 (5-6节)
    if (timeSlot.period >= 5 && timeSlot.period <= 6) {
      bonus += 80; // 下午核心课程基础奖励
      
      // 第五节为下午最佳时段
      if (timeSlot.period === 5) {
        bonus += 30;
      }
      
      // 避免第六节（接近放学时间）
      if (timeSlot.period === 6) {
        bonus -= 15;
      }
    }
    
    // 避免下午7-8节（学生注意力下降）
    if (timeSlot.period >= 7) {
      bonus -= 40;
    }
    
    return bonus;
  }

  /**
   * 判断是否为核心课程
   */
  private isCoreSubject(variable: ScheduleVariable): boolean {
    // 通过优先级判断
    if (variable.priority >= 8) return true;
    
    // 通过课程名称判断
    const courseName = this.getCourseNameSync(variable.courseId);
    const coreSubjects = ['语文', '数学', '英语', '物理', '化学', '生物'];
    return coreSubjects.includes(courseName);
  }

  /**
   * 获取科目类型时间偏好
   */
  private getSubjectTypeTimePreference(variable: ScheduleVariable, timeSlot: TimeSlot): number {
    const courseName = this.getCourseNameSync(variable.courseId);
    
    // 1. 体育课时间偏好
    if (courseName === '体育') {
      return this.getPhysicalEducationTimePreference(variable, timeSlot);
    }
    
    // 2. 艺术类课程时间偏好
    if (['音乐', '美术'].includes(courseName)) {
      return this.getArtSubjectTimePreference(timeSlot);
    }
    
    // 3. 信息技术类课程时间偏好
    if (['信息技术', '通用技术'].includes(courseName)) {
      return this.getTechSubjectTimePreference(timeSlot);
    }
    
    // 4. 心理健康、班会等
    if (['心理健康', '班会'].includes(courseName)) {
      return this.getLifeSkillSubjectTimePreference(timeSlot);
    }
    
    return 0;
  }

  /**
   * 体育课程时间偏好
   */
  private getPhysicalEducationTimePreference(variable: ScheduleVariable, timeSlot: TimeSlot): number {
    let score = 0;
    
    // 1. 最佳时段：上午3-4节，下午5-6节
    if ((timeSlot.period >= 3 && timeSlot.period <= 4) || 
        (timeSlot.period >= 5 && timeSlot.period <= 6)) {
      score += 100;
    }
    
    // 2. 次佳时段：上午2节，下午7节
    if (timeSlot.period === 2 || timeSlot.period === 7) {
      score += 70;
    }
    
    // 3. 避免时段
    if (timeSlot.period === 1) {
      score -= 80; // 第一节：学生刚到校，不适合剧烈运动
    }
    
    if (timeSlot.period === 8) {
      score -= 90; // 最后一节：学生疲劳，不适合运动
    }
    
    // 4. 天气和时间考虑
    score += this.getWeatherTimeConsideration(timeSlot);
    
    // 5. 连排体育课考虑
    if (variable.continuous && variable.continuousHours === 2) {
      score += this.getContinuousPEScore(timeSlot);
    }
    
    return score;
  }

  /**
   * 天气和时间考虑
   */
  private getWeatherTimeConsideration(timeSlot: TimeSlot): number {
    let score = 0;
    
    // 上午体育课（天气较好，温度适宜）
    if (timeSlot.period <= 4) {
      score += 20;
    }
    
    // 下午体育课（温度较高，但学生精力充沛）
    if (timeSlot.period >= 5 && timeSlot.period <= 6) {
      score += 15;
    }
    
    // 避免下午7-8节（温度高，学生疲劳）
    if (timeSlot.period >= 7) {
      score -= 30;
    }
    
    return score;
  }

  /**
   * 连排体育课评分
   */
  private getContinuousPEScore(timeSlot: TimeSlot): number {
    let score = 0;
    
    // 连排体育课最佳时段：上午3-4节，下午5-6节
    if ((timeSlot.period >= 3 && timeSlot.period <= 4) || 
        (timeSlot.period >= 5 && timeSlot.period <= 6)) {
      score += 50;
    }
    
    // 避免连排在第一节或最后一节
    if (timeSlot.period === 1 || timeSlot.period === 8) {
      score -= 60;
    }
    
    return score;
  }

  /**
   * 艺术类课程时间偏好
   */
  private getArtSubjectTimePreference(timeSlot: TimeSlot): number {
    let score = 0;
    
    // 上午3-4节（学生精力充沛，适合创造性活动）
    if (timeSlot.period >= 3 && timeSlot.period <= 4) {
      score += 80;
    }
    
    // 下午5-6节（下午适合艺术创作）
    if (timeSlot.period >= 5 && timeSlot.period <= 6) {
      score += 70;
    }
    
    // 避免第一节（学生刚到校，状态不佳）
    if (timeSlot.period === 1) {
      score -= 30;
    }
    
    // 避免最后一节（学生注意力不集中）
    if (timeSlot.period === 8) {
      score -= 40;
    }
    
    return score;
  }

  /**
   * 信息技术类课程时间偏好
   */
  private getTechSubjectTimePreference(timeSlot: TimeSlot): number {
    let score = 0;
    
    // 上午2-4节（学生注意力集中，适合技术学习）
    if (timeSlot.period >= 2 && timeSlot.period <= 4) {
      score += 90;
    }
    
    // 下午5节（下午适合实践操作）
    if (timeSlot.period === 5) {
      score += 60;
    }
    
    // 避免第一节（设备启动需要时间）
    if (timeSlot.period === 1) {
      score -= 50;
    }
    
    // 避免下午7-8节（学生疲劳，不适合技术操作）
    if (timeSlot.period >= 7) {
      score -= 60;
    }
    
    return score;
  }

  /**
   * 生活技能类课程时间偏好
   */
  private getLifeSkillSubjectTimePreference(timeSlot: TimeSlot): number {
    let score = 0;
    
    // 上午2-3节（学生注意力集中，适合学习）
    if (timeSlot.period >= 2 && timeSlot.period <= 3) {
      score += 70;
    }
    
    // 下午5节（下午适合讨论和互动）
    if (timeSlot.period === 5) {
      score += 60;
    }
    
    // 避免第一节和最后一节
    if (timeSlot.period === 1 || timeSlot.period === 8) {
      score -= 30;
    }
    
    return score;
  }

  /**
   * 获取连排课程偏好
   */
  private getContinuousCoursePreference(variable: ScheduleVariable, timeSlot: TimeSlot): number {
    if (!variable.continuous) return 0;
    
    let score = 0;
    
    // 连排课程最佳时段：上午2-4节，下午5-6节
    if ((timeSlot.period >= 2 && timeSlot.period <= 4) || 
        (timeSlot.period >= 5 && timeSlot.period <= 6)) {
      score += 60;
    }
    
    // 避免连排在第一节或最后一节
    if (timeSlot.period === 1 || timeSlot.period === 8) {
      score -= 40;
    }
    
    return score;
  }

  /**
   * 获取课程名称
   */
  private async getCourseName(courseId: mongoose.Types.ObjectId): Promise<string> {
    try {
      // 从数据库获取课程信息
      const Course = mongoose.model('Course');
      const course = await Course.findById(courseId).select('name').lean();
      const courseName = (course as any)?.name || '未知课程';
      
      // 缓存课程名称
      this.courseNameCache.set(courseId.toString(), courseName);
      
      return courseName;
    } catch (error) {
      console.warn(`获取课程名称失败 (ID: ${courseId}):`, error);
      return '未知课程';
    }
  }

  /**
   * 同步版本的课程名称获取（用于性能关键场景）
   */
  private getCourseNameSync(courseId: mongoose.Types.ObjectId): string {
    // 如果课程名称缓存存在，直接返回
    if (this.courseNameCache && this.courseNameCache.has(courseId.toString())) {
      return this.courseNameCache.get(courseId.toString())!;
    }
    return '未知课程';
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
              // 找到改进，保持新分配并更新轮换状态
              improved = true;
              
              // 更新教师轮换状态（因为时间段发生了变化）
              this.updateTeacherRotationState(variable, assignment);
              
              break;
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

    // 教师轮换约束评分
    const rotationScore = this.getTeacherRotationScore(variable, assignment.timeSlot, state);
    score += rotationScore;

    // 科目特定约束评分
    const subjectViolations = this.constraintDetector.checkSubjectSpecificConstraints(assignment, state.assignments);
    for (const violation of subjectViolations) {
      if (violation.isHard) {
        score -= 1000; // 硬约束违反严重惩罚
      } else {
        score -= violation.penalty; // 软约束违反
      }
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
   * 计算轮换进度数据
   * 
   * Args:
   *   teacherId: 教师ID
   * 
   * Returns:
   *   RotationProgressData: 轮换进度数据
   */
  private calculateRotationProgress(teacherId: mongoose.Types.ObjectId): RotationProgressData {
    const rotationState = this.teacherRotationStates.get(teacherId.toString());
    if (!rotationState) {
      return {
        teacherId,
        currentRound: 0,
        totalRounds: 0,
        roundProgress: 0,
        overallProgress: 0,
        classRotationOrder: [],
        completedClasses: [],
        pendingClasses: [],
        lastAssignedClass: '',
        constraintViolations: 0,
        rotationScore: 0,
        suggestions: []
      };
    }

    const totalClasses = rotationState.classRotationOrder.length;
    const completedClasses = Array.from(rotationState.roundCompletionStatus.entries())
      .filter(([_, isCompleted]) => isCompleted)
      .map(([classKey, _]) => classKey);
    
    const pendingClasses = rotationState.classRotationOrder.filter(
      classKey => !completedClasses.includes(classKey)
    );

    const roundProgress = totalClasses > 0 ? (completedClasses.length / totalClasses) * 100 : 0;
    const overallProgress = totalClasses > 0 ? 
      ((rotationState.currentRound - 1) * 100 + roundProgress) / 
      (this.rules.teacherConstraints.rotationStrategy.rotationMode === 'round_robin' ? 3 : 1) : 0;

    // 计算轮换评分
    const rotationScore = this.calculateRotationScore(rotationState);

    // 生成优化建议
    const suggestions = this.generateRotationSuggestions(rotationState);

    return {
      teacherId,
      currentRound: rotationState.currentRound,
      totalRounds: this.rules.teacherConstraints.rotationStrategy.rotationMode === 'round_robin' ? 3 : 1,
      roundProgress: Math.round(roundProgress),
      overallProgress: Math.round(overallProgress),
      classRotationOrder: rotationState.classRotationOrder,
      completedClasses,
      pendingClasses,
      lastAssignedClass: rotationState.lastAssignedClass,
      constraintViolations: this.countRotationViolations(teacherId),
      rotationScore,
      suggestions
    };
  }

  /**
   * 计算轮换策略评分
   * 
   * Args:
   *   rotationState: 轮换状态
   * 
   * Returns:
   *   number: 轮换评分 (0-100)
   */
  private calculateRotationScore(rotationState: TeacherRotationState): number {
    let score = 100;
    
    // 检查轮换顺序的合理性
    if (rotationState.classRotationOrder.length > 1) {
      const hasGradeBasedOrder = this.rules.teacherConstraints.rotationStrategy.rotationOrder === 'grade_based';
      if (hasGradeBasedOrder) {
        // 年级顺序轮换加分
        score += 10;
      }
    }

    // 检查轮次推进的合理性
    if (rotationState.currentRound > 1) {
      const roundEfficiency = rotationState.classRotationOrder.length / rotationState.currentRound;
      if (roundEfficiency > 2) {
        score += 15; // 轮次效率高
      } else if (roundEfficiency < 1) {
        score -= 20; // 轮次效率低
      }
    }

    // 检查班级分布的均衡性
    const classDistribution = this.analyzeClassDistribution(rotationState);
    if (classDistribution.isBalanced) {
      score += 20;
    } else if (classDistribution.isUnbalanced) {
      score -= 15;
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * 分析班级分布均衡性
   * 
   * Args:
   *   rotationState: 轮换状态
   * 
   * Returns:
   *   {isBalanced: boolean, isUnbalanced: boolean}: 分布分析结果
   */
  private analyzeClassDistribution(rotationState: TeacherRotationState): {isBalanced: boolean, isUnbalanced: boolean} {
    const totalClasses = rotationState.classRotationOrder.length;
    if (totalClasses <= 1) {
      return { isBalanced: true, isUnbalanced: false };
    }

    // 计算班级间的间隔分布
    const intervals: number[] = [];
    for (let i = 1; i < totalClasses; i++) {
      const interval = this.calculateClassInterval(
        rotationState.classRotationOrder[i - 1],
        rotationState.classRotationOrder[i]
      );
      intervals.push(interval);
    }

    if (intervals.length === 0) {
      return { isBalanced: true, isUnbalanced: false };
    }

    const avgInterval = intervals.reduce((sum, val) => sum + val, 0) / intervals.length;
    const variance = intervals.reduce((sum, val) => sum + Math.pow(val - avgInterval, 2), 0) / intervals.length;
    const stdDev = Math.sqrt(variance);

    // 标准差小于平均值的30%认为是均衡的
    const isBalanced = stdDev < avgInterval * 0.3;
    const isUnbalanced = stdDev > avgInterval * 0.7;

    return { isBalanced, isUnbalanced };
  }

  /**
   * 计算班级间间隔
   * 
   * Args:
   *   class1: 班级1标识
   *   class2: 班级2标识
   * 
   * Returns:
   *   number: 间隔值
   */
  private calculateClassInterval(class1: string, class2: string): number {
    // 简单的班级间隔计算，基于班级标识的排序
    // 这里可以根据实际的班级命名规则进行优化
    const class1Num = parseInt(class1.replace(/\D/g, '')) || 0;
    const class2Num = parseInt(class2.replace(/\D/g, '')) || 0;
    return Math.abs(class2Num - class1Num);
  }

  /**
   * 统计轮换约束违反次数
   * 
   * Args:
   *   teacherId: 教师ID
   * 
   * Returns:
   *   number: 违反次数
   */
  private countRotationViolations(teacherId: mongoose.Types.ObjectId): number {
    const rotationState = this.teacherRotationStates.get(teacherId.toString());
    if (!rotationState) {
      return 0;
    }

    let violations = 0;

    // 检查轮换间隔约束
    if (this.rules.teacherConstraints.rotationStrategy.minIntervalBetweenClasses > 0) {
      // 这里可以添加具体的间隔检查逻辑
      // 目前返回基础违反次数
      violations += 0;
    }

    // 检查连续课程约束
    if (this.rules.teacherConstraints.rotationStrategy.maxConsecutiveClasses > 0) {
      // 这里可以添加具体的连续课程检查逻辑
      // 目前返回基础违反次数
      violations += 0;
    }

    // 检查轮换顺序约束
    if (rotationState.currentRound > 1) {
      const expectedOrder = rotationState.classRotationOrder;
      const actualOrder = this.getActualRotationOrder(teacherId);
      
      if (actualOrder.length > 0 && !this.isRotationOrderValid(expectedOrder, actualOrder)) {
        violations += 1;
      }
    }

    return violations;
  }

  /**
   * 获取实际的轮换顺序
   * 
   * Args:
   *   teacherId: 教师ID
   * 
   * Returns:
   *   string[]: 实际轮换顺序
   */
  private getActualRotationOrder(teacherId: mongoose.Types.ObjectId): string[] {
    // 这里需要根据实际的排课结果来获取轮换顺序
    // 目前返回空数组，后续可以扩展实现
    return [];
  }

  /**
   * 检查轮换顺序是否有效
   * 
   * Args:
   *   expectedOrder: 期望的轮换顺序
   *   actualOrder: 实际的轮换顺序
   * 
   * Returns:
   *   boolean: 顺序是否有效
   */
  private isRotationOrderValid(expectedOrder: string[], actualOrder: string[]): boolean {
    if (expectedOrder.length !== actualOrder.length) {
      return false;
    }

    // 检查顺序是否匹配
    for (let i = 0; i < expectedOrder.length; i++) {
      if (expectedOrder[i] !== actualOrder[i]) {
        return false;
      }
    }

    return true;
  }

  /**
   * 生成轮换优化建议
   * 
   * Args:
   *   rotationState: 轮换状态
   * 
   * Returns:
   *   string[]: 优化建议列表
   */
  private generateRotationSuggestions(rotationState: TeacherRotationState): string[] {
    const suggestions: string[] = [];

    // 检查轮次推进速度
    if (rotationState.currentRound > 1) {
      const roundEfficiency = rotationState.classRotationOrder.length / rotationState.currentRound;
      if (roundEfficiency < 1.5) {
        suggestions.push('建议加快轮次推进速度，减少单轮次内的班级数量');
      } else if (roundEfficiency > 3) {
        suggestions.push('轮次推进过快，建议适当放慢以确保轮换质量');
      }
    }

    // 检查班级分布
    const distribution = this.analyzeClassDistribution(rotationState);
    if (distribution.isUnbalanced) {
      suggestions.push('班级分布不够均衡，建议调整轮换顺序');
    } else if (distribution.isBalanced) {
      suggestions.push('班级分布均衡，轮换策略执行良好');
    }

    // 检查轮换策略
    if (this.rules.teacherConstraints.rotationStrategy.rotationOrder === 'alphabetical') {
      suggestions.push('当前使用字母顺序轮换，考虑使用年级顺序可能更合理');
    } else if (this.rules.teacherConstraints.rotationStrategy.rotationOrder === 'grade_based') {
      suggestions.push('年级顺序轮换策略合理，有助于教学连续性');
    }

    // 检查轮换模式
    if (this.rules.teacherConstraints.rotationStrategy.rotationMode === 'round_robin') {
      if (rotationState.currentRound > 2) {
        suggestions.push('轮询模式运行良好，轮换覆盖全面');
      }
    } else if (this.rules.teacherConstraints.rotationStrategy.rotationMode === 'balanced') {
      suggestions.push('平衡模式有助于工作量均衡分配');
    }

    // 检查间隔约束
    if (this.rules.teacherConstraints.rotationStrategy.minIntervalBetweenClasses > 0) {
      const currentInterval = this.calculateCurrentRotationInterval(rotationState);
      if (currentInterval < this.rules.teacherConstraints.rotationStrategy.minIntervalBetweenClasses) {
        suggestions.push(`当前轮换间隔${currentInterval}小于最小要求${this.rules.teacherConstraints.rotationStrategy.minIntervalBetweenClasses}，建议调整`);
      }
    }

    // 如果没有问题，提供正面反馈
    if (suggestions.length === 0) {
      suggestions.push('轮换策略执行良好，无需特别优化');
    }

    return suggestions;
  }

  /**
   * 计算当前轮换间隔
   * 
   * Args:
   *   rotationState: 轮换状态
   * 
   * Returns:
   *   number: 当前轮换间隔
   */
  private calculateCurrentRotationInterval(rotationState: TeacherRotationState): number {
    // 这里可以根据实际的排课结果计算轮换间隔
    // 目前返回一个默认值
    return 2; // 默认间隔为2个时间段
  }

  /**
   * 生成轮换状态摘要
   * 
   * Returns:
   *   RotationSummary: 轮换状态摘要
   */
  private generateRotationSummary(): RotationSummary {
    const teacherIds = Array.from(this.teacherRotationStates.keys());
    const totalTeachers = teacherIds.length;

    if (totalTeachers === 0) {
      return {
        totalTeachers: 0,
        averageRoundProgress: 0,
        teachersWithViolations: 0,
        overallRotationScore: 0,
        criticalIssues: [],
        optimizationOpportunities: []
      };
    }

    let totalProgress = 0;
    let teachersWithViolations = 0;
    let totalScore = 0;
    const criticalIssues: string[] = [];
    const optimizationOpportunities: string[] = [];

    for (const teacherId of teacherIds) {
      const progress = this.calculateRotationProgress(new mongoose.Types.ObjectId(teacherId));
      totalProgress += progress.overallProgress;
      totalScore += progress.rotationScore;

      if (progress.constraintViolations > 0) {
        teachersWithViolations++;
      }

      if (progress.overallProgress < 30) {
        criticalIssues.push(`教师${teacherId}轮换进度严重滞后`);
      }

      if (progress.rotationScore < 60) {
        optimizationOpportunities.push(`教师${teacherId}轮换策略需要优化`);
      }
    }

    const averageRoundProgress = totalProgress / totalTeachers;
    const overallRotationScore = totalScore / totalTeachers;

    return {
      totalTeachers,
      averageRoundProgress: Math.round(averageRoundProgress),
      teachersWithViolations,
      overallRotationScore: Math.round(overallRotationScore),
      criticalIssues,
      optimizationOpportunities
    };
  }

  /**
   * 报告轮换进度
   * 
   * Args:
   *   stage: 当前阶段
   *   percentage: 完成百分比
   *   message: 消息
   *   assignedCount: 已分配数量
   *   totalCount: 总数量
   *   includeRotationData: 是否包含轮换数据
   */
  private reportProgress(
    stage: string,
    percentage: number,
    message: string,
    assignedCount: number,
    totalCount: number,
    includeRotationData: boolean = false
  ): void {
    if (this.progressCallback) {
      const progressData: any = {
        stage,
        percentage,
        message,
        assignedCount,
        totalCount
      };

      if (includeRotationData) {
        const individualProgress = Array.from(this.teacherRotationStates.keys()).map(teacherId =>
          this.calculateRotationProgress(new mongoose.Types.ObjectId(teacherId))
        );
        
        progressData.rotationData = {
          individualProgress,
          summary: this.generateRotationSummary(),
          timestamp: Date.now()
        };
      }

      this.progressCallback(progressData);
    }
  }

  /**
   * 检测所有约束违反
   * 
   * Args:
   *   variable: 排课变量
   *   timeSlot: 时间段
   *   state: 当前排课状态
   * 
   * Returns:
   *   ConstraintViolation[]: 约束违反列表
   */
  private async checkAllConstraintViolations(
    variable: ScheduleVariable,
    timeSlot: TimeSlot,
    state: ScheduleState
  ): Promise<ConstraintViolation[]> {
    const violations: ConstraintViolation[] = [];

    // 创建临时分配用于检测
    const tempAssignment: CourseAssignment = {
      variableId: variable.id,
      classId: variable.classId,
      courseId: variable.courseId,
      teacherId: variable.teacherId,
      roomId: new mongoose.Types.ObjectId(), // 临时教室ID
      timeSlot: timeSlot,
      isFixed: false
    };

    // 1. 检测时间冲突
    const conflicts = this.constraintDetector.checkAllConflicts(tempAssignment, state.assignments);
    if (conflicts.length > 0) {
      // 冲突转换为约束违反
      for (const conflict of conflicts) {
        violations.push({
          constraintType: this.mapConflictToConstraintType(conflict.type),
          isHard: true,
          penalty: 1000,
          variables: [variable.id],
          message: conflict.message
        });
      }
    }

    // 2. 检测禁用时间段约束
    const forbiddenViolation = this.constraintDetector.checkForbiddenTimeSlot(tempAssignment);
    if (forbiddenViolation) {
      violations.push(forbiddenViolation);
    }

    // 3. 检测教师工作量约束
    const teacherViolations = this.constraintDetector.checkTeacherWorkloadConstraints(
      variable.teacherId,
      Array.from(state.assignments.values())
    );
    violations.push(...teacherViolations);

    // 4. 检测科目特定约束
    const subjectViolations = this.constraintDetector.checkSubjectSpecificConstraints(
      tempAssignment,
      state.assignments
    );
    violations.push(...subjectViolations);

    // 5. 检测核心课程分布约束
    const coreSubjectViolations = this.constraintDetector.checkCoreSubjectDistributionConstraints(
      tempAssignment,
      state.assignments
    );
    violations.push(...coreSubjectViolations);

    // 6. 检测教师轮换约束
    const rotationViolation = this.checkTeacherRotationConstraint(variable, timeSlot, state);
    if (rotationViolation) {
      violations.push(rotationViolation);
    }

    // 7. 检测时间偏好约束
    const preferenceViolation = this.constraintDetector.checkTimePreferenceConstraint(variable, tempAssignment);
    if (preferenceViolation) {
      violations.push(preferenceViolation);
    }

    return violations;
  }

  /**
   * 将冲突类型映射到约束类型
   */
  private mapConflictToConstraintType(conflictType: string): ConstraintType {
    switch (conflictType) {
      case 'teacher':
        return ConstraintType.HARD_TEACHER_CONFLICT;
      case 'class':
        return ConstraintType.HARD_CLASS_CONFLICT;
      case 'room':
        return ConstraintType.HARD_ROOM_CONFLICT;
      default:
        return ConstraintType.HARD_TEACHER_CONFLICT;
    }
  }

  /**
   * 获取核心课程分布评分
   * 
   * Args:
   *   variable: 排课变量
   *   timeSlot: 时间段
   *   state: 当前排课状态
   * 
   * Returns:
   *   number: 分布评分（越高越好）
   */
  private getCoreSubjectDistributionScore(
    variable: ScheduleVariable,
    timeSlot: TimeSlot,
    state: ScheduleState
  ): number {
    if (!this.rules.courseArrangementRules.coreSubjectStrategy?.enableCoreSubjectStrategy) {
      return 0;
    }

    const strategy = this.rules.courseArrangementRules.coreSubjectStrategy;
    const subjectName = this.constraintDetector.getSubjectNameSync(variable.courseId);
    
    if (!subjectName || !strategy.coreSubjects.includes(subjectName)) {
      return 0;
    }

    let score = 0;
    const classId = variable.classId;

    // 1. 每日分布评分
    score += this.getDailyDistributionScore(variable, timeSlot, state, strategy, subjectName);

    // 2. 每周分布评分
    score += this.getWeeklyDistributionScore(variable, timeSlot, state, strategy, subjectName);

    // 3. 时间偏好评分
    score += this.getTimePreferenceScore(timeSlot, strategy);

    // 4. 集中度评分
    score += this.getConcentrationScore(variable, timeSlot, state, strategy, subjectName);

    return score;
  }

  /**
   * 获取每日分布评分
   */
  private getDailyDistributionScore(
    variable: ScheduleVariable,
    timeSlot: TimeSlot,
    state: ScheduleState,
    strategy: any,
    subjectName: string
  ): number {
    const classId = variable.classId;
    const currentDay = timeSlot.dayOfWeek;
    let dailyCount = 1; // 当前要安排的课程

    // 统计当天已有的核心课程数量
    for (const [_, existing] of state.assignments) {
      if (existing.classId.equals(classId) && 
          this.constraintDetector.getSubjectNameSync(existing.courseId) === subjectName &&
          existing.timeSlot.dayOfWeek === currentDay) {
        dailyCount++;
      }
    }

    const maxDaily = strategy.maxDailyOccurrences;
    
    if (dailyCount <= maxDaily) {
      // 在合理范围内，给予正分
      return 50 - (dailyCount - 1) * 10; // 越少越好
    } else {
      // 超出范围，给予负分
      return -100 * (dailyCount - maxDaily);
    }
  }

  /**
   * 获取每周分布评分
   */
  private getWeeklyDistributionScore(
    variable: ScheduleVariable,
    timeSlot: TimeSlot,
    state: ScheduleState,
    strategy: any,
    subjectName: string
  ): number {
    const classId = variable.classId;
    const scheduledDays = new Set<number>();
    
    // 统计已安排的天数
    for (const [_, existing] of state.assignments) {
      if (existing.classId.equals(classId) && 
          this.constraintDetector.getSubjectNameSync(existing.courseId) === subjectName) {
        scheduledDays.add(existing.timeSlot.dayOfWeek);
      }
    }
    
    // 添加当前要安排的天数
    scheduledDays.add(timeSlot.dayOfWeek);
    
    const minDaysPerWeek = strategy.minDaysPerWeek;
    const currentDays = scheduledDays.size;
    
    if (currentDays >= minDaysPerWeek) {
      // 满足最少天数要求，给予正分
      return 30 + (currentDays - minDaysPerWeek) * 5;
    } else {
      // 不满足要求，给予负分
      return -50 * (minDaysPerWeek - currentDays);
    }
  }

  /**
   * 获取时间偏好评分
   */
  private getTimePreferenceScore(timeSlot: TimeSlot, strategy: any): number {
    const { preferredTimeSlots, avoidTimeSlots } = strategy;
    const currentPeriod = timeSlot.period;
    
    // 检查是否在避免时间段
    if (avoidTimeSlots.includes(currentPeriod)) {
      return -80;
    }
    
    // 检查是否在偏好时间段
    if (preferredTimeSlots.length > 0 && preferredTimeSlots.includes(currentPeriod)) {
      return 40;
    }
    
    return 0;
  }

  /**
   * 获取集中度评分
   */
  private getConcentrationScore(
    variable: ScheduleVariable,
    timeSlot: TimeSlot,
    state: ScheduleState,
    strategy: any,
    subjectName: string
  ): number {
    const maxConcentration = strategy.maxConcentration;
    const classId = variable.classId;
    
    // 统计连续安排的天数
    const scheduledDays = new Set<number>();
    for (const [_, existing] of state.assignments) {
      if (existing.classId.equals(classId) && 
          this.constraintDetector.getSubjectNameSync(existing.courseId) === subjectName) {
        scheduledDays.add(existing.timeSlot.dayOfWeek);
      }
    }
    scheduledDays.add(timeSlot.dayOfWeek);
    
    const sortedDays = Array.from(scheduledDays).sort();
    let maxConsecutiveDays = 1;
    let currentConsecutiveDays = 1;
    
    for (let i = 1; i < sortedDays.length; i++) {
      if (sortedDays[i] === sortedDays[i-1] + 1) {
        currentConsecutiveDays++;
        maxConsecutiveDays = Math.max(maxConsecutiveDays, currentConsecutiveDays);
      } else {
        currentConsecutiveDays = 1;
      }
    }
    
    if (maxConsecutiveDays <= maxConcentration) {
      // 在合理范围内，给予正分
      return 30 - (maxConsecutiveDays - 1) * 5;
    } else {
      // 超出范围，给予负分
      return -60 * (maxConsecutiveDays - maxConcentration);
    }
  }
}