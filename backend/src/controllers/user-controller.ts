/**
 * 用户控制器
 * 
 * 处理用户相关的业务逻辑，包括用户的CRUD操作和角色管理
 */

import { Request, Response } from 'express';
import { User, IUser } from '../models/User';
import { ApiResponse, CreateUserRequest, UpdateUserRequest, UserResponse, UserQueryOptions, PaginatedResponse } from '../types/api';

/**
 * 转换用户对象为响应格式（移除密码字段）
 * 
 * Args:
 *   user: 用户模型实例或lean对象
 * 
 * Returns:
 *   UserResponse: 不包含密码的用户响应对象
 */
const transformUserToResponse = (user: IUser | any): UserResponse => {
  return {
    _id: user._id?.toString() || user.id?.toString(),
    username: user.username,
    role: user.role,
    profile: user.profile,
    isActive: user.isActive,
    lastLogin: user.lastLogin,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt
  };
};

/**
 * 创建新用户
 * 
 * Args:
 *   req: Express请求对象，包含CreateUserRequest数据
 *   res: Express响应对象
 * 
 * Returns:
 *   Promise<void>: 创建成功返回新用户信息，失败返回错误信息
 */
export const createUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const userData: CreateUserRequest = req.body;

    // 检查用户名是否已存在
    const existingUser = await User.findOne({ username: userData.username });
    if (existingUser) {
      const response: ApiResponse = {
        success: false,
        message: '用户创建失败',
        error: '用户名已存在'
      };
      res.status(409).json(response);
      return;
    }

    // 检查工号是否已存在（如果提供）
    if (userData.profile.employeeId) {
      const existingEmployee = await User.findOne({ 'profile.employeeId': userData.profile.employeeId });
      if (existingEmployee) {
        const response: ApiResponse = {
          success: false,
          message: '用户创建失败',
          error: '工号已存在'
        };
        res.status(409).json(response);
        return;
      }
    }

    // 创建新用户
    const newUser = new User(userData);
    const savedUser = await newUser.save();

    const response: ApiResponse<UserResponse> = {
      success: true,
      message: '用户创建成功',
      data: transformUserToResponse(savedUser)
    };

    res.status(201).json(response);
  } catch (error: any) {
    console.error('创建用户失败:', error);
    
    const response: ApiResponse = {
      success: false,
      message: '用户创建失败',
      error: error.message || '服务器内部错误'
    };
    
    res.status(500).json(response);
  }
};/**
 * 获取用户列表（支持分页和筛选）
 * 
 * Args:
 *   req: Express请求对象，可包含查询参数
 *   res: Express响应对象
 * 
 * Returns:
 *   Promise<void>: 返回分页的用户列表
 */
export const getUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    const options: UserQueryOptions = req.query;
    const page = Number(options.page) || 1;
    const limit = Number(options.limit) || 10;
    const skip = (page - 1) * limit;

    // 构建查询条件
    const query: any = {};
    
    if (options.role) {
      query.role = options.role;
    }
    
    if (options.isActive !== undefined) {
      query.isActive = String(options.isActive) === 'true';
    }
    
    if (options.department) {
      query['profile.department'] = { $regex: options.department, $options: 'i' };
    }
    
    if (options.keyword) {
      query.$or = [
        { username: { $regex: options.keyword, $options: 'i' } },
        { 'profile.name': { $regex: options.keyword, $options: 'i' } }
      ];
    }

    // 构建排序条件
    const sortBy = options.sortBy || 'createdAt';
    const sortOrder = options.sortOrder === 'asc' ? 1 : -1;
    const sort: any = { [sortBy]: sortOrder };

    // 执行查询
    const [users, total] = await Promise.all([
      User.find(query)
        .select('-password') // 排除密码字段
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      User.countDocuments(query)
    ]);

    const totalPages = Math.ceil(total / limit);

    const paginatedData: PaginatedResponse<UserResponse> = {
      items: users.map(user => transformUserToResponse(user)),
      total,
      page,
      limit,
      totalPages
    };

    const response: ApiResponse<PaginatedResponse<UserResponse>> = {
      success: true,
      message: '获取用户列表成功',
      data: paginatedData
    };

    res.status(200).json(response);
  } catch (error: any) {
    console.error('获取用户列表失败:', error);
    
    const response: ApiResponse = {
      success: false,
      message: '获取用户列表失败',
      error: error.message || '服务器内部错误'
    };
    
    res.status(500).json(response);
  }
};

/**
 * 根据ID获取单个用户
 * 
 * Args:
 *   req: Express请求对象，包含用户ID参数
 *   res: Express响应对象
 * 
 * Returns:
 *   Promise<void>: 返回用户信息或错误信息
 */
export const getUserById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const user = await User.findById(id).select('-password');
    
    if (!user) {
      const response: ApiResponse = {
        success: false,
        message: '用户不存在',
        error: '未找到指定ID的用户'
      };
      res.status(404).json(response);
      return;
    }

    const response: ApiResponse<UserResponse> = {
      success: true,
      message: '获取用户信息成功',
      data: transformUserToResponse(user)
    };

    res.status(200).json(response);
  } catch (error: any) {
    console.error('获取用户信息失败:', error);
    
    const response: ApiResponse = {
      success: false,
      message: '获取用户信息失败',
      error: error.message || '服务器内部错误'
    };
    
    res.status(500).json(response);
  }
};/**
 * 更新用户信息
 * 
 * Args:
 *   req: Express请求对象，包含用户ID和更新数据
 *   res: Express响应对象
 * 
 * Returns:
 *   Promise<void>: 返回更新后的用户信息或错误信息
 */
