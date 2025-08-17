import mongoose from 'mongoose';
import { K12SchedulingEngine } from './k12-scheduling-engine';
import { K12ScheduleResult, K12SchedulingConfig, K12SchedulingProgress } from './types';

/**
 * K12排课服务
 * 
 * 提供K12排课的完整服务接口，整合所有排课组件
 */
export class K12SchedulingService {
  private engine: K12SchedulingEngine;
  private config: K12SchedulingConfig;

  constructor(config?: Partial<K12SchedulingConfig>) {
    this.engine = new K12SchedulingEngine();
    this.config = this.getDefaultConfig();
    
    if (config) {
      this.config = { ...this.config, ...config };
    }
  }

  /**
   * 执行K12排课
   * 
   * @param teachingPlans 教学计划数据
   * @param schedulingRules 排课规则数据
   * @param timeSlots 可用时间槽
   * @param rooms 可用教室
   * @param progressCallback 进度回调函数
   * @returns 排课结果
   */
  async schedule(
    teachingPlans: any[],
    schedulingRules: any[],
    timeSlots: any[],
    rooms: any[],
    progressCallback?: (progress: K12SchedulingProgress) => void
  ): Promise<K12ScheduleResult> {
    console.log('🚀 [K12排课服务] 开始执行K12排课');
    console.log(`   📊 教学计划: ${teachingPlans.length} 个`);
    console.log(`   📊 排课规则: ${schedulingRules.length} 个`);
    console.log(`   📊 时间槽: ${timeSlots.length} 个`);
    console.log(`   📊 教室: ${rooms.length} 个`);

    // 🔍 调试：验证传入的数据结构
    if (teachingPlans.length > 0) {
      const samplePlan = teachingPlans[0];
      console.log('🔍 [K12排课服务] 验证传入的教学计划数据结构:');
      console.log(`   教学计划ID: ${samplePlan._id}`);
      console.log(`   班级字段: ${samplePlan.class ? (typeof samplePlan.class === 'object' ? '已populate' : '未populate') : 'null'}`);
      console.log(`   班级类型: ${typeof samplePlan.class}`);
      
      if (samplePlan.class && typeof samplePlan.class === 'object') {
        if ('_id' in samplePlan.class) {
          console.log(`   ⚠️ 班级只是ObjectId: ${samplePlan.class._id}`);
        } else {
          console.log(`   ✅ 班级已populate: ${(samplePlan.class as any).name}`);
        }
      }
      
      if (samplePlan.courseAssignments && samplePlan.courseAssignments.length > 0) {
        const firstAssignment = samplePlan.courseAssignments[0];
        console.log(`   第一个课程分配:`);
        console.log(`     课程: ${firstAssignment.course ? (typeof firstAssignment.course === 'object' ? '已populate' : '未populate') : 'null'}`);
        console.log(`     教师: ${firstAssignment.teacher ? (typeof firstAssignment.teacher === 'object' ? '已populate' : '未populate') : 'null'}`);
        
        if (firstAssignment.course && typeof firstAssignment.course === 'object') {
          const course = firstAssignment.course as any;
          console.log(`     课程详情: ${course.name} (${course.subject})`);
        }
      }
    }

    try {
      // 验证输入数据
      this.validateInputData(teachingPlans, schedulingRules, timeSlots, rooms);

      // 预处理数据
      const processedData = this.preprocessData(teachingPlans, schedulingRules, timeSlots, rooms);

      // 执行排课
      const result = await this.engine.schedule(
        processedData.teachingPlans,
        processedData.schedulingRules,
        processedData.timeSlots,
        processedData.rooms
      );

      // 后处理结果
      const finalResult = this.postprocessResult(result);

      console.log('🎉 [K12排课服务] 排课完成');
      console.log(`   📊 成功: ${finalResult.success}`);
      console.log(`   📊 已分配: ${finalResult.assignedVariables}`);
      console.log(`   📊 未分配: ${finalResult.unassignedVariables}`);
      console.log(`   📊 总评分: ${finalResult.totalScore}`);

      return finalResult;

    } catch (error) {
      console.error('❌ [K12排课服务] 排课过程中发生错误:', error);
      
      return {
        success: false,
        assignedVariables: 0,
        unassignedVariables: teachingPlans.length,
        hardConstraintViolations: 0,
        softConstraintViolations: 0,
        totalScore: 0,
        stageResults: new Map(),
        message: `排课失败: ${error instanceof Error ? error.message : '未知错误'}`,
        suggestions: ['检查输入数据格式', '验证约束配置', '查看详细错误日志']
      };
    }
  }

