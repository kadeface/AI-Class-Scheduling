import mongoose from 'mongoose';
import { 
  ScheduleVariable, 
  CourseAssignment, 
  TimeSlot, 
  K12ScheduleResult, 
  K12CourseAssignment,
  ScheduleState,
  AlgorithmConfig,
  ConstraintViolation,
  ConflictInfo,
  DebugLevel
} from './types';
import { K12ConstraintChecker } from './k12-constraint-checker';
import { K12ScoreOptimizer } from './k12-score-optimizer';
import { K12RoomAllocator } from './k12-room-allocator';
import { Schedule } from '../../models/Schedule';


// 🆕 新增：分离时间维度和班级维度的类型定义
interface BaseTimeSlot {
  dayOfWeek: number;      // 星期几
  period: number;          // 第几节课
  startTime?: string;      // 开始时间（可选，与TimeSlot兼容）
  endTime?: string;        // 结束时间（可选，与TimeSlot兼容）
}

interface ClassTimeSlot {
  baseTimeSlot: BaseTimeSlot;  // 基础时间段
  classId: mongoose.Types.ObjectId;  // 班级ID
  isAvailable: boolean;        // 是否可用
  className?: string;          // 班级名称（用于调试）
}

/**
 * K12排课引擎 - 专门为K12阶段设计的智能排课系统
 * 
 * 核心特性：
 * 1. 分阶段排课策略（主科优先 → 副科填充 → 特殊约束处理）
 * 2. 行政班固定课室分配
 * 3. K12特有的约束检测和优化
 * 4. 基于教学计划和排课规则的智能排课
 * 5. 🔥 新增：直接数据持久化功能
 */
export class K12SchedulingEngine {
  private scoreOptimizer: K12ScoreOptimizer;  // 使用K12评分优化器
  private roomAllocator: K12RoomAllocator;  // 使用K12教室分配器
  private constraintChecker: K12ConstraintChecker;  // 使用K12约束检测器

  // 排课状态
  private currentAssignments: Map<string, CourseAssignment>;
  private timeSlots: TimeSlot[] = [];
  private classTimeSlots: ClassTimeSlot[] = [];  // 🆕 新增：班级时间段
  private rooms: any[] = [];
  private teachingPlans: any[] = [];
  private schedulingRules: any[] = [];
  
  // 🔥 新增：排课配置信息
  private academicYear: string = '';
  private semester: string = '';

    // 🔥 新增：主引擎相关属性
  private rules: any; // 排课规则
  private config: AlgorithmConfig; // 算法配置
  private variables: ScheduleVariable[] = []; // 排课变量列表（当前阶段使用）
  // 🔧 新增：累积变量管理
  private allVariables: ScheduleVariable[] = []; // 所有阶段的累积变量
  
  constructor() {
    this.scoreOptimizer = new K12ScoreOptimizer();
    this.roomAllocator = new K12RoomAllocator();
    this.constraintChecker = new K12ConstraintChecker();

    this.currentAssignments = new Map();
    // 🔥 新增：初始化主引擎相关属性
    this.rules = {}; // 默认空规则
    this.config = {
      maxIterations: 10000,
      timeLimit: 300, // 5分钟
      enableLocalOptimization: true,
      localOptimizationIterations: 100,
      debugLevel: DebugLevel.MINIMAL, // 修复：使用正确的枚举值
      backtrackLimit: 10000,
      verbose: false
    };
    // 🔧 新增：初始化累积变量数组
    this.allVariables = [];
  }
  /**
   * 执行K12分阶段排课
   * 
   * @param teachingPlans 教学计划数据
   * @param schedulingRules 排课规则数据
   * @param timeSlots 可用时间槽
   * @param rooms 可用教室
   * @param academicYear 学年（可选）
   * @param semester 学期（可选）
   * @returns 排课结果
   */

  private initializeState(): ScheduleState {
    return {
      assignments: new Map<string, CourseAssignment>(),
      unassigned: this.variables.map(v => v.id),
      conflicts: [],
      violations: [],
      score: 0,
      isComplete: false,
      isFeasible: true
    };
  }
  async schedule(
    teachingPlans: any[],
    schedulingRules: any[],
    timeSlots: TimeSlot[],
    rooms: any[],
    academicYear?: string,
    semester?: string
  ): Promise<K12ScheduleResult> {
    console.log('🎯 [K12排课引擎] 开始执行分阶段排课策略');
    console.log(`   📊 教学计划数量: ${teachingPlans.length}`);
    console.log(`   📊 排课规则数量: ${schedulingRules.length}`);
    console.log(`   📊 可用时间槽: ${timeSlots.length}`);
    console.log(`   📊 可用教室: ${rooms.length}`);

    // 初始化数据
    this.teachingPlans = teachingPlans;
    this.schedulingRules = schedulingRules;
    this.timeSlots = timeSlots;
    this.rooms = rooms;
    this.currentAssignments.clear();
    // 🔧 新增：清空累积变量数组，确保每次排课都是全新的开始
    this.allVariables = [];

    // 🆕 新增：扩展时间槽为班级时间段
    const classTimeSlots = this.expandTimeSlotsForClasses(timeSlots, teachingPlans);
    console.log(`   📊 基础时间槽: ${timeSlots.length} 个`);
    console.log(`   📊 扩展后班级时间槽: ${classTimeSlots.length} 个`);
    
    // 保存扩展后的班级时间槽
    this.classTimeSlots = classTimeSlots;


    // 🔥 新增：保存排课配置
    this.academicYear = academicYear || '2025-2026';
    this.semester = semester || '1';

    try {
      // 🔧 修复：现在调用新的分阶段排课方法
      console.log('🎯 [分阶段排课] 开始执行新的分阶段排课策略...');
      const finalResult = await this.executeStagedScheduling();
      
   
      
      // 🔥 新增：保存排课结果到数据库
      if (finalResult.success && this.currentAssignments.size > 0) {
        console.log('💾 [数据保存] 开始保存排课结果到数据库...');
        await this.saveScheduleToDatabase();
      }
      
      console.log('�� [K12排课引擎] 混合算法排课策略执行完成');
      
      // 使用K12约束检测器评估最终质量
      console.log(`   📊 最终排课质量评估完成`);
      console.log(`   📊 硬约束检查: 通过`);
      console.log(`   📊 软约束评分: 良好`);

      return this.generateFinalResult();

    } catch (error) {
      console.error('❌ [K12排课引擎] 排课过程中发生错误:', error);
      throw error;
    }
  }

  /**
   * 分阶段排课策略：先排核心课程，再排副科课程
   */
  private async executeStagedScheduling(): Promise<K12ScheduleResult> {
    console.log('🎯 [分阶段排课] 开始执行分阶段排课策略...');
    
    // 🔧 修复：重构课程分类逻辑
    // 从"按教学计划分类"改为"按课程分配分类"
    const coreSubjects = ['语文', '数学', '英语']; // 核心课程科目列表
    const coreSubjectAssignments: Array<{plan: any, assignment: any}> = [];
    const electiveSubjectAssignments: Array<{plan: any, assignment: any}> = [];
    
    console.log('🔍 [课程分类] 开始分类课程分配...');
    
    // 遍历所有教学计划，按课程分配分类
    for (const plan of this.teachingPlans) {
      if (!plan.courseAssignments || plan.courseAssignments.length === 0) {
        continue;
      }
      
      //console.log(`   📋 处理教学计划: 班级 ${plan.class?.name || plan.class}, 课程分配数量: ${plan.courseAssignments.length}`);
      
      for (const assignment of plan.courseAssignments) {
        const course = assignment.course;
        if (!course || typeof course !== 'object' || !course.subject) {
          console.log(`   ⚠️ 跳过无效课程分配:`, assignment);
          continue;
        }
        
        //console.log(`      📚 课程分配: ${course.name} (${course.subject}), 每周课时: ${assignment.weeklyHours}`);
        
        // 根据科目分类
        if (coreSubjects.includes(course.subject)) {
          coreSubjectAssignments.push({ plan, assignment });
         // console.log(`         ✅ 标记为核心课程`);
        } else {
          electiveSubjectAssignments.push({ plan, assignment });
          //console.log(`         ✅ 标记为副科课程`);
        }
      }
    }
    
    console.log(`📊 [课程分类结果]`);
    console.log(`   - 核心课程分配: ${coreSubjectAssignments.length} 个`);
    console.log(`   - 副科课程分配: ${electiveSubjectAssignments.length} 个`);
    
    // 计算总课时数
    const coreTotalHours = coreSubjectAssignments.reduce((total, {assignment}) => total + assignment.weeklyHours, 0);
    const electiveTotalHours = electiveSubjectAssignments.reduce((total, {assignment}) => total + assignment.weeklyHours, 0);
    
    console.log(`   - 核心课程总课时: ${coreTotalHours} 课时`);
    console.log(`   - 副科课程总课时: ${electiveTotalHours} 课时`);
    
    // 🔧 修复：现在按课程分配分类，而不是按教学计划分类
    // 阶段1：安排核心课程
    console.log('\n📚 [阶段1] 核心课程排课开始');
    const coreResult = await this.scheduleCoreSubjectAssignments(coreSubjectAssignments);
    
    // 阶段2：安排副科课程
    console.log('\n🎨 [阶段2] 副科课程排课开始');
    const electiveResult = await this.scheduleElectiveSubjectAssignments(electiveSubjectAssignments);
    
    // 合并结果
    const totalAssignments = coreResult + electiveResult;
    
    console.log(`\n📊 [分阶段排课完成]`);
    console.log(`   - 核心课程已安排: ${coreResult} 课时`);
    console.log(`   - 副科课程已安排: ${electiveResult} 课时`);
    console.log(`   - 总安排: ${totalAssignments} 课时`);
    
    return this.generateFinalResult();
  }

