# 新聊天窗口快速设置指南

> 📋 **用途**: 在新聊天窗口中快速了解项目状态并开始测试前端界面
> 
> 🗓 **创建日期**: 2024-12-19
> 
> 📍 **任务目标**: 测试教学计划和排课规则管理功能

## 🎯 项目当前状态

### 基本信息
- **项目名称**: 智能排课排场室系统 (K-12版)
- **项目路径**: `D:\cursor_project\AI-Class-Scheduling`
- **开发环境**: Windows 10, PowerShell
- **当前阶段**: V1.0 MVP开发中

### 技术栈
```yaml
后端:
  - Node.js + Express.js + TypeScript
  - MongoDB数据库
  - 端口: 5000

前端:
  - Next.js 15 + TypeScript  
  - Radix UI + Tailwind CSS
  - 端口: 3000
```

### ✅ 已完成任务
- **TKS-001**: 后端基础架构搭建 ✅
- **TKS-002**: 用户与角色管理API ✅  
- **TKS-003**: 前端基础界面框架 ✅
- **TKS-006**: 教学计划与排课规则API ✅
- **TKS-007**: 教学计划与排课规则界面 ✅
  - ✅ 排课管理主页面完成
  - ✅ 教学计划管理页面完成
  - ✅ 排课规则管理页面完成
  - ✅ 7个新UI组件开发完成
  - ✅ 后端TypeScript错误全部修复

## 🚀 快速启动服务

### ⚠️ 重要提醒
**请手动执行以下命令，AI不会自动执行安装或启动命令**

### 1. 启动后端服务
```powershell
# 打开PowerShell，进入后端目录
cd D:\cursor_project\AI-Class-Scheduling\backend

# 启动开发服务器
npm run dev
```

**期待看到的输出**：
```
✅ MongoDB数据库连接成功
🚀 智能排课系统API服务已启动
📍 服务地址: http://localhost:5000
```

### 2. 启动前端服务
```powershell
# 新开PowerShell窗口，进入前端目录
cd D:\cursor_project\AI-Class-Scheduling\frontend

# 启动开发服务器
npm run dev
```

**期待看到的输出**：
```
▲ Next.js 15.x.x
- Local: http://localhost:3000
- Ready in xxms
```

### 3. 健康检查
```powershell
curl http://localhost:5000/api/health
```

## 🧪 前端界面测试任务

### 主要测试页面

#### 1. 排课管理主页
- **访问地址**: http://localhost:3000/management/schedules
- **验证内容**: 
  - 页面布局和卡片设计
  - 导航链接功能
  - 统计信息显示

#### 2. 教学计划管理页面
- **访问地址**: http://localhost:3000/management/schedules/teaching-plans
- **验证内容**:
  - 搜索筛选功能（关键词、学年、学期、状态、班级）
  - 数据表格显示和分页
  - 操作按钮（查看、编辑、审批、删除）
  - 状态徽章显示
  - 创建按钮

#### 3. 排课规则管理页面
- **访问地址**: http://localhost:3000/management/schedules/scheduling-rules
- **验证内容**:
  - 学校类型和学年学期筛选
  - 规则列表显示
  - 规则操作（创建、编辑、查看、复制、设置默认）
  - 默认规则标识
  - 规则状态显示

### 新增UI组件验证
- **Badge**: 状态标签组件（多种颜色变体）
- **Card**: 卡片容器组件（Header、Content、Footer）
- **Tabs**: 标签页组件
- **Label**: 表单标签组件
- **Switch**: 开关控件组件
- **Textarea**: 多行文本输入组件
- **Separator**: 分隔线组件

### API接口测试
使用浏览器开发者工具（F12 → Network）验证：
- `GET /api/teaching-plans` - 教学计划列表
- `GET /api/scheduling-rules` - 排课规则列表
- `GET /api/scheduling-rules/default` - 默认规则查询

## 📁 重要文件路径

