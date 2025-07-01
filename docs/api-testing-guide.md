# 用户管理API测试指南

## 概述
本文档提供TKS-002任务完成后的用户管理API测试指南，包括所有可用的API端点和测试示例。

## API基础信息
- **基础URL**: `http://localhost:5000/api`
- **响应格式**: JSON
- **认证**: 目前未实现（后续版本将添加JWT认证）

## 统一响应格式
```json
{
  "success": boolean,
  "message": string,
  "data": any,           // 可选，成功时包含数据
  "error": string        // 可选，失败时包含错误信息
}
```

## API端点列表

### 1. 创建用户
**POST** `/api/users`

请求体示例：
```json
{
  "username": "teacher001",
  "password": "123456",
  "role": "teacher",
  "profile": {
    "name": "张老师",
    "employeeId": "T001",
    "email": "zhang@school.com",
    "phone": "13800138000",
    "department": "数学组"
  }
}
```

### 2. 获取用户列表
**GET** `/api/users`

查询参数：
- `page`: 页码（默认: 1）
- `limit`: 每页数量（默认: 10）
- `role`: 角色筛选（admin/staff/teacher）
- `isActive`: 状态筛选（true/false）
- `department`: 部门筛选
- `keyword`: 关键词搜索（用户名或姓名）
- `sortBy`: 排序字段（默认: createdAt）
- `sortOrder`: 排序方向（asc/desc，默认: desc）

示例：
```
GET /api/users?page=1&limit=5&role=teacher&keyword=张
```

### 3. 获取单个用户
**GET** `/api/users/:id`

示例：
```
GET /api/users/64f5e8a1b2c3d4e5f6a7b8c9
```

### 4. 更新用户
**PUT** `/api/users/:id`

请求体示例（只需提供要更新的字段）：
```json
{
  "role": "staff",
  "profile": {
    "phone": "13900139000",
    "department": "教务处"
  },
  "isActive": true
}
```

### 5. 删除用户（软删除）
**DELETE** `/api/users/:id`

示例：
```
DELETE /api/users/64f5e8a1b2c3d4e5f6a7b8c9
```

### 6. 永久删除用户
**DELETE** `/api/users/:id/permanent`

示例：
```
DELETE /api/users/64f5e8a1b2c3d4e5f6a7b8c9/permanent
```

## 测试步骤

### 使用Postman测试

1. **启动服务器**
   ```bash
   cd backend
   npm run dev
   ```

2. **创建第一个用户**
   - 方法: POST
   - URL: `http://localhost:5000/api/users`
   - Headers: `Content-Type: application/json`
   - Body: 使用上面的创建用户示例

3. **获取用户列表**
   - 方法: GET  
   - URL: `http://localhost:5000/api/users`

4. **测试筛选和分页**
   - URL: `http://localhost:5000/api/users?page=1&limit=2&role=teacher`

### 使用curl测试

```bash
# 创建用户
curl -X POST http://localhost:5000/api/users \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin001",
    "password": "123456",
    "role": "admin",
    "profile": {
      "name": "管理员",
      "email": "admin@school.com"
    }
  }'

# 获取用户列表
curl http://localhost:5000/api/users

# 获取单个用户（需要真实的用户ID）
curl http://localhost:5000/api/users/USER_ID_HERE
```

## 常见错误码

- **400**: 请求数据验证失败
- **404**: 用户不存在
- **409**: 用户名或工号冲突
- **500**: 服务器内部错误

## 验证功能

API包含以下验证：
- 用户名长度（3-50字符）
- 密码长度（最少6字符）
- 邮箱格式验证
- 手机号格式验证（中国手机号）
- 用户名唯一性
- 工号唯一性（如果提供）

## 测试数据建议

建议创建以下测试用户来验证不同场景：

```json
// 管理员
{
  "username": "admin",
  "password": "admin123",
  "role": "admin",
  "profile": {
    "name": "系统管理员"
  }
}

// 教务员
{
  "username": "staff001",
  "password": "staff123",
  "role": "staff",
  "profile": {
    "name": "教务员",
    "department": "教务处"
  }
}

// 教师
{
  "username": "teacher001",
  "password": "teacher123",
  "role": "teacher",
  "profile": {
    "name": "语文老师",
    "department": "语文组",
    "employeeId": "T001"
  }
}
```
---

## TKS-004: 教学资源管理API

> **更新时间**: 2024-12-19  
> **状态**: 已完成

### 教师管理API

#### 1. 创建教师
**POST** `/api/teachers`

请求体示例：
```json
{
  "name": "张老师",
  "employeeId": "T001",
  "subjects": ["数学", "物理"],
  "maxWeeklyHours": 20,
  "unavailableSlots": [
    {
      "dayOfWeek": 1,
      "periods": [1, 2]
    }
  ],
  "preferences": {
    "preferMorning": true,
    "maxContinuousHours": 3
  }
}
```