  /**
   * 验证输入数据
   */
  private validateInputData(
    teachingPlans: any[],
    schedulingRules: any[],
    timeSlots: any[],
    rooms: any[]
  ): void {
    if (!Array.isArray(teachingPlans) || teachingPlans.length === 0) {
      throw new Error('教学计划数据不能为空');
    }

    if (!Array.isArray(timeSlots) || timeSlots.length === 0) {
      throw new Error('时间槽数据不能为空');
    }

    if (!Array.isArray(rooms) || rooms.length === 0) {
      throw new Error('教室数据不能为空');
    }

    // 验证教学计划数据结构
    for (const plan of teachingPlans) {
      if (!plan.class || !plan.courseAssignments || !Array.isArray(plan.courseAssignments)) {
        throw new Error('教学计划数据结构无效');
      }
    }

    // 验证时间槽数据结构
    for (const timeSlot of timeSlots) {
      if (typeof timeSlot.dayOfWeek !== 'number' || typeof timeSlot.period !== 'number') {
        throw new Error('时间槽数据结构无效');
      }
    }

    // 验证教室数据结构
    for (const room of rooms) {
      if (!room._id) {
        throw new Error('教室数据结构无效');
      }
    }

    console.log('✅ [数据验证] 输入数据验证通过');
  }

