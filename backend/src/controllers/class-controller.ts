/**
 * 班级控制器
 * 
 * 处理班级相关的业务逻辑，包括班级的CRUD操作和班级管理
 */

import { Request, Response } from 'express';
import { Class, IClass } from '../models/Class';
import { 
  ApiResponse, 
  CreateClassRequest, 
  UpdateClassRequest, 
  ClassResponse, 
  ClassQueryOptions, 
  PaginatedResponse 
} from '../types/api';

/**
 * 转换班级对象为响应格式
 * 
 * Args:
 *   classObj: 班级模型实例或lean对象
 * 
 * Returns:
 *   ClassResponse: 班级响应对象
 */
const transformClassToResponse = (classObj: IClass | any): ClassResponse => {
  return {
    _id: classObj._id?.toString() || classObj.id?.toString(),
    name: classObj.name,
    grade: classObj.grade,
    studentCount: classObj.studentCount,
    homeroom: classObj.homeroom ? {
      _id: classObj.homeroom._id?.toString() || classObj.homeroom,
      name: classObj.homeroom.name || '',
      roomNumber: classObj.homeroom.roomNumber || ''
    } : undefined,
    classTeacher: classObj.classTeacher ? {
      _id: classObj.classTeacher._id?.toString() || classObj.classTeacher,
      name: classObj.classTeacher.name || '',
      employeeId: classObj.classTeacher.employeeId || ''
    } : undefined,
    academicYear: classObj.academicYear,
    semester: classObj.semester,
    isActive: classObj.isActive,
    createdAt: classObj.createdAt,
    updatedAt: classObj.updatedAt
  };
};

/**
 * 创建新班级
 * 
 * Args:
 *   req: Express请求对象，包含CreateClassRequest数据
 *   res: Express响应对象
 * 
 * Returns:
 *   Promise<void>: 创建成功返回新班级信息，失败返回错误信息
 */export const createClass = async (req: Request, res: Response): Promise<void> => {
  try {
    const classData: CreateClassRequest = req.body;

    // 检查班级名称是否已存在
    const existingClass = await Class.findOne({ 
      name: classData.name,
      academicYear: classData.academicYear,
      semester: classData.semester
    });
    
    if (existingClass) {
      const response: ApiResponse = {
        success: false,
        message: '班级创建失败',
        error: '该学年学期的班级名称已存在'
      };
      res.status(409).json(response);
      return;
    }

    // 创建新班级
    const newClass = new Class(classData);
    const savedClass = await newClass.save();
    
    // 查询关联数据
    const populatedClass = await Class.findById(savedClass._id)
      .populate('homeroom', 'name roomNumber')
      .populate('classTeacher', 'name employeeId');

    const response: ApiResponse<ClassResponse> = {
      success: true,
      message: '班级创建成功',
      data: transformClassToResponse(populatedClass)
    };

    res.status(201).json(response);
  } catch (error: any) {
    console.error('创建班级失败:', error);
    
    const response: ApiResponse = {
      success: false,
      message: '班级创建失败',
      error: error.message || '服务器内部错误'
    };
    
    res.status(500).json(response);
  }
};
/**
 * 获取班级列表（支持分页和筛选）
 * 
 * Args:
 *   req: Express请求对象，包含查询参数
 *   res: Express响应对象
 * 
 * Returns:
 *   Promise<void>: 返回班级列表或错误信息
 */
export const getClasses = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      page = 1,
      limit = 10,
      sortBy = 'updatedAt',
      sortOrder = 'desc',
      keyword,
      grade,
      academicYear,
      semester,
      isActive
    } = req.query;

    // 构建查询条件
    const query: any = {};

    if (keyword) {
      query.$or = [
        { name: { $regex: keyword, $options: 'i' } }
      ];
    }

    if (grade !== undefined) {
      query.grade = grade;
    }

    if (academicYear) {
      query.academicYear = academicYear;
    }

    if (semester !== undefined) {
      query.semester = semester;
    }

    if (isActive !== undefined) {
      query.isActive = isActive === 'true';
    }

    // 构建排序条件
    const sort: any = {};
    sort[sortBy as string] = sortOrder === 'asc' ? 1 : -1;

    // 计算跳过的文档数量
    const skip = (Number(page) - 1) * Number(limit);

    // 查询数据
    const [classes, total] = await Promise.all([
      Class.find(query)
        .populate('homeroom', 'name roomNumber')
        .populate('classTeacher', 'name employeeId')
        .sort(sort)
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      Class.countDocuments(query)
    ]);

    // 转换数据格式
    const transformedClasses = classes.map(transformClassToResponse);

    const paginatedResponse: PaginatedResponse<ClassResponse> = {
      items: transformedClasses,
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / Number(limit))
    };

    const response: ApiResponse<PaginatedResponse<ClassResponse>> = {
      success: true,
      message: '班级列表获取成功',
      data: paginatedResponse
    };

    res.status(200).json(response);
  } catch (error: any) {
    console.error('获取班级列表失败:', error);
    
    const response: ApiResponse = {
      success: false,
      message: '获取班级列表失败',
      error: error.message || '服务器内部错误'
    };
    
    res.status(500).json(response);
  }
};

