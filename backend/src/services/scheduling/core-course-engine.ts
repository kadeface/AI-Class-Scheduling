import { 
  SchedulingResult, 
  ScheduleState, 
  CourseAssignment, 
  TimeSlot,
  CoreConstraint,
  SchedulingStage,
  StagedSchedulingResult
} from './types';
import mongoose from 'mongoose';

/**
 * 简化的课程接口（用于核心课程引擎）
 */
interface CoreCourse {
  id: string;
  subject: string;
  classId: string;
  teacherId: mongoose.Types.ObjectId;  // 改为 ObjectId 类型，与 ScheduleVariable 保持一致
  requiredHours: number;
}

/**
 * 简化的教师接口（用于核心课程引擎）
 */
interface CoreTeacher {
  id: string;
  subjects: string[];
}

/**
 * 简化的教室接口（用于核心课程引擎）
 */
interface CoreRoom {
  id: string;
  capacity: number;
  type: string;
}

/**
 * 扩展的时间槽接口（包含优先级）
 */
interface ExtendedTimeSlot extends TimeSlot {
  priority: 'high' | 'medium' | 'low';
}

/**
 * 核心课程排课引擎
 * 专门处理核心课程（语文、数学、英语等）的排课
 */
export class CoreCourseEngine {
  private coreSubjects: string[] = ['语文', '数学', '英语', '物理', '化学', '生物', '历史', '地理', '政治'];
  private coreConstraints: CoreConstraint[] = [];
  private maxIterations: number = 5000; // 核心课程使用更严格的限制
  private timeLimit: number = 120; // 2分钟时间限制

  constructor() {
    this.initializeCoreConstraints();
  }

  /**
   * 安全地验证和创建 ObjectId
   * 
   * Args:
   *   id: 要验证的字符串ID
   * 
   * Returns:
   *   mongoose.Types.ObjectId | null: 有效的 ObjectId 实例，如果无效则返回 null
   */
  private safeCreateObjectId(id: string): mongoose.Types.ObjectId | null {
    console.log(`            🔍 [ObjectId创建] 尝试创建 ObjectId: ${id}`);
    
    try {
      if (!id || typeof id !== 'string') {
        console.log(`            ❌ [ObjectId创建] ID 为空或不是字符串: ${id}`);
        return null;
      }
      
      // 检查是否为有效的 ObjectId 字符串
      if (mongoose.Types.ObjectId.isValid(id)) {
        const objectId = mongoose.Types.ObjectId.createFromHexString(id);
        console.log(`            ✅ [ObjectId创建] 成功创建 ObjectId: ${id}`);
        return objectId;
      } else {
        console.log(`            ❌ [ObjectId创建] 无效的 ObjectId 字符串: ${id}`);
        return null;
      }
      
    } catch (error) {
      console.log(`            ❌ [ObjectId创建] 创建 ObjectId 失败 (ID: ${id}):`, error);
      return null;
    }
  }

  /**
   * 验证课程数据的完整性
   * 
   * Args:
   *   course: 课程对象
   * 
   * Returns:
   *   boolean: 数据是否有效
   */
  private validateCourseData(course: CoreCourse): boolean {
    console.log(`         🔍 [数据验证] 开始验证课程数据: ${course.subject}`);
    console.log(`            📋 课程ID: ${course.id}`);
    console.log(`            📋 班级ID: ${course.classId}`);
    console.log(`            📋 教师ID: ${course.teacherId}`);
    console.log(`            📋 课时: ${course.requiredHours}`);
    
    if (!course.id || !course.classId || !course.teacherId) {
      console.log(`         ❌ [数据验证] 课程数据不完整:`);
      if (!course.id) console.log(`            - 缺少课程ID`);
      if (!course.classId) console.log(`            - 缺少班级ID`);
      if (!course.teacherId) console.log(`            - 缺少教师ID`);
      return false;
    }
    
    // 验证 ID 是否为有效的 ObjectId 字符串
    const idValid = mongoose.Types.ObjectId.isValid(course.id);
    const classIdValid = mongoose.Types.ObjectId.isValid(course.classId);
    const teacherIdValid = mongoose.Types.ObjectId.isValid(course.teacherId);
    
    console.log(`            🔍 ObjectId 验证:`);
    console.log(`               - 课程ID: ${idValid ? '✅' : '❌'} (${course.id})`);
    console.log(`               - 班级ID: ${classIdValid ? '✅' : '❌'} (${course.classId})`);
    console.log(`               - 教师ID: ${teacherIdValid ? '✅' : '❌'} (${course.teacherId})`);
    
    if (!idValid || !classIdValid || !teacherIdValid) {
      console.log(`         ❌ [数据验证] 包含无效的 ObjectId`);
      return false;
    }
    
    console.log(`         ✅ [数据验证] 课程数据验证通过`);
    return true;
  }

  /**
   * 初始化核心课程约束
   */
  private initializeCoreConstraints(): void {
    this.coreConstraints = [
      {
        id: 'core_teacher_conflict',
        type: 'teacher_conflict',
        priority: 'high',
        description: '核心课程教师时间冲突',
        isHard: true
      },
      {
        id: 'core_class_conflict',
        type: 'class_conflict',
        priority: 'high',
        description: '核心课程班级时间冲突',
        isHard: true
      },
      {
        id: 'core_room_conflict',
        type: 'room_conflict',
        priority: 'medium',
        description: '核心课程教室冲突',
        isHard: false
      },
      {
        id: 'core_time_preference',
        type: 'time_preference',
        priority: 'medium',
        description: '核心课程时间偏好（上午优先）',
        isHard: false
      }
    ];
  }

