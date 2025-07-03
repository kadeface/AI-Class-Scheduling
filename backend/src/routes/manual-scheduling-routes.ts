/**
 * 手动调课路由配置
 * 
 * 定义手动调课相关的API路由
 */

import { Router } from 'express';
import { ManualSchedulingController } from '../controllers/manual-scheduling-controller';

const router = Router();

/**
 * 手动调课操作路由
 */

// 移动单个课程
router.post('/move', ManualSchedulingController.moveCourse);

// 交换两个课程
router.post('/swap', ManualSchedulingController.swapCourses);

/**
 * 冲突检测和辅助功能路由
 */

// 检查指定时间段的冲突
router.post('/check-conflicts', ManualSchedulingController.checkConflicts);

// 获取课程可用的时间段
router.get('/available-slots/:scheduleId', ManualSchedulingController.getAvailableSlots);

export default router; 