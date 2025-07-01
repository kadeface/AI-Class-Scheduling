# 排课算法演示指南

## 🚀 快速开始

### 1. 启动系统

#### 启动后端服务
```powershell
cd D:\cursor_project\AI-Class-Scheduling\backend
npm run dev
```
**确认看到**: "🚀 智能排课系统API服务已启动"

#### 启动前端服务
```powershell
cd D:\cursor_project\AI-Class-Scheduling\frontend
npm run dev
```
**访问地址**: http://localhost:3000

### 2. 运行算法测试

#### 完整算法测试
```powershell
cd D:\cursor_project\AI-Class-Scheduling\backend
npx ts-node src/scripts/test-scheduling-algorithm.ts
```

该测试将自动：
- 生成测试数据（班级、课程、教师、教室、教学计划）
- 执行排课算法
- 显示性能统计和结果分析

#### 预期输出示例
```
🧪 智能排课算法测试工具
===========================

📡 连接数据库...
✅ 数据库连接成功
🧹 清理旧测试数据...
✅ 数据清理完成

📊 开始基本功能测试...
  🔧 生成测试数据...
  ✅ 生成数据完成: 2个班级, 9门课程, 9位教师

  🚀 开始执行排课算法...
    初始化: 0.0% - 正在启动排课任务...
    预处理: 10.0% - 正在进行约束传播...
    求解: 20.0% - 正在执行回溯算法...
    求解: 65.2% - 已分配 32/49 个课程
    优化: 80.0% - 正在进行局部优化...
    完成: 100.0% - 排课算法执行完成

📈 排课结果统计:
  ✅ 执行状态: 成功
  ⏱️  执行时间: 2847ms
  📚 总变量数: 49
  ✔️  已分配: 49
  ❌ 未分配: 0
  🚫 硬约束违反: 0
  ⚠️  软约束违反: 3
  🎯 总评分: -60

🚀 开始性能基准测试...

  📊 测试 小规模（2个班级）...
    ⏱️  执行时间: 1892ms
    📊 成功率: 49/49 (100.0%)
    🎯 算法效率: 25.9 分配/秒

  📊 测试 中等规模（5个班级）...
    ⏱️  执行时间: 8234ms
    📊 成功率: 122/123 (99.2%)
    🎯 算法效率: 14.8 分配/秒

  📊 测试 大规模（10个班级）...
    ⏱️  执行时间: 45672ms
    📊 成功率: 241/245 (98.4%)
    🎯 算法效率: 5.3 分配/秒

🎉 所有测试完成!
```

## 🌐 API 接口演示

### 3. 使用 API 进行排课

#### 方法一：前端界面操作
1. 访问 http://localhost:3000/management/schedules
2. 点击"智能排课"按钮
3. 配置排课参数
4. 启动排课任务
5. 查看进度和结果

#### 方法二：直接调用 API

##### 启动排课任务
```bash
curl -X POST http://localhost:5000/api/scheduling/start \
  -H "Content-Type: application/json" \
  -d '{
    "academicYear": "2024-2025",
    "semester": 1,
    "algorithmConfig": {
      "maxIterations": 5000,
      "timeLimit": 120,
      "enableLocalOptimization": true
    }
  }'
```

**响应示例**:
```json
{
  "success": true,
  "data": {
    "taskId": "60f7b3b4a1b2c3d4e5f6g7h8",
    "message": "排课任务已启动"
  }
}
```

##### 查询任务状态
```bash
curl http://localhost:5000/api/scheduling/tasks/60f7b3b4a1b2c3d4e5f6g7h8
```

**响应示例**:
```json
{
  "success": true,
  "data": {
    "id": "60f7b3b4a1b2c3d4e5f6g7h8",
    "status": "completed",
    "progress": {
      "stage": "完成",
      "percentage": 100,
      "message": "排课算法执行完成",
      "assignedCount": 49,
      "totalCount": 49
    },
    "result": {
      "success": true,
      "statistics": {
        "totalVariables": 49,
        "assignedVariables": 49,
        "unassignedVariables": 0,
        "hardViolations": 0,
        "softViolations": 3,
        "executionTime": 2847
      }
    },
    "startTime": "2025-01-01T12:00:00.000Z",
    "endTime": "2025-01-01T12:00:02.847Z"
  }
}
```

