/**
 * 排课规则路由配置
 * 
 * 定义排课规则相关的API路由，包括CRUD操作、默认规则管理等功能
 */

import { Router } from 'express';
import {
  createSchedulingRules,
  getSchedulingRules,
  getSchedulingRulesById,
  updateSchedulingRules,
  deleteSchedulingRules,
  permanentDeleteSchedulingRules,
  setDefaultRules,
  getDefaultRules,
  copySchedulingRules,
  getCoreSubjectStrategy,
  updateCoreSubjectStrategy,
  validateCoreSubjectStrategy,
  analyzeCoreSubjectDistribution
} from '../controllers/scheduling-rules-controller';
import {
  validateCreateSchedulingRules,
  validateUpdateSchedulingRules
} from '../middleware/validation';

const router = Router();

// ==================== 排课规则CRUD路由 ====================

/**
 * 创建排课规则
 * POST /api/scheduling-rules
 * 
 * 请求体: CreateSchedulingRulesRequest
 * 响应: ApiResponse<SchedulingRulesResponse>
 */
router.post('/', validateCreateSchedulingRules, createSchedulingRules);

/**
 * 获取排课规则列表（支持分页和筛选）
 * GET /api/scheduling-rules
 * 
 * 查询参数: SchedulingRulesQueryOptions
 * 响应: ApiResponse<PaginatedResponse<SchedulingRulesResponse>>
 */
router.get('/', getSchedulingRules);

/**
 * 根据ID获取单个排课规则
 * GET /api/scheduling-rules/:id
 * 
 * 路径参数:
 *   id: 排课规则ID
 * 响应: ApiResponse<SchedulingRulesResponse>
 */
router.get('/:id', getSchedulingRulesById);

/**
 * 更新排课规则
 * PUT /api/scheduling-rules/:id
 * 
 * 路径参数:
 *   id: 排课规则ID
 * 请求体: UpdateSchedulingRulesRequest
 * 响应: ApiResponse<SchedulingRulesResponse>
 */
router.put('/:id', validateUpdateSchedulingRules, updateSchedulingRules);

/**
 * 删除排课规则（软删除）
 * DELETE /api/scheduling-rules/:id
 * 
 * 路径参数:
 *   id: 排课规则ID
 * 响应: ApiResponse
 */
router.delete('/:id', deleteSchedulingRules);

/**
 * 永久删除排课规则（硬删除）
 * DELETE /api/scheduling-rules/:id/permanent
 * 
 * 路径参数:
 *   id: 排课规则ID
 * 响应: ApiResponse
 */
router.delete('/:id/permanent', permanentDeleteSchedulingRules);

// ==================== 排课规则业务功能路由 ====================

/**
 * 设置默认排课规则
 * POST /api/scheduling-rules/:id/set-default
 * 
 * 路径参数:
 *   id: 排课规则ID
 * 响应: ApiResponse<SchedulingRulesResponse>
 */
router.post('/:id/set-default', setDefaultRules);

/**
 * 获取默认排课规则
 * GET /api/scheduling-rules/default/:academicYear/:semester
 * 
 * 路径参数:
 *   academicYear: 学年 (格式: 2024-2025)
 *   semester: 学期 (1或2)
 * 响应: ApiResponse<SchedulingRulesResponse>
 */
router.get('/default/:academicYear/:semester', getDefaultRules);

/**
 * 复制排课规则
 * POST /api/scheduling-rules/:id/copy
 * 
 * 路径参数:
 *   id: 源排课规则ID
 * 请求体:
 *   targetAcademicYear: 目标学年
 *   targetSemester: 目标学期
 *   newName: 新规则名称
 * 响应: ApiResponse<SchedulingRulesResponse>
 */
router.post('/:id/copy', copySchedulingRules);

// 核心课程策略相关路由
router.get('/:id/core-subject-strategy', getCoreSubjectStrategy);
router.put('/:id/core-subject-strategy', updateCoreSubjectStrategy);
router.post('/:id/core-subject-strategy/validate', validateCoreSubjectStrategy);
router.get('/:id/core-subject-distribution-analysis', analyzeCoreSubjectDistribution);

export default router;