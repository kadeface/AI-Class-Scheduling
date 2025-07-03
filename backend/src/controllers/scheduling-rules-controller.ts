/**
 * 排课规则控制器
 * 
 * 提供排课规则的CRUD操作、查询和默认规则管理功能
 */

import { Request, Response } from 'express';
import { SchedulingRules, ISchedulingRules } from '../models';
import { 
  ApiResponse, 
  PaginatedResponse, 
  CreateSchedulingRulesRequest,
  UpdateSchedulingRulesRequest,
  SchedulingRulesQueryOptions,
  SchedulingRulesResponse
} from '../types/api';
import mongoose from 'mongoose';

/**
 * 创建排课规则
 * 
 * Args:
 *   req: Express请求对象，包含排课规则数据
 *   res: Express响应对象
 * 
 * Returns:
 *   Promise<void>: 返回创建的排课规则数据或错误信息
 */
export const createSchedulingRules = async (req: Request, res: Response): Promise<void> => {
  try {
    const rulesData: CreateSchedulingRulesRequest = req.body;
    // TODO: 实现用户认证中间件后启用
    // const userId = req.user?.id;
    const userId = new mongoose.Types.ObjectId('6862641baff97ed1dbda1987'); // 使用系统管理员ID，待实现认证后修改

    // 如果设置为默认规则，检查是否已存在默认规则
    if (rulesData.isDefault) {
      const existingDefault = await SchedulingRules.findOne({
        academicYear: rulesData.academicYear,
        semester: rulesData.semester,
        isDefault: true,
        isActive: true
      });

      if (existingDefault) {
        const response: ApiResponse = {
          success: false,
          message: '创建排课规则失败',
          error: '该学年学期已存在默认排课规则'
        };
        res.status(400).json(response);
        return;
      }
    }

    // 创建排课规则
    const schedulingRules = new SchedulingRules({
      ...rulesData,
      createdBy: userId
    });

    const savedRules = await schedulingRules.save();

    // 获取完整的排课规则数据（包含关联信息）
    const fullRules = await SchedulingRules.findById(savedRules._id)
      .populate([
        { path: 'createdBy', select: 'username profile.name' }
      ]);

    const response: ApiResponse<SchedulingRulesResponse> = {
      success: true,
      message: '排课规则创建成功',
      data: transformSchedulingRulesToResponse(fullRules!)
    };

    res.status(201).json(response);
  } catch (error) {
    console.error('创建排课规则错误:', error);
    
    const response: ApiResponse = {
      success: false,
      message: '创建排课规则失败',
      error: error instanceof Error ? error.message : '服务器内部错误'
    };

    res.status(500).json(response);
  }
};

/**
 * 获取排课规则列表
 * 
 * Args:
 *   req: Express请求对象，包含查询参数
 *   res: Express响应对象
 * 
 * Returns:
 *   Promise<void>: 返回分页的排课规则列表
 */
