/**
 * 课表查看控制器
 * 
 * 提供课表展示相关的API接口，支持班级、教师、教室等多种视图
 */

import { Request, Response } from 'express';
import { Schedule } from '../models/Schedule';
import { Class } from '../models/Class';
import { Teacher } from '../models/Teacher';
import { Room } from '../models/Room';
import { Course } from '../models/Course';

/**
 * 课程时段接口定义
 */
interface CourseSlot {
  courseId: string;
  courseName: string;
  subject: string;
  teacherId: string;
  teacherName: string;
  roomId: string;
  roomName: string;
  duration: number;
  notes?: string;
}

/**
 * 周课表接口定义
 */
interface WeekSchedule {
  [dayOfWeek: number]: {
    [period: number]: CourseSlot | null;
  };
}

/**
 * 课表数据接口
 */
interface ScheduleViewData {
  id: string;
  type: 'class' | 'teacher' | 'room';
  targetId: string;
  targetName: string;
  academicYear: string;
  semester: string;
  weekSchedule: WeekSchedule;
  metadata: {
    totalCourses: number;
    totalHours: number;
    conflicts: number;
    lastUpdated: Date;
  };
}

/**
 * 获取班级课表
 * 
 * @param req Express请求对象
 * @param res Express响应对象
 */
export async function getClassSchedule(req: Request, res: Response): Promise<void> {
  try {
    const { classId } = req.params;
    const { academicYear = '2024-2025', semester = '1' } = req.query;

    // 验证班级是否存在
    const classInfo = await Class.findById(classId);
    if (!classInfo) {
      res.status(404).json({
        success: false,
        message: '班级不存在'
      });
      return;
    }

    // 构建学期标识
    const semesterKey = `${academicYear}-${semester}`;

    // 查询该班级的所有课程安排
    const schedules = await Schedule.find({
      class: classId,
      semester: semesterKey,
      status: 'active'
    })
    .populate('course', 'name subject')
    .populate('teacher', 'name')
    .populate('room', 'name roomNumber')
    .sort({ dayOfWeek: 1, period: 1 });

    // 转换为前端所需的数据格式
    const weekSchedule: WeekSchedule = {};
    
    // 初始化5天×8节的空课表
    for (let day = 1; day <= 5; day++) {
      weekSchedule[day] = {};
      for (let period = 1; period <= 8; period++) {
        weekSchedule[day][period] = null;
      }
    }

    // 填充课程数据
    let totalHours = 0;
    schedules.forEach(schedule => {
      const courseSlot: CourseSlot = {
        courseId: schedule.course._id.toString(),
        courseName: (schedule.course as any).name,
        subject: (schedule.course as any).subject,
        teacherId: schedule.teacher._id.toString(),
        teacherName: (schedule.teacher as any).name,
        roomId: schedule.room._id.toString(),
        roomName: (schedule.room as any).name,
        duration: 1, // 基础时长，后续处理连排
        notes: schedule.notes
      };

      weekSchedule[schedule.dayOfWeek][schedule.period] = courseSlot;
      totalHours++;
    });

    // 处理连排课程
    processConsecutiveCourses(weekSchedule);

    // 构建响应数据
    const scheduleData: ScheduleViewData = {
      id: `class-${classId}`,
      type: 'class',
      targetId: classId,
      targetName: classInfo.name,
      academicYear: academicYear as string,
      semester: semester as string,
      weekSchedule,
      metadata: {
        totalCourses: schedules.length,
        totalHours,
        conflicts: 0, // TODO: 实现冲突检测
        lastUpdated: new Date()
      }
    };

    res.json({
      success: true,
      data: scheduleData
    });

  } catch (error) {
    console.error('获取班级课表失败:', error);
    res.status(500).json({
      success: false,
      message: '获取班级课表失败',
      error: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
    });
  }
}

/**
 * 获取教师课表
 * 
 * @param req Express请求对象
 * @param res Express响应对象
 */
export async function getTeacherSchedule(req: Request, res: Response): Promise<void> {
  try {
    const { teacherId } = req.params;
    const { academicYear = '2024-2025', semester = '1' } = req.query;

    // 验证教师是否存在
    const teacherInfo = await Teacher.findById(teacherId);
    if (!teacherInfo) {
      res.status(404).json({
        success: false,
        message: '教师不存在'
      });
      return;
    }

    // 构建学期标识
    const semesterKey = `${academicYear}-${semester}`;

    // 查询该教师的所有课程安排
    const schedules = await Schedule.find({
      teacher: teacherId,
      semester: semesterKey,
      status: 'active'
    })
    .populate('course', 'name subject')
    .populate('class', 'name')
    .populate('room', 'name roomNumber')
    .sort({ dayOfWeek: 1, period: 1 });

    // 转换为前端所需的数据格式
    const weekSchedule: WeekSchedule = {};
    
    // 初始化5天×8节的空课表
    for (let day = 1; day <= 5; day++) {
      weekSchedule[day] = {};
      for (let period = 1; period <= 8; period++) {
        weekSchedule[day][period] = null;
      }
    }

    // 填充课程数据
    let totalHours = 0;
    schedules.forEach(schedule => {
      const courseSlot: CourseSlot = {
        courseId: schedule.course._id.toString(),
        courseName: `${(schedule.course as any).name} - ${(schedule.class as any).name}`,
        subject: (schedule.course as any).subject,
        teacherId: schedule.teacher._id.toString(),
        teacherName: teacherInfo.name,
        roomId: schedule.room._id.toString(),
        roomName: (schedule.room as any).name,
        duration: 1,
        notes: schedule.notes
      };

      weekSchedule[schedule.dayOfWeek][schedule.period] = courseSlot;
      totalHours++;
    });

    // 处理连排课程
    processConsecutiveCourses(weekSchedule);

    // 构建响应数据
    const scheduleData: ScheduleViewData = {
      id: `teacher-${teacherId}`,
      type: 'teacher',
      targetId: teacherId,
      targetName: teacherInfo.name,
      academicYear: academicYear as string,
      semester: semester as string,
      weekSchedule,
      metadata: {
        totalCourses: schedules.length,
        totalHours,
        conflicts: 0,
        lastUpdated: new Date()
      }
    };

    res.json({
      success: true,
      data: scheduleData
    });

  } catch (error) {
    console.error('获取教师课表失败:', error);
    res.status(500).json({
      success: false,
      message: '获取教师课表失败',
      error: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
    });
  }
}

