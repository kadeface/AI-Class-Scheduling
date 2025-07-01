/**
 * 课程路由配置
 * 
 * 定义课程相关的API路由，包括CRUD操作和课程管理
 */

import express from 'express';
import {
  createCourse,
  getCourses,
  getCourseById,
  updateCourse,
  deleteCourse,
  permanentDeleteCourse
} from '../controllers/course-controller';
import {
  validateCreateCourse,
  validateUpdateCourse,
  validateObjectId
} from '../middleware/validation';

const router = express.Router();

/**
 * @route   POST /api/courses
 * @desc    创建新课程
 * @access  管理员、教务员
 * @body    CreateCourseRequest
 */
router.post('/', validateCreateCourse, createCourse);

/**
 * @route   GET /api/courses
 * @desc    获取课程列表（支持分页和筛选）
 * @access  管理员、教务员、教师
 * @query   page, limit, subject, requiresContinuous, isActive, keyword, sortBy, sortOrder
 */
router.get('/', getCourses);

/**
 * @route   GET /api/courses/:id
 * @desc    根据ID获取单个课程信息
 * @access  管理员、教务员、教师
 * @params  id - 课程ID
 */
router.get('/:id', validateObjectId, getCourseById);

/**
 * @route   PUT /api/courses/:id
 * @desc    更新课程信息
 * @access  管理员、教务员
 * @params  id - 课程ID
 * @body    UpdateCourseRequest
 */
router.put('/:id', validateObjectId, validateUpdateCourse, updateCourse);

/**
 * @route   DELETE /api/courses/:id
 * @desc    删除课程（软删除，设为不活跃状态）
 * @access  管理员
 * @params  id - 课程ID
 */
router.delete('/:id', validateObjectId, deleteCourse);

/**
 * @route   DELETE /api/courses/:id/permanent
 * @desc    永久删除课程（硬删除）
 * @access  超级管理员
 * @params  id - 课程ID
 */
router.delete('/:id/permanent', validateObjectId, permanentDeleteCourse);

export { router as courseRoutes };