##### 验证排课结果
```bash
curl -X POST http://localhost:5000/api/scheduling/validate \
  -H "Content-Type: application/json" \
  -d '{
    "academicYear": "2024-2025",
    "semester": 1
  }'
```

## 📊 算法配置说明

### 预设配置模式

#### 快速排课 (fast)
```json
{
  "algorithmConfig": {
    "maxIterations": 5000,
    "timeLimit": 120,
    "enableLocalOptimization": false
  }
}
```
- **适用场景**: 简单排课需求，追求速度
- **特点**: 快速生成基本可用的课表

#### 均衡排课 (balanced)
```json
{
  "algorithmConfig": {
    "maxIterations": 10000,
    "timeLimit": 300,
    "enableLocalOptimization": true,
    "localOptimizationIterations": 50
  }
}
```
- **适用场景**: 一般排课需求，平衡质量和速度
- **特点**: 平衡的排课质量和执行时间

#### 精细排课 (thorough)
```json
{
  "algorithmConfig": {
    "maxIterations": 20000,
    "timeLimit": 600,
    "enableLocalOptimization": true,
    "localOptimizationIterations": 200
  }
}
```
- **适用场景**: 复杂排课需求，追求最佳质量
- **特点**: 最高质量的排课结果，执行时间较长

### 参数详解

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `maxIterations` | number | 10000 | 最大迭代次数，影响搜索深度 |
| `timeLimit` | number | 300 | 时间限制（秒），防止无限运行 |
| `backtrackLimit` | number | 1000 | 回溯次数限制，控制搜索范围 |
| `enableLocalOptimization` | boolean | true | 是否启用局部优化 |
| `localOptimizationIterations` | number | 100 | 局部优化迭代次数 |
| `verbose` | boolean | false | 是否输出详细日志 |

## 🔧 故障排除

### 常见问题及解决方案

#### 1. 排课失败 - 无可行解
**症状**: 算法返回 `success: false`，未分配变量较多

**可能原因**:
- 约束条件过于严格
- 教师或教室资源不足
- 时间段配置不合理

**解决方案**:
```bash
# 检查排课规则配置
curl http://localhost:5000/api/scheduling-rules

# 验证教学计划配置
curl http://localhost:5000/api/teaching-plans

# 调整算法配置，放宽限制
{
  "algorithmConfig": {
    "maxIterations": 20000,
    "timeLimit": 600
  }
}
```

#### 2. 性能问题 - 执行时间过长
**症状**: 排课任务运行时间超过预期

**解决方案**:
```bash
# 使用快速模式
{
  "algorithmConfig": {
    "maxIterations": 5000,
    "timeLimit": 120,
    "enableLocalOptimization": false
  }
}

# 分批处理班级
{
  "classIds": ["班级1", "班级2"],  // 只处理部分班级
  "preserveExisting": true
}
```

#### 3. 约束违反 - 课表存在冲突
**症状**: 验证API返回冲突信息

**解决方案**:
```bash
# 运行验证检查详细冲突
curl -X POST http://localhost:5000/api/scheduling/validate \
  -H "Content-Type: application/json" \
  -d '{"academicYear": "2024-2025", "semester": 1}'

# 重新排课，不保留现有安排
{
  "preserveExisting": false
}
```

## 📈 性能优化建议

### 1. 数据准备优化
- 确保教学计划数据完整且已审批
- 检查教师和教室资源充足性
- 避免设置相互冲突的排课规则

### 2. 算法调优
```javascript
// 针对大规模排课的优化配置
{
  "algorithmConfig": {
    "maxIterations": 15000,
    "timeLimit": 480,  // 8分钟
    "enableLocalOptimization": true,
    "localOptimizationIterations": 50,
    "verbose": false
  },
  "preserveExisting": false  // 重新排课
}
```

### 3. 分阶段排课
```javascript
// 先排核心课程
{
  "classIds": ["高一1班", "高一2班"],
  "coreSubjectsOnly": true
}

// 再排选修课程
{
  "classIds": ["高一1班", "高一2班"], 
  "preserveExisting": true,
  "electiveSubjectsOnly": true
}
```

## 📞 技术支持

如有问题，请参考：
- 📚 [技术文档](./backend/src/services/scheduling/README.md)
- 🧪 [测试用例](./backend/src/scripts/test-scheduling-algorithm.ts)
- 📋 [任务完成报告](./TKS-008-completion-report.md)
- 🔍 查看系统日志获取详细错误信息