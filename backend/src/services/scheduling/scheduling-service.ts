/**
 * 排课服务类
 * 
 * 提供排课功能的高级接口，整合数据加载、算法执行和结果保存
 */

import mongoose from 'mongoose';
import {
  ScheduleVariable,
  CourseAssignment,
  AlgorithmConfig,
  SchedulingResult,
  ProgressCallback,
  TimeSlot
} from './types';
import { SchedulingEngine } from './scheduling-engine';
import { ISchedulingRules, SchedulingRules } from '../../models/SchedulingRules';
import { ITeachingPlan, TeachingPlan } from '../../models/TeachingPlan';
import { ISchedule, Schedule } from '../../models/Schedule';
import { Teacher } from '../../models/Teacher';
import { Class } from '../../models/Class';
import { Course } from '../../models/Course';
import { Room } from '../../models/Room';

/**
 * 排课请求参数
 */
export interface SchedulingRequest {
  academicYear: string;                // 学年
  semester: number;                    // 学期
  classIds?: mongoose.Types.ObjectId[]; // 指定班级（可选，为空则处理所有班级）
  rulesId?: mongoose.Types.ObjectId;   // 排课规则ID（可选，为空则使用默认规则）
  algorithmConfig?: Partial<AlgorithmConfig>; // 算法配置（可选）
  preserveExisting: boolean;           // 是否保留现有排课
}

/**
 * 排课服务类
 */
export class SchedulingService {
  
