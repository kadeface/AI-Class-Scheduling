/**
 * 简单的K12排课引擎测试
 * 
 * 验证K12排课引擎是否被正确集成
 */

console.log('🧪 开始测试K12排课引擎集成...\n');

// 检查K12排课引擎文件是否存在
const fs = require('fs');
const path = require('path');

const k12Files = [
  '../src/services/scheduling/k12-scheduling-engine.ts',
  '../src/services/scheduling/k12-room-allocator.ts',
  '../src/services/scheduling/k12-constraint-checker.ts',
  '../src/services/scheduling/k12-score-optimizer.ts',
  '../src/services/scheduling/k12-scheduling-service.ts'
];

console.log('📁 检查K12排课引擎文件:');
k12Files.forEach(file => {
  const fullPath = path.join(__dirname, file);
  if (fs.existsSync(fullPath)) {
    console.log(`   ✅ ${file} - 存在`);
  } else {
    console.log(`   ❌ ${file} - 不存在`);
  }
});

// 检查排课服务是否已更新
const schedulingServicePath = path.join(__dirname, '../src/services/scheduling/scheduling-service.ts');
if (fs.existsSync(schedulingServicePath)) {
  const content = fs.readFileSync(schedulingServicePath, 'utf8');
  
  console.log('\n🔍 检查排课服务集成状态:');
  
  if (content.includes('K12SchedulingService')) {
    console.log('   ✅ K12SchedulingService 已导入');
  } else {
    console.log('   ❌ K12SchedulingService 未导入');
  }
  
  if (content.includes('useK12')) {
    console.log('   ✅ useK12 参数已添加');
  } else {
    console.log('   ❌ useK12 参数未添加');
  }
  
  if (content.includes('executeK12Scheduling')) {
    console.log('   ✅ executeK12Scheduling 方法已添加');
  } else {
    console.log('   ❌ executeK12Scheduling 方法未添加');
  }
} else {
  console.log('   ❌ 排课服务文件不存在');
}

// 检查排课控制器是否已更新
const schedulingControllerPath = path.join(__dirname, '../src/controllers/scheduling-controller.ts');
if (fs.existsSync(schedulingControllerPath)) {
  const content = fs.readFileSync(schedulingControllerPath, 'utf8');
  
  console.log('\n🔍 检查排课控制器集成状态:');
  
  if (content.includes('useK12')) {
    console.log('   ✅ useK12 参数已添加到控制器');
  } else {
    console.log('   ❌ useK12 参数未添加到控制器');
  }
  
  if (content.includes('K12排课引擎')) {
    console.log('   ✅ K12排课引擎日志已添加');
  } else {
    console.log('   ❌ K12排课引擎日志未添加');
  }
} else {
  console.log('   ❌ 排课控制器文件不存在');
}

console.log('\n🎯 集成状态检查完成');
console.log('\n💡 使用方法:');
console.log('   1. 启动后端服务: npm run dev');
console.log('   2. 发送排课请求: POST /api/scheduling/start');
console.log('   3. 请求体: { "academicYear": "2025-2026", "semester": 1, "useK12": true }');
console.log('\n📝 注意: 设置 useK12: true 将启用K12排课引擎');
