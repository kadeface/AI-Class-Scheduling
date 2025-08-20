/**
 * 创建默认学期日历
 * 
 * 为指定学年学期创建标准的学期日历配置
 */

import mongoose from 'mongoose';
import { SemesterCalendar } from '../models/SemesterCalendar';
import { connectDatabase } from '../config/database';

/**
 * 默认学期日历数据
 */
const DEFAULT_CALENDAR = {
  academicYear: '2025-2026',
  semester: '1',
  startDate: '2025-09-01',
  endDate: '2026-01-15',
  weekDays: [1, 2, 3, 4, 5], // 周一到周五
  holidays: [
    '2025-10-01',  // 国庆节
    '2025-10-02',  // 国庆节
    '2025-10-03',  // 国庆节
    '2025-10-04',  // 国庆节
    '2025-10-05',  // 国庆节
    '2025-10-06',  // 国庆节
    '2025-10-07',  // 国庆节
    '2025-12-25',  // 圣诞节
    '2026-01-01'   // 元旦
  ],
  specialDays: [
    {
      date: '2025-09-10',
      type: 'activity',
      description: '教师节',
      isActive: true
    },
    {
      date: '2025-12-24',
      type: 'holiday',
      description: '平安夜',
      isActive: true
    }
  ],
  description: '2025-2026学年第一学期标准日历'
};

/**
 * 创建默认学期日历
 */
async function createDefaultSemesterCalendar() {
  try {
    console.log('开始创建默认学期日历...');

    // 连接数据库
    await connectDatabase();

    const { academicYear, semester } = DEFAULT_CALENDAR;

    // 检查是否已存在配置
    const existingCalendar = await SemesterCalendar.findOne({
      academicYear,
      semester
    });

    if (existingCalendar) {
      console.log(`⚠️  ${academicYear} 学年 ${semester} 学期的日历配置已存在，跳过创建`);
      return;
    }

    // 创建学期日历
    const semesterCalendar = new SemesterCalendar({
      ...DEFAULT_CALENDAR,
      isActive: true
    });

    await semesterCalendar.save();

    console.log(`✅ 成功创建学期日历配置`);
    console.log(`   学年: ${academicYear}`);
    console.log(`   学期: ${semester}`);
    console.log(`   开始日期: ${semesterCalendar.startDate.toLocaleDateString()}`);
    console.log(`   结束日期: ${semesterCalendar.endDate.toLocaleDateString()}`);
    console.log(`   上课日: ${semesterCalendar.weekDays.map(d => ['', '周一', '周二', '周三', '周四', '周五', '周六', '周日'][d]).join(', ')}`);
    console.log(`   节假日数量: ${semesterCalendar.holidays.length}`);
    console.log(`   特殊日期数量: ${semesterCalendar.specialDays.length}`);
    console.log(`   总周数: ${Math.ceil((semesterCalendar.endDate.getTime() - semesterCalendar.startDate.getTime()) / (1000 * 60 * 60 * 24 * 7))}`);

  } catch (error) {
    console.error('❌ 创建默认学期日历失败:', error);
  } finally {
    // 关闭数据库连接
    await mongoose.disconnect();
    console.log('数据库连接已关闭');
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  createDefaultSemesterCalendar();
}

export { createDefaultSemesterCalendar };