  /**
   * 预处理数据
   */
  private preprocessData(
    teachingPlans: any[],
    schedulingRules: any[],
    timeSlots: any[],
    rooms: any[]
  ): {
    teachingPlans: any[];
    schedulingRules: any[];
    timeSlots: any[];
    rooms: any[];
  } {
    console.log('🔧 [数据预处理] 开始预处理数据...');

    // 🔍 调试：验证预处理前的数据
    if (teachingPlans.length > 0) {
      const samplePlan = teachingPlans[0];
      console.log('🔍 [数据预处理] 预处理前的教学计划数据结构:');
      console.log(`   教学计划ID: ${samplePlan._id}`);
      console.log(`   班级字段: ${samplePlan.class ? (typeof samplePlan.class === 'object' ? '已populate' : '未populate') : 'null'}`);
      console.log(`   班级类型: ${typeof samplePlan.class}`);
      
      if (samplePlan.class && typeof samplePlan.class === 'object') {
        if ('_id' in samplePlan.class) {
          console.log(`   ⚠️ 班级只是ObjectId: ${samplePlan.class._id}`);
        } else {
          console.log(`   ✅ 班级已populate: ${(samplePlan.class as any).name}`);
        }
      }
    }

    // 🔥 修复：确保不破坏已经populate的数据结构
    const processedTeachingPlans = teachingPlans.map(plan => {
      // 验证班级数据是否已populate
      if (!plan.class || typeof plan.class !== 'object') {
        console.log(`   ⚠️ 教学计划 ${plan._id} 的班级数据未populate，跳过处理`);
        return plan; // 返回原始数据，不进行预处理
      }

      // 验证课程分配数据是否已populate
      if (!plan.courseAssignments || !Array.isArray(plan.courseAssignments)) {
        console.log(`   ⚠️ 教学计划 ${plan._id} 的课程分配数据无效，跳过处理`);
        return plan;
      }

      // 检查第一个课程分配是否已populate
      const firstAssignment = plan.courseAssignments[0];
      if (!firstAssignment || !firstAssignment.course || !firstAssignment.teacher) {
        console.log(`   ⚠️ 教学计划 ${plan._id} 的课程/教师数据未populate，跳过处理`);
        return plan;
      }

      // 验证课程和教师是否为对象（已populate）
      if (typeof firstAssignment.course !== 'object' || typeof firstAssignment.teacher !== 'object') {
        console.log(`   ⚠️ 教学计划 ${plan._id} 的课程/教师数据格式错误，跳过处理`);
        return plan;
      }

      console.log(`   ✅ 教学计划 ${plan._id} 数据验证通过，班级: ${plan.class.name}, 课程: ${firstAssignment.course.name}`);

      // 🔥 关键修复：使用更安全的数据复制方式，避免破坏Mongoose文档
      const processedPlan = {
        _id: plan._id,
        class: plan.class,  // 直接引用，不复制
        courseAssignments: plan.courseAssignments.map((assignment: any) => {
          // 🔥 关键修复：正确访问Mongoose子文档中的数据
          let course, teacher;
          
          // 尝试多种方式访问课程和教师数据
          if (assignment._doc && assignment._doc.course) {
            course = assignment._doc.course;
          } else if (assignment.course) {
            course = assignment.course;
          }
          
          if (assignment._doc && assignment._doc.teacher) {
            teacher = assignment._doc.teacher;
          } else if (assignment.teacher) {
            teacher = assignment.teacher;
          }
          
          // 验证数据完整性
          if (!course || !teacher) {
            console.log(`   ⚠️ 无法访问课程或教师数据:`, {
              hasDoc: !!assignment._doc,
              hasCourse: !!course,
              hasTeacher: !!teacher,
              assignmentKeys: Object.keys(assignment)
            });
          }
          
          // 只添加必要的默认值，不覆盖已populate的对象
          const processedAssignment = {
            course: course,           // 直接赋值，不展开
            teacher: teacher,         // 直接赋值，不展开
            weeklyHours: assignment.weeklyHours || 1,
            requiresContinuous: assignment.requiresContinuous || false,
            continuousHours: assignment.continuousHours || 1,
            preferredTimeSlots: assignment.preferredTimeSlots || [],
            avoidTimeSlots: assignment.avoidTimeSlots || []
          };
          
          // 验证复制后的数据完整性
          if (!processedAssignment.course || !processedAssignment.teacher) {
            console.log(`   ⚠️ 课程分配数据复制后丢失:`, {
              course: processedAssignment.course,
              teacher: processedAssignment.teacher,
              originalAssignment: assignment
            });
          }
          
          return processedAssignment;
        }),
        // 复制其他必要字段
        academicYear: plan.academicYear,
        semester: plan.semester,
        status: plan.status,
        isActive: plan.isActive
      };

      // 🔍 验证复制后的数据
      console.log(`   🔍 复制后的教学计划验证:`);
      console.log(`     教学计划ID: ${processedPlan._id}`);
      console.log(`     班级字段: ${processedPlan.class ? (typeof processedPlan.class === 'object' ? '已populate' : '未populate') : 'null'}`);
      console.log(`     班级名称: ${processedPlan.class?.name || 'null'}`);
      console.log(`     课程分配数量: ${processedPlan.courseAssignments?.length || 0}`);

      return processedPlan;
    });

    // 🔍 调试：验证预处理后的数据
    if (processedTeachingPlans.length > 0) {
      const sampleProcessedPlan = processedTeachingPlans[0];
      console.log('🔍 [数据预处理] 预处理后的教学计划数据结构:');
      console.log(`   教学计划ID: ${sampleProcessedPlan._id}`);
      console.log(`   班级字段: ${sampleProcessedPlan.class ? (typeof sampleProcessedPlan.class === 'object' ? '已populate' : '未populate') : 'null'}`);
      console.log(`   班级类型: ${typeof sampleProcessedPlan.class}`);
      
      if (sampleProcessedPlan.class && typeof sampleProcessedPlan.class === 'object') {
        if ('_id' in sampleProcessedPlan.class) {
          console.log(`   ⚠️ 班级只是ObjectId: ${sampleProcessedPlan.class._id}`);
        } else {
          console.log(`   ✅ 班级已populate: ${(sampleProcessedPlan.class as any).name}`);
        }
      }
    }

    // 预处理时间槽（按优先级排序）
    const processedTimeSlots = [...timeSlots].sort((a, b) => {
      // 优先选择上午的时间槽
      if (a.dayOfWeek !== b.dayOfWeek) {
        return a.dayOfWeek - b.dayOfWeek;
      }
      return a.period - b.period;
    });

    // 预处理教室（按类型和容量排序）
    const processedRooms = [...rooms].sort((a, b) => {
      // 优先选择普通教室
      if (a.type === '普通教室' && b.type !== '普通教室') return -1;
      if (a.type !== '普通教室' && b.type === '普通教室') return 1;
      
      // 其次按容量排序
      return (a.capacity || 0) - (b.capacity || 0);
    });

    console.log('✅ [数据预处理] 数据预处理完成');
    console.log(`   📊 处理后的教学计划: ${processedTeachingPlans.length} 个`);
    console.log(`   📊 处理后的时间槽: ${processedTimeSlots.length} 个`);
    console.log(`   📊 处理后的教室: ${processedRooms.length} 个`);

    return {
      teachingPlans: processedTeachingPlans,
      schedulingRules: schedulingRules,
      timeSlots: processedTimeSlots,
      rooms: processedRooms
    };
  }

