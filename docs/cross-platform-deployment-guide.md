# 跨平台部署指南：Windows 到 macOS

## 概述

本文档提供了从 Windows 系统迁移到 macOS 系统时的注意事项和解决方案，特别针对智能排课系统的部署。

## 1. 端口占用检查

### 1.1 检查端口占用命令

#### Windows
```cmd
# 检查特定端口占用
netstat -ano | findstr :5000

# 查看所有端口占用
netstat -ano

# 根据PID查看进程详情
tasklist | findstr <PID>
```

#### macOS/Linux
```bash
# 检查特定端口占用
lsof -i :5000

# 查看所有端口占用
lsof -i -P -n | grep LISTEN

# 根据PID查看进程详情
ps aux | grep <PID>
```

### 1.2 常见端口冲突

#### macOS 系统服务占用端口
- **5000**: AirTunes/AirPlay 服务
- **3000**: 通常被 Next.js 开发服务器使用
- **8080**: 可能被其他开发工具占用
- **27017**: MongoDB 默认端口

#### Windows 系统服务占用端口
- **80**: HTTP 服务
- **443**: HTTPS 服务
- **3306**: MySQL 默认端口
- **27017**: MongoDB 默认端口

## 2. 网络配置差异

### 2.1 本地回环地址

#### Windows
- `localhost` → `127.0.0.1`
- `::1` (IPv6) 可能不可用

#### macOS
- `localhost` → `127.0.0.1` 或 `::1`
- 优先使用 IPv6 (`::1`)

### 2.2 hosts 文件位置

#### Windows
```
C:\Windows\System32\drivers\etc\hosts
```

#### macOS
```
/etc/hosts
```

### 2.3 hosts 文件配置示例
```
# 标准配置
127.0.0.1   localhost
::1         localhost

# 避免自定义映射，防止网络解析问题
```

## 3. 文件系统差异

### 3.1 路径分隔符
- **Windows**: `\` (反斜杠)
- **macOS/Linux**: `/` (正斜杠)

### 3.2 文件名大小写
- **Windows**: 不区分大小写
- **macOS**: 区分大小写

### 3.3 文件权限
- **Windows**: 基于用户账户控制
- **macOS**: Unix 权限系统 (755, 644 等)

## 4. 环境变量配置

### 4.1 环境变量文件

#### Windows
```cmd
# 设置环境变量
set PORT=3001
set NODE_ENV=development
```

#### macOS
```bash
# 设置环境变量
export PORT=3001
export NODE_ENV=development
```

### 4.2 .env 文件配置
```env
# 数据库配置
MONGODB_URI=mongodb://127.0.0.1:27017/ai-class-scheduling

# 服务配置
PORT=3001
NODE_ENV=development

# 跨域配置
CORS_ORIGIN=http://127.0.0.1:3000
```

## 5. 依赖包兼容性

### 5.1 Node.js 版本
- 确保使用相同的 Node.js 版本
- 推荐使用 Node.js 18+ LTS

### 5.2 包管理器
```bash
# 重新安装依赖
rm -rf node_modules package-lock.json
npm install
```

### 5.3 二进制包问题
- **bcrypt**: 可能需要重新编译
- **node-gyp**: 需要安装构建工具

## 6. 数据库配置

### 6.1 MongoDB 连接
```javascript
// 推荐使用 127.0.0.1 而不是 localhost
const MONGODB_URI = 'mongodb://127.0.0.1:27017/ai-class-scheduling';
```

### 6.2 数据库权限
- 确保 MongoDB 服务正常运行
- 检查数据库用户权限

## 7. CORS 配置最佳实践

### 7.1 开发环境配置
```javascript
// 允许所有来源（仅开发环境）
app.use(cors({
  origin: true,
  credentials: true
}));
```

### 7.2 生产环境配置
```javascript
// 严格白名单
const allowedOrigins = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'https://yourdomain.com'
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));
```

## 8. 常见问题排查

### 8.1 端口被占用
```bash
# 1. 检查端口占用
lsof -i :5000

# 2. 杀死占用进程
kill -9 <PID>

# 3. 或者更换端口
PORT=3001 npm run dev
```

### 8.2 CORS 错误
```bash
# 1. 检查前端请求地址
# 2. 确认后端 CORS 配置
# 3. 使用 curl 测试
curl -H "Origin: http://localhost:3000" "http://localhost:3001/api/health" -v
```

### 8.3 数据库连接失败
```bash
# 1. 检查 MongoDB 服务状态
brew services list | grep mongodb

# 2. 重启 MongoDB 服务
brew services restart mongodb-community
```

## 9. 部署检查清单

### 9.1 迁移前检查
- [ ] 检查端口占用情况
- [ ] 确认网络配置
- [ ] 备份重要数据
- [ ] 记录当前配置

### 9.2 迁移后验证
- [ ] 后端服务正常启动
- [ ] 数据库连接正常
- [ ] 前端能正常访问后端
- [ ] CORS 配置正确
- [ ] 所有功能正常

### 9.3 性能优化
- [ ] 检查内存使用
- [ ] 监控 CPU 使用率
- [ ] 优化数据库查询
- [ ] 配置日志级别

## 10. 故障排除命令

### 10.1 网络诊断
```bash
# 测试网络连接
ping localhost
ping 127.0.0.1

# 测试端口连通性
telnet localhost 3001
nc -zv localhost 3001
```

### 10.2 进程管理
```bash
# 查看 Node.js 进程
ps aux | grep node

# 查看端口占用详情
netstat -an | grep LISTEN
```

### 10.3 日志查看
```bash
# 查看应用日志
tail -f logs/app.log

# 查看系统日志
tail -f /var/log/system.log
```

## 11. 安全注意事项

### 11.1 防火墙配置
- 确保开发端口不被外部访问
- 生产环境配置适当的防火墙规则

### 11.2 环境变量安全
- 不要在代码中硬编码敏感信息
- 使用环境变量管理配置

### 11.3 数据库安全
- 设置强密码
- 限制数据库访问权限
- 定期备份数据

## 12. 性能监控

### 12.1 系统监控
```bash
# 查看系统资源使用
top
htop

# 查看磁盘使用
df -h
du -sh *
```

### 12.2 应用监控
- 使用 PM2 管理 Node.js 进程
- 配置日志轮转
- 监控内存泄漏

---

## 总结

跨平台部署时，重点关注：
1. **端口占用检查** - 使用 `lsof` 或 `netstat` 命令
2. **网络配置差异** - 注意 localhost 解析差异
3. **文件系统差异** - 路径分隔符和大小写敏感
4. **依赖包兼容性** - 重新安装依赖包
5. **CORS 配置** - 确保跨域请求正常工作

遵循本指南可以避免大部分跨平台部署问题，确保应用在不同操作系统上正常运行。 