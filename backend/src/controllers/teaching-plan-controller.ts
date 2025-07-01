/**
 * 教学计划控制器
 * 
 * 提供教学计划的CRUD操作、查询和审批功能
 */

import { Request, Response } from 'express';
import { TeachingPlan, ITeachingPlan } from '../models';
import { 
  ApiResponse, 
  PaginatedResponse, 
  CreateTeachingPlanRequest,
  UpdateTeachingPlanRequest,
  TeachingPlanQueryOptions,
  TeachingPlanResponse,
  ApproveTeachingPlanRequest
} from '../types/api';
import mongoose from 'mongoose';

/**
 * 创建教学计划
 * 
 * Args:
 *   req: Express请求对象，包含教学计划数据
 *   res: Express响应对象
 * 
 * Returns:
 *   Promise<void>: 返回创建的教学计划数据或错误信息
 */
export const createTeachingPlan = async (req: Request, res: Response): Promise<void> => {
  try {
    const planData: CreateTeachingPlanRequest = req.body;
    // TODO: 实现用户认证中间件后启用
    // const userId = req.user?.id; // 从认证中间件获取用户ID
    const userId = 'temporary-user-id'; // 临时用户ID，待实现认证后修改

    // 检查是否已存在相同班级、学年、学期的教学计划
    const existingPlan = await TeachingPlan.findOne({
      class: planData.class,
      academicYear: planData.academicYear,
      semester: planData.semester,
      isActive: true
    });

    if (existingPlan) {
      const response: ApiResponse = {
        success: false,
        message: '创建教学计划失败',
        error: '该班级在指定学年学期已存在教学计划'
      };
      res.status(400).json(response);
      return;
    }

    // 创建教学计划
    const teachingPlan = new TeachingPlan({
      ...planData,
      createdBy: userId
    });

    const savedPlan = await teachingPlan.save();

    // 获取完整的教学计划数据（包含关联信息）
    const fullPlan = await TeachingPlan.findById(savedPlan._id)
      .populate([
        { path: 'class', select: 'name grade' },
        { path: 'courseAssignments.course', select: 'name subject courseCode weeklyHours' },
        { path: 'courseAssignments.teacher', select: 'name employeeId subjects' },
        { path: 'createdBy', select: 'username profile.name' }
      ]);

    const response: ApiResponse<TeachingPlanResponse> = {
      success: true,
      message: '教学计划创建成功',
      data: transformTeachingPlanToResponse(fullPlan!)
    };

    res.status(201).json(response);
  } catch (error) {
    console.error('创建教学计划错误:', error);
    
    const response: ApiResponse = {
      success: false,
      message: '创建教学计划失败',
      error: error instanceof Error ? error.message : '服务器内部错误'
    };

    res.status(500).json(response);
  }
};

/**
 * 获取教学计划列表
 * 
 * Args:
 *   req: Express请求对象，包含查询参数
 *   res: Express响应对象
 * 
 * Returns:
 *   Promise<void>: 返回分页的教学计划列表
 */
export const getTeachingPlans = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      class: classId,
      academicYear,
      semester,
      status,
      teacher,
      course,
      isActive,
      keyword
    }: TeachingPlanQueryOptions = req.query;

    // 构建查询条件
    const query: any = {};

    if (classId) {
      query.class = classId;
    }

    if (academicYear) {
      query.academicYear = academicYear;
    }

    if (semester) {
      query.semester = parseInt(semester.toString());
    }

    if (status) {
      query.status = status;
    }

    if (isActive !== undefined) {
      query.isActive = isActive === 'true' || isActive === true;
    }

    // 如果指定了教师，查找包含该教师的教学计划
    if (teacher) {
      query['courseAssignments.teacher'] = teacher;
    }

    // 如果指定了课程，查找包含该课程的教学计划
    if (course) {
      query['courseAssignments.course'] = course;
    }

    // 关键词搜索（班级名称或备注）
    if (keyword) {
      const classIds = await mongoose.model('Class').find({
        name: { $regex: keyword, $options: 'i' }
      }).distinct('_id');

      query.$or = [
        { class: { $in: classIds } },
        { notes: { $regex: keyword, $options: 'i' } }
      ];
    }

    // 构建排序条件
    const sortCondition: any = {};
    sortCondition[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // 计算跳过的文档数量
    const skip = (Number(page) - 1) * Number(limit);

    // 执行查询
    const [plans, total] = await Promise.all([
      TeachingPlan.find(query)
        .populate([
          { path: 'class', select: 'name grade' },
          { path: 'courseAssignments.course', select: 'name subject courseCode weeklyHours' },
          { path: 'courseAssignments.teacher', select: 'name employeeId subjects' },
          { path: 'createdBy', select: 'username profile.name' },
          { path: 'updatedBy', select: 'username profile.name' },
          { path: 'approvedBy', select: 'username profile.name' }
        ])
        .sort(sortCondition)
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      TeachingPlan.countDocuments(query)
    ]);

    const paginatedData: PaginatedResponse<TeachingPlanResponse> = {
      items: plans.map(transformTeachingPlanToResponse),
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / Number(limit))
    };

    const response: ApiResponse<PaginatedResponse<TeachingPlanResponse>> = {
      success: true,
      message: '获取教学计划列表成功',
      data: paginatedData
    };

    res.json(response);
  } catch (error) {
    console.error('获取教学计划列表错误:', error);
    
    const response: ApiResponse = {
      success: false,
      message: '获取教学计划列表失败',
      error: error instanceof Error ? error.message : '服务器内部错误'
    };

    res.status(500).json(response);
  }
};

