/**
 * 用户路由配置
 * 
 * 定义用户相关的API路由，包括CRUD操作和角色管理
 */

import express from 'express';
import {
  createUser,
  getUsers,
  getUserById,
  updateUser,
  deleteUser,
  permanentDeleteUser
} from '../controllers/user-controller';
import {
  validateCreateUser,
  validateUpdateUser,
  validateObjectId
} from '../middleware/validation';

const router = express.Router();

/**
 * @route   POST /api/users
 * @desc    创建新用户
 * @access  管理员
 * @body    CreateUserRequest
 */
router.post('/', validateCreateUser, createUser);

/**
 * @route   GET /api/users
 * @desc    获取用户列表（支持分页和筛选）
 * @access  管理员、教务员
 * @query   page, limit, role, isActive, department, keyword, sortBy, sortOrder
 */
router.get('/', getUsers);

/**
 * @route   GET /api/users/:id
 * @desc    根据ID获取单个用户信息
 * @access  管理员、教务员、本人
 * @params  id - 用户ID
 */
router.get('/:id', validateObjectId, getUserById);

/**
 * @route   PUT /api/users/:id
 * @desc    更新用户信息
 * @access  管理员、本人（限制权限）
 * @params  id - 用户ID
 * @body    UpdateUserRequest
 */
router.put('/:id', validateObjectId, validateUpdateUser, updateUser);

/**
 * @route   DELETE /api/users/:id
 * @desc    删除用户（软删除，设为不活跃状态）
 * @access  管理员
 * @params  id - 用户ID
 */
router.delete('/:id', validateObjectId, deleteUser);

/**
 * @route   DELETE /api/users/:id/permanent
 * @desc    永久删除用户（硬删除）
 * @access  超级管理员
 * @params  id - 用户ID
 */
router.delete('/:id/permanent', validateObjectId, permanentDeleteUser);

export { router as userRoutes };