  /**
   * 后处理结果
   */
  private postprocessResult(result: any): K12ScheduleResult {
    console.log('🔧 [结果后处理] 开始后处理排课结果...');

    // 🔧 修复：添加assignments字段的调试信息
    console.log(`🔍 [后处理] 检查原始结果的assignments字段:`, {
      hasAssignments: !!result.assignments,
      type: typeof result.assignments,
      isArray: Array.isArray(result.assignments),
      length: result.assignments ? result.assignments.length : 'undefined'
    });

    // 转换结果格式
    const finalResult: K12ScheduleResult = {
      success: result.success,
      assignedVariables: result.assignedVariables,
      unassignedVariables: result.unassignedVariables,
      hardConstraintViolations: result.hardConstraintViolations,
      softConstraintViolations: result.softConstraintViolations,
      totalScore: result.totalScore,
      // 🔧 修复：传递assignments字段
      assignments: result.assignments,
      stageResults: new Map(),
      message: result.success ? '排课成功完成' : '排课未完全成功',
      suggestions: this.generateSuggestions(result)
    };

    // 添加阶段结果
    if (result.stageResults) {
      for (const [stage, stageResult] of result.stageResults.entries()) {
        finalResult.stageResults.set(stage, {
          assignedCount: stageResult.assignedVariables || 0,
          unassignedCount: stageResult.unassignedVariables || 0,
          executionTime: stageResult.executionTime || 0,
          message: stageResult.message || ''
        });
      }
    }

    // 🔧 修复：添加最终结果的assignments字段验证
    console.log(`🔍 [后处理] 最终结果的assignments字段:`, {
      hasAssignments: !!finalResult.assignments,
      type: typeof finalResult.assignments,
      isArray: Array.isArray(finalResult.assignments),
      length: finalResult.assignments ? finalResult.assignments.length : 'undefined'
    });

    console.log('✅ [结果后处理] 结果后处理完成');
    return finalResult;
  }

  /**
   * 生成改进建议
   */
  private generateSuggestions(result: any): string[] {
    const suggestions: string[] = [];

    if (result.unassignedVariables > 0) {
      suggestions.push(`有 ${result.unassignedVariables} 门课程未能安排，建议检查时间槽和约束配置`);
    }

    if (result.hardConstraintViolations > 0) {
      suggestions.push(`存在 ${result.hardConstraintViolations} 个硬约束违反，需要优先解决`);
    }

    if (result.softConstraintViolations > 0) {
      suggestions.push(`存在 ${result.softConstraintViolations} 个软约束违反，可以考虑优化排课策略`);
    }

    if (result.totalScore < 80) {
      suggestions.push('总体评分较低，建议优化课程分布和教师工作量平衡');
    }

    if (suggestions.length === 0) {
      suggestions.push('排课质量良好，无需特别改进');
    }

    return suggestions;
  }

  /**
   * 获取默认配置
   */
  private getDefaultConfig(): K12SchedulingConfig {
    return {
      coreSubjects: {
        maxIterations: 1000,
        timeLimit: 300, // 5分钟
        priorityOrder: ['语文', '数学', '英语']
      },
      electiveSubjects: {
        maxIterations: 1000,
        timeLimit: 300, // 5分钟
        enableDispersionOptimization: true
      },
      specialConstraints: {
        maxIterations: 500,
        timeLimit: 120, // 2分钟
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
  }

  /**
   * 更新配置
   */
  updateConfig(newConfig: Partial<K12SchedulingConfig>): void {
    this.config = { ...this.config, ...newConfig };
    console.log('⚙️ [配置更新] K12排课配置已更新');
  }

  /**
   * 获取当前配置
   */
  getConfig(): K12SchedulingConfig {
    return { ...this.config };
  }

  /**
   * 重置配置到默认值
   */
  resetConfig(): void {
    this.config = this.getDefaultConfig();
    console.log('🔄 [配置重置] K12排课配置已重置为默认值');
  }
}