#### 2. 获取教师列表
**GET** `/api/teachers`

查询参数：
- `page`: 页码（默认: 1）
- `limit`: 每页数量（默认: 10）
- `subjects`: 学科筛选
- `isActive`: 状态筛选（true/false）
- `keyword`: 关键词搜索（姓名或工号）
- `sortBy`: 排序字段（默认: createdAt）
- `sortOrder`: 排序方向（asc/desc）

#### 3. 获取单个教师
**GET** `/api/teachers/:id`

#### 4. 更新教师
**PUT** `/api/teachers/:id`

#### 5. 删除教师（软删除）
**DELETE** `/api/teachers/:id`

#### 6. 永久删除教师
**DELETE** `/api/teachers/:id/permanent`

### 班级管理API

#### 1. 创建班级
**POST** `/api/classes`

请求体示例：
```json
{
  "name": "高一(1)班",
  "grade": 10,
  "studentCount": 45,
  "homeroom": "607f1f77bcf86cd799439011",
  "classTeacher": "607f1f77bcf86cd799439012",
  "academicYear": "2023-2024",
  "semester": 1
}
```

#### 2. 获取班级列表
**GET** `/api/classes`

查询参数：
- `grade`: 年级筛选
- `academicYear`: 学年筛选
- `semester`: 学期筛选
- `isActive`: 状态筛选
- `keyword`: 关键词搜索（班级名称）

#### 3. 获取单个班级
**GET** `/api/classes/:id`

#### 4. 更新班级
**PUT** `/api/classes/:id`

#### 5. 删除班级（软删除）
**DELETE** `/api/classes/:id`

#### 6. 永久删除班级
**DELETE** `/api/classes/:id/permanent`

### 课程管理API

#### 1. 创建课程
**POST** `/api/courses`

请求体示例：
```json
{
  "name": "高等数学",
  "subject": "数学",
  "courseCode": "MATH001",
  "weeklyHours": 4,
  "requiresContinuous": true,
  "continuousHours": 2,
  "roomRequirements": {
    "types": ["普通教室", "多媒体教室"],
    "capacity": 50,
    "equipment": ["投影仪", "智慧黑板"]
  },
  "isWeeklyAlternating": false,
  "description": "高中数学核心课程"
}
```

#### 2. 获取课程列表
**GET** `/api/courses`

查询参数：
- `subject`: 学科筛选
- `requiresContinuous`: 连排筛选（true/false）
- `isActive`: 状态筛选
- `keyword`: 关键词搜索（课程名称或编码）

#### 3. 获取单个课程
**GET** `/api/courses/:id`

#### 4. 更新课程
**PUT** `/api/courses/:id`

#### 5. 删除课程（软删除）
**DELETE** `/api/courses/:id`

#### 6. 永久删除课程
**DELETE** `/api/courses/:id/permanent`

### 场室管理API

#### 1. 创建场室
**POST** `/api/rooms`

请求体示例：
```json
{
  "name": "实验室A",
  "roomNumber": "B301",
  "type": "实验室",
  "capacity": 40,
  "building": "教学楼B栋",
  "floor": 3,
  "equipment": ["实验台", "投影仪", "通风设备"],
  "assignedClass": "607f1f77bcf86cd799439013",
  "unavailableSlots": [
    {
      "dayOfWeek": 0,
      "periods": [7, 8],
      "reason": "设备维护"
    }
  ]
}
```

#### 2. 获取场室列表
**GET** `/api/rooms`

查询参数：
- `type`: 类型筛选
- `building`: 建筑筛选
- `floor`: 楼层筛选
- `minCapacity`: 最小容量
- `maxCapacity`: 最大容量
- `equipment`: 设备筛选
- `isActive`: 状态筛选
- `keyword`: 关键词搜索（名称或编号）

#### 3. 获取单个场室
**GET** `/api/rooms/:id`

#### 4. 更新场室
**PUT** `/api/rooms/:id`

#### 5. 删除场室（软删除）
**DELETE** `/api/rooms/:id`

#### 6. 永久删除场室
**DELETE** `/api/rooms/:id/permanent`

## 测试示例数据

### 教师数据示例
```bash
# 创建数学老师
curl -X POST http://localhost:5000/api/teachers \
  -H "Content-Type: application/json" \
  -d '{
    "name": "王数学",
    "employeeId": "T001",
    "subjects": ["数学"],
    "maxWeeklyHours": 18
  }'

# 创建英语老师
curl -X POST http://localhost:5000/api/teachers \
  -H "Content-Type: application/json" \
  -d '{
    "name": "李英语",
    "employeeId": "T002", 
    "subjects": ["英语"],
    "maxWeeklyHours": 16
  }'
```

