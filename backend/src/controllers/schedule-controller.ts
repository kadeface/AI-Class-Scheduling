/**
 * 课程安排控制器
 * 
 * 处理课程安排的基础CRUD操作
 */

import { Request, Response } from 'express';
import { Schedule } from '../models/Schedule';
import { Course } from '../models/Course';
import { Room } from '../models/Room';
import { Class } from '../models/Class';
import { Teacher } from '../models/Teacher';
import { ApiResponse } from '../types/api';
import { 
  validateCourseRoomMatch, 
  validateTeacherCourseMatch, 
  validateClassRoomCapacity,
  findMatchingRooms
} from '../utils/schedule-validation';

export class ScheduleController {
  
  /**
   * 获取课程安排列表
   */
  static async getSchedules(req: Request, res: Response): Promise<void> {
    try {
      const { academicYear, semester, classId, teacherId, roomId, page = 1, limit = 100 } = req.query;
      
      // 构建查询条件
      const query: any = {};
      
      // 处理学年和学期参数
      if (academicYear) {
        query.academicYear = academicYear;
        // 如果同时提供了学期，构建完整的semester字段
        if (semester) {
          query.semester = `${academicYear}-${semester}`;
        }
      } else if (semester) {
        // 如果只提供了学期但没有学年，使用默认学年
        query.semester = `2024-2025-${semester}`;
      }
      
      if (classId) query.class = classId;
      if (teacherId) query.teacher = teacherId;
      if (roomId) query.room = roomId;
      
      // 查询课程安排
      const schedules = await Schedule.find(query)
        .populate('class', 'name grade')
        .populate('teacher', 'name subjects')
        .populate('room', 'name roomNumber type capacity')
        .populate('course', 'name subject weeklyHours roomRequirements')
        .sort({ dayOfWeek: 1, period: 1 })
        .lean();
      
      const response: ApiResponse = {
        success: true,
        message: '获取课程安排列表成功',
        data: schedules
      };
      
      res.json(response);
    } catch (error) {
      console.error('获取课程安排列表失败:', error);
      const response: ApiResponse = {
        success: false,
        message: '获取课程安排列表失败',
        error: error instanceof Error ? error.message : '未知错误'
      };
      res.status(500).json(response);
    }
  }
  
