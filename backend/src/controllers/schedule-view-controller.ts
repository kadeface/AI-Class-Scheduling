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
  classId: string; // 班级ID字段
  className: string; // 班级名称字段
  roomId: string;
  roomName: string;
  duration: number;
  notes?: string;
  isConsecutiveContinuation?: boolean; // 标记是否为连排课程的延续部分
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

    // 填充课程数据 - 添加安全的空值检查
    let totalHours = 0;
    schedules.forEach(schedule => {
      // 安全访问关联对象属性
      const course = schedule.course as any;
      const teacher = schedule.teacher as any;
      const room = schedule.room as any;

      const courseSlot: CourseSlot = {
        courseId: course?._id?.toString() || '',
        courseName: course?.name || '未知课程',
        subject: course?.subject || '未知科目',
        teacherId: teacher?._id?.toString() || '',
        teacherName: teacher?.name || '未知教师',
        classId: classId, // 使用传入的班级ID
        className: classInfo.name, // 使用班级名称
        roomId: room?._id?.toString() || '',
        roomName: room?.name || '未知教室',
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

    // 填充课程数据 - 添加安全的空值检查
    let totalHours = 0;
    schedules.forEach(schedule => {
      // 安全访问关联对象属性
      const course = schedule.course as any;
      const classInfo = schedule.class as any;
      const room = schedule.room as any;

      const courseSlot: CourseSlot = {
        courseId: course?._id?.toString() || '',
        courseName: course?.name || '未知课程', // 只显示课程名称
        subject: course?.subject || '未知科目',
        teacherId: schedule.teacher._id?.toString() || '',
        teacherName: teacherInfo.name,
        classId: classInfo?._id?.toString() || '', // 班级ID
        className: classInfo?.name || '未知班级', // 班级名称
        roomId: room?._id?.toString() || '',
        roomName: room?.name || '未知教室',
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

    // 填充课程数据 - 添加安全的空值检查
    let totalHours = 0;
    schedules.forEach(schedule => {
      // 安全访问关联对象属性
      const course = schedule.course as any;
      const teacher = schedule.teacher as any;
      const classInfo = schedule.class as any;

      const courseSlot: CourseSlot = {
        courseId: course?._id?.toString() || '',
        courseName: course?.name || '未知课程', // 只显示课程名称
        subject: course?.subject || '未知科目',
        teacherId: teacher?._id?.toString() || '',
        teacherName: teacher?.name || '未知教师',
        classId: classInfo?._id?.toString() || '', // 班级ID
        className: classInfo?.name || '未知班级', // 班级名称
        roomId: schedule.room._id?.toString() || '',
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
          currentSlot.teacherId === nextSlot.teacherId &&
          currentSlot.classId === nextSlot.classId) { // 添加班级检查
        
        // 合并为连排课程
        currentSlot.duration = 2;
        
        // 在第二节课位置创建连排延续标识
        weekSchedule[day][period + 1] = {
          ...currentSlot,
          isConsecutiveContinuation: true, // 标记为连排延续
          duration: 0 // 延续部分不计算时长
        };
      }
    }
  }
} 

/**
 * 获取有课表的教师列表（优化版本）
 * 直接从schedules表筛选，避免逐个查询
 * 
 * @param req Express请求对象
 * @param res Express响应对象
 */
export async function getTeachersWithSchedules(req: Request, res: Response): Promise<void> {
  try {
    const { academicYear = '2025-2026', semester = '1' } = req.query;
    const semesterKey = `${academicYear}-${semester}`;

    console.log(`开始查询学期 ${semesterKey} 有课表的教师...`);

    // 直接从schedules表查询有课的教师ID
    const teacherIds = await Schedule.distinct('teacher', {
      semester: semesterKey,
      status: 'active'
    });

    console.log(`找到 ${teacherIds.length} 个有课的教师ID`);

    if (teacherIds.length === 0) {
      res.json({
        success: true,
        data: [],
        message: '该学期没有找到有课表的教师'
      });
      return;
    }

    // 获取教师详细信息
    const teachers = await Teacher.find({
      _id: { $in: teacherIds }
    }).select('_id name');

    console.log(`成功获取 ${teachers.length} 个教师信息`);

    // 统计每个教师的课程数量
    const teacherCourseCounts = await Schedule.aggregate([
      {
        $match: {
          semester: semesterKey,
          status: 'active'
        }
      },
      {
        $group: {
          _id: '$teacher',
          courseCount: { $sum: 1 }
        }
      }
    ]);

    console.log(`统计完成，教师课程数量:`, teacherCourseCounts);

    // 合并教师信息和课程数量
    const teachersWithCounts = teachers.map((teacher: any) => {
      const countInfo = teacherCourseCounts.find((t: any) => t._id.toString() === teacher._id.toString());
      return {
        id: teacher._id,
        name: teacher.name,
        type: 'teacher' as const,
        courseCount: countInfo?.courseCount || 0
      };
    });

    // 按课程数量排序（课程多的排在前面）
    teachersWithCounts.sort((a, b) => b.courseCount - a.courseCount);

    console.log(`返回 ${teachersWithCounts.length} 个有课教师，按课程数量排序`);

    res.json({
      success: true,
      data: teachersWithCounts,
      message: `成功获取 ${teachersWithCounts.length} 个有课表的教师`
    });

  } catch (error) {
    console.error('获取有课表的教师列表失败:', error);
    res.status(500).json({
      success: false,
      message: '获取有课表的教师列表失败',
      error: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
    });
  }
} 

/**
 * 获取可用的学年学期列表
 * 从数据库动态获取，避免硬编码
 * 
 * @param req Express请求对象
 * @param res Express响应对象
 */
export async function getAvailableAcademicPeriods(req: Request, res: Response): Promise<void> {
  try {
    console.log('开始获取可用的学年学期列表...');

    // 从schedules表获取所有可用的学期
    const semesters = await Schedule.distinct('semester', { status: 'active' });
    
    // 从schedules表获取所有可用的学年
    const academicYears = await Schedule.distinct('academicYear', { status: 'active' });

    console.log(`找到 ${semesters.length} 个学期，${academicYears.length} 个学年`);

    if (semesters.length === 0) {
      res.json({
        success: true,
        data: [],
        message: '没有找到可用的学年学期数据'
      });
      return;
    }

    // 解析学期数据，提取学年和学期信息
    const periods = semesters.map(semester => {
      // 处理 "2025-2026-1" 格式，提取学年和学期
      const parts = semester.split('-');
      let academicYear, semesterNumber;
      
      if (parts.length === 3) {
        // 格式: "2025-2026-1" -> 学年: "2025-2026", 学期: "1"
        academicYear = `${parts[0]}-${parts[1]}`;
        semesterNumber = parts[2];
      } else if (parts.length === 2) {
        // 格式: "2025-1" -> 学年: "2025", 学期: "1"
        academicYear = parts[0];
        semesterNumber = parts[1];
      } else {
        // 其他格式，使用原始值
        academicYear = semester;
        semesterNumber = '1';
      }
      
      return {
        semester: semester,
        academicYear: academicYear,
        semesterNumber: semesterNumber,
        displayName: `${academicYear}学年第${semesterNumber}学期`
      };
    });

    // 按学年和学期排序
    periods.sort((a, b) => {
      if (a.academicYear !== b.academicYear) {
        return b.academicYear.localeCompare(a.academicYear); // 学年降序
      }
      return parseInt(a.semesterNumber) - parseInt(b.semesterNumber); // 学期升序
    });

    // 获取当前活跃的学年学期（数据最多的）
    const semesterStats = await Schedule.aggregate([
      {
        $match: { status: 'active' }
      },
      {
        $group: {
          _id: '$semester',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);

    const currentPeriod = semesterStats.length > 0 ? semesterStats[0]._id : null;

    console.log(`当前活跃学期: ${currentPeriod}, 可用学期数量: ${periods.length}`);

    res.json({
      success: true,
      data: {
        periods,
        currentPeriod,
        academicYears: academicYears.sort().reverse() // 学年降序
      },
      message: `成功获取 ${periods.length} 个可用的学年学期`
    });

  } catch (error) {
    console.error('获取可用学年学期列表失败:', error);
    res.status(500).json({
      success: false,
      message: '获取可用学年学期列表失败',
      error: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
    });
  }
} 