  /**
   * 判断课程是否为核心课程
   * @param course 课程对象
   * @returns 是否为核心课程
   */
  public isCoreCourse(course: CoreCourse): boolean {
    return this.coreSubjects.includes(course.subject);
  }

  /**
   * 过滤核心课程
   * @param courses 所有课程列表
   * @returns 核心课程列表
   */
  public filterCoreCourses(courses: CoreCourse[]): CoreCourse[] {
    return courses.filter(course => this.isCoreCourse(course));
  }

  /**
   * 获取核心课程约束
   * @returns 核心课程约束列表
   */
  public getCoreConstraints(): CoreConstraint[] {
    return this.coreConstraints;
  }

  /**
   * 核心课程排课算法
   * @param courses 核心课程列表
   * @param teachers 教师列表
   * @param rooms 教室列表
   * @param timeSlots 时间槽列表
   * @returns 排课结果
   */
  public async scheduleCoreCourses(
    courses: CoreCourse[],
    teachers: CoreTeacher[],
    rooms: CoreRoom[],
    timeSlots: ExtendedTimeSlot[]
  ): Promise<StagedSchedulingResult> {
    console.log(`[核心课程引擎] 🚀 开始排课，课程数量: ${courses.length}`);
    console.log(`   📊 输入资源统计:`);
    console.log(`      - 课程数量: ${courses.length}`);
    console.log(`      - 教师数量: ${teachers.length}`);
    console.log(`      - 教室数量: ${rooms.length}`);
    console.log(`      - 时间槽数量: ${timeSlots.length}`);
    
    const startTime = Date.now();
    let iterations = 0;
    
    try {
      console.log(`\n[核心课程引擎] 📋 步骤1: 核心课程预处理`);
      // 1. 核心课程预处理
      const processedCourses = this.preprocessCoreCourses(courses);
      console.log(`   ✅ 预处理完成，处理后的课程数量: ${processedCourses.length}`);
      
      console.log(`\n[核心课程引擎] 📋 步骤2: 应用核心约束`);
      // 2. 应用核心约束
      const constrainedTimeSlots = this.applyCoreConstraints(timeSlots);
      console.log(`   ✅ 约束应用完成，约束后的时间槽数量: ${constrainedTimeSlots.length}`);
      
      console.log(`\n[核心课程引擎] 📋 步骤3: 执行核心课程排课`);
      // 3. 执行核心课程排课
      const schedule = await this.executeCoreScheduling(
        processedCourses,
        teachers,
        rooms,
        constrainedTimeSlots,
        iterations,
        startTime
      );
      console.log(`   ✅ 排课执行完成`);
      
      console.log(`\n[核心课程引擎] 📋 步骤4: 验证排课结果`);
      // 4. 验证排课结果
      const validationResult = this.validateCoreSchedule(schedule);
      console.log(`   ✅ 验证完成，结果: ${validationResult.isValid ? '有效' : '无效'}`);
      
      const endTime = Date.now();
      const executionTime = endTime - startTime;
      
      console.log(`\n[核心课程引擎] 📊 排课完成，耗时: ${executionTime}ms，迭代次数: ${iterations}`);
      console.log(`   📋 最终结果:`);
      console.log(`      - 成功: ${validationResult.isValid ? '是' : '否'}`);
      console.log(`      - 分配数量: ${schedule.assignments.size}`);
      console.log(`      - 未分配数量: ${schedule.unassigned.length}`);
      console.log(`      - 冲突数量: ${schedule.conflicts.length}`);
      console.log(`      - 违规数量: ${schedule.violations.length}`);
      
      return {
        success: validationResult.isValid,
        stage: SchedulingStage.CORE_COURSES,
        schedule: schedule,
        message: validationResult.isValid ? '核心课程排课成功' : validationResult.errors.join(', '),
        executionTime: executionTime,
        iterations: iterations,
        stageProgress: 100,
        overallProgress: 33
      };
      
    } catch (error) {
      console.error(`[核心课程引擎] ❌ 排课失败:`, error);
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      console.log(`   📋 失败信息:`);
      console.log(`      - 错误类型: ${error instanceof Error ? error.constructor.name : '未知'}`);
      console.log(`      - 错误消息: ${errorMessage}`);
      console.log(`      - 执行时间: ${Date.now() - startTime}ms`);
      console.log(`      - 迭代次数: ${iterations}`);
      
      return {
        success: false,
        stage: SchedulingStage.CORE_COURSES,
        schedule: null,
        message: `核心课程排课失败: ${errorMessage}`,
        executionTime: Date.now() - startTime,
        iterations: iterations,
        stageProgress: 0,
        overallProgress: 0
      };
    }
  }

  /**
   * 核心课程预处理
   * @param courses 原始课程列表
   * @returns 预处理后的课程列表
   */
  private preprocessCoreCourses(courses: CoreCourse[]): CoreCourse[] {
    console.log(`   🔄 [预处理] 开始核心课程预处理...`);
    console.log(`      📊 原始课程数量: ${courses.length}`);
    
    // 所有传入的课程都已经是核心课程
    console.log(`      📊 预处理说明:`);
    console.log(`         - 所有传入课程都已经是核心课程`);
    console.log(`         - 保持原始顺序，不进行优先级排序`);
    console.log(`         - 每节课都是独立的排课任务`);
    console.log(`         - 同一门课程在不同班级或由不同教师教授是合法的`);
    console.log(`         - 同一门课程在同一班级需要多节课也是合法的`);
    
    // 输出前10个课程的基本信息
    for (let i = 0; i < Math.min(10, courses.length); i++) {
      const course = courses[i];
      console.log(`         ${i+1}. ${course.subject} - 班级: ${course.classId}, 教师: ${course.teacherId}`);
    }
    
    // 直接返回，不做任何修改
    console.log(`      📊 预处理完成:`);
    console.log(`         - 保持原始课程数量: ${courses.length}`);
    console.log(`         - 不进行优先级排序，保持原始顺序`);
    
    return courses;
  }

