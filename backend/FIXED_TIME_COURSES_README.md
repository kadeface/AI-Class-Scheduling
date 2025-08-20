# 🔒 固定时间课程功能说明

## 功能概述

固定时间课程功能允许在K12排课系统中设置每周固定时间进行的课程，如班会、升旗仪式、眼保健操等。这些课程具有最高优先级，不会被其他课程覆盖。

## 🎯 支持的课程类型

| 课程类型 | 说明 | 示例 |
|---------|------|------|
| `class-meeting` | 班会 | 每周一第一节 |
| `flag-raising` | 升旗仪式 | 每周一第一节前 |
| `eye-exercise` | 眼保健操 | 每天上午第二节后 |
| `morning-reading` | 晨读 | 每天第一节前 |
| `afternoon-reading` | 午读 | 每天下午第一节前 |
| `cleaning` | 大扫除 | 每周五最后一节 |
| `other` | 其他 | 自定义固定时间课程 |

## ⚙️ 配置方法

### 1. 在排课规则中配置

```typescript
const schedulingRules = [
  {
    courseArrangementRules: {
      fixedTimeCourses: {
        enabled: true,                    // 启用固定时间课程功能
        courses: [                        // 固定时间课程列表
          {
            type: 'class-meeting',        // 课程类型
            dayOfWeek: 1,                 // 星期几 (1-7)
            period: 1,                    // 第几节课 (1-8)
            weekType: 'all',              // 周次类型: 'all' | 'odd' | 'even'
            startWeek: 1,                 // 开始周次
            endWeek: 20,                  // 结束周次
            notes: '班主任主持班会'        // 备注信息
          }
        ],
        priority: true,                   // 是否优先于其他课程
        allowOverride: false,             // 是否允许手动调整
        conflictStrategy: 'strict'        // 冲突处理策略: 'strict' | 'flexible' | 'warning'
      }
    }
  }
];
```

### 2. 时间配置说明

- **dayOfWeek**: 1=周一, 2=周二, ..., 7=周日
- **period**: 1=第一节, 2=第二节, ..., 8=第八节
- **weekType**: 
  - `'all'`: 全周进行
  - `'odd'`: 单周进行
  - `'even'`: 双周进行
- **startWeek/endWeek**: 指定周次范围

## 🚀 使用方法

### 1. 基本使用

```typescript
import { K12SchedulingEngine } from './services/scheduling/k12-scheduling-engine';

const engine = new K12SchedulingEngine();

const result = await engine.schedule(
  teachingPlans,      // 教学计划
  schedulingRules,    // 排课规则（包含固定时间课程配置）
  timeSlots,          // 可用时间槽
  rooms,              // 可用教室
  '2025-2026',        // 学年
  '1'                 // 学期
);
```

### 2. 固定时间课程处理流程

```
1. 初始化数据
   ↓
2. 🔒 处理固定时间课程 ← 新增步骤
   - 解析排课规则中的固定时间课程配置
   - 为每个班级创建固定时间课程分配
   - 将固定时间课程添加到当前分配中
   ↓
3. 扩展时间槽（排除固定时间课程占用的时间段）
   - 标记被固定时间课程占用的时间段为不可用
   - 记录占用信息
   ↓
4. 执行分阶段排课
   - 核心课程排课
   - 副科课程排课
   ↓
5. 保存排课结果
```

## 🔍 功能特性

### 1. 优先级管理
- 固定时间课程具有最高优先级
- 在排课开始前就被确定
- 不会被其他课程覆盖

### 2. 时间槽管理
- 自动标记被占用的时间段
- 后续排课过程自动避开这些时间段
- 支持周次类型和范围控制

### 3. 约束检测
- 集成到现有约束检测系统
- 支持冲突处理策略配置
- 提供详细的错误信息和建议

### 4. 灵活性配置
- 支持多种课程类型
- 可配置的冲突处理策略
- 支持手动调整开关

## 📊 数据结构

### 1. 固定时间课程配置

```typescript
interface FixedTimeCoursesConfig {
  enabled: boolean;                    // 是否启用
  courses: FixedTimeCourse[];          // 课程列表
  priority: boolean;                   // 是否优先
  allowOverride: boolean;              // 是否允许调整
  conflictStrategy: 'strict' | 'flexible' | 'warning'; // 冲突策略
}

interface FixedTimeCourse {
  type: string;                        // 课程类型
  dayOfWeek: number;                   // 星期几
  period: number;                      // 节次
  weekType: 'all' | 'odd' | 'even';   // 周次类型
  startWeek: number;                   // 开始周次
  endWeek: number;                     // 结束周次
  notes?: string;                      // 备注
}
```

### 2. 课程分配对象

```typescript
interface CourseAssignment {
  variableId: string;                  // 变量ID
  classId: ObjectId;                   // 班级ID
  courseId: ObjectId;                  // 课程ID
  teacherId: ObjectId;                 // 教师ID
  roomId: ObjectId;                    // 教室ID
  timeSlot: TimeSlot;                  // 时间段
  isFixed: boolean;                    // 是否为固定安排
  
  // 🆕 新增：固定时间课程相关字段
  weekType?: 'all' | 'odd' | 'even';  // 周次类型
  startWeek?: number;                  // 开始周次
  endWeek?: number;                    // 结束周次
}
```

## 🧪 测试方法

### 1. 运行测试

```bash
cd backend
npm run build
node test-fixed-time-courses.js
```

### 2. 测试数据

测试文件包含以下模拟数据：
- 教学计划：高一(1)班，包含班会课程
- 排课规则：周一第一节安排班会
- 时间槽：周一和周二的前两节课
- 教室：高一(1)班固定教室

### 3. 预期结果

- 班会成功安排在周一第一节
- 该时间段被标记为不可用
- 其他课程不会占用该时间段

## ⚠️ 注意事项

### 1. 数据要求
- 教学计划必须包含班级信息
- 排课规则必须正确配置固定时间课程
- 教室必须与班级正确关联

### 2. 约束检查
- 固定时间课程会检查教师、班级、教室冲突
- 如果无法找到合适的教师或教室，会跳过该课程
- 建议在配置前确保数据完整性

### 3. 性能考虑
- 固定时间课程处理在排课开始前执行
- 对整体排课性能影响很小
- 建议合理配置固定时间课程数量

## 🔧 故障排除

### 1. 常见问题

**Q: 固定时间课程没有生效？**
A: 检查排课规则中的 `enabled` 字段是否为 `true`

**Q: 找不到教师或教室？**
A: 确保教学计划中包含教师信息，教室与班级正确关联

**Q: 时间槽冲突？**
A: 检查固定时间课程的时间配置是否合理

### 2. 调试信息

系统会输出详细的调试信息：
- 固定时间课程处理状态
- 时间槽扩展结果
- 冲突检测结果

### 3. 日志示例

```
🔒 [固定时间课程] 开始处理固定时间课程...
🔒 [固定时间课程] 成功处理 1 个固定时间课程分配
   🔍 [时间槽扩展] 找到 1 个班级
   ✅ [时间槽扩展] 成功扩展: 3 × 1 = 3 个班级时间段
```

## 📈 扩展功能

### 1. 未来计划
- 支持更复杂的周次规则
- 添加时间偏好配置
- 支持动态调整固定时间课程

### 2. 自定义扩展
- 可以添加新的课程类型
- 支持自定义时间计算规则
- 集成到其他排课策略中

---

**版本**: 1.0.0  
**更新日期**: 2025-01-14  
**维护者**: AI-Class-Scheduling Team
