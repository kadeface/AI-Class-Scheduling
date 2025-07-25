# 前端界面测试完整指南

> 📋 **用途**: 测试教学计划和排课规则管理功能的详细指导
> 
> 🗓 **更新日期**: 2024-12-19
> 
> 📍 **测试范围**: TKS-007任务交付物验证

## 🚀 快速启动

### 前置条件
- ✅ 后端服务已完成TKS-007相关错误修复
- ✅ 前端界面开发完成
- ✅ 相关依赖包已安装

### 启动服务步骤
**⚠️ 重要：请手动执行以下命令，不要自动执行**

#### 1. 启动后端服务
```powershell
# 打开PowerShell，进入后端目录
cd D:\cursor_project\AI-Class-Scheduling\backend

# 启动开发服务器
npm run dev
```

**预期输出**：
```
✅ MongoDB数据库连接成功
📊 数据库名称: ai-class-scheduling
🔗 连接地址: mongodb://localhost:27017/ai-class-scheduling
🚀 智能排课系统API服务已启动
📍 服务地址: http://localhost:5000
🌍 环境模式: development
📊 健康检查: http://localhost:5000/api/health
```

#### 2. 启动前端服务
```powershell
# 新开一个PowerShell窗口，进入前端目录
cd D:\cursor_project\AI-Class-Scheduling\frontend

# 启动开发服务器
npm run dev
```

**预期输出**：
```
▲ Next.js 15.x.x
- Local:        http://localhost:3000
- Ready in xxms
```

#### 3. 验证服务状态
```powershell
# 测试后端健康检查
curl http://localhost:5000/api/health

# 预期返回200状态码和JSON响应
```

## 🧪 详细测试步骤

### 阶段1：排课管理主页测试

#### 访问地址
```
http://localhost:3000/management/schedules
```

#### 验证清单
- [ ] **页面加载**: 无错误，Loading状态正常
- [ ] **布局结构**: 
  - [ ] 页面标题："排课设置"
  - [ ] 欢迎信息和使用指南
  - [ ] 两个功能模块卡片：教学计划管理、排课规则管理
- [ ] **卡片设计**:
  - [ ] 卡片阴影和圆角效果
  - [ ] 图标显示正常（Calendar、Settings图标）
  - [ ] 描述文字清晰
  - [ ] 悬停效果正常
- [ ] **导航功能**:
  - [ ] 点击"教学计划管理"跳转正确
  - [ ] 点击"排课规则管理"跳转正确
- [ ] **响应式设计**:
  - [ ] 桌面端布局正常
  - [ ] 平板端适配正常
  - [ ] 卡片在小屏幕下垂直排列

#### 快速统计验证
- [ ] 显示教学计划总数
- [ ] 显示活跃规则集数量
- [ ] 数字更新正常

### 阶段2：教学计划管理页面测试

#### 访问地址
```
http://localhost:3000/management/schedules/teaching-plans
```

#### 页面结构验证
- [ ] **头部区域**:
  - [ ] 页面标题："教学计划管理"
  - [ ] 面包屑导航正常
  - [ ] "创建教学计划"按钮位置正确
- [ ] **搜索筛选区域**:
  - [ ] 关键词搜索框
  - [ ] 学年选择下拉框
  - [ ] 学期选择下拉框  
  - [ ] 状态筛选（草稿、待审核、已通过、已拒绝）
  - [ ] 班级筛选下拉框
  - [ ] "搜索"和"重置"按钮

#### 数据表格验证
- [ ] **表格结构**:
  - [ ] 表头：班级、学年学期、总课时、课程数量、状态、操作
  - [ ] 数据行显示正常
  - [ ] 表格边框和间距美观
- [ ] **状态显示**:
  - [ ] Badge组件正常显示状态
  - [ ] 不同状态颜色区分明确（草稿-灰色、待审核-黄色、已通过-绿色、已拒绝-红色）
- [ ] **操作按钮**:
  - [ ] 查看按钮（Eye图标）
  - [ ] 编辑按钮（Edit图标）
  - [ ] 审批按钮（Check图标，仅待审核状态显示）
  - [ ] 删除按钮（Trash图标）
  - [ ] 按钮悬停效果正常

