import { 
  SchedulingResult, 
  ScheduleState, 
  CourseAssignment, 
  TimeSlot,
  CoreConstraint,
  SchedulingStage,
  StagedSchedulingResult
} from './types';

/**
 * 简化的课程接口（用于核心课程引擎）
 */
interface CoreCourse {
  id: string;
  subject: string;
  classId: string;
  teacherId: string;
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
    console.log(`[核心课程引擎] 开始排课，课程数量: ${courses.length}`);
    
    const startTime = Date.now();
    let iterations = 0;
    
    try {
      // 1. 核心课程预处理
      const processedCourses = this.preprocessCoreCourses(courses);
      
      // 2. 应用核心约束
      const constrainedTimeSlots = this.applyCoreConstraints(timeSlots);
      
      // 3. 执行核心课程排课
      const schedule = await this.executeCoreScheduling(
        processedCourses,
        teachers,
        rooms,
        constrainedTimeSlots,
        iterations,
        startTime
      );
      
      // 4. 验证排课结果
      const validationResult = this.validateCoreSchedule(schedule);
      
      const endTime = Date.now();
      const executionTime = endTime - startTime;
      
      console.log(`[核心课程引擎] 排课完成，耗时: ${executionTime}ms，迭代次数: ${iterations}`);
      
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
      console.error(`[核心课程引擎] 排课失败:`, error);
      const errorMessage = error instanceof Error ? error.message : '未知错误';
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
    // 按优先级排序：语文 > 数学 > 英语 > 其他
    const priorityOrder = ['语文', '数学', '英语', '物理', '化学', '生物', '历史', '地理', '政治'];
    
    return courses.sort((a, b) => {
      const aPriority = priorityOrder.indexOf(a.subject);
      const bPriority = priorityOrder.indexOf(b.subject);
      return aPriority - bPriority;
    });
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

    // 简化的核心课程排课算法
    for (const course of courses) {
      if (this.shouldStop(iterations, startTime)) {
        throw new Error('达到时间或迭代限制');
      }

      const assignment = await this.assignCoreCourse(course, teachers, rooms, timeSlots, assignments);
      if (assignment) {
        assignments.set(course.id, assignment);
        // 更新可用资源
        this.updateAvailableResources(assignment, teachers, rooms, timeSlots);
      } else {
        unassigned.push(course.id);
      }

      iterations++;
    }

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
   * @param course 课程
   * @param teachers 可用教师
   * @param rooms 可用教室
   * @param timeSlots 可用时间槽
   * @param currentAssignments 当前分配结果
   * @returns 课程分配结果
   */
  private async assignCoreCourse(
    course: CoreCourse,
    teachers: CoreTeacher[],
    rooms: CoreRoom[],
    timeSlots: ExtendedTimeSlot[],
    currentAssignments: Map<string, CourseAssignment>
  ): Promise<CourseAssignment | null> {
    // 查找可用教师
    const availableTeacher = this.findAvailableTeacher(course, teachers, currentAssignments);
    if (!availableTeacher) {
      console.warn(`[核心课程引擎] 课程 ${course.subject} 没有可用教师`);
      return null;
    }

    // 查找可用时间槽
    const availableTimeSlot = this.findAvailableTimeSlot(course, availableTeacher, timeSlots, currentAssignments);
    if (!availableTimeSlot) {
      console.warn(`[核心课程引擎] 课程 ${course.subject} 没有可用时间槽`);
      return null;
    }

    // 查找可用教室
    const availableRoom = this.findAvailableRoom(course, availableTimeSlot, rooms, currentAssignments);
    if (!availableRoom) {
      console.warn(`[核心课程引擎] 课程 ${course.subject} 没有可用教室`);
      return null;
    }

    return {
      variableId: course.id,
      classId: new (await import('mongoose')).Types.ObjectId(course.classId),
      courseId: new (await import('mongoose')).Types.ObjectId(course.id),
      teacherId: new (await import('mongoose')).Types.ObjectId(availableTeacher.id),
      roomId: new (await import('mongoose')).Types.ObjectId(availableRoom.id),
      timeSlot: availableTimeSlot,
      isFixed: false
    };
  }

  /**
   * 查找可用教师
   * @param course 课程
   * @param teachers 教师列表
   * @param currentAssignments 当前分配结果
   * @returns 可用教师
   */
  private findAvailableTeacher(course: CoreCourse, teachers: CoreTeacher[], currentAssignments: Map<string, CourseAssignment>): CoreTeacher | null {
    // 简化的教师查找逻辑
    return teachers.find(teacher => 
      teacher.subjects.includes(course.subject) && 
      !this.isTeacherBusy(teacher.id, currentAssignments)
    ) || null;
  }

  /**
   * 查找可用时间槽
   * @param course 课程
   * @param teacher 教师
   * @param timeSlots 时间槽列表
   * @param currentAssignments 当前分配结果
   * @returns 可用时间槽
   */
  private findAvailableTimeSlot(
    course: CoreCourse, 
    teacher: CoreTeacher, 
    timeSlots: ExtendedTimeSlot[], 
    currentAssignments: Map<string, CourseAssignment>
  ): TimeSlot | null {
    // 优先选择高优先级时间槽
    const sortedTimeSlots = timeSlots.sort((a, b) => {
      if (a.priority === 'high' && b.priority !== 'high') return -1;
      if (b.priority === 'high' && a.priority !== 'high') return 1;
      return 0;
    });

    return sortedTimeSlots.find(slot => 
      !this.isTimeSlotOccupied(slot, teacher.id, course.classId, currentAssignments)
    ) || null;
  }

  /**
   * 查找可用教室
   * @param course 课程
   * @param timeSlot 时间槽
   * @param rooms 教室列表
   * @param currentAssignments 当前分配结果
   * @returns 可用教室
   */
  private findAvailableRoom(
    course: CoreCourse, 
    timeSlot: TimeSlot, 
    rooms: CoreRoom[], 
    currentAssignments: Map<string, CourseAssignment>
  ): CoreRoom | null {
    return rooms.find(room => 
      !this.isRoomOccupied(room.id, timeSlot, currentAssignments)
    ) || null;
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
  private isTeacherBusy(teacherId: string, assignments: Map<string, CourseAssignment>): boolean {
    return Array.from(assignments.values()).some(assignment => assignment.teacherId.toString() === teacherId);
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
    teacherId: string, 
    classId: string, 
    assignments: Map<string, CourseAssignment>
  ): boolean {
    return Array.from(assignments.values()).some(assignment => 
      assignment.timeSlot.dayOfWeek === timeSlot.dayOfWeek &&
      assignment.timeSlot.period === timeSlot.period &&
      (assignment.teacherId.toString() === teacherId || assignment.classId.toString() === classId)
    );
  }

  /**
   * 检查教室是否被占用
   * @param roomId 教室ID
   * @param timeSlot 时间槽
   * @param assignments 分配结果
   * @returns 是否被占用
   */
  private isRoomOccupied(roomId: string, timeSlot: TimeSlot, assignments: Map<string, CourseAssignment>): boolean {
    return Array.from(assignments.values()).some(assignment => 
      assignment.roomId.toString() === roomId &&
      assignment.timeSlot.dayOfWeek === timeSlot.dayOfWeek &&
      assignment.timeSlot.period === timeSlot.period
    );
  }

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
    // 在实际实现中，这里会更新资源的可用性状态
    // 简化实现，暂时不修改原始数据
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
}
