import { Request, Response } from 'express';
import { GradeTemplate, IGradeTemplate } from '../models/GradeTemplate';

/**
 * 年级课程模板控制器
 * 
 * 提供年级课程模板的CRUD操作和智能推荐功能
 */
export class GradeTemplateController {
  /**
   * 获取年级课程模板列表
   * 
   * Args:
   *   req: Express请求对象
   *   res: Express响应对象
   * 
   * Returns:
   *   Promise<void>
   */
  async getTemplates(req: Request, res: Response): Promise<void> {
    try {
      const { grade, isActive, isDefault } = req.query;
      
      const filter: any = {};
      if (grade) filter.grade = grade;
      if (isActive !== undefined) filter.isActive = isActive === 'true';
      if (isDefault !== undefined) filter.isDefault = isDefault === 'true';
      
      const templates = await GradeTemplate.find(filter)
        .sort({ grade: 1, isDefault: -1, createdAt: -1 })
        .populate('createdBy', 'name');
      
      res.json({
        success: true,
        data: templates,
        message: '获取模板列表成功'
      });
    } catch (error) {
      console.error('获取模板列表失败:', error);
      res.status(500).json({
        success: false,
        error: '获取模板列表失败',
        message: error instanceof Error ? error.message : '未知错误'
      });
    }
  }

  /**
   * 根据年级获取默认模板
   * 
   * Args:
   *   req: Express请求对象，包含年级参数
   *   res: Express响应对象
   * 
   * Returns:
   *   Promise<void>
   */
  async getDefaultTemplateByGrade(req: Request, res: Response): Promise<void> {
    try {
      const { grade } = req.params;
      
      if (!grade) {
        res.status(400).json({
          success: false,
          error: '年级参数不能为空'
        });
        return;
      }
      
      const template = await GradeTemplate.findOne({ 
        grade, 
        isDefault: true, 
        isActive: true 
      });
      
      if (!template) {
        res.status(404).json({
          success: false,
          error: `未找到${grade}年级的默认模板`
        });
        return;
      }
      
      res.json({
        success: true,
        data: template,
        message: '获取默认模板成功'
      });
    } catch (error) {
      console.error('获取默认模板失败:', error);
      res.status(500).json({
        success: false,
        error: '获取默认模板失败',
        message: error instanceof Error ? error.message : '未知错误'
      });
    }
  }

  /**
   * 创建年级课程模板
   * 
   * Args:
   *   req: Express请求对象，包含模板数据
   *   res: Express响应对象
   * 
   * Returns:
   *   Promise<void>
   */
  async createTemplate(req: Request, res: Response): Promise<void> {
    try {
      const templateData = req.body;
      
      // 验证必填字段
      if (!templateData.grade || !templateData.name || !templateData.courses) {
        res.status(400).json({
          success: false,
          error: '年级、模板名称和课程配置为必填项'
        });
        return;
      }
      
      // 验证课程配置
      if (!Array.isArray(templateData.courses) || templateData.courses.length === 0) {
        res.status(400).json({
          success: false,
          error: '课程配置不能为空'
        });
        return;
      }
      
      // 设置创建者
      templateData.createdBy = 'system';
      
      const template = new GradeTemplate(templateData);
      await template.save();
      
      res.status(201).json({
        success: true,
        data: template,
        message: '创建模板成功'
      });
    } catch (error) {
      console.error('创建模板失败:', error);
      res.status(500).json({
        success: false,
        error: '创建模板失败',
        message: error instanceof Error ? error.message : '未知错误'
      });
    }
  }

  /**
   * 更新年级课程模板
   * 
   * Args:
   *   req: Express请求对象，包含模板ID和更新数据
   *   res: Express响应对象
   * 
   * Returns:
   *   Promise<void>
   */
  async updateTemplate(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const updateData = req.body;
      
      const template = await GradeTemplate.findById(id);
      if (!template) {
        res.status(404).json({
          success: false,
          error: '模板不存在'
        });
        return;
      }
      
      // 更新模板数据
      Object.assign(template, updateData);
      await template.save();
      
      res.json({
        success: true,
        data: template,
        message: '更新模板成功'
      });
    } catch (error) {
      console.error('更新模板失败:', error);
      res.status(500).json({
        success: false,
        error: '更新模板失败',
        message: error instanceof Error ? error.message : '未知错误'
      });
    }
  }

  /**
   * 删除年级课程模板
   * 
   * Args:
   *   req: Express请求对象，包含模板ID
   *   res: Express响应对象
   * 
   * Returns:
   *   Promise<void>
   */
  async deleteTemplate(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      
      const template = await GradeTemplate.findById(id);
      if (!template) {
        res.status(404).json({
          success: false,
          error: '模板不存在'
        });
        return;
      }
      
      // 检查是否为默认模板
      if (template.isDefault) {
        res.status(400).json({
          success: false,
          error: '不能删除默认模板'
        });
        return;
      }
      
      await GradeTemplate.findByIdAndDelete(id);
      
      res.json({
        success: true,
        message: '删除模板成功'
      });
    } catch (error) {
      console.error('删除模板失败:', error);
      res.status(500).json({
        success: false,
        error: '删除模板失败',
        message: error instanceof Error ? error.message : '未知错误'
      });
    }
  }

  /**
   * 设置默认模板
   * 
   * Args:
   *   req: Express请求对象，包含模板ID
   *   res: Express响应对象
   * 
   * Returns:
   *   Promise<void>
   */
  async setDefaultTemplate(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      
      const template = await GradeTemplate.findById(id);
      if (!template) {
        res.status(404).json({
          success: false,
          error: '模板不存在'
        });
        return;
      }
      
      // 设置为默认模板
      template.isDefault = true;
      await template.save();
      
      res.json({
        success: true,
        data: template,
        message: '设置默认模板成功'
      });
    } catch (error) {
      console.error('设置默认模板失败:', error);
      res.status(500).json({
        success: false,
        error: '设置默认模板失败',
        message: error instanceof Error ? error.message : '未知错误'
      });
    }
  }

  /**
   * 复制模板
   * 
   * Args:
   *   req: Express请求对象，包含模板ID和新名称
   *   res: Express响应对象
   * 
   * Returns:
   *   Promise<void>
   */
  async copyTemplate(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { newName, newGrade } = req.body;
      
      const sourceTemplate = await GradeTemplate.findById(id);
      if (!sourceTemplate) {
        res.status(404).json({
          success: false,
          error: '源模板不存在'
        });
        return;
      }
      
      // 创建新模板
      const newTemplate = new GradeTemplate({
        ...sourceTemplate.toObject(),
        _id: undefined,
        name: newName || `${sourceTemplate.name} - 副本`,
        grade: newGrade || sourceTemplate.grade,
        isDefault: false,
        createdBy: 'system'
      });
      
      await newTemplate.save();
      
      res.status(201).json({
        success: true,
        data: newTemplate,
        message: '复制模板成功'
      });
    } catch (error) {
      console.error('复制模板失败:', error);
      res.status(500).json({
        success: false,
        error: '复制模板失败',
        message: error instanceof Error ? error.message : '未知错误'
      });
    }
  }
}
