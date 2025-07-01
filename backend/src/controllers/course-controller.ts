/**
 * 课程控制器
 * 
 * 处理课程相关的业务逻辑，包括课程的CRUD操作和课程管理
 */

import { Request, Response } from 'express';
import { Course, ICourse } from '../models/Course';
import { 
  ApiResponse, 
  CreateCourseRequest, 
  UpdateCourseRequest, 
  CourseResponse, 
  CourseQueryOptions, 
  PaginatedResponse 
} from '../types/api';

/**
 * 转换课程对象为响应格式
 * 
 * Args:
 *   course: 课程模型实例或lean对象
 * 
 * Returns:
 *   CourseResponse: 课程响应对象
 */
const transformCourseToResponse = (course: ICourse | any): CourseResponse => {
  return {
    _id: course._id?.toString() || course.id?.toString(),
    name: course.name,
    subject: course.subject,
    courseCode: course.courseCode,
    weeklyHours: course.weeklyHours,
    requiresContinuous: course.requiresContinuous,
    continuousHours: course.continuousHours,
    roomRequirements: course.roomRequirements,
    isWeeklyAlternating: course.isWeeklyAlternating,
    description: course.description,
    isActive: course.isActive,
    createdAt: course.createdAt,
    updatedAt: course.updatedAt
  };
};

/**
 * 创建新课程
 * 
 * Args:
 *   req: Express请求对象，包含CreateCourseRequest数据
 *   res: Express响应对象
 * 
 * Returns:
 *   Promise<void>: 创建成功返回新课程信息，失败返回错误信息
 */
export const createCourse = async (req: Request, res: Response): Promise<void> => {
  try {
    const courseData: CreateCourseRequest = req.body;

    // 检查课程编码是否已存在
    const existingCourse = await Course.findOne({ courseCode: courseData.courseCode.toUpperCase() });
    if (existingCourse) {
      const response: ApiResponse = {
        success: false,
        message: '课程创建失败',
        error: '课程编码已存在'
      };
      res.status(409).json(response);
      return;
    }

    // 创建新课程
    const newCourse = new Course(courseData);
    const savedCourse = await newCourse.save();

    const response: ApiResponse<CourseResponse> = {
      success: true,
      message: '课程创建成功',
      data: transformCourseToResponse(savedCourse)
    };

    res.status(201).json(response);
  } catch (error: any) {
    console.error('创建课程失败:', error);
    
    const response: ApiResponse = {
      success: false,
      message: '课程创建失败',
      error: error.message || '服务器内部错误'
    };
    
    res.status(500).json(response);
  }
};/**
 * 获取课程列表（支持分页和筛选）
 * 
 * Args:
 *   req: Express请求对象，包含查询参数
 *   res: Express响应对象
 * 
 * Returns:
 *   Promise<void>: 返回课程列表或错误信息
 */
export const getCourses = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      page = 1,
      limit = 10,
      sortBy = 'updatedAt',
      sortOrder = 'desc',
      keyword,
      subject,
      requiresContinuous,
      isActive
    } = req.query;

    // 构建查询条件
    const query: any = {};

    if (keyword) {
      query.$or = [
        { name: { $regex: keyword, $options: 'i' } },
        { courseCode: { $regex: keyword, $options: 'i' } },
        { description: { $regex: keyword, $options: 'i' } }
      ];
    }

    if (subject) {
      query.subject = subject;
    }

    if (requiresContinuous !== undefined) {
      query.requiresContinuous = requiresContinuous === 'true';
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
    const [courses, total] = await Promise.all([
      Course.find(query)
        .sort(sort)
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      Course.countDocuments(query)
    ]);

    // 转换数据格式
    const transformedCourses = courses.map(transformCourseToResponse);

    const paginatedResponse: PaginatedResponse<CourseResponse> = {
      items: transformedCourses,
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / Number(limit))
    };

    const response: ApiResponse<PaginatedResponse<CourseResponse>> = {
      success: true,
      message: '课程列表获取成功',
      data: paginatedResponse
    };

    res.status(200).json(response);
  } catch (error: any) {
    console.error('获取课程列表失败:', error);
    
    const response: ApiResponse = {
      success: false,
      message: '获取课程列表失败',
      error: error.message || '服务器内部错误'
    };
    
    res.status(500).json(response);
  }
};

/**
 * 根据ID获取单个课程
 * 
 * Args:
 *   req: Express请求对象，包含课程ID参数
 *   res: Express响应对象
 * 
 * Returns:
 *   Promise<void>: 返回课程信息或错误信息
 */