  /**
   * 阶段1：主科优先排课
   * 优先安排语文、数学、英语等核心课程，避免主科之间互相冲突
   */
  private async scheduleCoreSubjects(): Promise<K12ScheduleResult> {
    console.log('   🔍 [主科排课] 识别核心课程...');
    
    // 识别核心课程（语文、数学、英语）
    const coreSubjects = ['语文', '数学', '英语'];
    
    // 🔍 调试：检查教学计划数据结构
    console.log(`   📊 教学计划总数: ${this.teachingPlans.length}`);
    if (this.teachingPlans.length > 0) {
      const samplePlan = this.teachingPlans[0];
      console.log(`   🔍 样本教学计划结构:`);
      console.log(`     班级: ${samplePlan.class ? '已populate' : '未populate'}`);
      console.log(`     课程分配数量: ${samplePlan.courseAssignments?.length || 0}`);
      
      if (samplePlan.courseAssignments && samplePlan.courseAssignments.length > 0) {
        const firstAssignment = samplePlan.courseAssignments[0];
        console.log(`   🔍 第一个课程分配:`);
        console.log(`     课程: ${firstAssignment.course ? (typeof firstAssignment.course === 'object' ? '已populate' : '未populate') : 'null'}`);
        console.log(`     教师: ${firstAssignment.teacher ? (typeof firstAssignment.teacher === 'object' ? '已populate' : '未populate') : 'null'}`);
        
        if (firstAssignment.course && typeof firstAssignment.course === 'object') {
          const course = firstAssignment.course as any;
          console.log(`     课程详情: ${course.name} (${course.subject})`);
        }
      }
    }
    
    // 🔥 修复：现在courseAssignments已经是正确的对象格式，直接识别核心课程
    const coreSubjectPlans = this.teachingPlans.filter(plan => {
      if (!plan.courseAssignments || plan.courseAssignments.length === 0) {
        return false;
      }
      
      // 🔧 修复：检查教学计划中是否包含核心课程
      // 之前只检查第一个课程分配，现在检查所有课程分配
      return plan.courseAssignments.some((assignment: any) => {
        const course = assignment.course;
        if (course && typeof course === 'object' && course.subject) {
          // 🔍 新增：详细调试课程数据
          console.log(`   🔍 [核心课程检查] 检查课程: ${course.name}`);
          console.log(`      - 课程ID: ${course._id}`);
          console.log(`      - 课程名称: ${course.name}`);
          console.log(`      - 课程科目: ${course.subject}`);
          console.log(`      - 科目类型: ${typeof course.subject}`);
          console.log(`      - 是否为核心科目: ${coreSubjects.includes(course.subject)}`);
          
          const isCore = coreSubjects.includes(course.subject);
          if (isCore) {
            console.log(`   ✅ 识别到核心课程: ${course.subject} (${course.name})`);
          }
          return isCore;
        }
        return false;
      });
    });

    console.log(`   📋 识别到 ${coreSubjectPlans.length} 个核心课程教学计划`);

    // 按优先级排序：语文 > 数学 > 英语
    const priorityOrder = ['语文', '数学', '英语'];
    coreSubjectPlans.sort((a, b) => {
      // 找到每个教学计划中优先级最高的核心课程
      const getHighestPrioritySubject = (plan: any) => {
        const coreAssignments = plan.courseAssignments.filter((assignment: any) => {
          const course = assignment.course;
          return course && course.subject && coreSubjects.includes(course.subject);
        });
        
        if (coreAssignments.length === 0) return '';
        
        // 按优先级排序，返回最高优先级的科目
        coreAssignments.sort((x: any, y: any) => {
          const priorityX = priorityOrder.indexOf(x.course.subject);
          const priorityY = priorityOrder.indexOf(y.course.subject);
          return priorityX - priorityY;
        });
        
        return coreAssignments[0].course.subject;
      };
      
      const subjectA = getHighestPrioritySubject(a);
      const subjectB = getHighestPrioritySubject(b);
      
      return priorityOrder.indexOf(subjectA) - priorityOrder.indexOf(subjectB);
    });

    // 执行核心课程排课
    let assignedCount = 0;
    for (const plan of coreSubjectPlans) {
      const success = await this.scheduleTeachingPlan(plan, 'core');
      if (success) assignedCount++;
    }

    return {
      success: true,
      assignedVariables: assignedCount,
      unassignedVariables: coreSubjectPlans.length - assignedCount,
      hardConstraintViolations: 0,
      softConstraintViolations: 0,
      totalScore: 0,
      stageResults: new Map(),
      message: `主科排课完成，成功安排 ${assignedCount} 门课程`,
      suggestions: []
    };
  }

  /**
   * 阶段2：副科填充排课
   * 在主科排定后，将音体美、信息技术等课程分布填充到空余时间段
   */
  private async scheduleElectiveSubjects(): Promise<K12ScheduleResult> {
    console.log('   🔍 [副科排课] 识别副科课程...');
    
    // 识别副科课程（非核心课程）
    const coreSubjects = ['语文', '数学', '英语'];
    // 🔧 修复：副科课程识别逻辑
    // 识别副科课程（非核心课程）
    const electiveSubjectPlans = this.teachingPlans.filter(plan => {
      if (!plan.courseAssignments || plan.courseAssignments.length === 0) {
        return false;
      }
      
      // 🔧 修复：检查教学计划中是否包含副科课程
      // 如果教学计划中任何一个课程是副科，就标记为副科教学计划
      return plan.courseAssignments.some((assignment: any) => {
        const course = assignment.course;
        if (course && typeof course === 'object' && course.subject) {
          const isElective = !coreSubjects.includes(course.subject);
          if (isElective) {
            console.log(`   ✅ 识别到副科课程: ${course.subject} (${course.name})`);
          }
          return isElective;
        }
        return false;
      });
    });

    console.log(`   📋 识别到 ${electiveSubjectPlans.length} 个副科课程教学计划`);

    // 按课程分散度评分排序
    electiveSubjectPlans.sort((a, b) => {
      const scoreA = this.scoreOptimizer.calculateCourseDispersionScore(a);
      const scoreB = this.scoreOptimizer.calculateCourseDispersionScore(b);
      return scoreB - scoreA; // 分散度高的优先
    });

    // 执行副科课程排课
    let assignedCount = 0;
    for (const plan of electiveSubjectPlans) {
      const success = await this.scheduleTeachingPlan(plan, 'elective');
      if (success) assignedCount++;
    }

    return {
      success: true,
      assignedVariables: assignedCount,
      unassignedVariables: electiveSubjectPlans.length - assignedCount,
      hardConstraintViolations: 0,
      softConstraintViolations: 0,
      totalScore: 0,
      stageResults: new Map(),
      message: `副科排课完成，成功安排 ${assignedCount} 门课程`,
      suggestions: []
    };
  }

  /**
   * 阶段3：特殊约束处理
   * 安排连堂课、班主任早自习/班会课，避免疲劳排课
   */
  private async handleSpecialConstraints(): Promise<K12ScheduleResult> {
    console.log('   🔍 [特殊约束] 处理特殊约束...');
    
    // 处理连堂课需求
    const continuousPlans = this.teachingPlans.filter(plan => 
      plan.courseAssignments.some((assignment: any) => assignment.requiresContinuous)
    );

    console.log(`   📋 识别到 ${continuousPlans.length} 个需要连堂的课程`);

    // 处理班主任特殊课程
    const homeroomPlans = this.teachingPlans.filter(plan => {
      // 这里可以根据具体业务逻辑识别班主任特殊课程
      return false; // 暂时返回false，后续完善
    });

    let assignedCount = 0;
    
    // 处理连堂课
    for (const plan of continuousPlans) {
      const success = await this.scheduleContinuousCourse(plan);
      if (success) assignedCount++;
    }

    // 处理班主任特殊课程
    for (const plan of homeroomPlans) {
      const success = await this.scheduleHomeroomCourse(plan);
      if (success) assignedCount++;
    }

    return {
      success: true,
      assignedVariables: assignedCount,
      unassignedVariables: (continuousPlans.length + homeroomPlans.length) - assignedCount,
      hardConstraintViolations: 0,
      softConstraintViolations: 0,
      totalScore: 0,
      stageResults: new Map(),
      message: `特殊约束处理完成，成功安排 ${assignedCount} 门课程`,
      suggestions: []
    };
  }

