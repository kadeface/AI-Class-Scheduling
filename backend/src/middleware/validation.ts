/**
 * 请求数据验证中间件
 * 
 * 提供用户数据的验证功能，确保API请求数据的完整性和正确性
 */

import { Request, Response, NextFunction } from 'express';
import { ApiResponse } from '../types/api';
import { SUBJECTS } from '../constants/subjects';

/**
 * 验证用户创建请求数据
 * 
 * Args:
 *   req: Express请求对象
 *   res: Express响应对象  
 *   next: Express中间件下一步函数
 * 
 * Returns:
 *   void: 验证通过时调用next()，验证失败时返回错误响应
 */
export const validateCreateUser = (req: Request, res: Response, next: NextFunction): void => {
  const { username, password, role, profile } = req.body;
  const errors: string[] = [];

  // 验证用户名
  if (!username || typeof username !== 'string') {
    errors.push('用户名不能为空');
  } else if (username.trim().length < 3 || username.trim().length > 50) {
    errors.push('用户名长度必须在3-50个字符之间');
  }

  // 验证密码
  if (!password || typeof password !== 'string') {
    errors.push('密码不能为空');
  } else if (password.length < 6) {
    errors.push('密码长度至少6个字符');
  }

  // 验证角色
  if (!role || !['admin', 'staff', 'teacher'].includes(role)) {
    errors.push('用户角色必须是 admin、staff 或 teacher');
  }  // 验证个人信息
  if (!profile || typeof profile !== 'object') {
    errors.push('个人信息不能为空');
  } else {
    if (!profile.name || typeof profile.name !== 'string' || profile.name.trim().length === 0) {
      errors.push('姓名不能为空');
    } else if (profile.name.trim().length > 50) {
      errors.push('姓名不能超过50个字符');
    }

    // 验证邮箱格式（如果提供）
    if (profile.email && !/^\S+@\S+\.\S+$/.test(profile.email)) {
      errors.push('邮箱格式不正确');
    }

    // 验证手机号格式（如果提供）
    if (profile.phone && !/^1[3-9]\d{9}$/.test(profile.phone)) {
      errors.push('手机号格式不正确');
    }

    // 验证工号长度（如果提供）
    if (profile.employeeId && profile.employeeId.length > 20) {
      errors.push('工号不能超过20个字符');
    }

    // 验证部门名称长度（如果提供）
    if (profile.department && profile.department.length > 100) {
      errors.push('部门名称不能超过100个字符');
    }
  }

  if (errors.length > 0) {
    const response: ApiResponse = {
      success: false,
      message: '数据验证失败',
      error: errors.join('; ')
    };
    res.status(400).json(response);
    return;
  }

  next();
};

/**
 * 验证用户更新请求数据
 * 
 * Args:
 *   req: Express请求对象
 *   res: Express响应对象
 *   next: Express中间件下一步函数
 * 
 * Returns:
 *   void: 验证通过时调用next()，验证失败时返回错误响应
 */
export const validateUpdateUser = (req: Request, res: Response, next: NextFunction): void => {
  const { username, role, profile, isActive } = req.body;
  const errors: string[] = [];

  // 验证用户名（如果提供）
  if (username !== undefined) {
    if (typeof username !== 'string') {
      errors.push('用户名格式不正确');
    } else if (username.trim().length < 3 || username.trim().length > 50) {
      errors.push('用户名长度必须在3-50个字符之间');
    }
  }

  // 验证角色（如果提供）
  if (role !== undefined && !['admin', 'staff', 'teacher'].includes(role)) {
    errors.push('用户角色必须是 admin、staff 或 teacher');
  }

  // 验证状态（如果提供）
  if (isActive !== undefined && typeof isActive !== 'boolean') {
    errors.push('用户状态必须是布尔值');
  }

  // 验证个人信息（如果提供）
  if (profile !== undefined) {
    if (typeof profile !== 'object' || profile === null) {
      errors.push('个人信息格式不正确');
    } else {
      // 验证姓名（如果提供）
      if (profile.name !== undefined) {
        if (typeof profile.name !== 'string' || profile.name.trim().length === 0) {
          errors.push('姓名不能为空');
        } else if (profile.name.trim().length > 50) {
          errors.push('姓名不能超过50个字符');
        }
      }

      // 验证邮箱格式（如果提供）
      if (profile.email !== undefined && profile.email && !/^\S+@\S+\.\S+$/.test(profile.email)) {
        errors.push('邮箱格式不正确');
      }

      // 验证手机号格式（如果提供）
      if (profile.phone !== undefined && profile.phone && !/^1[3-9]\d{9}$/.test(profile.phone)) {
        errors.push('手机号格式不正确');
      }

      // 验证工号长度（如果提供）
      if (profile.employeeId !== undefined && profile.employeeId && profile.employeeId.length > 20) {
        errors.push('工号不能超过20个字符');
      }

      // 验证部门名称长度（如果提供）
      if (profile.department !== undefined && profile.department && profile.department.length > 100) {
        errors.push('部门名称不能超过100个字符');
      }
    }
  }

  if (errors.length > 0) {
    const response: ApiResponse = {
      success: false,
      message: '数据验证失败',
      error: errors.join('; ')
    };
    res.status(400).json(response);
    return;
  }

  next();
};

/**
 * 验证MongoDB ObjectId格式
 * 
 * Args:
 *   req: Express请求对象
 *   res: Express响应对象
 *   next: Express中间件下一步函数
 * 
 * Returns:
 *   void: 验证通过时调用next()，验证失败时返回错误响应
 */
export const validateObjectId = (req: Request, res: Response, next: NextFunction): void => {
  const { id } = req.params;
  
  if (!id || !/^[0-9a-fA-F]{24}$/.test(id)) {
    const response: ApiResponse = {
      success: false,
      message: 'ID格式不正确',
      error: '请提供有效的资源ID'
    };
    res.status(400).json(response);
    return;
  }

  next();
};

// ==================== 教师验证中间件 ====================

