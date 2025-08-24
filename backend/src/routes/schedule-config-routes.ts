/**
 * 课程时间配置路由
 * 
 * 定义课程时间配置和学期日历相关的API路由
 */

import { Router } from 'express';
import {
  getPeriodTimes,
  upsertPeriodTime,
  deletePeriodTime,
  getSemesterCalendar,
  upsertSemesterCalendar,
  getAllActiveCalendars,
  getAllPeriods
} from '../controllers/schedule-config-controller';

const router = Router();

/**
 * 课程时间配置路由
 */

// 获取指定学年学期的课程时间配置
// GET /api/schedule-config/period-times?academicYear=2025-2026&semester=1
router.get('/period-times', getPeriodTimes);

// 创建或更新课程时间配置
// POST /api/schedule-config/period-times
router.post('/period-times', upsertPeriodTime);

// 删除课程时间配置
// DELETE /api/schedule-config/period-times/:id
router.delete('/period-times/:id', deletePeriodTime);

/**
 * 学期日历路由
 */

// 获取指定学年学期的学期日历
// GET /api/schedule-config/semester-calendar?academicYear=2025-2026&semester=1
router.get('/semester-calendar', getSemesterCalendar);

// 创建或更新学期日历
// POST /api/schedule-config/semester-calendar
router.post('/semester-calendar', upsertSemesterCalendar);

// 获取所有活跃的学期日历
// GET /api/schedule-config/semester-calendars
router.get('/semester-calendars', getAllActiveCalendars);

// 🆕 新增：获取所有可用的节次配置
// GET /api/schedule-config/periods
router.get('/periods', getAllPeriods);

export default router;
