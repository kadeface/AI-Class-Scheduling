import express from 'express';
import { GradeTemplateController } from '../controllers/grade-template-controller';

const router = express.Router();
const gradeTemplateController = new GradeTemplateController();

/**
 * 年级课程模板路由
 * 
 * 提供年级课程模板的RESTful API接口
 */

// 获取模板列表
router.get('/', gradeTemplateController.getTemplates);

// 根据年级获取默认模板
router.get('/default/:grade', gradeTemplateController.getDefaultTemplateByGrade);

// 创建新模板
router.post('/', gradeTemplateController.createTemplate);

// 更新模板
router.put('/:id', gradeTemplateController.updateTemplate);

// 删除模板
router.delete('/:id', gradeTemplateController.deleteTemplate);

// 设置默认模板
router.patch('/:id/set-default', gradeTemplateController.setDefaultTemplate);

// 复制模板
router.post('/:id/copy', gradeTemplateController.copyTemplate);

export default router;
