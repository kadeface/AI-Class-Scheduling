import { Request, Response } from 'express';
import * as XLSX from 'xlsx';
import { Teacher } from '../models/Teacher';
import { Class } from '../models/Class';
import { Course } from '../models/Course';
import { Room } from '../models/Room';
import { Model } from 'mongoose';

type ImportType = 'teachers' | 'classes' | 'courses' | 'rooms';

const IMPORT_SCHEMAS = {
  teachers: {
    required: [
      'name', 'employeeId', 'department', 'position', 'subjects', 'maxWeeklyHours', 'status'
    ],
    all: [
      'name', 'employeeId', 'department', 'position', 'subjects', 'maxWeeklyHours',
      'unavailableSlots', 'phone', 'email', 'status', 'createdAt', 'updatedAt', 'user'
    ],
  },
  classes: {
    required: [
      'name', 'grade', 'studentCount', 'academicYear', 'classTeacher'
    ],
    all: [
      'name', 'grade', 'studentCount', 'classTeacher', 'academicYear', 'status', 'createdAt', 'updatedAt'
    ],
  },
  courses: {
    required: [
      'name', 'subject', 'courseCode', 'weeklyHours', 'requiresContinuous', 'roomTypes', 'equipment'
    ],
    all: [
      'name', 'subject', 'courseCode', 'weeklyHours', 'requiresContinuous', 'continuousHours',
      'roomRequirements', 'isWeeklyAlternating', 'description', 'isActive', 'createdAt', 'updatedAt'
    ],
  },
  rooms: {
    required: [
      'name', 'roomNumber', 'type', 'capacity', 'equipment'
    ],
    all: [
      'name', 'roomNumber', 'type', 'capacity', 'building', 'floor', 'equipment',
      'assignedClass', 'isActive', 'unavailableSlots', 'createdAt', 'updatedAt'
    ],
  },
};

const MODEL_MAP: Record<ImportType, Model<any>> = {
  teachers: Teacher,
  classes: Class,
  courses: Course,
  rooms: Room,
};

const FIELD_TYPES: Record<ImportType, Record<string, string | string[] | object>> = {
  teachers: {
    name: 'string',
    employeeId: 'string',
    department: 'string',
    position: 'string',
    subjects: 'array',
    maxWeeklyHours: 'number',
    status: ['active', 'inactive'],
    unavailableSlots: 'string', // 可进一步细化
    phone: 'string',
    email: 'string',
    user: 'string',
  },
  classes: {
    name: 'string',
    grade: 'number',
    studentCount: 'number',
    classTeacher: 'string',
    academicYear: 'string',
    status: ['active', 'graduated', 'disbanded'],
  },
  courses: {
    name: 'string',
    subject: 'string',
    courseCode: 'string',
    weeklyHours: 'number',
    requiresContinuous: 'boolean',
    continuousHours: 'number',
    roomRequirements: 'object',
    isWeeklyAlternating: 'boolean',
    description: 'string',
    isActive: 'boolean',
  },
  rooms: {
    name: 'string',
    roomNumber: 'string',
    type: [
      '普通教室', '多媒体教室', '实验室', '计算机房', '语音室', '美术室', '音乐室', '舞蹈室', '体育馆', '操场', '图书馆', '会议室'
    ],
    capacity: 'number',
    building: 'string',
    floor: 'number',
    equipment: 'array',
    assignedClass: 'string',
    isActive: 'boolean',
  },
};

