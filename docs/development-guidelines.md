# 开发规范 - 避免数据访问错误

## 🎯 目标
建立"数据优先"的开发模式，从根本上避免空值访问错误，提高代码质量和系统稳定性。

## 📋 必须遵循的开发流程

### 1. 开发前准备 ⚠️ 必需
```markdown
□ 查阅 database-schema.md，了解数据结构
□ 确认字段类型、是否可选、关联关系
□ 检查相关TypeScript接口定义
□ 规划数据访问的安全策略
```

### 2. 数据访问安全规则

#### 🚫 禁止的访问方式
```typescript
// ❌ 危险：直接访问可能为null的属性
const name = schedule.teacher.name;
const count = items.length;

// ❌ 危险：未验证数组就使用map
items.map(item => item.name);

// ❌ 危险：假设API返回特定格式
const list = response.data;
```

#### ✅ 推荐的安全访问方式
```typescript
// ✅ 安全：使用可选链和默认值
const name = schedule.teacher?.name || '未知教师';
const count = items?.length || 0;

// ✅ 安全：验证数组后再使用
(items || []).map(item => item?.name || '未知');

// ✅ 安全：处理多种API响应格式
const list = response.data?.items || response.data || [];

// ✅ 最佳：使用安全包装函数
import { getTeacherName, safeMapToOptions } from '@/lib/data-helpers';
const name = getTeacherName(schedule.teacher);
const options = safeMapToOptions(teachers);
```

### 3. TypeScript 类型安全

#### 必须使用的配置
```json
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true
  }
}
```

#### 类型定义规范
```typescript
// ✅ 明确标识可能为null的字段
interface ScheduleItem {
  _id?: string;
  class: ClassInfo | null;    // 明确可能为null
  teacher: TeacherInfo | null;
  // ...
}

// ✅ 使用类型守卫
function isValidSchedule(item: any): item is ScheduleItem {
  return item && item.class && item.teacher && item.room;
}
```

### 4. API开发规范

#### 统一响应格式
```typescript
// ✅ 标准成功响应
{
  success: true,
  message: "操作成功",
  data: [...] | {...}
}

// ✅ 标准分页响应
{
  success: true,
  message: "获取列表成功", 
  data: {
    items: [...],
    total: 100,
    page: 1,
    limit: 20
  }
}

// ✅ 标准错误响应
{
  success: false,
  message: "操作失败",
  error: "具体错误信息"
}
```

#### 数据完整性检查
```typescript
// 后端：创建前验证关联数据存在
const teacher = await Teacher.findById(teacherId);
if (!teacher) {
  return res.status(400).json({
    success: false,
    message: '教师不存在'
  });
}

// 后端：populate时处理缺失数据
const schedules = await Schedule.find()
  .populate('teacher', 'name')
  .populate('class', 'name')
  .lean();

// 过滤掉关联数据缺失的记录
const validSchedules = schedules.filter(s => s.teacher && s.class);
```

### 5. 前端组件开发规范

#### 数据加载状态处理
```typescript
const [data, setData] = useState<T[]>([]);
const [loading, setLoading] = useState(false);
const [error, setError] = useState<string>();

// ✅ 完整的状态处理
if (loading) return <Loading />;
if (error) return <Error message={error} />;
if (!data.length) return <Empty />;

// ✅ 安全的数据渲染
{(data || []).map(item => (
  <Item key={item._id} data={item} />
))}
```

#### 表单数据验证
```typescript
// ✅ 提交前验证必填字段
const validateForm = () => {
  const required = ['classId', 'teacherId', 'roomId'];
  const missing = required.filter(field => !formData[field]);
  
  if (missing.length > 0) {
    setError(`请填写：${missing.join('、')}`);
    return false;
  }
  return true;
};
```

## 🔧 工具和助手函数

### 必须使用的助手函数
```typescript
// 从 @/lib/data-helpers 导入
import {
  getClassName,           // 安全获取班级名称
  getTeacherName,        // 安全获取教师名称  
  getCourseName,         // 安全获取课程名称
  getRoomName,           // 安全获取教室名称
  safeMapToOptions,      // 安全映射选项
  safeSearch,            // 安全搜索过滤
  isValidSchedule,       // 数据完整性检查
  getScheduleDisplayInfo // 获取安全显示信息
} from '@/lib/data-helpers';

// 使用示例
const options = safeMapToOptions(teachers, '_id', 'name');
const displayInfo = getScheduleDisplayInfo(schedule);
```

## 📝 代码审查检查清单

### 提交前自检
```markdown
□ 是否查阅了 database-schema.md？
□ 是否使用了可选链操作符 (?.) ？
□ 是否为可能为空的数据提供了默认值？
□ 是否验证了数组再使用 map/filter？
□ 是否处理了 API 错误状态？
□ 是否使用了类型安全的助手函数？
□ 是否添加了适当的 loading 和 error 状态？
```

### Code Review 检查点
```markdown
□ 数据访问是否安全？
□ 类型定义是否准确？
□ 错误边界是否完整？
□ 是否有潜在的空值访问？
□ API 响应格式是否标准？
□ 是否遵循了开发规范？
```

