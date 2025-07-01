/**
 * 教师路由配置
 * 
 * 定义教师相关的API路由，包括CRUD操作和教师管理
 */

import express from 'express';
import {
  createTeacher,
  getTeachers,
  getTeacherById,
  updateTeacher,
  deleteTeacher,
  permanentDeleteTeacher
} from '../controllers/teacher-controller';
import {
  validateCreateTeacher,
  validateUpdateTeacher,
  validateObjectId
} from '../middleware/validation';

const router = express.Router();

/**
 * @route   POST /api/teachers
 * @desc    创建新教师
 * @access  管理员、教务员
 * @body    CreateTeacherRequest
 */
router.post('/', validateCreateTeacher, createTeacher);

/**
 * @route   GET /api/teachers
 * @desc    获取教师列表（支持分页和筛选）
 * @access  管理员、教务员
 * @query   page, limit, subjects, isActive, keyword, sortBy, sortOrder
 */
router.get('/', getTeachers);

/**
 * @route   GET /api/teachers/:id
 * @desc    根据ID获取单个教师信息
 * @access  管理员、教务员
 * @params  id - 教师ID
 */
router.get('/:id', validateObjectId, getTeacherById);

/**
 * @route   PUT /api/teachers/:id
 * @desc    更新教师信息
 * @access  管理员、教务员
 * @params  id - 教师ID
 * @body    UpdateTeacherRequest
 */
router.put('/:id', validateObjectId, validateUpdateTeacher, updateTeacher);

/**
 * @route   DELETE /api/teachers/:id
 * @desc    删除教师（软删除，设为不活跃状态）
 * @access  管理员
 * @params  id - 教师ID
 */
router.delete('/:id', validateObjectId, deleteTeacher);

/**
 * @route   DELETE /api/teachers/:id/permanent
 * @desc    永久删除教师（硬删除）
 * @access  超级管理员
 * @params  id - 教师ID
 */
router.delete('/:id/permanent', validateObjectId, permanentDeleteTeacher);

export { router as teacherRoutes };