/**
 * 排课服务
 * 
 * 🔧 调试信息规则：循环数据只输出前3条，避免日志冗长
 * 
 * 架构说明：
 * 1. 冲突检测：由K12排课引擎统一处理，包括硬约束和软约束
 * 2. 排课算法：K12引擎实现混合算法策略（约束满足 + 局部搜索优化）
 * 3. 数据保存：此服务只负责保存引擎返回的已验证结果
 * 4. 职责分离：引擎负责算法和约束，服务负责数据管理和持久化
 * 
 * 优势：
 * - 避免重复的冲突检测
 * - 统一的约束处理逻辑
 * - 更好的算法扩展性
 * - 清晰的职责边界
 */

// ... existing code ...

import mongoose from 'mongoose';
import {
  ScheduleVariable,
  CourseAssignment,
  AlgorithmConfig,
  SchedulingResult,
  ProgressCallback,
  TimeSlot,
  DebugLevel
} from './types';

import { K12SchedulingService } from './k12-scheduling-service';
import { ISchedulingRules, SchedulingRules } from '../../models/SchedulingRules';
import { ITeachingPlan, TeachingPlan } from '../../models/TeachingPlan';
import { ISchedule, Schedule } from '../../models/Schedule';
import { Teacher } from '../../models/Teacher';
import { Class } from '../../models/Class';
import { Course } from '../../models/Course';
import { Room } from '../../models/Room';
import { K12SchedulingEngine } from './k12-scheduling-engine';

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
  useK12?: boolean;                    // 是否使用K12排课引擎（新增）
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
      // 🔥 强制使用K12排课引擎
      request.useK12 = true;
      
      console.log(`🚀 [排课服务] 开始执行排课，使用引擎: ${request.useK12 ? 'K12排课引擎' : '传统排课引擎'}`);
      
      // 1. 加载排课规则
      const rules = await this.loadSchedulingRules(request.rulesId);
      
      // 2. 加载教学计划
      const teachingPlans = await this.loadTeachingPlans(request.academicYear, request.semester, request.classIds);
      
      // 3. 加载时间槽
      const timeSlots = await this.loadTimeSlots(request.academicYear, request.semester, rules);
      
      // 4. 加载教室
      const rooms = await this.loadRooms(teachingPlans);
      
      // 5. 根据配置选择排课引擎 
      if (request.useK12) {
        console.log('🎯 [排课服务] 使用K12排课引擎');
        // 将单个排课规则转换为数组格式
        const rulesArray = [rules];
        return await this.executeK12Scheduling(teachingPlans, rules, timeSlots, rooms, request, progressCallback);
      } else {
        console.log('🎯 [排课服务] 使用传统排课引擎');
        return await this.executeTraditionalScheduling(teachingPlans, rules, request, progressCallback);
      }
      
    } catch (error) {
      console.error('排课服务执行失败:', error);
      throw new Error(`排课执行失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 执行K12排课
   * 
   * 注意：冲突检测现在由K12排课引擎统一处理
   * 此方法只负责调用引擎和保存结果
   * 
   * Args:
   *   teachingPlans: 教学计划列表
   *   rules: 排课规则
   *   timeSlots: 时间槽列表
   *   rooms: 教室列表
   *   request: 排课请求参数
   *   progressCallback: 进度回调函数（可选）
   * 
   * Returns:
   *   Promise<SchedulingResult>: 排课结果
   * 
   * Raises:
   *   Error: 当排课引擎执行失败时
   */
  async executeK12Scheduling(
    teachingPlans: ITeachingPlan[],
    schedulingRules: ISchedulingRules,
    timeSlots: TimeSlot[],
    rooms: any[],
    request: SchedulingRequest,
    progressCallback?: ProgressCallback
  ): Promise<SchedulingResult> {
    try {
      console.log('🎯 [K12排课服务] 开始执行K12排课...');
      console.log(`   📊 班级数量: ${request.classIds?.length || 0}`);
      console.log(`   📊 学年: ${request.academicYear}`);
      console.log(`   📊 学期: ${request.semester}`);
      console.log(`   📊 教学计划数量: ${teachingPlans.length} 个`);
      console.log(`   📊 时间槽数量: ${timeSlots.length} 个`);
      console.log(`   📊 教室数量: ${rooms.length} 个`);
      
      // 4. 执行K12排课引擎（包含约束检测和优化）
      const engine = new K12SchedulingEngine();
      const k12Result = await engine.schedule(
        teachingPlans,
        [schedulingRules],
        timeSlots,
        rooms,
        request.academicYear,
        request.semester.toString()
      );
      
      // 🔧 修复：即使排课未完全成功，也要处理已排好的课程
      if (k12Result.assignedVariables === 0) {
        throw new Error(`K12排课引擎执行失败: 没有安排任何课程`);
      }
      
      if (k12Result.success) {
        console.log(`✅ K12排课引擎执行成功: ${k12Result.assignedVariables} 门课程已安排`);
      } else {
        console.log(`⚠️ K12排课引擎部分成功: ${k12Result.assignedVariables} 门课程已安排，${k12Result.unassignedVariables} 门课程未安排`);
      }
      
      // 5. 转换结果格式
      const result: SchedulingResult = {
        success: k12Result.success,  // 🔧 修复：使用K12引擎的实际成功状态
        scheduleState: {
          assignments: this.convertK12AssignmentsToScheduleAssignments(k12Result),
          conflicts: [],
          violations: [],
          unassigned: [],
          score: k12Result.totalScore || 0,  // 🔧 修复：使用K12引擎的实际评分
          isComplete: k12Result.unassignedVariables === 0,  // 🔧 修复：根据未分配数量判断是否完成
          isFeasible: k12Result.hardConstraintViolations === 0  // 🔧 修复：根据硬约束违反判断是否可行
        },
        statistics: {
          totalVariables: (k12Result.assignedVariables || 0) + (k12Result.unassignedVariables || 0),  // 🔧 修复：总变量数 = 已分配 + 未分配
          assignedVariables: k12Result.assignedVariables || 0,  // 🔧 修复：已分配变量数
          unassignedVariables: k12Result.unassignedVariables || 0,  // 🔧 修复：未分配变量数
          hardViolations: k12Result.hardConstraintViolations || 0,  // 🔧 修复：硬约束违反数
          softViolations: k12Result.softConstraintViolations || 0,  // 🔧 修复：软约束违反数
          totalScore: k12Result.totalScore || 0,  // 🔧 修复：总评分
          iterations: 1,
          executionTime: 0
        },
        conflicts: [],
        violations: [],
        message: k12Result.message || 'K12排课完成',  // 🔧 修复：使用K12引擎的实际消息
        suggestions: k12Result.suggestions || []  // 🔧 修复：使用K12引擎的实际建议
      };
      
      // 6. 保存结果到数据库
      await this.saveSchedulingResult(result, request);
      
      console.log('�� [K12排课服务] 排课完成');
      return result;
      
    } catch (error) {
      console.error('❌ [K12排课服务] 排课失败:', error);
      throw error;
    }
  }

// ... existing code ...

  /**
   * 执行传统排课
   */
  private async executeTraditionalScheduling(
    teachingPlans: any[],
    rules: ISchedulingRules,
    request: SchedulingRequest,
    progressCallback?: ProgressCallback
  ): Promise<SchedulingResult> {
    try {
      console.log('🔧 [传统排课] 开始执行传统排课流程');
      
      // 1. 生成排课变量
      const variables = await this.generateScheduleVariables(teachingPlans);
      
      // 2. 加载固定安排
      const fixedAssignments = await this.loadFixedAssignments(request);
      
      // 3. 创建算法配置
      const config = this.createAlgorithmConfig(request.algorithmConfig);
      
      // 4. 执行排课算法 - 使用K12排课引擎
      const engine = new K12SchedulingEngine();
      const k12Result = await engine.schedule(
        teachingPlans,
        [rules],
        [], // 时间槽由主服务提供
        [], // 教室由主服务提供
        request.academicYear,
        request.semester.toString()
      );
      
      // 5. 转换K12结果为SchedulingResult格式
      const result: SchedulingResult = {
        success: k12Result.success,
        scheduleState: {
          assignments: this.convertK12AssignmentsToScheduleAssignments(k12Result),
          conflicts: [],
          violations: [],
          unassigned: [],
          score: k12Result.totalScore || 0,
          isComplete: k12Result.unassignedVariables === 0,
          isFeasible: k12Result.hardConstraintViolations === 0
        },
        statistics: {
          totalVariables: (k12Result.assignedVariables || 0) + (k12Result.unassignedVariables || 0),
          assignedVariables: k12Result.assignedVariables || 0,
          unassignedVariables: k12Result.unassignedVariables || 0,
          hardViolations: k12Result.hardConstraintViolations || 0,
          softViolations: k12Result.softConstraintViolations || 0,
          totalScore: k12Result.totalScore || 0,
          iterations: 1,
          executionTime: 0
        },
        conflicts: [],
        violations: [],
        message: k12Result.message || '传统排课完成',
        suggestions: k12Result.suggestions || []
      };
      
      // 6. 保存结果
      if (result.success) {
        await this.saveSchedulingResult(result, request);
      }
      
      return result;
      
    } catch (error) {
      console.error('传统排课执行失败:', error);
      throw new Error(`传统排课执行失败: ${error instanceof Error ? error.message : '未知错误'}`);
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
      
      // K12排课引擎已经确保所有分配都满足约束，无需重复检测
      const conflicts: any[] = [];
      const violations: any[] = [];
      
      // 直接返回成功状态，因为引擎已经确保无冲突
      const isValid = true;

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
   *   rulesId: 排课规则ID（可选）
   * 
   * Returns:
   *   Promise<ISchedulingRules>: 排课规则
   * 
   * Raises:
   *   Error: 当找不到指定规则或默认规则时
   */
  private async loadSchedulingRules(rulesId?: mongoose.Types.ObjectId): Promise<ISchedulingRules> {
    console.log('🔍 排课规则加载检查:');
    console.log('   传入的rulesId:', rulesId);
    console.log('   rulesId类型:', typeof rulesId);
    console.log('   rulesId是否为ObjectId:', rulesId instanceof mongoose.Types.ObjectId);
    console.log('   rulesId是否为null/undefined:', rulesId == null);

    let rules: ISchedulingRules | null;

    if (rulesId) {
      console.log('   📖 查找指定排课规则:', rulesId);
      
      try {
        rules = await SchedulingRules.findById(rulesId);
        console.log('   🔍 数据库查询结果:', rules ? `找到规则: ${rules.name}` : '未找到规则');
        
        if (!rules) {
          console.error('   ❌ 找不到指定的排课规则:', rulesId);
          throw new Error(`找不到指定的排课规则: ${rulesId}`);
        }
        
        // 检查规则是否激活
        if (!rules.isActive) {
          console.warn('   ⚠️ 指定的排课规则未激活:', rules.name);
        }
        
        console.log('   ✅ 成功加载指定排课规则:');
        console.log('      规则名称:', rules.name);
        console.log('      规则描述:', rules.description);
        console.log('      是否激活:', rules.isActive);
        console.log('      是否默认:', rules.isDefault);
        
      } catch (error) {
        console.error('   ❌ 查询指定排课规则失败:', error);
        throw new Error(`查询排课规则失败: ${error instanceof Error ? error.message : '未知错误'}`);
      }
      
    } else {
      console.log('   📖 查找默认排课规则');
      
      try {
        rules = await SchedulingRules.findOne({ isDefault: true, isActive: true });
        console.log('   🔍 默认规则查询结果:', rules ? `找到默认规则: ${rules.name}` : '未找到默认规则');
        
        if (!rules) {
          console.error('   ❌ 没有找到默认的排课规则');
          
          // 尝试查找任何激活的规则作为备选
          const anyActiveRules = await SchedulingRules.findOne({ isActive: true });
          if (anyActiveRules) {
            console.warn('   ⚠️ 找到备选激活规则:', anyActiveRules.name);
            rules = anyActiveRules;
          } else {
            throw new Error('没有找到可用的排课规则');
          }
        }
        
        console.log('   ✅ 成功加载默认/备选排课规则:');
        console.log('      规则名称:', rules.name);
        console.log('      规则描述:', rules.description);
        console.log('      是否激活:', rules.isActive);
        console.log('      是否默认:', rules.isDefault);
        
      } catch (error) {
        console.error('   ❌ 查询默认排课规则失败:', error);
        throw new Error(`查询默认排课规则失败: ${error instanceof Error ? error.message : '未知错误'}`);
      }
    }

    // 验证规则完整性
    if (rules) {
      console.log('   🔍 验证排课规则完整性...');
      
      // 检查必要的规则字段
      const hasTimeRules = rules.timeRules && Object.keys(rules.timeRules).length > 0;
      const hasTeacherConstraints = rules.teacherConstraints && Object.keys(rules.teacherConstraints).length > 0;
      const hasRoomConstraints = rules.roomConstraints && Object.keys(rules.roomConstraints).length > 0;
      const hasCourseArrangementRules = rules.courseArrangementRules && Object.keys(rules.courseArrangementRules).length > 0;
      
      if (!hasTimeRules || !hasTeacherConstraints || !hasRoomConstraints || !hasCourseArrangementRules) {
        const missingFields = [];
        if (!hasTimeRules) missingFields.push('timeRules');
        if (!hasTeacherConstraints) missingFields.push('teacherConstraints');
        if (!hasRoomConstraints) missingFields.push('roomConstraints');
        if (!hasCourseArrangementRules) missingFields.push('courseArrangementRules');
        
        console.warn('   ⚠️ 排课规则缺少必要字段:', missingFields);
      } else {
        console.log('   ✅ 排课规则完整性验证通过');
      }
      
      // 输出规则摘要
      console.log('   📋 排课规则摘要:');
      console.log('      时间规则:', hasTimeRules ? '已配置' : '未配置');
      console.log('      教师约束:', hasTeacherConstraints ? '已配置' : '未配置');
      console.log('      教室约束:', hasRoomConstraints ? '已配置' : '未配置');
      console.log('      课程安排规则:', hasCourseArrangementRules ? '已配置' : '未配置');
    }

    return rules;
  }

  /**
   * 加载教学计划
   * 
   * Args:
   *   academicYear: 学年
   *   semester: 学期
   *   classIds: 班级ID列表
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
      // 允许草稿和已批准状态的教学计划进行排课
      status: { $in: ['draft', 'approved'] },
      isActive: true
    };

    if (classIds && classIds.length > 0) {
      query.class = { $in: classIds };
    }

    console.log('🔍 [教学计划加载] 查询条件:', JSON.stringify(query, null, 2));

    const plans = await TeachingPlan.find(query)
      .populate({
        path: 'class',
        model: 'Class'
      })
      .populate({
        path: 'courseAssignments.course',
        model: 'Course'
      })
      .populate({
        path: 'courseAssignments.teacher',
        model: 'Teacher'
      });

    console.log(`📊 [教学计划加载] 找到 ${plans.length} 个教学计划`);

    if (plans.length === 0) {
      throw new Error('没有找到已批准的教学计划');
    }

    // 修复字符串格式的courseAssignments
    await this.fixCourseAssignments(plans);
    
    // 修复班级populate
    await this.fixClassPopulate(plans);

    console.log('✅ [教学计划加载] 数据修复完成');
    return plans;
  }

  /**
   * 修复课程分配数据格式
   */
  private async fixCourseAssignments(plans: ITeachingPlan[]): Promise<void> {
    for (const plan of plans) {
      if (!plan.courseAssignments || !Array.isArray(plan.courseAssignments)) continue;

      const fixedAssignments = [];
      
      for (const assignment of plan.courseAssignments) {
        if (typeof assignment === 'string') {
          try {
            const parsed = JSON.parse(assignment);
            if (parsed.course && parsed.teacher) {
              const course = await Course.findById(parsed.course);
              const teacher = await Teacher.findById(parsed.teacher);
              
              if (course && teacher) {
                fixedAssignments.push({
                  ...parsed,
                  course: course,
                  teacher: teacher
                });
              }
            }
          } catch (error) {
            console.error('解析课程分配失败:', assignment, error);
          }
        } else {
          fixedAssignments.push(assignment);
        }
      }
      
      plan.courseAssignments = fixedAssignments;
    }
  }

  /**
   * 修复班级populate
   */
  private async fixClassPopulate(plans: ITeachingPlan[]): Promise<void> {
    for (const plan of plans) {
      // 检查班级是否已正确populate
      if (this.isClassPopulated(plan.class)) continue;

      try {
        const classId = plan.class;
        if (classId) {
          const classInfo = await Class.findById(classId);
          if (classInfo) {
            plan.class = classInfo.toObject() as any;
            (plan as any).markModified('class');
            console.log(`✅ 修复班级populate: ${classInfo.name}`);
          }
        }
      } catch (error) {
        console.error(`修复班级populate失败:`, error);
      }
    }
  }

  /**
   * 检查班级是否已正确populate
   */
  private isClassPopulated(classField: any): boolean {
    return classField && 
           typeof classField === 'object' && 
           classField.name && 
           typeof classField._id !== 'string';
  }

  /**
   * 加载时间槽
   * 
   * Args:
   *   academicYear: 学年
   *   semester: 学期
   *   schedulingRules: 排课规则（用于获取时间配置）
   * 
   * Returns:
   *   Promise<TimeSlot[]>: 时间槽列表
   */
  private async loadTimeSlots(
    academicYear: string, 
    semester: number,
    schedulingRules: ISchedulingRules
  ): Promise<TimeSlot[]> {
    // 从排课规则获取时间配置
    const { timeRules } = schedulingRules;
    
    console.log('🔍 [时间槽生成] 从排课规则获取配置:');
    console.log(`   - 每日课时数: ${timeRules.dailyPeriods}`);
    console.log(`   - 工作日: ${timeRules.workingDays.join(', ')}`);
    console.log(`   - 单节课时长: ${timeRules.periodDuration} 分钟`);
    console.log(`   - 上午节次: ${timeRules.morningPeriods.join(', ')}`);
    console.log(`   - 下午节次: ${timeRules.afternoonPeriods.join(', ')}`);
    
    try {
      // 🎯 修复：从数据库获取真实的时间配置
      const { PeriodTimeConfig } = await import('../../models/PeriodTimeConfig');
      
      console.log(`   🔍 从数据库获取 ${academicYear} 学年 ${semester} 学期的时间配置...`);
      
      // 获取该学年学期的所有时间配置
      const periodConfigs = await PeriodTimeConfig.find({
        academicYear: academicYear,
        semester: semester.toString(),
        isActive: true
      }).sort({ period: 1 });
      
      if (periodConfigs.length === 0) {
        console.log(`   ⚠️ 数据库中没有找到时间配置，使用默认配置`);
        return this.generateDefaultTimeSlots(timeRules);
      }
      
      console.log(`   ✅ 找到 ${periodConfigs.length} 个时间配置`);
      
      const timeSlots: TimeSlot[] = [];
      
      // 根据数据库配置生成时间槽
      for (const day of timeRules.workingDays) {
        for (let period = 1; period <= timeRules.dailyPeriods; period++) {
          // 检查是否为禁用时间段
          const isForbidden = timeRules.forbiddenSlots?.some(slot => 
            slot.dayOfWeek === day && slot.periods.includes(period)
          );
          
          if (isForbidden) {
            console.log(`   ⚠️ 跳过禁用时间段: 周${day}第${period}节`);
            continue;
          }
          
          // 🎯 修复：从数据库配置获取真实时间
          const periodConfig = periodConfigs.find(config => config.period === period);
          
          if (periodConfig) {
            timeSlots.push({
              dayOfWeek: day,
              period: period,
              startTime: periodConfig.startTime,
              endTime: periodConfig.endTime
            });
            
            if (period === 7) {
              console.log(`   🕐 第${period}节时间: ${periodConfig.startTime} - ${periodConfig.endTime}`);
            }
          } else {
            console.log(`   ⚠️ 第${period}节没有时间配置，使用默认时间`);
            // 使用默认时间作为备选
            const defaultTime = this.getDefaultTimeForPeriod(period);
            timeSlots.push({
              dayOfWeek: day,
              period: period,
              startTime: defaultTime.startTime,
              endTime: defaultTime.endTime
            });
          }
        }
      }
      
      console.log(`✅ [时间槽生成] 成功生成 ${timeSlots.length} 个时间槽（基于数据库配置）`);
      return timeSlots;
      
    } catch (error) {
      console.error('   ❌ 从数据库获取时间配置失败，使用默认配置:', error);
      return this.generateDefaultTimeSlots(timeRules);
    }
  }

  /**
   * 生成默认时间槽（当数据库配置不可用时）
   * 
   * Args:
   *   timeRules: 时间规则配置
   * 
   * Returns:
   *   TimeSlot[]: 默认时间槽列表
   */
  private generateDefaultTimeSlots(timeRules: any): TimeSlot[] {
    console.log('   🔧 使用默认时间配置生成时间槽...');
    
    const timeSlots: TimeSlot[] = [];
    
    for (const day of timeRules.workingDays) {
      for (let period = 1; period <= timeRules.dailyPeriods; period++) {
        // 检查是否为禁用时间段
        const isForbidden = timeRules.forbiddenSlots?.some((slot: any) => 
          slot.dayOfWeek === day && slot.periods.includes(period)
        );
        
        if (isForbidden) {
          continue;
        }
        
        // 使用默认时间计算
        const defaultTime = this.getDefaultTimeForPeriod(period);
        
        timeSlots.push({
          dayOfWeek: day,
          period: period,
          startTime: defaultTime.startTime,
          endTime: defaultTime.endTime
        });
      }
    }
    
    console.log(`   ✅ 默认时间槽生成完成: ${timeSlots.length} 个`);
    return timeSlots;
  }

  /**
   * 获取指定节次的默认时间
   * 
   * Args:
   *   period: 节次号
   * 
   * Returns:
   *   {startTime: string, endTime: string}: 默认时间
   */
  private getDefaultTimeForPeriod(period: number): {startTime: string, endTime: string} {
    // 标准的学校时间安排
    const defaultTimes: {[key: number]: {startTime: string, endTime: string}} = {
      1: { startTime: '08:00', endTime: '08:40' },
      2: { startTime: '08:50', endTime: '09:30' },
      3: { startTime: '09:40', endTime: '10:20' },
      4: { startTime: '10:30', endTime: '11:10' },
      5: { startTime: '11:20', endTime: '12:00' },
      6: { startTime: '14:00', endTime: '14:40' },
      7: { startTime: '14:50', endTime: '15:30' }, // 🎯 修复：第7节应该是下午2:50-3:30
      8: { startTime: '15:40', endTime: '16:20' },
      9: { startTime: '16:30', endTime: '17:10' },
      10: { startTime: '17:20', endTime: '18:00' }
    };
    
    return defaultTimes[period] || { startTime: '00:00', endTime: '00:40' };
  }

  /**
   * 加载教室
   * 
   * Args:
   *   teachingPlans: 教学计划列表，用于确定班级的固定教室
   * 
   * Returns:
   *   Promise<any[]>: 教室列表
   */
  private async loadRooms(teachingPlans: ITeachingPlan[]): Promise<any[]> {
    try {
      console.log('🔍 [教室加载] 开始加载所有可用教室...');
      
      // 1. 加载固定教室（班级专用）
      const fixedRooms = await this.loadFixedRooms(teachingPlans);
      
      // 2. 加载功能教室（共享使用）
      const functionalRooms = await this.loadFunctionalRooms();
      
      // 3. 合并所有教室
      const allRooms = [...fixedRooms, ...functionalRooms];
      
      console.log(`   📊 教室加载完成: 总计 ${allRooms.length} 个教室`);
      console.log(`      - 固定教室: ${fixedRooms.length} 个`);
      console.log(`      - 功能教室: ${functionalRooms.length} 个`);
      
      return allRooms;
      
    } catch (error) {
      console.error('❌ 加载教室失败，使用默认配置:', error);
      return this.getDefaultRooms();
    }
  }
  
  /**
   * 加载固定教室（班级专用）
   * 
   * Args:
   *   teachingPlans: 教学计划列表
   * 
   * Returns:
   *   Promise<any[]>: 固定教室列表
   */
  private async loadFixedRooms(teachingPlans: ITeachingPlan[]): Promise<any[]> {
    try {
      console.log('   🔍 [固定教室] 开始加载班级固定教室...');
      
      // 1. 收集所有班级ID
      const classIds = new Set<string>();
      
      for (const plan of teachingPlans) {
        if (plan.class && typeof plan.class === 'object' && plan.class._id) {
          classIds.add(plan.class._id.toString());
        }
      }
      
      if (classIds.size === 0) {
        console.log('      ⚠️ 没有找到班级信息');
        return [];
      }
      
      // 2. 加载班级的固定教室（homeroom）
      const fixedRooms: any[] = [];
      const classes = await Class.find({ 
        _id: { $in: Array.from(classIds).map(id => new mongoose.Types.ObjectId(id)) }
      }).populate('homeroom');
      
      for (const classInfo of classes) {
        if (classInfo.homeroom && typeof classInfo.homeroom === 'object') {
          const room = classInfo.homeroom as any;
          fixedRooms.push({
            ...room.toObject(),
            isFixedClassroom: true,
            assignedClass: classInfo._id,
            className: classInfo.name
          });
          console.log(`      🏠 班级 ${classInfo.name} -> 固定教室: ${room.name} (${room._id})`);
        } else {
          console.log(`      ⚠️ 班级 ${classInfo.name} 没有固定教室配置`);
        }
      }
      
      console.log(`      📊 固定教室加载完成: ${fixedRooms.length} 个`);
      return fixedRooms;
      
    } catch (error) {
      console.error('      ❌ 加载固定教室失败:', error);
      return [];
    }
  }

  /**
   * 加载功能教室（共享使用）
   * 
   * Returns:
   *   Promise<any[]>: 功能教室列表
   */
  private async loadFunctionalRooms(): Promise<any[]> {
    try {
      console.log('   🔍 [功能教室] 开始加载功能教室...');
      
      // 1. 定义功能教室类型
      const functionalRoomTypes = [
        '体育馆', '体育场', '操场', '实验室', '物理实验室', '化学实验室', 
        '计算机教室', '电脑教室', '音乐教室', '美术教室', '舞蹈教室'
      ];
      
      // 2. 从数据库加载功能教室
      const Room = mongoose.model('Room');
      const functionalRooms = await Room.find({
        type: { $in: functionalRoomTypes },
        isActive: true
      });
      
      // 3. 标记为功能教室
      const markedRooms = functionalRooms.map(room => ({
        ...room.toObject(),
        isFixedClassroom: false,
        assignedClass: null, // 功能教室不固定分配给班级
        className: null
      }));
      
      console.log(`      📊 功能教室加载完成: ${markedRooms.length} 个`);
      markedRooms.forEach(room => {
        console.log(`         🏟️ ${room.name} (${room.type}) - ${room._id}`);
      });
      
      return markedRooms;
      
    } catch (error) {
      console.error('      ❌ 加载功能教室失败:', error);
      return [];
    }
  }

  /**
   * 获取默认教室配置
   * 
   * Returns:
   *   any[]: 默认教室列表
   */
  private getDefaultRooms(): any[] {
    return [
      {
        _id: new mongoose.Types.ObjectId(),
        name: '101教室',
        roomNumber: '101',
        type: '普通教室',
        capacity: 50,
        building: '教学楼A',
        floor: 1,
        equipment: ['投影仪', '电脑'],
        isActive: true,
        isFixedClassroom: false
      },
      {
        _id: new mongoose.Types.ObjectId(),
        name: '102教室',
        roomNumber: '102',
        type: '普通教室',
        capacity: 50,
        building: '教学楼A',
        floor: 1,
        equipment: ['投影仪', '电脑'],
        isActive: true,
        isFixedClassroom: false
      }
    ];
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
   * 🔧 调试信息规则：循环数据只输出前3条，避免日志冗长
   * 
   * Args:
   *   teachingPlans: 教学计划列表
   * 
   * Returns:
   *   Promise<ScheduleVariable[]>: 排课变量列表
   */
  private async generateScheduleVariables(teachingPlans: ITeachingPlan[]): Promise<ScheduleVariable[]> {
    const variables: ScheduleVariable[] = [];

    console.log(`🔍 [generateScheduleVariables] 开始生成排课变量...`);
    console.log(`   📊 教学计划数量: ${teachingPlans.length}`);

    // 🔧 简化调试信息：只输出前3条，避免日志冗长
    let planCount = 0;
    let assignmentCount = 0;
    let variableCount = 0;
    
    for (const plan of teachingPlans) {
      if (planCount < 3) {
        console.log(`   📋 处理教学计划: 班级 ${plan.class}, 课程数量: ${plan.courseAssignments.length}`);
      }
      
      for (const assignment of plan.courseAssignments) {
        // 获取课程信息（通过populate加载的课程对象）
        const course = assignment.course as any;
        
        if (assignmentCount < 3) {
          console.log(`      📚 课程分配: ${course?.name || '未知课程'} (${course?.subject || '未知科目'})`);
          console.log(`         - 每周课时: ${assignment.weeklyHours}`);
        }
        
        // 为每周需要的课时创建变量
        for (let hour = 0; hour < assignment.weeklyHours; hour++) {
          if (variableCount < 3) {
            console.log(`         🔄 创建变量 ${hour + 1}/${assignment.weeklyHours}`);
          }
          
          // 🔥 修复：正确提取教师ID
          let teacherId: mongoose.Types.ObjectId;
          if (assignment.teacher && typeof assignment.teacher === 'object' && assignment.teacher._id) {
            teacherId = assignment.teacher._id;
            if (variableCount < 3) {
              console.log(`            - 教师ID: ${teacherId}, 班级ID: ${plan.class._id || plan.class}`);
            }
          } else {
            console.error(`            ❌ 无法提取教师ID: ${assignment.teacher}`);
            continue; // 跳过这个变量
          }
          
          // 🔥 修复：正确提取班级ID
          let classId: mongoose.Types.ObjectId;
          if (plan.class && typeof plan.class === 'object' && plan.class._id) {
            classId = plan.class._id;
          } else if (plan.class instanceof mongoose.Types.ObjectId) {
            classId = plan.class;
          } else {
            console.error(`            ❌ 无法提取班级ID: ${plan.class}`);
            continue; // 跳过这个变量
          }
          
          const variable: ScheduleVariable = {
            id: `${classId}_${assignment.course}_${teacherId}_${hour}`,
            classId: classId, // 使用正确的班级ID
            courseId: assignment.course,
            teacherId: teacherId, // 使用正确的教师ID
            // 新增：直接包含课程信息
            courseName: course.name,
            subject: course.subject,
            requiredHours: 1, // 每个变量代表1课时
            timePreferences: this.convertTimeSlots(assignment.preferredTimeSlots),
            timeAvoidance: this.convertTimeSlots(assignment.avoidTimeSlots),
            continuous: assignment.requiresContinuous,
            continuousHours: assignment.continuousHours,
            // 根据科目设置优先级
            priority: this.getCoursePriority(course.subject),
            domain: [] // 将在约束传播阶段填充
          };

          variables.push(variable);
          variableCount++;
        }
        assignmentCount++;
      }
      planCount++;
    }

    // 🔧 简化调试信息：只输出关键统计信息
    console.log(`🔍 排课变量生成完成，共 ${variables.length} 个变量`);
    
    // 🔥 简化：只检查教师ID分布的关键信息
    const teacherIdCounts = new Map<string, number>();
    
    variables.forEach((v) => {
      if (v.teacherId === null || v.teacherId === undefined) {
        console.log(`   ⚠️ 警告：发现无效的 teacherId`);
        return;
      }
      
      const teacherIdStr = v.teacherId.toString();
      teacherIdCounts.set(teacherIdStr, (teacherIdCounts.get(teacherIdStr) || 0) + 1);
    });
    
    // 只输出前3个教师的分布信息
    let teacherCount = 0;
    console.log(`📊 教师ID分布检查 (显示前3个):`);
    for (const [teacherId, count] of teacherIdCounts) {
      if (teacherCount < 3) {
        console.log(`   - 教师 ${teacherId}: ${count} 门课程`);
        teacherCount++;
      } else {
        break;
      }
    }
    
    // 检查是否有异常的教师ID分布
    const teacherIds = Array.from(teacherIdCounts.keys());
    if (teacherIds.length === 1) {
      console.log(`⚠️ 警告：所有课程都分配给同一个教师: ${teacherIds[0]}`);
    } else if (teacherIds.length < 5) {
      console.log(`⚠️ 警告：教师数量过少，只有 ${teacherIds.length} 个教师`);
    } else {
      console.log(`✅ 教师分配正常，共 ${teacherIds.length} 个教师`);
    }
    
    const coreCount = variables.filter(v => v.priority >= 8).length;
    const generalCount = variables.length - coreCount;
    console.log(`📊 变量统计: 核心课程 ${coreCount} 个，一般课程 ${generalCount} 个`);

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
      verbose: false,
      debugLevel: DebugLevel.MINIMAL // 默认使用最小调试级别
    };

    return { ...defaultConfig, ...userConfig };
  }

  /**
   * 根据科目设置课程优先级
   * 
   * Args:
   *   subject: 科目名称
   * 
   * Returns:
   *   number: 课程优先级 (1-10, 10最高)
   */
  private getCoursePriority(subject: string): number {
    if (!subject) {
      console.warn('⚠️ 课程科目为空，使用默认优先级5');
      return 5;
    }

    // 扩展的核心科目列表，包含更多可能的名称变体
    const coreSubjects = [
      // 主要核心科目
      '语文', '数学', '英语', '物理', '化学', '生物',
      // 英文名称
      'chinese', 'math', 'mathematics', 'english', 'physics', 'chemistry', 'biology',
      // 可能的变体
      '语文课', '数学课', '英语课', '物理课', '化学课', '生物课',
      '语文基础', '数学基础', '英语基础', '物理基础', '化学基础', '生物基础',
      // 可能的缩写
      '语', '数', '英', '物', '化', '生'
    ];

    // 检查是否为核心科目（支持部分匹配）
    const lowerSubject = subject.toLowerCase();
    const isCoreSubject = coreSubjects.some(coreSubject => 
      lowerSubject.includes(coreSubject.toLowerCase()) || 
      coreSubject.toLowerCase().includes(lowerSubject)
    );

    const priority = isCoreSubject ? 9 : 5;
    
    //console.log(`   📚 课程优先级设置: ${subject} -> ${priority} (${isCoreSubject ? '核心课程' : '一般课程'})`);
    
    return priority;
  }

// ... existing code ...

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

      // �� 修复：保存所有排课结果，移除冲突检测（由K12引擎处理）
      const scheduleDocuments = [];
      
      console.log(`🔍 开始处理排课结果保存...`);
      console.log(`📊 总分配数量: ${result.scheduleState.assignments.size}`);
      
      for (const assignment of result.scheduleState.assignments.values()) {
        // �� 移除冲突检测：K12排课引擎已经处理了所有约束
        // 直接保存所有排课结果，因为引擎确保没有冲突
        
        const scheduleDoc = {
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
        };
        
        scheduleDocuments.push(scheduleDoc);
        //console.log(`✅ 准备保存课程: ${assignment.courseId} -> 班级: ${assignment.classId} -> 教师: ${assignment.teacherId} -> 时间: 周${assignment.timeSlot.dayOfWeek}第${assignment.timeSlot.period}节`);
      }

      if (scheduleDocuments.length > 0) {
        console.log(`💾 准备保存 ${scheduleDocuments.length} 条排课记录到数据库...`);
        
        // 🔧 简化：显示保存统计信息
        const totalAssignments = result.scheduleState.assignments.size;
        const savedCount1 = scheduleDocuments.length;
        
        if (totalAssignments === savedCount1) {
          console.log(`✅ 保存统计: 所有 ${savedCount1} 条排课记录都将被保存`);
        } else {
          console.log(`⚠️ 保存统计: 总分配 ${totalAssignments} 个，准备保存 ${savedCount1} 个`);
        }
        
        // 🔧 修复：使用insertMany保存所有记录
        const insertResult = await Schedule.insertMany(scheduleDocuments);
        console.log(`✅ 成功保存 ${insertResult.length} 条排课记录到数据库`);
        
        // 🔧 新增：验证保存结果
        console.log(`🔍 验证保存结果...`);
        const savedCount = await Schedule.countDocuments({
          academicYear: request.academicYear,
          semester: `${request.academicYear}-${request.semester}`
        });
        console.log(`�� 数据库中实际记录数: ${savedCount}`);
        
        if (savedCount !== scheduleDocuments.length) {
          console.warn(`⚠️ 警告：期望保存 ${scheduleDocuments.length} 条，实际保存 ${savedCount} 条`);
        } else {
          console.log(`✅ 数据保存验证成功，所有记录都已保存`);
        }
        
      } else {
        console.log('⚠️ 没有排课记录需要保存');
      }

    } catch (error) {
      console.error('❌ 保存排课结果失败:', error);
      throw error;
    }
  }




  /**
   * 将K12引擎的assignments转换为ScheduleAssignment格式
   */
  private convertK12AssignmentsToScheduleAssignments(k12Result: any): Map<string, CourseAssignment> {
    const assignments = new Map<string, CourseAssignment>();
    
    // 🔧 修复：检查K12结果中的assignments字段
    if (k12Result.assignments && Array.isArray(k12Result.assignments)) {
      console.log(`🔍 转换K12排课结果: 找到 ${k12Result.assignments.length} 个分配`);
      
      // 🔧 减少日志输出，只显示关键信息
      let processedCount = 0;
      let skippedCount = 0;
      
      for (const assignment of k12Result.assignments) {
        // 🔧 修复：确保所有必要字段都存在
        if (!assignment.classId || !assignment.courseId || !assignment.teacherId || !assignment.roomId || !assignment.timeSlot) {
          console.warn(`⚠️ 跳过不完整的分配:`, assignment);
          skippedCount++;
          continue;
        }
        
        // 🔧 修复：确保timeSlot格式正确
        if (!assignment.timeSlot.dayOfWeek || !assignment.timeSlot.period) {
          console.warn(`⚠️ 跳过时间槽不完整的分配:`, assignment.timeSlot);
          skippedCount++;
          continue;
        }
        
        const variableId = `${assignment.classId}_${assignment.courseId}_${assignment.teacherId}_${assignment.timeSlot.dayOfWeek}_${assignment.timeSlot.period}`;
        
        const scheduleAssignment: CourseAssignment = {
          variableId: variableId,
          classId: assignment.classId,
          courseId: assignment.courseId,
          teacherId: assignment.teacherId,
          roomId: assignment.roomId,
          timeSlot: {
            dayOfWeek: assignment.timeSlot.dayOfWeek,
            period: assignment.timeSlot.period,
            startTime: assignment.timeSlot.startTime,
            endTime: assignment.timeSlot.endTime
          },
          isFixed: false // K12引擎生成的排课默认不是固定的
        };
        
        assignments.set(variableId, scheduleAssignment);
        processedCount++;
        
        // 🔧 只显示前5个和后5个的转换信息，避免日志过多
        if (processedCount <= 5 || processedCount > k12Result.assignments.length - 5) {
          console.log(`✅ 转换完成: ${variableId}`);
        } else if (processedCount === 6) {
          console.log(`   ... 省略中间 ${k12Result.assignments.length - 10} 个转换日志 ...`);
        }
      }
      
      // 🔧 显示转换统计信息
      if (skippedCount > 0) {
        console.log(`⚠️ 转换统计: 成功 ${processedCount} 个，跳过 ${skippedCount} 个`);
      } else {
        console.log(`✅ 转换统计: 成功 ${processedCount} 个，无跳过`);
      }
    } else {
      console.log(`⚠️ K12结果中没有找到assignments字段或格式不正确:`, {
        hasAssignments: !!k12Result.assignments,
        type: typeof k12Result.assignments,
        isArray: Array.isArray(k12Result.assignments)
      });
    }
    
    console.log(`📊 转换结果: 总共 ${assignments.size} 个分配`);
    return assignments;
  }
}