## 🚨 常见错误和解决方案

### 错误1：Cannot read properties of null
```typescript
// ❌ 问题代码
const name = schedule.teacher.name;

// ✅ 解决方案
const name = schedule.teacher?.name || '未知教师';
// 或使用助手函数
const name = getTeacherName(schedule.teacher);
```

### 错误2：items.map is not a function  
```typescript
// ❌ 问题代码
const options = classes.map(cls => ({...}));

// ✅ 解决方案
const options = (classes || []).map(cls => ({...}));
// 或使用助手函数
const options = safeMapToOptions(classes);
```

### 错误3：数据格式不一致
```typescript
// ❌ 问题：API有时返回直接数组，有时返回分页格式
// ✅ 解决方案：统一处理
const items = response.data?.items || response.data || [];
```

## 🎯 最佳实践总结

### 1. 数据优先原则
- 开发功能前先了解数据结构
- 设计API时考虑数据完整性
- 建立数据访问的安全模式

### 2. 防御性编程
- 假设所有外部数据都可能为null
- 为所有边界情况提供处理逻辑
- 使用类型系统确保数据安全

### 3. 一致性原则  
- 统一的API响应格式
- 统一的错误处理策略
- 统一的数据访问模式

### 4. 可维护性
- 使用共享的类型定义
- 使用可复用的助手函数
- 保持文档与代码同步

---

## ⚠️ 前后端共享常量与数据一致性规范

### 1. 单一数据源原则
- 所有涉及前后端共享的枚举、常量、配置（如学科、年级、教室类型等），必须在项目中唯一维护，严禁多处手动复制粘贴。
- 推荐将常量定义在后端 `backend/src/constants/` 目录，并通过自动脚本导出为前端可用的 JSON 或 TypeScript 文件。

### 2. 自动同步机制
- 必须为所有前后端共享常量建立自动同步机制（如脚本导出、monorepo 共享、API 动态获取等），确保任何一方变更后另一方能自动获取最新数据。
- 前端严禁本地硬编码与后端常量重复的内容，所有校验、下拉、模板等均应 import 同步文件。

### 3. 代码评审要求
- 代码评审时，必须检查所有涉及前后端共享的数据结构、枚举、常量，确保只维护一份且同步机制健全。
- 如发现多处维护、手动同步、内容不一致等问题，必须拒绝合并并要求整改。

### 4. 文档与开发流程
- 在项目开发文档中明确列出所有前后端共享常量的唯一维护位置和同步方式。
- 新增或修改共享常量时，必须同步更新自动同步脚本，并在 PR 描述中说明同步影响范围。

### 5. 典型场景举例
- 学科、年级、教室类型、课程类型、用户角色等所有前后端都需用到的枚举，均应遵循本规范。

---

**🔄 每次遇到数据访问错误时：**
1. 分析根本原因
2. 更新相关文档
3. 创建/完善助手函数
4. 制定预防措施
5. 分享给团队成员

**📚 相关文档：**
- [数据库模型文档](./database-schema.md)
- [TypeScript 配置](../frontend/tsconfig.json)
- [API 文档](./api-documentation.md)

### 6. 弹窗关闭后的数据刷新规范

- 所有涉及数据变更（如批量导入、编辑、删除等）的弹窗组件，**在弹窗关闭时必须主动刷新主列表数据**，确保页面数据与后端保持一致。
- 推荐在弹窗的 `onOpenChange` 回调中，拦截关闭事件（`open === false`），并调用对应的 `fetchXXX()` 数据获取函数。
- 适用场景包括但不限于：课程、班级、教师、场室等管理页面的批量导入、编辑、新增等弹窗。
- 这样可避免用户操作后页面数据未及时更新，提升用户体验和数据一致性。

**示例代码：**
```tsx
<ImportDialog
  open={importDialogOpen}
  onOpenChange={(open) => {
    setImportDialogOpen(open);
    if (!open) {
      fetchXXX(); // 弹窗关闭时刷新主列表
    }
  }}
  resourceType="xxx"
  onImport={handleBatchImport}
/>
```

---

## 前后端学科常量同步操作指南

### 场景说明
当后端 `src/constants/subjects.ts` 文件中的学科常量（SUBJECTS）有新增、修改或删除时，需要同步更新前端的学科列表（frontend/src/lib/subjects.json），以保证前端校验和下拉选项与后端一致。

### 操作步骤

1. **在后端维护学科常量**
   - 编辑 `backend/src/constants/subjects.ts`，增删或修改 `SUBJECTS` 数组内容。

2. **运行同步脚本**
   - 在终端进入 `AI-Class-Scheduling/backend` 目录，执行：
     ```bash
     npx ts-node src/scripts/export-subjects-json.ts
     ```
   - 脚本会自动将最新的 `SUBJECTS` 导出为 JSON 文件，覆盖前端的 `frontend/src/lib/subjects.json`。

3. **前端自动生效**
   - 前端所有涉及学科的下拉、校验等会自动读取最新 subjects.json，无需手动修改前端代码。

4. **常见问题**
   - 如果导入教师/课程时报“无效的学科”，请检查前后端学科是否同步，并重复上述操作。

---