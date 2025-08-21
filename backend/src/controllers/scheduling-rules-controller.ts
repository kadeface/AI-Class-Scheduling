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
    // 🆕 添加调试日志
    console.log('=== 后端调试：接收到的请求数据 ===');
    console.log('完整的 req.body:', JSON.stringify(req.body, null, 2));
    console.log('fixedTimeCourses 类型:', typeof req.body.courseArrangementRules?.fixedTimeCourses);
    console.log('fixedTimeCourses 内容:', req.body.courseArrangementRules?.fixedTimeCourses);
    if (req.body.courseArrangementRules?.fixedTimeCourses?.courses) {
      console.log('courses 类型:', typeof req.body.courseArrangementRules.fixedTimeCourses.courses);
      console.log('courses 内容:', req.body.courseArrangementRules.fixedTimeCourses.courses);
      console.log('courses 是否为数组:', Array.isArray(req.body.courseArrangementRules.fixedTimeCourses.courses));
    }
    console.log('=== 后端调试结束 ===');
    
    const rulesData: CreateSchedulingRulesRequest = req.body;
    
    // 获取用户ID，优先使用请求中的用户ID，否则使用系统默认ID
    let userId: mongoose.Types.ObjectId;
    
    if (rulesData.createdBy && mongoose.Types.ObjectId.isValid(rulesData.createdBy)) {
      // 如果请求中包含有效的用户ID，使用该ID
      userId = new mongoose.Types.ObjectId(rulesData.createdBy);
    } else {
      // 否则使用系统默认管理员ID（临时解决方案，待实现用户认证后修改）
      userId = new mongoose.Types.ObjectId('68692a48c6a3f27c50bf8cba');
      console.log('使用系统默认管理员ID创建排课规则');
    }

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

    // 设置默认的核心课程策略
    if (!rulesData.courseArrangementRules?.coreSubjectStrategy) {
      rulesData.courseArrangementRules = rulesData.courseArrangementRules || {};
      rulesData.courseArrangementRules.coreSubjectStrategy = {
        enableCoreSubjectStrategy: true,
        coreSubjects: ['语文', '数学', '英语'],
        distributionMode: 'balanced',
        maxDailyOccurrences: 2,
        minDaysPerWeek: 4,
        avoidConsecutiveDays: true,
        preferredTimeSlots: [2, 3, 4], // 第2、3、4节
        avoidTimeSlots: [1, 7], // 避免第1节和最后一节
        maxConcentration: 2,
        balanceWeight: 70,
        enforceEvenDistribution: true
      };
    }

    // 验证核心课程策略配置
    const validationResult = validateCoreSubjectStrategyConfig(
      rulesData.courseArrangementRules?.coreSubjectStrategy
    );
    
    if (!validationResult.isValid) {
      res.status(400).json({
        success: false,
        error: '核心课程策略配置无效',
        details: validationResult.errors
      });
      return;
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
    
    let errorMessage = '服务器内部错误';
    let statusCode = 500;
    
    // 处理MongoDB验证错误
    if (error instanceof Error) {
      if (error.message.includes('创建人不能为空')) {
        errorMessage = '排课规则缺少创建人信息，请检查用户认证状态';
        statusCode = 400;
      } else if (error.message.includes('验证失败')) {
        errorMessage = '排课规则数据验证失败，请检查输入数据';
        statusCode = 400;
      } else {
        errorMessage = error.message;
      }
    }
    
    const response: ApiResponse = {
      success: false,
      message: '创建排课规则失败',
      error: errorMessage
    };

    res.status(statusCode).json(response);
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

    // 安全地转换数据，过滤掉无效记录
    const validRules: SchedulingRulesResponse[] = [];
    const invalidRules: any[] = [];

    for (const rule of rules) {
      try {
        const transformedRule = transformSchedulingRulesToResponse(rule);
        validRules.push(transformedRule);
      } catch (error) {
        console.error(`转换排课规则 ${rule._id} 时出错:`, error);
        invalidRules.push(rule);
        // 记录无效规则以便后续清理
        console.warn(`发现无效的排课规则记录: ${rule._id}, 名称: ${rule.name}`);
      }
    }

    // 如果有无效记录，记录警告但继续处理
    if (invalidRules.length > 0) {
      console.warn(`发现 ${invalidRules.length} 条无效的排课规则记录，已跳过处理`);
    }

    const paginatedData: PaginatedResponse<SchedulingRulesResponse> = {
      items: validRules,
      total: total - invalidRules.length, // 调整总数以反映有效记录数
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil((total - invalidRules.length) / Number(limit))
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
    
    // 🆕 添加调试日志
    console.log('=== 后端调试：更新时接收到的请求数据 ===');
    console.log('完整的 req.body:', JSON.stringify(req.body, null, 2));
    console.log('fixedTimeCourses 类型:', typeof req.body.courseArrangementRules?.fixedTimeCourses);
    console.log('fixedTimeCourses 内容:', req.body.courseArrangementRules?.fixedTimeCourses);
    if (req.body.courseArrangementRules?.fixedTimeCourses?.courses) {
      console.log('courses 类型:', typeof req.body.courseArrangementRules.fixedTimeCourses.courses);
      console.log('courses 内容:', req.body.courseArrangementRules.fixedTimeCourses.courses);
      console.log('courses 是否为数组:', Array.isArray(req.body.courseArrangementRules.fixedTimeCourses.courses));
    }
    console.log('=== 后端调试结束 ===');
    
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

    // 如果更新包含核心课程策略，进行验证
    if (updateData.courseArrangementRules?.coreSubjectStrategy) {
      const validationResult = validateCoreSubjectStrategyConfig(
        updateData.courseArrangementRules.coreSubjectStrategy
      );
      
      if (!validationResult.isValid) {
        res.status(400).json({
          success: false,
          error: '核心课程策略配置无效',
          details: validationResult.errors
        });
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

/**
 * 获取核心课程策略配置
 * 
 * Args:
 *   req: Express请求对象
 *   res: Express响应对象
 * 
 * Returns:
 *   void
 */
export const getCoreSubjectStrategy = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    const rules = await SchedulingRules.findById(id);
    if (!rules) {
      res.status(404).json({
        success: false,
        error: '排课规则不存在'
      });
      return;
    }

    const strategy = rules.courseArrangementRules?.coreSubjectStrategy;
    
    res.json({
      success: true,
      data: {
        rulesId: id,
        coreSubjectStrategy: strategy || null,
        isEnabled: strategy?.enableCoreSubjectStrategy || false
      },
      message: '获取核心课程策略成功'
    });
  } catch (error) {
    console.error('获取核心课程策略失败:', error);
    res.status(500).json({
      success: false,
      error: '获取核心课程策略失败',
      details: error instanceof Error ? error.message : '未知错误'
    });
  }
};

/**
 * 更新核心课程策略配置
 * 
 * Args:
 *   req: Express请求对象
 *   res: Express响应对象
 * 
 * Returns:
 *   void
 */
export const updateCoreSubjectStrategy = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const strategyData = req.body;

    // 验证核心课程策略配置
    const validationResult = validateCoreSubjectStrategyConfig(strategyData);
    if (!validationResult.isValid) {
      res.status(400).json({
        success: false,
        error: '核心课程策略配置无效',
        details: validationResult.errors
      });
      return;
    }

    // 更新核心课程策略
    const updatedRules = await SchedulingRules.findByIdAndUpdate(
      id,
      {
        'courseArrangementRules.coreSubjectStrategy': strategyData
      },
      { new: true, runValidators: true }
    );

    if (!updatedRules) {
      res.status(404).json({
        success: false,
        error: '排课规则不存在'
      });
      return;
    }

    res.json({
      success: true,
      data: {
        rulesId: id,
        coreSubjectStrategy: updatedRules.courseArrangementRules?.coreSubjectStrategy,
        message: '核心课程策略更新成功'
      }
    });
  } catch (error) {
    console.error('更新核心课程策略失败:', error);
    res.status(500).json({
      success: false,
      error: '更新核心课程策略失败',
      details: error instanceof Error ? error.message : '未知错误'
    });
  }
};