/**
 * 根据ID获取单个教学计划
 * 
 * Args:
 *   req: Express请求对象，包含教学计划ID
 *   res: Express响应对象
 * 
 * Returns:
 *   Promise<void>: 返回教学计划详情
 */
export const getTeachingPlanById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      const response: ApiResponse = {
        success: false,
        message: '获取教学计划失败',
        error: '无效的教学计划ID'
      };
      res.status(400).json(response);
      return;
    }

    const plan = await TeachingPlan.findById(id)
      .populate([
        { path: 'class', select: 'name grade' },
        { path: 'courseAssignments.course', select: 'name subject courseCode weeklyHours' },
        { path: 'courseAssignments.teacher', select: 'name employeeId subjects' },
        { path: 'createdBy', select: 'username profile.name' },
        { path: 'updatedBy', select: 'username profile.name' },
        { path: 'approvedBy', select: 'username profile.name' }
      ]);

    if (!plan) {
      const response: ApiResponse = {
        success: false,
        message: '获取教学计划失败',
        error: '教学计划不存在'
      };
      res.status(404).json(response);
      return;
    }

    const response: ApiResponse<TeachingPlanResponse> = {
      success: true,
      message: '获取教学计划成功',
      data: transformTeachingPlanToResponse(plan)
    };

    res.json(response);
  } catch (error) {
    console.error('获取教学计划错误:', error);
    
    const response: ApiResponse = {
      success: false,
      message: '获取教学计划失败',
      error: error instanceof Error ? error.message : '服务器内部错误'
    };

    res.status(500).json(response);
  }
};

/**
 * 更新教学计划
 * 
 * Args:
 *   req: Express请求对象，包含教学计划ID和更新数据
 *   res: Express响应对象
 * 
 * Returns:
 *   Promise<void>: 返回更新后的教学计划数据
 */
export const updateTeachingPlan = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const updateData: UpdateTeachingPlanRequest = req.body;
    // TODO: 实现用户认证中间件后启用
    // const userId = req.user?.id;
    const userId = 'temporary-user-id'; // 临时用户ID，待实现认证后修改

    if (!mongoose.Types.ObjectId.isValid(id)) {
      const response: ApiResponse = {
        success: false,
        message: '更新教学计划失败',
        error: '无效的教学计划ID'
      };
      res.status(400).json(response);
      return;
    }

    const plan = await TeachingPlan.findById(id);
    
    if (!plan) {
      const response: ApiResponse = {
        success: false,
        message: '更新教学计划失败',
        error: '教学计划不存在'
      };
      res.status(404).json(response);
      return;
    }

    // 检查计划状态，已审批的计划不能直接修改
    if (plan.status === 'approved' && updateData.status !== 'draft') {
      const response: ApiResponse = {
        success: false,
        message: '更新教学计划失败',
        error: '已审批的教学计划不能直接修改，请先撤销审批'
      };
      res.status(400).json(response);
      return;
    }

    // 更新教学计划数据
    Object.assign(plan, updateData, { updatedBy: userId });
    
    const updatedPlan = await plan.save();

    // 获取完整的教学计划数据
    const fullPlan = await TeachingPlan.findById(updatedPlan._id)
      .populate([
        { path: 'class', select: 'name grade' },
        { path: 'courseAssignments.course', select: 'name subject courseCode weeklyHours' },
        { path: 'courseAssignments.teacher', select: 'name employeeId subjects' },
        { path: 'createdBy', select: 'username profile.name' },
        { path: 'updatedBy', select: 'username profile.name' },
        { path: 'approvedBy', select: 'username profile.name' }
      ]);

    const response: ApiResponse<TeachingPlanResponse> = {
      success: true,
      message: '教学计划更新成功',
      data: transformTeachingPlanToResponse(fullPlan!)
    };

    res.json(response);
  } catch (error) {
    console.error('更新教学计划错误:', error);
    
    const response: ApiResponse = {
      success: false,
      message: '更新教学计划失败',
      error: error instanceof Error ? error.message : '服务器内部错误'
    };

    res.status(500).json(response);
  }
};/**
 * 删除教学计划（软删除）
 * 
 * Args:
 *   req: Express请求对象，包含教学计划ID
 *   res: Express响应对象
 * 
 * Returns:
 *   Promise<void>: 返回删除操作结果
 */
