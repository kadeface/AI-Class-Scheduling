/**
 * 教师控制器
 * 
 * 处理教师相关的业务逻辑，包括教师的CRUD操作和任教学科管理
 */

import { Request, Response } from 'express';
import { Teacher, ITeacher } from '../models/Teacher';
import { 
  ApiResponse, 
  CreateTeacherRequest, 
  UpdateTeacherRequest, 
  TeacherResponse, 
  TeacherQueryOptions, 
  PaginatedResponse 
} from '../types/api';

/**
 * 转换教师对象为响应格式
 * 
 * Args:
 *   teacher: 教师模型实例或lean对象
 * 
 * Returns:
 *   TeacherResponse: 教师响应对象
 */
const transformTeacherToResponse = (teacher: ITeacher | any): TeacherResponse => {
  return {
    _id: teacher._id?.toString() || teacher.id?.toString(),
    name: teacher.name,
    employeeId: teacher.employeeId,
    subjects: teacher.subjects,
    maxWeeklyHours: teacher.maxWeeklyHours,
    unavailableSlots: teacher.unavailableSlots || [],
    preferences: teacher.preferences || {},
    isActive: teacher.isActive,
    createdAt: teacher.createdAt,
    updatedAt: teacher.updatedAt
  };
};

/**
 * 创建新教师
 * 
 * Args:
 *   req: Express请求对象，包含CreateTeacherRequest数据
 *   res: Express响应对象
 * 
 * Returns:
 *   Promise<void>: 创建成功返回新教师信息，失败返回错误信息
 */export const createTeacher = async (req: Request, res: Response): Promise<void> => {
  try {
    const teacherData: CreateTeacherRequest = req.body;

    // 检查工号是否已存在
    const existingTeacher = await Teacher.findOne({ employeeId: teacherData.employeeId });
    if (existingTeacher) {
      const response: ApiResponse = {
        success: false,
        message: '教师创建失败',
        error: '工号已存在'
      };
      res.status(409).json(response);
      return;
    }

    // 创建新教师
    const newTeacher = new Teacher(teacherData);
    const savedTeacher = await newTeacher.save();

    const response: ApiResponse<TeacherResponse> = {
      success: true,
      message: '教师创建成功',
      data: transformTeacherToResponse(savedTeacher)
    };

    res.status(201).json(response);
  } catch (error: any) {
    console.error('创建教师失败:', error);
    
    const response: ApiResponse = {
      success: false,
      message: '教师创建失败',
      error: error.message || '服务器内部错误'
    };
    
    res.status(500).json(response);
  }
};

/**
 * 获取教师列表（支持分页和筛选）
 * 
 * Args:
 *   req: Express请求对象，可包含查询参数
 *   res: Express响应对象
 * 
 * Returns:
 *   Promise<void>: 返回分页的教师列表
 */export const getTeachers = async (req: Request, res: Response): Promise<void> => {
  try {
    const options: TeacherQueryOptions = req.query;
    const page = Number(options.page) || 1;
    const limit = Number(options.limit) || 10;
    const skip = (page - 1) * limit;

    // 构建查询条件
    const query: any = {};
    
    if (options.subjects) {
      query.subjects = { $in: [options.subjects] };
    }
    
    if (options.isActive !== undefined) {
      query.isActive = String(options.isActive) === 'true';
    }
    
    if (options.keyword) {
      query.$or = [
        { name: { $regex: options.keyword, $options: 'i' } },
        { employeeId: { $regex: options.keyword, $options: 'i' } }
      ];
    }

    // 构建排序条件
    const sortBy = options.sortBy || 'createdAt';
    const sortOrder = options.sortOrder === 'asc' ? 1 : -1;
    const sort: any = { [sortBy]: sortOrder };

    // 执行查询
    const [teachers, total] = await Promise.all([
      Teacher.find(query)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      Teacher.countDocuments(query)
    ]);

    const totalPages = Math.ceil(total / limit);    const paginatedData: PaginatedResponse<TeacherResponse> = {
      items: teachers.map(teacher => transformTeacherToResponse(teacher)),
      total,
      page,
      limit,
      totalPages
    };

    const response: ApiResponse<PaginatedResponse<TeacherResponse>> = {
      success: true,
      message: '获取教师列表成功',
      data: paginatedData
    };

    res.status(200).json(response);
  } catch (error: any) {
    console.error('获取教师列表失败:', error);
    
    const response: ApiResponse = {
      success: false,
      message: '获取教师列表失败',
      error: error.message || '服务器内部错误'
    };
    
    res.status(500).json(response);
  }
};

