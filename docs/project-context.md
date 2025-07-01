# 智能排课系统项目上下文文档

> 📋 **用途**: 新聊天窗口快速了解项目状态的完整上下文
> 
> 🗓 **更新日期**: 2024-12-19
> 
> 📍 **当前阶段**: V1.0 MVP开发中

## 🎯 项目概述

### 基本信息
- **项目名称**: 智能排课排场室系统 (K-12版)
- **项目描述**: 面向小学、初中、高中的智能排课与场室管理系统
- **项目路径**: `D:\cursor_project\AI-Class-Scheduling`
- **开发环境**: Windows 10, PowerShell
- **版本目标**: V1.0 MVP (最小可行产品)

### 技术栈
```yaml
后端:
  - 运行时: Node.js
  - 框架: Express.js
  - 语言: TypeScript
  - 数据库: MongoDB
  - 工具: bcryptjs, cors, helmet, morgan, mongoose

前端:
  - 框架: Next.js 15 (App Router)
  - 语言: TypeScript  
  - UI组件: Radix UI
  - 样式: Tailwind CSS 4
  - 动画: Framer Motion
  - 图标: Lucide React
  - 表单: React Hook Form + Zod
```

## ✅ 任务完成状态

### 已完成任务 (截至2024-12-19)

#### TKS-001: 后端基础架构搭建 ✅
- **完成日期**: 2024-06-30
- **工作量**: 5分
- **主要交付物**:
  - Express.js后端项目结构
  - MongoDB数据库连接配置
  - 6个核心数据模型 (User, Teacher, Class, Course, Room, Schedule)
  - 环境配置文件和启动脚本

#### TKS-002: 用户与角色管理API ✅  
- **完成日期**: 2024-12-19
- **工作量**: 3分
- **主要交付物**:
  - 用户CRUD API (增删改查)
  - 角色管理功能 (admin/staff/teacher)
  - 数据验证中间件
  - API测试指南
- **API端点**:
  ```
  POST   /api/users          - 创建用户
  GET    /api/users          - 获取用户列表 (支持分页筛选)
  GET    /api/users/:id      - 获取单个用户
  PUT    /api/users/:id      - 更新用户
  DELETE /api/users/:id      - 软删除用户
  DELETE /api/users/:id/permanent - 硬删除用户
  ```

#### TKS-003: 前端基础界面框架 ✅
- **完成日期**: 2024-12-19  
- **工作量**: 3分
- **主要交付物**:
  - Next.js 15项目架构
  - 响应式布局系统 (侧边栏+头部+主内容)
  - 多级导航菜单 (支持展开折叠)
  - 基础UI组件库
  - 5个管理模块占位页面
  - 暗色/明色主题支持

#### TKS-006: 开发教学计划与排课规则API ✅
- **完成日期**: 2024-12-19
- **工作量**: 5分
- **主要交付物**:
  - 教学计划数据模型和API (TeachingPlan.ts)
  - 排课规则数据模型和API (SchedulingRules.ts)
  - 完整的API类型定义扩展 (api.ts)
  - 数据验证中间件扩展 (validation.ts)
  - 教学计划控制器 (teaching-plan-controller.ts)
  - 排课规则控制器 (scheduling-rules-controller.ts)
  - RESTful路由配置 (teaching-plan-routes.ts, scheduling-rules-routes.ts)
  - 主应用路由注册和API测试指南更新

#### TKS-007: 开发教学计划与排课规则界面 ✅
- **完成日期**: 2024-12-19
- **工作量**: 5分
- **主要交付物**:
  - 排课管理主页面 (schedules/page.tsx)
  - 教学计划管理页面 (teaching-plans/page.tsx)  
  - 排课规则管理页面 (scheduling-rules/page.tsx)
  - 前端API接口定义扩展 (完整的教学计划和排课规则接口)
  - UI组件库扩展 (Badge、Card、Tabs、Label、Switch、Textarea、Separator)
  - 导航配置更新 (添加排课设置菜单)
- **后端错误修复**:
  - 修复SchedulingRules模型TypeScript类型错误
  - 修复班级、课程、场室控制器缺失的CRUD函数
  - 修复教学计划和排课规则控制器的用户认证错误
  - 简化模型接口定义，解决重复声明问题
- **验证状态**: ✅ 后端服务正常启动，API端点响应正常

#### TKS-008: 研发核心排课算法 ✅
- **完成日期**: 2025-01-01
- **工作量**: 8分
- **主要交付物**:
  - 核心算法类型定义 (services/scheduling/types.ts)
  - 约束检测引擎 (constraint-detector.ts)
  - 排课算法引擎 (scheduling-engine.ts)
  - 排课服务接口 (scheduling-service.ts)
  - 排课控制器和路由 (scheduling-controller.ts, scheduling-routes.ts)
  - 算法测试工具 (test-scheduling-algorithm.ts)
  - 完整技术文档 (README.md, completion-report.md)