/**
 * 验证教师创建请求数据
 * 
 * Args:
 *   req: Express请求对象
 *   res: Express响应对象
 *   next: Express中间件下一步函数
 * 
 * Returns:
 *   void: 验证通过时调用next()，验证失败时返回错误响应
 */
export const validateCreateTeacher = (req: Request, res: Response, next: NextFunction): void => {
  const { name, employeeId, subjects, maxWeeklyHours, unavailableSlots, preferences } = req.body;
  const errors: string[] = [];

  // 验证姓名
  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    errors.push('教师姓名不能为空');
  } else if (name.trim().length > 50) {
    errors.push('教师姓名不能超过50个字符');
  }

  // 验证工号
  if (!employeeId || typeof employeeId !== 'string' || employeeId.trim().length === 0) {
    errors.push('工号不能为空');
  } else if (employeeId.trim().length > 20) {
    errors.push('工号不能超过20个字符');
  }

  // 验证任教学科
  if (!subjects || !Array.isArray(subjects) || subjects.length === 0) {
    errors.push('任教学科不能为空');
  } else {
    for (const subject of subjects) {
      if (typeof subject !== 'string' || subject.trim().length === 0) {
        errors.push('学科名称不能为空');
        break;
      } else if (subject.trim().length > 50) {
        errors.push('学科名称不能超过50个字符');
        break;
      }
    }
  }

  // 验证周最大课时
  if (maxWeeklyHours === undefined || typeof maxWeeklyHours !== 'number') {
    errors.push('周最大课时不能为空');
  } else if (maxWeeklyHours < 1 || maxWeeklyHours > 40) {
    errors.push('周最大课时必须在1-40之间');
  }

  // 验证不可用时间段（如果提供）
  if (unavailableSlots !== undefined) {
    if (!Array.isArray(unavailableSlots)) {
      errors.push('不可用时间段格式不正确');
    } else {
      for (const slot of unavailableSlots) {
        if (!validateTimeSlot(slot)) {
          errors.push('不可用时间段格式不正确');
          break;
        }
      }
    }
  }

  if (errors.length > 0) {
    const response: ApiResponse = {
      success: false,
      message: '教师数据验证失败',
      error: errors.join('; ')
    };
    res.status(400).json(response);
    return;
  }

  next();
};

/**
 * 验证教师更新请求数据
 */
export const validateUpdateTeacher = (req: Request, res: Response, next: NextFunction): void => {
  const { name, employeeId, subjects, maxWeeklyHours, unavailableSlots, preferences, isActive } = req.body;
  const errors: string[] = [];

  // 验证姓名（如果提供）
  if (name !== undefined) {
    if (typeof name !== 'string' || name.trim().length === 0) {
      errors.push('教师姓名不能为空');
    } else if (name.trim().length > 50) {
      errors.push('教师姓名不能超过50个字符');
    }
  }

  // 验证工号（如果提供）
  if (employeeId !== undefined) {
    if (typeof employeeId !== 'string' || employeeId.trim().length === 0) {
      errors.push('工号不能为空');
    } else if (employeeId.trim().length > 20) {
      errors.push('工号不能超过20个字符');
    }
  }

  // 验证任教学科（如果提供）
  if (subjects !== undefined) {
    if (!Array.isArray(subjects) || subjects.length === 0) {
      errors.push('任教学科不能为空');
    } else {
      for (const subject of subjects) {
        if (typeof subject !== 'string' || subject.trim().length === 0) {
          errors.push('学科名称不能为空');
          break;
        } else if (subject.trim().length > 50) {
          errors.push('学科名称不能超过50个字符');
          break;
        }
      }
    }
  }

  // 验证周最大课时（如果提供）
  if (maxWeeklyHours !== undefined) {
    if (typeof maxWeeklyHours !== 'number' || maxWeeklyHours < 1 || maxWeeklyHours > 40) {
      errors.push('周最大课时必须在1-40之间');
    }
  }

  // 验证状态（如果提供）
  if (isActive !== undefined && typeof isActive !== 'boolean') {
    errors.push('教师状态必须是布尔值');
  }

  if (errors.length > 0) {
    const response: ApiResponse = {
      success: false,
      message: '教师数据验证失败',
      error: errors.join('; ')
    };
    res.status(400).json(response);
    return;
  }

  next();
};

// ==================== 班级验证中间件 ====================

/**
 * 验证班级创建请求数据
 */
export const validateCreateClass = (req: Request, res: Response, next: NextFunction): void => {
  const { name, grade, studentCount, homeroom, classTeacher, academicYear, semester } = req.body;
  const errors: string[] = [];

  // 验证班级名称
  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    errors.push('班级名称不能为空');
  } else if (name.trim().length > 100) {
    errors.push('班级名称不能超过100个字符');
  }

  // 验证年级
  if (grade === undefined || typeof grade !== 'number' || grade < 1 || grade > 12) {
    errors.push('年级必须在1-12之间');
  }

  // 验证学生人数
  if (studentCount === undefined || typeof studentCount !== 'number' || studentCount < 1 || studentCount > 100) {
    errors.push('学生人数必须在1-100之间');
  }

  // 验证学年
  if (!academicYear || typeof academicYear !== 'string' || !/^\d{4}-\d{4}$/.test(academicYear)) {
    errors.push('学年格式不正确，应为：2023-2024');
  }

  // 验证学期
  if (semester === undefined || typeof semester !== 'number' || ![1, 2].includes(semester)) {
    errors.push('学期必须是1(上学期)或2(下学期)');
  }

  // 验证固定教室ID（如果提供）
  if (homeroom !== undefined && homeroom && !/^[0-9a-fA-F]{24}$/.test(homeroom)) {
    errors.push('固定教室ID格式不正确');
  }

  // 验证班主任ID（如果提供）
  if (classTeacher !== undefined && classTeacher && !/^[0-9a-fA-F]{24}$/.test(classTeacher)) {
    errors.push('班主任ID格式不正确');
  }

  if (errors.length > 0) {
    const response: ApiResponse = {
      success: false,
      message: '班级数据验证失败',
      error: errors.join('; ')
    };
    res.status(400).json(response);
    return;
  }

  next();
};

