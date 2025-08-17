/**
 * 分阶段排课测试脚本
 * 
 * 用于测试和验证分阶段排课功能，特别是课室冲突的检测和解决
 */

const mongoose = require('mongoose');
const axios = require('axios');

// 配置
const API_BASE_URL = 'http://localhost:5000';
const MONGODB_URI = 'mongodb://localhost:27017/ai-class-scheduling';

/**
 * 连接数据库
 */
async function connectDatabase() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ 数据库连接成功');
  } catch (error) {
    console.error('❌ 数据库连接失败:', error);
    process.exit(1);
  }
}

/**
 * 获取可用的教学计划
 */
async function getTeachingPlans() {
  try {
    const response = await axios.get(`${API_BASE_URL}/api/teaching-plans`);
    if (response.data.success) {
      return response.data.data;
    }
    throw new Error('获取教学计划失败');
  } catch (error) {
    console.error('❌ 获取教学计划失败:', error.message);
    return [];
  }
}

/**
 * 启动分阶段排课任务
 */
async function startStagedScheduling(teachingPlanId) {
  try {
    console.log(`🚀 开始分阶段排课测试 (教学计划: ${teachingPlanId})...`);
    
    const response = await axios.post(`${API_BASE_URL}/api/scheduling/start`, {
      academicYear: '2024-2025',
      semester: 1,
      classIds: [], // 空数组表示处理所有班级
      rulesId: null, // 使用默认规则
      algorithmConfig: {
        maxIterations: 5000,
        timeLimit: 300, // 5分钟
        enableLocalOptimization: true,
        localOptimizationIterations: 100
      },
      preserveExisting: false
    });

    if (response.data.success) {
      const taskId = response.data.data.taskId;
      console.log(`✅ 排课任务创建成功，任务ID: ${taskId}`);
      return taskId;
    } else {
      throw new Error(response.data.message || '创建排课任务失败');
    }
  } catch (error) {
    console.error('❌ 启动排课任务失败:', error.message);
    return null;
  }
}

/**
 * 监控排课任务进度
 */
async function monitorSchedulingProgress(taskId) {
  try {
    console.log(`📊 开始监控排课任务进度...`);
    
    let attempts = 0;
    const maxAttempts = 60; // 最多监控60次（5分钟）
    
    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 5000)); // 每5秒检查一次
      
      try {
        const response = await axios.get(`${API_BASE_URL}/api/scheduling/status/${taskId}`);
        const data = response.data;
        
        if (data.success) {
          const status = data.data.status;
          const progress = data.data.progress;
          
          console.log(`📊 排课进度: ${status} - ${progress.percentage}%`);
          console.log(`   阶段: ${progress.stage}`);
          console.log(`   消息: ${progress.message}`);
          console.log(`   已分配: ${progress.assignedCount}/${progress.totalCount}`);
          
          if (status === 'completed') {
            const result = data.data.result;
            console.log('🎉 分阶段排课完成!');
            console.log(`   成功率: ${result.statistics.assignedVariables}/${result.statistics.totalVariables}`);
            console.log(`   硬约束违反: ${result.statistics.hardViolations}`);
            console.log(`   软约束违反: ${result.statistics.softViolations}`);
            console.log(`   执行时间: ${result.statistics.executionTime}ms`);
            return result;
          } else if (status === 'failed') {
            console.error('❌ 排课失败:', data.data.error);
            return null;
          }
        }
        
        attempts++;
      } catch (error) {
        console.error('❌ 检查任务状态失败:', error.message);
        break;
      }
    }
    
    if (attempts >= maxAttempts) {
      console.log('⏰ 监控超时，任务可能仍在运行');
    }
    
    return null;
  } catch (error) {
    console.error('❌ 监控排课进度失败:', error.message);
    return null;
  }
}

/**
 * 验证排课结果
 */
