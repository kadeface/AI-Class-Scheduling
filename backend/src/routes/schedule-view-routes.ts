/**
 * 课表查看路由配置
 * 
 * 定义课表展示相关的API路由
 */

import { Router } from 'express';
import {
  getClassSchedule,
  getTeacherSchedule,
  getRoomSchedule,
  getScheduleOptions,
  getTeachersWithSchedules,
  getAvailableAcademicPeriods
} from '../controllers/schedule-view-controller';

const router = Router();

/**
 * 课表查看路由
 */

// 获取班级课表
// GET /api/schedule-view/class/:classId?academicYear=2024-2025&semester=1
router.get('/class/:classId', getClassSchedule);

// 获取教师课表
// GET /api/schedule-view/teacher/:teacherId?academicYear=2024-2025&semester=1
router.get('/teacher/:teacherId', getTeacherSchedule);

// 获取教室课表
// GET /api/schedule-view/room/:roomId?academicYear=2024-2025&semester=1
router.get('/room/:roomId', getRoomSchedule);

// 获取选项列表
// GET /api/schedule-view/options/classes
// GET /api/schedule-view/options/teachers
// GET /api/schedule-view/options/rooms
router.get('/options/:type', getScheduleOptions);

// 获取有课表的教师列表（优化版本）
// GET /api/schedule-view/teachers-with-schedules?academicYear=2024-2025&semester=1
router.get('/teachers-with-schedules', getTeachersWithSchedules);

// 获取可用的学年学期列表
// GET /api/schedule-view/academic-periods
router.get('/academic-periods', getAvailableAcademicPeriods);

export default router; 