/**
 * 验证班级更新请求数据
 */
export const validateUpdateClass = (req: Request, res: Response, next: NextFunction): void => {
  const { name, grade, studentCount, homeroom, classTeacher, academicYear, semester, isActive } = req.body;
  const errors: string[] = [];

  // 验证班级名称（如果提供）
  if (name !== undefined) {
    if (typeof name !== 'string' || name.trim().length === 0) {
      errors.push('班级名称不能为空');
    } else if (name.trim().length > 100) {
      errors.push('班级名称不能超过100个字符');
    }
  }

  // 验证年级（如果提供）
  if (grade !== undefined && (typeof grade !== 'number' || grade < 1 || grade > 12)) {
    errors.push('年级必须在1-12之间');
  }

  // 验证学生人数（如果提供）
  if (studentCount !== undefined && (typeof studentCount !== 'number' || studentCount < 1 || studentCount > 100)) {
    errors.push('学生人数必须在1-100之间');
  }

  // 验证学年（如果提供）
  if (academicYear !== undefined && (typeof academicYear !== 'string' || !/^\d{4}-\d{4}$/.test(academicYear))) {
    errors.push('学年格式不正确，应为：2023-2024');
  }

  // 验证学期（如果提供）
  if (semester !== undefined && (typeof semester !== 'number' || ![1, 2].includes(semester))) {
    errors.push('学期必须是1(上学期)或2(下学期)');
  }

  // 验证状态（如果提供）
  if (isActive !== undefined && typeof isActive !== 'boolean') {
    errors.push('班级状态必须是布尔值');
  }

  if (errors.length > 0) {
    const response: ApiResponse = {
      success: false,
      message: '班级数据验证失败',
      error: errors.join('; ')
    };
    res.status(400).json(response);
    return;
  }

  next();
};

// ==================== 课程验证中间件 ====================

/**
 * 验证课程创建请求数据
 */
export const validateCreateCourse = (req: Request, res: Response, next: NextFunction): void => {
  const { name, subject, courseCode, weeklyHours, requiresContinuous, continuousHours, roomRequirements } = req.body;
  const errors: string[] = [];

  // 验证课程名称
  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    errors.push('课程名称不能为空');
  } else if (name.trim().length > 100) {
    errors.push('课程名称不能超过100个字符');
  }

  // 验证学科
  if (!subject || !SUBJECTS.includes(subject)) {
    errors.push('学科不在允许的范围内');
  }

  // 验证课程编码
  if (!courseCode || typeof courseCode !== 'string' || !/^[A-Z0-9]{3,10}$/.test(courseCode.toUpperCase())) {
    errors.push('课程编码格式不正确，应为3-10位大写字母或数字');
  }

  // 验证周课时
  if (weeklyHours === undefined || typeof weeklyHours !== 'number' || weeklyHours < 1 || weeklyHours > 20) {
    errors.push('周课时必须在1-20之间');
  }

  // 验证连排要求
  if (requiresContinuous === true) {
    if (continuousHours === undefined || typeof continuousHours !== 'number' || continuousHours < 2 || continuousHours > 8) {
      errors.push('需要连排的课程必须设置连排课时数(2-8节)');
    }
  }

  // 验证场地要求
  if (!roomRequirements || typeof roomRequirements !== 'object') {
    errors.push('场地要求不能为空');
  } else if (!roomRequirements.types || !Array.isArray(roomRequirements.types) || roomRequirements.types.length === 0) {
    errors.push('教室类型要求不能为空');
  }

  if (errors.length > 0) {
    const response: ApiResponse = {
      success: false,
      message: '课程数据验证失败',
      error: errors.join('; ')
    };
    res.status(400).json(response);
    return;
  }

  next();
};

/**
 * 验证课程更新请求数据
 */
export const validateUpdateCourse = (req: Request, res: Response, next: NextFunction): void => {
  const { name, subject, courseCode, weeklyHours, requiresContinuous, continuousHours, isActive } = req.body;
  const errors: string[] = [];

  // 验证课程名称（如果提供）
  if (name !== undefined) {
    if (typeof name !== 'string' || name.trim().length === 0) {
      errors.push('课程名称不能为空');
    } else if (name.trim().length > 100) {
      errors.push('课程名称不能超过100个字符');
    }
  }

  // 验证学科（如果提供）
  if (subject !== undefined) {
    const validSubjects = ['语文', '数学', '英语', '物理', '化学', '生物', '历史', '地理', '政治', '音乐', '美术', '体育', '信息技术', '通用技术', '心理健康', '班会'];
    if (!validSubjects.includes(subject)) {
      errors.push('学科不在允许的范围内');
    }
  }

  // 验证课程编码（如果提供）
  if (courseCode !== undefined) {
    if (typeof courseCode !== 'string' || !/^[A-Z0-9]{3,10}$/.test(courseCode.toUpperCase())) {
      errors.push('课程编码格式不正确，应为3-10位大写字母或数字');
    }
  }

  // 验证周课时（如果提供）
  if (weeklyHours !== undefined && (typeof weeklyHours !== 'number' || weeklyHours < 1 || weeklyHours > 20)) {
    errors.push('周课时必须在1-20之间');
  }

  // 验证状态（如果提供）
  if (isActive !== undefined && typeof isActive !== 'boolean') {
    errors.push('课程状态必须是布尔值');
  }

  if (errors.length > 0) {
    const response: ApiResponse = {
      success: false,
      message: '课程数据验证失败',
      error: errors.join('; ')
    };
    res.status(400).json(response);
    return;
  }

  next();
};

// ==================== 场室验证中间件 ====================

/**
 * 验证场室创建请求数据
 */
