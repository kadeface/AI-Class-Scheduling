/**
 * 数据清理脚本：修复排课规则缺少创建人信息的问题
 */

const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ai-class-scheduling';
const SYSTEM_ADMIN_ID = '68692a48c6a3f27c50bf8cba';

async function connectToDatabase() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ 成功连接到MongoDB数据库');
  } catch (error) {
    console.error('❌ 连接数据库失败:', error);
    process.exit(1);
  }
}

async function findInvalidSchedulingRules() {
  try {
    const SchedulingRules = mongoose.model('SchedulingRules');
    const invalidRules = await SchedulingRules.find({
      $or: [
        { createdBy: { $exists: false } },
        { createdBy: null },
        { createdBy: "" }
      ]
    });
    
    console.log(`🔍 发现 ${invalidRules.length} 条缺少创建人信息的排课规则记录`);
    return invalidRules;
  } catch (error) {
    console.error('❌ 查找无效记录失败:', error);
    return [];
  }
}

async function fixInvalidSchedulingRules(invalidRules) {
  if (invalidRules.length === 0) {
    console.log('✅ 没有需要修复的记录');
    return;
  }
  
  try {
    const SchedulingRules = mongoose.model('SchedulingRules');
    let fixedCount = 0;
    
    for (const rule of invalidRules) {
      try {
        rule.createdBy = new mongoose.Types.ObjectId(SYSTEM_ADMIN_ID);
        rule.updatedAt = new Date();
        await rule.save();
        
        console.log(`✅ 成功修复记录: ${rule._id} (${rule.name || '未命名'})`);
        fixedCount++;
      } catch (error) {
        console.error(`❌ 修复记录失败: ${rule._id}, 错误:`, error.message);
      }
    }
    
    console.log(`\n📊 修复结果: 成功修复 ${fixedCount} 条记录`);
    
  } catch (error) {
    console.error('❌ 修复过程失败:', error);
  }
}

async function main() {
  console.log('🚀 开始执行排课规则数据清理脚本...\n');
  
  try {
    await connectToDatabase();
    
    const invalidRules = await findInvalidSchedulingRules();
    
    if (invalidRules.length === 0) {
      console.log('✅ 数据库中没有需要修复的记录');
      return;
    }
    
    await fixInvalidSchedulingRules(invalidRules);
    console.log('\n🎉 数据清理完成！');
    
  } catch (error) {
    console.error('❌ 脚本执行失败:', error);
  } finally {
    await mongoose.disconnect();
    console.log('✅ 已断开数据库连接');
  }
}

if (require.main === module) {
  main().catch(console.error);
}
