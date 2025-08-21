# 调试日志规则 (Debug Logging Rules)

## 🔧 核心规则：循环数据只输出前3条

为了避免日志冗长，提高可读性，所有循环中的调试信息都应该遵循以下规则：

### 1. 基本规则
```typescript
// ❌ 错误：输出所有循环数据
for (const item of items) {
  console.log(`处理项目: ${item.name}`);
}

// ✅ 正确：只输出前3条
let count = 0;
for (const item of items) {
  if (count < 3) {
    console.log(`处理项目: ${item.name}`);
  }
  count++;
}
```

### 2. 嵌套循环规则
```typescript
// ✅ 正确：多层循环都只输出前3条
let outerCount = 0;
let innerCount = 0;

for (const outer of outerItems) {
  if (outerCount < 3) {
    console.log(`外层项目: ${outer.name}`);
  }
  
  for (const inner of outer.innerItems) {
    if (innerCount < 3) {
      console.log(`  内层项目: ${inner.name}`);
    }
    innerCount++;
  }
  
  outerCount++;
}
```

### 3. 统计信息输出
```typescript
// 循环结束后输出统计信息
console.log(`📊 处理完成: 共处理 ${items.length} 个项目`);
```

### 4. 错误信息例外
```typescript
// 错误信息不受前3条限制，应该全部输出
for (const item of items) {
  if (item.hasError) {
    console.error(`❌ 错误: ${item.name} - ${item.errorMessage}`);
  }
}
```

## 📍 应用范围

### 必须应用的文件
- `scheduling-service.ts` ✅ 已应用
- `k12-scheduling-engine.ts` - 待应用
- `core-course-engine.ts` - 待应用
- 其他包含循环调试信息的文件

### 应用场景
- 教学计划处理循环
- 课程分配循环
- 时间槽处理循环
- 教室分配循环
- 教师分配循环
- 任何可能产生大量日志的循环

## 🎯 实施步骤

1. **识别循环**：找到包含 `for` 循环的调试信息
2. **添加计数器**：在循环前添加计数器变量
3. **条件输出**：使用 `if (count < 3)` 条件
4. **更新计数器**：在循环内更新计数器
5. **添加统计**：在循环结束后输出总数

## 📝 示例模板

```typescript
/**
 * 函数名称
 * 
 * 🔧 调试信息规则：循环数据只输出前3条，避免日志冗长
 */
private async processItems(items: any[]): Promise<void> {
  console.log(`🔍 开始处理 ${items.length} 个项目...`);
  
  // 🔧 简化调试信息：只输出前3条，避免日志冗长
  let count = 0;
  
  for (const item of items) {
    if (count < 3) {
      console.log(`   📋 处理项目: ${item.name}`);
    }
    
    // 处理逻辑...
    
    count++;
  }
  
  console.log(`✅ 处理完成: 共处理 ${items.length} 个项目`);
}
```

## 🚫 禁止行为

- ❌ 在循环中输出所有数据
- ❌ 输出无意义的重复信息
- ❌ 输出过长的对象内容
- ❌ 在生产环境中保留调试信息

## ✅ 推荐行为

- ✅ 只输出前3条循环数据
- ✅ 输出关键统计信息
- ✅ 输出错误和警告信息
- ✅ 使用清晰的日志前缀（如 🔍, 📊, ✅, ❌）
- ✅ 在生产环境中移除或简化调试信息

---

**注意**：此规则适用于整个代码库，所有新代码都应该遵循这个规范。
