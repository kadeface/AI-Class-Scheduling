/**
 * 数据库初始化脚本
 * 
 * 创建示例数据，包括教师、班级、课程、教室等基础数据
 */

import mongoose from 'mongoose';
import { connectDatabase, disconnectDatabase } from '../config/database';
import { 
  User, Teacher, Class, Course, Room, Schedule,
  IUser, ITeacher, IClass, ICourse, IRoom
} from '../models';

/**
 * 创建示例教师数据
 */
async function createSampleTeachers(): Promise<void> {
  console.log('📚 创建示例教师数据...');
  
  const teachers = [
    {
      name: '张三',
      employeeId: 'T001',
      subjects: ['数学'],
      maxWeeklyHours: 18,
      unavailableSlots: [{
        dayOfWeek: 2, // 周二
        periods: [7, 8] // 第7,8节
      }],
      preferences: {
        preferMorning: true,
        maxContinuousHours: 3
      }
    },
    {
      name: '李四',
      employeeId: 'T002',
      subjects: ['语文'],
      maxWeeklyHours: 16,
      unavailableSlots: [],
      preferences: {
        avoidFridayAfternoon: true,
        maxContinuousHours: 2
      }
    },
    {
      name: '王五',
      employeeId: 'T003',
      subjects: ['英语'],
      maxWeeklyHours: 20,
      unavailableSlots: [],
      preferences: {
        maxContinuousHours: 4
      }
    }
  ];
  
  await Teacher.insertMany(teachers);
  console.log(`✅ 创建了 ${teachers.length} 个教师`);
}