  /**
   * 应用核心约束
   * @param timeSlots 原始时间槽列表
   * @returns 应用约束后的时间槽列表
   */
  private applyCoreConstraints(timeSlots: ExtendedTimeSlot[]): ExtendedTimeSlot[] {
    // 核心课程优先安排在前4节课
    return timeSlots.map(slot => ({
      ...slot,
      priority: slot.period <= 4 ? 'high' : 'medium'
    }));
  }

  /**
   * 执行核心课程排课
   * @param courses 预处理后的课程列表
   * @param teachers 教师列表
   * @param rooms 教室列表
   * @param timeSlots 约束后的时间槽列表
   * @param iterations 迭代计数器
   * @param startTime 开始时间
   * @returns 排课结果
   */
  private async executeCoreScheduling(
    courses: CoreCourse[],
    teachers: CoreTeacher[],
    rooms: CoreRoom[],
    timeSlots: ExtendedTimeSlot[],
    iterations: number,
    startTime: number
  ): Promise<ScheduleState> {
    const assignments = new Map<string, CourseAssignment>();
    const unassigned: string[] = [];

    // 核心参数统计
    console.log(`[核心课程引擎] 开始排课 - 课程:${courses.length}, 教师:${teachers.length}, 教室:${rooms.length}, 时间槽:${timeSlots.length}`);
    
    // 🔥 新增：详细分析144门课程数据
    console.log(`📊 课程数据详细分析:`);
    console.log(`   - 总课程数: ${courses.length}`);
    
    // 按科目统计课程数量
    const subjectCounts = new Map<string, number>();
    const classCounts = new Map<string, number>();
    const teacherCounts = new Map<string, number>();
    
    courses.forEach(course => {
      // 统计科目数量
      const currentCount = subjectCounts.get(course.subject) || 0;
      subjectCounts.set(course.subject, currentCount + 1);
      
      // 统计班级数量
      const currentClassCount = classCounts.get(course.classId) || 0;
      classCounts.set(course.classId, currentClassCount + 1);
      
      // 统计教师数量
      const currentTeacherCount = teacherCounts.get(course.teacherId.toString()) || 0;
      teacherCounts.set(course.teacherId.toString(), currentTeacherCount + 1);
    });
    
    console.log(`   - 科目分布:`);
    for (const [subject, count] of subjectCounts) {
      console.log(`     * ${subject}: ${count} 门课程`);
    }
    
    console.log(`   - 班级分布:`);
    for (const [classId, count] of classCounts) {
      console.log(`     * 班级 ${classId}: ${count} 门课程`);
    }
    
    console.log(`   - 教师分布:`);
    for (const [teacherId, count] of teacherCounts) {
      console.log(`     * 教师 ${teacherId}: ${count} 门课程`);
    }
    
    // 检查核心科目识别
    const coreSubjectCounts = new Map<string, number>();
    const nonCoreSubjectCounts = new Map<string, number>();
    
    courses.forEach(course => {
      if (this.coreSubjects.includes(course.subject)) {
        const currentCount = coreSubjectCounts.get(course.subject) || 0;
        coreSubjectCounts.set(course.subject, currentCount + 1);
      } else {
        const currentCount = nonCoreSubjectCounts.get(course.subject) || 0;
        nonCoreSubjectCounts.set(course.subject, currentCount + 1);
      }
    });
    
    console.log(`   - 核心科目识别:`);
    console.log(`     * 核心科目: ${Array.from(coreSubjectCounts.entries()).map(([s, c]) => `${s}(${c})`).join(', ')}`);
    console.log(`     * 非核心科目: ${Array.from(nonCoreSubjectCounts.entries()).map(([s, c]) => `${s}(${c})`).join(', ')}`);
    
    // 资源分析
    const courseSubjects = [...new Set(courses.map(c => c.subject))];
    console.log(`📚 科目: [${courseSubjects.join(', ')}] (${courseSubjects.length}种)`);
    console.log(`📊 理论容量: ${timeSlots.length * 8}, 需求: ${courses.length}, 充足性: ${courses.length <= timeSlots.length * 8 ? '✅' : '❌'}`);

    // 开始课程分配循环
    console.log(`[核心课程引擎] 开始分配 ${courses.length} 门课程`);
    
    for (let courseIndex = 0; courseIndex < courses.length; courseIndex++) {
      const course = courses[courseIndex];
      
      console.log(`\n🔄 [课程分配] 处理第 ${courseIndex + 1}/${courses.length} 门课程:`);
      console.log(`   📋 课程ID: ${course.id}`);
      console.log(`   📋 科目: ${course.subject}`);
      console.log(`   📋 班级ID: ${course.classId}`);
      console.log(`   📋 教师ID: ${course.teacherId}`);
      console.log(`   📋 课时: ${course.requiredHours}`);
      
      if (this.shouldStop(iterations, startTime)) {
        throw new Error('达到时间或迭代限制');
      }

      // 验证课程数据
      if (!this.validateCourseData(course)) {
        console.log(`   ❌ [课程分配] 课程数据验证失败，跳过`);
        unassigned.push(course.id);
        iterations++;
        continue;
      }

      // 🔥 增强：检查该教师在该时间槽的冲突情况
      const teacherTimeSlotConflicts = this.checkTeacherTimeSlotConflicts(course.teacherId, assignments);
      if (teacherTimeSlotConflicts.length > 0) {
        console.log(`   ⚠️ [课程分配] 发现教师时间槽冲突:`);
        teacherTimeSlotConflicts.forEach(conflict => {
          console.log(`      📋 冲突时间槽: 第${conflict.dayOfWeek}天第${conflict.period}节`);
          console.log(`      📋 冲突班级: ${conflict.classId}`);
        });
        console.log(`   💡 [课程分配] 将尝试为当前课程分配不同的时间槽`);
      }
      
      // 尝试分配课程
      const assignment = await this.assignCoreCourse(course, rooms, timeSlots, assignments);
      
      if (assignment) {
        assignments.set(course.id, assignment);
        console.log(`   ✅ [课程分配] 课程分配成功: 第${assignment.timeSlot.dayOfWeek}天第${assignment.timeSlot.period}节`);
        // 更新可用资源
        this.updateAvailableResources(assignment, teachers, rooms, timeSlots);
      } else {
        console.log(`   ❌ [课程分配] 课程分配失败`);
        unassigned.push(course.id);
      }

      iterations++;
      
      // 每处理10门课程显示一次进度
      if ((courseIndex + 1) % 10 === 0) {
        console.log(`📊 [进度更新] 已处理: ${courseIndex + 1}/${courses.length}, 成功: ${assignments.size}, 失败: ${unassigned.length}`);
      }
    }

    // 最终统计
    console.log(`[核心课程引擎] 完成 - 成功:${assignments.size}/${courses.length}, 成功率:${((assignments.size / courses.length) * 100).toFixed(1)}%`);

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
   * 分配单个核心课程
   * @param course 课程（包含预分配的教师和班级）
   * @param rooms 可用教室
   * @param timeSlots 可用时间槽
   * @param currentAssignments 当前分配结果
   * @returns 课程分配结果
   */
  private async assignCoreCourse(
    course: CoreCourse,
    rooms: CoreRoom[],
    timeSlots: ExtendedTimeSlot[],
    currentAssignments: Map<string, CourseAssignment>
  ): Promise<CourseAssignment | null> {
    // 验证课程数据
    if (!this.validateCourseData(course)) {
      return null;
    }

    // 检查教师时间冲突
    const isTeacherBusy = this.isTeacherBusy(course.teacherId, currentAssignments);
    if (isTeacherBusy) {
      console.log(`      ⚠️ [课程分配] 教师 ${course.teacherId} 忙碌，跳过课程 ${course.subject}`);
      return null;
    }
    
    // 🔥 增强：检查该教师在其他班级的课程安排，避免时间冲突
    const teacherOtherAssignments = Array.from(currentAssignments.values()).filter(
      assignment => assignment.teacherId.equals(course.teacherId) && 
                   assignment.classId.toString() !== course.classId
    );
    
    if (teacherOtherAssignments.length > 0) {
      console.log(`      📊 [课程分配] 教师 ${course.teacherId} 在其他班级的课程安排:`);
      teacherOtherAssignments.forEach(assignment => {
        console.log(`         - 班级: ${assignment.classId}, 时间: 第${assignment.timeSlot.dayOfWeek}天第${assignment.timeSlot.period}节`);
      });
      console.log(`      💡 [课程分配] 将确保为当前班级分配不同的时间槽`);
      
      // 🔥 新增：检查该教师在其他班级的时间槽分布
      const teacherTimeSlots = teacherOtherAssignments.map(a => `${a.timeSlot.dayOfWeek}-${a.timeSlot.period}`);
      console.log(`      📅 [课程分配] 教师已占用的时间槽: ${teacherTimeSlots.join(', ')}`);
    }

    // 查找可用时间槽
    let availableTimeSlot = this.findAvailableTimeSlot(course, course.teacherId, timeSlots, currentAssignments);
    if (!availableTimeSlot) {
      return null;
    }



    // 查找可用教室
    const availableRoom = this.findAvailableRoom(course, availableTimeSlot, rooms);
    if (!availableRoom) {
      return null;
    }

    // 创建 ObjectId
    const classId = this.safeCreateObjectId(course.classId);
    const courseId = this.safeCreateObjectId(course.id);
    const teacherId = course.teacherId; // 已经是 ObjectId 类型，无需转换
    const roomId = this.safeCreateObjectId(availableRoom.id);
    
    if (!classId || !courseId || !teacherId || !roomId) {
      return null;
    }
    
    const assignment: CourseAssignment = {
      variableId: course.id,
      classId: classId,
      courseId: courseId,
      teacherId: teacherId,
      roomId: roomId,
      timeSlot: availableTimeSlot,
      isFixed: false
    };
    
    return assignment;
  }



  /**
   * 查找可用时间槽
   * @param course 课程
   * @param teacherId 教师ID
   * @param timeSlots 时间槽列表
   * @param currentAssignments 当前分配结果
   * @returns 可用时间槽
   */
  private findAvailableTimeSlot(
    course: CoreCourse, 
    teacherId: mongoose.Types.ObjectId, 
    timeSlots: ExtendedTimeSlot[], 
    currentAssignments: Map<string, CourseAssignment>
  ): TimeSlot | null {
    console.log(`      🔍 [时间槽查找] 开始查找课程 ${course.subject} 的可用时间槽...`);
    console.log(`         📋 教师: ${teacherId}, 班级: ${course.classId}`);
    console.log(`         📋 可用时间槽数量: ${timeSlots.length}`);
    console.log(`         📋 当前分配数量: ${currentAssignments.size}`);
    
    // 🔥 优化：智能时间槽分配策略 - 综合评分版
    // 使用综合评分系统，考虑多个因素：
    // 1. 占用数量（主要因素）
    // 2. 时间槽优先级
    // 3. 天数分布（避免过度集中）
    // 4. 时间段偏好（上午优先）
    
    const sortedTimeSlots = timeSlots.sort((a, b) => {
      const aScore = this.calculateTimeSlotScore(a, currentAssignments, teacherId);
      const bScore = this.calculateTimeSlotScore(b, currentAssignments, teacherId);
      return aScore - bScore; // 分数低的优先
    });
    
    console.log(`         📊 时间槽智能排序完成`);
    console.log(`            - 高优先级: ${sortedTimeSlots.filter(s => s.priority === 'high').length} 个`);
    console.log(`            - 中优先级: ${sortedTimeSlots.filter(s => s.priority === 'medium').length} 个`);
    console.log(`            - 低优先级: ${sortedTimeSlots.filter(s => s.priority === 'low').length} 个`);

    // 显示每天的课程分布情况
    console.log(`         📅 当前每天课程分布:`);
    for (let day = 1; day <= 5; day++) {
      const dayCount = this.getDayCourseCount(day, currentAssignments);
      console.log(`            - 第${day}天: ${dayCount} 门课程`);
    }

    // 输出前10个时间槽的详细信息和占用情况
    console.log(`         ⏰ 前10个时间槽详情和占用情况:`);
    for (let i = 0; i < Math.min(10, sortedTimeSlots.length); i++) {
      const slot = sortedTimeSlots[i];
      const occupiedCount = this.getTimeSlotOccupiedCount(slot, currentAssignments);
      const score = this.calculateTimeSlotScore(slot, currentAssignments, teacherId);
      console.log(`            ${i+1}. 第${slot.dayOfWeek}天第${slot.period}节 (优先级: ${slot.priority}, 已占用: ${occupiedCount}/8, 评分: ${score})`);
    }

    // 🔥 增强：智能时间槽选择，优先选择教师无冲突的时间槽
    const availableTimeSlot = sortedTimeSlots.find(slot => {
      const isOccupied = this.isTimeSlotOccupied(slot, teacherId, course.classId, currentAssignments);
      const occupiedCount = this.getTimeSlotOccupiedCount(slot, currentAssignments);
      
      if (isOccupied) {
        console.log(`         🔍 检查时间槽 第${slot.dayOfWeek}天第${slot.period}节: 教师冲突，跳过`);
        return false;
      }
      
      // 🔥 新增：检查该教师在该时间槽的其他班级课程
      const teacherTimeSlotAssignments = Array.from(currentAssignments.values()).filter(assignment => {
        const timeMatch = assignment.timeSlot.dayOfWeek === slot.dayOfWeek && 
                         assignment.timeSlot.period === slot.period;
        const teacherMatch = assignment.teacherId.equals(teacherId);
        return timeMatch && teacherMatch;
      });
      
      if (teacherTimeSlotAssignments.length > 0) {
        console.log(`         ⚠️ 检查时间槽 第${slot.dayOfWeek}天第${slot.period}节: 教师在该时间槽已有其他班级课程，跳过`);
        return false;
      }
      
      console.log(`         🔍 检查时间槽 第${slot.dayOfWeek}天第${slot.period}节: 可用，已占用数量=${occupiedCount}/8`);
      return true;
    }) || null;
    
    if (availableTimeSlot) {
      const occupiedCount = this.getTimeSlotOccupiedCount(availableTimeSlot, currentAssignments);
      console.log(`         ✅ [时间槽查找] 找到可用时间槽: 第${availableTimeSlot.dayOfWeek}天第${availableTimeSlot.period}节 (优先级: ${availableTimeSlot.priority}, 已占用: ${occupiedCount}/8)`);
    } else {
      console.log(`         ❌ [时间槽查找] 没有找到可用时间槽`);
      console.log(`            🔍 前10个时间槽占用情况:`);
      for (let i = 0; i < Math.min(10, sortedTimeSlots.length); i++) {
        const slot = sortedTimeSlots[i];
        const isOccupied = this.isTimeSlotOccupied(slot, teacherId, course.classId, currentAssignments);
        const occupiedCount = this.getTimeSlotOccupiedCount(slot, currentAssignments);
        console.log(`               - 第${slot.dayOfWeek}天第${slot.period}节: 是否占用=${isOccupied}, 已占用数量=${occupiedCount}/8`);
        if (isOccupied) {
          console.log(`                 占用原因: 教师在该时间段已有安排`);
        }
      }
    }
    
    return availableTimeSlot;
  }

  /**
   * 查找可用教室（固定教室策略）
   * @param course 课程
   * @param timeSlot 时间槽
   * @param rooms 教室列表
   * @returns 可用教室
   */
  private findAvailableRoom(
    course: CoreCourse, 
    timeSlot: TimeSlot, 
    rooms: CoreRoom[]
  ): CoreRoom | null {
    console.log(`      🔍 [教室查找] 开始查找课程 ${course.subject} 的可用教室...`);
    console.log(`         📋 时间槽: 第${timeSlot.dayOfWeek}天第${timeSlot.period}节`);
    console.log(`         📋 可用教室数量: ${rooms.length}`);
    
    // 输出所有教室的详细信息
    if (rooms.length > 0) {
      console.log(`         🏫 教室详细信息:`);
      for (let i = 0; i < rooms.length; i++) {
        const room = rooms[i];
        console.log(`            ${i+1}. 教室ID: ${room.id}`);
        console.log(`               类型: ${room.type}`);
        console.log(`               容量: ${room.capacity}`);
        console.log(`               是否可用: ✅`);
      }
    }
    
    // 固定教室策略：直接返回第一个可用教室，不需要检查占用
    const availableRoom = rooms[0] || null;
    
    if (availableRoom) {
      console.log(`         ✅ [教室查找] 找到可用教室: ${availableRoom.id} (${availableRoom.type}, 容量: ${availableRoom.capacity})`);
      console.log(`            📋 选择策略: 固定教室策略，选择第一个可用教室`);
    } else {
      console.log(`         ❌ [教室查找] 没有找到可用教室`);
      console.log(`            📋 失败原因: 教室列表为空`);
    }
    
    return availableRoom;
  }

  /**
   * 检查是否应该停止排课
   * @param iterations 当前迭代次数
   * @param startTime 开始时间
   * @returns 是否应该停止
   */
  private shouldStop(iterations: number, startTime: number): boolean {
    const currentTime = Date.now();
    const elapsedTime = currentTime - startTime;
    return iterations >= this.maxIterations || elapsedTime >= this.timeLimit * 1000;
  }

  /**
   * 检查教师是否忙碌
   * @param teacherId 教师ID
   * @param assignments 分配结果
   * @returns 是否忙碌
   */
  private isTeacherBusy(teacherId: mongoose.Types.ObjectId, assignments: Map<string, CourseAssignment>): boolean {
    console.log(`            🔍 [忙碌检查] 检查教师 ${teacherId} 是否忙碌`);
    console.log(`               📋 当前分配数量: ${assignments.size}`);
    
    // 如果当前没有分配，教师肯定不忙碌
    if (assignments.size === 0) {
      console.log(`               ✅ [忙碌检查] 无分配，教师不忙碌`);
      return false;
    }
    
    // 🔥 修复：教师忙碌检查逻辑错误！
    // 原来的逻辑：只要教师有任何课程安排就认为忙碌
    // 正确的逻辑：教师可以在不同时间槽安排多门课程，这不是忙碌
    // 只有在同一时间槽安排多门课程才是真正的冲突
    
    // 统计该教师的课程数量
    const teacherCourseCount = Array.from(assignments.values()).filter(
      assignment => assignment.teacherId.equals(teacherId)
    ).length;
    
    console.log(`               📊 教师当前课程数量: ${teacherCourseCount}`);
    
    // 教师可以安排多门课程，只要不在同一时间槽
    // 这里我们设置一个合理的上限，比如每周最多30节课
    const maxWeeklyCourses = 30;
    
    if (teacherCourseCount >= maxWeeklyCourses) {
      console.log(`               ⚠️ [忙碌检查] 教师课程数量已达上限: ${teacherCourseCount}/${maxWeeklyCourses}`);
      return true;
    }
    
    console.log(`               ✅ [忙碌检查] 教师不忙碌，可继续安排课程`);
    return false;
  }

  /**
   * 检查时间槽是否被占用
   * @param timeSlot 时间槽
   * @param teacherId 教师ID
   * @param classId 班级ID
   * @param assignments 分配结果
   * @returns 是否被占用
   */
  private isTimeSlotOccupied(
    timeSlot: TimeSlot, 
    teacherId: mongoose.Types.ObjectId, 
    classId: string, 
    assignments: Map<string, CourseAssignment>
  ): boolean {
    console.log(`            🔍 [占用检查] 检查时间槽 第${timeSlot.dayOfWeek}天第${timeSlot.period}节 是否被占用`);
    console.log(`               📋 教师ID: ${teacherId}, 班级ID: ${classId}`);
    console.log(`               📋 当前分配数量: ${assignments.size}`);
    
    // 如果当前没有分配，时间槽肯定可用
    if (assignments.size === 0) {
      console.log(`               ✅ [占用检查] 无分配，时间槽可用`);
      return false;
    }
    
    // 🔥 增强：检查该教师在该时间槽的所有课程安排
    const teacherTimeSlotAssignments = Array.from(assignments.values()).filter(assignment => {
      const timeMatch = assignment.timeSlot.dayOfWeek === timeSlot.dayOfWeek && 
                       assignment.timeSlot.period === timeSlot.period;
      const teacherMatch = assignment.teacherId.equals(teacherId);
      return timeMatch && teacherMatch;
    });
    
    if (teacherTimeSlotAssignments.length > 0) {
      console.log(`               ⚠️ [占用检查] 发现教师时间冲突: 第${timeSlot.dayOfWeek}天第${timeSlot.period}节`);
      teacherTimeSlotAssignments.forEach(assignment => {
        console.log(`                  📋 冲突课程: 班级 ${assignment.classId}, 教师 ${assignment.teacherId}`);
      });
      console.log(`                  📋 教师冲突: true (同一教师在同一时间槽已有安排)`);
      return true; // 真正的冲突：同一教师在同一时间槽
    }
    
    console.log(`               ✅ [占用检查] 时间槽可用 (教师在该时间槽无冲突)`);
    return false;
  }

  /**
   * 获取时间槽的占用数量（用于智能排序）
   * @param timeSlot 时间槽
   * @param assignments 分配结果
   * @returns 占用数量
   */
  private getTimeSlotOccupiedCount(
    timeSlot: TimeSlot, 
    assignments: Map<string, CourseAssignment>
  ): number {
    if (assignments.size === 0) {
      return 0;
    }
    
    // 统计在该时间槽已分配的课程数量
    let count = 0;
    for (const assignment of assignments.values()) {
      if (assignment.timeSlot.dayOfWeek === timeSlot.dayOfWeek && 
          assignment.timeSlot.period === timeSlot.period) {
        count++;
      }
    }
    
    return count;
  }

  /**
   * 检查教师的时间槽冲突
   * @param teacherId 教师ID
   * @param assignments 分配结果
   * @returns 冲突的时间槽列表
   */
  private checkTeacherTimeSlotConflicts(
    teacherId: mongoose.Types.ObjectId,
    assignments: Map<string, CourseAssignment>
  ): Array<{dayOfWeek: number; period: number; classId: string}> {
    const conflicts: Array<{dayOfWeek: number; period: number; classId: string}> = [];
    
    if (assignments.size === 0) {
      return conflicts;
    }
    
    // 检查该教师的所有已分配课程
    for (const assignment of assignments.values()) {
      if (assignment.teacherId.equals(teacherId)) {
        conflicts.push({
          dayOfWeek: assignment.timeSlot.dayOfWeek,
          period: assignment.timeSlot.period,
          classId: assignment.classId.toString()
        });
      }
    }
    
    return conflicts;
  }

  /**
   * 获取某一天的课程分布情况（用于避免过度集中）
   * @param dayOfWeek 星期几
   * @param assignments 分配结果
   * @returns 该天的课程数量
   */
  private getDayCourseCount(
    dayOfWeek: number, 
    assignments: Map<string, CourseAssignment>
  ): number {
    if (assignments.size === 0) {
      return 0;
    }
    
    let count = 0;
    for (const assignment of assignments.values()) {
      if (assignment.timeSlot.dayOfWeek === dayOfWeek) {
        count++;
      }
    }
    
    return count;
  }

  /**
   * 计算时间槽的综合评分（用于更智能的选择）
   * @param timeSlot 时间槽
   * @param currentAssignments 当前分配结果
   * @param teacherId 教师ID（可选，用于教师可用性检查）
   * @returns 综合评分（分数越低优先级越高）
   */
  private calculateTimeSlotScore(
    timeSlot: ExtendedTimeSlot, 
    currentAssignments: Map<string, CourseAssignment>,
    teacherId?: mongoose.Types.ObjectId
  ): number {
    // 基础分数：占用数量（占用少的优先）
    const occupiedCount = this.getTimeSlotOccupiedCount(timeSlot, currentAssignments);
    let score = occupiedCount * 10;
    
    // 优先级加分：高优先级时间槽
    if (timeSlot.priority === 'high') {
      score += 5;
    } else if (timeSlot.priority === 'medium') {
      score += 10;
    } else {
      score += 15;
    }
    
    // 天数分布加分：避免过度集中在同一天
    const dayCourseCount = this.getDayCourseCount(timeSlot.dayOfWeek, currentAssignments);
    if (dayCourseCount > 10) { // 如果某天课程过多，增加惩罚
      score += (dayCourseCount - 10) * 2;
    }
    
    // 时间段加分：上午优先
    if (timeSlot.period <= 4) {
      score += 2;
    }
    
    // 🔥 增强：教师可用性检查（如果提供了教师ID）
    if (teacherId) {
      const isTeacherAvailable = !this.isTimeSlotOccupied(timeSlot, teacherId, '', currentAssignments);
      if (!isTeacherAvailable) {
        score += 10000; // 教师不可用的时间槽给予极大惩罚
        console.log(`               ⚠️ [评分] 时间槽 第${timeSlot.dayOfWeek}天第${timeSlot.period}节 教师冲突，评分+10000`);
      } else {
        // 教师可用的时间槽给予奖励
        score -= 5;
        console.log(`               ✅ [评分] 时间槽 第${timeSlot.dayOfWeek}天第${timeSlot.period}节 教师可用，评分-5`);
      }
    }
    
    return score;
  }

  // 教室占用检查已移除 - 使用固定教室策略，不存在占用冲突

  /**
   * 更新可用资源
   * @param assignment 课程分配
   * @param teachers 教师列表
   * @param rooms 教室列表
   * @param timeSlots 时间槽列表
   */
  private updateAvailableResources(
    assignment: CourseAssignment, 
    teachers: CoreTeacher[], 
    rooms: CoreRoom[], 
    timeSlots: ExtendedTimeSlot[]
  ): void {
    // 资源状态通过分配记录自动跟踪
    // 无需额外更新逻辑
  }

  /**
   * 验证核心课程排课结果
   * @param schedule 排课结果
   * @returns 验证结果
   */
  private validateCoreSchedule(schedule: ScheduleState): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (!schedule.assignments || schedule.assignments.size === 0) {
      errors.push('没有分配任何课程');
    }

    // 检查教师冲突
    const teacherConflicts = this.checkTeacherConflicts(schedule);
    if (teacherConflicts.length > 0) {
      errors.push(`发现 ${teacherConflicts.length} 个教师时间冲突`);
    }

    // 检查班级冲突
    const classConflicts = this.checkClassConflicts(schedule);
    if (classConflicts.length > 0) {
      errors.push(`发现 ${classConflicts.length} 个班级时间冲突`);
    }

    // 检查教室冲突
    const roomConflicts = this.checkRoomConflicts(schedule);
    if (roomConflicts.length > 0) {
      errors.push(`发现 ${roomConflicts.length} 个教室时间冲突`);
    }

    return {
      isValid: errors.length === 0,
      errors: errors
    };
  }

