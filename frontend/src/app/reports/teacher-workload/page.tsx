/**
 * 教师工作量统计页面
 */

'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Construction } from 'lucide-react';

export default function TeacherWorkloadPage() {
  return (
    <div className="p-6">
      <Card className="max-w-2xl mx-auto">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 p-4 bg-orange-50 rounded-full w-fit">
            <Construction className="h-8 w-8 text-orange-500" />
          </div>
          <CardTitle className="text-2xl">教师工作量统计</CardTitle>
          <CardDescription>
            此功能正在开发中，敬请期待
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <p className="text-muted-foreground mb-4">
            教师工作量统计功能将包括课时分配、工作负荷分析等内容
          </p>
          <Button onClick={() => window.history.back()}>
            返回报表首页
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}