export const deleteTeachingPlan = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      const response: ApiResponse = {
        success: false,
        message: '删除教学计划失败',
        error: '无效的教学计划ID'
      };
      res.status(400).json(response);
      return;
    }

    const plan = await TeachingPlan.findById(id);
    
    if (!plan) {
      const response: ApiResponse = {
        success: false,
        message: '删除教学计划失败',
        error: '教学计划不存在'
      };
      res.status(404).json(response);
      return;
    }

    // 检查计划状态，激活状态的计划不能删除
    if (plan.status === 'active') {
      const response: ApiResponse = {
        success: false,
        message: '删除教学计划失败',
        error: '激活状态的教学计划不能删除'
      };
      res.status(400).json(response);
      return;
    }

    // 软删除
    plan.isActive = false;
    await plan.save();

    const response: ApiResponse = {
      success: true,
      message: '教学计划删除成功'
    };

    res.json(response);
  } catch (error) {
    console.error('删除教学计划错误:', error);
    
    const response: ApiResponse = {
      success: false,
      message: '删除教学计划失败',
      error: error instanceof Error ? error.message : '服务器内部错误'
    };

    res.status(500).json(response);
  }
};

/**
 * 永久删除教学计划（硬删除）
 * 
 * Args:
 *   req: Express请求对象，包含教学计划ID
 *   res: Express响应对象
 * 
 * Returns:
 *   Promise<void>: 返回删除操作结果
 */
export const permanentDeleteTeachingPlan = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      const response: ApiResponse = {
        success: false,
        message: '永久删除教学计划失败',
        error: '无效的教学计划ID'
      };
      res.status(400).json(response);
      return;
    }

    const plan = await TeachingPlan.findById(id);
    
    if (!plan) {
      const response: ApiResponse = {
        success: false,
        message: '永久删除教学计划失败',
        error: '教学计划不存在'
      };
      res.status(404).json(response);
      return;
    }

    // 检查计划状态，只有草稿状态或已归档的计划才能永久删除
    if (!['draft', 'archived'].includes(plan.status)) {
      const response: ApiResponse = {
        success: false,
        message: '永久删除教学计划失败',
        error: '只有草稿状态或已归档的教学计划才能永久删除'
      };
      res.status(400).json(response);
      return;
    }

    // 硬删除
    await TeachingPlan.findByIdAndDelete(id);

    const response: ApiResponse = {
      success: true,
      message: '教学计划永久删除成功'
    };

    res.json(response);
  } catch (error) {
    console.error('永久删除教学计划错误:', error);
    
    const response: ApiResponse = {
      success: false,
      message: '永久删除教学计划失败',
      error: error instanceof Error ? error.message : '服务器内部错误'
    };

    res.status(500).json(response);
  }
};

/**
 * 审批教学计划
 * 
 * Args:
 *   req: Express请求对象，包含教学计划ID和审批数据
 *   res: Express响应对象
 * 
 * Returns:
 *   Promise<void>: 返回审批操作结果
 */
export const approveTeachingPlan = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { approve, comments }: ApproveTeachingPlanRequest = req.body;
    // TODO: 实现用户认证中间件后启用
    // const userId = req.user?.id;
    const userId = 'temporary-user-id'; // 临时用户ID，待实现认证后修改

    if (!mongoose.Types.ObjectId.isValid(id)) {
      const response: ApiResponse = {
        success: false,
        message: '审批教学计划失败',
        error: '无效的教学计划ID'
      };
      res.status(400).json(response);
      return;
    }

    const plan = await TeachingPlan.findById(id);
    
    if (!plan) {
      const response: ApiResponse = {
        success: false,
        message: '审批教学计划失败',
        error: '教学计划不存在'
      };
      res.status(404).json(response);
      return;
    }

    // 检查计划状态，只有草稿状态的计划可以审批
    if (plan.status !== 'draft') {
      const response: ApiResponse = {
        success: false,
        message: '审批教学计划失败',
        error: '只有草稿状态的教学计划可以审批'
      };
      res.status(400).json(response);
      return;
    }

    // 更新审批信息
    if (approve) {
      plan.status = 'approved';
      plan.approvedBy = new mongoose.Types.ObjectId(userId);
      plan.approvedAt = new Date();
    } else {
      plan.status = 'draft'; // 审批拒绝后保持草稿状态
    }

    if (comments) {
      plan.notes = plan.notes ? `${plan.notes}\n\n审批意见: ${comments}` : `审批意见: ${comments}`;
    }

    plan.updatedBy = new mongoose.Types.ObjectId(userId);
    await plan.save();

    // 获取完整的教学计划数据
    const fullPlan = await TeachingPlan.findById(plan._id)
      .populate([
        { path: 'class', select: 'name grade' },
        { path: 'courseAssignments.course', select: 'name subject courseCode weeklyHours' },
        { path: 'courseAssignments.teacher', select: 'name employeeId subjects' },
        { path: 'createdBy', select: 'username profile.name' },
        { path: 'updatedBy', select: 'username profile.name' },
        { path: 'approvedBy', select: 'username profile.name' }
      ]);

    const response: ApiResponse<TeachingPlanResponse> = {
      success: true,
      message: approve ? '教学计划审批通过' : '教学计划审批拒绝',
      data: transformTeachingPlanToResponse(fullPlan!)
    };

    res.json(response);
  } catch (error) {
    console.error('审批教学计划错误:', error);
    
    const response: ApiResponse = {
      success: false,
      message: '审批教学计划失败',
      error: error instanceof Error ? error.message : '服务器内部错误'
    };

    res.status(500).json(response);
  }
};