/**
 * 根据ID获取单个班级
 * 
 * Args:
 *   req: Express请求对象，包含班级ID参数
 *   res: Express响应对象
 * 
 * Returns:
 *   Promise<void>: 返回班级信息或错误信息
 */
export const getClassById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const classData = await Class.findById(id)
      .populate('homeroom', 'name roomNumber')
      .populate('classTeacher', 'name employeeId')
      .lean();
    
    if (!classData) {
      const response: ApiResponse = {
        success: false,
        message: '班级不存在',
        error: '未找到指定ID的班级'
      };
      res.status(404).json(response);
      return;
    }

    const response: ApiResponse<ClassResponse> = {
      success: true,
      message: '班级信息获取成功',
      data: transformClassToResponse(classData)
    };

    res.status(200).json(response);
  } catch (error: any) {
    console.error('获取班级信息失败:', error);
    
    const response: ApiResponse = {
      success: false,
      message: '获取班级信息失败',
      error: error.message || '服务器内部错误'
    };
    
    res.status(500).json(response);
  }
};

/**
 * 更新班级信息
 * 
 * Args:
 *   req: Express请求对象，包含班级ID和更新数据
 *   res: Express响应对象
 * 
 * Returns:
 *   Promise<void>: 返回更新后的班级信息或错误信息
 */
export const updateClass = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const updateData: UpdateClassRequest = req.body;

    // 检查班级是否存在
    const existingClass = await Class.findById(id);
    if (!existingClass) {
      const response: ApiResponse = {
        success: false,
        message: '班级不存在',
        error: '未找到指定ID的班级'
      };
      res.status(404).json(response);
      return;
    }

    // 如果更新名称，检查是否与其他班级重复
    if (updateData.name && updateData.name !== existingClass.name) {
      const duplicateClass = await Class.findOne({
        name: updateData.name,
        academicYear: updateData.academicYear || existingClass.academicYear,
        semester: updateData.semester || existingClass.semester,
        _id: { $ne: id }
      });
      
      if (duplicateClass) {
        const response: ApiResponse = {
          success: false,
          message: '班级更新失败',
          error: '该学年学期的班级名称已存在'
        };
        res.status(400).json(response);
        return;
      }
    }

    // 更新班级信息
    const updatedClass = await Class.findByIdAndUpdate(
      id,
      { ...updateData, updatedAt: new Date() },
      { new: true, runValidators: true }
    )
      .populate('homeroom', 'name roomNumber')
      .populate('classTeacher', 'name employeeId');

    const response: ApiResponse<ClassResponse> = {
      success: true,
      message: '班级更新成功',
      data: transformClassToResponse(updatedClass)
    };

    res.status(200).json(response);
  } catch (error: any) {
    console.error('更新班级失败:', error);
    
    const response: ApiResponse = {
      success: false,
      message: '班级更新失败',
      error: error.message || '服务器内部错误'
    };
    
    res.status(500).json(response);
  }
};

/**
 * 删除班级（软删除）
 * 
 * Args:
 *   req: Express请求对象，包含班级ID参数
 *   res: Express响应对象
 * 
 * Returns:
 *   Promise<void>: 返回删除结果或错误信息
 */
export const deleteClass = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const classData = await Class.findByIdAndUpdate(
      id,
      { isActive: false, updatedAt: new Date() },
      { new: true }
    );
    
    if (!classData) {
      const response: ApiResponse = {
        success: false,
        message: '班级不存在',
        error: '未找到指定ID的班级'
      };
      res.status(404).json(response);
      return;
    }

    const response: ApiResponse = {
      success: true,
      message: '班级删除成功'
    };

    res.status(200).json(response);
  } catch (error: any) {
    console.error('删除班级失败:', error);
    
    const response: ApiResponse = {
      success: false,
      message: '删除班级失败',
      error: error.message || '服务器内部错误'
    };
    
    res.status(500).json(response);
  }
};

/**
 * 永久删除班级（硬删除）
 * 
 * Args:
 *   req: Express请求对象，包含班级ID参数
 *   res: Express响应对象
 * 
 * Returns:
 *   Promise<void>: 返回删除结果或错误信息
 */
export const permanentDeleteClass = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const deletedClass = await Class.findByIdAndDelete(id);
    
    if (!deletedClass) {
      const response: ApiResponse = {
        success: false,
        message: '班级不存在',
        error: '未找到指定ID的班级'
      };
      res.status(404).json(response);
      return;
    }

    const response: ApiResponse = {
      success: true,
      message: '班级永久删除成功'
    };

    res.status(200).json(response);
  } catch (error: any) {
    console.error('永久删除班级失败:', error);
    
    const response: ApiResponse = {
      success: false,
      message: '永久删除班级失败',
      error: error.message || '服务器内部错误'
    };
    
    res.status(500).json(response);
  }
};