/**
 * 根据ID获取单个教师
 * 
 * Args:
 *   req: Express请求对象，包含教师ID参数
 *   res: Express响应对象
 * 
 * Returns:
 *   Promise<void>: 返回教师信息或错误信息
 */export const getTeacherById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const teacher = await Teacher.findById(id);
    
    if (!teacher) {
      const response: ApiResponse = {
        success: false,
        message: '教师不存在',
        error: '未找到指定ID的教师'
      };
      res.status(404).json(response);
      return;
    }

    const response: ApiResponse<TeacherResponse> = {
      success: true,
      message: '获取教师信息成功',
      data: transformTeacherToResponse(teacher)
    };

    res.status(200).json(response);
  } catch (error: any) {
    console.error('获取教师信息失败:', error);
    
    const response: ApiResponse = {
      success: false,
      message: '获取教师信息失败',
      error: error.message || '服务器内部错误'
    };
    
    res.status(500).json(response);
  }
};

/**
 * 更新教师信息
 * 
 * Args:
 *   req: Express请求对象，包含教师ID和更新数据
 *   res: Express响应对象
 * 
 * Returns:
 *   Promise<void>: 返回更新后的教师信息或错误信息
 */export const updateTeacher = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const updateData: UpdateTeacherRequest = req.body;

    // 检查教师是否存在
    const existingTeacher = await Teacher.findById(id);
    if (!existingTeacher) {
      const response: ApiResponse = {
        success: false,
        message: '教师不存在',
        error: '未找到指定ID的教师'
      };
      res.status(404).json(response);
      return;
    }

    // 检查工号是否被其他教师使用
    if (updateData.employeeId && updateData.employeeId !== existingTeacher.employeeId) {
      const teacherWithSameEmployeeId = await Teacher.findOne({
        employeeId: updateData.employeeId,
        _id: { $ne: id }
      });
      
      if (teacherWithSameEmployeeId) {
        const response: ApiResponse = {
          success: false,
          message: '教师更新失败',
          error: '工号已被其他教师使用'
        };
        res.status(409).json(response);
        return;
      }
    }

    // 执行更新
    const updatedTeacher = await Teacher.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (!updatedTeacher) {
      const response: ApiResponse = {
        success: false,
        message: '教师更新失败',
        error: '更新操作失败'
      };
      res.status(500).json(response);
      return;
    }

    const response: ApiResponse<TeacherResponse> = {
      success: true,
      message: '教师更新成功',
      data: transformTeacherToResponse(updatedTeacher)
    };

    res.status(200).json(response);
  } catch (error: any) {
    console.error('更新教师失败:', error);
    
    const response: ApiResponse = {
      success: false,
      message: '教师更新失败',
      error: error.message || '服务器内部错误'
    };
    
    res.status(500).json(response);
  }
};

/**
 * 删除教师（软删除）
 * 
 * Args:
 *   req: Express请求对象，包含教师ID参数
 *   res: Express响应对象
 * 
 * Returns:
 *   Promise<void>: 返回删除结果或错误信息
 */export const deleteTeacher = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const teacher = await Teacher.findById(id);
    
    if (!teacher) {
      const response: ApiResponse = {
        success: false,
        message: '教师不存在',
        error: '未找到指定ID的教师'
      };
      res.status(404).json(response);
      return;
    }

    // 软删除：将教师状态设为不活跃
    const updatedTeacher = await Teacher.findByIdAndUpdate(
      id,
      { $set: { isActive: false } },
      { new: true }
    );

    if (!updatedTeacher) {
      const response: ApiResponse = {
        success: false,
        message: '删除教师失败',
        error: '删除操作失败'
      };
      res.status(500).json(response);
      return;
    }

    const response: ApiResponse<TeacherResponse> = {
      success: true,
      message: '教师删除成功',
      data: transformTeacherToResponse(updatedTeacher)
    };

    res.status(200).json(response);
  } catch (error: any) {
    console.error('删除教师失败:', error);
    
    const response: ApiResponse = {
      success: false,
      message: '删除教师失败',
      error: error.message || '服务器内部错误'
    };
    
    res.status(500).json(response);
  }
};

/**
 * 永久删除教师（硬删除）
 * 
 * Args:
 *   req: Express请求对象，包含教师ID参数
 *   res: Express响应对象
 * 
 * Returns:
 *   Promise<void>: 返回删除结果或错误信息
 */export const permanentDeleteTeacher = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const deletedTeacher = await Teacher.findByIdAndDelete(id);
    
    if (!deletedTeacher) {
      const response: ApiResponse = {
        success: false,
        message: '教师不存在',
        error: '未找到指定ID的教师'
      };
      res.status(404).json(response);
      return;
    }

    const response: ApiResponse = {
      success: true,
      message: '教师永久删除成功'
    };

    res.status(200).json(response);
  } catch (error: any) {
    console.error('永久删除教师失败:', error);
    
    const response: ApiResponse = {
      success: false,
      message: '永久删除教师失败',
      error: error.message || '服务器内部错误'
    };
    
    res.status(500).json(response);
  }
};