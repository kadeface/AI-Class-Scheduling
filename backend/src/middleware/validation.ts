/**
 * 请求数据验证中间件
 * 
 * 提供用户数据的验证功能，确保API请求数据的完整性和正确性
 */

import { Request, Response, NextFunction } from 'express';
import { ApiResponse } from '../types/api';

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
      error: '请提供有效的用户ID'
    };
    res.status(400).json(response);
    return;
  }

  next();
};