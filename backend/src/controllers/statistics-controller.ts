import { Request, Response } from 'express';
import { User } from '../models/User';
import { Teacher } from '../models/Teacher';
import { Class } from '../models/Class';
import { Course } from '../models/Course';
import { Room } from '../models/Room';

/**
 * 获取系统统计概览
 *
 * Args:
 *   req: Express请求对象
 *   res: Express响应对象
 *
 * Returns:
 *   统计数据JSON
 */
export const getOverview = async (req: Request, res: Response) => {
  try {
    const [userCount, teacherCount, classCount, courseCount, roomCount] = await Promise.all([
      User.countDocuments({}),
      Teacher.countDocuments({}),
      Class.countDocuments({}),
      Course.countDocuments({}),
      Room.countDocuments({})
    ]);
    res.json({
      success: true,
      data: {
        userCount,
        teacherCount,
        classCount,
        courseCount,
        roomCount
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: '统计数据获取失败', error: error.message });
  }
}; 