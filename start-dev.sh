#!/bin/bash

# 🚀 智能排课系统开发环境启动脚本
# 适用于 macOS 系统

set -e

echo "🚀 启动智能排课系统开发环境..."
echo "📅 $(date)"
echo ""

# 检查Node.js版本
echo "🔍 检查Node.js版本..."
NODE_VERSION=$(node --version)
echo "✅ Node.js版本: $NODE_VERSION"

# 检查npm版本
echo "🔍 检查npm版本..."
NPM_VERSION=$(npm --version)
echo "✅ npm版本: $NPM_VERSION"

# 检查是否在项目根目录
if [ ! -f "package.json" ]; then
    echo "❌ 错误: 请在项目根目录运行此脚本"
    exit 1
fi

# 检查workspaces配置
if ! grep -q "workspaces" package.json; then
    echo "❌ 错误: 未找到workspaces配置，请先配置npm workspaces"
    exit 1
fi

echo ""
echo "📦 检查依赖安装状态..."

# 检查根目录依赖
if [ ! -d "node_modules" ]; then
    echo "⚠️  根目录依赖未安装，正在安装..."
    npm install
else
    echo "✅ 根目录依赖已安装"
fi

# 检查后端依赖
if [ ! -d "backend/node_modules" ]; then
    echo "⚠️  后端依赖未安装，正在安装..."
    npm install --workspace=backend
else
    echo "✅ 后端依赖已安装"
fi

# 检查前端依赖
if [ ! -d "frontend/node_modules" ]; then
    echo "⚠️  前端依赖未安装，正在安装..."
    npm install --workspace=frontend
else
    echo "✅ 前端依赖已安装"
fi

echo ""
echo "🌐 启动开发服务器..."
echo "📱 前端地址: http://localhost:3000"
echo "🔧 后端地址: http://localhost:3001"
echo ""
echo "按 Ctrl+C 停止所有服务"
echo ""

# 启动开发环境
npm run dev 