/**
 * 验证核心课程策略配置
 * 
 * Args:
 *   req: Express请求对象
 *   res: Express响应对象
 * 
 * Returns:
 *   void
 */
export const validateCoreSubjectStrategy = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const strategyData = req.body;

    // 验证配置
    const validationResult = validateCoreSubjectStrategyConfig(strategyData);
    
    res.json({
      success: true,
      data: {
        isValid: validationResult.isValid,
        errors: validationResult.errors,
        suggestions: generateStrategySuggestions(strategyData)
      },
      message: validationResult.isValid ? '配置验证通过' : '配置验证失败'
    });
  } catch (error) {
    console.error('验证核心课程策略失败:', error);
    res.status(500).json({
      success: false,
      error: '验证核心课程策略失败',
      details: error instanceof Error ? error.message : '未知错误'
    });
  }
};

/**
 * 分析核心课程分布情况
 * 
 * Args:
 *   req: Express请求对象
 *   res: Express响应对象
 * 
 * Returns:
 *   void
 */
export const analyzeCoreSubjectDistribution = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    const rules = await SchedulingRules.findById(id);
    if (!rules) {
      res.status(404).json({
        success: false,
        error: '排课规则不存在'
      });
      return;
    }

    const strategy = rules.courseArrangementRules?.coreSubjectStrategy;
    if (!strategy?.enableCoreSubjectStrategy) {
      res.status(400).json({
        success: false,
        error: '核心课程策略未启用'
      });
      return;
    }

    // 生成分布分析报告
    const analysis = generateDistributionAnalysis(strategy);
    
    res.json({
      success: true,
      data: {
        rulesId: id,
        analysis: analysis,
        recommendations: generateDistributionRecommendations(strategy)
      },
      message: '核心课程分布分析完成'
    });
  } catch (error) {
    console.error('分析核心课程分布失败:', error);
    res.status(500).json({
      success: false,
      error: '分析核心课程分布失败',
      details: error instanceof Error ? error.message : '未知错误'
    });
  }
};