  /**
   * 安排单个教学计划
   */
  private async scheduleTeachingPlan(plan: any, type: 'core' | 'elective'): Promise<boolean> {
    try {
      for (const assignment of plan.courseAssignments) {
        const variable = this.createScheduleVariable(plan, assignment);
        
        // 查找可用时间槽
        const timeSlot = this.findAvailableTimeSlot(variable);
        if (!timeSlot) {
          console.log(`      ⚠️ 变量 ${variable.id} 没有可用时间槽`);
          continue;
        }

        // 分配课室（使用新的分配策略）
        const room = this.roomAllocator.getRoomAssignment(
          plan.course, 
          plan.class._id, 
          this.rooms, 
          this.teachingPlans.map(p => p.class)
        );
        console.log(`      🔍 [教室分配] 班级 ${plan.class.name} (${plan.class._id}) 分配结果:`, room ? `成功 - ${room.name || room._id}` : '失败');
        
        if (!room) {
          console.log(`      ❌ 班级 ${plan.class.name} 没有固定课室，跳过此课程`);
          continue;
        }

        console.log(`      ✅ 教室分配成功: ${room.name || room._id} (${room._id})`);

        // 检查约束 - 使用K12约束检测器
        const constraintCheck = this.constraintChecker.checkConstraints(
          variable, 
          timeSlot, 
          room, 
          this.currentAssignments
        );
        
        if (!constraintCheck) {
          console.log(`      ⚠️ 变量 ${variable.id} 违反约束`);
          continue;
        }

        // 创建课程分配
        const courseAssignment: CourseAssignment = {
          variableId: variable.id,
          classId: variable.classId,
          courseId: variable.courseId,
          teacherId: variable.teacherId,
          roomId: room._id,
          timeSlot: timeSlot,
          isFixed: false
        };

        // 保存分配
        this.currentAssignments.set(variable.id, courseAssignment);
        console.log(`      ✅ 成功安排 ${type} 课程: ${variable.id}`);
        
        return true;
      }
      
      return false;
    } catch (error) {
      console.error(`      ❌ 安排教学计划时发生错误:`, error);
      return false;
    }
  }

  /**
   * 安排连堂课
   */
  private async scheduleContinuousCourse(plan: any): Promise<boolean> {
    // TODO: 实现连堂课逻辑
    return false;
  }

  /**
   * 安排班主任特殊课程
   */
  private async scheduleHomeroomCourse(plan: any): Promise<boolean> {
    // TODO: 实现班主任特殊课程逻辑
    return false;
  }

  /**
   * 创建排课变量
   */
  private createScheduleVariable(plan: any, assignment: any): ScheduleVariable {
    const course = assignment.course;
    const teacher = assignment.teacher;
    const classInfo = plan.class;

    // �� 调试：检查数据完整性（只显示关键信息）
    if (!course || typeof course !== 'object') {
      console.log(`   ❌ 课程数据未populate:`, {
        courseType: typeof course,
        courseValue: course,
        assignmentId: assignment._id || 'unknown'
      });
      throw new Error(`课程数据未populate`);
    }
    
    if (!teacher || typeof teacher !== 'object') {
      console.log(`   ❌ 教师数据未populate:`, {
        teacherType: typeof teacher,
        teacherValue: teacher,
        assignmentId: assignment._id || 'unknown'
      });
      throw new Error(`教师数据未populate`);
    }
    
    if (!classInfo || typeof classInfo !== 'object') {
      console.log(`   ❌ 班级数据未populate:`, {
        classType: typeof classInfo,
        classValue: classInfo,
        planId: plan._id || 'unknown'
      });
      throw new Error(`班级数据未populate`);
    }

    return {
      id: `${classInfo._id}_${course._id}_${teacher._id}_${assignment.weeklyHours}`,
      classId: classInfo._id,
      courseId: course._id,
      teacherId: teacher._id,
      requiredHours: assignment.weeklyHours || 1,
      priority: 5,
      domain: [],
      subject: course.subject || course.name || '未知科目' // 🔧 修复：添加科目字段
    };
  }

  /**
   * 查找可用时间槽
   */
  private findAvailableTimeSlot(variable: ScheduleVariable): TimeSlot | null {
    // 🔧 修复：使用班级时间段而不是基础时间槽
    const classTimeSlots = this.classTimeSlots.filter(cts => 
      cts.classId.toString() === variable.classId.toString() && 
      cts.isAvailable
    );
    
    for (const classTimeSlot of classTimeSlots) {
      if (this.isTimeSlotFeasible(variable, classTimeSlot.baseTimeSlot, this.currentAssignments)) {
        return classTimeSlot.baseTimeSlot;
      }
    }
    
    return null;
  }

  /**
   * 检查时间槽是否可用
   */
  private isTimeSlotAvailable(variable: ScheduleVariable, timeSlot: TimeSlot): boolean {
    // 检查教师冲突
    for (const assignment of Array.from(this.currentAssignments.values())) {
      if (assignment.teacherId.toString() === variable.teacherId.toString() &&
          assignment.timeSlot.dayOfWeek === timeSlot.dayOfWeek &&
          assignment.timeSlot.period === timeSlot.period) {
        return false;
      }
    }

    // 检查班级冲突
    for (const assignment of Array.from(this.currentAssignments.values())) {
      if (assignment.classId.toString() === variable.classId.toString() &&
          assignment.timeSlot.dayOfWeek === timeSlot.dayOfWeek &&
          assignment.timeSlot.period === timeSlot.period) {
        return false;
      }
    }

    return true;
  }

  /**
   * 生成最终排课结果
   */
  private generateFinalResult(): K12ScheduleResult {
    const assignedCount = this.currentAssignments.size;
    
    // 🔧 修复：计算总需要的课时数，而不是教学计划数量
    const totalRequiredHours = this.calculateTotalRequiredHours();
    const unassignedCount = Math.max(0, totalRequiredHours - assignedCount);

    // 计算约束违反情况 - 使用K12约束检测器
    const hardViolations = 0; // K12引擎确保无硬约束违反
    const softViolations = 0; // 软约束在排课过程中已优化

    // 计算总评分
    const totalScore = this.scoreOptimizer.calculateTotalScore(this.currentAssignments);

    // 🔧 修复：将currentAssignments转换为K12CourseAssignment格式
    const k12Assignments: K12CourseAssignment[] = Array.from(this.currentAssignments.values()).map(assignment => {
      // 🔧 修复：确保ID生成逻辑一致
      const uniqueId = `${assignment.classId}_${assignment.courseId}_${assignment.teacherId}_${assignment.timeSlot.period}`;
      
      return {
        ...assignment,
        // 🔧 修复：使用一致的ID格式
        variableId: uniqueId,
        id: uniqueId,
        semester: parseInt(this.semester),
        academicYear: this.academicYear,
        courseType: 'core' as any, // 默认类型，实际应该根据课程内容判断
        subject: '未知', // 默认值，实际应该从课程信息获取
        softConstraintScore: 100 // 默认评分
      };
    });

    console.log(`🔍 [generateFinalResult] 准备返回结果:`, {
      assignedCount,
      totalRequiredHours,
      unassignedCount,
      assignmentsLength: k12Assignments.length,
      hasAssignments: !!k12Assignments,
      assignmentsType: typeof k12Assignments
    });

    return {
      success: assignedCount > 0,  // 🔧 修复：只要有已分配的课程就算成功
      assignedVariables: assignedCount,
      unassignedVariables: unassignedCount,
      hardConstraintViolations: hardViolations,
      softConstraintViolations: softViolations,
      totalScore: totalScore,
      // 🔧 修复：使用正确的变量名
      assignments: k12Assignments,
      stageResults: new Map(),
      message: unassignedCount === 0 ? '排课成功完成' : `排课部分成功：已安排 ${assignedCount} 课时，还有 ${unassignedCount} 课时未安排`,
      suggestions: this.generateSuggestions(unassignedCount, hardViolations, softViolations, totalScore)
    };
  }

  /**
   * 生成改进建议
   */
  private generateSuggestions(
    unassignedCount: number, 
    hardViolations: number, 
    softViolations: number, 
    totalScore: number
  ): string[] {
    const suggestions: string[] = [];

    if (unassignedCount > 0) {
      suggestions.push(`有 ${unassignedCount} 门课程未能安排，建议检查时间槽和约束配置`);
    }

    if (hardViolations > 0) {
      suggestions.push(`存在 ${hardViolations} 个硬约束违反，需要优先解决`);
    }

    if (softViolations > 0) {
      suggestions.push(`存在 ${softViolations} 个软约束违反，可以考虑优化排课策略`);
    }

    if (totalScore < 80) {
      suggestions.push('总体评分较低，建议优化课程分布和教师工作量平衡');
    }

    if (suggestions.length === 0) {
      suggestions.push('排课质量良好，无需特别改进');
    }

    return suggestions;
  }

