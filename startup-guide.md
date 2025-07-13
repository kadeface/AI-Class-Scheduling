# 🚀 智能排课系统启动指南

## 📋 系统要求

- Node.js >= 18.0.0
- npm >= 8.0.0
- MongoDB (本地或远程)

## 🛠️ 首次安装

### 1. 克隆项目
```bash
git clone <repository-url>
cd AI-Class-Scheduling
```

### 2. 安装所有依赖
```bash
# 安装根目录依赖
npm install

# 或使用workspaces命令
npm run install:all
```

## 🚀 启动开发环境

### 方法1: 一键启动 (推荐)
```bash
# macOS/Linux
./start-dev.sh

# 或直接使用npm命令
npm run dev
```

### 方法2: 分别启动
```bash
# 启动后端服务
npm run dev:backend

# 新终端窗口启动前端服务
npm run dev:frontend
```

### 方法3: 传统方式
```bash
# 启动后端服务
cd backend
npm run dev

# 新终端窗口启动前端服务
cd frontend
npm run dev
```

## 🌐 服务地址

- **前端地址**: http://localhost:3000
- **后端API**: http://localhost:3001
- **健康检查**: http://localhost:3001/api/health

## 📦 NPM Workspaces 命令

```bash
# 安装所有workspace依赖
npm install

# 安装特定workspace依赖
npm install --workspace=backend
npm install --workspace=frontend

# 运行特定workspace脚本
npm run dev --workspace=backend
npm run dev --workspace=frontend

# 构建所有workspace
npm run build

# 清理所有node_modules
npm run clean

# 清理并重新安装
npm run clean:install
```

## 🔧 常用开发命令

```bash
# 开发模式 (同时启动前后端)
npm run dev

# 仅启动后端
npm run dev:backend

# 仅启动前端
npm run dev:frontend

# 构建项目
npm run build

# 启动生产环境
npm run start

# 运行测试
npm run test
```

## 🗄️ 数据库初始化

```bash
# 初始化数据库
npm run init-db --workspace=backend

# 创建默认规则
npm run create-default-rules --workspace=backend

# 生成测试数据
npm run create-test-data --workspace=backend
```

## 🐛 故障排除

### 依赖问题
```bash
# 清理并重新安装
npm run clean:install
```

### 端口占用
```bash
# 检查端口占用
lsof -i :3000
lsof -i :3001

# 杀死进程
kill -9 <PID>
```

### MongoDB连接问题
- 确保MongoDB服务正在运行
- 检查环境变量 `MONGODB_URI`
- 默认连接: `mongodb://localhost:27017/ai-class-scheduling`

## 📝 环境变量

创建 `.env` 文件在backend目录：
```env
MONGODB_URI=mongodb://localhost:27017/ai-class-scheduling
PORT=5000
JWT_SECRET=your-secret-key
```

## 🔄 更新依赖

```bash
# 更新所有依赖
npm update --workspaces

# 更新特定workspace依赖
npm update --workspace=backend
npm update --workspace=frontend
```