/**
 * 课程安排管理路由配置
 * 
 * 定义课程安排CRUD操作的API路由
 */

import { Router } from 'express';
import { ScheduleController } from '../controllers/schedule-controller';

const router = Router();

/**
 * 课程安排管理路由
 */

// 获取课程安排列表
// GET /api/schedules?academicYear=2024-2025&semester=1
router.get('/', ScheduleController.getSchedules);

// 获取单个课程安排详情
// GET /api/schedules/:id
router.get('/:id', ScheduleController.getSchedule);

// 创建新的课程安排
// POST /api/schedules
router.post('/', ScheduleController.createSchedule);

// 更新课程安排
// PUT /api/schedules/:id
router.put('/:id', ScheduleController.updateSchedule);

// 删除课程安排
// DELETE /api/schedules/:id
router.delete('/:id', ScheduleController.deleteSchedule);

// 新增：获取课程匹配的教室
router.get('/matching-rooms/:courseId', ScheduleController.getMatchingRooms);

export default router; 