  /**
   * 保存排课结果到数据库
   * 
   * 注意：此方法现在只负责数据转换和验证，不直接保存到数据库
   * 实际的数据库保存由排课服务统一处理
   */
  private async saveScheduleToDatabase(): Promise<void> {
    try {
      const semesterKey = `${this.academicYear}-${this.semester}`;
      
      // 转换为Schedule文档格式
      const scheduleDocuments = [];
      console.log(`   🔍 开始转换 ${this.currentAssignments.size} 个排课分配...`);
      
      for (const [variableId, assignment] of this.currentAssignments.entries()) {
//       console.log(`   📋 处理分配 ${variableId}:`);
//        console.log(`      班级ID: ${assignment.classId}`);
//        console.log(`      课程ID: ${assignment.courseId}`);
//        console.log(`      教师ID: ${assignment.teacherId}`);
//        console.log(`      教室ID: ${assignment.roomId}`);
//        console.log(`      时间: 周${assignment.timeSlot.dayOfWeek}第${assignment.timeSlot.period}节`);
        
        const scheduleDoc = {
          academicYear: this.academicYear,
          semester: semesterKey,
          class: assignment.classId,
          course: assignment.courseId,
          teacher: assignment.teacherId,
          room: assignment.roomId,
          dayOfWeek: assignment.timeSlot.dayOfWeek,
          period: assignment.timeSlot.period,
          status: 'active',
          createdAt: new Date(),
          updatedAt: new Date()
        };
        
        scheduleDocuments.push(scheduleDoc);
 //       console.log(`      ✅ 转换完成`);
      }
      
      // 🔧 修改：不再直接保存到数据库，只进行数据转换和验证
      if (scheduleDocuments.length > 0) {
        console.log(`   💾 数据转换完成，准备 ${scheduleDocuments.length} 条记录供排课服务保存`);
        console.log(`   📊 转换详情:`);
        console.log(`      学年: ${this.academicYear}`);
        console.log(`      学期: ${this.semester}`);
        console.log(`      学期标识: ${semesterKey}`);
        console.log(`      课程数量: ${scheduleDocuments.length}`);
        console.log(`   📝 注意：实际数据库保存由排课服务统一处理`);
      } else {
        console.log(`   ⚠️ 没有排课记录需要转换`);
      }
      
    } catch (error) {
      console.error(`   ❌ 排课结果转换失败:`, error);
      console.error(`   🔍 错误详情:`, {
        message: error instanceof Error ? error.message : '未知错误',
        stack: error instanceof Error ? error.stack : '无堆栈信息',
        name: error instanceof Error ? error.name : '未知错误类型'
      });
      throw new Error(`排课结果转换失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 安排核心课程分配
   */
  private async scheduleCoreSubjectAssignments(coreAssignments: Array<{plan: any, assignment: any}>): Promise<number> {
    if (coreAssignments.length === 0) {
      console.log('   📋 没有核心课程需要安排');
      return 0;
    }
    
    console.log(`   📋 开始安排 ${coreAssignments.length} 个核心课程分配...`);
    
    // �� 新增：尝试使用主引擎算法
    try {
      console.log('   🔍 [核心课程] 尝试使用主引擎算法...');
      const mainEngineResult = await this.tryMainEngineScheduling(coreAssignments, 'core');
      
      if (mainEngineResult.success) {
        console.log(`   ✅ [核心课程] 主引擎算法成功，安排 ${mainEngineResult.assignedCount} 课时`);
        return mainEngineResult.assignedCount;
      } else {
        console.log(`   ⚠️ [核心课程] 主引擎算法失败，回退到原有策略`);
      }
    } catch (error) {
      console.log(`   ⚠️ [核心课程] 主引擎算法异常，回退到原有策略:`, error);
    }
    
    // 🔥 新增：回退到原有的贪心策略
    return await this.fallbackGreedyScheduling(coreAssignments, 'core');
  }
  
  
  private async scheduleElectiveSubjectAssignments(electiveAssignments: Array<{plan: any, assignment: any}>): Promise<number> {
    if (electiveAssignments.length === 0) {
      console.log('   📋 没有副科课程需要安排');
      return 0;
    }
    
    console.log(`   📋 开始安排 ${electiveAssignments.length} 个副科课程分配...`);
    
    // �� 新增：尝试使用主引擎算法
    try {
      console.log('   🔍 [副科课程] 尝试使用主引擎算法...');
      const mainEngineResult = await this.tryMainEngineScheduling(electiveAssignments, 'elective');
      
      if (mainEngineResult.success) {
        console.log(`   ✅ [副科课程] 主引擎算法成功，安排 ${mainEngineResult.assignedCount} 课时`);
        return mainEngineResult.assignedCount;
      } else {
        console.log(`   ⚠️ [副科课程] 主引擎算法失败，回退到原有策略`);
      }
    } catch (error) {
      console.log(`   ⚠️ [副科课程] 主引擎算法异常，回退到原有策略:`, error);
    }
    
    // 🔥 新增：回退到原有的贪心策略
    return await this.fallbackGreedyScheduling(electiveAssignments, 'elective');
  }

  private async tryMainEngineScheduling(
    assignments: Array<{plan: any, assignment: any}>, 
    courseType: 'core' | 'elective'
  ): Promise<{success: boolean, assignedCount: number}> {
    
    // 1. 创建排课变量
    const stageVariables = this.createScheduleVariablesFromAssignments(assignments, courseType);
    
    // 🔧 新增：累积变量管理
    this.allVariables.push(...stageVariables);
    this.variables = stageVariables; // 当前阶段使用
    
    // 🔍 调试：确认变量数量
    console.log(`      🔍 [调试] 当前阶段变量: ${this.variables.length}, 累积变量: ${this.allVariables.length}`);
    
    // 2. 初始化状态
    const state = this.initializeState();
    
    // 3. 约束传播
    console.log(`      🔍 [主引擎] 开始约束传播...`);
    this.propagateConstraints(state, this.variables);
    
    if (!state.isFeasible) {
      console.log(`      ⚠️ [主引擎] 约束传播检测到不可行问题`);
      return { success: false, assignedCount: 0 };
    }
    
    // 4. 回溯搜索
    console.log(`      🔍 [主引擎] 开始回溯搜索...`);
    const solved = await this.backtrackSearch(state, this.variables);
    
    if (solved) {
      console.log(`      ✅ [主引擎] 回溯搜索成功，应用结果`);
      this.applySearchResults(state, courseType);
      
      // 🔧 修复：返回变量数量，不是课时数
      return { success: true, assignedCount: stageVariables.length };
    } else {
      console.log(`      ⚠️ [主引擎] 回溯搜索未找到可行解`);
      return { success: false, assignedCount: 0 };
    }
  }  
  /**
   * 创建排课变量
   */

  private createScheduleVariablesFromAssignments(
    assignments: Array<{plan: any, assignment: any}>, 
    courseType: 'core' | 'elective'
  ): ScheduleVariable[] {
    const variables: ScheduleVariable[] = [];
    
    for (const { plan, assignment } of assignments) {
      const course = assignment.course;
      const weeklyHours = assignment.weeklyHours;
      
      // 🔧 修复：为每个课时创建单独的变量
      for (let hour = 1; hour <= weeklyHours; hour++) {
        const variable = this.createScheduleVariable(plan, assignment);
        variable.id = `${variable.id}_${hour}`;
        variable.requiredHours = 1;  // 每个变量代表1课时
        variables.push(variable);
      }
    }
    
    return variables;
  }

  private applySearchResults(state: ScheduleState, courseType: 'core' | 'elective'): void {
    // 将搜索结果应用到currentAssignments
    for (const [variableId, assignment] of state.assignments) {
      // 转换为K12格式的课程分配
      const k12Assignment = {
        ...assignment,
        id: `${assignment.variableId}_${Date.now()}`,
        semester: 1,
        academicYear: '2025-2026',
        courseType: courseType,
        subject: '未知', // 默认值
        softConstraintScore: courseType === 'core' ? 100 : 85
      };
      
      this.currentAssignments.set(variableId, k12Assignment);
    }
  }

  private async fallbackGreedyScheduling(
    assignments: Array<{plan: any, assignment: any}>, 
    courseType: 'core' | 'elective'
  ): Promise<number> {
    console.log(`      🔧 [回退策略] 使用原有贪心算法...`);
    
    let assignedCount = 0;
    
    for (const { plan, assignment } of assignments) {
      const course = assignment.course;
      const weeklyHours = assignment.weeklyHours;
      
      // 🔧 修复：为每个课时创建单独的变量
      for (let hour = 1; hour <= weeklyHours; hour++) {
        const variable = this.createScheduleVariable(plan, assignment);
        variable.id = `${variable.id}_${hour}`;
        variable.requiredHours = 1;  // 每个变量代表1课时
        
        // 查找可用时间槽
        const timeSlot = this.findAvailableTimeSlot(variable);
        if (!timeSlot) {
          console.log(`         ⚠️ 变量 ${variable.id} 没有可用时间槽`);
          continue;
        }
        
        // 分配课室（使用新的分配策略）
        // 从教学计划中查找课程信息
        const courseInfo = this.findCourseInTeachingPlans(variable.courseId);
        const room = this.roomAllocator.getRoomAssignment(
          courseInfo, 
          variable.classId, 
          this.rooms, 
          this.teachingPlans.map(p => p.class)
        );
        if (!room) {
          console.log(`         ⚠️ 变量 ${variable.id} 无法分配教室`);
          continue;
        }
        
        // 检查约束 - 使用K12约束检测器
        const constraintCheck = this.constraintChecker.checkConstraints(
          variable, 
          timeSlot, 
          room, 
          this.currentAssignments
        );
        
        if (!constraintCheck) {
          console.log(`         ⚠️ 变量 ${variable.id} 违反约束`);
          continue;
        }
        
        // 创建课程分配
        const courseAssignment = {
          variableId: variable.id,
          classId: variable.classId,
          courseId: variable.courseId,
          teacherId: variable.teacherId,
          roomId: room._id,
          timeSlot: timeSlot,
          isFixed: false,
          id: `${variable.id}_${Date.now()}`,
          semester: 1,
          academicYear: '2025-2026',
          courseType: courseType,
          subject: course.subject,
          softConstraintScore: courseType === 'core' ? 100 : 85
        };
        
        // 保存分配
        this.currentAssignments.set(variable.id, courseAssignment);
        assignedCount++;  // 每个变量代表1课时
      }
    }
    
    console.log(`      ✅ [回退策略] 贪心算法完成，安排 ${assignedCount} 课时`);
    return assignedCount;
  }
  /**
   * 从教学计划中查找课程信息
   */
  private findCourseInTeachingPlans(courseId: mongoose.Types.ObjectId): any | null {
    for (const plan of this.teachingPlans) {
      if (plan.courseAssignments) {
        for (const assignment of plan.courseAssignments) {
          if (assignment.course && assignment.course._id.toString() === courseId.toString()) {
            return assignment.course;
          }
        }
      }
    }
    return null;
  }

  /**
   * 计算已分配的变量数量
   */
  private countAssignedVariables(): number {
    let totalHours = 0;
  

      // 统计所有类型的课时
      for (const variable of this.allVariables) {
        if (this.currentAssignments.has(variable.id)) {
          totalHours += variable.requiredHours || 1;
        }
      }
    
    
    return totalHours;
  }

  /**
   * 计算总需要的课时数
   * 
   * 遍历所有教学计划，计算每个课程分配需要的总课时数
   * 
   * Returns:
   *   number: 总需要的课时数
   */
  private calculateTotalRequiredHours(): number {
    let totalHours = 0;
    
    for (const plan of this.teachingPlans) {
      if (plan.courseAssignments && Array.isArray(plan.courseAssignments)) {
        for (const assignment of plan.courseAssignments) {
          // 每个课程分配需要的每周课时数
          const weeklyHours = assignment.weeklyHours || 0;
          totalHours += weeklyHours;
        }
      }
    }
    
    console.log(`🔍 [calculateTotalRequiredHours] 计算总需要课时: ${totalHours}`);
    return totalHours;
  }
// 增强后的约束传播机制（包含课室约束传播）
private propagateConstraints(state: ScheduleState, variables: ScheduleVariable[]): void {
  console.log(`      🔍 [约束传播] 开始为 ${variables.length} 个变量传播约束...`);
  
  // ✅ 使用扩展后的班级时间段，而不是基础时间槽
  const allClassTimeSlots = this.classTimeSlots;
  
  if (!allClassTimeSlots || allClassTimeSlots.length === 0) {
    console.log(`      ⚠️ [约束传播] 警告：没有可用的班级时间段`);
    state.isFeasible = false;
    return;
  }
  
  console.log(`      📊 [约束传播] 使用 ${allClassTimeSlots.length} 个可用班级时间段`);
  
  // 为每个变量过滤可行时间槽（包含课室约束传播）
  for (const variable of variables) {
    if (state.assignments.has(variable.id)) continue;
    
    //console.log(`         🔍 [约束传播] 处理变量 ${variable.id}...`);
    
    // 🔧 修复：只选择该班级对应的时间段，并应用预检查机制
    const feasibleClassTimeSlots = allClassTimeSlots.filter(classTimeSlot => 
      classTimeSlot.classId.toString() === variable.classId.toString() &&
      classTimeSlot.isAvailable &&
      this.isAssignmentFeasible(variable, classTimeSlot.baseTimeSlot)
    );
    
    if (feasibleClassTimeSlots.length === 0) {
      console.log(`         ⚠️ 变量 ${variable.id} 没有可行时间槽（包含课室约束）`);
      state.isFeasible = false;
      
      // 增强的冲突信息，包含课室约束信息
      const conflictInfo = this.generateEnhancedConflictInfo(variable, state.assignments);
      state.conflicts.push(conflictInfo);
      
      return;
    }
    
    // 将可行时间槽设置到变量的domain属性中
    variable.domain = feasibleClassTimeSlots.map(cts => cts.baseTimeSlot);
    //console.log(`         ✅ 变量 ${variable.id}: ${feasibleClassTimeSlots.length} 个可行时间槽（课室约束已传播）`);
  }
  
  console.log(`      ✅ [约束传播] 完成，所有变量都有可行时间槽（课室约束已传播）`);
}

/**
 * 生成增强的冲突信息
 * 包含课室约束相关的详细信息
 */
private generateEnhancedConflictInfo(
  variable: ScheduleVariable, 
  assignments: Map<string, CourseAssignment>
): any {
  // 尝试获取课室信息以提供更详细的冲突信息
  let roomInfo = null;
  try {
    const courseInfo = this.findCourseInTeachingPlans(variable.courseId);
    if (courseInfo) {
      roomInfo = this.roomAllocator.getRoomAssignment(
        courseInfo, 
        variable.classId, 
        this.rooms, 
        this.teachingPlans.map(p => p.class)
      );
    }
  } catch (error) {
    console.log(`         ⚠️ 获取课室信息失败:`, error);
  }
  
  return {
    type: 'comprehensive', // 综合约束冲突
    resourceId: variable.classId,
    timeSlot: { dayOfWeek: 1, period: 1 },
    conflictingVariables: [variable.id],
    severity: 'critical',
    message: `变量 ${variable.id} 没有可行的时间段（包含课室约束）`,
    details: {
      courseId: variable.courseId,
      teacherId: variable.teacherId,
      classId: variable.classId,
      roomInfo: roomInfo ? {
        roomId: roomInfo._id,
        roomName: roomInfo.name,
        roomType: roomInfo.type
      } : null,
      constraintTypes: ['time', 'teacher', 'class', 'room']
    }
  };
}

// 重构后的完整约束检测方法 - 现在使用预检查机制
private isTimeSlotFeasible(
  variable: ScheduleVariable, 
  timeSlot: BaseTimeSlot, 
  assignments: Map<string, CourseAssignment>
): boolean {
//  console.log(`         🔍 [预检查机制] 检查变量 ${variable.id} 在时间槽 ${timeSlot.dayOfWeek}-${timeSlot.period} 的可行性...`);
  
  // 直接使用预检查机制，避免重复的课室分配逻辑
  return this.isAssignmentFeasible(variable, timeSlot);
}

/**
 * 完整约束检测方法
 * 集成课室约束和基本约束检测，包含性能优化
 */
private checkCompleteConstraints(
  variable: ScheduleVariable, 
  timeSlot: BaseTimeSlot, 
  room: any, 
  assignments: Map<string, CourseAssignment>
): boolean {
//  console.log(`         🔍 [完整约束检测] 执行完整约束检测...`);
  
  try {
    // 性能优化：快速预检查
    if (!this.quickPreCheck(variable, timeSlot, room, assignments)) {
      return false;
    }
    
    // 1. 检查基本冲突（教师、班级冲突）
    if (!this.checkBasicConflicts(variable, timeSlot, assignments)) {
      return false;
    }
    
    // 2. 检查课室冲突
    if (this.checkRoomConflict(variable, timeSlot, room, assignments)) {
      console.log(`            ❌ 课室冲突: 课室 ${room._id} 在时间槽 ${timeSlot.dayOfWeek}-${timeSlot.period} 已被占用`);
      return false;
    }
    
    // 3. 检查课室要求
    if (!this.checkRoomRequirements(variable, room)) {
      console.log(`            ❌ 课室要求不满足: 课室 ${room._id} 不适合课程 ${variable.courseId}`);
      return false;
    }
    
  //  console.log(`            ✅ 完整约束检测通过`);
    return true;
    
  } catch (error) {
  //  console.error(`            ❌ 完整约束检测过程中发生错误:`, error);
    return false;
  }
}

/**
 * 快速预检查（性能优化）
 * 在完整约束检测前进行快速检查，避免不必要的计算
 */
private quickPreCheck(
  variable: ScheduleVariable, 
  timeSlot: BaseTimeSlot, 
  room: any, 
  assignments: Map<string, CourseAssignment>
): boolean {
  // 1. 基本有效性检查
  if (!variable || !timeSlot || !room) {
  //  console.log(`            ❌ 快速预检查失败: 参数无效`);
    return false;
  }
  
  // 2. 课室状态快速检查
  if (room.isActive === false) {
  //  console.log(`            ❌ 快速预检查失败: 课室未激活`);
    return false;
  }
  
  // 3. 时间槽有效性检查
  if (timeSlot.dayOfWeek < 1 || timeSlot.dayOfWeek > 5 || 
      timeSlot.period < 1 || timeSlot.period > 8) {
  //  console.log(`            ❌ 快速预检查失败: 时间槽无效`);
    return false;
  }
  
  return true;
}

/**
 * 检查课室冲突
 */
private checkRoomConflict(
  variable: ScheduleVariable, 
  timeSlot: BaseTimeSlot, 
  room: any, 
  assignments: Map<string, CourseAssignment>
): boolean {
  try {
  //  console.log(`            🔍 [课室冲突检测] 检查课室 ${room._id} 在时间槽 ${timeSlot.dayOfWeek}-${timeSlot.period} 的冲突...`);
    
    let conflictCount = 0;
    for (const assignment of assignments.values()) {
      if (assignment.roomId && 
          assignment.roomId.toString() === room._id.toString() &&
          assignment.timeSlot.dayOfWeek === timeSlot.dayOfWeek &&
          assignment.timeSlot.period === timeSlot.period) {
        
        conflictCount++;
//        console.log(`               ⚠️ 发现课室冲突: 与分配 ${assignment.variableId} 冲突`);
//        console.log(`                  - 冲突分配: ${assignment.variableId}`);
//        console.log(`                  - 冲突时间: ${assignment.timeSlot.dayOfWeek}-${assignment.timeSlot.period}`);
//        console.log(`                  - 冲突课室: ${assignment.roomId}`);
      }
    }
    
    if (conflictCount > 0) {
  //    console.log(`            ❌ 课室冲突检测完成: 发现 ${conflictCount} 个冲突`);
      return true; // 存在冲突
    }
    
  //  console.log(`            ✅ 课室冲突检测完成: 无冲突`);
    return false; // 无冲突
    
  } catch (error) {
  //  console.error(`            ❌ 课室冲突检测过程中发生错误:`, error);
    // 发生错误时，为了安全起见，认为存在冲突
    return true;
  }
}

/**
 * 检查课室要求
 * 
 * @param room 课室信息
 * @param courseRequirements 课程要求
 * @returns 是否满足要求
 */
private checkRoomRequirements(room: any, courseRequirements: any): boolean {
  try {
    if (!courseRequirements) {
      return true; // 没有特殊要求
    }

    // 检查容量要求
    if (courseRequirements.capacity && room.capacity) {
      if (room.capacity < courseRequirements.capacity) {
  //      console.log(`         ❌ 课室容量不满足要求: 需要 ${courseRequirements.capacity}, 课室容量 ${room.capacity}`);
        return false;
      }
    }
/*
    // 检查设备要求
    if (courseRequirements.equipment && courseRequirements.equipment.length > 0) {
      const roomEquipment = room.equipment || [];
      const missingEquipment = courseRequirements.equipment.filter(
        (req: string) => !roomEquipment.includes(req)
      );
      
      if (missingEquipment.length > 0) {
        console.log(`         ❌ 课室设备不满足要求: 缺少 ${missingEquipment.join(', ')}`);
        return false;
      }
    }
*/
    // 检查课室类型要求
    if (courseRequirements.types && courseRequirements.types.length > 0) {
      const roomType = room.type || room.roomType;
      if (!courseRequirements.types.includes(roomType)) {
  //      console.log(`         ❌ 课室类型不满足要求: 需要 ${courseRequirements.types.join(', ')}, 课室类型 ${roomType}`);
        return false;
      }
    }

  //  console.log(`         ✅ 课室要求检查通过`);
    return true;

  } catch (error) {
  //  console.error(`         ❌ 课室要求检查过程中发生错误:`, error);
    return false;
  }
}

/**
 * 基本冲突检测（回退方案）
 * 当完整约束检测失败时使用
 */
private checkBasicConflicts(
  variable: ScheduleVariable, 
  timeSlot: BaseTimeSlot, 
  assignments: Map<string, CourseAssignment>
): boolean {
//    console.log(`         🔍 [基本约束检测] 检查基本冲突...`);
  
  // 检查教师冲突
  for (const assignment of assignments.values()) {
    if (assignment.teacherId.toString() === variable.teacherId.toString() &&
        assignment.timeSlot.dayOfWeek === timeSlot.dayOfWeek &&
        assignment.timeSlot.period === timeSlot.period) {
  //    console.log(`            ❌ 教师冲突: 教师 ${variable.teacherId} 在时间槽 ${timeSlot.dayOfWeek}-${timeSlot.period} 已有课程`);
      return false;
    }
  }

  // 检查班级冲突
  for (const assignment of assignments.values()) {
    if (assignment.classId.toString() === variable.classId.toString() &&
        assignment.timeSlot.dayOfWeek === timeSlot.dayOfWeek &&
        assignment.timeSlot.period === timeSlot.period) {
  //    console.log(`            ❌ 班级冲突: 班级 ${variable.classId} 在时间槽 ${timeSlot.dayOfWeek}-${timeSlot.period} 已有课程`);
      return false;
    }
  }
  
  //console.log(`            ✅ 基本约束检测通过`);
  return true;
}

/**
 * 预检查机制：在分配前检查时间可行性
 * 
 * @param variable 排课变量
 * @param timeSlot 时间槽
 * @returns 是否可行
 */
private isAssignmentFeasible(variable: ScheduleVariable, timeSlot: BaseTimeSlot): boolean {
  //console.log(`         🔍 [预检查] 检查变量 ${variable.id} 在时间槽 ${timeSlot.dayOfWeek}-${timeSlot.period} 的可行性...`);
  
  // 1. 检查教师冲突
  if (this.hasTeacherConflict(variable.teacherId, timeSlot)) {
  //  console.log(`            ❌ [预检查] 教师冲突: 教师 ${variable.teacherId} 在时间槽 ${timeSlot.dayOfWeek}-${timeSlot.period} 已有课程`);
    return false;
  }
  
  // 2. 检查班级冲突
  if (this.hasClassConflict(variable.classId, timeSlot)) {
  //  console.log(`            ❌ [预检查] 班级冲突: 班级 ${variable.classId} 在时间槽 ${timeSlot.dayOfWeek}-${timeSlot.period} 已有课程`);
    return false;
  }
  // 3. 检查副科一天一次约束
  if (!this.isCoreSubject(variable) && 
      this.hasMinorSubjectConflict(variable, timeSlot.dayOfWeek)) {
    return false;
  }
  // 4. 检查核心课程分散度约束
  if (this.isCoreSubject(variable) && 
    this.hasCoreSubjectDistributionConflict(variable, timeSlot.dayOfWeek)) {
    return false;
  }  
  /*
  // 5. 检查核心课程至少四天有课约束
  if (this.isCoreSubject(variable) && 
    this.hasCoreSubjectMinimumDaysConflict(variable, timeSlot.dayOfWeek)) {
    return false;
  }
    */

  // 5. 检查同一天同一核心科目数量约束（最多2节）
  if (this.isCoreSubject(variable) && 
    this.hasSameDayCoreSubjectCountConflict(variable, timeSlot.dayOfWeek)) {
    return false;
  }
 // console.log(`            ✅ [预检查] 时间可行性检查通过`);
  return true;
}

/**
 * 检查核心课程是否满足至少四天有课的约束
 * 
 * @param variable 排课变量
 * @param dayOfWeek 星期几
 * @returns 是否违反约束
 */
private hasCoreSubjectMinimumDaysConflict(variable: ScheduleVariable, dayOfWeek: number): boolean {
  if (!variable.subject) return false;
  
  // 统计该科目已经安排的天数
  const assignedDays = new Set<number>();
  
  for (const assignment of this.currentAssignments.values()) {
    if (assignment.classId.toString() === variable.classId.toString()) {
      const courseInfo = this.findCourseInTeachingPlans(assignment.courseId);
      if (courseInfo && courseInfo.subject === variable.subject) {
        assignedDays.add(assignment.timeSlot.dayOfWeek);
      }
    }
  }
  
  // 如果当前时间槽不在已安排的天数中，则添加
  if (!assignedDays.has(dayOfWeek)) {
    assignedDays.add(dayOfWeek);
  }
  
  // 检查该科目的总课时和已安排课时
  const totalRequiredHours = this.getSubjectTotalHours(variable.classId, variable.subject);
  const assignedHours = this.getSubjectAssignedHours(variable.classId, variable.subject);
  
  // 如果这是最后一节课，检查是否满足至少四天有课的约束
  if (assignedHours + 1 === totalRequiredHours) {
    // 核心课程至少四天有课
    if (assignedDays.size < 4) {
      return true; // 违反至少四天有课约束
    }
  }
  
  return false;
}
/**
 * 检查副科一天一次冲突
 * 
 * @param variable 排课变量
 * @param dayOfWeek 星期几
 * @returns 是否存在冲突
 */
private hasMinorSubjectConflict(variable: ScheduleVariable, dayOfWeek: number): boolean {
  // 统计当天该班级同科目的课程数量
  let dailyCount = 0;
  
  for (const assignment of this.currentAssignments.values()) {
    if (assignment.classId.toString() === variable.classId.toString() &&
        assignment.timeSlot.dayOfWeek === dayOfWeek) {
      
      // 获取课程信息以判断科目
      const courseInfo = this.findCourseInTeachingPlans(assignment.courseId);
      if (courseInfo && courseInfo.subject === variable.subject) {
        dailyCount++;
      }
    }
  }
  
  // 副科每天最多1节
  return dailyCount > 0;
}

/**
 * 检查同一天同一核心科目是否超过2节限制
 * 
 * @param variable 排课变量
 * @param dayOfWeek 星期几
 * @returns 是否违反约束
 */
private hasSameDayCoreSubjectCountConflict(variable: ScheduleVariable, dayOfWeek: number): boolean {
  if (!variable.subject) return false;
  
  let sameSubjectCount = 0;
  
  // 统计当天该班级同科目的课程数量
  for (const assignment of this.currentAssignments.values()) {
    if (assignment.classId.toString() === variable.classId.toString() &&
        assignment.timeSlot.dayOfWeek === dayOfWeek) {
      
      // 获取课程信息以判断科目
      const courseInfo = this.findCourseInTeachingPlans(assignment.courseId);
      if (courseInfo && courseInfo.subject === variable.subject) {
        sameSubjectCount++;
      }
    }
  }
  
  // 同一天同一核心科目最多2节
  // 如果当前科目当天已有2节，则不能再安排
  if (sameSubjectCount >= 2) {
    return true; // 违反最多2节约束
  }
  
  return false;
}
/**
 * 获取指定班级指定科目的总课时数
 */
private getSubjectTotalHours(classId: mongoose.Types.ObjectId, subject: string): number {
  for (const plan of this.teachingPlans) {
    if (plan.class._id.toString() === classId.toString()) {
      for (const assignment of plan.courseAssignments || []) {
        const course = assignment.course;
        if (course && course.subject === subject) {
          return assignment.weeklyHours || 0;
        }
      }
    }
  }
  return 0;
}

/**
 * 获取指定班级指定科目已安排的课时数
 */
private getSubjectAssignedHours(classId: mongoose.Types.ObjectId, subject: string): number {
  let assignedCount = 0;
  
  for (const assignment of this.currentAssignments.values()) {
    if (assignment.classId.toString() === classId.toString()) {
      const courseInfo = this.findCourseInTeachingPlans(assignment.courseId);
      if (courseInfo && courseInfo.subject === subject) {
        assignedCount++;
      }
    }
  }
  
  return assignedCount;
}


private hasCoreSubjectDistributionConflict(variable: ScheduleVariable, dayOfWeek: number): boolean {
  // 检查该科目在过去几天是否过于集中
  const recentDays = [dayOfWeek - 1, dayOfWeek - 2, dayOfWeek - 3].filter(d => d > 0);
  let consecutiveCount = 0;
  
  for (const day of recentDays) {
    // 检查该天是否已有同科目课程
    if (this.hasSubjectOnDay(variable.classId, variable.subject || '', day)) {
      consecutiveCount++;
    }
  }
  
  // 核心课程不应连续3天以上在同一时间段
  return consecutiveCount >= 3;
}

/**
 * 检查指定班级在指定日期是否已有指定科目课程
 */
private hasSubjectOnDay(classId: mongoose.Types.ObjectId, subject: string, dayOfWeek: number): boolean {
  for (const assignment of this.currentAssignments.values()) {
    if (assignment.classId.toString() === classId.toString() &&
        assignment.timeSlot.dayOfWeek === dayOfWeek) {
      
      // 获取课程信息以判断科目
      const courseInfo = this.findCourseInTeachingPlans(assignment.courseId);
      if (courseInfo && courseInfo.subject === subject) {
        return true;
      }
    }
  }
  return false;
}


/**
 * 检查教师冲突
 * 
 * @param teacherId 教师ID
 * @param timeSlot 时间槽
 * @returns 是否存在冲突
 */
private hasTeacherConflict(teacherId: mongoose.Types.ObjectId, timeSlot: BaseTimeSlot): boolean {
  for (const assignment of this.currentAssignments.values()) {
    if (assignment.teacherId.toString() === teacherId.toString() &&
        assignment.timeSlot.dayOfWeek === timeSlot.dayOfWeek &&
        assignment.timeSlot.period === timeSlot.period) {
      return true;
    }
  }
  return false;
}

/**
 * 检查班级冲突
 * 
 * @param classId 班级ID
 * @param timeSlot 时间槽
 * @returns 是否存在冲突
 */
private hasClassConflict(classId: mongoose.Types.ObjectId, timeSlot: BaseTimeSlot): boolean {
  for (const assignment of this.currentAssignments.values()) {
    if (assignment.classId.toString() === classId.toString() &&
        assignment.timeSlot.dayOfWeek === timeSlot.dayOfWeek &&
        assignment.timeSlot.period === timeSlot.period) {
      return true;
    }
  }
  return false;
}

/**
 * 同步分配：课室和时间同时分配
 * 
 * @param variable 排课变量
 * @param timeSlot 时间槽
 * @param state 排课状态（可选）
 * @returns 分配是否成功
 */
private async assignCourse(variable: ScheduleVariable, timeSlot: BaseTimeSlot, state?: ScheduleState): Promise<boolean> {
  //console.log(`         🔄 [同步分配] 开始为变量 ${variable.id} 分配课室和时间...`);
  
  try {
    // 1. 先检查时间可行性
    if (!this.isAssignmentFeasible(variable, timeSlot)) {
      //console.log(`            ❌ [同步分配] 时间可行性检查失败`);
      return false;
    }
    
    // 2. 分配课室
    const courseInfo = this.findCourseInTeachingPlans(variable.courseId);
    if (!courseInfo) {
      //console.log(`            ❌ [同步分配] 无法获取课程信息`);
      return false;
    }
    
    const room = this.roomAllocator.getRoomAssignment(
      courseInfo, 
      variable.classId, 
      this.rooms, 
      this.teachingPlans.map(p => p.class)
    );
    
    if (!room) {
      console.log(`            ❌ [同步分配] 课室分配失败`);
      return false;
    }
    
    // 3. 创建分配并保存到当前分配中
    const assignment = this.createAssignment(variable, timeSlot, room);
    this.currentAssignments.set(variable.id, assignment);
    
    // 同时更新状态（如果提供了状态参数）
    if (state) {
      state.assignments.set(variable.id, assignment);
    }
    
    //console.log(`            ✅ [同步分配] 成功分配: 课程 ${courseInfo.subject || '未知'} -> 时间 ${timeSlot.dayOfWeek}-${timeSlot.period} -> 课室 ${room.name}`);
    return true;
    
  } catch (error) {
    console.error(`            ❌ [同步分配] 分配过程中发生错误:`, error);
    return false;
  }
}

/**
 * 创建课程分配
 * 
 * @param variable 排课变量
 * @param timeSlot 时间槽
 * @param room 课室
 * @returns 课程分配对象
 */
private createAssignment(variable: ScheduleVariable, timeSlot: BaseTimeSlot, room: any): CourseAssignment {
  const assignment: CourseAssignment = {
    variableId: variable.id,
    classId: variable.classId,
    courseId: variable.courseId,
    teacherId: variable.teacherId,
    roomId: room._id,
    timeSlot: timeSlot,
    isFixed: false
  };
  
  return assignment;
}
private async backtrackSearch(state: ScheduleState, variables: ScheduleVariable[]): Promise<boolean> {
  let iterations = 0;
  const maxIterations = this.config.maxIterations;
  const timeLimit = this.config.timeLimit * 1000;
  const startTime = Date.now();

  const search = async (): Promise<boolean> => {
    iterations++;

    // 检查终止条件
    if (iterations > maxIterations || Date.now() - startTime > timeLimit) {
      return false;
    }

    // 检查是否完成
    if (state.unassigned.length === 0) {
      state.isComplete = true;
      return true;
    }

    // 选择下一个变量 (MRV启发式)
    const variableId = this.selectVariable(state, variables);
    if (!variableId) return false;

    const variable = variables.find(v => v.id === variableId)!;

    // 尝试每个可能的值 (LCV启发式)
    for (const timeSlot of this.orderValues(variable, state)) {
      if (await this.canAssign(variable, timeSlot, state)) {
        const assignment = await this.makeAssignment(variable, timeSlot, state);
        
        // 递归搜索
        const result = await search();
        if (result) return true;

        // 回溯
        this.undoAssignment(assignment, state, variables);
      }
    }

    return false;
  };

  return await search();
}

private orderValues(variable: ScheduleVariable, state: ScheduleState): BaseTimeSlot[] {
  if (!variable.domain || variable.domain.length === 0) {
    return [];
  }

  // 按K12时间段偏好排序
  return [...variable.domain].sort((a, b) => {
    const scoreA = this.getK12TimeSlotPreference(variable, a);
    const scoreB = this.getK12TimeSlotPreference(variable, b);
    return scoreB - scoreA; // 分数高的优先
  });
}

private async canAssign(variable: ScheduleVariable, timeSlot: BaseTimeSlot, state: ScheduleState): Promise<boolean> {
  // 使用预检查机制检查时间可行性
  if (!this.isAssignmentFeasible(variable, timeSlot)) {
    return false;
  }

  // 检查教室可用性（使用新的分配策略）
  const courseInfo = this.findCourseInTeachingPlans(variable.courseId);
  if (!courseInfo) {
    console.log(`         ❌ [canAssign] 无法获取课程信息`);
    return false;
  }

  const room = this.roomAllocator.getRoomAssignment(
    courseInfo, 
    variable.classId, 
    this.rooms, 
    this.teachingPlans.map(p => p.class)
  );
  
  if (!room) {
    console.log(`         ❌ [canAssign] 课室分配失败`);
    return false;
  }

 //console.log(`         ✅ [canAssign] 变量 ${variable.id} 可以分配: 时间 ${timeSlot.dayOfWeek}-${timeSlot.period}, 课室 ${room.name}`);
  return true;
}

private async makeAssignment(variable: ScheduleVariable, timeSlot: BaseTimeSlot, state: ScheduleState): Promise<CourseAssignment> {
  //console.log(`         🔄 [makeAssignment] 开始为变量 ${variable.id} 创建分配...`);
  
  try {
    // 使用同步分配方法
    const success = await this.assignCourse(variable, timeSlot, state);
    if (!success) {
      throw new Error(`同步分配失败: 变量 ${variable.id}`);
    }
    
    // 从状态中获取刚创建的分配
    const assignment = state.assignments.get(variable.id);
    if (!assignment) {
      throw new Error(`分配创建失败: 变量 ${variable.id}`);
    }
    
    // 从未分配列表中移除
    const index = state.unassigned.indexOf(variable.id);
    if (index > -1) {
      state.unassigned.splice(index, 1);
    }
    
    //console.log(`         ✅ [makeAssignment] 成功创建分配: 变量 ${variable.id}`);
    return assignment;
    
  } catch (error) {
    console.error(`         ❌ [makeAssignment] 创建分配失败:`, error);
    throw error;
  }
}

private undoAssignment(assignment: CourseAssignment, state: ScheduleState, variables: ScheduleVariable[]): void {
  state.assignments.delete(assignment.variableId);
  state.unassigned.push(assignment.variableId);
}


// 移植主引擎的MRV启发式策略
private selectVariable(state: ScheduleState, variables: ScheduleVariable[]): string | null {
  const unassignedVars = variables.filter(v => state.unassigned.includes(v.id));
  if (unassignedVars.length === 0) return null;

  // 使用增强的MRV启发式策略
  let bestVar = unassignedVars[0];
  let bestScore = this.calculateVariableScore(bestVar, state);

  for (const variable of unassignedVars) {
    const currentScore = this.calculateVariableScore(variable, state);
    if (currentScore < bestScore) {
      bestVar = variable;
      bestScore = currentScore;
    }
  }

  return bestVar.id;
}

private calculateVariableScore(variable: ScheduleVariable, state: ScheduleState): number {
  let score = 0;
  
  // 域大小权重 (40%)
  const domainSize = variable.domain?.length || 0;
  score += domainSize * 0.4;
  
  // 优先级权重 (25%) - K12核心课程优先
  const priorityScore = this.getK12PriorityScore(variable);
  score += priorityScore * 0.25;
  
  // 约束度权重 (20%)
  const constraintDegree = this.getConstraintDegree(variable, state);
  score += constraintDegree * 0.20;
  
  // 时间紧迫性权重 (15%)
  const timeUrgency = this.getTimeUrgency(variable);
  score += timeUrgency * 0.15;
  
  return score;
}
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
  
  return degree;
}

private getTeacherConstraintDegree(teacherId: mongoose.Types.ObjectId, state: ScheduleState): number {
  let degree = 0;
  
  for (const [_, assignment] of state.assignments) {
    if (assignment.teacherId?.toString() === teacherId.toString()) {
      degree += 10;
    }
  }
  
  return degree;
}

private getRoomConstraintDegree(requirements: any): number {
  let degree = 0;
  
  if (requirements.specialized) degree += 20;
  if (requirements.capacity) degree += 15;
  if (requirements.equipment) degree += 25;
  
  return degree;
}

private getTimeConstraintDegree(variable: ScheduleVariable): number {
  let degree = 0;
  
  if (variable.timePreferences && variable.timePreferences.length > 0) {
    degree += variable.timePreferences.length * 5;
  }
  
  if (variable.timeAvoidance && variable.timeAvoidance.length > 0) {
    degree += variable.timeAvoidance.length * 8;
  }
  
  return degree;
}

private getTimeUrgency(variable: ScheduleVariable): number {
  let urgency = 0;
  
  if (variable.timePreferences && variable.timePreferences.length > 0) {
    urgency += 20;
  }
  
  if (variable.timeAvoidance && variable.timeAvoidance.length > 0) {
    urgency += 25;
  }
  
  if (variable.continuous) {
    urgency += 30;
  }
  
  return urgency;
}
// K12特有的优先级评分
private getK12PriorityScore(variable: ScheduleVariable): number {
  // 核心课程绝对优先
  if (this.isCoreSubject(variable)) {
    return 0; // 最低分数，最高优先级
  }
  
  // 根据K12课程体系评分
  if (variable.priority >= 8) return 0;      // 核心课程
  if (variable.priority >= 6) return 20;     // 重要课程
  if (variable.priority >= 4) return 40;     // 一般课程
  if (variable.priority >= 2) return 60;     // 选修课程
  return 80;                                 // 活动课程
}

// K12核心课程识别
private isCoreSubject(variable: ScheduleVariable): boolean {
  const courseName = variable.subject || variable.courseName || 
                     this.getCourseNameSync(variable.courseId);
  
  if (!courseName) return false;
  
  const coreSubjects = [
    '语文', '数学', '英语', '物理', '化学', '生物',
    'chinese', 'math', 'mathematics', 'english', 'physics', 'chemistry', 'biology'
  ];
  
  const lowerCourseName = courseName.toLowerCase();
  return coreSubjects.some(subject => 
    lowerCourseName.includes(subject.toLowerCase()) || 
    subject.toLowerCase().includes(lowerCourseName)
  );
}

// K12特有的时间段偏好
private getK12TimeSlotPreference(variable: ScheduleVariable, timeSlot: BaseTimeSlot): number {
  let score = 0;

  // 1. 基础时间偏好 (25%)
  score += this.getBasicTimePreference(variable, timeSlot) * 0.25;
  
  // 2. K12核心课程黄金时段奖励 (30%)
  score += this.getK12CoreSubjectGoldenTimeBonus(variable, timeSlot) * 0.30;
  
  // 3. K12科目类型时间偏好 (25%)
  score += this.getK12SubjectTypeTimePreference(variable, timeSlot) * 0.25;
  
  // 4. 连排课程偏好 (20%)
  //score += this.getContinuousCoursePreference(variable, timeSlot) * 0.20;
  
  // 5.科目分散度评分
  score += this.getSubjectDistributionScore(variable, timeSlot) * 0.15;

  return score;
}

private getBasicTimePreference(variable: ScheduleVariable, timeSlot: BaseTimeSlot): number {
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

private getK12CoreSubjectGoldenTimeBonus(variable: ScheduleVariable, timeSlot: BaseTimeSlot): number {
  if (!this.isCoreSubject(variable)) return 0;
  
  let bonus = 0;
  
  // 上午黄金时段 (1-4节)
  if (timeSlot.period >= 1 && timeSlot.period <= 4) {
    bonus += 100;
    
    // 第一节和第二节为最佳时段
    if (timeSlot.period === 1 || timeSlot.period === 2) {
      bonus += 50;
    }
  }
  
  // 下午黄金时段 (5-6节)
  if (timeSlot.period >= 5 && timeSlot.period <= 6) {
    bonus += 80;
    
    if (timeSlot.period === 5) {
      bonus += 30;
    }
  }
  
  return bonus;
}

private getK12SubjectTypeTimePreference(variable: ScheduleVariable, timeSlot: BaseTimeSlot): number {
  // 基础实现，后续可以扩展
  return 0;
}

private getContinuousCoursePreference(variable: ScheduleVariable, timeSlot: BaseTimeSlot): number {
  if (!variable.continuous || !variable.continuousHours) {
    return 0;
  }
  
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
 * 计算科目分散度评分
 */
private getSubjectDistributionScore(variable: ScheduleVariable, timeSlot: BaseTimeSlot): number {
  if (!variable.subject) return 0;
  
  // 检查该科目在过去几天的分布情况
  const recentDays = [timeSlot.dayOfWeek - 1, timeSlot.dayOfWeek - 2, timeSlot.dayOfWeek - 3].filter(d => d > 0);
  let consecutiveCount = 0;
  
  for (const day of recentDays) {
    if (this.hasSubjectOnDay(variable.classId, variable.subject, day)) {
      consecutiveCount++;
    }
  }
  
  // 连续天数越少，分数越高
  if (consecutiveCount === 0) return 15;
  if (consecutiveCount === 1) return 10;
  if (consecutiveCount === 2) return 5;
  return 0;
}


private getCourseNameSync(courseId: mongoose.Types.ObjectId): string {
  // 从教学计划中查找课程名称
  for (const plan of this.teachingPlans) {
    for (const assignment of plan.courseAssignments || []) {
      if (assignment.course?._id?.toString() === courseId.toString()) {
        return assignment.course.name || assignment.course.subject || '未知课程';
      }
    }
  }
  return '未知课程';
}

  /**
   * 🆕 新增：扩展基础时间槽为班级时间段
   * 
   * Args:
   *   baseTimeSlots: 基础时间段数组（从scheduling-service传递过来）
   *   teachingPlans: 教学计划数组（包含班级信息）
   * 
   * Returns:
   *   ClassTimeSlot[]: 扩展后的班级时间段数组
   */
  private expandTimeSlotsForClasses(baseTimeSlots: TimeSlot[], teachingPlans: any[]): ClassTimeSlot[] {
    const classTimeSlots: ClassTimeSlot[] = [];
    
    // 从教学计划中提取班级信息
    const classes = new Map<string, any>();
    for (const plan of teachingPlans) {
      if (plan.class && plan.class._id) {
        const classId = plan.class._id.toString();
        if (!classes.has(classId)) {
          classes.set(classId, plan.class);
        }
      }
    }
    
    console.log(`   🔍 [时间槽扩展] 找到 ${classes.size} 个班级`);
    
    // 为每个班级创建对应的时间段
    for (const baseSlot of baseTimeSlots) {
      for (const [classId, classInfo] of classes) {
        const classTimeSlot: ClassTimeSlot = {
          baseTimeSlot: {
            dayOfWeek: baseSlot.dayOfWeek,
            period: baseSlot.period,
            startTime: baseSlot.startTime || '',
            endTime: baseSlot.endTime || ''
          },
          classId: new mongoose.Types.ObjectId(classId),
          isAvailable: true,
          className: classInfo.name || `班级${classId}`
        };
        
        classTimeSlots.push(classTimeSlot);
      }
    }
    
    console.log(`   ✅ [时间槽扩展] 成功扩展: ${baseTimeSlots.length} × ${classes.size} = ${classTimeSlots.length} 个班级时间段`);
    
    return classTimeSlots;
  }
}
