/**
 * 教学计划路由配置
 * 
 * 定义教学计划相关的API路由，包括CRUD操作、审批等功能
 */

import { Router } from 'express';
import {
  createTeachingPlan,
  getTeachingPlans,
  getTeachingPlanById,
  updateTeachingPlan,
  deleteTeachingPlan,
  permanentDeleteTeachingPlan,
  approveTeachingPlan,
  getCurrentPlan,
  getAvailableAcademicYears
} from '../controllers/teaching-plan-controller';
import {
  validateCreateTeachingPlan,
  validateUpdateTeachingPlan,
  validateApproveTeachingPlan
} from '../middleware/validation';

const router = Router();

// ==================== 教学计划CRUD路由 ====================

/**
 * 创建教学计划
 * POST /api/teaching-plans
 * 
 * 请求体: CreateTeachingPlanRequest
 * 响应: ApiResponse<TeachingPlanResponse>
 */
router.post('/', validateCreateTeachingPlan, createTeachingPlan);

/**
 * 获取教学计划列表（支持分页和筛选）
 * GET /api/teaching-plans
 * 
 * 查询参数: TeachingPlanQueryOptions
 * 响应: ApiResponse<PaginatedResponse<TeachingPlanResponse>>
 */
router.get('/', getTeachingPlans);

/**
 * 获取有教学计划的可用学年列表
 * GET /api/teaching-plans/academic-years
 * 
 * 响应: ApiResponse<{ academicYears: string[] }>
 */
router.get('/academic-years', getAvailableAcademicYears);

/**
 * 获取班级的当前教学计划
 * GET /api/teaching-plans/current/:classId/:academicYear/:semester
 * 
 * 路径参数:
 *   classId: 班级ID
 *   academicYear: 学年 (格式: 2024-2025)
 *   semester: 学期 (1或2)
 * 响应: ApiResponse<TeachingPlanResponse>
 */
router.get('/current/:classId/:academicYear/:semester', getCurrentPlan);

/**
 * 根据ID获取单个教学计划
 * GET /api/teaching-plans/:id
 * 
 * 路径参数:
 *   id: 教学计划ID
 * 响应: ApiResponse<TeachingPlanResponse>
 */
router.get('/:id', getTeachingPlanById);

/**
 * 更新教学计划
 * PUT /api/teaching-plans/:id
 * 
 * 路径参数:
 *   id: 教学计划ID
 * 请求体: UpdateTeachingPlanRequest
 * 响应: ApiResponse<TeachingPlanResponse>
 */
router.put('/:id', validateUpdateTeachingPlan, updateTeachingPlan);

/**
 * 删除教学计划（软删除）
 * DELETE /api/teaching-plans/:id
 * 
 * 路径参数:
 *   id: 教学计划ID
 * 响应: ApiResponse
 */
router.delete('/:id', deleteTeachingPlan);

/**
 * 永久删除教学计划（硬删除）
 * DELETE /api/teaching-plans/:id/permanent
 * 
 * 路径参数:
 *   id: 教学计划ID
 * 响应: ApiResponse
 */
router.delete('/:id/permanent', permanentDeleteTeachingPlan);

// ==================== 教学计划业务功能路由 ====================

/**
 * 审批教学计划
 * POST /api/teaching-plans/:id/approve
 * 
 * 路径参数:
 *   id: 教学计划ID
 * 请求体: ApproveTeachingPlanRequest
 * 响应: ApiResponse<TeachingPlanResponse>
 */
router.post('/:id/approve', validateApproveTeachingPlan, approveTeachingPlan);

export default router;