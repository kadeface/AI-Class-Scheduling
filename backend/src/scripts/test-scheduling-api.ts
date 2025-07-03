/**
 * 测试排课API脚本
 * 
 * 用于验证排课服务是否正常工作
 */

import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000';

/**
 * 测试排课API
 * 
 * Returns:
 *   Promise<void>: 测试执行Promise
 */
async function testSchedulingAPI(): Promise<void> {
  try {
    console.log('🧪 开始测试排课API...');
    
    // 测试启动排课任务
    const schedulingRequest = {
      academicYear: '2024-2025',
      semester: 1,
      classIds: [], // 空数组表示为所有班级排课
      rulesId: null, // 使用默认规则
      mode: 'fast' // 快速模式
    };
    
    console.log('📤 发送排课请求...');
    const response = await axios.post(`${API_BASE_URL}/api/scheduling/start`, schedulingRequest);
    
    if ((response.data as any).success) {
      const taskId = (response.data as any).data.taskId;
      console.log('✅ 排课任务启动成功, 任务ID:', taskId);
      
      // 查询任务状态
      console.log('📊 查询任务状态...');
      const statusResponse = await axios.get(`${API_BASE_URL}/api/scheduling/tasks/${taskId}`);
      
      if ((statusResponse.data as any).success) {
        console.log('✅ 任务状态查询成功:', (statusResponse.data as any).data);
      } else {
        console.log('❌ 任务状态查询失败:', (statusResponse.data as any).error);
      }
      
    } else {
      console.log('❌ 排课任务启动失败:', (response.data as any).error);
    }
    
  } catch (error: any) {
    if (error.response) {
      console.error('❌ API请求失败:', error.response.status, error.response.data);
    } else if (error.request) {
      console.error('❌ 网络请求失败:', error.message);
      console.log('💡 请确保后端服务已启动 (npm run dev)');
    } else {
      console.error('❌ 请求配置错误:', error.message);
    }
  }
}

/**
 * 主执行函数
 * 
 * Returns:
 *   Promise<void>: 主执行Promise
 */
async function main(): Promise<void> {
  await testSchedulingAPI();
}

// 如果直接运行此脚本
if (require.main === module) {
  main();
}

export { main as testSchedulingAPI };