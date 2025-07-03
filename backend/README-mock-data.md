# 智能排课系统 - 模拟数据使用指南

## 🎯 概述

本指南介绍如何在智能排课系统中生成和使用完整的模拟数据，包括教师、班级、课程、教室和教学计划，满足一周完整课程安排的需求。

## 📁 相关文件

```
backend/src/scripts/
├── generate-complete-mock-data.ts          # 完整模拟数据生成器
├── run-mock-data-generation.ts             # 数据生成执行脚本
├── validate-mock-data.ts                   # 数据验证脚本
├── test-scheduling-with-mock-data.ts       # 排课功能测试脚本
└── mock-data-generation-report.md          # 数据生成报告
```

## 🚀 快速开始

### 1. 生成模拟数据

```bash
# 进入后端目录
cd D:\cursor_project\AI-Class-Scheduling\backend

# 确保数据库运行 (MongoDB)
# 默认连接: mongodb://localhost:27017/ai-class-scheduling

# 生成完整模拟数据
npx ts-node src/scripts/run-mock-data-generation.ts
```

### 2. 验证数据完整性

```bash
# 验证生成的数据
npx ts-node src/scripts/validate-mock-data.ts
```

### 3. 测试排课功能

```bash
# 启动后端服务 (在第一个终端)
npm run dev

# 测试排课功能 (在第二个终端)
npx ts-node src/scripts/test-scheduling-with-mock-data.ts
```

## 📊 数据规模说明

### 基础数据
- **教师**: 27人，覆盖13个学科
- **班级**: 15个 (高一6个、高二5个、高三4个)
- **课程**: 13门 (语数英+理化生+政史地+艺体技)
- **教室**: 42间 (普通教室25间+专用教室17间)
- **教学计划**: 15个 (每班一个完整计划)

### 工作量统计
- **总周课时**: 495节 (33节/班 × 15班)
- **教室利用率**: 49.5% (充足)
- **师资配置**: 覆盖所有必修和选修科目

## 🔧 自定义配置

### 修改数据规模

如需调整数据规模，可编辑 `generate-complete-mock-data.ts` 文件：

```typescript
// 调整班级数量
const classesData = [
  // 添加或删除班级...
];

// 调整教师数量
const teachersData = [
  // 添加或删除教师...
];

// 调整课程设置
const coursesData = [
  // 修改周课时、连排要求等...
];
```

### 修改学年学期

```typescript
// 在班级数据中修改
{ name: '高一(1)班', grade: 10, academicYear: '2024-2025', semester: 1 }
```

### 调整教师工作量

```typescript
// 在教师数据中修改
{ name: '张文华', maxWeeklyHours: 18 }  // 调整最大周课时
```

## 📋 数据验证检查项

验证脚本会检查以下项目：

### ✅ 基础完整性
- [ ] 所有必需的数据表有数据
- [ ] 数据表间关联关系正确
- [ ] 基础字段完整无缺失

### ✅ 业务逻辑验证
- [ ] 教师学科覆盖完整
- [ ] 班级课程分配合理
- [ ] 教室容量匹配需求
- [ ] 工作量分配检查

### ✅ 排课可行性
- [ ] 时间资源充足评估
- [ ] 教室资源利用率分析
- [ ] 约束条件满足检查

## ⚠️ 常见问题解决

### 数据生成失败

**问题**: 模型验证错误
```
ValidationError: Class validation failed: grade: Cast to Number failed
```

**解决**: 检查数据模型定义，确保字段类型匹配：
- `Class.grade` 必须是数字 (10, 11, 12)
- `Class.academicYear` 格式: "2024-2025"
- `Class.semester` 只能是 1 或 2

### 教师工作量超标

**问题**: 部分教师工作量超出限制
```
❌ 超出最大工作量！
张老师: 25/20 节 (125.0%)
```

**解决方案**:
1. 增加相应学科的教师数量
2. 调整教师的 `maxWeeklyHours` 限制
3. 重新分配课程给其他教师

### 排课API测试失败

**问题**: 后端服务连接失败
```
❌ 后端服务未运行
```

**解决**: 确保后端服务正常运行：
```bash
cd D:\cursor_project\AI-Class-Scheduling\backend
npm run dev
# 确认看到: 🚀 智能排课系统API服务已启动
```

## 🔄 数据重置与更新

### 完全重置数据

```bash
# 清空所有数据并重新生成
npx ts-node src/scripts/run-mock-data-generation.ts
```

### 只更新特定数据

如需只更新部分数据，可以修改 `generate-complete-mock-data.ts` 中的 `cleanupExistingData()` 函数，注释掉不需要清空的数据表。

### 增量添加数据

```typescript
// 示例：只添加新教师，不清空现有数据
async function addNewTeachers() {
  // 不调用 cleanupExistingData()
  const newTeachers = [
    { name: '新教师', employeeId: 'T999', subjects: ['数学'] }
  ];
  // 添加逻辑...
}
```

## 📈 性能建议

### 大规模数据生成
如需生成更大规模的数据（如50+班级），建议：

1. **分批处理**: 将数据生成分成多个批次
2. **增加超时**: 调整脚本的超时设置
3. **监控内存**: 注意内存使用情况
4. **数据库索引**: 确保关键字段有索引

### 排课性能优化
对于大规模数据的排课：

1. **使用快速模式**: `config.mode = 'fast'`
2. **适当限制迭代**: `maxIterations = 1000`
3. **设置时间限制**: `timeLimit = 30000` (30秒)

## 🛠 开发扩展

### 添加新的数据类型

1. **定义数据模型**: 在 `models/` 目录添加新模型
2. **扩展生成脚本**: 在 `generate-complete-mock-data.ts` 添加生成函数
3. **更新验证脚本**: 在 `validate-mock-data.ts` 添加验证逻辑

### 自定义验证规则

```typescript
// 在 validate-mock-data.ts 中添加
async function customValidation() {
  // 自定义验证逻辑
  const issues = [];
  
  // 检查自定义业务规则
  if (someCondition) {
    issues.push('自定义问题描述');
  }
  
  return issues;
}
```

## 📞 支持与反馈

如遇到问题或需要帮助：

1. **检查日志**: 查看详细的错误日志
2. **验证环境**: 确认 Node.js、MongoDB 版本
3. **查看文档**: 参考项目文档和API说明
4. **报告问题**: 描述具体错误信息和重现步骤

---

**更新时间**: 2025-01-01  
**适用版本**: v1.0+  
**维护者**: 智能排课系统开发团队