  /**
   * 执行排课
   * 
   * Args:
   *   request: 排课请求参数
   *   progressCallback: 进度回调函数
   * 
   * Returns:
   *   Promise<SchedulingResult>: 排课结果
   * 
   * Raises:
   *   Error: 当数据加载失败或算法执行失败时
   */
  async executeScheduling(
    request: SchedulingRequest,
    progressCallback?: ProgressCallback
  ): Promise<SchedulingResult> {
    try {
      // 1. 加载排课规则
      const rules = await this.loadSchedulingRules(request.rulesId);
      
      // 2. 加载教学计划
      const teachingPlans = await this.loadTeachingPlans(request.academicYear, request.semester, request.classIds);
      
      // 3. 生成排课变量
      const variables = await this.generateScheduleVariables(teachingPlans);
      
      // 4. 加载固定安排
      const fixedAssignments = await this.loadFixedAssignments(request);
      
      // 5. 创建算法配置
      const config = this.createAlgorithmConfig(request.algorithmConfig);
      
      // 6. 执行排课算法
      const engine = new SchedulingEngine(rules, config, progressCallback);
      const result = await engine.solve(variables, fixedAssignments);
      
      // 7. 保存结果
      if (result.success) {
        await this.saveSchedulingResult(result, request);
      }
      
      return result;
      
    } catch (error) {
      console.error('排课服务执行失败:', error);
      throw new Error(`排课执行失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 验证排课结果
   * 
   * Args:
   *   academicYear: 学年
   *   semester: 学期
   *   classIds: 班级ID列表
   * 
   * Returns:
   *   Promise<{isValid: boolean, conflicts: any[], violations: any[]}>: 验证结果
   */
  async validateSchedule(
    academicYear: string,
    semester: number,
    classIds?: mongoose.Types.ObjectId[]
  ): Promise<{isValid: boolean, conflicts: any[], violations: any[]}> {
    try {
      // 查询现有排课
      const query: any = {
        academicYear,
        semester: `${academicYear}-${semester}`
      };
      
      if (classIds && classIds.length > 0) {
        query.class = { $in: classIds };
      }

      const schedules = await Schedule.find(query)
        .populate('class')
        .populate('course')
        .populate('teacher')
        .populate('room');

      // 转换为CourseAssignment格式
      const assignments = new Map<string, CourseAssignment>();
      for (const schedule of schedules) {
        const assignment: CourseAssignment = {
          variableId: (schedule._id as mongoose.Types.ObjectId).toString(),
          classId: schedule.class as mongoose.Types.ObjectId,
          courseId: schedule.course as mongoose.Types.ObjectId,
          teacherId: schedule.teacher as mongoose.Types.ObjectId,
          roomId: schedule.room as mongoose.Types.ObjectId,
          timeSlot: {
            dayOfWeek: schedule.dayOfWeek,
            period: schedule.period
          },
          isFixed: false
        };
        assignments.set(assignment.variableId, assignment);
      }

      // 加载排课规则进行验证
      const rules = await this.loadSchedulingRules();
      const engine = new SchedulingEngine(rules, this.createAlgorithmConfig());
      
      // 检测冲突和约束违反
      const conflicts: any[] = [];
      const violations: any[] = [];
      
      for (const assignment of assignments.values()) {
        const otherAssignments = new Map(assignments);
        otherAssignments.delete(assignment.variableId);
        
        const assignmentConflicts = (engine as any).constraintDetector.checkAllConflicts(assignment, otherAssignments);
        conflicts.push(...assignmentConflicts);
      }

      const isValid = conflicts.length === 0 && violations.length === 0;

      return {
        isValid,
        conflicts,
        violations
      };

    } catch (error) {
      console.error('排课验证失败:', error);
      throw new Error(`排课验证失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 获取排课统计信息
   * 
   * Args:
   *   academicYear: 学年
   *   semester: 学期
   * 
   * Returns:
   *   Promise<any>: 统计信息
   */
  async getSchedulingStatistics(
    academicYear: string,
    semester: number
  ): Promise<any> {
    try {
      const semesterStr = `${academicYear}-${semester}`;
      
      // 统计排课数量
      const totalSchedules = await Schedule.countDocuments({
        academicYear,
        semester: semesterStr
      });

      // 统计教师工作量
      const teacherWorkload = await Schedule.aggregate([
        {
          $match: {
            academicYear,
            semester: semesterStr
          }
        },
        {
          $group: {
            _id: '$teacher',
            totalHours: { $sum: 1 },
            subjects: { $addToSet: '$course' }
          }
        },
        {
          $lookup: {
            from: 'teachers',
            localField: '_id',
            foreignField: '_id',
            as: 'teacherInfo'
          }
        }
      ]);

      // 统计教室使用率
      const roomUsage = await Schedule.aggregate([
        {
          $match: {
            academicYear,
            semester: semesterStr
          }
        },
        {
          $group: {
            _id: '$room',
            totalHours: { $sum: 1 }
          }
        },
        {
          $lookup: {
            from: 'rooms',
            localField: '_id',
            foreignField: '_id',
            as: 'roomInfo'
          }
        }
      ]);

      // 统计班级课时分布
      const classSchedules = await Schedule.aggregate([
        {
          $match: {
            academicYear,
            semester: semesterStr
          }
        },
        {
          $group: {
            _id: {
              class: '$class',
              dayOfWeek: '$dayOfWeek'
            },
            dailyHours: { $sum: 1 }
          }
        },
        {
          $group: {
            _id: '$_id.class',
            dailyDistribution: {
              $push: {
                day: '$_id.dayOfWeek',
                hours: '$dailyHours'
              }
            },
            totalWeeklyHours: { $sum: '$dailyHours' }
          }
        }
      ]);

      return {
        totalSchedules,
        teacherWorkload,
        roomUsage,
        classSchedules,
        generatedAt: new Date()
      };

    } catch (error) {
      console.error('获取排课统计失败:', error);
      throw new Error(`获取排课统计失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 加载排课规则
   * 
   * Args:
   *   rulesId: 规则ID（可选）
   * 
   * Returns:
   *   Promise<ISchedulingRules>: 排课规则
   */
  private async loadSchedulingRules(rulesId?: mongoose.Types.ObjectId): Promise<ISchedulingRules> {
    let rules: ISchedulingRules | null;

    if (rulesId) {
      rules = await SchedulingRules.findById(rulesId);
      if (!rules) {
        throw new Error(`找不到指定的排课规则: ${rulesId}`);
      }
    } else {
      // 使用默认规则
      rules = await SchedulingRules.findOne({ isDefault: true, isActive: true });
      if (!rules) {
        throw new Error('没有找到默认的排课规则');
      }
    }

    return rules;
  }

  /**
   * 加载教学计划
   * 
   * Args:
   *   academicYear: 学年
   *   semester: 学期
   *   classIds: 班级ID列表（可选）
   * 
   * Returns:
   *   Promise<ITeachingPlan[]>: 教学计划列表
   */
  private async loadTeachingPlans(
    academicYear: string,
    semester: number,
    classIds?: mongoose.Types.ObjectId[]
  ): Promise<ITeachingPlan[]> {
    const query: any = {
      academicYear,
      semester,
      status: 'approved',
      isActive: true
    };

    if (classIds && classIds.length > 0) {
      query.class = { $in: classIds };
    }

    const plans = await TeachingPlan.find(query)
      .populate('class')
      .populate('courseAssignments.course')
      .populate('courseAssignments.teacher');

    if (plans.length === 0) {
      throw new Error('没有找到已批准的教学计划');
    }

    return plans;
  }

  /**
   * 转换时间偏好格式
   * 
   * Args:
   *   timeSlots: 原始时间偏好数据
   * 
   * Returns:
   *   TimeSlot[]: 转换后的时间段数组
   */
  private convertTimeSlots(timeSlots?: { dayOfWeek: number; periods: number[]; }[]): TimeSlot[] {
    if (!timeSlots) return [];
    
    const converted: TimeSlot[] = [];
    for (const slot of timeSlots) {
      for (const period of slot.periods) {
        converted.push({
          dayOfWeek: slot.dayOfWeek,
          period: period
        });
      }
    }
    return converted;
  }

  /**
   * 生成排课变量
   * 
   * Args:
   *   teachingPlans: 教学计划列表
   * 
   * Returns:
   *   Promise<ScheduleVariable[]>: 排课变量列表
   */
  private async generateScheduleVariables(teachingPlans: ITeachingPlan[]): Promise<ScheduleVariable[]> {
    const variables: ScheduleVariable[] = [];

    for (const plan of teachingPlans) {
      for (const assignment of plan.courseAssignments) {
        // 为每周需要的课时创建变量
        for (let hour = 0; hour < assignment.weeklyHours; hour++) {
          const variable: ScheduleVariable = {
            id: `${plan.class}_${assignment.course}_${assignment.teacher}_${hour}`,
            classId: plan.class as mongoose.Types.ObjectId,
            courseId: assignment.course,
            teacherId: assignment.teacher,
            requiredHours: 1, // 每个变量代表1课时
            timePreferences: this.convertTimeSlots(assignment.preferredTimeSlots),
            timeAvoidance: this.convertTimeSlots(assignment.avoidTimeSlots),
            continuous: assignment.requiresContinuous,
            continuousHours: assignment.continuousHours,
            priority: 5, // 默认优先级
            domain: [] // 将在约束传播阶段填充
          };

          variables.push(variable);
        }
      }
    }

    return variables;
  }

  /**
   * 加载固定安排
   * 
   * Args:
   *   request: 排课请求
   * 
   * Returns:
   *   Promise<CourseAssignment[]>: 固定安排列表
   */
  private async loadFixedAssignments(request: SchedulingRequest): Promise<CourseAssignment[]> {
    if (!request.preserveExisting) {
      return [];
    }

    // 查询现有排课
    const query: any = {
      academicYear: request.academicYear,
      semester: `${request.academicYear}-${request.semester}`
    };

    if (request.classIds && request.classIds.length > 0) {
      query.class = { $in: request.classIds };
    }

    const existingSchedules = await Schedule.find(query);
    
    return existingSchedules.map(schedule => ({
      variableId: (schedule._id as mongoose.Types.ObjectId).toString(),
      classId: schedule.class as mongoose.Types.ObjectId,
      courseId: schedule.course as mongoose.Types.ObjectId,
      teacherId: schedule.teacher as mongoose.Types.ObjectId,
      roomId: schedule.room as mongoose.Types.ObjectId,
      timeSlot: {
        dayOfWeek: schedule.dayOfWeek,
        period: schedule.period
      },
      isFixed: true
    }));
  }

  /**
   * 创建算法配置
   * 
   * Args:
   *   userConfig: 用户配置（可选）
   * 
   * Returns:
   *   AlgorithmConfig: 算法配置
   */
  private createAlgorithmConfig(userConfig?: Partial<AlgorithmConfig>): AlgorithmConfig {
    const defaultConfig: AlgorithmConfig = {
      maxIterations: 10000,
      timeLimit: 300, // 5分钟
      backtrackLimit: 1000,
      enableLocalOptimization: true,
      localOptimizationIterations: 100,
      verbose: false
    };

    return { ...defaultConfig, ...userConfig };
  }

  /**
   * 保存排课结果
   * 
   * Args:
   *   result: 排课结果
   *   request: 原始请求
   * 
   * Returns:
   *   Promise<void>
   */
  private async saveSchedulingResult(
    result: SchedulingResult,
    request: SchedulingRequest
  ): Promise<void> {
    try {
      // 如果不保留现有排课，则删除旧数据
      if (!request.preserveExisting) {
        const deleteQuery: any = {
          academicYear: request.academicYear,
          semester: `${request.academicYear}-${request.semester}`
        };

        if (request.classIds && request.classIds.length > 0) {
          deleteQuery.class = { $in: request.classIds };
        }

        await Schedule.deleteMany(deleteQuery);
        console.log('已清理现有排课数据');
      }

      // 保存新的排课结果
      const scheduleDocuments = [];
      
      for (const assignment of result.scheduleState.assignments.values()) {
        if (!assignment.isFixed) { // 只保存新生成的排课
          scheduleDocuments.push({
            academicYear: request.academicYear,
            semester: `${request.academicYear}-${request.semester}`,
            class: assignment.classId,
            course: assignment.courseId,
            teacher: assignment.teacherId,
            room: assignment.roomId,
            dayOfWeek: assignment.timeSlot.dayOfWeek,
            period: assignment.timeSlot.period,
            status: 'active',
            createdAt: new Date()
          });
        }
      }

      if (scheduleDocuments.length > 0) {
        await Schedule.insertMany(scheduleDocuments);
        console.log(`成功保存 ${scheduleDocuments.length} 条排课记录`);
      } else {
        console.log('没有新的排课记录需要保存');
      }

    } catch (error) {
      console.error('保存排课结果失败:', error);
      throw error;
    }
  }
}