export const validateCreateRoom = (req: Request, res: Response, next: NextFunction): void => {
  const { name, roomNumber, type, capacity, building, floor, equipment, assignedClass } = req.body;
  const errors: string[] = [];

  // 验证教室名称
  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    errors.push('教室名称不能为空');
  } else if (name.trim().length > 100) {
    errors.push('教室名称不能超过100个字符');
  }

  // 验证教室编号
  if (!roomNumber || typeof roomNumber !== 'string' || roomNumber.trim().length === 0) {
    errors.push('教室编号不能为空');
  } else if (roomNumber.trim().length > 50) {
    errors.push('教室编号不能超过50个字符');
  }

  // 验证教室类型
  const validTypes = ['普通教室', '多媒体教室', '实验室', '计算机房', '语音室', '美术室', '音乐室', '舞蹈室', '体育馆', '操场', '图书馆', '会议室'];
  if (!type || !validTypes.includes(type)) {
    errors.push('教室类型不在允许的范围内');
  }

  // 验证教室容量
  if (capacity === undefined || typeof capacity !== 'number' || capacity < 1 || capacity > 500) {
    errors.push('教室容量必须在1-500之间');
  }

  // 验证楼层（如果提供）
  if (floor !== undefined && (typeof floor !== 'number' || floor < -3 || floor > 50)) {
    errors.push('楼层必须在-3到50之间');
  }

  // 验证分配班级ID（如果提供）
  if (assignedClass !== undefined && assignedClass && !/^[0-9a-fA-F]{24}$/.test(assignedClass)) {
    errors.push('分配班级ID格式不正确');
  }

  if (errors.length > 0) {
    const response: ApiResponse = {
      success: false,
      message: '场室数据验证失败',
      error: errors.join('; ')
    };
    res.status(400).json(response);
    return;
  }

  next();
};

/**
 * 验证场室更新请求数据
 */
export const validateUpdateRoom = (req: Request, res: Response, next: NextFunction): void => {
  const { name, roomNumber, type, capacity, building, floor, assignedClass, isActive } = req.body;
  const errors: string[] = [];

  // 验证教室名称（如果提供）
  if (name !== undefined) {
    if (typeof name !== 'string' || name.trim().length === 0) {
      errors.push('教室名称不能为空');
    } else if (name.trim().length > 100) {
      errors.push('教室名称不能超过100个字符');
    }
  }

  // 验证教室编号（如果提供）
  if (roomNumber !== undefined) {
    if (typeof roomNumber !== 'string' || roomNumber.trim().length === 0) {
      errors.push('教室编号不能为空');
    } else if (roomNumber.trim().length > 50) {
      errors.push('教室编号不能超过50个字符');
    }
  }

  // 验证教室类型（如果提供）
  if (type !== undefined) {
    const validTypes = ['普通教室', '多媒体教室', '实验室', '计算机房', '语音室', '美术室', '音乐室', '舞蹈室', '体育馆', '操场', '图书馆', '会议室'];
    if (!validTypes.includes(type)) {
      errors.push('教室类型不在允许的范围内');
    }
  }

  // 验证教室容量（如果提供）
  if (capacity !== undefined && (typeof capacity !== 'number' || capacity < 1 || capacity > 500)) {
    errors.push('教室容量必须在1-500之间');
  }

  // 验证楼层（如果提供）
  if (floor !== undefined && floor !== null && (typeof floor !== 'number' || floor < -3 || floor > 50)) {
    errors.push('楼层必须在-3到50之间');
  }

  // 验证状态（如果提供）
  if (isActive !== undefined && typeof isActive !== 'boolean') {
    errors.push('场室状态必须是布尔值');
  }

  if (errors.length > 0) {
    const response: ApiResponse = {
      success: false,
      message: '场室数据验证失败',
      error: errors.join('; ')
    };
    res.status(400).json(response);
    return;
  }

  next();
};

// ==================== 工具函数 ====================

/**
 * 验证时间段格式
 * 
 * Args:
 *   slot: 时间段对象
 * 
 * Returns:
 *   boolean: 格式是否正确
 */
function validateTimeSlot(slot: any): boolean {
  if (!slot || typeof slot !== 'object') return false;
  
  if (typeof slot.dayOfWeek !== 'number' || slot.dayOfWeek < 0 || slot.dayOfWeek > 6) {
    return false;
  }
  
  if (!Array.isArray(slot.periods) || slot.periods.length === 0) {
    return false;
  }
  
  for (const period of slot.periods) {
    if (typeof period !== 'number' || period < 1 || period > 12) {
      return false;
    }
  }
  
  return true;
}// ==================== 教学计划验证 ====================

/**
 * 验证教学计划创建请求数据
 * 
 * Args:
 *   req: Express请求对象
 *   res: Express响应对象
 *   next: Express中间件下一步函数
 * 
 * Returns:
 *   void: 验证通过时调用next()，验证失败时返回错误响应
 */
export const validateCreateTeachingPlan = (req: Request, res: Response, next: NextFunction): void => {
  const { class: classId, academicYear, semester, courseAssignments, notes } = req.body;
  const errors: string[] = [];

  // 验证班级ID
  if (!classId || typeof classId !== 'string') {
    errors.push('班级ID不能为空');
  }

  // 验证学年
  if (!academicYear || typeof academicYear !== 'string') {
    errors.push('学年不能为空');
  } else if (!/^\d{4}-\d{4}$/.test(academicYear.trim())) {
    errors.push('学年格式应为: 2024-2025');
  }

  // 验证学期
  if (semester === undefined || semester === null) {
    errors.push('学期不能为空');
  } else if (![1, 2].includes(semester)) {
    errors.push('学期只能是1或2');
  }

  // 验证课程安排
  if (!courseAssignments || !Array.isArray(courseAssignments)) {
    errors.push('课程安排必须是数组');
  } else if (courseAssignments.length === 0) {
    errors.push('至少需要安排一门课程');
  } else {
    courseAssignments.forEach((assignment, index) => {
      const assignmentErrors = validateCourseAssignment(assignment, index + 1);
      errors.push(...assignmentErrors);
    });
  }

  // 验证备注（如果提供）
  if (notes !== undefined && (typeof notes !== 'string' || notes.length > 1000)) {
    errors.push('计划备注必须是字符串且不超过1000个字符');
  }

  if (errors.length > 0) {
    const response: ApiResponse = {
      success: false,
      message: '教学计划数据验证失败',
      error: errors.join('; ')
    };
    res.status(400).json(response);
    return;
  }

  next();
};