### 前端核心文件
```
frontend/src/
├── app/management/schedules/
│   ├── page.tsx                    # 排课管理主页
│   ├── teaching-plans/page.tsx     # 教学计划管理
│   └── scheduling-rules/page.tsx   # 排课规则管理
├── components/ui/
│   ├── badge.tsx                   # 新增Badge组件
│   ├── card.tsx                    # 新增Card组件
│   ├── tabs.tsx                    # 新增Tabs组件
│   ├── label.tsx                   # 新增Label组件
│   ├── switch.tsx                  # 新增Switch组件
│   ├── textarea.tsx                # 新增Textarea组件
│   └── separator.tsx               # 新增Separator组件
├── lib/
│   ├── api.ts                      # API接口定义
│   └── navigation.ts               # 导航配置
```

### 后端核心文件
```
backend/src/
├── controllers/
│   ├── teaching-plan-controller.ts # 教学计划控制器
│   └── scheduling-rules-controller.ts # 排课规则控制器
├── models/
│   ├── TeachingPlan.ts            # 教学计划模型
│   └── SchedulingRules.ts         # 排课规则模型
├── routes/
│   ├── teaching-plan-routes.ts    # 教学计划路由
│   └── scheduling-rules-routes.ts # 排课规则路由
```

### 文档文件
```
docs/
├── project-context.md             # 完整项目上下文
├── frontend-testing-guide.md      # 详细测试指南
├── api-testing-guide.md           # API测试指南
└── new-chat-window-setup.md       # 本文档
```

## 🔧 故障排除

### 常见启动问题

#### 后端无法启动
1. **检查MongoDB服务**:
   ```powershell
   # Windows服务管理器中确认MongoDB服务运行
   net start MongoDB
   ```

2. **检查端口占用**:
   ```powershell
   netstat -ano | findstr :5000
   ```

3. **依赖包问题**:
   ```powershell
   cd D:\cursor_project\AI-Class-Scheduling\backend
   npm install
   ```

#### 前端无法启动
1. **检查端口占用**:
   ```powershell
   netstat -ano | findstr :3000
   ```

2. **依赖包问题**:
   ```powershell
   cd D:\cursor_project\AI-Class-Scheduling\frontend
   npm install
   ```

3. **清除缓存**:
   ```powershell
   rm -rf .next
   npm run dev
   ```

### 常见界面问题

#### 页面显示空白
- 检查浏览器控制台错误信息
- 确认后端API服务正常运行
- 验证路由配置正确

#### API请求失败
- 确认后端服务运行在 http://localhost:5000
- 检查网络面板中的请求状态
- 验证CORS配置正确

#### 样式异常
- 确认Tailwind CSS正常加载
- 检查组件导入路径
- 验证UI组件props传递

## 📋 测试检查清单

### 基础功能测试
- [ ] 后端服务正常启动（看到成功消息）
- [ ] 前端服务正常启动（可访问3000端口）
- [ ] 健康检查接口返回200状态
- [ ] 排课管理主页正常加载
- [ ] 教学计划管理页面正常加载
- [ ] 排课规则管理页面正常加载

### 界面功能测试
- [ ] 页面布局和设计美观
- [ ] 导航链接功能正常
- [ ] 搜索筛选功能有效
- [ ] 数据表格显示正常
- [ ] 操作按钮响应正常
- [ ] 状态徽章颜色正确
- [ ] 响应式设计适配良好

### UI组件测试
- [ ] Badge组件样式正确
- [ ] Card组件结构完整
- [ ] Tabs组件切换正常
- [ ] Switch组件交互正常
- [ ] Textarea组件输入正常
- [ ] Separator组件显示正常

### API接口测试
- [ ] 教学计划API调用成功
- [ ] 排课规则API调用成功
- [ ] 请求参数传递正确
- [ ] 响应数据格式正确
- [ ] 错误处理机制有效

## 📞 获取帮助

### 详细文档
- **完整项目上下文**: `docs/project-context.md`
- **详细测试指南**: `docs/frontend-testing-guide.md`
- **API测试指南**: `docs/api-testing-guide.md`

### 报告问题
在新聊天窗口中，请提供：
1. 具体的错误信息或截图
2. 执行的操作步骤
3. 浏览器控制台的错误信息
4. 服务器终端的错误输出

### 下一步计划
测试完成后，系统将准备进入：
- **TKS-008**: 研发核心排课算法（高优先级，8分工作量）

---

> 📌 **快速开始**: 复制本文档内容到新聊天窗口，AI将基于此上下文协助您完成前端界面测试
> 
> 🎯 **测试目标**: 验证TKS-007任务交付物的完整性和功能正确性