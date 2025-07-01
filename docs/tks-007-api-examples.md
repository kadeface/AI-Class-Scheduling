# TKS-007 API测试示例

## 概述
本文档提供TKS-007新增的教学计划和排课规则API的测试示例。

## 教学计划API测试

### 1. 创建教学计划

```bash
curl -X POST http://localhost:5000/api/teaching-plans \
  -H "Content-Type: application/json" \
  -d '{
    "class": "教师ID",
    "academicYear": "2024",
    "semester": 1,
    "courseAssignments": [
      {
        "course": "课程ID",
        "teacher": "教师ID",
        "weeklyHours": 4,
        "requiresContinuous": true,
        "continuousHours": 2,
        "preferredTimeSlots": [
          {
            "dayOfWeek": 1,
            "periods": [1, 2]
          }
        ],
        "notes": "语文课连排2节"
      }
    ],
    "notes": "高一(1)班2024学年上学期教学计划"
  }'
```

### 2. 查询教学计划列表

```bash
# 基础查询
curl -X GET "http://localhost:5000/api/teaching-plans?page=1&limit=10"

# 带筛选条件
curl -X GET "http://localhost:5000/api/teaching-plans?academicYear=2024&semester=1&status=active"

# 按班级查询
curl -X GET "http://localhost:5000/api/teaching-plans?class=班级ID&keyword=高一"
```

### 3. 获取单个教学计划

```bash
curl -X GET http://localhost:5000/api/teaching-plans/教学计划ID
```

### 4. 更新教学计划

```bash
curl -X PUT http://localhost:5000/api/teaching-plans/教学计划ID \
  -H "Content-Type: application/json" \
  -d '{
    "courseAssignments": [
      {
        "course": "课程ID",
        "teacher": "新教师ID",
        "weeklyHours": 5,
        "requiresContinuous": false,
        "notes": "调整授课教师"
      }
    ],
    "notes": "更新后的教学计划"
  }'
```

### 5. 审批教学计划

```bash
# 批准
curl -X POST http://localhost:5000/api/teaching-plans/教学计划ID/approve \
  -H "Content-Type: application/json" \
  -d '{
    "approve": true,
    "comments": "教学计划安排合理，予以批准"
  }'

# 拒绝
curl -X POST http://localhost:5000/api/teaching-plans/教学计划ID/approve \
  -H "Content-Type: application/json" \
  -d '{
    "approve": false,
    "comments": "课时安排不合理，请重新调整"
  }'
```

### 6. 获取当前教学计划

```bash
curl -X GET "http://localhost:5000/api/teaching-plans/current/班级ID/2024/1"
```

### 7. 删除教学计划

```bash
# 软删除
curl -X DELETE http://localhost:5000/api/teaching-plans/教学计划ID

# 硬删除
curl -X DELETE http://localhost:5000/api/teaching-plans/教学计划ID/permanent
```

## 排课规则API测试

### 1. 创建排课规则

```bash
curl -X POST http://localhost:5000/api/scheduling-rules \
  -H "Content-Type: application/json" \
  -d '{
    "name": "高中部2024学年上学期排课规则",
    "description": "适用于高中阶段的标准排课规则",
    "schoolType": "high",
    "academicYear": "2024",
    "semester": 1,
    "timeRules": {
      "dailyPeriods": 8,
      "workingDays": [1, 2, 3, 4, 5],
      "periodDuration": 45,
      "breakDuration": 10,
      "lunchBreakStart": 4,
      "lunchBreakDuration": 90,
      "morningPeriods": [1, 2, 3, 4],
      "afternoonPeriods": [5, 6, 7, 8],
      "forbiddenSlots": []
    },
    "teacherConstraints": {
      "maxDailyHours": 6,
      "maxContinuousHours": 3,
      "minRestBetweenCourses": 1,
      "avoidFridayAfternoon": true,
      "respectTeacherPreferences": true,
      "allowCrossGradeTeaching": true
    },
    "roomConstraints": {
      "respectCapacityLimits": true,
      "allowRoomSharing": false,
      "preferFixedClassrooms": true,
      "specialRoomPriority": "preferred"
    },
    "courseArrangementRules": {
      "allowContinuousCourses": true,
      "maxContinuousHours": 2,
      "distributionPolicy": "balanced",
      "avoidFirstLastPeriod": ["体育", "音乐"],
      "coreSubjectPriority": true,
      "labCoursePreference": "morning"
    },
    "conflictResolutionRules": {
      "teacherConflictResolution": "strict",
      "roomConflictResolution": "strict",
      "classConflictResolution": "strict",
      "allowOverride": false,
      "priorityOrder": ["teacher", "room", "time"]
    },
    "isDefault": false
  }'
```

### 2. 查询排课规则列表

```bash
# 基础查询
curl -X GET "http://localhost:5000/api/scheduling-rules?page=1&limit=10"

# 按学校类型筛选
curl -X GET "http://localhost:5000/api/scheduling-rules?schoolType=high&isDefault=true"

# 按学年学期筛选
curl -X GET "http://localhost:5000/api/scheduling-rules?academicYear=2024&semester=1"
```

### 3. 获取单个排课规则

```bash
curl -X GET http://localhost:5000/api/scheduling-rules/排课规则ID
```

### 4. 更新排课规则

```bash
curl -X PUT http://localhost:5000/api/scheduling-rules/排课规则ID \
  -H "Content-Type: application/json" \
  -d '{
    "teacherConstraints": {
      "maxDailyHours": 7,
      "maxContinuousHours": 4,
      "minRestBetweenCourses": 0,
      "avoidFridayAfternoon": false,
      "respectTeacherPreferences": true,
      "allowCrossGradeTeaching": true
    }
  }'
```

### 5. 设置默认规则

```bash
curl -X POST http://localhost:5000/api/scheduling-rules/排课规则ID/set-default
```

### 6. 获取默认规则

```bash
curl -X GET "http://localhost:5000/api/scheduling-rules/default/2024/1"
```

### 7. 复制排课规则

```bash
curl -X POST http://localhost:5000/api/scheduling-rules/排课规则ID/copy \
  -H "Content-Type: application/json" \
  -d '{
    "targetAcademicYear": "2025",
    "targetSemester": 1,
    "newName": "高中部2025学年上学期排课规则"
  }'
```

### 8. 删除排课规则

```bash
# 软删除
curl -X DELETE http://localhost:5000/api/scheduling-rules/排课规则ID

# 硬删除
curl -X DELETE http://localhost:5000/api/scheduling-rules/排课规则ID/permanent
```

## 响应示例

### 成功响应格式
```json
{
  "success": true,
  "data": {
    "_id": "...",
    "name": "...",
    // 其他字段
  },
  "message": "操作成功"
}
```

### 错误响应格式
```json
{
  "success": false,
  "error": "验证失败：必须提供班级ID",
  "message": "请求参数不正确"
}
```

## 测试建议

1. **按顺序测试**: 先创建基础数据（教师、班级、课程），再测试教学计划和排课规则
2. **验证约束**: 测试各种约束条件是否正确验证
3. **权限测试**: 使用不同角色用户测试权限控制
4. **边界测试**: 测试极限情况和异常输入
5. **性能测试**: 测试大量数据下的查询性能

---

> 📝 **注意**: 请确保后端服务正在运行，并且数据库连接正常。测试前请先创建必要的基础数据。