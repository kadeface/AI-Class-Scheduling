@echo off
echo 🚀 启动测试服务器...
echo.
echo 正在在 http://localhost:8080 启动HTTP服务器
echo 请在浏览器中访问: http://localhost:8080/test-api.html
echo.
echo 按 Ctrl+C 停止服务器
echo.

cd /d D:\cursor_project\AI-Class-Scheduling
python -m http.server 8080

pause