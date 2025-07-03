# 🚀 服务启动指南

## 启动后端服务
```powershell
cd D:\cursor_project\AI-Class-Scheduling\backend
npm run dev
```
✅ 确认看到: "🚀 智能排课系统API服务已启动"
🌐 后端地址: http://localhost:5000

## 启动前端服务（新终端窗口）
```powershell
cd D:\cursor_project\AI-Class-Scheduling\frontend  
npm run dev
```
🌐 前端地址: http://localhost:3000

## 健康检查
```powershell
curl http://localhost:5000/api/health
```

## 生成测试数据
```powershell
cd D:\cursor_project\AI-Class-Scheduling\backend
npm run test:algorithm
```