- **技术成果**:
  - 混合算法策略: 约束传播+回溯搜索+局部优化
  - 智能启发式: MRV+度启发式+LCV
  - 性能保证: 30个班级<300秒, 成功率>85%
  - 支持异步执行、进度回调、任务管理
  - 提供多种配置模式和验证工具
- **验证状态**: ✅ 算法测试通过，API接口正常，性能达标

#### TKS-008: 研发核心排课算法 ✅
- **完成日期**: 2025-01-01
- **工作量**: 8分
- **主要交付物**:
  - 核心排课算法引擎 (混合策略: 约束传播+回溯搜索+局部优化)
  - 完整的约束检测系统 (硬约束+软约束)
  - 排课服务API接口 (异步任务+进度回调)
  - RESTful API控制器和路由配置
  - 算法测试工具和性能基准
  - 完整的技术文档和使用指南
- **技术成果**:
  - 支持大规模排课: 30个班级 < 300秒, 成功率 > 85%
  - 智能启发式算法: MRV + 度启发式 + LCV
  - 多配置模式: 快速/均衡/精细三种预设
  - 完善的验证和调试工具

### 🔄 当前任务

#### TKS-009: 一键排课功能API封装
- **状态**: Ready (依赖TKS-008已完成)
- **依赖**: TKS-008
- **优先级**: 高
- **预估工作量**: 3分
- **验收标准**:
  - 提供一个API触发排课任务
  - 提供一个API查询排课进度和结果

## 📁 项目文件结构

```
AI-Class-Scheduling/
├── backend/                            # 后端应用
│   ├── src/
│   │   ├── config/
│   │   │   └── database.ts             # ✅ MongoDB连接配置
│   │   ├── models/
│   │   │   ├── User.ts                 # ✅ 用户模型 (已完成)
│   │   │   ├── Teacher.ts              # 🔄 教师模型 (需要API)
│   │   │   ├── Class.ts                # 🔄 班级模型 (需要API)
│   │   │   ├── Course.ts               # 🔄 课程模型 (需要API)
│   │   │   ├── Room.ts                 # 🔄 场室模型 (需要API)
│   │   │   └── Schedule.ts             # ⏳ 排课模型 (后续)
│   │   ├── controllers/
│   │   │   └── user-controller.ts      # ✅ 用户控制器 (参考模板)
│   │   ├── routes/
│   │   │   └── user-routes.ts          # ✅ 用户路由 (参考模板)
│   │   ├── middleware/
│   │   │   └── validation.ts           # ✅ 数据验证 (可扩展)
│   │   ├── types/
│   │   │   └── api.ts                  # ✅ API类型定义 (可扩展)
│   │   └── index.ts                    # ✅ 主应用 (已配置路由)
│   └── package.json                    # ✅ 依赖完整
├── frontend/                           # 前端应用
│   ├── src/
│   │   ├── components/
│   │   │   ├── ui/                     # ✅ 基础UI组件
│   │   │   └── layout/                 # ✅ 布局组件
│   │   ├── lib/
│   │   │   ├── utils.ts                # ✅ 工具函数
│   │   │   └── navigation.ts           # ✅ 导航配置
│   │   ├── types/
│   │   │   └── navigation.ts           # ✅ 类型定义
│   │   └── app/
│   │       ├── page.tsx                # ✅ 系统仪表盘
│   │       ├── layout.tsx              # ✅ 根布局
│   │       └── management/             # ✅ 管理模块
│   │           ├── page.tsx            # ✅ 管理首页
│   │           ├── users/page.tsx      # ✅ 用户管理
│   │           ├── teachers/page.tsx   # 🔄 教师管理 (需要功能)
│   │           ├── classes/page.tsx    # 🔄 班级管理 (需要功能)
│   │           ├── courses/page.tsx    # 🔄 课程管理 (需要功能)
│   │           └── rooms/page.tsx      # 🔄 场室管理 (需要功能)
│   └── package.json                    # ✅ 依赖完整
├── docs/
│   ├── task-list.json                  # ✅ 任务跟踪文件
│   ├── api-testing-guide.md            # ✅ API测试指南
│   └── project-context.md              # 📄 本文档
├── .cursorrules                        # ✅ 项目开发规则
├── .gitignore                          # ✅ Git忽略配置
└── README.md                           # ✅ 项目说明
```

## 🛠 开发规范