export const getCourseById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const course = await Course.findById(id).lean();
    
    if (!course) {
      const response: ApiResponse = {
        success: false,
        message: '课程不存在',
        error: '未找到指定ID的课程'
      };
      res.status(404).json(response);
      return;
    }

    const response: ApiResponse<CourseResponse> = {
      success: true,
      message: '课程信息获取成功',
      data: transformCourseToResponse(course)
    };

    res.status(200).json(response);
  } catch (error: any) {
    console.error('获取课程信息失败:', error);
    
    const response: ApiResponse = {
      success: false,
      message: '获取课程信息失败',
      error: error.message || '服务器内部错误'
    };
    
    res.status(500).json(response);
  }
};

/**
 * 更新课程信息
 * 
 * Args:
 *   req: Express请求对象，包含课程ID和更新数据
 *   res: Express响应对象
 * 
 * Returns:
 *   Promise<void>: 返回更新后的课程信息或错误信息
 */
export const updateCourse = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const updateData: UpdateCourseRequest = req.body;

    // 检查课程是否存在
    const existingCourse = await Course.findById(id);
    if (!existingCourse) {
      const response: ApiResponse = {
        success: false,
        message: '课程不存在',
        error: '未找到指定ID的课程'
      };
      res.status(404).json(response);
      return;
    }

    // 如果更新课程编码，检查是否与其他课程重复
    if (updateData.courseCode && updateData.courseCode !== existingCourse.courseCode) {
      const duplicateCourse = await Course.findOne({
        courseCode: updateData.courseCode.toUpperCase(),
        _id: { $ne: id }
      });
      
      if (duplicateCourse) {
        const response: ApiResponse = {
          success: false,
          message: '课程更新失败',
          error: '课程编码已存在'
        };
        res.status(409).json(response);
        return;
      }
    }

    // 更新课程信息
    const updatedCourse = await Course.findByIdAndUpdate(
      id,
      { ...updateData, updatedAt: new Date() },
      { new: true, runValidators: true }
    );

    const response: ApiResponse<CourseResponse> = {
      success: true,
      message: '课程更新成功',
      data: transformCourseToResponse(updatedCourse)
    };

    res.status(200).json(response);
  } catch (error: any) {
    console.error('更新课程失败:', error);
    
    const response: ApiResponse = {
      success: false,
      message: '课程更新失败',
      error: error.message || '服务器内部错误'
    };
    
    res.status(500).json(response);
  }
};

/**
 * 删除课程（软删除）
 * 
 * Args:
 *   req: Express请求对象，包含课程ID参数
 *   res: Express响应对象
 * 
 * Returns:
 *   Promise<void>: 返回删除结果或错误信息
 */
export const deleteCourse = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const course = await Course.findByIdAndUpdate(
      id,
      { isActive: false, updatedAt: new Date() },
      { new: true }
    );
    
    if (!course) {
      const response: ApiResponse = {
        success: false,
        message: '课程不存在',
        error: '未找到指定ID的课程'
      };
      res.status(404).json(response);
      return;
    }

    const response: ApiResponse = {
      success: true,
      message: '课程删除成功'
    };

    res.status(200).json(response);
  } catch (error: any) {
    console.error('删除课程失败:', error);
    
    const response: ApiResponse = {
      success: false,
      message: '删除课程失败',
      error: error.message || '服务器内部错误'
    };
    
    res.status(500).json(response);
  }
};

/**
 * 永久删除课程（硬删除）
 * 
 * Args:
 *   req: Express请求对象，包含课程ID参数
 *   res: Express响应对象
 * 
 * Returns:
 *   Promise<void>: 返回删除结果或错误信息
 */
export const permanentDeleteCourse = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const deletedCourse = await Course.findByIdAndDelete(id);
    
    if (!deletedCourse) {
      const response: ApiResponse = {
        success: false,
        message: '课程不存在',
        error: '未找到指定ID的课程'
      };
      res.status(404).json(response);
      return;
    }

    const response: ApiResponse = {
      success: true,
      message: '课程永久删除成功'
    };

    res.status(200).json(response);
  } catch (error: any) {
    console.error('永久删除课程失败:', error);
    
    const response: ApiResponse = {
      success: false,
      message: '永久删除课程失败',
      error: error.message || '服务器内部错误'
    };
    
    res.status(500).json(response);
  }
};