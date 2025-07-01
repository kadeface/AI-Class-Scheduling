# 智能排课排场室系统 (K-12版)

## 项目简介
本项目是一款面向小学、初中、高中（K-12）场景的智能排课与场室管理系统，旨在通过自动化与可视化手段，极大提升教务管理效率。

## 技术栈
- **前端**: Next.js + React + TypeScript + Radix UI + Tailwind CSS + Framer Motion
- **后端**: Node.js + Express.js + TypeScript
- **API**: RESTful 风格
- **数据库**: MongoDB
- **算法**: 约束满足问题(CSP) + 智能启发式优化

## 核心功能

### 🎯 智能排课算法
- **混合算法策略**: 约束传播 + 回溯搜索 + 局部优化
- **硬约束处理**: 教师/班级/教室时间冲突检测
- **软约束优化**: 教师偏好、课程分布、连续排课优化
- **性能保证**: 支持大规模排课（30+班级），执行时间 < 5分钟

### 📊 管理功能
- **基础数据管理**: 用户、教师、班级、课程、教室管理
- **教学计划配置**: 班级课程安排、教师分配、时间偏好设置
- **排课规则设置**: 时间约束、教师约束、教室约束、课程规则
- **课表生成与调整**: 一键自动排课、手动调整、冲突检测

### 🔧 技术特性
- **实时进度反馈**: 排课过程可视化
- **异步任务处理**: 支持长时间运行的排课任务
- **结果验证**: 自动冲突检测和质量评估
- **多种配置**: 快速/均衡/精细三种排课模式

## 项目结构
```
/
├── frontend/              # Next.js前端应用
│   ├── src/app/          # App Router页面
│   ├── src/components/   # UI组件库
│   └── src/lib/         # 工具函数
├── backend/               # Express.js后端应用
│   ├── src/models/       # 数据模型
│   ├── src/controllers/  # 控制器
│   ├── src/services/     # 业务服务
│   │   └── scheduling/   # 排课算法核心
│   └── src/routes/      # API路由
├── docs/                 # 项目文档
├── README.md             # 项目说明
└── .cursorrules         # Cursor开发规则
```

## 快速开始

### 前端开发
```bash
cd frontend
npm install
npm run dev
```

### 后端开发
```bash
cd backend
npm install
npm run dev
```

### 排课算法测试
```bash
cd backend
npx ts-node src/scripts/test-scheduling-algorithm.ts
```

## 排课算法使用

### API 接口

#### 启动排课任务
```http
POST /api/scheduling/start
Content-Type: application/json

{
  "academicYear": "2024-2025",
  "semester": 1,
  "classIds": ["班级ID1", "班级ID2"],
  "algorithmConfig": {
    "maxIterations": 10000,
    "timeLimit": 300
  }
}
```

#### 查询任务状态
```http
GET /api/scheduling/tasks/{taskId}
```

#### 验证排课结果
```http
POST /api/scheduling/validate
Content-Type: application/json

{
  "academicYear": "2024-2025",
  "semester": 1
}
```

### 性能指标
- **小规模排课**(2-5个班级): < 10秒, 成功率 > 95%
- **中等规模排课**(6-15个班级): < 60秒, 成功率 > 90%
- **大规模排课**(16-30个班级): < 300秒, 成功率 > 85%

## 开发规范
请严格遵循 `.cursorrules` 中定义的开发规范。

## 项目文档
- [PRD 产品需求文档](./docs/PRD.md)
- [任务列表](./docs/task-list.json)
- [技术栈规范](./docs/tech-stack.md)