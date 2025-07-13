#!/bin/bash

# 🚀 智能排课系统 - 快速安装脚本
# 适用于 macOS 系统

set -e

echo "🚀 智能排课系统快速安装脚本"
echo "📅 $(date)"
echo ""

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 检查函数
check_command() {
    if command -v $1 &> /dev/null; then
        echo -e "${GREEN}✅ $1 已安装${NC}"
        return 0
    else
        echo -e "${RED}❌ $1 未安装${NC}"
        return 1
    fi
}

# 步骤1：检查Node.js
echo -e "${BLUE}📋 步骤1: 检查Node.js${NC}"
if check_command node; then
    NODE_VERSION=$(node --version)
    echo -e "${GREEN}   Node.js版本: $NODE_VERSION${NC}"
else
    echo -e "${YELLOW}⚠️  请先安装Node.js:${NC}"
    echo "   访问 https://nodejs.org/ 下载LTS版本"
    echo "   或使用: brew install node"
    exit 1
fi

if check_command npm; then
    NPM_VERSION=$(npm --version)
    echo -e "${GREEN}   npm版本: $NPM_VERSION${NC}"
else
    echo -e "${RED}❌ npm未安装${NC}"
    exit 1
fi

echo ""

# 步骤2：检查MongoDB
echo -e "${BLUE}📋 步骤2: 检查MongoDB${NC}"
if check_command mongod; then
    echo -e "${GREEN}✅ MongoDB已安装${NC}"
    
    # 检查MongoDB服务状态
    if brew services list | grep -q "mongodb.*started"; then
        echo -e "${GREEN}✅ MongoDB服务正在运行${NC}"
    else
        echo -e "${YELLOW}⚠️  启动MongoDB服务...${NC}"
        brew services start mongodb/brew/mongodb-community
        sleep 3
    fi
else
    echo -e "${YELLOW}⚠️  MongoDB未安装，正在安装...${NC}"
    brew tap mongodb/brew
    brew install mongodb-community
    brew services start mongodb/brew/mongodb-community
    echo -e "${GREEN}✅ MongoDB安装完成并启动${NC}"
fi

echo ""

# 步骤3：检查项目依赖
echo -e "${BLUE}📋 步骤3: 检查项目依赖${NC}"
if [ -d "node_modules" ]; then
    echo -e "${GREEN}✅ 项目依赖已安装${NC}"
else
    echo -e "${YELLOW}⚠️  安装项目依赖...${NC}"
    npm install
    echo -e "${GREEN}✅ 项目依赖安装完成${NC}"
fi

echo ""

# 步骤4：检查端口占用
echo -e "${BLUE}📋 步骤4: 检查端口占用${NC}"
if lsof -i :3000 > /dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  端口3000被占用${NC}"
    lsof -i :3000
else
    echo -e "${GREEN}✅ 端口3000可用${NC}"
fi

if lsof -i :3001 > /dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  端口3001被占用${NC}"
    lsof -i :3001
else
    echo -e "${GREEN}✅ 端口3001可用${NC}"
fi

echo ""

# 步骤5：启动项目
echo -e "${BLUE}📋 步骤5: 启动项目${NC}"
echo -e "${GREEN}🚀 正在启动智能排课系统...${NC}"
echo ""
echo -e "${BLUE}📱 前端地址: http://localhost:3000${NC}"
echo -e "${BLUE}🔧 后端地址: http://localhost:3001${NC}"
echo -e "${BLUE}📊 健康检查: http://localhost:3001/api/health${NC}"
echo ""
echo -e "${YELLOW}按 Ctrl+C 停止服务${NC}"
echo ""

# 启动项目
npm run dev 