#### 功能交互验证
- [ ] **搜索功能**:
  - [ ] 关键词搜索实时触发
  - [ ] 筛选条件组合使用正常
  - [ ] 重置按钮清空所有筛选
- [ ] **分页功能**:
  - [ ] 分页控件显示正常
  - [ ] 页面切换功能正常
  - [ ] 每页显示数量选择
- [ ] **排序功能**:
  - [ ] 表头点击排序正常
  - [ ] 排序指示器显示
- [ ] **操作确认**:
  - [ ] 删除操作弹出确认对话框
  - [ ] 确认/取消按钮正常

### 阶段3：排课规则管理页面测试

#### 访问地址
```
http://localhost:3000/management/schedules/scheduling-rules
```

#### 页面结构验证
- [ ] **头部区域**:
  - [ ] 页面标题："排课规则管理"
  - [ ] 面包屑导航正常
  - [ ] "创建排课规则"按钮
- [ ] **筛选区域**:
  - [ ] 学校类型选择（小学、初中、高中、综合）
  - [ ] 学年选择下拉框
  - [ ] 学期选择（第一学期、第二学期）
  - [ ] 筛选按钮功能正常

#### 规则列表验证
- [ ] **列表项结构**:
  - [ ] 规则名称和描述
  - [ ] 学校类型和学年学期标签
  - [ ] 默认规则徽章显示
  - [ ] 状态指示器（活跃/非活跃）
- [ ] **规则详情**:
  - [ ] 时间设置摘要
  - [ ] 约束条件概要
  - [ ] 创建时间和创建人
  - [ ] 最后修改信息

#### 操作功能验证
- [ ] **基础操作**:
  - [ ] 查看详情按钮
  - [ ] 编辑规则按钮
  - [ ] 复制规则按钮
  - [ ] 删除规则按钮
- [ ] **特殊操作**:
  - [ ] "设为默认"按钮（仅非默认规则显示）
  - [ ] 默认规则特殊标识
  - [ ] 操作权限控制正确

### 阶段4：UI组件独立验证

#### Badge组件测试
- [ ] **变体样式**:
  - [ ] default: 灰色背景
  - [ ] primary: 蓝色背景  
  - [ ] success: 绿色背景
  - [ ] warning: 黄色背景
  - [ ] danger: 红色背景
- [ ] **尺寸适配**:
  - [ ] 文字长度自适应
  - [ ] 圆角效果正常
  - [ ] 内边距合适

#### Card组件测试
- [ ] **卡片结构**:
  - [ ] Card.Header区域
  - [ ] Card.Content区域
  - [ ] Card.Footer区域
- [ ] **视觉效果**:
  - [ ] 阴影效果subtle
  - [ ] 圆角样式一致
  - [ ] 边框颜色正确

#### Tabs组件测试
- [ ] **标签页切换**:
  - [ ] 点击切换正常
  - [ ] 活跃状态样式
  - [ ] 内容区域更新
- [ ] **键盘导航**:
  - [ ] 方向键切换
  - [ ] Enter键激活

#### Switch组件测试
- [ ] **开关状态**:
  - [ ] 开启状态样式
  - [ ] 关闭状态样式
  - [ ] 切换动画效果
- [ ] **交互反馈**:
  - [ ] 点击响应
  - [ ] 禁用状态正确

#### Textarea组件测试
- [ ] **输入功能**:
  - [ ] 多行文本输入
  - [ ] 自动调整高度
  - [ ] 字符计数显示
- [ ] **样式外观**:
  - [ ] 边框和焦点样式
  - [ ] 占位符文本
  - [ ] 错误状态样式

#### Separator组件测试
- [ ] **分隔效果**:
  - [ ] 水平分隔线
  - [ ] 垂直分隔线（如适用）
  - [ ] 颜色和粗细合适

### 阶段5：API接口验证

#### 使用开发者工具验证
**步骤**：
1. 打开浏览器开发者工具（F12）
2. 切换到Network面板
3. 刷新页面，观察网络请求

