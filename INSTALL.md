# 🚀 智能排课系统 - 完整安装指南

## 📋 系统要求

- **操作系统**: macOS 10.15+ / Windows 10+ / Ubuntu 18.04+
- **Node.js**: >= 18.0.0
- **npm**: >= 8.0.0
- **MongoDB**: 6.0+

## 🛠️ 第一步：安装Node.js

### macOS用户

**方法1：使用官方安装包（推荐）**
1. 访问 [Node.js官网](https://nodejs.org/)
2. 下载LTS版本（推荐）
3. 双击下载的.pkg文件安装

**方法2：使用Homebrew**
```bash
# 安装Homebrew（如果未安装）
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# 安装Node.js
brew install node
```

### Windows用户
1. 访问 [Node.js官网](https://nodejs.org/)
2. 下载LTS版本的.msi安装包
3. 双击安装包，按提示完成安装

### Linux用户
```bash
# Ubuntu/Debian
curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
sudo apt-get install -y nodejs

# CentOS/RHEL
curl -fsSL https://rpm.nodesource.com/setup_lts.x | sudo bash -
sudo yum install -y nodejs
```

### 验证Node.js安装
```bash
node --version  # 应显示 v18.x.x 或更高版本
npm --version   # 应显示 8.x.x 或更高版本
```

## 🗄️ 第二步：安装MongoDB

### macOS用户

**使用Homebrew安装（推荐）**
```bash
# 添加MongoDB官方tap
brew tap mongodb/brew

# 安装MongoDB社区版
brew install mongodb-community

# 启动MongoDB服务
brew services start mongodb/brew/mongodb-community
```

### Windows用户
1. 访问 [MongoDB官网](https://www.mongodb.com/try/download/community)
2. 下载MongoDB Community Server
3. 运行安装程序，选择"Complete"安装
4. 安装完成后，MongoDB服务会自动启动

### Linux用户
```bash
# Ubuntu/Debian
wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list
sudo apt-get update
sudo apt-get install -y mongodb-org
sudo systemctl start mongod
sudo systemctl enable mongod
```

### 验证MongoDB安装
```bash
# 检查MongoDB服务状态
brew services list | grep mongo  # macOS
# 或
systemctl status mongod          # Linux

# 检查端口27017是否被占用
lsof -i :27017  # macOS/Linux
# 或
netstat -an | findstr 27017      # Windows

# 测试MongoDB连接
mongosh
# 如果连接成功，输入 exit 退出
```

## 📦 第三步：获取项目代码

```bash
# 克隆项目（替换为实际仓库地址）
git clone <your-repository-url>
cd AI-Class-Scheduling

# 或下载ZIP文件并解压
# 然后进入项目目录
```

## 🔧 第四步：安装项目依赖

```bash
# 进入项目根目录
cd AI-Class-Scheduling

# 安装所有依赖（包括workspaces）
npm install

# 验证安装
npm list --depth=0
```

## 🚀 第五步：启动项目

### 方法1：一键启动（推荐）
```bash
# 使用智能启动脚本
./start-dev.sh

# 或直接使用npm命令
npm run dev
```

### 方法2：分别启动
```bash
# 启动后端服务
npm run dev:backend

# 新终端窗口启动前端服务
npm run dev:frontend
```

## ✅ 第六步：验证安装

### 检查服务状态
```bash
# 检查端口占用
lsof -i :3000  # 前端端口
lsof -i :3001  # 后端端口
lsof -i :27017 # MongoDB端口
```

### 访问应用
1. **前端应用**: http://localhost:3000
2. **后端API**: http://localhost:3001
3. **健康检查**: http://localhost:3001/api/health

### 数据库初始化（首次使用）
```bash
# 初始化数据库
npm run init-db --workspace=backend

# 创建默认规则
npm run create-default-rules --workspace=backend

# 生成测试数据
npm run create-test-data --workspace=backend
```

## 🐛 常见问题解决

### 端口冲突
```bash
# 检查端口占用
lsof -i :3000
lsof -i :3001

# 杀死占用进程
kill -9 <PID>
```

### 依赖安装失败
```bash
# 清理并重新安装
npm run clean:install

# 或手动清理
rm -rf node_modules package-lock.json
npm install
```

### MongoDB连接失败
```bash
# 重启MongoDB服务
brew services restart mongodb/brew/mongodb-community  # macOS
# 或
sudo systemctl restart mongod                         # Linux
# 或
net start MongoDB                                     # Windows
```

### Node.js版本问题
```bash
# 检查版本
node --version

# 如果版本过低，请升级Node.js
# 或使用nvm管理Node.js版本
nvm install 18
nvm use 18
```

## 📝 环境变量配置

创建 `.env` 文件在backend目录：
```env
MONGODB_URI=mongodb://localhost:27017/ai-class-scheduling
PORT=3001
JWT_SECRET=your-secret-key-here
NODE_ENV=development
```

## 🔄 更新和维护

### 更新依赖
```bash
# 更新所有依赖
npm update --workspaces

# 更新特定workspace
npm update --workspace=backend
npm update --workspace=frontend
```

### 重启服务
```bash
# 停止服务
Ctrl + C

# 重新启动
npm run dev
```

## 📞 获取帮助

如果遇到问题：
1. 检查本文档的故障排除部分
2. 查看项目README.md文件
3. 检查控制台错误信息
4. 联系技术支持

---

**🎉 恭喜！您的智能排课系统已成功安装并运行。** 