  /**
   * 获取单个课程安排详情
   */
  static async getSchedule(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      
      const schedule = await Schedule.findById(id)
        .populate('class', 'name grade')
        .populate('teacher', 'name subjects')
        .populate('room', 'name roomNumber type capacity')
        .populate('course', 'name subject weeklyHours roomRequirements')
        .lean();
      
      if (!schedule) {
        const response: ApiResponse = {
          success: false,
          message: '课程安排不存在'
        };
        res.status(404).json(response);
        return;
      }
      
      const response: ApiResponse = {
        success: true,
        message: '获取课程安排详情成功',
        data: schedule
      };
      
      res.json(response);
    } catch (error) {
      console.error('获取课程安排详情失败:', error);
      const response: ApiResponse = {
        success: false,
        message: '获取课程安排详情失败',
        error: error instanceof Error ? error.message : '未知错误'
      };
      res.status(500).json(response);
    }
  }
  
  /**
   * 创建新的课程安排
   * 
   * 包含完整的验证逻辑：
   * 1. 验证关联数据存在性
   * 2. 验证Course和Room的匹配关系
   * 3. 检查时间冲突
   */
  static async createSchedule(req: Request, res: Response): Promise<void> {
    try {
      const scheduleData = req.body;
      
      // 1. 验证关联数据是否存在且有效
      const [classInfo, teacher, room, course] = await Promise.all([
        Class.findById(scheduleData.class),
        Teacher.findById(scheduleData.teacher),
        Room.findById(scheduleData.room),
        Course.findById(scheduleData.course)
      ]);

      if (!classInfo || !classInfo.isActive) {
        const response: ApiResponse = {
          success: false,
          message: '指定的班级不存在或已停用'
        };
        res.status(400).json(response);
        return;
      }

      if (!teacher || !teacher.isActive) {
        const response: ApiResponse = {
          success: false,
          message: '指定的教师不存在或已停用'
        };
        res.status(400).json(response);
        return;
      }

      if (!room || !room.isActive) {
        const response: ApiResponse = {
          success: false,
          message: '指定的教室不存在或已停用'
        };
        res.status(400).json(response);
        return;
      }

      if (!course || !course.isActive) {
        const response: ApiResponse = {
          success: false,
          message: '指定的课程不存在或已停用'
        };
        res.status(400).json(response);
        return;
      }

      // 2. 验证Course和Room的匹配关系
      const courseRoomValidation = validateCourseRoomMatch(course, room);
      if (!courseRoomValidation.isValid) {
        const response: ApiResponse = {
          success: false,
          message: courseRoomValidation.message
        };
        res.status(400).json(response);
        return;
      }

      // 2.1 验证教师科目匹配
      const teacherCourseValidation = validateTeacherCourseMatch(teacher, course);
      if (!teacherCourseValidation.isValid) {
        const response: ApiResponse = {
          success: false,
          message: teacherCourseValidation.message
        };
        res.status(400).json(response);
        return;
      }

      // 2.2 验证班级容量匹配
      const classRoomValidation = validateClassRoomCapacity(classInfo, room);
      if (!classRoomValidation.isValid) {
        const response: ApiResponse = {
          success: false,
          message: classRoomValidation.message
        };
        res.status(400).json(response);
        return;
      }

      // 3. 检查时间冲突
      const conflictQuery = {
        semester: scheduleData.semester,
        dayOfWeek: scheduleData.dayOfWeek,
        period: scheduleData.period,
        status: 'active'
      };

      const [teacherConflict, classConflict, roomConflict] = await Promise.all([
        Schedule.findOne({ ...conflictQuery, teacher: scheduleData.teacher }),
        Schedule.findOne({ ...conflictQuery, class: scheduleData.class }),
        Schedule.findOne({ ...conflictQuery, room: scheduleData.room })
      ]);

      if (teacherConflict) {
        const response: ApiResponse = {
          success: false,
          message: '该时间段教师已有课程安排'
        };
        res.status(400).json(response);
        return;
      }

      if (classConflict) {
        const response: ApiResponse = {
          success: false,
          message: '该时间段班级已有课程安排'
        };
        res.status(400).json(response);
        return;
      }

      if (roomConflict) {
        const response: ApiResponse = {
          success: false,
          message: '该时间段教室已被占用'
        };
        res.status(400).json(response);
        return;
      }

      // 4. 创建课程安排
      const schedule = new Schedule(scheduleData);
      await schedule.save();
      
      // 5. 返回创建的课程安排（包含关联数据）
      const populatedSchedule = await Schedule.findById(schedule._id)
        .populate('class', 'name grade')
        .populate('teacher', 'name subjects')
        .populate('room', 'name roomNumber type capacity')
        .populate('course', 'name subject weeklyHours roomRequirements')
        .lean();
      
      const response: ApiResponse = {
        success: true,
        message: '创建课程安排成功',
        data: populatedSchedule
      };
      
      res.status(201).json(response);
    } catch (error) {
      console.error('创建课程安排失败:', error);
      const response: ApiResponse = {
        success: false,
        message: '创建课程安排失败',
        error: error instanceof Error ? error.message : '未知错误'
      };
      res.status(400).json(response);
    }
  }
  
  /**
   * 更新课程安排
   */
  static async updateSchedule(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const updateData = req.body;
      
      const updatedSchedule = await Schedule.findByIdAndUpdate(
        id,
        updateData,
        { new: true, runValidators: true }
      )
        .populate('class', 'name grade')
        .populate('teacher', 'name subjects')
        .populate('room', 'name roomNumber type capacity')
        .populate('course', 'name subject weeklyHours roomRequirements')
        .lean();
      
      if (!updatedSchedule) {
        const response: ApiResponse = {
          success: false,
          message: '课程安排不存在'
        };
        res.status(404).json(response);
        return;
      }
      
      const response: ApiResponse = {
        success: true,
        message: '更新课程安排成功',
        data: updatedSchedule
      };
      
      res.json(response);
    } catch (error) {
      console.error('更新课程安排失败:', error);
      const response: ApiResponse = {
        success: false,
        message: '更新课程安排失败',
        error: error instanceof Error ? error.message : '未知错误'
      };
      res.status(400).json(response);
    }
  }
  
  /**
   * 删除课程安排
   */
  static async deleteSchedule(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      
      const schedule = await Schedule.findByIdAndDelete(id);
      
      if (!schedule) {
        const response: ApiResponse = {
          success: false,
          message: '课程安排不存在'
        };
        res.status(404).json(response);
        return;
      }
      
      const response: ApiResponse = {
        success: true,
        message: '删除课程安排成功',
        data: { id }
      };
      
      res.json(response);
    } catch (error) {
      console.error('删除课程安排失败:', error);
      const response: ApiResponse = {
        success: false,
        message: '删除课程安排失败',
        error: error instanceof Error ? error.message : '未知错误'
      };
      res.status(500).json(response);
    }
  }

  /**
   * 获取与课程匹配的教室列表
   */
  static async getMatchingRooms(req: Request, res: Response): Promise<void> {
    try {
      const { courseId } = req.params;
      
      // 获取课程信息
      const course = await Course.findById(courseId);
      if (!course || !course.isActive) {
        const response: ApiResponse = {
          success: false,
          message: '课程不存在或已停用'
        };
        res.status(404).json(response);
        return;
      }

      // 获取所有活跃的教室
      const allRooms = await Room.find({ isActive: true }).lean();
      
      // 筛选匹配的教室
      const matchingRooms = findMatchingRooms(course, allRooms);
      
      const response: ApiResponse = {
        success: true,
        message: '获取匹配教室成功',
        data: {
          course: {
            _id: course._id,
            name: course.name,
            subject: course.subject,
            roomRequirements: course.roomRequirements
          },
          matchingRooms: matchingRooms.map(room => ({
            _id: room._id,
            name: room.name,
            roomNumber: room.roomNumber,
            type: room.type,
            capacity: room.capacity,
            building: room.building,
            floor: room.floor,
            equipment: room.equipment
          })),
          totalMatching: matchingRooms.length,
          totalAvailable: allRooms.length
        }
      };
      
      res.json(response);
    } catch (error) {
      console.error('获取匹配教室失败:', error);
      const response: ApiResponse = {
        success: false,
        message: '获取匹配教室失败',
        error: error instanceof Error ? error.message : '未知错误'
      };
      res.status(500).json(response);
    }
  }
} 