  /**
   * 检查教师冲突
   * @param schedule 课表
   * @returns 冲突列表
   */
  private checkTeacherConflicts(schedule: ScheduleState): any[] {
    const conflicts: any[] = [];
    const teacherTimeMap = new Map<string, Set<string>>();

    for (const assignment of schedule.assignments.values()) {
      const timeKey = `${assignment.timeSlot.dayOfWeek}_${assignment.timeSlot.period}`;
      
      if (!teacherTimeMap.has(assignment.teacherId.toString())) {
        teacherTimeMap.set(assignment.teacherId.toString(), new Set());
      }

      const teacherTimes = teacherTimeMap.get(assignment.teacherId.toString())!;
      if (teacherTimes.has(timeKey)) {
        conflicts.push({
          type: 'teacher_conflict',
          teacherId: assignment.teacherId.toString(),
          timeSlot: assignment.timeSlot,
          courseId: assignment.courseId.toString()
        });
      } else {
        teacherTimes.add(timeKey);
      }
    }

    return conflicts;
  }

  /**
   * 检查班级冲突
   * @param schedule 课表
   * @returns 冲突列表
   */
  private checkClassConflicts(schedule: ScheduleState): any[] {
    const conflicts: any[] = [];
    const classTimeMap = new Map<string, Set<string>>();

    for (const assignment of schedule.assignments.values()) {
      const timeKey = `${assignment.timeSlot.dayOfWeek}_${assignment.timeSlot.period}`;
      
      if (!classTimeMap.has(assignment.classId.toString())) {
        classTimeMap.set(assignment.classId.toString(), new Set());
      }

      const classTimes = classTimeMap.get(assignment.classId.toString())!;
      if (classTimes.has(timeKey)) {
        conflicts.push({
          type: 'class_conflict',
          classId: assignment.classId.toString(),
          timeSlot: assignment.timeSlot,
          courseId: assignment.courseId.toString()
        });
      } else {
        classTimes.add(timeKey);
      }
    }

    return conflicts;
  }