/**
 * 验证教学计划更新请求数据
 * 
 * Args:
 *   req: Express请求对象
 *   res: Express响应对象
 *   next: Express中间件下一步函数
 * 
 * Returns:
 *   void: 验证通过时调用next()，验证失败时返回错误响应
 */
export const validateUpdateTeachingPlan = (req: Request, res: Response, next: NextFunction): void => {
  const { courseAssignments, status, notes } = req.body;
  const errors: string[] = [];

  // 验证课程安排（如果提供）
  if (courseAssignments !== undefined) {
    if (!Array.isArray(courseAssignments)) {
      errors.push('课程安排必须是数组');
    } else if (courseAssignments.length === 0) {
      errors.push('至少需要安排一门课程');
    } else {
      courseAssignments.forEach((assignment, index) => {
        const assignmentErrors = validateCourseAssignment(assignment, index + 1);
        errors.push(...assignmentErrors);
      });
    }
  }

  // 验证状态（如果提供）
  if (status !== undefined && !['draft', 'approved', 'active', 'archived'].includes(status)) {
    errors.push('计划状态只能是: draft, approved, active, archived');
  }

  // 验证备注（如果提供）
  if (notes !== undefined && (typeof notes !== 'string' || notes.length > 1000)) {
    errors.push('计划备注必须是字符串且不超过1000个字符');
  }

  if (errors.length > 0) {
    const response: ApiResponse = {
      success: false,
      message: '教学计划更新数据验证失败',
      error: errors.join('; ')
    };
    res.status(400).json(response);
    return;
  }

  next();
};

/**
 * 验证教学计划审批请求数据
 * 
 * Args:
 *   req: Express请求对象
 *   res: Express响应对象
 *   next: Express中间件下一步函数
 * 
 * Returns:
 *   void: 验证通过时调用next()，验证失败时返回错误响应
 */
export const validateApproveTeachingPlan = (req: Request, res: Response, next: NextFunction): void => {
  const { approve, comments } = req.body;
  const errors: string[] = [];

  // 验证审批决定
  if (approve === undefined || typeof approve !== 'boolean') {
    errors.push('审批决定不能为空且必须是布尔值');
  }

  // 验证审批意见（如果提供）
  if (comments !== undefined && (typeof comments !== 'string' || comments.length > 500)) {
    errors.push('审批意见必须是字符串且不超过500个字符');
  }

  if (errors.length > 0) {
    const response: ApiResponse = {
      success: false,
      message: '教学计划审批数据验证失败',
      error: errors.join('; ')
    };
    res.status(400).json(response);
    return;
  }

  next();
};

// ==================== 排课规则验证 ====================

/**
 * 验证排课规则创建请求数据
 * 
 * Args:
 *   req: Express请求对象
 *   res: Express响应对象
 *   next: Express中间件下一步函数
 * 
 * Returns:
 *   void: 验证通过时调用next()，验证失败时返回错误响应
 */
export const validateCreateSchedulingRules = (req: Request, res: Response, next: NextFunction): void => {
  const { 
    name, 
    description, 
    schoolType, 
    academicYear, 
    semester, 
    timeRules, 
    teacherConstraints, 
    roomConstraints, 
    courseArrangementRules, 
    conflictResolutionRules,
    isDefault 
  } = req.body;
  const errors: string[] = [];

  // 验证规则集名称
  if (!name || typeof name !== 'string') {
    errors.push('规则集名称不能为空');
  } else if (name.trim().length < 2 || name.trim().length > 100) {
    errors.push('规则集名称长度必须在2-100个字符之间');
  }

  // 验证描述（如果提供）
  if (description !== undefined && (typeof description !== 'string' || description.length > 500)) {
    errors.push('规则集描述必须是字符串且不超过500个字符');
  }

  // 验证学校类型
  if (!schoolType || !['primary', 'middle', 'high', 'mixed'].includes(schoolType)) {
    errors.push('学校类型只能是: primary, middle, high, mixed');
  }

  // 验证学年
  if (!academicYear || typeof academicYear !== 'string') {
    errors.push('适用学年不能为空');
  } else if (!/^\d{4}-\d{4}$/.test(academicYear.trim())) {
    errors.push('学年格式应为: 2024-2025');
  }

  // 验证学期
  if (semester === undefined || ![1, 2].includes(semester)) {
    errors.push('适用学期只能是1或2');
  }

  // 验证时间规则
  if (!timeRules || typeof timeRules !== 'object') {
    errors.push('时间规则不能为空');
  } else {
    const timeRulesErrors = validateTimeRules(timeRules);
    errors.push(...timeRulesErrors);
  }

  // 验证教师约束
  if (!teacherConstraints || typeof teacherConstraints !== 'object') {
    errors.push('教师约束不能为空');
  } else {
    const teacherConstraintsErrors = validateTeacherConstraints(teacherConstraints);
    errors.push(...teacherConstraintsErrors);
  }

  // 验证教室约束
  if (!roomConstraints || typeof roomConstraints !== 'object') {
    errors.push('教室约束不能为空');
  } else {
    const roomConstraintsErrors = validateRoomConstraints(roomConstraints);
    errors.push(...roomConstraintsErrors);
  }

  // 验证课程排列规则
  if (!courseArrangementRules || typeof courseArrangementRules !== 'object') {
    errors.push('课程排列规则不能为空');
  } else {
    const arrangementRulesErrors = validateCourseArrangementRules(courseArrangementRules);
    errors.push(...arrangementRulesErrors);
  }

  // 验证冲突处理规则
  if (!conflictResolutionRules || typeof conflictResolutionRules !== 'object') {
    errors.push('冲突处理规则不能为空');
  } else {
    const conflictRulesErrors = validateConflictResolutionRules(conflictResolutionRules);
    errors.push(...conflictRulesErrors);
  }

  // 验证默认标志（如果提供）
  if (isDefault !== undefined && typeof isDefault !== 'boolean') {
    errors.push('默认规则标志必须是布尔值');
  }

  if (errors.length > 0) {
    const response: ApiResponse = {
      success: false,
      message: '排课规则数据验证失败',
      error: errors.join('; ')
    };
    res.status(400).json(response);
    return;
  }

  next();
};