export class ImportController {
  /**
   * 批量导入数据（支持校验模式）
   */
  static async importData(req: Request, res: Response) {
    let data: any[] = [];
    let type: ImportType = req.params.type as ImportType;
    console.log("req.body",req.body)
    // 1. 优先处理结构化 JSON 数据
    if (Array.isArray(req.body)) {
      data = req.body;
    } else if (req.file) {
      // 文件上传处理
      let workbook;
      try {
        workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
      } catch (err) {
        res.status(400).json({
          success: false,
          message: '文件解析失败，请确认文件格式正确。',
          error: (err as Error).message,
        });
        return;
      }
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      if (!worksheet) {
        res.status(400).json({
          success: false,
          message: '未检测到有效数据表，请检查文件内容。',
        });
        return;
      }
      data = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
    } else {
      res.status(400).json({
        success: false,
        message: '未检测到有效数据，请上传结构化JSON或表格文件。',
      });
      return;
    }

    // 在这里加一行日志
    console.log('【导入收到的数据】', JSON.stringify(data, null, 2));

    // 4. 校验数据是否为空
    if (!data.length) {
      res.status(400).json({
        success: false,
        message: '文件内容为空，请检查数据。',
      });
      return;
    }

    // 5. 获取表头
    const headers = Object.keys(data[0]);

    const schema = IMPORT_SCHEMAS[type];
    if (!schema) {
      res.status(400).json({ success: false, message: '不支持的导入类型' });
      return;
    }

    // 校验表头
    const missingHeaders = schema.required.filter((h: string) => !headers.includes(h));
    if (missingHeaders.length) {
      res.status(400).json({
        success: false,
        message: `缺少必填字段: ${missingHeaders.join(', ')}`,
        headers,
      });
      return;
    }

    const errors: { row: number; error: string }[] = [];
    const typeDefs = FIELD_TYPES[type];

    // 1. 收集所有班主任姓名
    const teacherNames = Array.from(
      new Set(data.map(row => row.classTeacher).filter(Boolean))
    );

    // 2. 一次性查找所有教师
    const teachers = await Teacher.find({ name: { $in: teacherNames } }, { _id: 1, name: 1 }).lean();
    const teacherMap = new Map(teachers.map(t => [t.name, t._id]));

    // 3. 替换 classTeacher 字段为 ObjectId
    data.forEach(row => {
      if (row.classTeacher && teacherMap.has(row.classTeacher)) {
        row.classTeacher = teacherMap.get(row.classTeacher);
      } else if (row.classTeacher) {
        // 如果找不到，建议置为 undefined 或报错
        row.classTeacher = undefined;
        // 或者收集错误信息
        // errors.push({ row: ..., error: `班主任 ${row.classTeacher} 不存在` });
      }
    });

    data.forEach((row, idx) => {
      // 1. 先组装 roomRequirements
      if (row.roomTypes || row.equipment) {
        row.roomRequirements = {
          types: row.roomTypes ? row.roomTypes.split(',').map((s: string) => s.trim()).filter(Boolean) : [],
          equipment: row.equipment ? row.equipment.split(',').map((s: string) => s.trim()).filter(Boolean) : [],
          capacity: 45,
        };
  
      }
      // 2. 再做必填字段校验
      schema.required.forEach((field: string) => {
        if (!row[field] || row[field].toString().trim() === '') {
          errors.push({ row: idx + 2, error: `字段 "${field}" 不能为空` });
        }
      });
      // 类型与格式校验
      Object.keys(row).forEach((field) => {
        const def = typeDefs[field];
        const value = row[field];
        if (def === 'number' && value && isNaN(Number(value))) {
          errors.push({ row: idx + 2, error: `字段 "${field}" 必须为数字` });
        }
        if (def === 'boolean' && value && !['true', 'false', '1', '0', true, false].includes(value)) {
          errors.push({ row: idx + 2, error: `字段 "${field}" 必须为布尔值(true/false/1/0)` });
        }
        if (def === 'array' && value && typeof value === 'string' && value.indexOf(',') === -1) {
          errors.push({ row: idx + 2, error: `字段 "${field}" 应为逗号分隔的数组` });
        }
        if (Array.isArray(def) && value && !def.includes(value)) {
          errors.push({ row: idx + 2, error: `字段 "${field}" 必须为以下值之一: ${def.join(', ')}` });
        }
      });
    });

    if (errors.length) {
      res.status(400).json({
        success: false,
        message: '数据校验未通过',
        errors,
        rowCount: data.length,
      });
      return;
    }

    // 1. 唯一性字段定义
    const UNIQUE_FIELDS: Record<ImportType, string[] | [string, string][]> = {
      teachers: ['employeeId'],
      classes: [['name', 'academicYear']],
      courses: ['courseCode'],
      rooms: ['roomNumber'],
    };

    // 2. 查询数据库已存在的唯一性字段集合
    let existingSet = new Set<string>();
    let existingCoursesMap = new Map<string, any>();
    if (type === 'teachers') {
      const existing = await Teacher.find({}, { employeeId: 1 }).lean();
      existingSet = new Set(existing.map((t: any) => t.employeeId));
    } else if (type === 'courses') {
      const existing = await Course.find({}, { courseCode: 1, isActive: 1 }).lean();
      existingSet = new Set(existing.map((c: any) => c.courseCode));
      existingCoursesMap = new Map(existing.map((c: any) => [c.courseCode, c]));
    } else if (type === 'rooms') {
      const existing = await Room.find({}, { roomNumber: 1 }).lean();
      existingSet = new Set(existing.map((r: any) => r.roomNumber));
    } else if (type === 'classes') {
      const existing = await Class.find({}, { name: 1, academicYear: 1 }).lean();
      existingSet = new Set(existing.map((c: any) => `${c.name}__${c.academicYear}`));
    }

    // 3. 检查导入数据唯一性冲突（courses类型支持复活）
    const uniqueErrors: { row: number; error: string }[] = [];
    let toInsert: any[] = [];
    let toUpdate: any[] = [];
    if (type === 'courses') {
      data.forEach((row, idx) => {
        const existing = existingCoursesMap.get(row.courseCode);
        if (existing) {
          if (!existing.isActive) {
            // 软删除，允许复活
            toUpdate.push({ ...row, _id: existing._id });
          } else {
            uniqueErrors.push({ row: idx + 2, error: `课程编码 "${row.courseCode}" 已存在，不能重复导入` });
          }
        } else {
          toInsert.push(row);
        }
      });
    } else {
      data.forEach((row, idx) => {
        if (type === 'teachers' && existingSet.has(row.employeeId)) {
          uniqueErrors.push({ row: idx + 2, error: `工号 "${row.employeeId}" 已存在，不能重复导入` });
        }
        if (type === 'rooms' && existingSet.has(row.roomNumber)) {
          uniqueErrors.push({ row: idx + 2, error: `教室编号 "${row.roomNumber}" 已存在，不能重复导入` });
        }
        if (type === 'classes' && existingSet.has(`${row.name}__${row.academicYear}`)) {
          uniqueErrors.push({ row: idx + 2, error: `班级 "${row.name}" 学年 "${row.academicYear}" 已存在，不能重复导入` });
        }
      });
    }

    if (uniqueErrors.length) {
      res.status(400).json({
        success: false,
        message: '唯一性校验未通过',
        errors: uniqueErrors,
        rowCount: data.length,
      });
      return;
    }

    const validateOnly = req.query.validateOnly === 'true' || req.body.validateOnly === true;

    // 6. 返回解析结果（后续可在此处做字段校验、数据校验等）
    if (validateOnly) {
      res.json({
        success: true,
        message: '校验通过，仅校验未导入',
        headers,
        rowCount: data.length,
        preview: data.slice(0, 5),
      });
      return;
    }

    // 实际导入
    const Model = MODEL_MAP[type];
    try {
      // 可选：先做唯一性校验（如 employeeId、courseCode、roomNumber 等）
      // 可选：批量插入前先清理空值、格式化数据
      data.forEach(row => {
        Object.keys(row).forEach(field => {
          if (typeDefs[field] === 'array' && typeof row[field] === 'string') {
            row[field] = row[field].split(',').map((s: string) => s.trim()).filter(Boolean);
          }
          if (typeDefs[field] === 'number' && row[field] !== undefined) {
            row[field] = Number(row[field]);
          }
          if (typeDefs[field] === 'boolean' && row[field] !== undefined) {
            if (typeof row[field] === 'string') {
              const val = row[field].toLowerCase();
              row[field] = ['true', '1', 'active', '启用'].includes(val);
            } else {
              row[field] = ['true', '1', 1, true].includes(row[field]);
            }
          }
          if (field === 'roomRequirements' && typeof row[field] === 'string') {
            row[field] = {
              types: row[field].split(',').map((s: string) => s.trim()).filter(Boolean),
              equipment: row[field].split(',').map((s: string) => s.trim()).filter(Boolean)
            };
          }
        });
      });
      console.log('【实际插入数据库的数据】', JSON.stringify(data, null, 2));
      let insertCount = 0;
      let updateCount = 0;
      if (type === 'courses') {
        console.log('toInsert:', toInsert.length, toInsert);
        const result = await Course.insertMany(toInsert, { ordered: false });
        console.log('insert result:', result.length);
        insertCount = result.length;
        // 复活软删除课程
        for (const row of toUpdate) {
          const {_id, ...updateData} = row;
          updateData.isActive = true;
          await Course.updateOne(
            { _id },
            { $set: { ...updateData, isActive: true } }
          );
          updateCount++;
        }
        res.json({
          success: true,
          message: `成功导入${insertCount}条新课程，复活${updateCount}条已软删除课程`,
          inserted: insertCount,
          revived: updateCount,
        });
        return;
      } else {
        const result = await Model.insertMany(data, { ordered: false });
        res.json({
          success: true,
          message: `成功导入${result.length}条数据`,
          rowCount: result.length,
        });
      }
    } catch (err) {
      res.status(500).json({
        success: false,
        message: '批量导入数据库时发生错误',
        error: (err as Error).message,
      });
    }
  }

  /**
   * 清空指定类型数据
   */
  static async clearData(req: Request, res: Response) {
    const type = req.params.type as ImportType;
    const Model = MODEL_MAP[type];
    if (!Model) {
      res.status(400).json({ success: false, message: '不支持的清空类型' });
      return;
    }

    let result;
      result = await Model.deleteMany({});
      res.json({
        success: true,
        message: `已彻底删除${result.deletedCount ?? 0}条${type}数据`,
        deletedCount: result.deletedCount ?? 0,
      });
      return;
   
  }
}