/**
 * 获取教室课表
 * 
 * @param req Express请求对象
 * @param res Express响应对象
 */
export async function getRoomSchedule(req: Request, res: Response): Promise<void> {
  try {
    const { roomId } = req.params;
    const { academicYear = '2024-2025', semester = '1' } = req.query;

    // 验证教室是否存在
    const roomInfo = await Room.findById(roomId);
    if (!roomInfo) {
      res.status(404).json({
        success: false,
        message: '教室不存在'
      });
      return;
    }

    // 构建学期标识
    const semesterKey = `${academicYear}-${semester}`;

    // 查询该教室的所有课程安排
    const schedules = await Schedule.find({
      room: roomId,
      semester: semesterKey,
      status: 'active'
    })
    .populate('course', 'name subject')
    .populate('teacher', 'name')
    .populate('class', 'name')
    .sort({ dayOfWeek: 1, period: 1 });

    // 转换为前端所需的数据格式
    const weekSchedule: WeekSchedule = {};
    
    // 初始化5天×8节的空课表
    for (let day = 1; day <= 5; day++) {
      weekSchedule[day] = {};
      for (let period = 1; period <= 8; period++) {
        weekSchedule[day][period] = null;
      }
    }

    // 填充课程数据
    let totalHours = 0;
    schedules.forEach(schedule => {
      const courseSlot: CourseSlot = {
        courseId: schedule.course._id.toString(),
        courseName: `${(schedule.course as any).name} - ${(schedule.class as any).name}`,
        subject: (schedule.course as any).subject,
        teacherId: schedule.teacher._id.toString(),
        teacherName: (schedule.teacher as any).name,
        roomId: schedule.room._id.toString(),
        roomName: roomInfo.name,
        duration: 1,
        notes: schedule.notes
      };

      weekSchedule[schedule.dayOfWeek][schedule.period] = courseSlot;
      totalHours++;
    });

    // 处理连排课程
    processConsecutiveCourses(weekSchedule);

    // 构建响应数据
    const scheduleData: ScheduleViewData = {
      id: `room-${roomId}`,
      type: 'room',
      targetId: roomId,
      targetName: roomInfo.name,
      academicYear: academicYear as string,
      semester: semester as string,
      weekSchedule,
      metadata: {
        totalCourses: schedules.length,
        totalHours,
        conflicts: 0,
        lastUpdated: new Date()
      }
    };

    res.json({
      success: true,
      data: scheduleData
    });

  } catch (error) {
    console.error('获取教室课表失败:', error);
    res.status(500).json({
      success: false,
      message: '获取教室课表失败',
      error: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
    });
  }
}

/**
 * 获取课表选项列表
 * 
 * @param req Express请求对象
 * @param res Express响应对象
 */
export async function getScheduleOptions(req: Request, res: Response): Promise<void> {
  try {
    const { type } = req.params; // 'classes', 'teachers', 'rooms'

    let options: any[] = [];

    switch (type) {
      case 'classes':
        options = await Class.find({ isActive: true })
          .select('_id name grade')
          .sort({ grade: 1, name: 1 });
        break;

      case 'teachers':
        options = await Teacher.find({ isActive: true })
          .select('_id name subjects')
          .sort({ name: 1 });
        break;

      case 'rooms':
        options = await Room.find({ isActive: true })
          .select('_id name roomNumber type')
          .sort({ type: 1, roomNumber: 1 });
        break;

      default:
        res.status(400).json({
          success: false,
          message: '无效的选项类型，支持: classes, teachers, rooms'
        });
        return;
    }

    res.json({
      success: true,
      data: options
    });

  } catch (error) {
    console.error('获取课表选项失败:', error);
    res.status(500).json({
      success: false,
      message: '获取课表选项失败',
      error: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
    });
  }
}

/**
 * 处理连排课程的持续时长
 * 
 * @param weekSchedule 周课表数据
 */
function processConsecutiveCourses(weekSchedule: WeekSchedule): void {
  for (let day = 1; day <= 5; day++) {
    for (let period = 1; period <= 7; period++) {
      const currentSlot = weekSchedule[day][period];
      const nextSlot = weekSchedule[day][period + 1];

      // 如果当前节次和下一节次是同一门课程（同一教师、同一班级）
      if (currentSlot && nextSlot &&
          currentSlot.courseId === nextSlot.courseId &&
          currentSlot.teacherId === nextSlot.teacherId) {
        
        // 合并为连排课程
        currentSlot.duration = 2;
        weekSchedule[day][period + 1] = null; // 清空下一节次
      }
    }
  }
} 