/**
 * 验证排课规则更新请求数据
 * 
 * Args:
 *   req: Express请求对象
 *   res: Express响应对象
 *   next: Express中间件下一步函数
 * 
 * Returns:
 *   void: 验证通过时调用next()，验证失败时返回错误响应
 */
export const validateUpdateSchedulingRules = (req: Request, res: Response, next: NextFunction): void => {
  const { 
    name, 
    description, 
    schoolType, 
    timeRules, 
    teacherConstraints, 
    roomConstraints, 
    courseArrangementRules, 
    conflictResolutionRules,
    isDefault,
    isActive 
  } = req.body;
  const errors: string[] = [];

  // 验证规则集名称（如果提供）
  if (name !== undefined) {
    if (typeof name !== 'string' || name.trim().length < 2 || name.trim().length > 100) {
      errors.push('规则集名称长度必须在2-100个字符之间');
    }
  }

  // 验证描述（如果提供）
  if (description !== undefined && (typeof description !== 'string' || description.length > 500)) {
    errors.push('规则集描述必须是字符串且不超过500个字符');
  }

  // 验证学校类型（如果提供）
  if (schoolType !== undefined && !['primary', 'middle', 'high', 'mixed'].includes(schoolType)) {
    errors.push('学校类型只能是: primary, middle, high, mixed');
  }

  // 验证时间规则（如果提供）
  if (timeRules !== undefined) {
    if (typeof timeRules !== 'object') {
      errors.push('时间规则必须是对象');
    } else {
      const timeRulesErrors = validateTimeRules(timeRules);
      errors.push(...timeRulesErrors);
    }
  }

  // 验证教师约束（如果提供）
  if (teacherConstraints !== undefined) {
    if (typeof teacherConstraints !== 'object') {
      errors.push('教师约束必须是对象');
    } else {
      const teacherConstraintsErrors = validateTeacherConstraints(teacherConstraints);
      errors.push(...teacherConstraintsErrors);
    }
  }

  // 验证教室约束（如果提供）
  if (roomConstraints !== undefined) {
    if (typeof roomConstraints !== 'object') {
      errors.push('教室约束必须是对象');
    } else {
      const roomConstraintsErrors = validateRoomConstraints(roomConstraints);
      errors.push(...roomConstraintsErrors);
    }
  }

  // 验证课程排列规则（如果提供）
  if (courseArrangementRules !== undefined) {
    if (typeof courseArrangementRules !== 'object') {
      errors.push('课程排列规则必须是对象');
    } else {
      const arrangementRulesErrors = validateCourseArrangementRules(courseArrangementRules);
      errors.push(...arrangementRulesErrors);
    }
  }

  // 验证冲突处理规则（如果提供）
  if (conflictResolutionRules !== undefined) {
    if (typeof conflictResolutionRules !== 'object') {
      errors.push('冲突处理规则必须是对象');
    } else {
      const conflictRulesErrors = validateConflictResolutionRules(conflictResolutionRules);
      errors.push(...conflictRulesErrors);
    }
  }

  // 验证标志字段（如果提供）
  if (isDefault !== undefined && typeof isDefault !== 'boolean') {
    errors.push('默认规则标志必须是布尔值');
  }

  if (isActive !== undefined && typeof isActive !== 'boolean') {
    errors.push('有效状态标志必须是布尔值');
  }

  if (errors.length > 0) {
    const response: ApiResponse = {
      success: false,
      message: '排课规则更新数据验证失败',
      error: errors.join('; ')
    };
    res.status(400).json(response);
    return;
  }

  next();
};

// ==================== 详细验证工具函数 ====================

/**
 * 验证课程安排数据
 * 
 * Args:
 *   assignment: 课程安排对象
 *   index: 在数组中的位置（用于错误提示）
 * 
 * Returns:
 *   string[]: 验证错误列表
 */
function validateCourseAssignment(assignment: any, index: number): string[] {
  const errors: string[] = [];
  const prefix = `课程安排 ${index}:`;

  // 验证课程ID
  if (!assignment.course || typeof assignment.course !== 'string') {
    errors.push(`${prefix} 课程ID不能为空`);
  }

  // 验证教师ID
  if (!assignment.teacher || typeof assignment.teacher !== 'string') {
    errors.push(`${prefix} 教师ID不能为空`);
  }

  // 验证每周课时数
  if (assignment.weeklyHours === undefined || typeof assignment.weeklyHours !== 'number') {
    errors.push(`${prefix} 每周课时数不能为空`);
  } else if (assignment.weeklyHours < 0|| assignment.weeklyHours > 20) {
    errors.push(`${prefix} 每周课时数必须在0-20之间`);
  }

  // 验证连排设置
  if (assignment.requiresContinuous !== undefined && typeof assignment.requiresContinuous !== 'boolean') {
    errors.push(`${prefix} 连排要求必须是布尔值`);
  }

  if (assignment.continuousHours !== undefined) {
    if (typeof assignment.continuousHours !== 'number' || assignment.continuousHours < 2 || assignment.continuousHours > 4) {
      errors.push(`${prefix} 连排课时数必须在2-4之间`);
    }
  }

  // 验证时间段
  if (assignment.preferredTimeSlots !== undefined) {
    if (!Array.isArray(assignment.preferredTimeSlots)) {
      errors.push(`${prefix} 偏好时间段必须是数组`);
    } else {
      assignment.preferredTimeSlots.forEach((slot: any, slotIndex: number) => {
        if (!validateTimeSlot(slot)) {
          errors.push(`${prefix} 偏好时间段 ${slotIndex + 1} 格式不正确`);
        }
      });
    }
  }

  if (assignment.avoidTimeSlots !== undefined) {
    if (!Array.isArray(assignment.avoidTimeSlots)) {
      errors.push(`${prefix} 避免时间段必须是数组`);
    } else {
      assignment.avoidTimeSlots.forEach((slot: any, slotIndex: number) => {
        if (!validateTimeSlot(slot)) {
          errors.push(`${prefix} 避免时间段 ${slotIndex + 1} 格式不正确`);
        }
      });
    }
  }

  // 验证备注
  if (assignment.notes !== undefined && (typeof assignment.notes !== 'string' || assignment.notes.length > 500)) {
    errors.push(`${prefix} 备注信息必须是字符串且不超过500个字符`);
  }

  return errors;
}/**
 * 验证时间规则数据
 * 
 * Args:
 *   timeRules: 时间规则对象
 * 
 * Returns:
 *   string[]: 验证错误列表
 */
