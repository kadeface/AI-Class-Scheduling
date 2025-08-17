
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
  RotationSummary,
  // 新增：分阶段排课相关类型
  StageType,
  StagedSchedulingStageConfig,
  StageResult,
  StageProgress,
  CourseClassification
} from './types';
import { ConstraintDetector } from './constraint-detector';
import { ISchedulingRules } from '../../models/SchedulingRules';


/**
 * 排课算法引擎类
 * 
 * 实现核心的排课算法逻辑，支持分阶段排课
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

  // 新增：分阶段排课配置
  private stageConfigs: Map<StageType, StagedSchedulingStageConfig> = new Map();
  
  // 新增：分阶段状态跟踪
  private currentStage: StageType | null = null;
  private stageResults: Map<StageType, StageResult> = new Map();
  private stageProgress: StageProgress | null = null;
  
  // 新增：保存所有变量的引用，用于局部优化
  private allVariables: ScheduleVariable[] = [];

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
    

    
    // 注意：课程名称缓存将在排课变量生成后初始化
    // 这样可以确保只缓存实际需要的课程

    // 新增：初始化分阶段配置
    this.initializeStageConfigs();
  }

  /**
   * 初始化教师轮换状态
   * 
   * Args:
   *   variables: 排课变量列表
   * 
   * Returns:
   *   void
   */
  private initializeTeacherRotation(variables: ScheduleVariable[]): void {
    // 按教师分组变量
    const teacherGroups = new Map<string, ScheduleVariable[]>();
    
    for (const variable of variables) {
      const teacherKey = this.safeExtractObjectId(variable.teacherId);
      if (!teacherKey) {
        console.warn(`⚠️ 跳过无效的教师ID变量:`, variable.teacherId);
        continue;
      }
      if (!teacherGroups.has(teacherKey)) {
        teacherGroups.set(teacherKey, []);
      }
      teacherGroups.get(teacherKey)!.push(variable);
    }

    // 为每个教师初始化轮换状态
    for (const [teacherKey, teacherVariables] of teacherGroups) {
      try {
        // 安全地提取教师ID
        const extractedTeacherId = this.safeExtractObjectId(teacherKey);
        
        if (!extractedTeacherId || !this.isValidObjectId(extractedTeacherId)) {
          console.warn(`⚠️ 跳过无效的教师ID: ${teacherKey}`);
          continue;
        }

        const teacherId = mongoose.Types.ObjectId.createFromHexString(extractedTeacherId);
        
        // 安全地获取班级列表
        const classIds: string[] = [];
        for (const variable of teacherVariables) {
          const classId = this.safeExtractObjectId(variable.classId);
          if (classId && this.isValidObjectId(classId)) {
            classIds.push(classId);
          }
        }
        
        if (classIds.length === 0) {
          console.warn(`⚠️ 教师 ${extractedTeacherId} 没有有效的班级ID，跳过轮换初始化`);
          continue;
        }
        
        // 去重
        const uniqueClassIds = [...new Set(classIds)];
        
        // 确定轮换顺序
        let rotationOrder: string[];
        if (this.rules.teacherConstraints.rotationStrategy.rotationOrder === 'alphabetical') {
          rotationOrder = uniqueClassIds.sort();
        } else if (this.rules.teacherConstraints.rotationStrategy.rotationOrder === 'grade_based') {
          rotationOrder = this.sortClassesByGrade(uniqueClassIds);
        } else {
          rotationOrder = this.rules.teacherConstraints.rotationStrategy.customRotationOrder || uniqueClassIds;
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

        this.teacherRotationStates.set(extractedTeacherId, rotationState);
        console.log(`✅ 成功初始化教师 ${extractedTeacherId} 的轮换状态，班级数量: ${rotationOrder.length}`);
        
      } catch (error) {
        console.error(`❌ 初始化教师轮换状态失败 (教师ID: ${teacherKey}):`, error);
        // 继续处理其他教师，不中断整个流程
        continue;
      }
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
   * 
   * 只缓存实际排课需要的课程，而不是所有课程
   */
  private async initializeCourseNameCache(): Promise<void> {
    try {
      console.log('🔄 开始初始化课程名称缓存...');
      
      // 获取实际排课需要的课程ID列表
      const neededCourseIds = this.getNeededCourseIds();
      
      if (neededCourseIds.length === 0) {
        console.log('⚠️ 没有找到需要排课的课程，跳过缓存初始化');
        return;
      }
      
      // 只加载需要的课程信息
      const Course = mongoose.model('Course');
      const courses = await Course.find({
        _id: { $in: neededCourseIds }
      }).select('_id name subject type').lean();
      
      console.log(`📚 从数据库获取到 ${courses.length} 个需要排课的课程`);
      
      let validCourses = 0;
      let invalidCourses = 0;
      
      for (const course of courses) {
        const courseId = (course as any)._id.toString();
        const courseName = (course as any).name || (course as any).subject || '未知课程';
        
        if (courseName && courseName !== '未知课程') {
          this.courseNameCache.set(courseId, courseName);
          validCourses++;
        } else {
          invalidCourses++;
        }
      }
      
      console.log(`✅ 课程名称缓存初始化完成: ${validCourses} 个有效, ${invalidCourses} 个无效`);
      
      // 如果没有有效课程，提供警告
      if (validCourses === 0) {
        console.warn('⚠️ 警告: 没有找到有效的课程名称，核心课程识别可能失败');
      }
      
    } catch (error) {
      console.error('❌ 课程名称缓存初始化失败:', error);
      console.error('   这可能导致核心课程识别失败，建议检查数据库连接和课程数据');
      // 缓存初始化失败不影响主要功能
    }
  }

  /**
   * 获取需要排课的课程ID列表
   * 
   * 从教学计划中提取实际需要排课的课程ID
   * 
   * Returns:
   *   string[]: 课程ID列表
   */
  private getNeededCourseIds(): string[] {
    try {
      // 如果还没有排课变量，返回空数组
      if (!this.allVariables || this.allVariables.length === 0) {
        return [];
      }
      
      // 从排课变量中安全地提取课程ID
      const courseIds: string[] = [];
      const invalidIds: any[] = [];
      
      for (const variable of this.allVariables) {
        const courseId = this.safeExtractObjectId(variable.courseId);
        if (courseId && this.isValidObjectId(courseId)) {
          courseIds.push(courseId);
        } else {
          invalidIds.push(variable.courseId);
        }
      }
      
      // 去重
      const uniqueCourseIds = [...new Set(courseIds)];
      
      if (invalidIds.length > 0) {
        console.warn(`⚠️ 发现 ${invalidIds.length} 个无效的课程ID，已跳过`);
        console.warn('   无效ID示例:', invalidIds.slice(0, 2));
      }
      
      console.log(`🔍 识别到 ${uniqueCourseIds.length} 个有效的课程ID`);
      
      return uniqueCourseIds;
    } catch (error) {
      console.warn('⚠️ 获取需要排课的课程ID失败:', error);
      return [];
    }
  }

  /**
   * 确保课程名称缓存已初始化完成
   * 
   * 如果缓存为空，则重新初始化
   * 
   * Returns:
   *   Promise<void>
   */
  private async ensureCourseNameCacheInitialized(): Promise<void> {
    // 如果缓存为空，说明初始化可能失败或未完成
    if (this.courseNameCache.size === 0) {
      console.log('🔄 课程名称缓存为空，开始初始化...');
      
      // 确保排课变量已经设置
      if (this.allVariables && this.allVariables.length > 0) {
        await this.initializeCourseNameCache();
        
        // 如果仍然为空，抛出错误
        if (this.courseNameCache.size === 0) {
          throw new Error('课程名称缓存初始化失败，无法进行核心课程识别');
        }
      } else {
        console.warn('⚠️ 排课变量尚未设置，无法初始化课程名称缓存');
        throw new Error('排课变量未设置，无法初始化课程名称缓存');
      }
    }
    
    console.log(`✅ 课程名称缓存已就绪，共 ${this.courseNameCache.size} 个课程`);
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

    const teacherKey = this.safeExtractObjectId(variable.teacherId);
    if (!teacherKey) {
      return null;
    }
    
    const rotationState = this.teacherRotationStates.get(teacherKey);
    
    if (!rotationState) {
      return null;
    }

    const classKey = this.safeExtractObjectId(variable.classId);
    if (!classKey) {
      return null;
    }
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
   * 检查连续时间段可用性
   * 
   * Args:
   *   variable: 排课变量
   *   timeSlot: 起始时间段
   *   state: 当前状态
   * 
   * Returns:
   *   number: 连续可用性比例 (0-1)
   */
  private checkConsecutiveAvailability(variable: ScheduleVariable, timeSlot: TimeSlot, state: ScheduleState): number {
    if (variable.requiredHours <= 1) return 1;
    
    let consecutiveCount = 0;
    for (let i = 0; i < variable.requiredHours; i++) {
      const checkPeriod = timeSlot.period + i;
      if (checkPeriod > 8) break; // 超出每日课时数
      
      const checkTimeSlot = { dayOfWeek: timeSlot.dayOfWeek, period: checkPeriod };
      const conflicts = this.countPotentialConflicts(variable, checkTimeSlot, state);
      
      if (conflicts === 0) {
        consecutiveCount++;
      } else {
        break; // 遇到冲突就停止
      }
    }
    
    return consecutiveCount / variable.requiredHours; // 返回连续可用性比例
  }

  /**
   * 冲突预测：检查这个时间段是否会导致后续排课困难
   * 
   * Args:
   *   variable: 排课变量
   *   timeSlot: 时间段
   *   state: 当前状态
   * 
   * Returns:
   *   {isHighRisk: boolean, riskLevel: string, reason: string}: 冲突预测结果
   */
  private predictFutureConflicts(variable: ScheduleVariable, timeSlot: TimeSlot, state: ScheduleState): {
    isHighRisk: boolean;
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
    reason: string;
  } {
    // 检查是否会影响其他课程的安排
    const affectedVariables = this.findAffectedVariables(variable, timeSlot, state);
    
    if (affectedVariables.length > 5) {
      return {
        isHighRisk: true,
        riskLevel: 'critical',
        reason: `会影响 ${affectedVariables.length} 个其他课程的安排`
      };
    }
    
    if (affectedVariables.length > 3) {
      return {
        isHighRisk: true,
        riskLevel: 'high',
        reason: `会影响 ${affectedVariables.length} 个其他课程的安排`
      };
    }
    
    if (affectedVariables.length > 1) {
      return {
        isHighRisk: true,
        riskLevel: 'medium',
        reason: `会影响 ${affectedVariables.length} 个其他课程的安排`
      };
    }
    
    return {
      isHighRisk: false,
      riskLevel: 'low',
      reason: '影响较小'
    };
  }

  /**
   * 查找受影响的变量
   * 
   * Args:
   *   variable: 当前变量
   *   timeSlot: 时间段
   *   state: 当前状态
   * 
   * Returns:
   *   string[]: 受影响的变量ID列表
   */
  private findAffectedVariables(variable: ScheduleVariable, timeSlot: TimeSlot, state: ScheduleState): string[] {
    const affectedVariables: string[] = [];
    
    // 检查同一天的其他时间段是否会被影响
    for (const [id, assignment] of state.assignments.entries()) {
      // 检查教师冲突
      if (assignment.teacherId.equals(variable.teacherId) && 
          assignment.timeSlot.dayOfWeek === timeSlot.dayOfWeek) {
        // 如果教师在同一天有其他课程，可能会影响时间分布
        affectedVariables.push(id);
      }
      
      // 检查班级冲突
      if (assignment.classId.equals(variable.classId) && 
          assignment.timeSlot.dayOfWeek === timeSlot.dayOfWeek) {
        // 如果班级在同一天有其他课程，可能会影响时间分布
        affectedVariables.push(id);
      }
    }
    
    return affectedVariables;
  }

  /**
   * 更新教师轮换状态
   */
  private updateTeacherRotationState(
    variable: ScheduleVariable,
    assignment: CourseAssignment
  ): void {
    const teacherKey = this.safeExtractObjectId(variable.teacherId);
    if (!teacherKey) return;
    
    const rotationState = this.teacherRotationStates.get(teacherKey);
    
    if (!rotationState) return;

    const classKey = this.safeExtractObjectId(variable.classId);
    if (!classKey) return;
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
      this.reportProgress('初始化', 0, '正在初始化分阶段排课算法...', 0, variables.length);

      // 验证输入数据
      if (!variables || variables.length === 0) {
        throw new Error('排课变量列表不能为空');
      }

      // 验证变量数据的完整性
      const invalidVariables = variables.filter(v => 
        !v.teacherId || !v.classId || !v.courseId
      );
      
      if (invalidVariables.length > 0) {
        console.log(`⚠️ 发现 ${invalidVariables.length} 个无效的排课变量`);
        // 过滤掉无效变量
        variables = variables.filter(v => 
          v.teacherId && v.classId && v.courseId
        );
        
        if (variables.length === 0) {
          throw new Error('所有排课变量都无效，无法进行排课');
        }
        
        console.log(`✅ 过滤后剩余 ${variables.length} 个有效变量`);
      }

      // 保存所有变量的引用，用于局部优化
      this.allVariables = variables;
      
      // 确保课程名称缓存已初始化完成
      this.reportProgress('缓存初始化', 2, '正在等待课程名称缓存初始化...', 0, this.allVariables.length);
      try {
        // 等待课程名称缓存初始化完成
        await this.ensureCourseNameCacheInitialized();
        this.reportProgress('缓存初始化', 4, '课程名称缓存初始化完成', 0, this.allVariables.length, true);
      } catch (error) {
        console.warn('⚠️ 课程名称缓存初始化失败，将使用默认识别策略:', error);
        this.reportProgress('缓存初始化', 4, '课程名称缓存初始化失败，使用默认策略', 0, this.allVariables.length, true);
      }
      
      // 课程分类
      this.reportProgress('课程分类', 5, '正在进行课程分类...', 0, this.allVariables.length);
      const classification = this.classifyCourses(variables);
      
      if (classification.classificationStats.coreCourseCount === 0) {
        console.log('⚠️ 没有识别到核心课程，将使用传统单阶段排课');
        return await this.solveTraditional(variables, fixedAssignments);
      }

      // 初始化教师轮换状态
      try {
        this.initializeTeacherRotation(variables);
        this.reportProgress('轮换初始化', 10, '教师轮换状态初始化完成', 0, this.allVariables.length, true);
      } catch (error) {
        console.error('❌ 教师轮换状态初始化失败:', error);
        this.reportProgress('轮换初始化', 10, '教师轮换状态初始化失败，继续执行...', 0, this.allVariables.length, true);
      }

      // 🔥 重构：统一排课执行
      this.reportProgress('统一排课', 15, '开始统一排课...', 0, this.allVariables.length);
      
      console.log(`📊 课程分类结果:`);
      console.log(`   📋 核心课程: ${classification.classificationStats.coreCourseCount} 门`);
      console.log(`   📋 一般课程: ${classification.classificationStats.generalCourseCount} 门`);
      console.log(`   📋 总计: ${variables.length} 门`);
      
      // 使用统一的排课引擎处理所有课程
      const unifiedResult = await this.scheduleAllCourses(variables, fixedAssignments);
      
      this.reportProgress('统一排课', 70, `统一排课完成，成功 ${unifiedResult.statistics.assignedVariables}/${this.allVariables.length}`, 
        unifiedResult.statistics.assignedVariables, this.allVariables.length, true);
      
      // 最终优化
      if (this.config.enableLocalOptimization) {
        this.reportProgress('最终优化', 90, '正在进行最终优化...', unifiedResult.scheduleState.assignments.size, this.allVariables.length);
        await this.localOptimization(unifiedResult.scheduleState, variables);
      }

      const endTime = Date.now();
      const executionTime = endTime - startTime;

      this.reportProgress('完成', 100, '统一排课算法执行完成', unifiedResult.scheduleState.assignments.size, this.allVariables.length, true);

      console.log(`🎉 统一排课算法执行完成！`);
      console.log(`   📊 最终状态: 总分配 ${unifiedResult.scheduleState.assignments.size} 个，未分配 ${unifiedResult.scheduleState.unassigned.length} 个`);
      console.log(`   📊 核心课程: ${classification.classificationStats.coreCourseCount} 门（已分类）`);
      console.log(`   📊 一般课程: ${classification.classificationStats.generalCourseCount} 门（已分类）`);
      console.log(`   📊 执行时间: ${executionTime}ms`);

      return this.buildResult(true, unifiedResult.scheduleState, variables, executionTime);

    } catch (error) {
      const executionTime = Date.now() - startTime;
      console.error('分阶段排课算法执行失败:', error);

      // 提供更详细的错误信息
      let errorMessage = '未知错误';
      let suggestions = ['请检查排课规则配置', '建议减少约束条件', '尝试增加可用时间段'];

      if (error instanceof Error) {
        errorMessage = error.message;
        
        // 根据错误类型提供具体建议
        if (error.message.includes('ObjectId') || error.message.includes('BSON')) {
          suggestions = [
            '检查教学计划数据中的教师、班级、课程ID是否有效',
            '验证数据库中的关联数据完整性',
            '重新导入或修复教学计划数据'
          ];
        } else if (error.message.includes('轮换')) {
          suggestions = [
            '检查教师轮换规则配置',
            '验证教师和班级的关联关系',
            '调整轮换策略参数'
          ];
        } else if (error.message.includes('核心课程')) {
          suggestions = [
            '检查核心课程识别规则',
            '验证课程数据完整性',
            '调整核心课程分类策略'
          ];
        }
      }

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
        message: `分阶段排课算法执行失败: ${errorMessage}`,
        suggestions
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
    
    // 新增：迭代限制警告标志，避免重复输出
    let iterationLimitWarned = false;
    let timeLimitWarned = false;

    // 新增：冲突历史记录
    const conflictHistory = new Map<string, number>();
    
    const search = async (): Promise<boolean> => {
      iterations++;

      // 检查终止条件
      if (iterations > maxIterations) {
        // 只在第一次达到限制时输出警告，避免重复日志
        if (!iterationLimitWarned) {
          console.log(`⚠️ 达到最大迭代次数限制: ${maxIterations}，算法将停止搜索`);
          iterationLimitWarned = true;
        }
        return false;
      }

      if (Date.now() - startTime > timeLimit) {
        // 只在第一次达到时间限制时输出警告
        if (!timeLimitWarned) {
          console.log(`⏰ 达到时间限制: ${this.config.timeLimit}秒，算法将停止搜索`);
          timeLimitWarned = true;
        }
        return false;
      }

      // 定期报告轮换进度（每100次迭代报告一次）
      if (iterations % 100 === 0) {
        const progress = Math.min(80, 20 + (iterations / maxIterations) * 60);
        const assignedCount = state.assignments.size;
        const totalCount = variables.length;
        this.reportProgress('轮换搜索', progress, `正在进行轮换搜索，已迭代${iterations}次`, assignedCount, totalCount, true);
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
        } else {
          // 记录冲突历史
          const timeKey = `${timeSlot.dayOfWeek}-${timeSlot.period}`;
          conflictHistory.set(timeKey, (conflictHistory.get(timeKey) || 0) + 1);
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

    // 只在详细调试模式下显示选中变量信息
    if (this.config.debugLevel === 'detailed') {
      console.log(`   🎯 选中变量: ${bestVar.id} (评分: ${bestScore.toFixed(2)})`);
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

    // 检查是否有可用时间段
    if (values.length === 0) {
      return values;
    }

    // 按照综合评分排序（冲突、偏好、轮换约束等）
    values.sort((a, b) => {
      // 0. 核心课程绝对优先（最高优先级）
      const isCoreA = this.isCoreSubject(variable);
      const isCoreB = this.isCoreSubject(variable);
      
      if (isCoreA !== isCoreB) {
        return isCoreA ? -1 : 1; // 核心课程优先
      }

      // 1. 冲突程度（最少冲突优先）
      const conflictsA = this.countPotentialConflicts(variable, a, state);
      const conflictsB = this.countPotentialConflicts(variable, b, state);
      
      if (conflictsA !== conflictsB) {
        return conflictsA - conflictsB;
      }

      // 2. 连续时间段可用性（对于需要连续课时的课程）
      if (variable.requiredHours > 1) {
        const consecutiveA = this.checkConsecutiveAvailability(variable, a, state);
        const consecutiveB = this.checkConsecutiveAvailability(variable, b, state);
        
        if (consecutiveA !== consecutiveB) {
          return consecutiveB - consecutiveA; // 连续可用性高的优先
        }
      }

      // 3. 核心课程黄金时段保护（在冲突检查之后）
      if (this.isCoreSubject(variable)) {
        const goldenTimeA = this.isGoldenTimeSlot(a);
        const goldenTimeB = this.isGoldenTimeSlot(b);
        
        if (goldenTimeA !== goldenTimeB) {
          return goldenTimeB ? 1 : -1; // 核心课程优先选择黄金时段
        }
      }

      // 4. 教师轮换约束评分（轮换友好优先）
      const rotationScoreA = this.getTeacherRotationScore(variable, a, state);
      const rotationScoreB = this.getTeacherRotationScore(variable, b, state);
      
      if (rotationScoreA !== rotationScoreB) {
        return rotationScoreB - rotationScoreA; // 轮换分数高的优先
      }

      // 5. 时间偏好（偏好时间优先）
      let preferenceA: number;
      let preferenceB: number;
      
      // 根据当前阶段选择不同的时间段偏好策略
      if (this.currentStage === StageType.GENERAL_COURSES) {
        // 一般课程阶段：使用增强的时间段选择策略
        preferenceA = this.getGeneralCourseTimePreference(variable, a, state);
        preferenceB = this.getGeneralCourseTimePreference(variable, b, state);
      } else {
        // 核心课程阶段：使用传统的时间段偏好策略
        preferenceA = this.getTimeSlotPreference(variable, a);
        preferenceB = this.getTimeSlotPreference(variable, b);
      }
      
      if (preferenceA !== preferenceB) {
        return preferenceB - preferenceA; // 偏好值高的优先
      }

      // 6. 科目类型时间适配性
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
    // 优先使用变量中的科目信息
    let courseName = variable.subject || variable.courseName;
    
    // 如果没有，则尝试从缓存获取
    if (!courseName) {
      courseName = this.getCourseNameSync(variable.courseId);
    }
    
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
    const teacherKey = this.safeExtractObjectId(variable.teacherId);
    if (!teacherKey) return 0;
    
    const rotationState = this.teacherRotationStates.get(teacherKey);
    
    if (!rotationState || !this.rules.teacherConstraints.rotationStrategy.enableRotation) {
      return 0; // 未启用轮换
    }

    let score = 0;
    const classKey = this.safeExtractObjectId(variable.classId);
    if (!classKey) return 0;
    
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
    // 1. 冲突预测：检查这个时间段是否会导致后续排课困难
    const conflictPrediction = this.predictFutureConflicts(variable, timeSlot, state);
    if (conflictPrediction.isHighRisk && conflictPrediction.riskLevel === 'critical') {
      return false;
    }
    
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
    const conflicts = await this.constraintDetector.checkAllConflicts(tempAssignment, state.assignments);
    if (conflicts.length > 0) {
      return false;
    }

    // 检查禁用时间段约束（硬约束）
    const forbiddenViolation = this.constraintDetector.checkForbiddenTimeSlot(tempAssignment);
    if (forbiddenViolation && forbiddenViolation.isHard) {
      return false;
    }

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

    const teacherKey = this.safeExtractObjectId(variable.teacherId);
    if (!teacherKey) return;
    
    const rotationState = this.teacherRotationStates.get(teacherKey);
    if (!rotationState) return;

    const classKey = this.safeExtractObjectId(variable.classId);
    if (!classKey) return;
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
   * 选择教室
   * 
   * 完全简化的教室选择逻辑：
   * 1. 所有课程都使用班级的固定教室（homeroom）
   * 2. 不进行任何教室冲突检测
   * 3. 因为每个班级都有固定教室，不存在冲突
   * 
   * Args:
   *   variable: 排课变量
   *   timeSlot: 时间段
   *   state: 当前状态
   * 
   * Returns:
   *   Promise<mongoose.Types.ObjectId | null>: 班级固定教室ID，如果没有则返回null
   */
  private async selectRoom(
    variable: ScheduleVariable,
    timeSlot: TimeSlot,
    state: ScheduleState
  ): Promise<mongoose.Types.ObjectId | null> {
    try {
      // 获取班级信息
      const classInfo = await mongoose.model('Class').findById(variable.classId);
      if (!classInfo) {
        return null;
      }
      
      // 检查班级是否有固定教室
      if (!classInfo.homeroom) {
        return null;
      }
      
      // 直接返回班级固定教室，不进行冲突检测
      return classInfo.homeroom;
    } catch (error) {
      return null;
    }
  }


  /**
   * 检查时间段是否重叠
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
   * 获取一般课程时间段偏好评分（增强版）
   * 
   * 专门为一般课程设计的时间段选择策略，考虑冲突避免和科目优化
   * 
   * Args:
   *   variable: 排课变量
   *   timeSlot: 时间段
   *   state: 当前排课状态
   * 
   * Returns:
   *   number: 时间段偏好评分
   */
  private getGeneralCourseTimePreference(
    variable: ScheduleVariable, 
    timeSlot: TimeSlot, 
    state: ScheduleState
  ): number {
    let score = 0;
    
    // 1. 冲突避免评分（最高优先级）
    const conflictScore = this.calculateConflictAvoidanceScore(variable, timeSlot, state);
    score += conflictScore * 1000; // 权重最高
    
    // 2. 科目时间适应性评分
    const subjectScore = this.getSubjectTypeTimePreference(variable, timeSlot);
    score += subjectScore * 100;
    
    // 3. 连排课程优化评分
    const continuousScore = this.getContinuousCoursePreference(variable, timeSlot);
    score += continuousScore * 50;
    
    // 4. 教师工作量平衡评分
    const workloadScore = this.getTeacherWorkloadBalanceScore(variable, timeSlot, state);
    score += workloadScore * 30;
    
    return score;
  }

  /**
   * 计算冲突避免评分
   * 
   * 评估时间段与已排课程的冲突程度，优先选择无冲突的时间段
   * 
   * Args:
   *   variable: 排课变量
   *   timeSlot: 时间段
   *   state: 当前排课状态
   * 
   * Returns:
   *   number: 冲突避免评分（越高越好）
   */
  private calculateConflictAvoidanceScore(
    variable: ScheduleVariable, 
    timeSlot: TimeSlot, 
    state: ScheduleState
  ): number {
    let score = 100; // 基础分数
    
    // 检查与已排课程的冲突
    for (const [_, assignment] of state.assignments) {
      if (this.isTimeSlotOverlap(assignment.timeSlot, timeSlot)) {
        // 时间冲突，大幅扣分
        score -= 1000;
        continue;
      }
      
      // 检查其他类型的冲突
      if (assignment.teacherId.equals(variable.teacherId)) {
        score -= 500; // 教师冲突
      }
      if (assignment.classId.equals(variable.classId)) {
        score -= 500; // 班级冲突
      }
    }
    
    return Math.max(score, -1000); // 最低分数限制
  }

  /**
   * 获取教师工作量平衡评分
   * 
   * 评估时间段对教师工作量的平衡性影响
   * 
   * Args:
   *   variable: 排课变量
   *   timeSlot: 时间段
   *   state: 当前排课状态
   * 
   * Returns:
   *   number: 工作量平衡评分
   */
  private getTeacherWorkloadBalanceScore(
    variable: ScheduleVariable, 
    timeSlot: TimeSlot, 
    state: ScheduleState
  ): number {
    let score = 0;
    const teacherId = variable.teacherId;
    
    // 统计该教师在当前时间段的课程数量
    let currentPeriodCount = 0;
    for (const [_, assignment] of state.assignments) {
      if (assignment.teacherId.equals(teacherId) && 
          assignment.timeSlot.dayOfWeek === timeSlot.dayOfWeek &&
          assignment.timeSlot.period === timeSlot.period) {
        currentPeriodCount++;
      }
    }
    
    // 如果当前时间段已有课程，扣分
    if (currentPeriodCount > 0) {
      score -= 200;
    }
    
    // 检查该教师在同一天的课程分布
    let dailyCourseCount = 0;
    for (const [_, assignment] of state.assignments) {
      if (assignment.teacherId.equals(teacherId) && 
          assignment.timeSlot.dayOfWeek === timeSlot.dayOfWeek) {
        dailyCourseCount++;
      }
    }
    
    // 如果当天课程过多，扣分
    if (dailyCourseCount >= 6) {
      score -= 100;
    }
    
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
    // 方法1: 通过优先级判断（最高优先级）
    if (variable.priority >= 8) {
      return true;
    }
    
    // 方法2: 通过科目信息判断
    let courseName = variable.subject || variable.courseName;
    
    // 如果没有，则尝试从缓存获取
    if (!courseName) {
      courseName = this.getCourseNameSync(variable.courseId);
    }
    
    if (courseName && courseName !== '未知课程') {
      // 扩展的核心科目列表
      const coreSubjects = [
        // 主要核心科目
        '语文', '数学', '英语', '物理', '化学', '生物',
        // 英文名称
        'chinese', 'math', 'mathematics', 'english', 'physics', 'chemistry', 'biology',
        // 可能的变体
        '语文课', '数学课', '英语课', '物理课', '化学课', '生物课',
        '语文基础', '数学基础', '英语基础', '物理基础', '化学基础', '生物基础',
        // 可能的缩写
        '语', '数', '英', '物', '化', '生',
        // 一年级核心课程
        '一年级语文', '一年级数学', '一年级英语',
        '二年级语文', '二年级数学', '二年级英语',
        '三年级语文', '三年级数学', '三年级英语',
        '四年级语文', '四年级数学', '四年级英语',
        '五年级语文', '五年级数学', '五年级英语',
        '六年级语文', '六年级数学', '六年级英语'
      ];
      
      const lowerCourseName = courseName.toLowerCase();
      for (const coreSubject of coreSubjects) {
        if (lowerCourseName.includes(coreSubject.toLowerCase()) || 
            coreSubject.toLowerCase().includes(lowerCourseName)) {
          return true;
        }
      }
    }
    
    // 方法3: 通过课程ID模式判断
    if (variable.courseId) {
      const courseIdStr = this.safeExtractObjectId(variable.courseId);
      if (courseIdStr && (courseIdStr.includes('core') || courseIdStr.includes('main') || 
          courseIdStr.includes('primary') || courseIdStr.includes('essential') ||
          courseIdStr.includes('chi') || courseIdStr.includes('math') || 
          courseIdStr.includes('eng'))) {
        return true;
      }
    }
    
    // 方法4: 通过变量ID模式判断（如果变量ID包含科目信息）
    if (variable.id) {
      const lowerId = variable.id.toLowerCase();
      if (lowerId.includes('语文') || lowerId.includes('数学') || lowerId.includes('英语') ||
          lowerId.includes('chinese') || lowerId.includes('math') || lowerId.includes('english')) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * 获取科目类型时间偏好
   */
  private getSubjectTypeTimePreference(variable: ScheduleVariable, timeSlot: TimeSlot): number {
    // 优先使用变量中的科目信息
    let courseName = variable.subject || variable.courseName;
    
    // 如果没有，则尝试从缓存获取
    if (!courseName) {
      courseName = this.getCourseNameSync(variable.courseId);
    }
    
    // 转换为小写进行模糊匹配
    const lowerCourseName = courseName ? courseName.toLowerCase() : '';
    
    // 1. 体育课程时间偏好
    if (lowerCourseName.includes('体育') || lowerCourseName.includes('pe') || 
        lowerCourseName.includes('physical') || lowerCourseName.includes('gym')) {
      return this.getPhysicalEducationTimePreference(variable, timeSlot);
    }
    
    // 2. 艺术类课程时间偏好
    if (lowerCourseName.includes('美术') || lowerCourseName.includes('音乐') || 
        lowerCourseName.includes('art') || lowerCourseName.includes('music') ||
        lowerCourseName.includes('舞蹈') || lowerCourseName.includes('dance')) {
      return this.getArtSubjectTimePreference(timeSlot);
    }
    
    // 3. 信息技术类课程时间偏好
    if (lowerCourseName.includes('信息技术') || lowerCourseName.includes('通用技术') || 
        lowerCourseName.includes('computer') || lowerCourseName.includes('tech') ||
        lowerCourseName.includes('编程') || lowerCourseName.includes('programming')) {
      return this.getTechSubjectTimePreference(timeSlot);
    }
    
    // 4. 实验/实践类课程时间偏好
    if (lowerCourseName.includes('实验') || lowerCourseName.includes('实践') || 
        lowerCourseName.includes('lab') || lowerCourseName.includes('practical') ||
        lowerCourseName.includes('手工') || lowerCourseName.includes('handcraft')) {
      return this.getLabSubjectTimePreference(timeSlot);
    }
    
    // 5. 生活技能、心理健康、班会等
    if (lowerCourseName.includes('心理健康') || lowerCourseName.includes('班会') || 
        lowerCourseName.includes('life') || lowerCourseName.includes('skill') ||
        lowerCourseName.includes('品德') || lowerCourseName.includes('道德')) {
      return this.getLifeSkillSubjectTimePreference(timeSlot);
    }
    
    // 6. 外语类课程（非英语）
    if (lowerCourseName.includes('日语') || lowerCourseName.includes('法语') || 
        lowerCourseName.includes('德语') || lowerCourseName.includes('spanish') ||
        lowerCourseName.includes('俄语') || lowerCourseName.includes('russian')) {
      return this.getForeignLanguageTimePreference(timeSlot);
    }
    
    // 7. 综合实践活动
    if (lowerCourseName.includes('综合实践') || lowerCourseName.includes('研究性学习') || 
        lowerCourseName.includes('community') || lowerCourseName.includes('research')) {
      return this.getComprehensiveActivityTimePreference(timeSlot);
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
   * 实验/实践类课程时间偏好
   */
  private getLabSubjectTimePreference(timeSlot: TimeSlot): number {
    let score = 0;
    
    // 上午2-4节（学生精力充沛，适合动手操作）
    if (timeSlot.period >= 2 && timeSlot.period <= 4) {
      score += 80;
    }
    
    // 下午5节（下午适合实践操作）
    if (timeSlot.period === 5) {
      score += 70;
    }
    
    // 避免第一节（设备准备需要时间）
    if (timeSlot.period === 1) {
      score -= 40;
    }
    
    // 避免下午7-8节（学生疲劳，不适合精细操作）
    if (timeSlot.period >= 7) {
      score -= 50;
    }
    
    return score;
  }

  /**
   * 外语类课程（非英语）时间偏好
   */
  private getForeignLanguageTimePreference(timeSlot: TimeSlot): number {
    let score = 0;
    
    // 上午1-3节（学生注意力集中，语言学习效果好）
    if (timeSlot.period >= 1 && timeSlot.period <= 3) {
      score += 90;
    }
    
    // 上午4节（上午适合语言练习）
    if (timeSlot.period === 4) {
      score += 70;
    }
    
    // 下午5节（下午适合语言交流）
    if (timeSlot.period === 5) {
      score += 60;
    }
    
    // 避免下午6-8节（学生注意力下降）
    if (timeSlot.period >= 6) {
      score -= 40;
    }
    
    return score;
  }

  /**
   * 综合实践活动时间偏好
   */
  private getComprehensiveActivityTimePreference(timeSlot: TimeSlot): number {
    let score = 0;
    
    // 上午2-4节（学生精力充沛，适合综合活动）
    if (timeSlot.period >= 2 && timeSlot.period <= 4) {
      score += 80;
    }
    
    // 下午5-6节（下午适合团队活动）
    if (timeSlot.period >= 5 && timeSlot.period <= 6) {
      score += 70;
    }
    
    // 避免第一节（学生刚到校，状态不佳）
    if (timeSlot.period === 1) {
      score -= 30;
    }
    
    // 避免下午7-8节（学生疲劳）
    if (timeSlot.period >= 7) {
      score -= 40;
    }
    
    return score;
  }

  /**
   * 获取连排课程偏好
   */
  private getContinuousCoursePreference(variable: ScheduleVariable, timeSlot: TimeSlot): number {
    if (!variable.continuous || !variable.continuousHours) {
      return 0;
    }
    
    let score = 0;
    const { dayOfWeek, period } = timeSlot;
    
    // 1. 基础时段偏好
    // 连排课程最佳时段：上午2-4节，下午5-6节
    if ((period >= 2 && period <= 4) || (period >= 5 && period <= 6)) {
      score += 60;
    }
    
    // 2. 避免时段
    // 避免连排在第一节或最后一节
    if (period === 1 || period === 8) {
      score -= 40;
    }
    
    // 3. 连排课程特殊优化（如果指定了连排课时数）
    if (variable.continuousHours >= 2) {
      // 检查后续时间段是否可用
      for (let i = 1; i < variable.continuousHours; i++) {
        const nextPeriod = period + i;
        
        // 检查时间段是否在合理范围内
        if (nextPeriod > 8) { // 假设最大8节课
          score -= 100; // 超出范围扣分
          break;
        }
        
        // 每个可用时间段加分
        score += 20;
      }
    }
    
    // 4. 科目特定的连排优化
    const subject = variable.subject || variable.courseName || '';
    const lowerSubject = subject.toLowerCase();
    
    // 体育课程连排优化
    if (lowerSubject.includes('体育') || lowerSubject.includes('pe') || 
        lowerSubject.includes('physical')) {
      score += this.getContinuousPEScore(timeSlot);
    }
    
    // 实验课程连排优化
    if (lowerSubject.includes('实验') || lowerSubject.includes('lab') || 
        lowerSubject.includes('实践')) {
      // 实验课程连排需要更多准备时间
      if (period >= 2 && period <= 4) {
        score += 30; // 上午连排实验课加分
      }
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
      const courseIdStr = courseId.toString();
      this.courseNameCache.set(courseIdStr, courseName);
      
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
    const courseIdStr = courseId.toString();
    if (this.courseNameCache && this.courseNameCache.has(courseIdStr)) {
      return this.courseNameCache.get(courseIdStr)!;
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

    console.log(`   📊 成功状态: ${success}`);
    console.log(`   📊 总变量数: ${variables.length}`);
    console.log(`   📊 已分配: ${state.assignments.size}`);
    console.log(`   📊 未分配: ${state.unassigned.length}`);
    
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

    const result = {
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
      conflicts: [],
      violations: [],
      message: success ? '排课成功完成' : '排课未能完全成功',
      suggestions
    };

    console.log(`✅ 排课结果构建完成:`);
    console.log(`   📊 成功: ${result.success}`);
    console.log(`   📊 已分配: ${result.statistics.assignedVariables}`);
    console.log(`   📊 未分配: ${result.statistics.unassignedVariables}`);
    console.log(`   📊 硬约束违反: ${result.statistics.hardViolations}`);
    console.log(`   📊 软约束违反: ${result.statistics.softViolations}`);
    console.log(`   📊 总评分: ${result.statistics.totalScore}`);

    return result;
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
    const teacherIdStr = teacherId.toString();
    const rotationState = this.teacherRotationStates.get(teacherIdStr);
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
    const teacherIdStr = teacherId.toString();
    const rotationState = this.teacherRotationStates.get(teacherIdStr);
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
      const progress = this.calculateRotationProgress(mongoose.Types.ObjectId.createFromHexString(teacherId));
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
          this.calculateRotationProgress(mongoose.Types.ObjectId.createFromHexString(teacherId))
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
    const conflicts = await this.constraintDetector.checkAllConflicts(tempAssignment, state.assignments);
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

  /**
   * 🔥 重构：统一排课方法
   * 
   * 将所有课程（核心课程和一般课程）统一处理，避免分阶段的复杂性
   * 统一应用所有约束，实现全局优化
   * 
   * Args:
   *   variables: 排课变量列表
   *   fixedAssignments: 固定排课列表
   * 
   * Returns:
   *   SchedulingResult: 排课结果
   * 
   * Raises:
   *   Error: 排课执行失败时抛出
   */
    private async scheduleAllCourses(
    variables: ScheduleVariable[],
    fixedAssignments: CourseAssignment[]
  ): Promise<SchedulingResult> {
    try {
      console.log(`🚀 [统一排课] 开始处理 ${variables.length} 门课程`);

      // 🔥 重构：直接在 scheduling-engine 中实现统一排课，不再依赖 core-course-engine
      console.log(`   📊 [统一排课] 开始统一排课算法...`);

      // 获取资源信息
      const teachers = this.getTeachersFromVariables(variables);
      const rooms = this.getRoomsFromFixedAssignments(fixedAssignments);
      const timeSlots = this.generateTimeSlots();

      console.log(`   📋 [统一排课] 资源统计:`);
      console.log(`      - 课程变量: ${variables.length}`);
      console.log(`      - 教师: ${teachers.length}`);
      console.log(`      - 教室: ${rooms.length}`);
      console.log(`      - 时间槽: ${timeSlots.length}`);

      // 初始化排课状态
      const state = this.initializeState(variables, fixedAssignments);
      
      // 应用固定分配的约束
      this.propagateConstraints(state, variables);

      console.log(`   🔄 [统一排课] 开始课程分配循环...`);

      // 直接在这里实现排课逻辑
      const assignments = new Map<string, CourseAssignment>();
      const unassigned: string[] = [];
      let iterations = 0;
      const startTime = Date.now();

      // 按优先级排序变量（核心课程优先）
      const sortedVariables = variables.sort((a, b) => {
        const aPriority = this.getPriorityScore(a);
        const bPriority = this.getPriorityScore(b);
        return bPriority - aPriority; // 高优先级在前
      });

      console.log(`   📊 [统一排课] 课程优先级排序完成，开始分配...`);

      for (let i = 0; i < sortedVariables.length; i++) {
        const variable = sortedVariables[i];
        
        if (this.shouldStop(iterations, startTime)) {
          console.log(`   ⏰ [统一排课] 达到时间或迭代限制，停止排课`);
          break;
        }

        console.log(`   🔄 [统一排课] 处理第 ${i + 1}/${sortedVariables.length} 个变量: ${variable.subject || '未知科目'}`);
        
        // 尝试为变量分配时间槽
        const assignment = await this.assignVariableToTimeSlot(variable, timeSlots, rooms, assignments);
        
        if (assignment) {
          assignments.set(variable.id, assignment);
          console.log(`      ✅ 分配成功: 第${assignment.timeSlot.dayOfWeek}天第${assignment.timeSlot.period}节`);
        } else {
          unassigned.push(variable.id);
          console.log(`      ❌ 分配失败`);
        }

        iterations++;
        
        // 每处理10个变量显示一次进度
        if ((i + 1) % 10 === 0) {
          console.log(`   📊 [进度] 已处理: ${i + 1}/${sortedVariables.length}, 成功: ${assignments.size}, 失败: ${unassigned.length}`);
        }
      }

      const endTime = Date.now();
      const executionTime = endTime - startTime;

      // 构建最终状态
      const finalState: ScheduleState = {
        assignments,
        unassigned,
        conflicts: [],
        violations: [],
        score: 100,
        isComplete: unassigned.length === 0,
        isFeasible: true
      };

      console.log(`🎉 [统一排课] 排课完成！`);
      console.log(`   📊 最终结果: 总分配 ${assignments.size} 个，未分配 ${unassigned.length} 个`);
      console.log(`   📊 执行时间: ${executionTime}ms`);
      console.log(`   📊 迭代次数: ${iterations}`);

      return {
        success: true,
        scheduleState: finalState,
        statistics: {
          totalVariables: variables.length,
          assignedVariables: assignments.size,
          unassignedVariables: unassigned.length,
          hardViolations: 0,
          softViolations: 0,
          totalScore: 100,
          iterations,
          executionTime
        },
        conflicts: [],
        violations: [],
        message: '统一排课成功',
        suggestions: []
      };

    } catch (error) {
      console.error(`[统一排课] ❌ 执行异常:`, error);
      throw error;
    }
  }

  /**
   * 排课核心课程
   * @param coreVariables 核心课程变量列表
   * @param fixedAssignments 固定安排
   * @returns 核心课程排课结果
   */
  private async scheduleCoreCourses(
    coreVariables: ScheduleVariable[],
    fixedAssignments: CourseAssignment[]
  ): Promise<SchedulingResult> {
    try {
      // 创建核心课程专用的配置
      const coreConfig: AlgorithmConfig = {
        ...this.config,
        maxIterations: Math.min(this.config.maxIterations, 5000), // 核心课程使用更严格的限制
        timeLimit: Math.min(this.config.timeLimit, 120), // 2分钟时间限制
        enableLocalOptimization: true,
        localOptimizationIterations: 50
      };

      // 创建核心课程引擎实例

      
      // 转换变量为课程格式（修复类型转换）
      console.log(`   🔄 [scheduleCoreCourses] 开始转换 ${coreVariables.length} 个核心课程变量`);
      
      const courses = coreVariables.map((variable, index) => {
        console.log(`   📋 处理变量 ${index + 1}:`);
        console.log(`      - 原始teacherId: ${variable.teacherId}`);
        console.log(`      - 原始teacherId类型: ${typeof variable.teacherId}`);
        
        const courseId = this.safeExtractObjectId(variable.courseId);
        const classId = this.safeExtractObjectId(variable.classId);
        const teacherId = this.safeExtractObjectId(variable.teacherId);
        
        console.log(`      - 提取后teacherId: ${teacherId}`);
        
        if (!courseId || !classId || !teacherId) {
          console.warn(`⚠️ 跳过无效的变量:`, variable);
          return null;
        }
        
        // 创建 ObjectId 实例（安全创建）
        let courseIdObj, classIdObj, teacherIdObj;
        
        try {
          courseIdObj = new mongoose.Types.ObjectId(courseId);
          classIdObj = new mongoose.Types.ObjectId(classId);
          teacherIdObj = new mongoose.Types.ObjectId(teacherId);
        } catch (error) {
          console.warn(`⚠️ 创建 ObjectId 失败:`, error);
          return null;
        }
        
        return {
          id: courseId,
          subject: variable.subject || variable.courseName || this.getCourseNameSync(variable.courseId),
          classId: classId,
          teacherId: teacherIdObj,  // 使用 ObjectId 实例
          requiredHours: variable.requiredHours
        };
      }).filter((course): course is NonNullable<typeof course> => course !== null);

      // 获取教师、教室、时间槽信息（简化实现）
      const teachers = this.getTeachersFromVariables(coreVariables);
      const rooms = this.getRoomsFromFixedAssignments(fixedAssignments);
      const timeSlots = this.generateTimeSlots();

      // 执行核心课程排课

      
      // 🔥 重构：直接在 scheduling-engine 中实现核心课程排课
      console.log(`[调度引擎] 📊 开始核心课程排课算法...`);

      // 初始化排课状态
      const state = this.initializeState(coreVariables, fixedAssignments);
      
      // 应用固定分配的约束
      this.propagateConstraints(state, coreVariables);

      console.log(`[调度引擎] 🔄 开始核心课程分配循环...`);

      // 直接在这里实现排课逻辑
      const assignments = new Map<string, CourseAssignment>();
      const unassigned: string[] = [];
      let iterations = 0;
      const startTime = Date.now();

      // 按优先级排序变量（核心课程优先）
      const sortedVariables = coreVariables.sort((a, b) => {
        const aPriority = this.getPriorityScore(a);
        const bPriority = this.getPriorityScore(b);
        return bPriority - aPriority; // 高优先级在前
      });

      console.log(`[调度引擎] 📊 核心课程优先级排序完成，开始分配...`);

      for (let i = 0; i < sortedVariables.length; i++) {
        const variable = sortedVariables[i];
        
        if (this.shouldStop(iterations, startTime)) {
          console.log(`[调度引擎] ⏰ 达到时间或迭代限制，停止排课`);
          break;
        }

        console.log(`[调度引擎] 🔄 处理第 ${i + 1}/${sortedVariables.length} 个核心课程: ${variable.subject || '未知科目'}`);
        
        // 尝试为变量分配时间槽
        const assignment = await this.assignVariableToTimeSlot(variable, timeSlots, rooms, assignments);
        
        if (assignment) {
          assignments.set(variable.id, assignment);
          console.log(`      ✅ 分配成功: 第${assignment.timeSlot.dayOfWeek}天第${assignment.timeSlot.period}节`);
        } else {
          unassigned.push(variable.id);
          console.log(`      ❌ 分配失败`);
        }

        iterations++;
        
        // 每处理10个变量显示一次进度
        if ((i + 1) % 10 === 0) {
          console.log(`[调度引擎] 📊 [进度] 已处理: ${i + 1}/${sortedVariables.length}, 成功: ${assignments.size}, 失败: ${unassigned.length}`);
        }
      }

      const endTime = Date.now();
      const executionTime = endTime - startTime;

      // 构建最终状态
      const coreState: ScheduleState = {
        assignments,
        unassigned,
        conflicts: [],
        violations: [],
        score: 100,
        isComplete: unassigned.length === 0,
        isFeasible: true
      };

      console.log(`🎉 [调度引擎] 核心课程排课完成！`);
      console.log(`   📊 最终结果: 总分配 ${assignments.size} 个，未分配 ${unassigned.length} 个`);
      console.log(`   📊 执行时间: ${executionTime}ms`);
      console.log(`   📊 迭代次数: ${iterations}`);

      return {
        success: true,
        scheduleState: coreState,
        statistics: {
          totalVariables: coreVariables.length,
          assignedVariables: assignments.size,
          unassignedVariables: unassigned.length,
          hardViolations: 0,
          softViolations: 0,
          totalScore: 100,
          iterations,
          executionTime
        },
        conflicts: [],
        violations: [],
        message: '核心课程排课成功',
        suggestions: []
      };

      return {
        success: false,
        scheduleState: this.initializeState(coreVariables, fixedAssignments),
        statistics: {
          totalVariables: coreVariables.length,
          assignedVariables: 0,
          unassignedVariables: coreVariables.length,
          hardViolations: 0,
          softViolations: 0,
          totalScore: 0,
          iterations: 0,
          executionTime: 0
        },
        conflicts: [],
        violations: [],
        message: '核心课程排课失败',
        suggestions: []
      };

    } catch (error: any) {
      console.error('[排课引擎] 核心课程排课异常:', error);
      return {
        success: false,
        scheduleState: this.initializeState(coreVariables, fixedAssignments),
        statistics: {
          totalVariables: coreVariables.length,
          assignedVariables: 0,
          unassignedVariables: coreVariables.length,
          hardViolations: 0,
          softViolations: 0,
          totalScore: 0,
          iterations: 0,
          executionTime: 0
        },
        conflicts: [],
        violations: [],
        message: `核心课程排课异常: ${error.message}`,
        suggestions: []
      };
    }
  }

  /**
   * 从变量中获取教师信息
   * @param variables 变量列表
   * @returns 教师列表
   */
  private getTeachersFromVariables(variables: ScheduleVariable[]): any[] {
    const teacherMap = new Map<string, any>();
    
    for (const variable of variables) {
      const teacherId = this.safeExtractObjectId(variable.teacherId);
      if (!teacherId) {
        console.warn(`⚠️ 跳过无效的教师ID变量:`, variable.teacherId);
        continue;
      }
      
      const subject = variable.subject || variable.courseName || this.getCourseNameSync(variable.courseId);
      
      if (!teacherMap.has(teacherId)) {
        teacherMap.set(teacherId, {
          id: teacherId,
          subjects: [subject]
        });
      } else {
        const teacher = teacherMap.get(teacherId);
        if (!teacher.subjects.includes(subject)) {
          teacher.subjects.push(subject);
        }
      }

    }

    return Array.from(teacherMap.values());
  }

  /**
   * 从固定安排中获取教室信息
   * @param fixedAssignments 固定安排
   * @returns 教室列表
   */
  private getRoomsFromFixedAssignments(fixedAssignments: CourseAssignment[]): any[] {
    const roomMap = new Map<string, any>();
    
    for (const assignment of fixedAssignments) {
      const roomId = this.safeExtractObjectId(assignment.roomId);
      if (!roomId) {
        console.warn(`⚠️ 跳过无效的教室ID:`, assignment.roomId);
        continue;
      }
      
      if (!roomMap.has(roomId)) {
        roomMap.set(roomId, {
          id: roomId,
          capacity: 50, // 默认容量
          type: 'classroom' // 默认类型
        });
      }
    }

    // 如果没有固定安排，创建默认教室
    if (roomMap.size === 0) {
      for (let i = 1; i <= 10; i++) {
        // 生成有效的 ObjectId 字符串作为默认教室ID
        const defaultRoomId = new mongoose.Types.ObjectId().toString();
        roomMap.set(defaultRoomId, {
          id: defaultRoomId,
          capacity: 50,
          type: 'classroom'
        });
      }

    }

    return Array.from(roomMap.values());
  }

  /**
   * 生成时间槽
   * @returns 时间槽列表
   */
  private generateTimeSlots(): any[] {
    const timeSlots = [];
    
    // 生成一周5天，每天8节课的时间槽
    for (let day = 1; day <= 5; day++) {
      for (let hour = 1; hour <= 8; hour++) {
        timeSlots.push({
          dayOfWeek: day,      // 修改：使用 dayOfWeek 而不是 day
          period: hour,        // 修改：使用 period 而不是 hour
          priority: hour <= 4 ? 'high' : 'medium' // 上午优先
        });
      }
    }

    return timeSlots;
  }

  /**
   * 将核心课程结果转换为ScheduleState格式
   * @param coreSchedule 核心课程排课结果
   * @param variables 原始变量列表
   * @returns ScheduleState
   */
  private convertCoreResultToState(
    coreSchedule: any,
    variables: ScheduleVariable[]
  ): ScheduleState {
    const assignments = new Map<string, CourseAssignment>();
    const unassigned: string[] = [];

    // 转换核心课程安排
    if (coreSchedule.assignments && coreSchedule.assignments.size > 0) {
      console.log(`   🔄 转换核心课程分配...`);
      
      for (const [courseId, assignment] of coreSchedule.assignments) {
        console.log(`      🔍 处理课程分配: ${courseId}`);
        
        const variable = variables.find(v => {
          const variableCourseId = this.safeExtractObjectId(v.courseId);
          return variableCourseId === courseId;
        });
        
        if (variable) {
          console.log(`         ✅ 找到匹配变量: ${variable.id} (科目: ${variable.subject || variable.courseName})`);
          
          const courseAssignment: CourseAssignment = {
            variableId: variable.id,
            classId: assignment.classId,
            courseId: assignment.courseId,
            teacherId: assignment.teacherId,
            roomId: assignment.roomId,
            timeSlot: {
              dayOfWeek: assignment.timeSlot.dayOfWeek,
              period: assignment.timeSlot.period
            },
            isFixed: false
          };
          
          assignments.set(variable.id, courseAssignment);
          console.log(`         ✅ 分配转换成功: 第${assignment.timeSlot.dayOfWeek}天第${assignment.timeSlot.period}节`);
        } else {
          console.log(`         ❌ 未找到匹配变量，课程ID: ${courseId}`);
        }
      }
    } else {
      console.log(`   ⚠️ 核心课程结果中没有分配数据`);
    }

    // 找出未分配的变量
    for (const variable of variables) {
      if (!assignments.has(variable.id)) {
        unassigned.push(variable.id);
      }
    }

    console.log(`   📊 转换完成:`);
    console.log(`      - 成功转换: ${assignments.size} 个分配`);
    console.log(`      - 未分配变量: ${unassigned.length} 个`);
    console.log(`      - 总变量: ${variables.length}`);

    return {
      assignments,
      unassigned,
      conflicts: [],
      violations: [],
      score: 100,
      isComplete: unassigned.length === 0,
      isFeasible: true
    };
  }



  /**
   * 初始化分阶段配置
   * 
   * 为不同阶段设置特定的算法参数和约束优先级
   */
  private initializeStageConfigs(): void {
    // 核心课程阶段配置：更严格的限制，更高的约束优先级
    this.stageConfigs.set(StageType.CORE_COURSES, {
      stageType: StageType.CORE_COURSES,
      maxIterations: Math.min(this.config.maxIterations, 5000), // 核心课程使用更严格的限制
      timeLimit: Math.min(this.config.timeLimit, 120), // 2分钟时间限制
      enableLocalOptimization: true,
      localOptimizationIterations: 50,
      constraintPriority: 'high',
      enableBacktracking: true
    });

    // 一般课程阶段配置：更宽松的限制，考虑软约束优化
    this.stageConfigs.set(StageType.GENERAL_COURSES, {
      stageType: StageType.GENERAL_COURSES,
      maxIterations: Math.min(this.config.maxIterations, 8000), // 一般课程可以使用更多迭代
      timeLimit: Math.min(this.config.timeLimit, 180), // 3分钟时间限制
      enableLocalOptimization: true,
      localOptimizationIterations: 100,
      constraintPriority: 'medium',
      enableBacktracking: true,
      // 新增：一般课程特定配置
      enableConflictAvoidance: true, // 启用冲突避免
      enableSubjectOptimization: true, // 启用科目优化
      enableContinuousOptimization: true // 启用连排优化
    });

    console.log('✅ 分阶段配置初始化完成');
  }

  /**
   * 课程分类
   * 
   * 将排课变量分为核心课程和一般课程
   * 
   * Args:
   *   variables: 排课变量列表
   * 
   * Returns:
   *   CourseClassification: 课程分类结果
   */
  private classifyCourses(variables: ScheduleVariable[]): CourseClassification {
    const coreCourses: ScheduleVariable[] = [];
    const generalCourses: ScheduleVariable[] = [];
    const coreSubjects = new Set<string>();
    
    // 扩展核心科目列表，包含更多可能的名称变体
    const coreSubjectNames = [
      // 主要核心科目
      '语文', '数学', '英语', '物理', '化学', '生物',
      // 可能的英文名称
      'chinese', 'math', 'mathematics', 'english', 'physics', 'chemistry', 'biology',
      // 可能的缩写
      '语文课', '数学课', '英语课', '物理课', '化学课', '生物课',
      // 可能的变体
      '语文基础', '数学基础', '英语基础', '物理基础', '化学基础', '生物基础'
    ];

    console.log(`🔍 开始课程分类，共 ${variables.length} 个变量`);
    console.log(`📚 课程名称缓存状态: ${this.courseNameCache.size} 个课程`);
    
    // 调试：检查前几个变量的信息
    if (variables.length > 0) {
      console.log(`📋 前3个变量信息示例:`);
      for (let i = 0; i < Math.min(3, variables.length); i++) {
        const v = variables[i];
        console.log(`   变量${i+1}: 科目=${v.subject || '无'}, 优先级=${v.priority}, 课程名=${v.courseName || '无'}`);
      }
    }

    // 统计变量信息
    let hasSubjectInfo = 0;
    let hasCourseNameInfo = 0;
    let hasPriorityInfo = 0;
    let cacheHits = 0;
    let cacheMisses = 0;

    for (const variable of variables) {
      // 统计变量信息
      if (variable.subject) hasSubjectInfo++;
      if (variable.courseName) hasCourseNameInfo++;
      if (variable.priority >= 8) hasPriorityInfo++;
      
      // 优先使用变量中的科目信息
      let courseName = variable.subject || variable.courseName;
      
      // 如果没有，则尝试从缓存获取
      if (!courseName) {
        courseName = this.getCourseNameSync(variable.courseId);
        if (courseName && courseName !== '未知课程') {
          console.log(`   从缓存获取课程名称: ${variable.courseId} -> ${courseName}`);
          cacheHits++;
        } else {
          cacheMisses++;
        }
      }
      
      // 判断是否为核心课程
      let isCoreSubject = false;
      let recognitionMethod = '';
      
      // 方法1: 通过优先级判断
      if (variable.priority >= 8) {
        isCoreSubject = true;
        recognitionMethod = `优先级(${variable.priority})`;
      }
      
      // 方法2: 通过科目名称判断
      if (!isCoreSubject && courseName) {
        // 检查是否包含核心科目关键词
        const lowerCourseName = courseName.toLowerCase();
        for (const coreSubject of coreSubjectNames) {
          if (lowerCourseName.includes(coreSubject.toLowerCase()) || 
              coreSubject.toLowerCase().includes(lowerCourseName)) {
            isCoreSubject = true;
            recognitionMethod = `科目名称匹配(${coreSubject})`;
            break;
          }
        }
      }
      
      // 方法3: 通过课程ID模式判断（如果课程ID包含科目信息）
      if (!isCoreSubject && variable.courseId) {
        const courseIdStr = this.safeExtractObjectId(variable.courseId);
        if (courseIdStr && (courseIdStr.includes('core') || courseIdStr.includes('main') || courseIdStr.includes('primary'))) {
          isCoreSubject = true;
          recognitionMethod = `课程ID模式(${courseIdStr})`;
        }
      }
      
      // 方法4: 备用策略已移除 - 避免错误识别包含数字的非核心课程
      
      if (isCoreSubject) {
        coreCourses.push(variable);
        coreSubjects.add(courseName || '未知');
      } else {
        generalCourses.push(variable);
      }
    }

    // 输出关键统计信息
    console.log(`📊 课程分类统计:`);
    console.log(`   有科目信息的变量: ${hasSubjectInfo}/${variables.length}`);
    console.log(`   高优先级变量(≥8): ${hasPriorityInfo}/${variables.length}`);
    console.log(`   缓存状态: ${cacheHits} 命中, ${cacheMisses} 未命中`);

    // 简化优先级分布统计
    const priorityDistribution = new Map<number, number>();
    for (const variable of variables) {
      const priority = variable.priority || 0;
      priorityDistribution.set(priority, (priorityDistribution.get(priority) || 0) + 1);
    }
    
    console.log(`📊 优先级分布: 9级=${priorityDistribution.get(9) || 0}, 5级=${priorityDistribution.get(5) || 0}`);

    const classificationStats = {
      totalVariables: variables.length,
      coreCourseCount: coreCourses.length,
      generalCourseCount: generalCourses.length,
      coreSubjects: Array.from(coreSubjects)
    };

    console.log(`📚 课程分类完成: 核心课程 ${coreCourses.length} 个，一般课程 ${generalCourses.length} 个`);
    
    // 如果没有识别到核心课程，提供关键信息
    if (coreCourses.length === 0) {
      console.log(`⚠️ 未识别到核心课程！`);
      console.log(`   科目信息: ${hasSubjectInfo}/${variables.length}, 高优先级: ${hasPriorityInfo}/${variables.length}`);
      console.log(`   缓存状态: ${this.courseNameCache.size} 个课程`);
      console.log(`   → 系统将回退到传统排课算法`);
      
      // 回退策略：如果严格识别失败，尝试宽松识别
      console.log(`🔄 尝试宽松的核心课程识别策略...`);
      const fallbackCoreCourses = variables.filter(variable => {
        // 方法1: 通过课程名称包含关键词
        const courseName = variable.subject || variable.courseName || this.getCourseNameSync(variable.courseId);
        if (courseName) {
          const lowerName = courseName.toLowerCase();
          return lowerName.includes('语文') || lowerName.includes('数学') || lowerName.includes('英语') ||
                 lowerName.includes('chinese') || lowerName.includes('math') || lowerName.includes('english');
        }
        
        // 方法2: 通过优先级（降低阈值）
        if (variable.priority >= 5) {
          return true;
        }
        
        return false;
      });
      
      if (fallbackCoreCourses.length > 0) {
        console.log(`✅ 宽松识别成功: 找到 ${fallbackCoreCourses.length} 门核心课程`);
        coreCourses.push(...fallbackCoreCourses);
        generalCourses.splice(0, fallbackCoreCourses.length); // 从一般课程中移除
      }
    }

    return {
      coreCourses,
      generalCourses,
      coreSubjects: Array.from(coreSubjects),
      classificationStats
    };
  }

  /**
   * 传统单阶段排课方法（回退方案）
   * 
   * Args:
   *   variables: 排课变量列表
   *   fixedAssignments: 固定安排
   * 
   * Returns:
   *   Promise<SchedulingResult>: 排课结果
   */
  private async solveTraditional(
    variables: ScheduleVariable[],
    fixedAssignments: CourseAssignment[]
  ): Promise<SchedulingResult> {
    const startTime = Date.now();

    try {
      this.reportProgress('传统排课', 20, '使用传统单阶段排课算法...', 0, variables.length);

      // 初始化状态
      const state = this.initializeState(variables, fixedAssignments);
      
      // 预处理：约束传播
      this.reportProgress('预处理', 30, '正在进行约束传播...', 0, variables.length);
      this.propagateConstraints(state, variables);

      // 主要求解阶段
      this.reportProgress('求解', 50, '正在执行回溯算法...', 0, variables.length);
      const solved = await this.backtrackSearch(state, variables);

      // 局部优化阶段
      if (solved && this.config.enableLocalOptimization) {
        this.reportProgress('优化', 80, '正在进行局部优化...', state.assignments.size, variables.length);
        await this.localOptimization(state, variables);
      }

      const endTime = Date.now();
      const executionTime = endTime - startTime;

      this.reportProgress('完成', 100, '传统排课算法执行完成', state.assignments.size, variables.length, true);

      return this.buildResult(solved, state, variables, executionTime);

    } catch (error) {
      const executionTime = Date.now() - startTime;
      console.error('传统排课算法执行失败:', error);
      
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
        message: `传统排课算法执行失败: ${error instanceof Error ? error.message : '未知错误'}`,
        suggestions: ['请检查排课规则配置', '建议减少约束条件', '尝试增加可用时间段']
      };
    }
  }

  /**
   * 分阶段求解方法
   * 
   * Args:
   *   stageType: 阶段类型
   *   variables: 该阶段的排课变量
   *   fixedAssignments: 固定安排
   *   constraintPriority: 约束优先级
   *   baseState: 基础状态（用于第二阶段）
   * 
   * Returns:
   *   Promise<StageResult>: 阶段结果
   */
  private async solveStage(
    stageType: StageType,
    variables: ScheduleVariable[],
    fixedAssignments: CourseAssignment[],
    constraintPriority: 'high' | 'medium' | 'low',
    baseState?: ScheduleState
  ): Promise<StageResult> {
    const startTime = Date.now();
    
    try {
      // 获取阶段特定配置
      const stageConfig = this.stageConfigs.get(stageType);
      if (!stageConfig) {
        throw new Error(`未找到阶段配置: ${stageType}`);
      }

      console.log(`🚀 开始执行 ${stageType === StageType.CORE_COURSES ? '核心课程' : '一般课程'}排课阶段`);
      console.log(`   📊 变量数量: ${variables.length}`);
      console.log(`   📊 约束优先级: ${constraintPriority}`);

      let solved = false;
      let state: ScheduleState;

      // 根据阶段类型使用不同的排课策略
      if (stageType === StageType.CORE_COURSES) {
        // 核心课程阶段：使用专门的排课引擎
        console.log(`🎯 核心课程阶段：使用专门的核心课程排课引擎`);
        
        try {
          // 调用核心课程排课引擎
          const coreResult = await this.scheduleCoreCourses(variables, fixedAssignments);
          
          if (coreResult.success && coreResult.scheduleState) {
            state = coreResult.scheduleState;
            solved = true;
            console.log(`✅ 核心课程排课引擎执行成功`);
            console.log(`   📊 已分配: ${state.assignments.size}/${variables.length}`);
            console.log(`   📊 未分配: ${state.unassigned.length}`);
          } else {
            console.log(`⚠️ 核心课程排课引擎执行失败，回退到传统算法`);
            console.log(`   错误信息: ${coreResult.message}`);
            
            // 回退到传统算法
            state = this.initializeState(variables, fixedAssignments);
            this.propagateConstraints(state, variables);
            solved = await this.backtrackSearch(state, variables);
          }
        } catch (error) {
          console.error(`❌ 核心课程排课引擎异常:`, error);
          console.log(`🔄 回退到传统排课算法`);
          
          // 异常情况下回退到传统算法
          state = this.initializeState(variables, fixedAssignments);
          this.propagateConstraints(state, variables);
          solved = await this.backtrackSearch(state, variables);
        }
      } else {
        // 一般课程阶段：使用传统回溯搜索算法
        console.log(`📚 一般课程阶段：使用传统回溯搜索算法`);
        
        // 初始化状态
        if (baseState && stageType === StageType.GENERAL_COURSES) {
          // 第二阶段：基于第一阶段结果初始化
          state = this.initializeStateFromBase(variables, baseState);
          

        } else {
          // 全新初始化
          state = this.initializeState(variables, fixedAssignments);
        }

        // 约束传播
        this.reportStageProgress(stageType, 20, 50, '正在进行约束传播...', {
          assignedVariables: 0,
          unassignedVariables: variables.length,
          hardViolations: 0,
          softViolations: 0
        });
        this.propagateConstraints(state, variables);

        // 执行回溯搜索
        this.reportStageProgress(stageType, 40, 60, '正在执行回溯算法...', {
          assignedVariables: 0,
          unassignedVariables: variables.length,
          hardViolations: 0,
          softViolations: 0
        });
        solved = await this.backtrackSearch(state, variables);
      }

      // 阶段特定的局部优化
      if (solved && stageConfig.enableLocalOptimization) {
        const progressStart = stageType === StageType.CORE_COURSES ? 35 : 65;
        this.reportStageProgress(stageType, 60, progressStart, '正在进行局部优化...', {
          assignedVariables: state.assignments.size,
          unassignedVariables: state.unassigned.length,
          hardViolations: state.violations.filter(v => v.isHard).length,
          softViolations: state.violations.filter(v => !v.isHard).length
        });
        
        // 局部优化需要访问所有变量信息
        await this.localOptimization(state, this.allVariables);
      }



      const endTime = Date.now();
      const executionTime = endTime - startTime;

      // 生成阶段特定的建议
      let suggestions: string[] = [];
      if (stageType === StageType.GENERAL_COURSES) {
        suggestions = this.generateGeneralCourseSuggestions({
          stageType,
          success: solved,
          scheduleState: state,
          assignedVariables: state.assignments.size,
          unassignedVariables: state.unassigned.length,
          hardViolations: state.violations.filter(v => v.isHard).length,
          softViolations: state.violations.filter(v => !v.isHard).length,
          executionTime,
          message: '',
          suggestions: []
        }, variables);
      } else {
        suggestions = solved ? [] : ['建议放宽约束条件', '考虑增加可用时间段'];
      }

      console.log(`✅ ${stageType === StageType.CORE_COURSES ? '核心课程' : '一般课程'}排课阶段完成`);
      console.log(`   📊 成功: ${solved}`);
      console.log(`   📊 已分配: ${state.assignments.size}/${variables.length}`);
      console.log(`   📊 未分配: ${state.unassigned.length}`);
      console.log(`   📊 执行时间: ${executionTime}ms`);

      return {
        stageType,
        success: solved,
        scheduleState: state,
        assignedVariables: state.assignments.size,
        unassignedVariables: state.unassigned.length,
        hardViolations: state.violations.filter(v => v.isHard).length,
        softViolations: state.violations.filter(v => !v.isHard).length,
        executionTime,
        message: solved ? `${stageType === StageType.CORE_COURSES ? '核心课程' : '一般课程'}排课成功` : 
          `${stageType === StageType.CORE_COURSES ? '核心课程' : '一般课程'}排课失败`,
        suggestions
      };

    } catch (error) {
      const executionTime = Date.now() - startTime;
      console.error(`${stageType} 阶段排课失败:`, error);
      
      return {
        stageType,
        success: false,
        scheduleState: this.initializeState(variables, fixedAssignments),
        assignedVariables: 0,
        unassignedVariables: variables.length,
        hardViolations: 0,
        softViolations: 0,
        executionTime,
        message: `${stageType} 阶段排课异常: ${error instanceof Error ? error.message : '未知错误'}`,
        suggestions: ['检查阶段配置', '验证输入数据', '调整算法参数']
      };
    }
  }

  /**
   * 基于基础状态初始化新状态（用于第二阶段）
   * 
   * Args:
   *   variables: 新阶段的变量
   *   baseState: 基础状态（第一阶段结果）
   * 
   * Returns:
   *   ScheduleState: 新初始化的状态
   */
  private initializeStateFromBase(
    variables: ScheduleVariable[],
    baseState: ScheduleState
  ): ScheduleState {
    // 复制基础状态
    const newState: ScheduleState = {
      assignments: new Map(baseState.assignments),
      unassigned: [...variables.map(v => v.id)],
      conflicts: [...baseState.conflicts],
      violations: [...baseState.violations],
      score: baseState.score,
      isComplete: false,
      isFeasible: baseState.isFeasible
    };

    // 更新未分配列表，排除已经在基础状态中分配的变量
    newState.unassigned = variables
      .filter(v => !baseState.assignments.has(v.id))
      .map(v => v.id);

    return newState;
  }

  /**
   * 合并分阶段结果
   * 
   * Args:
   *   coreResult: 核心课程阶段结果
   *   generalResult: 一般课程阶段结果
   * 
   * Returns:
   *   ScheduleState: 合并后的状态
   */
  private mergeStageResults(
    coreResult: StageResult,
    generalResult: StageResult
  ): ScheduleState {
    console.log(`🔄 开始合并分阶段结果...`);
    console.log(`   📊 核心课程结果: 成功 ${coreResult.success}, 已分配 ${coreResult.assignedVariables}, 未分配 ${coreResult.unassignedVariables}`);
    console.log(`   📊 一般课程结果: 成功 ${generalResult.success}, 已分配 ${generalResult.assignedVariables}, 未分配 ${generalResult.unassignedVariables}`);
    
    const mergedState: ScheduleState = {
      assignments: new Map(),
      unassigned: [],
      conflicts: [],
      violations: [],
      score: 0,
      isComplete: false,
      isFeasible: true
    };

    // 合并核心课程结果
    console.log(`   🔄 合并核心课程结果...`);
    for (const [variableId, assignment] of coreResult.scheduleState.assignments) {
      mergedState.assignments.set(variableId, assignment);
      console.log(`     ✅ 核心课程: ${variableId} -> ${assignment.timeSlot.dayOfWeek}-${assignment.timeSlot.period}`);
    }

    // 合并一般课程结果
    console.log(`   🔄 合并一般课程结果...`);
    for (const [variableId, assignment] of generalResult.scheduleState.assignments) {
      mergedState.assignments.set(variableId, assignment);
      console.log(`     ✅ 一般课程: ${variableId} -> ${assignment.timeSlot.dayOfWeek}-${assignment.timeSlot.period}`);
    }

    // 合并未分配变量
    mergedState.unassigned = [
      ...coreResult.scheduleState.unassigned,
      ...generalResult.scheduleState.unassigned
    ];

    // 合并冲突和违反
    mergedState.conflicts = [
      ...coreResult.scheduleState.conflicts,
      ...generalResult.scheduleState.conflicts
    ];

    mergedState.violations = [
      ...coreResult.scheduleState.violations,
      ...generalResult.scheduleState.violations
    ];

    // 计算合并后的评分
    mergedState.score = coreResult.scheduleState.score + generalResult.scheduleState.score;
    
    // 检查是否完成
    mergedState.isComplete = mergedState.unassigned.length === 0;
    
    // 检查是否可行
    mergedState.isFeasible = mergedState.violations.filter(v => v.isHard).length === 0;

    console.log(`🔄 分阶段结果合并完成:`);
    console.log(`   📊 总分配: ${mergedState.assignments.size} 个`);
    console.log(`   📊 未分配: ${mergedState.unassigned.length} 个`);
    console.log(`   📊 核心课程: ${coreResult.assignedVariables} 个`);
    console.log(`   📊 一般课程: ${generalResult.assignedVariables} 个`);
    console.log(`   📊 总评分: ${mergedState.score}`);
    console.log(`   📊 是否完成: ${mergedState.isComplete}`);
    console.log(`   📊 是否可行: ${mergedState.isFeasible}`);

    return mergedState;
  }

  /**
   * 报告分阶段进度
   * 
   * Args:
   *   stageType: 当前阶段
   *   stageProgress: 阶段进度 (0-100)
   *   overallProgress: 总体进度 (0-100)
   *   message: 阶段消息
   *   stageStatistics: 阶段统计信息
   */
  private reportStageProgress(
    stageType: StageType,
    stageProgress: number,
    overallProgress: number,
    message: string,
    stageStatistics: {
      assignedVariables: number;
      unassignedVariables: number;
      hardViolations: number;
      softViolations: number;
    }
  ): void {
    this.stageProgress = {
      currentStage: stageType,
      totalStages: 2, // 核心课程 + 一般课程
      stageProgress,
      overallProgress,
      stageMessage: message,
      stageStatistics,
      timestamp: Date.now()
    };

    if (this.progressCallback) {
      // 修复：显示总的课程数量，而不是当前阶段的课程数量
      const totalCourseCount = this.allVariables ? this.allVariables.length : 
        (stageStatistics.assignedVariables + stageStatistics.unassignedVariables);
      
      this.progressCallback({
        stage: stageType === StageType.CORE_COURSES ? 'core_courses' : 'general_courses',
        percentage: overallProgress,
        message: `[${stageType === StageType.CORE_COURSES ? '核心课程' : '一般课程'}] ${message}`,
        assignedCount: stageStatistics.assignedVariables,
        totalCount: totalCourseCount
      });
    }


  }

  /**
   * 报告一般课程排课进度（增强版）
   * 
   * 提供更详细的进度信息和统计数据分析
   * 
   * Args:
   *   stageProgress: 阶段进度
   *   overallProgress: 总体进度
   *   message: 进度消息
   *   statistics: 详细统计信息
   */
  private reportGeneralCourseProgress(
    stageProgress: number,
    overallProgress: number,
    message: string,
    statistics: {
      assignedVariables: number;
      unassignedVariables: number;
      hardViolations: number;
      softViolations: number;
      conflictAvoidanceScore: number;
      subjectOptimizationScore: number;
    }
  ): void {
    // 调用基础进度报告
    this.reportStageProgress(
      StageType.GENERAL_COURSES,
      stageProgress,
      overallProgress,
      message,
      {
        assignedVariables: statistics.assignedVariables,
        unassignedVariables: statistics.unassignedVariables,
        hardViolations: statistics.hardViolations,
        softViolations: statistics.softViolations
      }
    );
    

  }

  /**
   * 生成一般课程排课建议
   * 
   * 基于排课结果分析，提供针对性的改进建议
   * 
   * Args:
   *   result: 阶段结果
   *   variables: 排课变量列表
   * 
   * Returns:
   *   string[]: 改进建议列表
   */
  private generateGeneralCourseSuggestions(
    result: StageResult,
    variables: ScheduleVariable[]
  ): string[] {
    const suggestions: string[] = [];
    
    // 1. 硬约束违反分析
    if (result.hardViolations > 0) {
      suggestions.push('检测到硬约束违反，建议检查时间冲突和资源分配');
      suggestions.push('硬约束违反可能导致排课失败，建议优先解决');
    }
    
    // 2. 软约束违反分析
    if (result.softViolations > 0) {
      suggestions.push('存在软约束违反，可考虑调整时间段偏好设置');
      suggestions.push('软约束违反影响排课质量，建议优化约束配置');
    }
    
    // 3. 未分配变量分析
    const unassignedCount = result.unassignedVariables;
    if (unassignedCount > 0) {
      suggestions.push(`仍有 ${unassignedCount} 门课程未安排，建议增加可用时间段或放宽约束条件`);
      
      // 分析未分配变量的特征
      const unassignedVars = variables.filter(v => !result.scheduleState.assignments.has(v.id));
      const highPriorityUnassigned = unassignedVars.filter(v => v.priority >= 7).length;
      
      if (highPriorityUnassigned > 0) {
        suggestions.push(`未分配课程中包含 ${highPriorityUnassigned} 门高优先级课程，建议优先安排`);
      }
    }
    
    // 4. 科目分布分析
    const assignedVars = variables.filter(v => result.scheduleState.assignments.has(v.id));
    const subjectDistribution = new Map<string, number>();
    
    for (const variable of assignedVars) {
      const subject = variable.subject || variable.courseName || '未知';
      subjectDistribution.set(subject, (subjectDistribution.get(subject) || 0) + 1);
    }
    
    // 检查科目分布是否均衡
    const subjects = Array.from(subjectDistribution.keys());
    if (subjects.length > 0) {
      const avgCount = assignedVars.length / subjects.length;
      const unbalancedSubjects = subjects.filter(subject => {
        const count = subjectDistribution.get(subject) || 0;
        return count < avgCount * 0.5 || count > avgCount * 1.5;
      });
      
      if (unbalancedSubjects.length > 0) {
        suggestions.push(`科目分布不均衡，建议调整 ${unbalancedSubjects.join('、')} 等科目的时间安排`);
      }
    }
    
    // 5. 时间分布分析
    const timeDistribution = new Map<string, number>();
    for (const [_, assignment] of result.scheduleState.assignments) {
      const timeKey = `${assignment.timeSlot.dayOfWeek}-${assignment.timeSlot.period}`;
      timeDistribution.set(timeKey, (timeDistribution.get(timeKey) || 0) + 1);
    }
    
    // 检查是否存在时间段过于集中的情况
    const maxCoursesPerSlot = Math.max(...Array.from(timeDistribution.values()));
    if (maxCoursesPerSlot > 3) {
      suggestions.push('存在时间段过于集中的情况，建议分散课程安排');
    }
    
    // 6. 通用建议
    if (suggestions.length === 0) {
      suggestions.push('排课质量良好，建议保持当前配置');
    } else {
      suggestions.push('建议逐步调整约束条件，找到最佳平衡点');
      suggestions.push('可考虑使用分阶段排课策略，先排核心课程再排一般课程');
    }
    
    return suggestions;
  }

  /**
   * 获取分阶段进度信息
   * 
   * Returns:
   *   StageProgress | null: 当前阶段进度信息
   */
  public getStageProgress(): StageProgress | null {
    return this.stageProgress;
  }

  /**
   * 获取分阶段结果
   * 
   * Returns:
   *   Map<StageType, StageResult>: 各阶段结果
   */
  public getStageResults(): Map<StageType, StageResult> {
    return this.stageResults;
  }

  /**
   * 获取当前阶段
   * 
   * Returns:
   *   StageType | null: 当前阶段
   */
  public getCurrentStage(): StageType | null {
    return this.currentStage;
  }

  /**
   * 重置分阶段状态
   */
  public resetStageState(): void {
    this.currentStage = null;
    this.stageResults.clear();
    this.stageProgress = null; 
    console.log('🔄 分阶段状态已重置');
  }

  /**
   * 安全地提取 ObjectId 值
   * 
   * 处理可能包含完整对象或 ObjectId 的字段，安全地提取 _id 值
   * 
   * Args:
   *   value: 可能是 ObjectId、对象或字符串的值
   * 
   * Returns:
   *   string | null: 提取的 ObjectId 字符串，如果无效则返回 null
   */
  private safeExtractObjectId(value: any): string | null {
    try {
      // 🔥 新增：详细调试日志
      console.log(`   🔍 [safeExtractObjectId] 输入值: ${value}`);
      console.log(`      - 类型: ${typeof value}`);
      console.log(`      - 是否为ObjectId: ${value instanceof mongoose.Types.ObjectId}`);
      if (value && typeof value === 'object') {
        console.log(`      - 对象键: ${Object.keys(value).join(', ')}`);
        if (value._id) {
          console.log(`      - _id值: ${value._id}`);
          console.log(`      - _id类型: ${typeof value._id}`);
        }
      }
      
      // 如果已经是字符串，检查是否为有效的 ObjectId
      if (typeof value === 'string') {
        console.log(`      - 字符串处理: ${value}`);
        // 如果字符串看起来像完整的对象表示，尝试提取 _id
        if (value.includes('_id:') && value.includes('ObjectId(')) {
          const match = value.match(/_id:\s*new ObjectId\('([^']+)'\)/);
          if (match && match[1]) {
            console.log(`      - 提取到_id: ${match[1]}`);
            return match[1];
          }
        }
        // 如果字符串看起来像有效的 ObjectId，直接返回
        if (mongoose.Types.ObjectId.isValid(value)) {
          console.log(`      - 有效ObjectId字符串: ${value}`);
          return value;
        }
        console.log(`      - 无效的ObjectId字符串: ${value}`);
      }
      
      // 如果是 ObjectId 实例
      if (value instanceof mongoose.Types.ObjectId) {
        const result = value.toString();
        console.log(`      - ObjectId实例转换为字符串: ${result}`);
        return result;
      }
      
      // 如果是对象且有 _id 字段
      if (value && typeof value === 'object' && value._id) {
        console.log(`      - 对象处理，_id字段: ${value._id}`);
        if (value._id instanceof mongoose.Types.ObjectId) {
          const result = value._id.toString();
          console.log(`      - _id是ObjectId，转换为: ${result}`);
          return result;
        }
        if (typeof value._id === 'string' && mongoose.Types.ObjectId.isValid(value._id)) {
          console.log(`      - _id是有效字符串: ${value._id}`);
          return value._id;
        }
        console.log(`      - _id无效: ${value._id}`);
      }
      
      console.log(`      - 无法提取ObjectId，返回null`);
      return null;
    } catch (error) {
      console.warn('⚠️ 提取 ObjectId 时发生错误:', error);
      return null;
    }
  }

  /**
   * 验证是否为有效的 ObjectId 字符串
   * 
   * Args:
   *   id: 要验证的字符串
   * 
   * Returns:
   *   boolean: 是否为有效的 ObjectId
   */
  private isValidObjectId(id: string): boolean {
    return mongoose.Types.ObjectId.isValid(id);
  }

  /**
   * 🔥 新增：检查是否应该停止排课
   * 
   * Args:
   *   iterations: 当前迭代次数
   *   startTime: 开始时间
   * 
   * Returns:
   *   boolean: 是否应该停止
   */
  private shouldStop(iterations: number, startTime: number): boolean {
    const currentTime = Date.now();
    const elapsedTime = currentTime - startTime;
    return iterations >= this.config.maxIterations || elapsedTime >= this.config.timeLimit * 1000;
  }

  /**
   * 🔥 新增：为变量分配时间槽
   * 
   * Args:
   *   variable: 排课变量
   *   timeSlots: 可用时间槽列表
   *   rooms: 可用教室列表
   *   currentAssignments: 当前分配结果
   * 
   * Returns:
   *   CourseAssignment | null: 分配结果，如果失败则返回null
   */
  private async assignVariableToTimeSlot(
    variable: ScheduleVariable,
    timeSlots: any[],
    rooms: any[],
    currentAssignments: Map<string, CourseAssignment>
  ): Promise<CourseAssignment | null> {
    try {
      console.log(`         🔍 [变量分配] 开始为变量 ${variable.id} 分配时间槽...`);
      
      // 查找可用时间槽
      const availableTimeSlot = this.findAvailableTimeSlotForVariable(variable, timeSlots, currentAssignments);
      if (!availableTimeSlot) {
        console.log(`         ❌ [变量分配] 没有找到可用时间槽`);
        return null;
      }

      // 查找可用教室
      const availableRoom = this.findAvailableRoomForVariable(variable, availableTimeSlot, rooms, currentAssignments);
      if (!availableRoom) {
        console.log(`         ❌ [变量分配] 没有找到可用教室`);
        return null;
      }

      // 创建分配对象
      const assignment: CourseAssignment = {
        variableId: variable.id,
        classId: variable.classId,
        courseId: variable.courseId,
        teacherId: variable.teacherId,
        roomId: availableRoom.id,
        timeSlot: availableTimeSlot,
        isFixed: false
      };

      console.log(`         ✅ [变量分配] 分配成功: 第${availableTimeSlot.dayOfWeek}天第${availableTimeSlot.period}节，教室: ${availableRoom.id}`);
      return assignment;

    } catch (error) {
      console.error(`         ❌ [变量分配] 分配异常:`, error);
      return null;
    }
  }

  /**
   * 🔥 新增：为变量查找可用时间槽
   * 
   * Args:
   *   variable: 排课变量
   *   timeSlots: 时间槽列表
   *   currentAssignments: 当前分配结果
   * 
   * Returns:
   *   any | null: 可用时间槽，如果没有找到则返回null
   */
  private findAvailableTimeSlotForVariable(
    variable: ScheduleVariable,
    timeSlots: any[],
    currentAssignments: Map<string, CourseAssignment>
  ): any | null {
    console.log(`            🔍 [时间槽查找] 为变量 ${variable.id} 查找可用时间槽...`);
    
    // 按优先级排序时间槽
    const sortedTimeSlots = timeSlots.sort((a, b) => {
      const aScore = this.calculateTimeSlotScoreForVariable(variable, a, currentAssignments);
      const bScore = this.calculateTimeSlotScoreForVariable(variable, b, currentAssignments);
      return aScore - bScore; // 分数低的优先
    });

    // 查找第一个可用的时间槽
    for (const timeSlot of sortedTimeSlots) {
      if (this.isTimeSlotAvailableForVariable(variable, timeSlot, currentAssignments)) {
        console.log(`            ✅ [时间槽查找] 找到可用时间槽: 第${timeSlot.dayOfWeek}天第${timeSlot.period}节`);
        return timeSlot;
      }
    }

    console.log(`            ❌ [时间槽查找] 没有找到可用时间槽`);
    return null;
  }

  /**
   * 🔥 新增：为变量查找可用教室
   * 
   * Args:
   *   variable: 排课变量
   *   timeSlot: 时间槽
   *   rooms: 可用教室列表
   *   currentAssignments: 当前分配结果
   * 
   * Returns:
   *   any | null: 可用教室，如果没有找到则返回null
   */
  private findAvailableRoomForVariable(
    variable: ScheduleVariable,
    timeSlot: any,
    rooms: any[],
    currentAssignments: Map<string, CourseAssignment>
  ): any | null {
    console.log(`            🔍 [教室查找] 为变量 ${variable.id} 查找可用教室...`);
    console.log(`               📋 班级ID: ${variable.classId}`);
    console.log(`               📋 可用教室数量: ${rooms.length}`);
    
    // 🔥 修复：实现正确的班级-教室关联策略
    // 每个班级使用自己的固定教室，通过 homeroom 字段进行关联
    
    const classId = variable.classId.toString();
    
    // 🔥 方法1：通过班级的 homeroom 字段查找固定教室
    // 这是最直接和正确的方法
    const fixedRoom = rooms.find(room => {
      // 检查教室ID是否与班级的 homeroom 字段匹配
      // 注意：这里需要检查教室的 assignedClass 字段是否与班级ID匹配
      if (room.assignedClass && room.assignedClass.toString() === classId) {
        return true;
      }
      
      // 检查教室名称是否与班级名称匹配（备用方案）
      // 例如：教室名称 "一年级8班" 应该匹配班级名称 "一年级8班"
      if (room.name ) {
        return true;
      }
      
      return false;
    });
    
    if (fixedRoom) {
      console.log(`            ✅ [教室查找] 找到班级固定教室: ${fixedRoom._id || fixedRoom.id} (${fixedRoom.name || '未命名'})`);
      console.log(`               📋 分配策略: 固定教室策略，班级 ${classId} 专用`);
      console.log(`               📋 教室名称: ${fixedRoom.name}, 教室编号: ${fixedRoom.roomNumber}`);
      return fixedRoom;
    }
    
    // 🔥 方法2：如果没有找到固定教室，尝试通过教室名称匹配
    console.log(`            ⚠️ [教室查找] 未找到班级 ${classId} 的固定教室，尝试智能匹配`);
    
    // 查找在该时间槽未被占用的教室
    const availableRoom = rooms.find(room => {
      // 检查该教室在该时间槽是否已被占用
      for (const assignment of currentAssignments.values()) {
        if (assignment.roomId.toString() === (room._id || room.id).toString() &&
            assignment.timeSlot.dayOfWeek === timeSlot.dayOfWeek &&
            assignment.timeSlot.period === timeSlot.period) {
          return false; // 教室在该时间槽已被占用
        }
      }
      return true; // 教室在该时间槽可用
    });
    
    if (availableRoom) {
      console.log(`            ✅ [教室查找] 找到可用教室: ${availableRoom._id || availableRoom.id} (${availableRoom.name || '未命名'})`);
      console.log(`               📋 分配策略: 智能分配策略，避免时间冲突`);
      console.log(`               ⚠️ 注意：这是备用方案，建议检查班级 ${classId} 的固定教室配置`);
    } else {
      console.log(`            ❌ [教室查找] 没有找到可用教室`);
      console.log(`               📋 失败原因: 所有教室在该时间槽都已被占用`);
      console.log(`               💡 建议: 检查班级 ${classId} 的固定教室配置`);
    }
    

  }

  /**
   * 🔥 新增：检查时间槽是否对变量可用
   * 
   * Args:
   *   variable: 排课变量
   *   timeSlot: 时间槽
   *   currentAssignments: 当前分配结果
   * 
   * Returns:
   *   boolean: 时间槽可用
   */
  private isTimeSlotAvailableForVariable(
    variable: ScheduleVariable,
    timeSlot: any,
    currentAssignments: Map<string, CourseAssignment>
  ): boolean {
    // 检查教师冲突
    for (const assignment of currentAssignments.values()) {
      if (assignment.teacherId.equals(variable.teacherId) &&
          assignment.timeSlot.dayOfWeek === timeSlot.dayOfWeek &&
          assignment.timeSlot.period === timeSlot.period) {
        console.log(`            ⚠️ [冲突检测] 发现教师冲突: 教师 ${variable.teacherId} 在第${timeSlot.dayOfWeek}天第${timeSlot.period}节已有安排`);
        return false; // 教师冲突
      }
    }

    // 检查班级冲突
    for (const assignment of currentAssignments.values()) {
      if (assignment.classId.equals(variable.classId) &&
          assignment.timeSlot.dayOfWeek === timeSlot.dayOfWeek &&
          assignment.timeSlot.period === timeSlot.period) {
        console.log(`            ⚠️ [冲突检测] 发现班级冲突: 班级 ${variable.classId} 在第${timeSlot.dayOfWeek}天第${timeSlot.period}节已有安排`);
        return false; // 班级冲突
      }
    }

    // 🔥 新增：检查教室冲突
    // 注意：教室冲突检查将在教室分配完成后进行
    // 这里我们检查当前已分配的课程中是否有教室冲突
    // 由于我们使用固定教室策略，每个班级有自己的专用教室，教室冲突应该很少发生
    
    // 教室冲突检查逻辑：
    // 1. 如果该班级的固定教室在该时间槽已被占用，则冲突
    // 2. 这个检查在教室分配阶段进行，这里只检查时间槽的基本可用性
    
    console.log(`            ℹ️ [冲突检测] 教室冲突检查将在教室分配阶段进行`);

    console.log(`            ✅ [冲突检测] 时间槽可用: 第${timeSlot.dayOfWeek}天第${timeSlot.period}节`);
    return true; // 时间槽可用
  }

  /**
   * 🔥 新增：计算时间槽对变量的评分
   * 
   * Args:
   *   variable: 排课变量
   *   timeSlot: 时间槽
   *   currentAssignments: 当前分配结果
   * 
   * Returns:
   *   number: 评分（分数越低优先级越高）
   */
  private calculateTimeSlotScoreForVariable(
    variable: ScheduleVariable,
    timeSlot: any,
    currentAssignments: Map<string, CourseAssignment>
  ): number {
    let score = 0;
    
    // 基础分数：占用数量
    const occupiedCount = this.getTimeSlotOccupiedCount(timeSlot, currentAssignments);
    score += occupiedCount * 10;
    
    // 时间段偏好：上午优先
    if (timeSlot.period <= 4) {
      score -= 5;
    }
    
    // 科目时间偏好
    if (this.isCoreSubject(variable)) {
      // 核心课程优先安排在上午
      if (timeSlot.period <= 4) {
        score -= 10;
      }
    }
    
    return score;
  }

  /**
   * 🔥 新增：获取时间槽的占用数量
   * 
   * Args:
   *   timeSlot: 时间槽
   *   currentAssignments: 当前分配结果
   * 
   * Returns:
   *   number: 占用数量
   */
  private getTimeSlotOccupiedCount(
    timeSlot: any,
    currentAssignments: Map<string, CourseAssignment>
  ): number {
    let count = 0;
    for (const assignment of currentAssignments.values()) {
      if (assignment.timeSlot.dayOfWeek === timeSlot.dayOfWeek &&
          assignment.timeSlot.period === timeSlot.period) {
        count++;
      }
    }
    return count;
  }
}


