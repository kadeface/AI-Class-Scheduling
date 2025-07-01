/**
 * 班级路由配置
 * 
 * 定义班级相关的API路由，包括CRUD操作和班级管理
 */

import express from 'express';
import {
  createClass,
  getClasses,
  getClassById,
  updateClass,
  deleteClass,
  permanentDeleteClass
} from '../controllers/class-controller';
import {
  validateCreateClass,
  validateUpdateClass,
  validateObjectId
} from '../middleware/validation';

const router = express.Router();

/**
 * @route   POST /api/classes
 * @desc    创建新班级
 * @access  管理员、教务员
 * @body    CreateClassRequest
 */
router.post('/', validateCreateClass, createClass);

/**
 * @route   GET /api/classes
 * @desc    获取班级列表（支持分页和筛选）
 * @access  管理员、教务员、教师
 * @query   page, limit, grade, academicYear, semester, isActive, keyword, sortBy, sortOrder
 */
router.get('/', getClasses);

/**
 * @route   GET /api/classes/:id
 * @desc    根据ID获取单个班级信息
 * @access  管理员、教务员、班主任
 * @params  id - 班级ID
 */
router.get('/:id', validateObjectId, getClassById);

/**
 * @route   PUT /api/classes/:id
 * @desc    更新班级信息
 * @access  管理员、教务员
 * @params  id - 班级ID
 * @body    UpdateClassRequest
 */
router.put('/:id', validateObjectId, validateUpdateClass, updateClass);

/**
 * @route   DELETE /api/classes/:id
 * @desc    删除班级（软删除，设为不活跃状态）
 * @access  管理员
 * @params  id - 班级ID
 */
router.delete('/:id', validateObjectId, deleteClass);

/**
 * @route   DELETE /api/classes/:id/permanent
 * @desc    永久删除班级（硬删除）
 * @access  超级管理员
 * @params  id - 班级ID
 */
router.delete('/:id/permanent', validateObjectId, permanentDeleteClass);

export { router as classRoutes };