#### 教学计划API验证
- [ ] **GET /api/teaching-plans**:
  - [ ] 请求发送成功
  - [ ] 响应状态码200
  - [ ] 响应数据格式正确
  - [ ] 分页信息完整
- [ ] **查询参数验证**:
  - [ ] keyword搜索参数
  - [ ] academicYear筛选参数
  - [ ] semester筛选参数
  - [ ] status筛选参数
  - [ ] classId筛选参数
  - [ ] page和limit分页参数

#### 排课规则API验证
- [ ] **GET /api/scheduling-rules**:
  - [ ] 请求发送成功
  - [ ] 响应状态码200
  - [ ] 规则数据结构正确
  - [ ] 筛选参数生效
- [ ] **GET /api/scheduling-rules/default**:
  - [ ] 默认规则查询正常
  - [ ] 学年学期参数传递正确

#### 错误处理验证
- [ ] **网络错误**:
  - [ ] 后端服务关闭时显示错误信息
  - [ ] 超时处理机制
  - [ ] 重试机制（如实现）
- [ ] **数据错误**:
  - [ ] 空数据状态处理
  - [ ] 格式错误处理
  - [ ] 权限错误处理

### 阶段6：性能和体验验证

#### 加载性能
- [ ] **首次加载**:
  - [ ] 页面加载时间 < 3秒
  - [ ] 关键资源优先加载
  - [ ] Loading状态友好
- [ ] **数据加载**:
  - [ ] API响应时间合理
  - [ ] 大数据量处理正常
  - [ ] 懒加载实现（如适用）

#### 用户体验
- [ ] **视觉反馈**:
  - [ ] 按钮悬停效果
  - [ ] 加载状态指示
  - [ ] 操作成功/失败提示
- [ ] **交互体验**:
  - [ ] 表单验证实时反馈
  - [ ] 操作确认机制
  - [ ] 键盘导航支持

#### 响应式设计
- [ ] **桌面端 (1200px+)**:
  - [ ] 布局完整显示
  - [ ] 表格列显示完整
  - [ ] 侧边栏导航正常
- [ ] **平板端 (768px-1199px)**:
  - [ ] 布局适配合理
  - [ ] 表格可横向滚动
  - [ ] 操作按钮适当简化
- [ ] **移动端 (< 768px)**:
  - [ ] 响应式表格或卡片布局
  - [ ] 导航菜单折叠
  - [ ] 触摸友好的按钮尺寸

## 🐛 常见问题排查

### 页面无法访问
1. **确认服务状态**:
   ```powershell
   # 检查端口占用
   netstat -ano | findstr :3000
   netstat -ano | findstr :5000
   ```

2. **检查控制台错误**:
   - 浏览器开发者工具Console面板
   - 查看具体错误信息

### API请求失败
1. **后端服务检查**:
   ```powershell
   curl http://localhost:5000/api/health
   ```

2. **CORS问题排查**:
   - 检查控制台CORS错误
   - 确认后端CORS配置

### 界面显示异常
1. **CSS样式问题**:
   - 检查Tailwind CSS类名
   - 验证组件导入路径

2. **组件渲染错误**:
   - 查看React Developer Tools
   - 检查组件props传递

## ✅ 测试完成检查清单

### 基础功能验证
- [ ] 排课管理主页正常访问和导航
- [ ] 教学计划管理页面完整功能
- [ ] 排课规则管理页面完整功能
- [ ] 所有UI组件正常工作
- [ ] API接口调用正常

### 高级功能验证
- [ ] 搜索筛选功能完整
- [ ] 分页和排序正常
- [ ] 操作确认机制有效
- [ ] 错误处理机制完善
- [ ] 响应式设计适配

### 性能体验验证
- [ ] 页面加载性能良好
- [ ] 交互反馈及时
- [ ] 视觉效果美观
- [ ] 用户体验流畅

---

> 📌 **测试建议**: 建议逐个阶段完成测试，发现问题及时记录并反馈
> 
> 🔄 **后续优化**: 基于测试结果制定界面优化和功能增强计划