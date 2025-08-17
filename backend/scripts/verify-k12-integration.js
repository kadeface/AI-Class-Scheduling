/**
 * 验证K12排课引擎集成是否生效
 * 
 * 检查代码修改是否已经生效
 */

const fs = require('fs');
const path = require('path');

console.log('🧪 验证K12排课引擎集成状态...\n');

// 检查关键文件
const keyFiles = [
  '../src/services/scheduling/scheduling-service.ts',
  '../src/controllers/scheduling-controller.ts',
  '../src/services/scheduling/k12-scheduling-service.ts'
];

console.log('📁 检查关键文件:');
keyFiles.forEach(file => {
  const fullPath = path.join(__dirname, file);
  if (fs.existsSync(fullPath)) {
    console.log(`   ✅ ${file} - 存在`);
  } else {
    console.log(`   ❌ ${file} - 不存在`);
  }
});

// 检查排课服务中的强制设置
const schedulingServicePath = path.join(__dirname, '../src/services/scheduling/scheduling-service.ts');
if (fs.existsSync(schedulingServicePath)) {
  const content = fs.readFileSync(schedulingServicePath, 'utf8');
  
  console.log('\n🔍 检查排课服务强制设置:');
  
  if (content.includes('request.useK12 = true;')) {
    console.log('   ✅ 强制设置 useK12 = true 已生效');
  } else {
    console.log('   ❌ 强制设置 useK12 = true 未生效');
  }
  
  if (content.includes('executeK12Scheduling')) {
    console.log('   ✅ executeK12Scheduling 方法已添加');
  } else {
    console.log('   ❌ executeK12Scheduling 方法未添加');
  }
  
  if (content.includes('K12SchedulingService')) {
    console.log('   ✅ K12SchedulingService 已导入');
  } else {
    console.log('   ❌ K12SchedulingService 未导入');
  }
} else {
  console.log('   ❌ 排课服务文件不存在');
}

// 检查排课控制器
const schedulingControllerPath = path.join(__dirname, '../src/controllers/scheduling-controller.ts');
if (fs.existsSync(schedulingControllerPath)) {
  const content = fs.readFileSync(schedulingControllerPath, 'utf8');
  
  console.log('\n🔍 检查排课控制器:');
  
  if (content.includes('useK12 = false')) {
    console.log('   ✅ useK12 参数默认值已设置');
  } else {
    console.log('   ❌ useK12 参数默认值未设置');
  }
  
  if (content.includes('K12排课引擎')) {
    console.log('   ✅ K12排课引擎日志已添加');
  } else {
    console.log('   ❌ K12排课引擎日志未添加');
  }
} else {
  console.log('   ❌ 排课控制器文件不存在');
}

// 检查编译状态
console.log('\n🔍 检查编译状态:');
const distPath = path.join(__dirname, '../dist');
if (fs.existsSync(distPath)) {
  console.log('   ✅ dist 目录存在，代码已编译');
  
  // 检查编译后的文件
  const compiledServicePath = path.join(distPath, 'src/services/scheduling/scheduling-service.js');
  if (fs.existsSync(compiledServicePath)) {
    const compiledContent = fs.readFileSync(compiledServicePath, 'utf8');
    
    if (compiledContent.includes('request.useK12 = true')) {
      console.log('   ✅ 编译后的代码包含强制设置');
    } else {
      console.log('   ❌ 编译后的代码不包含强制设置');
    }
  } else {
    console.log('   ⚠️ 编译后的服务文件不存在');
  }
} else {
  console.log('   ⚠️ dist 目录不存在，代码可能未编译');
}

console.log('\n🎯 验证完成');
console.log('\n💡 如果发现问题，请执行以下步骤:');
console.log('   1. 重新编译: npx tsc');
console.log('   2. 重启服务: npm run dev');
console.log('   3. 检查日志确认K12引擎被调用');