/**
 * 生成策略建议
 * 
 * Args:
 *   strategy: 核心课程策略配置
 * 
 * Returns:
 *   string[]: 建议列表
 */
function generateStrategySuggestions(strategy: any): string[] {
  const suggestions: string[] = [];

  if (!strategy) return suggestions;

  // 检查核心课程列表
  if (!strategy.coreSubjects || strategy.coreSubjects.length === 0) {
    suggestions.push('建议设置核心课程列表，如：语文、数学、英语等');
  }

  // 检查分布模式
  if (strategy.distributionMode === 'concentrated') {
    suggestions.push('集中分布模式可能导致学习疲劳，建议使用平衡分布模式');
  }

  // 检查每日最大出现次数
  if (strategy.maxDailyOccurrences > 2) {
    suggestions.push('每日核心课程过多可能导致学习压力，建议控制在1-2次');
  }

  // 检查每周最少出现天数
  if (strategy.minDaysPerWeek < 4) {
    suggestions.push('建议核心课程每周至少出现4天，确保学习连续性');
  }

  // 检查时间偏好
  if (!strategy.preferredTimeSlots || strategy.preferredTimeSlots.length === 0) {
    suggestions.push('建议设置偏好时间段，如第2-4节，提高学习效果');
  }

  return suggestions;
}

/**
 * 生成分布分析报告
 * 
 * Args:
 *   strategy: 核心课程策略配置
 * 
 * Returns:
 *   object: 分析报告
 */