  /**
   * 检查教室冲突
   * @param schedule 课表
   * @returns 冲突列表
   */
  private checkRoomConflicts(schedule: ScheduleState): any[] {
    const conflicts: any[] = [];
    const roomTimeMap = new Map<string, Set<string>>();

    for (const assignment of schedule.assignments.values()) {
      const timeKey = `${assignment.timeSlot.dayOfWeek}_${assignment.timeSlot.period}`;
      
      if (!roomTimeMap.has(assignment.roomId.toString())) {
        roomTimeMap.set(assignment.roomId.toString(), new Set());
      }

      const roomTimes = roomTimeMap.get(assignment.roomId.toString())!;
      if (roomTimes.has(timeKey)) {
        conflicts.push({
          type: 'room_conflict',
          roomId: assignment.roomId.toString(),
          timeSlot: assignment.timeSlot,
          courseId: assignment.courseId.toString()
        });
      } else {
        roomTimes.add(timeKey);
      }
    }

    return conflicts;
  }

  /**
   * 🔥 新增：执行最终的教师时间冲突检查
   * 
   * 在分配课程前进行最后的冲突检查，确保不会产生教师时间冲突
   * 
   * Args:
   *   teacherId: 教师ID
   *   timeSlot: 要检查的时间槽
   *   currentAssignments: 当前分配结果
   * 
   * Returns:
   *   {hasConflict: boolean, conflictingCourses: string[]}: 冲突检查结果
   */
  private performFinalTeacherConflictCheck(
    teacherId: mongoose.Types.ObjectId,
    timeSlot: TimeSlot,
    currentAssignments: Map<string, CourseAssignment>
  ): {hasConflict: boolean, conflictingCourses: string[]} {
    const conflictingCourses: string[] = [];
    
    // 检查该教师在该时间槽是否已有其他课程安排
    for (const assignment of currentAssignments.values()) {
      if (assignment.teacherId.equals(teacherId) &&
          assignment.timeSlot.dayOfWeek === timeSlot.dayOfWeek &&
          assignment.timeSlot.period === timeSlot.period) {
        conflictingCourses.push(assignment.courseId.toString());
      }
    }
    
    return {
      hasConflict: conflictingCourses.length > 0,
      conflictingCourses
    };
  }