function validateTimeRules(timeRules: any): string[] {
  const errors: string[] = [];

  // 验证每日课时数
  if (typeof timeRules.dailyPeriods !== 'number' || timeRules.dailyPeriods < 4 || timeRules.dailyPeriods > 12) {
    errors.push('每日课时数必须在4-12之间');
  }

  // 验证工作日
  if (!Array.isArray(timeRules.workingDays) || timeRules.workingDays.length === 0) {
    errors.push('工作日不能为空');
  } else if (!timeRules.workingDays.every((day: any) => typeof day === 'number' && day >= 0 && day <= 6)) {
    errors.push('工作日必须是0-6之间的数字数组');
  }

  // 验证单节课时长
  if (typeof timeRules.periodDuration !== 'number' || timeRules.periodDuration < 30 || timeRules.periodDuration > 60) {
    errors.push('单节课时长必须在30-60分钟之间');
  }

  // 验证课间休息时长
  if (typeof timeRules.breakDuration !== 'number' || timeRules.breakDuration < 5 || timeRules.breakDuration > 20) {
    errors.push('课间休息时长必须在5-20分钟之间');
  }

  // 验证午休设置
  if (typeof timeRules.lunchBreakStart !== 'number' || timeRules.lunchBreakStart < 3 || timeRules.lunchBreakStart > 8) {
    errors.push('午休开始节次必须在3-8之间');
  }

  if (typeof timeRules.lunchBreakDuration !== 'number' || timeRules.lunchBreakDuration < 60 || timeRules.lunchBreakDuration > 120) {
    errors.push('午休时长必须在60-120分钟之间');
  }

  // 验证上午节次
  if (!Array.isArray(timeRules.morningPeriods) || timeRules.morningPeriods.length === 0) {
    errors.push('上午节次不能为空');
  }

  // 验证下午节次
  if (!Array.isArray(timeRules.afternoonPeriods) || timeRules.afternoonPeriods.length === 0) {
    errors.push('下午节次不能为空');
  }

  // 验证禁用时间段
  if (timeRules.forbiddenSlots !== undefined) {
    if (!Array.isArray(timeRules.forbiddenSlots)) {
      errors.push('禁用时间段必须是数组');
    } else {
      timeRules.forbiddenSlots.forEach((slot: any, index: number) => {
        if (!validateTimeSlot(slot)) {
          errors.push(`禁用时间段 ${index + 1} 格式不正确`);
        }
      });
    }
  }

  return errors;
}

/**
 * 验证教师约束数据
 * 
 * Args:
 *   constraints: 教师约束对象
 * 
 * Returns:
 *   string[]: 验证错误列表
 */
function validateTeacherConstraints(constraints: any): string[] {
  const errors: string[] = [];

  // 验证每日最大课时数
  if (typeof constraints.maxDailyHours !== 'number' || constraints.maxDailyHours < 2 || constraints.maxDailyHours > 8) {
    errors.push('教师每日最大课时数必须在2-8之间');
  }

  // 验证最大连续课时数
  if (typeof constraints.maxContinuousHours !== 'number' || constraints.maxContinuousHours < 1 || constraints.maxContinuousHours > 4) {
    errors.push('教师最大连续课时数必须在1-4之间');
  }

  // 验证课程间最小休息时间
  if (typeof constraints.minRestBetweenCourses !== 'number' || constraints.minRestBetweenCourses < 0 || constraints.minRestBetweenCourses > 30) {
    errors.push('课程间最小休息时间必须在0-30分钟之间');
  }

  // 验证布尔值字段
  if (typeof constraints.avoidFridayAfternoon !== 'boolean') {
    errors.push('避免周五下午字段必须是布尔值');
  }

  if (typeof constraints.respectTeacherPreferences !== 'boolean') {
    errors.push('尊重教师偏好字段必须是布尔值');
  }

  if (typeof constraints.allowCrossGradeTeaching !== 'boolean') {
    errors.push('允许跨年级教学字段必须是布尔值');
  }

  return errors;
}

/**
 * 验证教室约束数据
 * 
 * Args:
 *   constraints: 教室约束对象
 * 
 * Returns:
 *   string[]: 验证错误列表
 */
function validateRoomConstraints(constraints: any): string[] {
  const errors: string[] = [];

  // 验证布尔值字段
  if (typeof constraints.respectCapacityLimits !== 'boolean') {
    errors.push('遵守容量限制字段必须是布尔值');
  }

  if (typeof constraints.allowRoomSharing !== 'boolean') {
    errors.push('允许教室共享字段必须是布尔值');
  }

  if (typeof constraints.preferFixedClassrooms !== 'boolean') {
    errors.push('优先固定教室字段必须是布尔值');
  }

  // 验证特殊教室优先级
  if (!['strict', 'preferred', 'flexible'].includes(constraints.specialRoomPriority)) {
    errors.push('特殊教室优先级只能是: strict, preferred, flexible');
  }

  return errors;
}