function generateDistributionAnalysis(strategy: any): any {
  return {
    distributionMode: {
      current: strategy.distributionMode,
      description: getDistributionModeDescription(strategy.distributionMode),
      impact: getDistributionModeImpact(strategy.distributionMode)
    },
    dailyLimits: {
      maxOccurrences: strategy.maxDailyOccurrences,
      recommendation: strategy.maxDailyOccurrences <= 2 ? '合理' : '建议减少'
    },
    weeklyDistribution: {
      minDays: strategy.minDaysPerWeek,
      recommendation: strategy.minDaysPerWeek >= 4 ? '合理' : '建议增加'
    },
    timePreferences: {
      preferred: strategy.preferredTimeSlots?.length || 0,
      avoided: strategy.avoidTimeSlots?.length || 0,
      coverage: calculateTimeCoverage(strategy)
    },
    concentrationControl: {
      maxConsecutive: strategy.maxConcentration,
      avoidConsecutive: strategy.avoidConsecutiveDays,
      effectiveness: evaluateConcentrationEffectiveness(strategy)
    }
  };
}

/**
 * 生成分布优化建议
 * 
 * Args:
 *   strategy: 核心课程策略配置
 * 
 * Returns:
 *   string[]: 优化建议
 */
function generateDistributionRecommendations(strategy: any): string[] {
  const recommendations: string[] = [];

  if (!strategy) return recommendations;

  // 基于分布模式的建议
  if (strategy.distributionMode === 'concentrated') {
    recommendations.push('考虑调整为平衡分布模式，避免核心课程过度集中');
  }

  // 基于时间偏好的建议
  if (strategy.preferredTimeSlots?.length === 0) {
    recommendations.push('设置核心课程偏好时间段，如第2-4节，提高学习效率');
  }

  // 基于连续天控制的建议
  if (!strategy.avoidConsecutiveDays) {
    recommendations.push('启用连续天避免功能，防止学习疲劳');
  }

  // 基于集中度控制的建议
  if (strategy.maxConcentration > 3) {
    recommendations.push('降低最大集中度限制，建议设置为2-3天');
  }

  // 基于平衡权重的建议
  if (strategy.balanceWeight < 50) {
    recommendations.push('提高平衡权重，确保核心课程分布更加均匀');
  }

  return recommendations;
}

/**
 * 获取分布模式描述
 */
function getDistributionModeDescription(mode: string): string {
  switch (mode) {
    case 'daily':
      return '每日分布：核心课程每天都有安排';
    case 'balanced':
      return '平衡分布：核心课程在一周内均匀分布';
    case 'concentrated':
      return '集中分布：核心课程集中在某些天安排';
    default:
      return '未知分布模式';
  }
}

/**
 * 获取分布模式影响评估
 */
function getDistributionModeImpact(mode: string): string {
  switch (mode) {
    case 'daily':
      return '学习连续性好，但可能增加每日学习压力';
    case 'balanced':
      return '学习节奏适中，推荐使用';
    case 'concentrated':
      return '可能导致学习疲劳，不推荐';
    default:
      return '影响未知';
  }
}

/**
 * 计算时间覆盖率
 */
function calculateTimeCoverage(strategy: any): string {
  const totalPeriods = 8; // 假设每天8节课
  const preferred = strategy.preferredTimeSlots?.length || 0;
  const avoided = strategy.avoidTimeSlots?.length || 0;
  
  const coverage = ((totalPeriods - avoided) / totalPeriods) * 100;
  
  if (coverage >= 80) return '高覆盖率，时间安排灵活';
  if (coverage >= 60) return '中等覆盖率，时间安排适中';
  return '低覆盖率，时间安排受限';
}

/**
 * 评估集中度控制效果
 */
