/**
 * 场室路由配置
 * 
 * 定义场室相关的API路由，包括CRUD操作和场室管理
 */

import express from 'express';
import {
  createRoom,
  getRooms,
  getRoomById,
  updateRoom,
  deleteRoom,
  permanentDeleteRoom
} from '../controllers/room-controller';
import {
  validateCreateRoom,
  validateUpdateRoom,
  validateObjectId
} from '../middleware/validation';

const router = express.Router();

/**
 * @route   POST /api/rooms
 * @desc    创建新场室
 * @access  管理员、教务员
 * @body    CreateRoomRequest
 */
router.post('/', validateCreateRoom, createRoom);

/**
 * @route   GET /api/rooms
 * @desc    获取场室列表（支持分页和筛选）
 * @access  管理员、教务员、教师
 * @query   page, limit, type, building, floor, minCapacity, maxCapacity, equipment, isActive, keyword, sortBy, sortOrder
 */
router.get('/', getRooms);

/**
 * @route   GET /api/rooms/:id
 * @desc    根据ID获取单个场室信息
 * @access  管理员、教务员、教师
 * @params  id - 场室ID
 */
router.get('/:id', validateObjectId, getRoomById);

/**
 * @route   PUT /api/rooms/:id
 * @desc    更新场室信息
 * @access  管理员、教务员
 * @params  id - 场室ID
 * @body    UpdateRoomRequest
 */
router.put('/:id', validateObjectId, validateUpdateRoom, updateRoom);

/**
 * @route   DELETE /api/rooms/:id
 * @desc    删除场室（软删除，设为不活跃状态）
 * @access  管理员
 * @params  id - 场室ID
 */
router.delete('/:id', validateObjectId, deleteRoom);

/**
 * @route   DELETE /api/rooms/:id/permanent
 * @desc    永久删除场室（硬删除）
 * @access  超级管理员
 * @params  id - 场室ID
 */
router.delete('/:id/permanent', validateObjectId, permanentDeleteRoom);

export { router as roomRoutes };