export const getSchedulingRules = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      schoolType,
      academicYear,
      semester,
      isDefault,
      isActive,
      keyword
    }: SchedulingRulesQueryOptions = req.query;

    // 构建查询条件
    const query: any = {};

    if (schoolType) {
      query.schoolType = schoolType;
    }

    if (academicYear) {
      query.academicYear = academicYear;
    }

    if (semester) {
      query.semester = parseInt(semester.toString());
    }

    if (isDefault !== undefined) {
      query.isDefault = isDefault === 'true' || isDefault === true;
    }

    if (isActive !== undefined) {
      query.isActive = isActive === 'true' || isActive === true;
    }

    // 关键词搜索（规则集名称或描述）
    if (keyword) {
      query.$or = [
        { name: { $regex: keyword, $options: 'i' } },
        { description: { $regex: keyword, $options: 'i' } }
      ];
    }

    // 构建排序条件
    const sortCondition: any = {};
    sortCondition[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // 计算跳过的文档数量
    const skip = (Number(page) - 1) * Number(limit);

    // 执行查询
    const [rules, total] = await Promise.all([
      SchedulingRules.find(query)
        .populate([
          { path: 'createdBy', select: 'username profile.name' },
          { path: 'updatedBy', select: 'username profile.name' }
        ])
        .sort(sortCondition)
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      SchedulingRules.countDocuments(query)
    ]);

    const paginatedData: PaginatedResponse<SchedulingRulesResponse> = {
      items: rules.map(transformSchedulingRulesToResponse),
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / Number(limit))
    };

    const response: ApiResponse<PaginatedResponse<SchedulingRulesResponse>> = {
      success: true,
      message: '获取排课规则列表成功',
      data: paginatedData
    };

    res.json(response);
  } catch (error) {
    console.error('获取排课规则列表错误:', error);
    
    const response: ApiResponse = {
      success: false,
      message: '获取排课规则列表失败',
      error: error instanceof Error ? error.message : '服务器内部错误'
    };

    res.status(500).json(response);
  }
};

/**
 * 根据ID获取单个排课规则
 * 
 * Args:
 *   req: Express请求对象，包含排课规则ID
 *   res: Express响应对象
 * 
 * Returns:
 *   Promise<void>: 返回排课规则详情
 */
export const getSchedulingRulesById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      const response: ApiResponse = {
        success: false,
        message: '获取排课规则失败',
        error: '无效的排课规则ID'
      };
      res.status(400).json(response);
      return;
    }

    const rules = await SchedulingRules.findById(id)
      .populate([
        { path: 'createdBy', select: 'username profile.name' },
        { path: 'updatedBy', select: 'username profile.name' }
      ]);

    if (!rules) {
      const response: ApiResponse = {
        success: false,
        message: '获取排课规则失败',
        error: '排课规则不存在'
      };
      res.status(404).json(response);
      return;
    }

    const response: ApiResponse<SchedulingRulesResponse> = {
      success: true,
      message: '获取排课规则成功',
      data: transformSchedulingRulesToResponse(rules)
    };

    res.json(response);
  } catch (error) {
    console.error('获取排课规则错误:', error);
    
    const response: ApiResponse = {
      success: false,
      message: '获取排课规则失败',
      error: error instanceof Error ? error.message : '服务器内部错误'
    };

    res.status(500).json(response);
  }
};

/**
 * 更新排课规则
 * 
 * Args:
 *   req: Express请求对象，包含排课规则ID和更新数据
 *   res: Express响应对象
 * 
 * Returns:
 *   Promise<void>: 返回更新后的排课规则数据
 */
export const updateSchedulingRules = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const updateData: UpdateSchedulingRulesRequest = req.body;
    // TODO: 实现用户认证中间件后启用
    // const userId = req.user?.id;
    const userId = new mongoose.Types.ObjectId('6862641baff97ed1dbda1987'); // 使用系统管理员ID，待实现认证后修改

    if (!mongoose.Types.ObjectId.isValid(id)) {
      const response: ApiResponse = {
        success: false,
        message: '更新排课规则失败',
        error: '无效的排课规则ID'
      };
      res.status(400).json(response);
      return;
    }

    const rules = await SchedulingRules.findById(id);
    
    if (!rules) {
      const response: ApiResponse = {
        success: false,
        message: '更新排课规则失败',
        error: '排课规则不存在'
      };
      res.status(404).json(response);
      return;
    }

    // 如果要设置为默认规则，检查是否已存在其他默认规则
    if (updateData.isDefault && !rules.isDefault) {
      const existingDefault = await SchedulingRules.findOne({
        academicYear: rules.academicYear,
        semester: rules.semester,
        isDefault: true,
        isActive: true,
        _id: { $ne: id }
      });

      if (existingDefault) {
        const response: ApiResponse = {
          success: false,
          message: '更新排课规则失败',
          error: '该学年学期已存在其他默认排课规则'
        };
        res.status(400).json(response);
        return;
      }
    }

    // 更新排课规则数据
    Object.assign(rules, updateData, { updatedBy: userId });
    
    const updatedRules = await rules.save();

    // 获取完整的排课规则数据
    const fullRules = await SchedulingRules.findById(updatedRules._id)
      .populate([
        { path: 'createdBy', select: 'username profile.name' },
        { path: 'updatedBy', select: 'username profile.name' }
      ]);

    const response: ApiResponse<SchedulingRulesResponse> = {
      success: true,
      message: '排课规则更新成功',
      data: transformSchedulingRulesToResponse(fullRules!)
    };

    res.json(response);
  } catch (error) {
    console.error('更新排课规则错误:', error);
    
    const response: ApiResponse = {
      success: false,
      message: '更新排课规则失败',
      error: error instanceof Error ? error.message : '服务器内部错误'
    };

    res.status(500).json(response);
  }
};/**
 * 删除排课规则（软删除）
 * 
 * Args:
 *   req: Express请求对象，包含排课规则ID
 *   res: Express响应对象
 * 
 * Returns:
 *   Promise<void>: 返回删除操作结果
 */
