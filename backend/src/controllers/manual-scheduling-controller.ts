/**
 * 手动调课控制器
 * 
 * 处理手动调课相关的HTTP请求，提供课程移动和交换的API接口
 */

import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { Schedule, ISchedule } from '../models/Schedule';
import { ConstraintDetector } from '../services/scheduling/constraint-detector';
import { SchedulingRules } from '../models/SchedulingRules';
import {
  TimeSlot,
  CourseAssignment,
  ConflictInfo,
  ConstraintViolation
} from '../services/scheduling/types';

/**
 * 课程移动请求接口
 */
interface MoveCourseRequest {
  scheduleId: string;                  // 课程安排ID
  targetTimeSlot: {                    // 目标时间段
    dayOfWeek: number;                 // 星期几 (1-7)
    period: number;                    // 第几节课 (1-N)
  };
  targetRoomId?: string;               // 目标教室ID（可选）
  forceMove?: boolean;                 // 是否强制移动（忽略软约束）
}

/**
 * 课程交换请求接口
 */
interface SwapCoursesRequest {
  schedule1Id: string;                 // 第一个课程安排ID
  schedule2Id: string;                 // 第二个课程安排ID
  swapRooms?: boolean;                 // 是否同时交换教室
  forceSwap?: boolean;                 // 是否强制交换（忽略软约束）
}

/**
 * 调课结果接口
 */
interface SchedulingOperationResult {
  success: boolean;                    // 操作是否成功
  conflicts?: ConflictInfo[];          // 硬约束冲突列表
  violations?: ConstraintViolation[];  // 软约束违反列表
  message: string;                     // 操作结果消息
  affectedSchedules?: ISchedule[];     // 受影响的课程安排
  suggestions?: string[];              // 改进建议
}

/**
 * 手动调课控制器类
 * 
 * 提供手动调课相关的API端点
 */
export class ManualSchedulingController {

