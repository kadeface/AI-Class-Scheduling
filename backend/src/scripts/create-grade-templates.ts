/**
 * 创建年级课程模板脚本
 * 
 * 为各个年级创建默认的课程配置模板，解决"未找到年级课程模板"的问题
 * 这些模板将用于教学计划管理中的课程筛选和配置
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { GradeTemplate } from '../models/GradeTemplate';
import { Course } from '../models/Course';

// 加载环境变量
dotenv.config();

/**
 * 连接数据库
 */
async function connectDatabase() {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/ai-class-scheduling';
    await mongoose.connect(mongoUri);
    console.log('✅ 数据库连接成功');
  } catch (error) {
    console.error('❌ 数据库连接失败:', error);
    throw error;
  }
}

/**
 * 获取所有可用课程
 */
async function getAllCourses() {
  try {
    const courses = await Course.find({ isActive: true }).sort({ name: 1 });
    console.log(`📚 找到 ${courses.length} 门可用课程`);
    return courses;
  } catch (error) {
    console.error('❌ 获取课程失败:', error);
    throw error;
  }
}

/**
 * 创建小学年级模板
 */
async function createPrimarySchoolTemplates(courses: any[]) {
  const primaryGrades = ['一年级', '二年级', '三年级', '四年级', '五年级', '六年级'];
  
  for (const grade of primaryGrades) {
    // 根据年级筛选适合的课程
    const gradeCourses = courses.filter(course => {
      const courseName = course.name.toLowerCase();
      
      // 检查课程名称是否包含该年级
      if (!courseName.includes(grade.toLowerCase())) {
        return false;
      }
      
      // 根据学科分类筛选
      const subjects = ['语文', '数学', '英语', '科学',  '音乐', '美术', '体育', '写字', '情商管理', '道德与法治', '班会'];
      return subjects.some(subject => courseName.includes(subject.toLowerCase()));
    });

    if (gradeCourses.length === 0) {
      console.log(`⚠️  ${grade}没有找到合适的课程`);
      continue;
    }

    // 创建课程配置 - 修复类型匹配问题
    const courseConfigs = gradeCourses.map(course => ({
      courseId: course._id.toString(),
      courseName: course.name,
      weeklyHours: 2, // 默认每周2课时
      priority: 'core' as const,
      requiresContinuous: false,
      continuousHours: undefined,
      preferredTimeSlots: [],
      avoidTimeSlots: [],
      notes: ''
    }));

    // 检查是否已存在该年级的默认模板
    const existingTemplate = await GradeTemplate.findOne({ 
      grade, 
      isDefault: true 
    });

    if (existingTemplate) {
      console.log(`🔄 更新${grade}的默认模板`);
      existingTemplate.courses = courseConfigs;
      existingTemplate.updatedAt = new Date();
      await existingTemplate.save();
    } else {
      console.log(`✨ 创建${grade}的默认模板`);
      const template = new GradeTemplate({
        name: `${grade}标准课程模板`,
        grade,
        description: `${grade}的标准课程配置模板`,
        courses: courseConfigs,
        isDefault: true,
        isActive: true,
        createdBy: 'system'
      });
      await template.save();
    }

    console.log(`   📖 包含 ${gradeCourses.length} 门课程`);
  }
}

/**
 * 创建初中年级模板
 */
async function createJuniorHighTemplates(courses: any[]) {
  const juniorGrades = ['七年级', '八年级', '九年级'];
  
  for (const grade of juniorGrades) {
    const gradeCourses = courses.filter(course => {
      const courseName = course.name.toLowerCase();
      
      if (!courseName.includes(grade.toLowerCase())) {
        return false;
      }
      
      const subjects = ['语文', '数学', '英语', '物理', '化学', '生物', '历史', '地理', '政治', '音乐', '美术', '体育', '班会', '信息科技', '心理健康', '劳动教育'];
      return subjects.some(subject => courseName.includes(subject.toLowerCase()));
    });

    if (gradeCourses.length === 0) {
      console.log(`⚠️  ${grade}没有找到合适的课程`);
      continue;
    }

    // 创建课程配置 - 修复类型匹配问题
    const courseConfigs = gradeCourses.map(course => ({
      courseId: course._id.toString(),
      courseName: course.name,
      weeklyHours: 3,
      priority: 'core' as const,
      requiresContinuous: false,
      continuousHours: undefined,
      preferredTimeSlots: [],
      avoidTimeSlots: [],
      notes: ''
    }));

    const existingTemplate = await GradeTemplate.findOne({ 
      grade, 
      isDefault: true 
    });

    if (existingTemplate) {
      console.log(`🔄 更新${grade}的默认模板`);
      existingTemplate.courses = courseConfigs;
      existingTemplate.updatedAt = new Date();
      await existingTemplate.save();
    } else {
      console.log(`✨ 创建${grade}的默认模板`);
      const template = new GradeTemplate({
        name: `${grade}标准课程模板`,
        grade,
        description: `${grade}的标准课程配置模板`,
        courses: courseConfigs,
        isDefault: true,
        isActive: true,
        createdBy: 'system'
      });
      await template.save();
    }

    console.log(`   📖 包含 ${gradeCourses.length} 门课程`);
  }
}