export const deleteSchedulingRules = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      const response: ApiResponse = {
        success: false,
        message: '删除排课规则失败',
        error: '无效的排课规则ID'
      };
      res.status(400).json(response);
      return;
    }

    const rules = await SchedulingRules.findById(id);
    
    if (!rules) {
      const response: ApiResponse = {
        success: false,
        message: '删除排课规则失败',
        error: '排课规则不存在'
      };
      res.status(404).json(response);
      return;
    }

    // 检查是否为默认规则，默认规则不能删除
    if (rules.isDefault) {
      const response: ApiResponse = {
        success: false,
        message: '删除排课规则失败',
        error: '默认排课规则不能删除，请先取消默认设置'
      };
      res.status(400).json(response);
      return;
    }

    // 软删除
    rules.isActive = false;
    await rules.save();

    const response: ApiResponse = {
      success: true,
      message: '排课规则删除成功'
    };

    res.json(response);
  } catch (error) {
    console.error('删除排课规则错误:', error);
    
    const response: ApiResponse = {
      success: false,
      message: '删除排课规则失败',
      error: error instanceof Error ? error.message : '服务器内部错误'
    };

    res.status(500).json(response);
  }
};

/**
 * 永久删除排课规则（硬删除）
 * 
 * Args:
 *   req: Express请求对象，包含排课规则ID
 *   res: Express响应对象
 * 
 * Returns:
 *   Promise<void>: 返回删除操作结果
 */
export const permanentDeleteSchedulingRules = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      const response: ApiResponse = {
        success: false,
        message: '永久删除排课规则失败',
        error: '无效的排课规则ID'
      };
      res.status(400).json(response);
      return;
    }

    const rules = await SchedulingRules.findById(id);
    
    if (!rules) {
      const response: ApiResponse = {
        success: false,
        message: '永久删除排课规则失败',
        error: '排课规则不存在'
      };
      res.status(404).json(response);
      return;
    }

    // 检查是否为默认规则或激活状态，都不能永久删除
    if (rules.isDefault || rules.isActive) {
      const response: ApiResponse = {
        success: false,
        message: '永久删除排课规则失败',
        error: '默认规则或激活状态的规则不能永久删除'
      };
      res.status(400).json(response);
      return;
    }

    // 硬删除
    await SchedulingRules.findByIdAndDelete(id);

    const response: ApiResponse = {
      success: true,
      message: '排课规则永久删除成功'
    };

    res.json(response);
  } catch (error) {
    console.error('永久删除排课规则错误:', error);
    
    const response: ApiResponse = {
      success: false,
      message: '永久删除排课规则失败',
      error: error instanceof Error ? error.message : '服务器内部错误'
    };

    res.status(500).json(response);
  }
};

