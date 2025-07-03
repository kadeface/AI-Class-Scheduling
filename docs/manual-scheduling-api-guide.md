# 手动调课API测试指南

> 📋 **功能描述**: 提供单个课程的移动、交换API，每次调用时进行冲突检测
> 
> 🗓 **完成日期**: 2025-01-02
> 
> 📍 **任务编号**: TKS-011

## API概览

手动调课API提供了4个核心端点：

1. **课程移动** - 移动单个课程到新的时间和教室
2. **课程交换** - 交换两个课程的时间和教室
3. **冲突检测** - 检查指定时间段的冲突情况
4. **可用时间段** - 获取课程可用的时间段

## API端点详情

### 1. 移动单个课程

**接口地址**: `POST /api/manual-scheduling/move`

**请求参数**:
```json
{
  "scheduleId": "课程安排ID (必需)",
  "targetTimeSlot": {
    "dayOfWeek": 1,     // 星期几 (1-7)
    "period": 3         // 第几节课 (1-N)
  },
  "targetRoomId": "目标教室ID (可选)",
  "forceMove": false    // 是否强制移动 (可选，默认false)
}
```

**成功响应**:
```json
{
  "success": true,
  "data": {
    "success": true,
    "message": "课程移动成功",
    "affectedSchedules": [...],
    "conflicts": [...],
    "violations": [...]
  },
  "message": "课程移动成功"
}
```

**冲突响应** (409):
```json
{
  "success": false,
  "error": "移动失败：存在1个硬约束冲突",
  "data": {
    "conflicts": [
      {
        "type": "teacher",
        "resourceId": "教师ID",
        "timeSlot": { "dayOfWeek": 1, "period": 3 },
        "conflictingVariables": ["冲突课程ID"],
        "severity": "critical",
        "message": "教师在星期1第3节时间段有冲突安排"
      }
    ],
    "violations": [],
    "suggestions": ["教师在星期1第3节时间段有冲突安排"]
  }
}
```

### 2. 交换两个课程

**接口地址**: `POST /api/manual-scheduling/swap`

**请求参数**:
```json
{
  "schedule1Id": "第一个课程安排ID (必需)",
  "schedule2Id": "第二个课程安排ID (必需)",
  "swapRooms": true,    // 是否同时交换教室 (可选，默认true)
  "forceSwap": false    // 是否强制交换 (可选，默认false)
}
```

**成功响应**:
```json
{
  "success": true,
  "data": {
    "success": true,
    "message": "课程交换成功",
    "affectedSchedules": [...],
    "conflicts": [...],
    "violations": [...]
  },
  "message": "课程交换成功"
}
```

### 3. 检查冲突

**接口地址**: `POST /api/manual-scheduling/check-conflicts`

**请求参数**:
```json
{
  "semester": "2023-2024-1",
  "academicYear": "2023-2024",
  "dayOfWeek": 1,
  "period": 3,
  "teacherId": "教师ID (可选)",
  "classId": "班级ID (可选)",
  "roomId": "教室ID (可选)",
  "excludeScheduleIds": ["排除的课程ID数组 (可选)"]
}
```

**响应**:
```json
{
  "success": true,
  "data": {
    "hasConflicts": true,
    "conflicts": [...],
    "timeSlot": {
      "dayOfWeek": 1,
      "period": 3,
      "description": "星期1第3节"
    }
  }
}
```

### 4. 获取可用时间段

**接口地址**: `GET /api/manual-scheduling/available-slots/:scheduleId`

**路径参数**:
- `scheduleId`: 课程安排ID

**响应**:
```json
{
  "success": true,
  "data": {
    "schedule": {...},
    "availableSlots": [
      {
        "dayOfWeek": 1,
        "period": 1,
        "conflicts": [],
        "canMove": true
      },
      {
        "dayOfWeek": 1,
        "period": 2,
        "conflicts": [...],
        "canMove": false,
        "reason": "存在时间冲突"
      }
    ],
    "totalSlots": 35,
    "availableCount": 20
  }
}
```

## 测试步骤

### 前提条件

1. **启动后端服务**:
   ```bash
   cd backend
   npm run dev
   ```

2. **确保数据库有测试数据**:
   - 需要有教师、班级、课程、教室数据
   - 需要有现有的课程安排数据
   - 需要有排课规则配置

### 测试用例1: 移动课程 (成功场景)

**请求**:
```bash
curl -X POST http://localhost:5000/api/manual-scheduling/move \
  -H "Content-Type: application/json" \
  -d '{
    "scheduleId": "现有课程安排ID",
    "targetTimeSlot": {
      "dayOfWeek": 2,
      "period": 1
    }
  }'
```

**期望结果**: 返回成功响应，课程被移动到新时间段

### 测试用例2: 移动课程 (冲突场景)

**请求**:
```bash
curl -X POST http://localhost:5000/api/manual-scheduling/move \
  -H "Content-Type: application/json" \
  -d '{
    "scheduleId": "现有课程安排ID",
    "targetTimeSlot": {
      "dayOfWeek": 1,
      "period": 1
    }
  }'
```

**期望结果**: 返回409状态码，提示冲突信息

### 测试用例3: 交换课程

**请求**:
```bash
curl -X POST http://localhost:5000/api/manual-scheduling/swap \
  -H "Content-Type: application/json" \
  -d '{
    "schedule1Id": "第一个课程安排ID",
    "schedule2Id": "第二个课程安排ID",
    "swapRooms": true
  }'
```

**期望结果**: 两个课程的时间和教室被成功交换

### 测试用例4: 检查冲突

**请求**:
```bash
curl -X POST http://localhost:5000/api/manual-scheduling/check-conflicts \
  -H "Content-Type: application/json" \
  -d '{
    "semester": "2023-2024-1",
    "academicYear": "2023-2024",
    "dayOfWeek": 1,
    "period": 1,
    "teacherId": "教师ID"
  }'
```

**期望结果**: 返回该时间段的冲突信息

### 测试用例5: 获取可用时间段

**请求**:
```bash
curl -X GET http://localhost:5000/api/manual-scheduling/available-slots/课程安排ID
```

**期望结果**: 返回该课程所有可用的时间段

## 错误处理

### 常见错误码

- **400 Bad Request**: 请求参数错误
- **404 Not Found**: 找不到指定的课程安排
- **409 Conflict**: 存在硬约束冲突
- **500 Internal Server Error**: 服务器内部错误

### 调试技巧

1. **检查日志**: 后端控制台会输出详细的错误信息
2. **验证数据**: 确保课程安排ID、教师ID等数据存在
3. **检查规则**: 确保有对应的排课规则配置
4. **逐步测试**: 先测试冲突检测，再测试实际移动/交换

## 技术实现特点

### 硬约束检测

系统会自动检测以下硬约束：
- **教师时间冲突**: 同一教师不能在同一时间段上多门课
- **班级时间冲突**: 同一班级不能在同一时间段上多门课  
- **教室时间冲突**: 同一教室不能在同一时间段安排多门课
- **禁用时间段**: 不能安排到非工作日或超出有效课时范围

### 事务处理

所有数据库更新操作都在MongoDB事务中执行，确保数据一致性。

### 约束传播

使用已完成的排课算法中的约束检测引擎，确保检测结果的准确性。

## 下一步开发

1. **软约束优化**: 实现时间偏好、工作量均衡等软约束检测
2. **批量操作**: 支持批量移动和交换课程
3. **操作历史**: 记录调课操作历史和回滚功能
4. **智能建议**: 基于约束分析提供最优调课建议

---

> 📌 **注意**: 此API依赖TKS-008完成的排课算法引擎，确保约束检测功能正常工作。 