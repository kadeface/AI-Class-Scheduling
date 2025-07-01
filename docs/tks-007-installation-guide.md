# TKS-007 前端依赖安装指南

## 概述
TKS-007任务为前端添加了新的UI组件，需要安装额外的Radix UI依赖包。

## 需要安装的依赖

在前端项目目录下执行以下命令：

```powershell
# 进入前端项目目录
cd D:\cursor_project\AI-Class-Scheduling\frontend

# 安装新的Radix UI组件依赖
npm install @radix-ui/react-switch @radix-ui/react-separator

# 验证安装
npm list @radix-ui/react-switch @radix-ui/react-separator
```

## 安装的组件说明

### @radix-ui/react-switch
- **用途**: 开关控件，用于排课规则界面中的布尔值设置
- **组件文件**: `frontend/src/components/ui/switch.tsx`
- **使用场景**: 教师约束、教室约束、课程排列规则等开关选项

### @radix-ui/react-separator
- **用途**: 分隔线组件，用于界面布局分隔
- **组件文件**: `frontend/src/components/ui/separator.tsx`
- **使用场景**: 表单组分隔、内容区域分隔

## 已创建的UI组件

TKS-007还创建了以下UI组件，无需额外安装依赖：

1. **Badge** (`badge.tsx`) - 徽章标签组件
2. **Card** (`card.tsx`) - 卡片容器组件
3. **Tabs** (`tabs.tsx`) - 标签页组件
4. **Label** (`label.tsx`) - 表单标签组件
5. **Textarea** (`textarea.tsx`) - 多行文本输入组件

## 验证安装

安装完成后，可以通过以下方式验证：

1. **检查依赖版本**:
   ```powershell
   npm list | findstr radix-ui
   ```

2. **启动开发服务器**:
   ```powershell
   npm run dev
   ```

3. **访问排课管理页面**:
   访问 `http://localhost:3000/management/schedules` 确认页面正常加载

## 如果遇到问题

1. **依赖冲突**: 删除 `node_modules` 文件夹和 `package-lock.json`，重新安装：
   ```powershell
   Remove-Item -Recurse -Force node_modules
   Remove-Item package-lock.json
   npm install
   npm install @radix-ui/react-switch @radix-ui/react-separator
   ```

2. **TypeScript错误**: 确保所有TypeScript类型正确，重启TypeScript服务器

3. **样式问题**: 检查Tailwind CSS配置是否正确加载

## 功能验证清单

完成安装后，请验证以下功能：

- [ ] 排课管理主页面正常显示
- [ ] 教学计划管理页面可以访问
- [ ] 排课规则管理页面可以访问
- [ ] 导航菜单中"排课设置"项目正常显示
- [ ] 所有UI组件正常渲染（卡片、徽章、表单控件等）

## 下一步

TKS-007完成后，可以继续进行：
- TKS-008: 研发核心排课算法
- 后续的智能排课引擎开发

---

> 📝 **注意**: 本指南提供手动安装步骤，请逐步执行每个命令并验证结果。