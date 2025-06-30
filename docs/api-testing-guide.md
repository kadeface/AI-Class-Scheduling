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