/**
 * 课程时间配置控制器
 * 
 * 提供课程时间配置和学期日历的管理功能
 */

import { Request, Response } from 'express';
import { PeriodTimeConfig, IPeriodTimeConfig } from '../models/PeriodTimeConfig';
import { SemesterCalendar, ISemesterCalendar } from '../models/SemesterCalendar';

/**
 * 获取指定学年学期的课程时间配置
 * 
 * @param req Express请求对象
 * @param res Express响应对象
 */
export async function getPeriodTimes(req: Request, res: Response): Promise<void> {
  try {
    const { academicYear, semester } = req.query;
    
    if (!academicYear || !semester) {
      res.status(400).json({
        success: false,
        message: '学年和学期参数不能为空'
      });
      return;
    }

    console.log(`获取 ${academicYear} 学年 ${semester} 学期的课程时间配置...`);

    const periodTimes = await PeriodTimeConfig.findByAcademicPeriod(
      academicYear as string, 
      semester as string
    );

    console.log(`找到 ${periodTimes.length} 个时间配置`);

    res.json({
      success: true,
      data: periodTimes,
      message: `成功获取 ${periodTimes.length} 个课程时间配置`
    });

  } catch (error) {
    console.error('获取课程时间配置失败:', error);
    res.status(500).json({
      success: false,
      message: '获取课程时间配置失败',
      error: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
    });
  }
}

/**
 * 创建或更新课程时间配置
 * 
 * @param req Express请求对象
 * @param res Express响应对象
 */
export async function upsertPeriodTime(req: Request, res: Response): Promise<void> {
  try {
    const { academicYear, semester, period, startTime, endTime, breakTime, description } = req.body;

    if (!academicYear || !semester || !period || !startTime || !endTime) {
      res.status(400).json({
        success: false,
        message: '学年、学期、节次、开始时间、结束时间为必填项'
      });
      return;
    }

    console.log(`创建/更新 ${academicYear} 学年 ${semester} 学期第 ${period} 节时间配置...`);

    // 查找是否已存在相同配置
    const existingConfig = await PeriodTimeConfig.findOne({
      academicYear,
      semester,
      period
    });

    let periodTimeConfig: IPeriodTimeConfig;

    if (existingConfig) {
      // 更新现有配置
      existingConfig.startTime = startTime;
      existingConfig.endTime = endTime;
      existingConfig.breakTime = breakTime || 10;
      existingConfig.description = description;
      existingConfig.isActive = true;
      
      periodTimeConfig = await existingConfig.save();
      console.log('✅ 时间配置更新成功');
    } else {
      // 创建新配置
      periodTimeConfig = new PeriodTimeConfig({
        academicYear,
        semester,
        period,
        startTime,
        endTime,
        breakTime: breakTime || 10,
        description,
        isActive: true
      });
      
      await periodTimeConfig.save();
      console.log('✅ 时间配置创建成功');
    }

    res.json({
      success: true,
      data: periodTimeConfig,
      message: existingConfig ? '时间配置更新成功' : '时间配置创建成功'
    });

  } catch (error) {
    console.error('创建/更新课程时间配置失败:', error);
    res.status(500).json({
      success: false,
      message: '创建/更新课程时间配置失败',
      error: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
    });
  }
}

/**
 * 删除课程时间配置
 * 
 * @param req Express请求对象
 * @param res Express响应对象
 */
export async function deletePeriodTime(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;

    console.log(`删除时间配置 ID: ${id}`);

    const deletedConfig = await PeriodTimeConfig.findByIdAndDelete(id);

    if (!deletedConfig) {
      res.status(404).json({
        success: false,
        message: '时间配置不存在'
      });
      return;
    }

    console.log('✅ 时间配置删除成功');

    res.json({
      success: true,
      message: '时间配置删除成功'
    });

  } catch (error) {
    console.error('删除课程时间配置失败:', error);
    res.status(500).json({
      success: false,
      message: '删除课程时间配置失败',
      error: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
    });
  }
}