/**
 * 设置默认排课规则
 * 
 * Args:
 *   req: Express请求对象，包含排课规则ID
 *   res: Express响应对象
 * 
 * Returns:
 *   Promise<void>: 返回设置操作结果
 */
export const setDefaultRules = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      const response: ApiResponse = {
        success: false,
        message: '设置默认规则失败',
        error: '无效的排课规则ID'
      };
      res.status(400).json(response);
      return;
    }

    const rules = await SchedulingRules.findById(id);
    
    if (!rules) {
      const response: ApiResponse = {
        success: false,
        message: '设置默认规则失败',
        error: '排课规则不存在'
      };
      res.status(404).json(response);
      return;
    }

    if (!rules.isActive) {
      const response: ApiResponse = {
        success: false,
        message: '设置默认规则失败',
        error: '非激活状态的规则不能设为默认'
      };
      res.status(400).json(response);
      return;
    }

    // 使用模型方法设置为默认规则
    await rules.setAsDefault();

    // 获取更新后的数据
    const updatedRules = await SchedulingRules.findById(id)
      .populate([
        { path: 'createdBy', select: 'username profile.name' },
        { path: 'updatedBy', select: 'username profile.name' }
      ]);

    const response: ApiResponse<SchedulingRulesResponse> = {
      success: true,
      message: '设置默认排课规则成功',
      data: transformSchedulingRulesToResponse(updatedRules!)
    };

    res.json(response);
  } catch (error) {
    console.error('设置默认规则错误:', error);
    
    const response: ApiResponse = {
      success: false,
      message: '设置默认规则失败',
      error: error instanceof Error ? error.message : '服务器内部错误'
    };

    res.status(500).json(response);
  }
};

/**
 * 获取默认排课规则
 * 
 * Args:
 *   req: Express请求对象，包含学年和学期参数
 *   res: Express响应对象
 * 
 * Returns:
 *   Promise<void>: 返回默认排课规则
 */
export const getDefaultRules = async (req: Request, res: Response): Promise<void> => {
  try {
    const { academicYear, semester } = req.params;

    if (!academicYear || !semester) {
      const response: ApiResponse = {
        success: false,
        message: '获取默认排课规则失败',
        error: '学年和学期参数不能为空'
      };
      res.status(400).json(response);
      return;
    }

    const rules = await SchedulingRules.findOne({
      academicYear,
      semester: parseInt(semester),
      isDefault: true,
      isActive: true
    }).populate([
      { path: 'createdBy', select: 'username profile.name' },
      { path: 'updatedBy', select: 'username profile.name' }
    ]);

    if (!rules) {
      const response: ApiResponse = {
        success: false,
        message: '获取默认排课规则失败',
        error: '指定学年学期没有默认排课规则'
      };
      res.status(404).json(response);
      return;
    }

    const response: ApiResponse<SchedulingRulesResponse> = {
      success: true,
      message: '获取默认排课规则成功',
      data: transformSchedulingRulesToResponse(rules)
    };

    res.json(response);
  } catch (error) {
    console.error('获取默认排课规则错误:', error);
    
    const response: ApiResponse = {
      success: false,
      message: '获取默认排课规则失败',
      error: error instanceof Error ? error.message : '服务器内部错误'
    };

    res.status(500).json(response);
  }
};

/**
 * 复制排课规则
 * 
 * Args:
 *   req: Express请求对象，包含源规则ID和目标学年学期
 *   res: Express响应对象
 * 
 * Returns:
 *   Promise<void>: 返回复制的排课规则数据
 */
