/**
 * 使用模拟数据测试排课功能
 * 
 * 验证生成的数据是否能够成功进行智能排课
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import mongoose from 'mongoose';
import * as axios from 'axios';

// 加载环境变量
dotenv.config({ path: path.join(__dirname, '../../.env') });

const API_BASE_URL = 'http://localhost:5000/api';

/**
 * 连接数据库
 */
async function connectDatabase(): Promise<void> {
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
 * 检查后端服务是否运行
 */
async function checkBackendService(): Promise<boolean> {
  try {
    const response = await axios.get(`${API_BASE_URL}/health`, { timeout: 5000 });
    if (response.status === 200) {
      console.log('✅ 后端服务运行正常');
      return true;
    }
    return false;
  } catch (error) {
    console.log('❌ 后端服务未运行，请先启动后端服务:');
    console.log('   cd D:\\cursor_project\\AI-Class-Scheduling\\backend');
    console.log('   npm run dev');
    return false;
  }
}

/**
 * 获取教学计划数据
 */
async function getTeachingPlans(): Promise<any[]> {
  try {
    const response = await axios.get(`${API_BASE_URL}/teaching-plans`);
    const data = response.data as any;
    console.log(`✅ 获取到 ${data.data.length} 个教学计划`);
    return data.data;
  } catch (error) {
    console.error('❌ 获取教学计划失败:', error);
    throw error;
  }
}

/**
 * 测试排课API
 */
async function testSchedulingAPI(teachingPlanId: string): Promise<void> {
  try {
    console.log(`🚀 开始测试排课 (教学计划: ${teachingPlanId})...`);
    
    // 创建排课任务
    const response = await axios.post(`${API_BASE_URL}/scheduling/schedule`, {
      teachingPlanIds: [teachingPlanId],
      config: {
        mode: 'fast',
        maxIterations: 1000,
        timeLimit: 30000  // 30秒
      }
    });

    const data = response.data as any;
    if (data.success) {
      const taskId = data.data.taskId;
      console.log(`✅ 排课任务创建成功，任务ID: ${taskId}`);
      
      // 轮询检查任务状态
      let attempts = 0;
      const maxAttempts = 30; // 最多检查30次
      
      while (attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 1000)); // 等待1秒
        
        try {
          const statusResponse = await axios.get(`${API_BASE_URL}/scheduling/status/${taskId}`);
          const statusData = statusResponse.data as any;
          const status = statusData.data.status;
          const progress = statusData.data.progress;
          
          console.log(`📊 排课进度: ${status} - ${(progress * 100).toFixed(1)}%`);
          
          if (status === 'completed') {
            const result = statusData.data.result;
            console.log('🎉 排课完成!');
            console.log(`   成功率: ${(result.successRate * 100).toFixed(1)}%`);
            console.log(`   总时段: ${result.totalSlots}`);
            console.log(`   已分配: ${result.assignedSlots}`);
            console.log(`   冲突数: ${result.conflicts}`);
            console.log(`   执行时间: ${result.executionTime}ms`);
            return;
          } else if (status === 'failed') {
            console.error('❌ 排课失败:', statusData.data.error);
            return;
          }
          
          attempts++;
        } catch (error) {
          console.error('❌ 检查任务状态失败:', error);
          break;
        }
      }
      
      if (attempts >= maxAttempts) {
        console.log('⏰ 排课任务超时，但可能仍在后台运行');
      }
      
    } else {
      console.error('❌ 排课任务创建失败:', data.message);
    }
  } catch (error: any) {
    console.error('❌ 排课测试失败:', error.response?.data?.message || error.message);
  }
}

/**
 * 主执行函数
 */
async function main(): Promise<void> {
  try {
    console.log('🎯 智能排课系统 - 排课功能测试器');
    console.log('=' .repeat(50));
    
    await connectDatabase();
    
    // 检查后端服务
    const backendRunning = await checkBackendService();
    if (!backendRunning) {
      process.exit(1);
    }
    
    // 获取教学计划
    const teachingPlans = await getTeachingPlans();
    if (teachingPlans.length === 0) {
      console.log('❌ 没有找到教学计划，请先生成模拟数据');
      process.exit(1);
    }
    
    // 选择第一个教学计划进行测试
    const firstPlan = teachingPlans[0];
    console.log(`🎯 使用教学计划进行测试:`);
    console.log(`   计划ID: ${firstPlan._id}`);
    console.log(`   班级: ${firstPlan.class?.name || '未知'}`);
    console.log(`   课程数: ${firstPlan.courseAssignments.length}`);
    console.log(`   总课时: ${firstPlan.totalWeeklyHours} 节/周`);
    console.log('');
    
    // 执行排课测试
    await testSchedulingAPI(firstPlan._id);
    
    console.log('');
    console.log('✅ 排课功能测试完成！');
    
  } catch (error) {
    console.error('❌ 测试执行失败:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('📦 数据库连接已关闭');
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  main();
}

export { main as testSchedulingWithMockData };