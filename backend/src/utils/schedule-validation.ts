/**
 * 排课验证工具函数
 * 
 * 提供课程安排相关的验证逻辑，确保数据完整性和业务规则一致性
 */

import { ICourse } from '../models/Course';
import { IRoom } from '../models/Room';

/**
 * 验证结果接口
 */
export interface ValidationResult {
  isValid: boolean;
  message?: string;
}

/**
 * 验证课程和教室的匹配关系
 * 
 * Args:
 *   course: 课程对象
 *   room: 教室对象
 * 
 * Returns:
 *   ValidationResult: 验证结果对象
 */
export function validateCourseRoomMatch(course: ICourse, room: IRoom): ValidationResult {
  const roomRequirements = course.roomRequirements;
  
  // 1. 如果课程指定了特定教室，必须匹配
  if (roomRequirements.specificRoom && 
      roomRequirements.specificRoom.toString() !== (room._id as any).toString()) {
    return {
      isValid: false,
      message: '课程要求使用特定教室，与指定教室不匹配'
    };
  }

  // 2. 验证教室类型匹配
  if (roomRequirements.types.length > 0 && 
      !roomRequirements.types.includes(room.type)) {
    return {
      isValid: false,
      message: `课程要求教室类型：${roomRequirements.types.join('、')}，但指定教室类型为：${room.type}`
    };
  }

  // 3. 验证教室容量
  if (roomRequirements.capacity && room.capacity < roomRequirements.capacity) {
    return {
      isValid: false,
      message: `课程要求教室容量：${roomRequirements.capacity}，但指定教室容量为：${room.capacity}`
    };
  }

  // 4. 验证设备要求
  if (roomRequirements.equipment && roomRequirements.equipment.length > 0) {
    const missingEquipment = roomRequirements.equipment.filter(
      eq => !room.equipment.includes(eq)
    );
    if (missingEquipment.length > 0) {
      return {
        isValid: false,
        message: `教室缺少必需设备：${missingEquipment.join('、')}`
      };
    }
  }

  return { isValid: true };
}

/**
 * 根据课程要求查找匹配的教室
 * 
 * Args:
 *   course: 课程对象
 *   availableRooms: 可用教室列表
 * 
 * Returns:
 *   IRoom[]: 匹配的教室列表
 */
export function findMatchingRooms(course: ICourse, availableRooms: IRoom[]): IRoom[] {
  return availableRooms.filter(room => {
    const validation = validateCourseRoomMatch(course, room);
    return validation.isValid;
  });
}

/**
 * 验证教师是否能够教授指定课程
 * 
 * Args:
 *   teacher: 教师对象
 *   course: 课程对象
 * 
 * Returns:
 *   ValidationResult: 验证结果对象
 */
export function validateTeacherCourseMatch(teacher: any, course: ICourse): ValidationResult {
  // 检查教师的教授科目是否包含课程学科
  if (!teacher.subjects || !teacher.subjects.includes(course.subject)) {
    return {
      isValid: false,
      message: `教师不能教授${course.subject}学科`
    };
  }

  return { isValid: true };
}

/**
 * 验证班级容量与教室容量的匹配
 * 
 * Args:
 *   classInfo: 班级对象
 *   room: 教室对象
 * 
 * Returns:
 *   ValidationResult: 验证结果对象
 */
export function validateClassRoomCapacity(classInfo: any, room: IRoom): ValidationResult {
  if (classInfo.studentCount > room.capacity) {
    return {
      isValid: false,
      message: `班级学生数量（${classInfo.studentCount}人）超出教室容量（${room.capacity}人）`
    };
  }

  return { isValid: true };
} 