export const copySchedulingRules = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { targetAcademicYear, targetSemester, newName } = req.body;
    // TODO: 实现用户认证中间件后启用
    // const userId = req.user?.id;
    const userId = new mongoose.Types.ObjectId('6862641baff97ed1dbda1987'); // 使用系统管理员ID，待实现认证后修改

    if (!mongoose.Types.ObjectId.isValid(id)) {
      const response: ApiResponse = {
        success: false,
        message: '复制排课规则失败',
        error: '无效的排课规则ID'
      };
      res.status(400).json(response);
      return;
    }

    if (!targetAcademicYear || !targetSemester || !newName) {
      const response: ApiResponse = {
        success: false,
        message: '复制排课规则失败',
        error: '目标学年、学期和新名称不能为空'
      };
      res.status(400).json(response);
      return;
    }

    const sourceRules = await SchedulingRules.findById(id);
    
    if (!sourceRules) {
      const response: ApiResponse = {
        success: false,
        message: '复制排课规则失败',
        error: '源排课规则不存在'
      };
      res.status(404).json(response);
      return;
    }

    // 检查目标学年学期是否已存在同名规则
    const existingRules = await SchedulingRules.findOne({
      name: newName,
      academicYear: targetAcademicYear,
      semester: targetSemester,
      isActive: true
    });

    if (existingRules) {
      const response: ApiResponse = {
        success: false,
        message: '复制排课规则失败',
        error: '目标学年学期已存在同名规则'
      };
      res.status(400).json(response);
      return;
    }

    // 创建新规则（复制源规则的所有配置）
    const newRules = new SchedulingRules({
      name: newName,
      description: sourceRules.description ? `复制自: ${sourceRules.name}` : undefined,
      schoolType: sourceRules.schoolType,
      academicYear: targetAcademicYear,
      semester: targetSemester,
      timeRules: sourceRules.timeRules,
      teacherConstraints: sourceRules.teacherConstraints,
      roomConstraints: sourceRules.roomConstraints,
      courseArrangementRules: sourceRules.courseArrangementRules,
      conflictResolutionRules: sourceRules.conflictResolutionRules,
      isDefault: false, // 复制的规则默认不是默认规则
      createdBy: userId
    });

    const savedRules = await newRules.save();

    // 获取完整的排课规则数据
    const fullRules = await SchedulingRules.findById(savedRules._id)
      .populate([
        { path: 'createdBy', select: 'username profile.name' }
      ]);

    const response: ApiResponse<SchedulingRulesResponse> = {
      success: true,
      message: '排课规则复制成功',
      data: transformSchedulingRulesToResponse(fullRules!)
    };

    res.status(201).json(response);
  } catch (error) {
    console.error('复制排课规则错误:', error);
    
    const response: ApiResponse = {
      success: false,
      message: '复制排课规则失败',
      error: error instanceof Error ? error.message : '服务器内部错误'
    };

    res.status(500).json(response);
  }
};

// ==================== 工具函数 ====================

/**
 * 将排课规则文档转换为API响应格式
 * 
 * Args:
 *   rules: 排课规则文档 (含关联数据)
 * 
 * Returns:
 *   SchedulingRulesResponse: API响应格式的排课规则数据
 */
function transformSchedulingRulesToResponse(rules: any): SchedulingRulesResponse {
  return {
    _id: rules._id.toString(),
    name: rules.name,
    description: rules.description,
    schoolType: rules.schoolType,
    academicYear: rules.academicYear,
    semester: rules.semester,
    timeRules: rules.timeRules,
    teacherConstraints: rules.teacherConstraints,
    roomConstraints: rules.roomConstraints,
    courseArrangementRules: rules.courseArrangementRules,
    conflictResolutionRules: rules.conflictResolutionRules,
    isDefault: rules.isDefault,
    isActive: rules.isActive,
    createdBy: {
      _id: rules.createdBy._id.toString(),
      username: rules.createdBy.username,
      profile: { name: rules.createdBy.profile.name }
    },
    updatedBy: rules.updatedBy ? {
      _id: rules.updatedBy._id.toString(),
      username: rules.updatedBy.username,
      profile: { name: rules.updatedBy.profile.name }
    } : undefined,
    createdAt: rules.createdAt,
    updatedAt: rules.updatedAt
  };
}