### 班级数据示例
```bash
# 创建高一班级
curl -X POST http://localhost:5000/api/classes \
  -H "Content-Type: application/json" \
  -d '{
    "name": "高一(1)班",
    "grade": 10,
    "studentCount": 45,
    "academicYear": "2023-2024",
    "semester": 1
  }'
```

### 课程数据示例
```bash
# 创建数学课程
curl -X POST http://localhost:5000/api/courses \
  -H "Content-Type: application/json" \
  -d '{
    "name": "高中数学",
    "subject": "数学", 
    "courseCode": "MATH001",
    "weeklyHours": 4,
    "roomRequirements": {
      "types": ["普通教室"]
    }
  }'
```

### 场室数据示例
```bash
# 创建普通教室
curl -X POST http://localhost:5000/api/rooms \
  -H "Content-Type: application/json" \
  -d '{
    "name": "教室101",
    "roomNumber": "A101",
    "type": "普通教室",
    "capacity": 50,
    "building": "教学楼A栋",
    "floor": 1
  }'
```

## 📋 TKS-006: 教学计划与排课规则API测试

### 教学计划管理API

#### 1. 创建教学计划
```bash
curl -X POST http://localhost:5000/api/teaching-plans \
  -H "Content-Type: application/json" \
  -d '{
    "class": "67645a1234567890abcdef01",
    "academicYear": "2024-2025", 
    "semester": 1,
    "courseAssignments": [
      {
        "course": "67645a1234567890abcdef02",
        "teacher": "67645a1234567890abcdef03",
        "weeklyHours": 4,
        "requiresContinuous": true,
        "continuousHours": 2,
        "preferredTimeSlots": [
          {
            "dayOfWeek": 1,
            "periods": [1, 2]
          }
        ],
        "notes": "数学课需要连排"
      }
    ],
    "notes": "高一(1)班教学计划"
  }'
```

#### 2. 获取教学计划列表
```bash
# 基础查询
curl "http://localhost:5000/api/teaching-plans?page=1&limit=10"

# 按班级筛选
curl "http://localhost:5000/api/teaching-plans?class=67645a1234567890abcdef01"

# 按学年学期筛选
curl "http://localhost:5000/api/teaching-plans?academicYear=2024-2025&semester=1"

# 按状态筛选
curl "http://localhost:5000/api/teaching-plans?status=approved"

# 关键词搜索
curl "http://localhost:5000/api/teaching-plans?keyword=高一"
```

#### 3. 获取单个教学计划
```bash
curl http://localhost:5000/api/teaching-plans/67645a1234567890abcdef04
```

#### 4. 更新教学计划
```bash
curl -X PUT http://localhost:5000/api/teaching-plans/67645a1234567890abcdef04 \
  -H "Content-Type: application/json" \
  -d '{
    "courseAssignments": [
      {
        "course": "67645a1234567890abcdef02",
        "teacher": "67645a1234567890abcdef03", 
        "weeklyHours": 5,
        "requiresContinuous": true,
        "continuousHours": 2
      }
    ],
    "notes": "调整数学课时为5节"
  }'
```

#### 5. 审批教学计划
```bash
# 审批通过
curl -X POST http://localhost:5000/api/teaching-plans/67645a1234567890abcdef04/approve \
  -H "Content-Type: application/json" \
  -d '{
    "approve": true,
    "comments": "教学计划合理，审批通过"
  }'

# 审批拒绝
curl -X POST http://localhost:5000/api/teaching-plans/67645a1234567890abcdef04/approve \
  -H "Content-Type: application/json" \
  -d '{
    "approve": false,
    "comments": "课时安排不合理，请调整"
  }'
```

#### 6. 获取班级当前教学计划
```bash
curl http://localhost:5000/api/teaching-plans/current/67645a1234567890abcdef01/2024-2025/1
```

#### 7. 删除教学计划
```bash
# 软删除
curl -X DELETE http://localhost:5000/api/teaching-plans/67645a1234567890abcdef04

# 硬删除
curl -X DELETE http://localhost:5000/api/teaching-plans/67645a1234567890abcdef04/permanent
```

### 排课规则管理API

