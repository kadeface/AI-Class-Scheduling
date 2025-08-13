/**
 * 排课控制器
 * 
 * 处理排课相关的HTTP请求，提供排课API接口
 */

import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { 
  SchedulingService, 
  SchedulingRequest,
  ProgressCallback,
  SchedulingUtils
} from '../services/scheduling';

/**
 * 排课任务状态
 */
interface SchedulingTask {
  id: string;
  status: 'running' | 'completed' | 'failed';
  progress: {
    stage: string;
    percentage: number;
    message: string;
    assignedCount: number;
    totalCount: number;
  };
  result?: any;
  error?: string;
  startTime: Date;
  endTime?: Date;
}

/**
 * 排课控制器类
 * 
 * 提供排课相关的API端点
 */
export class SchedulingController {
  private static schedulingTasks = new Map<string, SchedulingTask>();
  private static schedulingService = new SchedulingService();

  /**
   * 启动排课任务
   * 
   * POST /api/scheduling/start
   * 
   * Args:
   *   req: 请求对象
   *   res: 响应对象
   * 
   * Returns:
   *   void
   */
  static async startScheduling(req: Request, res: Response): Promise<void> {
    try {
      console.log('🔍 后端接收到的请求体:', JSON.stringify(req.body, null, 2));
      
      const {
        academicYear,        // 学年 (如: "2024-2025")
        semester,            // 学期 (1 或 2)
        classIds,            // 指定班级ID数组 (可选)
        rulesId,             // 排课规则ID (可选)
        algorithmConfig,     // 算法配置参数 (可选)
        preserveExisting = false  // 是否保留现有排课 (默认false)
      } = req.body;

      console.log('🔍 排课规则参数检查:');
      console.log('   rulesId原始值:', rulesId);
      console.log('   rulesId类型:', typeof rulesId);
      console.log('   rulesId是否为空:', !rulesId);
      console.log('   rulesId是否为有效ObjectId:', rulesId ? mongoose.Types.ObjectId.isValid(rulesId) : 'N/A');

      // 验证必需参数
      if (!academicYear || !semester) {
        console.error('❌ 参数验证失败: 学年或学期为空');
        console.error('   academicYear:', academicYear);
        console.error('   semester:', semester);
        res.status(400).json({
          success: false,
          error: '学年和学期不能为空'
        });
        return;
      }

      // 验证排课规则ID格式（如果提供）
      if (rulesId && !mongoose.Types.ObjectId.isValid(rulesId)) {
        console.error('❌ 排课规则ID格式无效:', rulesId);
        res.status(400).json({
          success: false,
          error: `无效的排课规则ID格式: ${rulesId}`
        });
        return;
      }

      // 生成任务ID
      const taskId = new mongoose.Types.ObjectId().toString();
      console.log('✅ 生成任务ID:', taskId);

      // 构建排课请求
      const request: SchedulingRequest = {
        academicYear,
        semester,
        classIds: classIds ? classIds.map((id: string) => new mongoose.Types.ObjectId(id)) : undefined,
        rulesId: rulesId ? new mongoose.Types.ObjectId(rulesId) : undefined,
        algorithmConfig,
        preserveExisting
      };

      console.log('🔍 构建的排课请求:');
      console.log('   rulesId转换后:', request.rulesId);
      console.log('   rulesId类型:', typeof request.rulesId);
      console.log('   rulesId是否为ObjectId:', request.rulesId instanceof mongoose.Types.ObjectId);
      console.log('   完整请求对象:', JSON.stringify(request, null, 2));

      // 创建任务状态
      const task: SchedulingTask = {
        id: taskId,
        status: 'running',
        progress: {
          stage: '初始化',
          percentage: 0,
          message: '正在启动排课任务...',
          assignedCount: 0,
          totalCount: 0
        },
        startTime: new Date()
      };

      SchedulingController.schedulingTasks.set(taskId, task);
      console.log('✅ 任务状态已创建并存储');

      // 创建进度回调
      const progressCallback: ProgressCallback = (progress) => {
        task.progress = progress;
        console.log(`📊 排课进度更新: ${progress.stage} - ${progress.percentage}% - ${progress.message}`);
      };

      console.log('🚀 开始异步执行排课任务...');
      
      // 异步执行排课
      SchedulingController.schedulingService.executeScheduling(request, progressCallback)
        .then(result => {
          console.log('✅ 排课任务执行成功');
          console.log('   结果:', JSON.stringify(result, null, 2));
          task.status = 'completed';
          task.result = result;
          task.endTime = new Date();
        })
        .catch(error => {
          console.error('❌ 排课任务执行失败:', error);
          task.status = 'failed';
          task.error = error.message;
          task.endTime = new Date();
        });

      console.log('📤 返回任务启动响应');
      res.json({
        success: true,
        data: {
          taskId,
          message: '排课任务已启动',
          rulesInfo: {
            rulesId: rulesId || '使用默认规则',
            rulesType: rulesId ? '指定规则' : '默认规则'
          }
        }
      });

    } catch (error) {
      console.error('❌ 启动排课任务失败:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : '未知错误'
      });
    }
  }

  /**
   * 查询排课任务状态
   * 
   * GET /api/scheduling/tasks/:taskId
   * 
   * Args:
   *   req: 请求对象
   *   res: 响应对象
   * 
   * Returns:
   *   void
   */
  static async getTaskStatus(req: Request, res: Response): Promise<void> {
    try {
      const { taskId } = req.params;

      const task = SchedulingController.schedulingTasks.get(taskId);

      if (!task) {
        res.status(404).json({
          success: false,
          error: '找不到指定的排课任务'
        });
        return;
      }

      res.json({
        success: true,
        data: task
      });

    } catch (error) {
      console.error('查询任务状态失败:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : '未知错误'
      });
    }
  }

  /**
   * 获取所有排课任务
   * 
   * GET /api/scheduling/tasks
   * 
   * Args:
   *   req: 请求对象
   *   res: 响应对象
   * 
   * Returns:
   *   void
   */
  static async getAllTasks(req: Request, res: Response): Promise<void> {
    try {
      const tasks = Array.from(SchedulingController.schedulingTasks.values());
      
      // 按开始时间倒序排列
      tasks.sort((a, b) => b.startTime.getTime() - a.startTime.getTime());

      res.json({
        success: true,
        data: tasks
      });

    } catch (error) {
      console.error('获取任务列表失败:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : '未知错误'
      });
    }
  }

  /**
   * 停止排课任务
   * 
   * POST /api/scheduling/tasks/:taskId/stop
   * 
   * Args:
   *   req: 请求对象
   *   res: 响应对象
   * 
   * Returns:
   *   void
   */
  static async stopTask(req: Request, res: Response): Promise<void> {
    try {
      const { taskId } = req.params;

      const task = SchedulingController.schedulingTasks.get(taskId);

      if (!task) {
        res.status(404).json({
          success: false,
          error: '找不到指定的排课任务'
        });
        return;
      }

      if (task.status !== 'running') {
        res.status(400).json({
          success: false,
          error: '任务不在运行状态，无法停止'
        });
        return;
      }

      // 标记任务为已停止
      task.status = 'failed';
      task.error = '任务被用户手动停止';
      task.endTime = new Date();

      res.json({
        success: true,
        message: '任务已停止'
      });

    } catch (error) {
      console.error('停止任务失败:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : '未知错误'
      });
    }
  }

  /**
   * 删除排课任务记录
   * 
   * DELETE /api/scheduling/tasks/:taskId
   * 
   * Args:
   *   req: 请求对象
   *   res: 响应对象
   * 
   * Returns:
   *   void
   */
  static async deleteTask(req: Request, res: Response): Promise<void> {
    try {
      const { taskId } = req.params;

      const task = SchedulingController.schedulingTasks.get(taskId);

      if (!task) {
        res.status(404).json({
          success: false,
          error: '找不到指定的排课任务'
        });
        return;
      }

      if (task.status === 'running') {
        res.status(400).json({
          success: false,
          error: '不能删除正在运行的任务，请先停止任务'
        });
        return;
      }

      SchedulingController.schedulingTasks.delete(taskId);

      res.json({
        success: true,
        message: '任务记录已删除'
      });

    } catch (error) {
      console.error('删除任务失败:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : '未知错误'
      });
    }
  }

  /**
   * 验证现有排课
   * 
   * POST /api/scheduling/validate
   * 
   * Args:
   *   req: 请求对象
   *   res: 响应对象
   * 
   * Returns:
   *   void
   */
  static async validateSchedule(req: Request, res: Response): Promise<void> {
    try {
      const { academicYear, semester, classIds } = req.body;

      if (!academicYear || !semester) {
        res.status(400).json({
          success: false,
          error: '学年和学期不能为空'
        });
        return;
      }

      const classIdsArray = classIds ? 
        classIds.map((id: string) => new mongoose.Types.ObjectId(id)) : 
        undefined;

      const result = await SchedulingController.schedulingService.validateSchedule(
        academicYear,
        semester,
        classIdsArray
      );

      res.json({
        success: true,
        data: result
      });

    } catch (error) {
      console.error('验证排课失败:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : '未知错误'
      });
    }
  }

  /**
   * 获取排课统计信息
   * 
   * GET /api/scheduling/statistics
   * 
   * Args:
   *   req: 请求对象
   *   res: 响应对象
   * 
   * Returns:
   *   void
   */
  static async getStatistics(req: Request, res: Response): Promise<void> {
    try {
      const { academicYear, semester } = req.query;

      if (!academicYear || !semester) {
        res.status(400).json({
          success: false,
          error: '学年和学期参数不能为空'
        });
        return;
      }

      const statistics = await SchedulingController.schedulingService.getSchedulingStatistics(
        academicYear as string,
        parseInt(semester as string)
      );

      res.json({
        success: true,
        data: statistics
      });

    } catch (error) {
      console.error('获取排课统计失败:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : '未知错误'
      });
    }
  }

  /**
   * 清理已完成的任务
   * 
   * POST /api/scheduling/cleanup
   * 
   * Args:
   *   req: 请求对象
   *   res: 响应对象
   * 
   * Returns:
   *   void
   */
  static async cleanupTasks(req: Request, res: Response): Promise<void> {
    try {
      const { olderThanHours = 24 } = req.body;
      
      const cutoffTime = new Date(Date.now() - olderThanHours * 60 * 60 * 1000);
      let cleanedCount = 0;

      for (const [taskId, task] of SchedulingController.schedulingTasks) {
        if (task.status !== 'running' && task.startTime < cutoffTime) {
          SchedulingController.schedulingTasks.delete(taskId);
          cleanedCount++;
        }
      }

      res.json({
        success: true,
        data: {
          cleanedCount,
          message: `已清理 ${cleanedCount} 个过期任务记录`
        }
      });

    } catch (error) {
      console.error('清理任务失败:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : '未知错误'
      });
    }
  }

  /**
   * 获取排课配置预设
   * 
   * GET /api/scheduling/presets
   * 
   * Args:
   *   req: 请求对象
   *   res: 响应对象
   * 
   * Returns:
   *   void
   */
  static async getConfigPresets(req: Request, res: Response): Promise<void> {
    try {
      const presets = {
        fast: {
          name: '快速排课',
          description: '适用于简单排课场景，执行速度快',
          config: {
            maxIterations: 5000,
            timeLimit: 120,
            enableLocalOptimization: false
          }
        },
        balanced: {
          name: '均衡排课',
          description: '平衡排课质量和执行时间',
          config: {
            maxIterations: 10000,
            timeLimit: 300,
            enableLocalOptimization: true,
            localOptimizationIterations: 50
          }
        },
        thorough: {
          name: '精细排课',
          description: '追求最高排课质量，执行时间较长',
          config: {
            maxIterations: 20000,
            timeLimit: 600,
            enableLocalOptimization: true,
            localOptimizationIterations: 200
          }
        }
      };

      res.json({
        success: true,
        data: presets
      });

    } catch (error) {
      console.error('获取配置预设失败:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : '未知错误'
      });
    }
  }
}