/**
 * 验证固定时间课程数据
 * 
 * Args:
 *   course: 固定时间课程对象
 * 
 * Returns:
 *   string[]: 验证错误列表
 */
function validateFixedTimeCourse(course: any): string[] {
  const errors: string[] = [];

  // 验证课程类型
  if (!['class-meeting', 'flag-raising', 'eye-exercise', 'morning-reading', 'afternoon-reading', 'cleaning', 'other'].includes(course.type)) {
    errors.push('课程类型必须是有效的固定时间课程类型');
  }

  // 验证星期
  if (typeof course.dayOfWeek !== 'number' || course.dayOfWeek < 1 || course.dayOfWeek > 7) {
    errors.push('星期必须在1-7之间');
  }

  // 验证节次
  if (typeof course.period !== 'number' || course.period < 1 || course.period > 12) {
    errors.push('节次必须在1-12之间');
  }

  // 验证周次类型
  if (!['all', 'odd', 'even'].includes(course.weekType)) {
    errors.push('周次类型必须是: all, odd, even 中的一个');
  }

  // 验证开始周次
  if (typeof course.startWeek !== 'number' || course.startWeek < 1 || course.startWeek > 30) {
    errors.push('开始周次必须在1-30之间');
  }

  // 验证结束周次
  if (typeof course.endWeek !== 'number' || course.endWeek < 1 || course.endWeek > 30) {
    errors.push('结束周次必须在1-30之间');
  }

  // 验证周次范围
  if (course.startWeek > course.endWeek) {
    errors.push('开始周次不能大于结束周次');
  }

  // 验证备注长度
  if (course.notes && typeof course.notes === 'string' && course.notes.length > 200) {
    errors.push('备注信息不能超过200个字符');
  }

  return errors;
}

/**
 * 验证固定时间课程配置数据
 * 
 * Args:
 *   config: 固定时间课程配置对象
 * 
 * Returns:
 *   string[]: 验证错误列表
 */
function validateFixedTimeCoursesConfig(config: any): string[] {
  const errors: string[] = [];

  // 验证启用状态
  if (typeof config.enabled !== 'boolean') {
    errors.push('启用状态必须是布尔值');
  }

  // 如果启用，验证课程列表
  if (config.enabled) {
    if (!Array.isArray(config.courses)) {
      errors.push('课程列表必须是数组');
    } else {
      // 验证每个课程
      config.courses.forEach((course: any, index: number) => {
        const courseErrors = validateFixedTimeCourse(course);
        courseErrors.forEach(error => {
          errors.push(`课程${index + 1}: ${error}`);
        });
      });
    }
  }

  // 验证优先级
  if (typeof config.priority !== 'boolean') {
    errors.push('优先级字段必须是布尔值');
  }

  // 验证允许调整
  if (typeof config.allowOverride !== 'boolean') {
    errors.push('允许调整字段必须是布尔值');
  }

  // 验证冲突处理策略
  if (!['strict', 'flexible', 'warning'].includes(config.conflictStrategy)) {
    errors.push('冲突处理策略必须是: strict, flexible, warning 中的一个');
  }

  return errors;
}

/**
 * 验证课程排列规则数据
 * 
 * Args:
 *   rules: 课程排列规则对象
 * 
 * Returns:
 *   string[]: 验证错误列表
 */
function validateCourseArrangementRules(rules: any): string[] {
  const errors: string[] = [];

  // 验证布尔值字段
  if (typeof rules.allowContinuousCourses !== 'boolean') {
    errors.push('允许连排课程字段必须是布尔值');
  }

  if (typeof rules.coreSubjectPriority !== 'boolean') {
    errors.push('核心科目优先字段必须是布尔值');
  }

  // 验证最大连排课时数
  if (typeof rules.maxContinuousHours !== 'number' || rules.maxContinuousHours < 2 || rules.maxContinuousHours > 4) {
    errors.push('最大连排课时数必须在2-4之间');
  }

  // 验证分布策略
  if (!['balanced', 'concentrated', 'flexible'].includes(rules.distributionPolicy)) {
    errors.push('课程分布策略只能是: balanced, concentrated, flexible');
  }

  // 验证避免首末节科目
  if (!Array.isArray(rules.avoidFirstLastPeriod)) {
    errors.push('避免首末节科目必须是数组');
  }

  // 验证实验课偏好
  if (!['morning', 'afternoon', 'flexible'].includes(rules.labCoursePreference)) {
    errors.push('实验课时间偏好只能是: morning, afternoon, flexible');
  }

  // 验证固定时间课程配置
  if (rules.fixedTimeCourses) {
    const fixedTimeErrors = validateFixedTimeCoursesConfig(rules.fixedTimeCourses);
    errors.push(...fixedTimeErrors);
  }

  return errors;
}

/**
 * 验证冲突处理规则数据
 * 
 * Args:
 *   rules: 冲突处理规则对象
 * 
 * Returns:
 *   string[]: 验证错误列表
 */
function validateConflictResolutionRules(rules: any): string[] {
  const errors: string[] = [];

  // 验证冲突处理策略
  if (!['strict', 'warn', 'ignore'].includes(rules.teacherConflictResolution)) {
    errors.push('教师冲突处理策略只能是: strict, warn, ignore');
  }

  if (!['strict', 'warn', 'ignore'].includes(rules.roomConflictResolution)) {
    errors.push('教室冲突处理策略只能是: strict, warn, ignore');
  }

  if (!['strict', 'warn', 'ignore'].includes(rules.classConflictResolution)) {
    errors.push('班级冲突处理策略只能是: strict, warn, ignore');
  }

  // 验证布尔值字段
  if (typeof rules.allowOverride !== 'boolean') {
    errors.push('允许覆盖字段必须是布尔值');
  }

  // 验证优先级顺序
  if (!Array.isArray(rules.priorityOrder) || rules.priorityOrder.length === 0) {
    errors.push('优先级顺序不能为空');
  }

  return errors;
}