#### 1. 创建排课规则
```bash
curl -X POST http://localhost:5000/api/scheduling-rules \
  -H "Content-Type: application/json" \
  -d '{
    "name": "高中标准排课规则",
    "description": "适用于高中阶段的标准排课约束规则",
    "schoolType": "high",
    "academicYear": "2024-2025",
    "semester": 1,
    "timeRules": {
      "dailyPeriods": 8,
      "workingDays": [1, 2, 3, 4, 5],
      "periodDuration": 45,
      "breakDuration": 10,
      "lunchBreakStart": 4,
      "lunchBreakDuration": 90,
      "morningPeriods": [1, 2, 3, 4],
      "afternoonPeriods": [5, 6, 7, 8]
    },
    "teacherConstraints": {
      "maxDailyHours": 6,
      "maxContinuousHours": 3,
      "minRestBetweenCourses": 10,
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
      "avoidFirstLastPeriod": ["体育"],
      "coreSubjectPriority": true,
      "labCoursePreference": "afternoon"
    },
    "conflictResolutionRules": {
      "teacherConflictResolution": "strict",
      "roomConflictResolution": "strict", 
      "classConflictResolution": "strict",
      "allowOverride": false,
      "priorityOrder": ["teacher", "room", "class"]
    },
    "isDefault": true
  }'
```

#### 2. 获取排课规则列表
```bash
# 基础查询
curl "http://localhost:5000/api/scheduling-rules?page=1&limit=10"

# 按学校类型筛选
curl "http://localhost:5000/api/scheduling-rules?schoolType=high"

# 按学年学期筛选
curl "http://localhost:5000/api/scheduling-rules?academicYear=2024-2025&semester=1"

# 查找默认规则
curl "http://localhost:5000/api/scheduling-rules?isDefault=true"

# 关键词搜索
curl "http://localhost:5000/api/scheduling-rules?keyword=标准"
```

#### 3. 获取单个排课规则
```bash
curl http://localhost:5000/api/scheduling-rules/67645a1234567890abcdef05
```

#### 4. 更新排课规则
```bash
curl -X PUT http://localhost:5000/api/scheduling-rules/67645a1234567890abcdef05 \
  -H "Content-Type: application/json" \
  -d '{
    "teacherConstraints": {
      "maxDailyHours": 7,
      "maxContinuousHours": 4,
      "minRestBetweenCourses": 5,
      "avoidFridayAfternoon": false,
      "respectTeacherPreferences": true,
      "allowCrossGradeTeaching": true
    }
  }'
```

#### 5. 设置默认排课规则
```bash
curl -X POST http://localhost:5000/api/scheduling-rules/67645a1234567890abcdef05/set-default
```

#### 6. 获取默认排课规则
```bash
curl http://localhost:5000/api/scheduling-rules/default/2024-2025/1
```

#### 7. 复制排课规则
```bash
curl -X POST http://localhost:5000/api/scheduling-rules/67645a1234567890abcdef05/copy \
  -H "Content-Type: application/json" \
  -d '{
    "targetAcademicYear": "2024-2025",
    "targetSemester": 2,
    "newName": "高中春季排课规则"
  }'
```

#### 8. 删除排课规则
```bash
# 软删除
curl -X DELETE http://localhost:5000/api/scheduling-rules/67645a1234567890abcdef05

# 硬删除
curl -X DELETE http://localhost:5000/api/scheduling-rules/67645a1234567890abcdef05/permanent
```

## 验收标准检查清单

### TKS-004任务验收
- ✅ **教师档案管理**: 支持教师的增删改查操作
- ✅ **班级信息管理**: 支持班级的增删改查操作  
- ✅ **课程信息管理**: 支持课程的增删改查操作
- ✅ **场室信息管理**: 支持场室的增删改查操作
- ✅ **数据验证**: 所有API都有完整的数据验证
- ✅ **错误处理**: 统一的错误处理和响应格式
- ✅ **查询功能**: 支持分页、筛选、搜索、排序
- ✅ **关联查询**: 支持班级-教师、班级-教室的关联查询

### TKS-006任务验收
- ✅ **教学计划管理**: 支持班级教学计划的增删改查操作
- ✅ **课程安排配置**: 可以为班级指定课程和授课教师
- ✅ **时间偏好设置**: 支持设置课程的偏好和避免时间段
- ✅ **连排规则配置**: 支持设置课程连排要求
- ✅ **审批流程**: 支持教学计划的审批和状态管理
- ✅ **排课规则管理**: 支持全局排课规则的配置和管理
- ✅ **约束条件设置**: 支持教师、教室、课程的各种约束条件
- ✅ **默认规则管理**: 支持设置和获取默认排课规则
- ✅ **规则复制功能**: 支持跨学期复制排课规则

## 注意事项

1. **ObjectId格式**: MongoDB的文档ID必须是24位十六进制字符串
2. **数据关联**: 创建班级时可以指定班主任和固定教室，需要先创建相应的教师和场室记录
3. **唯一性约束**: 教师工号、班级名称（同学年学期）、课程编码、场室编号不能重复
4. **软删除**: 默认删除操作是软删除（设置isActive=false），永久删除需要特殊权限

---

> 📌 **下一步**: 开始TKS-005任务 - 开发教学资源管理前端界面