function evaluateConcentrationEffectiveness(strategy: any): string {
  if (!strategy.avoidConsecutiveDays) {
    return '未启用连续天控制，存在学习疲劳风险';
  }
  
  if (strategy.maxConcentration <= 2) {
    return '集中度控制严格，学习节奏良好';
  } else if (strategy.maxConcentration <= 3) {
    return '集中度控制适中，学习节奏可接受';
  } else {
    return '集中度控制宽松，建议加强控制';
  }
}

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
  // 处理缺少创建人信息的情况
  let createdByInfo: {
    _id: string;
    username: string;
    profile: { name: string };
  };

  if (rules.createdBy && rules.createdBy._id) {
    // 正常情况：有创建人信息
    createdByInfo = {
      _id: rules.createdBy._id.toString(),
      username: rules.createdBy.username || '未知用户',
      profile: { name: rules.createdBy.profile?.name || '未知用户' }
    };
  } else {
    // 异常情况：缺少创建人信息，使用默认值
 //   console.warn(`排课规则 ${rules._id} 缺少创建人信息，使用默认值`);
    createdByInfo = {
      _id: '000000000000000000000000', // 默认ID
      username: '系统管理员',
      profile: { name: '系统管理员' }
    };
  }

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
    createdBy: createdByInfo,
    updatedBy: rules.updatedBy ? {
      _id: rules.updatedBy._id.toString(),
      username: rules.updatedBy.username || '未知用户',
      profile: { name: rules.updatedBy.profile?.name || '未知用户' }
    } : undefined,
    createdAt: rules.createdAt,
    updatedAt: rules.updatedAt
  };
}

/**
 * 验证核心课程策略配置
 * 
 * Args:
 *   strategy: 核心课程策略配置
 * 
 * Returns:
 *   {isValid: boolean, errors: string[]}: 验证结果
 */
function validateCoreSubjectStrategyConfig(strategy: any): {isValid: boolean, errors: string[]} {
  const errors: string[] = [];

  if (!strategy) {
    return { isValid: true, errors: [] }; // 如果没有配置，视为有效
  }

  // 验证核心课程列表
  if (!Array.isArray(strategy.coreSubjects) || strategy.coreSubjects.length === 0) {
    errors.push('核心课程列表不能为空');
  }

  // 验证分布模式
  const validModes = ['daily', 'balanced', 'concentrated'];
  if (strategy.distributionMode && !validModes.includes(strategy.distributionMode)) {
    errors.push(`分布模式必须是以下之一: ${validModes.join(', ')}`);
  }

  // 验证每日最大出现次数
  if (strategy.maxDailyOccurrences && 
      (typeof strategy.maxDailyOccurrences !== 'number' || strategy.maxDailyOccurrences < 1)) {
    errors.push('每日最大出现次数必须是大于0的数字');
  }

  // 验证每周最少出现天数
  if (strategy.minDaysPerWeek && 
      (typeof strategy.minDaysPerWeek !== 'number' || strategy.minDaysPerWeek < 1 || strategy.minDaysPerWeek > 7)) {
    errors.push('每周最少出现天数必须是1-7之间的数字');
  }

  // 验证最大集中度
  if (strategy.maxConcentration && 
      (typeof strategy.maxConcentration !== 'number' || strategy.maxConcentration < 1)) {
    errors.push('最大集中度必须是大于0的数字');
  }

  // 验证平衡权重
  if (strategy.balanceWeight && 
      (typeof strategy.balanceWeight !== 'number' || strategy.balanceWeight < 0 || strategy.balanceWeight > 100)) {
    errors.push('平衡权重必须是0-100之间的数字');
  }

  // 验证时间段数组
  if (strategy.preferredTimeSlots && !Array.isArray(strategy.preferredTimeSlots)) {
    errors.push('偏好时间段必须是数组格式');
  }

  if (strategy.avoidTimeSlots && !Array.isArray(strategy.avoidTimeSlots)) {
    errors.push('避免时间段必须是数组格式');
  }

  return {
    isValid: errors.length === 0,
    errors: errors
  };
}