### 代码风格要求
- **文档格式**: Google Style Docstrings
- **类型安全**: TypeScript严格类型检查
- **命名规范**: 
  - 文件名: kebab-case (user-controller.ts)
  - 组件名: PascalCase (UserProfile)
  - 函数名: camelCase (getUserProfile)
  - 常量: UPPER_SNAKE_CASE (API_BASE_URL)

### 后端API规范
```typescript
// 1. 统一响应格式
interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

// 2. RESTful路由模式
// GET    /api/{resource}      - 获取列表
// POST   /api/{resource}      - 创建资源
// GET    /api/{resource}/:id  - 获取单个
// PUT    /api/{resource}/:id  - 更新资源
// DELETE /api/{resource}/:id  - 删除资源

// 3. 数据验证必须完备
// 4. 错误处理统一格式
// 5. 支持分页和筛选
```

### 前端组件规范
```typescript
// 1. 组件必须有TypeScript接口
interface ComponentProps {
  className?: string;
  children?: React.ReactNode;
}

// 2. 使用技术栈
// - Radix UI基础组件
// - Tailwind CSS样式
// - Framer Motion动画
// - 响应式设计

// 3. 状态管理
// - React内置hooks优先
// - 复杂状态考虑Zustand
```

### UI/UX设计原则
- **Apple设计语言**: 简洁至上、优雅层次
- **现代化UI**: 毛玻璃效果、渐变背景、圆角设计
- **专业图标**: Lucide React开源图标库
- **卡片式布局**: 清晰的信息组织
- **流畅动画**: Framer Motion交互动画
- **响应式设计**: 桌面和平板完美适配
- **无障碍访问**: Radix UI保证可访问性

## 📋 重要参考文件

### 后端开发模板
- `backend/src/models/User.ts` - 数据模型设计标准
- `backend/src/controllers/user-controller.ts` - 控制器开发模式
- `backend/src/routes/user-routes.ts` - 路由配置标准
- `backend/src/middleware/validation.ts` - 数据验证模式
- `backend/src/types/api.ts` - API类型定义标准

### 前端开发模板  
- `frontend/src/components/layout/` - 布局组件参考
- `frontend/src/components/ui/` - 基础UI组件库
- `frontend/src/app/management/users/page.tsx` - 管理页面模板
- `frontend/src/lib/utils.ts` - 工具函数库

## 📊 数据模型定义

### 已完成模型

#### User (用户模型) ✅
```typescript
interface IUser {
  username: string;
  password: string;
  role: 'admin' | 'staff' | 'teacher';
  profile: {
    name: string;
    employeeId?: string;
    email?: string;
    phone?: string;
    department?: string;
  };
  isActive: boolean;
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;
}
```

### TKS-004 待开发模型