/**
 * 创建高中年级模板
 */
async function createSeniorHighTemplates(courses: any[]) {
  const seniorGrades = ['高一', '高二', '高三'];
  
  for (const grade of seniorGrades) {
    const gradeCourses = courses.filter(course => {
      const courseName = course.name.toLowerCase();
      
      if (!courseName.includes(grade.toLowerCase())) {
        return false;
      }
      
      const subjects = ['语文', '数学', '英语', '物理', '化学', '生物', '历史', '地理', '政治', '音乐', '美术', '体育', '班会', '信息科技', '心理健康', '劳动教育'];
      return subjects.some(subject => courseName.includes(subject.toLowerCase()));
    });

    if (gradeCourses.length === 0) {
      console.log(`⚠️  ${grade}没有找到合适的课程`);
      continue;
    }

    // 创建课程配置 - 修复类型匹配问题
    const courseConfigs = gradeCourses.map(course => ({
      courseId: course._id.toString(),
      courseName: course.name,
      weeklyHours: 4,
      priority: 'core' as const,
      requiresContinuous: false,
      continuousHours: undefined,
      preferredTimeSlots: [],
      avoidTimeSlots: [],
      notes: ''
    }));

    const existingTemplate = await GradeTemplate.findOne({ 
      grade, 
      isDefault: true 
    });

    if (existingTemplate) {
      console.log(`🔄 更新${grade}的默认模板`);
      existingTemplate.courses = courseConfigs;
      existingTemplate.updatedAt = new Date();
      await existingTemplate.save();
    } else {
      console.log(`✨ 创建${grade}的默认模板`);
      const template = new GradeTemplate({
        name: `${grade}标准课程模板`,
        grade,
        description: `${grade}的标准课程配置模板`,
        courses: courseConfigs,
        isDefault: true,
        isActive: true,
        createdBy: 'system'
      });
      await template.save();
    }

    console.log(`   📖 包含 ${gradeCourses.length} 门课程`);
  }
}

/**
 * 主函数
 */
async function main() {
  try {
    console.log('🚀 开始创建年级课程模板...');
    
    // 连接数据库
    await connectDatabase();
    
    // 获取所有课程
    const courses = await getAllCourses();
    
    if (courses.length === 0) {
      console.log('❌ 没有找到任何课程，请先创建课程数据');
      return;
    }
    
    // 创建各年级模板
    console.log('\n📚 创建小学年级模板...');
    await createPrimarySchoolTemplates(courses);
    
    console.log('\n📚 创建初中年级模板...');
    await createJuniorHighTemplates(courses);
    
    console.log('\n📚 创建高中年级模板...');
    await createSeniorHighTemplates(courses);
    
    console.log('\n✅ 年级课程模板创建完成！');
    
    // 验证结果
    const templates = await GradeTemplate.find({ isDefault: true });
    console.log(`\n📊 创建的默认模板数量: ${templates.length}`);
    templates.forEach(template => {
      console.log(`   - ${template.grade}: ${template.name} (${template.courses.length}门课程)`);
    });
    
  } catch (error) {
    console.error('❌ 创建年级模板失败:', error);
  } finally {
    // 关闭数据库连接
    await mongoose.disconnect();
    console.log('🔌 数据库连接已关闭');
  }
}

// 运行脚本
if (require.main === module) {
  main();
}