  /**
   * 🔥 新增：查找替代时间槽
   * 
   * 当发现时间冲突时，查找替代时间槽
   * 
   * Args:
   *   course: 课程
   *   teacherId: 教师ID
   *   timeSlots: 时间槽列表
   *   currentAssignments: 当前分配结果
   *   excludedTimeSlot: 要排除的时间槽
   * 
   * Returns:
   *   TimeSlot | null: 替代时间槽，如果没有找到则返回null
   */
  private findAlternativeTimeSlot(
    course: CoreCourse,
    teacherId: mongoose.Types.ObjectId,
    timeSlots: ExtendedTimeSlot[],
    currentAssignments: Map<string, CourseAssignment>,
    excludedTimeSlot: TimeSlot
  ): TimeSlot | null {
    console.log(`      🔍 [替代时间槽查找] 开始查找替代时间槽...`);
    
    // 过滤掉要排除的时间槽
    const availableTimeSlots = timeSlots.filter(slot => 
      !(slot.dayOfWeek === excludedTimeSlot.dayOfWeek && slot.period === excludedTimeSlot.period)
    );
    
    // 使用现有的时间槽查找逻辑，但排除冲突的时间槽
    return this.findAvailableTimeSlot(course, teacherId, availableTimeSlots, currentAssignments);
  }
}