#### Teacher (教师模型) 🔄
```typescript
interface ITeacher {
  name: string;
  employeeId: string;
  department: string;
  subjects: string[];           // 任教学科
  title: string;               // 职称
  maxHoursPerWeek: number;     // 最大周课时
  email?: string;
  phone?: string;
  unavailableSlots?: TimeSlot[]; // 不可用时间段
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

#### Class (班级模型) 🔄  
```typescript
interface IClass {
  name: string;                // 班级名称 (如: 高一(1)班)
  grade: string;               // 年级 (如: 高一)
  studentCount: number;        // 学生人数
  classTeacher: string;        // 班主任 (Teacher._id)
  classroom?: string;          // 固定教室 (Room._id)
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

#### Course (课程模型) 🔄
```typescript
interface ICourse {
  name: string;                // 课程名称
  code: string;                // 课程代码
  subject: string;             // 学科分类
  hoursPerWeek: number;        // 周课时数
  credits?: number;            // 学分
  requiresSpecialRoom: boolean; // 是否需要特殊场室
  roomType?: string;           // 所需场室类型
  canBeContinuous: boolean;    // 是否可连排
  description?: string;        // 课程描述
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

#### Room (场室模型) 🔄
```typescript
interface IRoom {
  name: string;                // 场室名称
  code: string;                // 场室编号
  type: string;                // 场室类型 (普通教室/实验室/功能室)
  building: string;            // 所在建筑
  floor: number;               // 楼层
  capacity: number;            // 容纳人数
  equipment: string[];         // 设备配置
  availableSlots?: TimeSlot[]; // 可用时间段
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

#### TimeSlot (时间段定义)
```typescript
interface TimeSlot {
  dayOfWeek: number;           // 星期几 (1-7)
  period: number;              // 第几节课 (1-8)
  startTime: string;           // 开始时间 (HH:mm)
  endTime: string;             // 结束时间 (HH:mm)
}
```

## 🚀 开发环境

### 启动命令
```powershell
# 后端服务
cd D:\cursor_project\AI-Class-Scheduling\backend
npm run dev
# 访问: http://localhost:5000

# 前端服务  
cd D:\cursor_project\AI-Class-Scheduling\frontend
npm run dev
# 访问: http://localhost:3000

# 健康检查
curl http://localhost:5000/api/health
```

### 已配置环境变量
```env
# 后端 .env
MONGODB_URI=mongodb://localhost:27017/ai-class-scheduling
PORT=5000
NODE_ENV=development
CORS_ORIGIN=http://localhost:3000
```

## 🧪 前端界面测试指南

### 启动服务步骤
**⚠️ 重要：请手动执行以下命令，不要自动执行**

1. **启动后端服务**：
   ```powershell
   cd D:\cursor_project\AI-Class-Scheduling\backend
   npm run dev
   ```
   - 确认看到："🚀 智能排课系统API服务已启动"
   - 服务地址：http://localhost:5000

2. **启动前端服务**：
   ```powershell
   cd D:\cursor_project\AI-Class-Scheduling\frontend  
   npm run dev
   ```
   - 服务地址：http://localhost:3000

3. **健康检查**：
   ```powershell
   curl http://localhost:5000/api/health
   ```

### 教学计划和排课规则界面测试

#### 1. 访问排课管理主页
- 地址：http://localhost:3000/management/schedules
- 验证：页面显示教学计划和排课规则两个功能模块
- 验证：卡片布局和导航链接正常工作

#### 2. 测试教学计划管理页面
- 地址：http://localhost:3000/management/schedules/teaching-plans
- 功能验证：
  - [ ] 页面加载正常，显示搜索筛选区域
  - [ ] 数据表格正常显示（包含分页）
  - [ ] 搜索功能：关键词、学年、学期、状态、班级筛选
  - [ ] 操作按钮：查看、编辑、审批、删除功能
  - [ ] 创建新教学计划按钮
  - [ ] 响应式设计在不同屏幕尺寸下正常

#### 3. 测试排课规则管理页面  
- 地址：http://localhost:3000/management/schedules/scheduling-rules
- 功能验证：
  - [ ] 页面加载正常，显示规则列表
  - [ ] 学校类型和学年学期筛选功能
  - [ ] 规则操作：创建、编辑、查看、复制、设置默认
  - [ ] 规则状态显示（时间设置、约束条件等）
  - [ ] 默认规则标识显示

#### 4. UI组件验证
- [ ] Badge组件：状态标签显示正常
- [ ] Card组件：卡片布局和阴影效果
- [ ] Tabs组件：标签页切换功能
- [ ] Switch组件：开关控件交互
- [ ] Textarea组件：多行文本输入
- [ ] Separator组件：分隔线显示

#### 5. API接口测试
- 使用浏览器开发者工具Network面板验证：
- [ ] 教学计划API调用正常（GET /api/teaching-plans）
- [ ] 排课规则API调用正常（GET /api/scheduling-rules）
- [ ] 响应数据格式正确
- [ ] 错误处理机制正常

## 📝 开发指导

### TKS-004任务开发步骤
1. **扩展数据模型** - 完善Teacher、Class、Course、Room的Mongoose Schema
2. **扩展API类型** - 在types/api.ts中添加相关接口
3. **扩展验证中间件** - 在validation.ts中添加验证逻辑
4. **开发控制器** - 参考user-controller.ts创建各资源控制器
5. **配置路由** - 参考user-routes.ts创建路由文件
6. **注册路由** - 在index.ts中注册新路由
7. **API测试** - 更新api-testing-guide.md
8. **更新任务状态** - 在task-list.json中记录完成情况

### 开发原则
- **手动操作优先**: 提供详细操作步骤，不自动执行命令
- **中文交流**: 始终使用中文进行沟通  
- **Windows兼容**: 确保命令和路径适配Windows
- **质量优先**: 每个功能完成后进行充分测试
- **文档同步**: 及时更新相关文档

## 🎯 里程碑目标

### V1.0 MVP核心功能
- ✅ 基础数据设置 (TKS-001~003已完成)
- 🔄 教学资源管理 (TKS-004~005进行中)
- ⏳ 排课规则设置 (TKS-006~007)
- ⏳ 智能排课引擎 (TKS-008~009)
- ⏳ 可视化课表 (TKS-010~012)
- ⏳ 多维度输出 (TKS-013)

### 成功标准
- 用户可以完整管理教学资源数据
- 系统能够智能生成无冲突课表
- 支持手动调课和多维度查看
- 具备课表打印和导出功能

---

> 📌 **使用说明**: 将此文档复制到新聊天窗口，AI将快速了解项目全貌并能够基于现有架构继续开发。
> 
> 🔄 **维护**: 每完成一个任务后请更新相应状态，保持文档与项目进度同步。