  /**
   * 移动单个课程到新的时间和教室
   * 
   * POST /api/manual-scheduling/move
   * 
   * Args:
   *   req: 请求对象，包含MoveCourseRequest数据
   *   res: 响应对象
   * 
   * Returns:
   *   void
   */
  static async moveCourse(req: Request, res: Response): Promise<void> {
    try {
      const {
        scheduleId,
        targetTimeSlot,
        targetRoomId,
        forceMove = false
      }: MoveCourseRequest = req.body;

      // 验证必需参数
      if (!scheduleId || !targetTimeSlot || !targetTimeSlot.dayOfWeek || !targetTimeSlot.period) {
        res.status(400).json({
          success: false,
          error: '课程ID和目标时间段是必需的参数'
        });
        return;
      }

      // 查找要移动的课程
      const schedule = await Schedule.findById(scheduleId).populate('class course teacher room');
      if (!schedule) {
        res.status(404).json({
          success: false,
          error: '找不到指定的课程安排'
        });
        return;
      }

      // 获取排课规则
      const rules = await SchedulingRules.findOne({ 
        isDefault: true,
        academicYear: schedule.academicYear,
        semester: schedule.semester 
      });

      if (!rules) {
        res.status(400).json({
          success: false,
          error: '找不到对应的排课规则配置'
        });
        return;
      }

      // 执行移动操作
      const result = await ManualSchedulingController.performMoveCourse(
        schedule,
        targetTimeSlot,
        targetRoomId,
        rules,
        forceMove
      );

      if (result.success) {
        res.json({
          success: true,
          data: result,
          message: '课程移动成功'
        });
      } else {
        res.status(409).json({
          success: false,
          error: result.message,
          data: {
            conflicts: result.conflicts,
            violations: result.violations,
            suggestions: result.suggestions
          }
        });
      }

    } catch (error) {
      console.error('移动课程失败:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : '未知错误'
      });
    }
  }

  /**
   * 交换两个课程的时间和教室
   * 
   * POST /api/manual-scheduling/swap
   * 
   * Args:
   *   req: 请求对象，包含SwapCoursesRequest数据
   *   res: 响应对象
   * 
   * Returns:
   *   void
   */
  static async swapCourses(req: Request, res: Response): Promise<void> {
    try {
      const {
        schedule1Id,
        schedule2Id,
        swapRooms = true,
        forceSwap = false
      }: SwapCoursesRequest = req.body;

      // 验证必需参数
      if (!schedule1Id || !schedule2Id) {
        res.status(400).json({
          success: false,
          error: '两个课程安排ID都是必需的参数'
        });
        return;
      }

      if (schedule1Id === schedule2Id) {
        res.status(400).json({
          success: false,
          error: '不能交换同一个课程安排'
        });
        return;
      }

      // 查找要交换的两个课程
      const [schedule1, schedule2] = await Promise.all([
        Schedule.findById(schedule1Id).populate('class course teacher room'),
        Schedule.findById(schedule2Id).populate('class course teacher room')
      ]);

      if (!schedule1 || !schedule2) {
        res.status(404).json({
          success: false,
          error: '找不到指定的课程安排'
        });
        return;
      }

      // 检查是否在同一学期
      if (schedule1.semester !== schedule2.semester || schedule1.academicYear !== schedule2.academicYear) {
        res.status(400).json({
          success: false,
          error: '只能交换同一学期的课程'
        });
        return;
      }

      // 获取排课规则
      const rules = await SchedulingRules.findOne({ 
        isDefault: true,
        academicYear: schedule1.academicYear,
        semester: schedule1.semester 
      });

      if (!rules) {
        res.status(400).json({
          success: false,
          error: '找不到对应的排课规则配置'
        });
        return;
      }

      // 执行交换操作
      const result = await ManualSchedulingController.performSwapCourses(
        schedule1,
        schedule2,
        rules,
        swapRooms,
        forceSwap
      );

      if (result.success) {
        res.json({
          success: true,
          data: result,
          message: '课程交换成功'
        });
      } else {
        res.status(409).json({
          success: false,
          error: result.message,
          data: {
            conflicts: result.conflicts,
            violations: result.violations,
            suggestions: result.suggestions
          }
        });
      }

    } catch (error) {
      console.error('交换课程失败:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : '未知错误'
      });
    }
  }

  /**
   * 检查指定时间段的冲突情况
   * 
   * POST /api/manual-scheduling/check-conflicts
   * 
   * Args:
   *   req: 请求对象
   *   res: 响应对象
   * 
   * Returns:
   *   void
   */
  static async checkConflicts(req: Request, res: Response): Promise<void> {
    try {
      const {
        semester,
        academicYear,
        dayOfWeek,
        period,
        teacherId,
        classId,
        roomId,
        excludeScheduleIds = []
      } = req.body;

      // 验证必需参数
      if (!semester || !academicYear || !dayOfWeek || !period) {
        res.status(400).json({
          success: false,
          error: '学期、学年、星期和节次是必需的参数'
        });
        return;
      }

      // 构建查询条件
      const conflictQueries: any[] = [];
      
      if (teacherId) {
        conflictQueries.push({ semester, dayOfWeek, period, teacher: new mongoose.Types.ObjectId(teacherId), status: 'active' });
      }
      
      if (classId) {
        conflictQueries.push({ semester, dayOfWeek, period, class: new mongoose.Types.ObjectId(classId), status: 'active' });
      }
      
      if (roomId) {
        conflictQueries.push({ semester, dayOfWeek, period, room: new mongoose.Types.ObjectId(roomId), status: 'active' });
      }

      // 查找冲突的课程
      const conflicts = conflictQueries.length > 0 
        ? await Schedule.find({ $or: conflictQueries }).populate('class course teacher room')
        : [];

      // 排除指定的课程安排
      const filteredConflicts = conflicts.filter(
        (conflict: ISchedule) => !excludeScheduleIds.includes((conflict._id as mongoose.Types.ObjectId).toString())
      );

      res.json({
        success: true,
        data: {
          hasConflicts: filteredConflicts.length > 0,
          conflicts: filteredConflicts,
          timeSlot: {
            dayOfWeek,
            period,
            description: `星期${dayOfWeek}第${period}节`
          }
        }
      });

    } catch (error) {
      console.error('检查冲突失败:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : '未知错误'
      });
    }
  }

  /**
   * 获取课程可用的时间段
   * 
   * GET /api/manual-scheduling/available-slots/:scheduleId
   * 
   * Args:
   *   req: 请求对象
   *   res: 响应对象
   * 
   * Returns:
   *   void
   */
  static async getAvailableSlots(req: Request, res: Response): Promise<void> {
    try {
      const { scheduleId } = req.params;

      // 查找课程安排
      const schedule = await Schedule.findById(scheduleId).populate('class course teacher room');
      if (!schedule) {
        res.status(404).json({
          success: false,
          error: '找不到指定的课程安排'
        });
        return;
      }

      // 获取排课规则
      const rules = await SchedulingRules.findOne({ 
        isDefault: true,
        academicYear: schedule.academicYear,
        semester: schedule.semester 
      });

      if (!rules) {
        res.status(400).json({
          success: false,
          error: '找不到对应的排课规则配置'
        });
        return;
      }

      // 生成所有可能的时间段
      const availableSlots: Array<{
        dayOfWeek: number;
        period: number;
        conflicts: ISchedule[];
        canMove: boolean;
        reason?: string;
      }> = [];

      for (const dayOfWeek of rules.timeRules.workingDays) {
        for (let period = 1; period <= rules.timeRules.dailyPeriods; period++) {
          // 检查当前时间段是否有冲突
          const conflicts = await Schedule.find({
            $or: [
              { semester: schedule.semester, dayOfWeek, period, teacher: schedule.teacher, status: 'active' },
              { semester: schedule.semester, dayOfWeek, period, class: schedule.class, status: 'active' },
              { semester: schedule.semester, dayOfWeek, period, room: schedule.room, status: 'active' }
            ]
          }).populate('class course teacher room');

          // 排除当前课程本身
          const filteredConflicts = conflicts.filter(
            (conflict: ISchedule) => (conflict._id as mongoose.Types.ObjectId).toString() !== scheduleId
          );

          availableSlots.push({
            dayOfWeek,
            period,
            conflicts: filteredConflicts,
            canMove: filteredConflicts.length === 0,
            reason: filteredConflicts.length > 0 ? '存在时间冲突' : undefined
          });
        }
      }

      res.json({
        success: true,
        data: {
          schedule: schedule,
          availableSlots: availableSlots,
          totalSlots: availableSlots.length,
          availableCount: availableSlots.filter(slot => slot.canMove).length
        }
      });

    } catch (error) {
      console.error('获取可用时间段失败:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : '未知错误'
      });
    }
  }

  /**
   * 执行课程移动操作
   * 
   * Args:
   *   schedule: 要移动的课程安排
   *   targetTimeSlot: 目标时间段
   *   targetRoomId: 目标教室ID（可选）
   *   rules: 排课规则
   *   forceMove: 是否强制移动
   * 
   * Returns:
   *   Promise<SchedulingOperationResult>: 操作结果
   */
  private static async performMoveCourse(
    schedule: ISchedule,
    targetTimeSlot: { dayOfWeek: number; period: number },
    targetRoomId: string | undefined,
    rules: any,
    forceMove: boolean
  ): Promise<SchedulingOperationResult> {
    
    // 创建约束检测器
    const detector = new ConstraintDetector(rules);

    // 构建新的课程分配
    const newAssignment: CourseAssignment = {
      variableId: (schedule._id as mongoose.Types.ObjectId).toString(),
      classId: schedule.class as mongoose.Types.ObjectId,
      courseId: schedule.course as mongoose.Types.ObjectId,
      teacherId: schedule.teacher as mongoose.Types.ObjectId,
      roomId: targetRoomId ? new mongoose.Types.ObjectId(targetRoomId) : schedule.room as mongoose.Types.ObjectId,
      timeSlot: {
        dayOfWeek: targetTimeSlot.dayOfWeek,
        period: targetTimeSlot.period
      },
      isFixed: false
    };

    // 获取当前学期所有的课程安排
    const existingSchedules = await Schedule.find({
      semester: schedule.semester,
      academicYear: schedule.academicYear,
      status: 'active',
      _id: { $ne: schedule._id } // 排除当前课程
    }).populate('class course teacher room');

    // 转换为CourseAssignment格式
    const existingAssignments = new Map<string, CourseAssignment>();
    existingSchedules.forEach(s => {
      existingAssignments.set((s._id as mongoose.Types.ObjectId).toString(), {
        variableId: (s._id as mongoose.Types.ObjectId).toString(),
        classId: s.class as mongoose.Types.ObjectId,
        courseId: s.course as mongoose.Types.ObjectId,
        teacherId: s.teacher as mongoose.Types.ObjectId,
        roomId: s.room as mongoose.Types.ObjectId,
        timeSlot: {
          dayOfWeek: s.dayOfWeek,
          period: s.period
        },
        isFixed: false
      });
    });

    // 检测所有冲突
    const conflicts = await detector.checkAllConflicts(newAssignment, existingAssignments);
    const hardConflicts = conflicts.filter(c => c.severity === 'critical');

    // 如果有硬冲突且不强制移动，返回失败
    if (hardConflicts.length > 0 && !forceMove) {
      return {
        success: false,
        conflicts: hardConflicts,
        message: `移动失败：存在${hardConflicts.length}个硬约束冲突`,
        suggestions: hardConflicts.map(c => c.message)
      };
    }

    // 执行数据库更新
    try {
      await mongoose.connection.transaction(async (session) => {
        // 更新课程安排
        await Schedule.findByIdAndUpdate(
          schedule._id,
          {
            dayOfWeek: targetTimeSlot.dayOfWeek,
            period: targetTimeSlot.period,
            room: newAssignment.roomId,
            updatedAt: new Date()
          },
          { session }
        );
      });

      // 返回成功结果
      const updatedSchedule = await Schedule.findById(schedule._id).populate('class course teacher room');
      
      return {
        success: true,
        message: '课程移动成功',
        affectedSchedules: [updatedSchedule!],
        conflicts: conflicts.filter(c => c.severity !== 'critical'),
        violations: [] // TODO: 实现软约束检测
      };

    } catch (error) {
      return {
        success: false,
        message: `数据库更新失败: ${error instanceof Error ? error.message : '未知错误'}`
      };
    }
  }

  /**
   * 执行课程交换操作
   * 
   * Args:
   *   schedule1: 第一个课程安排
   *   schedule2: 第二个课程安排
   *   rules: 排课规则
   *   swapRooms: 是否交换教室
   *   forceSwap: 是否强制交换
   * 
   * Returns:
   *   Promise<SchedulingOperationResult>: 操作结果
   */
  private static async performSwapCourses(
    schedule1: ISchedule,
    schedule2: ISchedule,
    rules: any,
    swapRooms: boolean,
    forceSwap: boolean
  ): Promise<SchedulingOperationResult> {
    
    // 创建约束检测器
    const detector = new ConstraintDetector(rules);

    // 构建交换后的课程分配
    const newAssignment1: CourseAssignment = {
      variableId: (schedule1._id as mongoose.Types.ObjectId).toString(),
      classId: schedule1.class as mongoose.Types.ObjectId,
      courseId: schedule1.course as mongoose.Types.ObjectId,
      teacherId: schedule1.teacher as mongoose.Types.ObjectId,
      roomId: swapRooms ? schedule2.room as mongoose.Types.ObjectId : schedule1.room as mongoose.Types.ObjectId,
      timeSlot: {
        dayOfWeek: schedule2.dayOfWeek,
        period: schedule2.period
      },
      isFixed: false
    };

    const newAssignment2: CourseAssignment = {
      variableId: (schedule2._id as mongoose.Types.ObjectId).toString(),
      classId: schedule2.class as mongoose.Types.ObjectId,
      courseId: schedule2.course as mongoose.Types.ObjectId,
      teacherId: schedule2.teacher as mongoose.Types.ObjectId,
      roomId: swapRooms ? schedule1.room as mongoose.Types.ObjectId : schedule2.room as mongoose.Types.ObjectId,
      timeSlot: {
        dayOfWeek: schedule1.dayOfWeek,
        period: schedule1.period
      },
      isFixed: false
    };

    // 获取其他课程安排（排除要交换的两个）
    const existingSchedules = await Schedule.find({
      semester: schedule1.semester,
      academicYear: schedule1.academicYear,
      status: 'active',
      _id: { $nin: [schedule1._id, schedule2._id] }
    }).populate('class course teacher room');

    // 转换为CourseAssignment格式
    const existingAssignments = new Map<string, CourseAssignment>();
    existingSchedules.forEach(s => {
      existingAssignments.set((s._id as mongoose.Types.ObjectId).toString(), {
        variableId: (s._id as mongoose.Types.ObjectId).toString(),
        classId: s.class as mongoose.Types.ObjectId,
        courseId: s.course as mongoose.Types.ObjectId,
        teacherId: s.teacher as mongoose.Types.ObjectId,
        roomId: s.room as mongoose.Types.ObjectId,
        timeSlot: {
          dayOfWeek: s.dayOfWeek,
          period: s.period
        },
        isFixed: false
      });
    });

    // 检测交换后的冲突
    const conflicts1 = await detector.checkAllConflicts(newAssignment1, existingAssignments);
    const conflicts2 = await detector.checkAllConflicts(newAssignment2, existingAssignments);
    
    const allConflicts = [...conflicts1, ...conflicts2];
    const hardConflicts = allConflicts.filter(c => c.severity === 'critical');

    // 如果有硬冲突且不强制交换，返回失败
    if (hardConflicts.length > 0 && !forceSwap) {
      return {
        success: false,
        conflicts: hardConflicts,
        message: `交换失败：存在${hardConflicts.length}个硬约束冲突`,
        suggestions: hardConflicts.map(c => c.message)
      };
    }

    // 执行数据库更新
    try {
      await mongoose.connection.transaction(async (session) => {
        // 交换两个课程的时间和教室
        await Promise.all([
          Schedule.findByIdAndUpdate(
            schedule1._id,
            {
              dayOfWeek: schedule2.dayOfWeek,
              period: schedule2.period,
              room: swapRooms ? schedule2.room : schedule1.room,
              updatedAt: new Date()
            },
            { session }
          ),
          Schedule.findByIdAndUpdate(
            schedule2._id,
            {
              dayOfWeek: schedule1.dayOfWeek,
              period: schedule1.period,
              room: swapRooms ? schedule1.room : schedule2.room,
              updatedAt: new Date()
            },
            { session }
          )
        ]);
      });

      // 返回成功结果
      const [updatedSchedule1, updatedSchedule2] = await Promise.all([
        Schedule.findById(schedule1._id).populate('class course teacher room'),
        Schedule.findById(schedule2._id).populate('class course teacher room')
      ]);
      
      return {
        success: true,
        message: '课程交换成功',
        affectedSchedules: [updatedSchedule1!, updatedSchedule2!],
        conflicts: allConflicts.filter(c => c.severity !== 'critical'),
        violations: [] // TODO: 实现软约束检测
      };

    } catch (error) {
      return {
        success: false,
        message: `数据库更新失败: ${error instanceof Error ? error.message : '未知错误'}`
      };
    }
  }
} 