async function validateSchedulingResult(academicYear, semester) {
  try {
    console.log(`🔍 验证排课结果...`);
    
    // 查询排课结果
    const Schedule = mongoose.model('Schedule');
    const schedules = await Schedule.find({
      academicYear,
      semester: `${academicYear}-${semester}`,
      status: 'active'
    }).populate('class course teacher room');
    
    console.log(`📊 排课结果统计:`);
    console.log(`   总课程数: ${schedules.length}`);
    
    // 按班级分组统计
    const classStats = new Map();
    schedules.forEach(schedule => {
      const className = schedule.class?.name || '未知班级';
      if (!classStats.has(className)) {
        classStats.set(className, {
          count: 0,
          subjects: new Set(),
          teachers: new Set()
        });
      }
      
      const stats = classStats.get(className);
      stats.count++;
      if (schedule.course?.subject) stats.subjects.add(schedule.course.subject);
      if (schedule.teacher?.name) stats.teachers.add(schedule.teacher.name);
    });
    
    console.log(`   班级分布:`);
    for (const [className, stats] of classStats) {
      console.log(`     ${className}: ${stats.count} 门课程, ${stats.subjects.size} 个科目, ${stats.teachers.size} 位教师`);
    }
    
    // 检查冲突
    const conflicts = await checkConflicts(schedules);
    if (conflicts.length > 0) {
      console.log(`❌ 发现 ${conflicts.length} 个冲突:`);
      conflicts.forEach((conflict, index) => {
        console.log(`   ${index + 1}. ${conflict.type} 冲突: ${conflict.message}`);
      });
    } else {
      console.log(`✅ 未发现冲突`);
    }
    
    return schedules;
  } catch (error) {
    console.error('❌ 验证排课结果失败:', error.message);
    return [];
  }
}

/**
 * 检查排课冲突
 */
async function checkConflicts(schedules) {
  const conflicts = [];
  
  // 检查时间冲突
  for (let i = 0; i < schedules.length; i++) {
    for (let j = i + 1; j < schedules.length; j++) {
      const s1 = schedules[i];
      const s2 = schedules[j];
      
      // 检查同一时间段是否有多个课程
      if (s1.dayOfWeek === s2.dayOfWeek && s1.period === s2.period) {
        // 检查教师冲突
        if (s1.teacher._id.equals(s2.teacher._id)) {
          conflicts.push({
            type: 'teacher',
            message: `教师 ${s1.teacher.name} 在星期${s1.dayOfWeek}第${s1.period}节有多个课程安排`,
            details: [s1, s2]
          });
        }
        
        // 检查班级冲突
        if (s1.class._id.equals(s2.class._id)) {
          conflicts.push({
            type: 'class',
            message: `班级 ${s1.class.name} 在星期${s1.dayOfWeek}第${s1.period}节有多个课程安排`,
            details: [s1, s2]
          });
        }
        
        // 检查教室冲突
        if (s1.room._id.equals(s2.room._id)) {
          conflicts.push({
            type: 'room',
            message: `教室 ${s1.room.name} 在星期${s1.dayOfWeek}第${s1.period}节有多个课程安排`,
            details: [s1, s2]
          });
        }
      }
    }
  }
  
  return conflicts;
}

/**
 * 主测试函数
 */
async function main() {
  try {
    console.log('🚀 开始分阶段排课测试...');
    
    // 1. 连接数据库
    await connectDatabase();
    
    // 2. 获取教学计划
    const teachingPlans = await getTeachingPlans();
    if (teachingPlans.length === 0) {
      console.log('❌ 没有可用的教学计划，请先创建教学计划');
      return;
    }
    
    console.log(`📚 找到 ${teachingPlans.length} 个教学计划`);
    const selectedPlan = teachingPlans[0]; // 选择第一个教学计划
    console.log(`📋 选择教学计划: ${selectedPlan.name} (ID: ${selectedPlan._id})`);
    
    // 3. 启动排课任务
    const taskId = await startStagedScheduling(selectedPlan._id);
    if (!taskId) {
      console.log('❌ 无法启动排课任务');
      return;
    }
    
    // 4. 监控进度
    const result = await monitorSchedulingProgress(taskId);
    if (!result) {
      console.log('❌ 排课任务未完成');
      return;
    }
    
    // 5. 验证结果
    await validateSchedulingResult('2024-2025', 1);
    
    console.log('✅ 分阶段排课测试完成');
    
  } catch (error) {
    console.error('❌ 测试执行失败:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 数据库连接已断开');
    process.exit(0);
  }
}

// 运行测试
if (require.main === module) {
  main();
}

module.exports = {
  connectDatabase,
  getTeachingPlans,
  startStagedScheduling,
  monitorSchedulingProgress,
  validateSchedulingResult,
  checkConflicts
};
