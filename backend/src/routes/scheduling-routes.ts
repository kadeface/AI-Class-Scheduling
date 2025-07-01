/**
 * 排课路由配置
 * 
 * 定义排课相关的API路由
 */

import { Router } from 'express';
import { SchedulingController } from '../controllers/scheduling-controller';

const router = Router();

/**
 * 排课任务管理路由
 */

// 启动排课任务
router.post('/start', SchedulingController.startScheduling);

// 查询指定任务状态
router.get('/tasks/:taskId', SchedulingController.getTaskStatus);

// 获取所有任务列表
router.get('/tasks', SchedulingController.getAllTasks);

// 停止指定任务
router.post('/tasks/:taskId/stop', SchedulingController.stopTask);

// 删除指定任务记录
router.delete('/tasks/:taskId', SchedulingController.deleteTask);

/**
 * 排课验证和统计路由
 */

// 验证现有排课
router.post('/validate', SchedulingController.validateSchedule);

// 获取排课统计信息
router.get('/statistics', SchedulingController.getStatistics);

/**
 * 排课配置和工具路由
 */

// 获取排课配置预设
router.get('/presets', SchedulingController.getConfigPresets);

// 清理已完成的任务
router.post('/cleanup', SchedulingController.cleanupTasks);

export default router;