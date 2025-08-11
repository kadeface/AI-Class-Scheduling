/**
 * 智能排课系统后端入口文件
 * 
 * 这是Express.js应用的主入口点，负责：
 * - 初始化Express应用
 * - 连接MongoDB数据库
 * - 配置中间件
 * - 注册路由
 * - 启动HTTP服务器
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';

// 导入数据库配置和模型
import { connectDatabase } from './config/database';
import { initializeDefaultData } from './models';

// 导入路由
import { userRoutes } from './routes/user-routes';
import { teacherRoutes } from './routes/teacher-routes';
import { classRoutes } from './routes/class-routes';
import { courseRoutes } from './routes/course-routes';
import { roomRoutes } from './routes/room-routes';
import { default as teachingPlanRoutes } from './routes/teaching-plan-routes';
import { default as schedulingRulesRoutes } from './routes/scheduling-rules-routes';
import { default as schedulingRoutes } from './routes/scheduling-routes';
import { default as scheduleViewRoutes } from './routes/schedule-view-routes';
import { default as manualSchedulingRoutes } from './routes/manual-scheduling-routes';
import { default as scheduleRoutes } from './routes/schedule-routes';
import { default as importRoutes } from './routes/import-routes';
import statisticsRoutes from './routes/statistics-routes';
import gradeTemplateRoutes from './routes/grade-template-routes';

// 加载环境变量
dotenv.config();

const app = express();
const PORT = 3001; // 强制使用3001端口，避免与macOS AirTunes服务冲突

/**
 * 配置应用中间件
 * 
 * 设置安全、日志、跨域和JSON解析中间件
 */
function configureMiddleware(): void {
  // 安全中间件
  //app.use(helmet());
  
  // 跨域中间件
  app.use(cors({
    origin: true,
    credentials: true
  }));
  
  // 日志中间件
  if (process.env.NODE_ENV !== 'production') {
    app.use(morgan('dev'));
  }
  
  // 请求体解析中间件
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));
  
  // 处理OPTIONS预检请求
  // app.options('*', cors());
}

/**
 * 注册API路由
 * 
 * 将各个功能模块的路由注册到应用中
 */
function configureRoutes(): void {
  // 健康检查端点
  app.get('/api/health', (req, res) => {
    res.json({
      success: true,
      message: '智能排课系统API服务运行正常',
      timestamp: new Date().toISOString(),
      version: '1.0.0'
    });
  });
  
  // 根路径
  app.get('/', (req, res) => {
    res.json({
      success: true,
      message: '欢迎使用智能排课系统API',
      version: '1.0.0',
      docs: '/api/health'
    });
  });

  // 用户管理路由
   app.use('/api/users', userRoutes);
  
  // 教师管理路由
   app.use('/api/teachers', teacherRoutes);
  
  // 班级管理路由
   app.use('/api/classes', classRoutes);
  
  // 课程管理路由
   app.use('/api/courses', courseRoutes);
  
  // 场室管理路由
   app.use('/api/rooms', roomRoutes);
  
  // 教学计划路由
   app.use('/api/teaching-plans', teachingPlanRoutes);
  
  // 排课规则路由
   app.use('/api/scheduling-rules', schedulingRulesRoutes);
  
  // 智能排课路由
   app.use('/api/scheduling', schedulingRoutes);
  
  // 手动调课路由
   app.use('/api/manual-scheduling', manualSchedulingRoutes);
  
  // 课表查看路由
   app.use('/api/schedule-view', scheduleViewRoutes);
  
  // 课程安排管理路由
   app.use('/api/schedules', scheduleRoutes);

  // 导入路由
   app.use('/api', importRoutes);

  // 统计路由
   app.use('/api/statistics', statisticsRoutes);

  // 年级课程模板路由
   app.use('/api/grade-templates', gradeTemplateRoutes);
}

/**
 * 全局错误处理中间件
 * 
 * 捕获并处理应用中的所有错误
 */
function configureErrorHandling(): void {
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('❌ 服务器错误:', err);
    
    res.status(err.status || 500).json({
      success: false,
      message: process.env.NODE_ENV === 'production' 
        ? '服务器内部错误' 
        : err.message,
      error: process.env.NODE_ENV === 'production' ? undefined : err.stack
    });
  });
}

/**
 * 启动服务器
 * 
 * 初始化所有配置并启动HTTP服务器
 */
async function startServer(): Promise<void> {
  try {
    // 连接数据库
    await connectDatabase();
    
    // 初始化默认数据
    await initializeDefaultData();
    
    // 配置中间件
    configureMiddleware();
    
    // 配置路由
    configureRoutes();
    
    // 配置错误处理
    configureErrorHandling();
    
    // 启动服务器
    app.listen(PORT, () => {
      console.log(`🚀 智能排课系统API服务已启动`);
      console.log(`📍 服务地址: http://localhost:${PORT}`);
      console.log(`🌍 环境模式: ${process.env.NODE_ENV || 'development'}`);
      console.log(`📊 健康检查: http://localhost:${PORT}/api/health`);
    });
    
  } catch (error) {
    console.error('❌ 服务器启动失败:', error);
    process.exit(1);
  }
}

// 启动服务器
startServer();

export default app;