export const updateUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const updateData: UpdateUserRequest = req.body;

    // 检查用户是否存在
    const existingUser = await User.findById(id);
    if (!existingUser) {
      const response: ApiResponse = {
        success: false,
        message: '用户不存在',
        error: '未找到指定ID的用户'
      };
      res.status(404).json(response);
      return;
    }

    // 检查用户名是否被其他用户使用
    if (updateData.username && updateData.username !== existingUser.username) {
      const userWithSameUsername = await User.findOne({ 
        username: updateData.username,
        _id: { $ne: id }
      });
      
      if (userWithSameUsername) {
        const response: ApiResponse = {
          success: false,
          message: '用户更新失败',
          error: '用户名已被其他用户使用'
        };
        res.status(409).json(response);
        return;
      }
    }

    // 检查工号是否被其他用户使用
    if (updateData.profile?.employeeId && 
        updateData.profile.employeeId !== existingUser.profile.employeeId) {
      const userWithSameEmployeeId = await User.findOne({
        'profile.employeeId': updateData.profile.employeeId,
        _id: { $ne: id }
      });
      
      if (userWithSameEmployeeId) {
        const response: ApiResponse = {
          success: false,
          message: '用户更新失败',
          error: '工号已被其他用户使用'
        };
        res.status(409).json(response);
        return;
      }
    }

    // 构建更新对象
    const updateFields: any = {};
    
    if (updateData.username) updateFields.username = updateData.username;
    if (updateData.role) updateFields.role = updateData.role;
    if (updateData.isActive !== undefined) updateFields.isActive = updateData.isActive;
    
    if (updateData.profile) {
      // 只更新提供的profile字段
      Object.keys(updateData.profile).forEach(key => {
        if (updateData.profile![key as keyof typeof updateData.profile] !== undefined) {
          updateFields[`profile.${key}`] = updateData.profile![key as keyof typeof updateData.profile];
        }
      });
    }

    // 执行更新
    const updatedUser = await User.findByIdAndUpdate(
      id,
      { $set: updateFields },
      { new: true, runValidators: true }
    ).select('-password');

    if (!updatedUser) {
      const response: ApiResponse = {
        success: false,
        message: '用户更新失败',
        error: '更新操作失败'
      };
      res.status(500).json(response);
      return;
    }

    const response: ApiResponse<UserResponse> = {
      success: true,
      message: '用户更新成功',
      data: transformUserToResponse(updatedUser)
    };

    res.status(200).json(response);
  } catch (error: any) {
    console.error('更新用户失败:', error);
    
    const response: ApiResponse = {
      success: false,
      message: '用户更新失败',
      error: error.message || '服务器内部错误'
    };
    
    res.status(500).json(response);
  }
};

/**
 * 删除用户（软删除 - 将用户设为不活跃状态）
 * 
 * Args:
 *   req: Express请求对象，包含用户ID参数
 *   res: Express响应对象
 * 
 * Returns:
 *   Promise<void>: 返回删除结果或错误信息
 */
export const deleteUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const user = await User.findById(id);
    
    if (!user) {
      const response: ApiResponse = {
        success: false,
        message: '用户不存在',
        error: '未找到指定ID的用户'
      };
      res.status(404).json(response);
      return;
    }

    // 软删除：将用户状态设为不活跃
    const updatedUser = await User.findByIdAndUpdate(
      id,
      { $set: { isActive: false } },
      { new: true }
    ).select('-password');

    if (!updatedUser) {
      const response: ApiResponse = {
        success: false,
        message: '删除用户失败',
        error: '删除操作失败'
      };
      res.status(500).json(response);
      return;
    }

    const response: ApiResponse<UserResponse> = {
      success: true,
      message: '用户删除成功',
      data: transformUserToResponse(updatedUser)
    };

    res.status(200).json(response);
  } catch (error: any) {
    console.error('删除用户失败:', error);
    
    const response: ApiResponse = {
      success: false,
      message: '删除用户失败',
      error: error.message || '服务器内部错误'
    };
    
    res.status(500).json(response);
  }
};

/**
 * 永久删除用户（硬删除）
 * 
 * Args:
 *   req: Express请求对象，包含用户ID参数
 *   res: Express响应对象
 * 
 * Returns:
 *   Promise<void>: 返回删除结果或错误信息
 */
export const permanentDeleteUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const deletedUser = await User.findByIdAndDelete(id);
    
    if (!deletedUser) {
      const response: ApiResponse = {
        success: false,
        message: '用户不存在',
        error: '未找到指定ID的用户'
      };
      res.status(404).json(response);
      return;
    }

    const response: ApiResponse = {
      success: true,
      message: '用户永久删除成功'
    };

    res.status(200).json(response);
  } catch (error: any) {
    console.error('永久删除用户失败:', error);
    
    const response: ApiResponse = {
      success: false,
      message: '永久删除用户失败',
      error: error.message || '服务器内部错误'
    };
    
    res.status(500).json(response);
  }
};