/**
 * 获取指定学年学期的学期日历
 * 
 * @param req Express请求对象
 * @param res Express响应对象
 */
export async function getSemesterCalendar(req: Request, res: Response): Promise<void> {
  try {
    const { academicYear, semester } = req.query;
    
    if (!academicYear || !semester) {
      res.status(400).json({
        success: false,
        message: '学年和学期参数不能为空'
      });
      return;
    }

    console.log(`获取 ${academicYear} 学年 ${semester} 学期的学期日历...`);

    const calendar = await SemesterCalendar.findByAcademicPeriod(
      academicYear as string, 
      semester as string
    );

    if (!calendar) {
      res.json({
        success: true,
        data: null,
        message: '未找到学期日历配置'
      });
      return;
    }

    console.log('✅ 学期日历获取成功');

    res.json({
      success: true,
      data: calendar,
      message: '学期日历获取成功'
    });

  } catch (error) {
    console.error('获取学期日历失败:', error);
    res.status(500).json({
      success: false,
      message: '获取学期日历失败',
      error: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
    });
  }
}

/**
 * 创建或更新学期日历
 * 
 * @param req Express请求对象
 * @param res Express响应对象
 */
export async function upsertSemesterCalendar(req: Request, res: Response): Promise<void> {
  try {
    const { 
      academicYear, 
      semester, 
      startDate, 
      endDate, 
      weekDays, 
      holidays, 
      specialDays, 
      description 
    } = req.body;

    if (!academicYear || !semester || !startDate || !endDate) {
      res.status(400).json({
        success: false,
        message: '学年、学期、开始日期、结束日期为必填项'
      });
      return;
    }

    console.log(`创建/更新 ${academicYear} 学年 ${semester} 学期日历...`);

    // 查找是否已存在相同配置
    const existingCalendar = await SemesterCalendar.findOne({
      academicYear,
      semester
    });

    let semesterCalendar: ISemesterCalendar;

    if (existingCalendar) {
      // 更新现有配置
      existingCalendar.startDate = new Date(startDate);
      existingCalendar.endDate = new Date(endDate);
      existingCalendar.weekDays = weekDays || [1, 2, 3, 4, 5];
      existingCalendar.holidays = holidays ? holidays.map((d: string) => new Date(d)) : [];
      existingCalendar.specialDays = specialDays || [];
      existingCalendar.description = description;
      existingCalendar.isActive = true;
      
      semesterCalendar = await existingCalendar.save();
      console.log('✅ 学期日历更新成功');
    } else {
      // 创建新配置
      semesterCalendar = new SemesterCalendar({
        academicYear,
        semester,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        weekDays: weekDays || [1, 2, 3, 4, 5],
        holidays: holidays ? holidays.map((d: string) => new Date(d)) : [],
        specialDays: specialDays || [],
        description,
        isActive: true
      });
      
      await semesterCalendar.save();
      console.log('✅ 学期日历创建成功');
    }

    res.json({
      success: true,
      data: semesterCalendar,
      message: existingCalendar ? '学期日历更新成功' : '学期日历创建成功'
    });

  } catch (error) {
    console.error('创建/更新学期日历失败:', error);
    res.status(500).json({
      success: false,
      message: '创建/更新学期日历失败',
      error: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
    });
  }
}

/**
 * 获取所有活跃的学期日历
 * 
 * @param req Express请求对象
 * @param res Express响应对象
 */
export async function getAllActiveCalendars(req: Request, res: Response): Promise<void> {
  try {
    console.log('获取所有活跃的学期日历...');

    const calendars = await SemesterCalendar.findActive();

    console.log(`找到 ${calendars.length} 个活跃学期日历`);

    res.json({
      success: true,
      data: calendars,
      message: `成功获取 ${calendars.length} 个学期日历`
    });

  } catch (error) {
    console.error('获取所有学期日历失败:', error);
    res.status(500).json({
      success: false,
      message: '获取所有学期日历失败',
      error: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
    });
  }
}