/**
 * 获取班级的当前教学计划
 * 
 * Args:
 *   req: Express请求对象，包含班级ID、学年、学期
 *   res: Express响应对象
 * 
 * Returns:
 *   Promise<void>: 返回班级的当前教学计划
 */
export const getCurrentPlan = async (req: Request, res: Response): Promise<void> => {
  try {
    const { classId, academicYear, semester } = req.params;

    if (!mongoose.Types.ObjectId.isValid(classId)) {
      const response: ApiResponse = {
        success: false,
        message: '获取当前教学计划失败',
        error: '无效的班级ID'
      };
      res.status(400).json(response);
      return;
    }

    const plan = await TeachingPlan.findCurrentPlan(
      new mongoose.Types.ObjectId(classId),
      academicYear,
      parseInt(semester)
    );

    if (!plan) {
      const response: ApiResponse = {
        success: false,
        message: '获取当前教学计划失败',
        error: '当前班级在指定学年学期没有教学计划'
      };
      res.status(404).json(response);
      return;
    }

    const response: ApiResponse<TeachingPlanResponse> = {
      success: true,
      message: '获取当前教学计划成功',
      data: transformTeachingPlanToResponse(plan)
    };

    res.json(response);
  } catch (error) {
    console.error('获取当前教学计划错误:', error);
    
    const response: ApiResponse = {
      success: false,
      message: '获取当前教学计划失败',
      error: error instanceof Error ? error.message : '服务器内部错误'
    };

    res.status(500).json(response);
  }
};

// ==================== 工具函数 ====================

/**
 * 将教学计划文档转换为API响应格式
 * 
 * Args:
 *   plan: 教学计划文档 (含关联数据)
 * 
 * Returns:
 *   TeachingPlanResponse: API响应格式的教学计划数据
 */
function transformTeachingPlanToResponse(plan: any): TeachingPlanResponse {
  return {
    _id: plan._id.toString(),
    class: {
      _id: plan.class._id.toString(),
      name: plan.class.name,
      grade: plan.class.grade
    },
    academicYear: plan.academicYear,
    semester: plan.semester,
    courseAssignments: plan.courseAssignments.map((assignment: any) => ({
      course: {
        _id: assignment.course._id.toString(),
        name: assignment.course.name,
        subject: assignment.course.subject,
        courseCode: assignment.course.courseCode,
        weeklyHours: assignment.course.weeklyHours
      },
      teacher: {
        _id: assignment.teacher._id.toString(),
        name: assignment.teacher.name,
        employeeId: assignment.teacher.employeeId,
        subjects: assignment.teacher.subjects
      },
      weeklyHours: assignment.weeklyHours,
      requiresContinuous: assignment.requiresContinuous,
      continuousHours: assignment.continuousHours,
      preferredTimeSlots: assignment.preferredTimeSlots,
      avoidTimeSlots: assignment.avoidTimeSlots,
      notes: assignment.notes
    })),
    totalWeeklyHours: plan.totalWeeklyHours,
    status: plan.status,
    approvedBy: plan.approvedBy ? {
      _id: plan.approvedBy._id.toString(),
      username: plan.approvedBy.username,
      profile: { name: plan.approvedBy.profile.name }
    } : undefined,
    approvedAt: plan.approvedAt,
    notes: plan.notes,
    createdBy: {
      _id: plan.createdBy._id.toString(),
      username: plan.createdBy.username,
      profile: { name: plan.createdBy.profile.name }
    },
    updatedBy: plan.updatedBy ? {
      _id: plan.updatedBy._id.toString(),
      username: plan.updatedBy.username,
      profile: { name: plan.updatedBy.profile.name }
    } : undefined,
    isActive: plan.isActive,
    createdAt: plan.createdAt,
    updatedAt: plan.updatedAt
  };
}