'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@radix-ui/react-select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { 
  BookOpen, 
  Calendar, 
  Clock, 
  Settings, 
  CheckCircle, 
  AlertCircle,
  Info,
  Save,
  RefreshCw,
  BarChart3
} from 'lucide-react';
import { 
  getCoreSubjectStrategy, 
  updateCoreSubjectStrategy, 
  validateCoreSubjectStrategy, 
  analyzeCoreSubjectDistribution, 
  schedulingRulesApi,
  DEFAULT_CORE_SUBJECT_STRATEGY,
  ICoreSubjectStrategy,
  SchedulingRules
} from '@/lib/api';

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  suggestions: string[];
}

interface DistributionAnalysis {
  currentDistribution: Record<string, number>;
  recommendations: string[];
  quality: 'excellent' | 'good' | 'fair' | 'poor';
}

export default function CoreSubjectStrategyPage() {
  const [strategy, setStrategy] = useState<ICoreSubjectStrategy>(DEFAULT_CORE_SUBJECT_STRATEGY);
  const [rulesId, setRulesId] = useState<string>(''); // 排课规则ID
  const [availableRules, setAvailableRules] = useState<SchedulingRules[]>([]); // 可用的排课规则
  const [availableSubjects, setAvailableSubjects] = useState<string[]>([
    '语文', '数学', '英语', '物理', '化学', '生物', '历史', '地理', '政治', '体育', '音乐', '美术'
  ]);
  const [newSubject, setNewSubject] = useState('');
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [analysis, setAnalysis] = useState<DistributionAnalysis | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  // 加载排课规则列表和策略配置
  useEffect(() => {
    loadAvailableRules();
  }, []);

  // 当选择的规则ID变化时，加载对应的策略配置
  useEffect(() => {
    if (rulesId) {
      loadStrategy();
    }
  }, [rulesId]);

  const loadAvailableRules = async () => {
    setIsLoading(true);
    try {
      const response = await schedulingRulesApi.getList({ limit: 100, isActive: true });
      if (response.success && response.data) {
        setAvailableRules(response.data.items);
        // 如果有规则，选择第一个作为默认
        if (response.data.items.length > 0) {
          setRulesId(response.data.items[0]._id);
        }
      }
    } catch (error) {
      console.error('加载排课规则失败:', error);
      setMessage({ type: 'error', text: '加载排课规则失败' });
    } finally {
      setIsLoading(false);
    }
  };

  const loadStrategy = async () => {
    if (!rulesId) return;
    
    setIsLoading(true);
    try {
      const response = await getCoreSubjectStrategy(rulesId);
      if (response.success && response.data) {
        setStrategy(response.data.coreSubjectStrategy || DEFAULT_CORE_SUBJECT_STRATEGY);
      }
    } catch (error) {
      console.error('加载策略配置失败:', error);
      setMessage({ type: 'error', text: '加载策略配置失败，使用默认配置' });
      // 使用默认配置
      setStrategy(DEFAULT_CORE_SUBJECT_STRATEGY);
    } finally {
      setIsLoading(false);
    }
  };

  const saveStrategy = async () => {
    if (!rulesId) {
      setMessage({ type: 'error', text: '请先选择排课规则' });
      return;
    }

    setIsLoading(true);
    try {
      const response = await updateCoreSubjectStrategy(rulesId, strategy);
      if (response.success) {
        setMessage({ type: 'success', text: '策略配置保存成功' });
      } else {
        setMessage({ type: 'error', text: response.error || '保存失败' });
      }
    } catch (error) {
      console.error('保存策略配置失败:', error);
      setMessage({ type: 'error', text: '保存策略配置失败' });
    } finally {
      setIsLoading(false);
    }
  };

  const validateStrategy = async () => {
    if (!rulesId) {
      setMessage({ type: 'error', text: '请先选择排课规则' });
      return;
    }

    setIsLoading(true);
    try {
      const response = await validateCoreSubjectStrategy(rulesId, strategy);
      if (response.success && response.data) {
        setValidationResult({
          isValid: response.data.isValid,
          errors: response.data.errors || [],
          suggestions: response.data.suggestions || []
        });
      } else {
        setMessage({ type: 'error', text: response.error || '验证失败' });
      }
    } catch (error) {
      console.error('验证策略配置失败:', error);
      setMessage({ type: 'error', text: '验证策略配置失败' });
    } finally {
      setIsLoading(false);
    }
  };

  const analyzeDistribution = async () => {
    if (!rulesId) {
      setMessage({ type: 'error', text: '请先选择排课规则' });
      return;
    }

    setIsLoading(true);
    try {
      const response = await analyzeCoreSubjectDistribution(rulesId);
      if (response.success && response.data) {
        setAnalysis({
          currentDistribution: response.data.currentDistribution || {},
          recommendations: response.data.recommendations || [],
          quality: (response.data.quality as 'excellent' | 'good' | 'fair' | 'poor') || 'fair'
        });
      } else {
        setMessage({ type: 'error', text: response.error || '分析失败' });
      }
    } catch (error) {
      console.error('分析分布情况失败:', error);
      setMessage({ type: 'error', text: '分析分布情况失败' });
    } finally {
      setIsLoading(false);
    }
  };

  const addSubject = () => {
    if (newSubject && !strategy.coreSubjects.includes(newSubject)) {
      setStrategy(prev => ({
        ...prev,
        coreSubjects: [...prev.coreSubjects, newSubject]
      }));
      setNewSubject('');
    }
  };

  const removeSubject = (subject: string) => {
    setStrategy(prev => ({
      ...prev,
      coreSubjects: prev.coreSubjects.filter(s => s !== subject)
    }));
  };

  const getQualityColor = (quality: string) => {
    switch (quality) {
      case 'excellent': return 'bg-green-100 text-green-800';
      case 'good': return 'bg-blue-100 text-blue-800';
      case 'fair': return 'bg-yellow-100 text-yellow-800';
      case 'poor': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getQualityText = (quality: string) => {
    switch (quality) {
      case 'excellent': return '优秀';
      case 'good': return '良好';
      case 'fair': return '一般';
      case 'poor': return '较差';
      default: return '未知';
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center space-x-3">
        <BookOpen className="h-8 w-8 text-blue-600" />
        <div>
          <h1 className="text-3xl font-bold text-gray-900">核心课程策略管理</h1>
          <p className="text-gray-600">配置核心课程的分布策略，确保课程均匀分布在一周内</p>
        </div>
      </div>

      {/* 排课规则选择器 */}
      <div className="flex flex-col sm:flex-row items-center justify-between space-y-3 sm:space-y-0 sm:space-x-3">
        <div className="w-full sm:w-auto">
          <Label htmlFor="rules-select" className="text-base">选择排课规则</Label>
          <Select
            value={rulesId}
            onValueChange={(value) => setRulesId(value)}
            disabled={isLoading}
          >
            <SelectTrigger id="rules-select" className="w-full sm:w-[180px]">
              <SelectValue placeholder="选择排课规则" />
            </SelectTrigger>
            <SelectContent>
              {availableRules.map((rule) => (
                <SelectItem key={rule._id} value={rule._id}>
                  {rule.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={loadAvailableRules} disabled={isLoading} className="w-full sm:w-auto">
          <RefreshCw className="h-4 w-4 mr-2" />
          刷新规则
        </Button>
      </div>

      {/* 消息提示 */}
      {message && (
        <Alert className={message.type === 'success' ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
          {message.type === 'success' ? (
            <CheckCircle className="h-4 w-4 text-green-600" />
          ) : (
            <AlertCircle className="h-4 w-4 text-red-600" />
          )}
          <AlertDescription className={message.type === 'success' ? 'text-green-800' : 'text-red-800'}>
            {message.text}
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="config" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="config" className="flex items-center space-x-2">
            <Settings className="h-4 w-4" />
            <span>策略配置</span>
          </TabsTrigger>
          <TabsTrigger value="validation" className="flex items-center space-x-2">
            <CheckCircle className="h-4 w-4" />
            <span>配置验证</span>
          </TabsTrigger>
          <TabsTrigger value="analysis" className="flex items-center space-x-2">
            <BarChart3 className="h-4 w-4" />
            <span>分布分析</span>
          </TabsTrigger>
          <TabsTrigger value="preview" className="flex items-center space-x-2">
            <Calendar className="h-4 w-4" />
            <span>效果预览</span>
          </TabsTrigger>
        </TabsList>

        {/* 策略配置标签页 */}
        <TabsContent value="config" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Settings className="h-5 w-5" />
                <span>基本设置</span>
              </CardTitle>
              <CardDescription>配置核心课程策略的基本参数</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* 启用开关 */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">启用核心课程策略</Label>
                  <p className="text-sm text-gray-500">启用后将按照策略要求安排核心课程</p>
                </div>
                <Switch
                  checked={strategy.enableCoreSubjectStrategy}
                  onCheckedChange={(checked) => setStrategy(prev => ({ ...prev, enableCoreSubjectStrategy: checked }))}
                />
              </div>

              <Separator />

              {/* 核心课程列表 */}
              <div className="space-y-4">
                <div>
                  <Label className="text-base">核心课程列表</Label>
                  <p className="text-sm text-gray-500">选择需要特殊安排的核心课程</p>
                </div>
                
                <div className="flex space-x-2">
                  <Input
                    placeholder="输入课程名称"
                    value={newSubject}
                    onChange={(e) => setNewSubject(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addSubject()}
                  />
                  <Button onClick={addSubject} disabled={!newSubject}>添加</Button>
                </div>

                <div className="flex flex-wrap gap-2">
                  {strategy.coreSubjects.map((subject, index) => (
                    <Badge key={index} variant="secondary" className="px-3 py-1">
                      {subject}
                      <button
                        onClick={() => removeSubject(subject)}
                        className="ml-2 text-gray-500 hover:text-red-500"
                      >
                        ×
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>

              <Separator />

              {/* 分布模式 */}
              <div className="space-y-4">
                <div>
                  <Label className="text-base">分布模式</Label>
                  <p className="text-sm text-gray-500">选择核心课程的分布策略</p>
                </div>
                
                <Select
                  value={strategy.distributionMode}
                  onValueChange={(value) => 
                    setStrategy(prev => ({ ...prev, distributionMode: value as 'daily' | 'balanced' | 'concentrated' }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">
                      <div className="flex items-center space-x-2">
                        <Calendar className="h-4 w-4" />
                        <span>每日分布（推荐）</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="balanced">
                      <div className="flex items-center space-x-2">
                        <BarChart3 className="h-4 w-4" />
                        <span>平衡分布</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="concentrated">
                      <div className="flex items-center space-x-2">
                        <Clock className="h-4 w-4" />
                        <span>集中分布</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>每日最大出现次数</Label>
                    <Input
                      type="number"
                      min="1"
                      max="5"
                      value={strategy.maxDailyOccurrences}
                      onChange={(e) => setStrategy(prev => ({ 
                        ...prev, 
                        maxDailyOccurrences: parseInt(e.target.value) || 1 
                      }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>每周最少出现天数</Label>
                    <Input
                      type="number"
                      min="1"
                      max="7"
                      value={strategy.minDaysPerWeek}
                      onChange={(e) => setStrategy(prev => ({ 
                        ...prev, 
                        minDaysPerWeek: parseInt(e.target.value) || 1 
                      }))}
                    />
                  </div>
                </div>
              </div>

              <Separator />

              {/* 高级设置 */}
              <div className="space-y-4">
                <div>
                  <Label className="text-base">高级设置</Label>
                  <p className="text-sm text-gray-500">配置更详细的策略参数</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={strategy.avoidConsecutiveDays}
                      onCheckedChange={(checked) => setStrategy(prev => ({ ...prev, avoidConsecutiveDays: checked }))}
                    />
                    <Label>避免连续天安排</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={strategy.enforceEvenDistribution}
                      onCheckedChange={(checked) => setStrategy(prev => ({ ...prev, enforceEvenDistribution: checked }))}
                    />
                    <Label>强制均匀分布</Label>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>最大集中度（连续天数）</Label>
                    <Input
                      type="number"
                      min="1"
                      max="5"
                      value={strategy.maxConcentration}
                      onChange={(e) => setStrategy(prev => ({ 
                        ...prev, 
                        maxConcentration: parseInt(e.target.value) || 1 
                      }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>平衡权重 (0-100)</Label>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      value={strategy.balanceWeight}
                      onChange={(e) => setStrategy(prev => ({ 
                        ...prev, 
                        balanceWeight: parseInt(e.target.value) || 0 
                      }))}
                    />
                  </div>
                </div>
              </div>

              {/* 操作按钮 */}
              <div className="flex justify-end space-x-3 pt-4">
                <Button variant="outline" onClick={loadStrategy} disabled={isLoading}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  重置
                </Button>
                <Button onClick={saveStrategy} disabled={isLoading}>
                  <Save className="h-4 w-4 mr-2" />
                  {isLoading ? '保存中...' : '保存配置'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 配置验证标签页 */}
        <TabsContent value="validation" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <CheckCircle className="h-5 w-5" />
                <span>配置验证</span>
              </CardTitle>
              <CardDescription>验证当前策略配置的合理性和有效性</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <Button onClick={validateStrategy} disabled={isLoading} className="w-full">
                <CheckCircle className="h-4 w-4 mr-2" />
                {isLoading ? '验证中...' : '验证配置'}
              </Button>

              {validationResult && (
                <div className="space-y-4">
                  <div className={`p-4 rounded-lg border ${
                    validationResult.isValid 
                      ? 'border-green-200 bg-green-50' 
                      : 'border-red-200 bg-red-50'
                  }`}>
                    <div className="flex items-center space-x-2">
                      {validationResult.isValid ? (
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      ) : (
                        <AlertCircle className="h-5 w-5 text-red-600" />
                      )}
                      <span className={`font-medium ${
                        validationResult.isValid ? 'text-green-800' : 'text-red-800'
                      }`}>
                        {validationResult.isValid ? '配置验证通过' : '配置验证失败'}
                      </span>
                    </div>
                  </div>

                  {validationResult.errors.length > 0 && (
                    <div className="space-y-2">
                      <Label className="text-red-600">发现的问题：</Label>
                      <ul className="list-disc list-inside space-y-1 text-sm text-red-600">
                        {validationResult.errors.map((error, index) => (
                          <li key={index}>{error}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {validationResult.suggestions.length > 0 && (
                    <div className="space-y-2">
                      <Label className="text-blue-600">优化建议：</Label>
                      <ul className="list-disc list-inside space-y-1 text-sm text-blue-600">
                        {validationResult.suggestions.map((suggestion, index) => (
                          <li key={index}>{suggestion}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 分布分析标签页 */}
        <TabsContent value="analysis" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <BarChart3 className="h-5 w-5" />
                <span>分布分析</span>
              </CardTitle>
              <CardDescription>分析当前核心课程的分布情况和质量评估</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <Button onClick={analyzeDistribution} disabled={isLoading} className="w-full">
                <BarChart3 className="h-4 w-4 mr-2" />
                {isLoading ? '分析中...' : '分析分布情况'}
              </Button>

              {analysis && (
                <div className="space-y-6">
                  {/* 质量评估 */}
                  <div className="space-y-3">
                    <Label>分布质量评估</Label>
                    <div className="flex items-center space-x-3">
                      <Badge className={`px-3 py-1 text-sm ${getQualityColor(analysis.quality)}`}>
                        {getQualityText(analysis.quality)}
                      </Badge>
                      <span className="text-sm text-gray-600">
                        基于当前策略配置的分布质量
                      </span>
                    </div>
                  </div>

                  {/* 当前分布 */}
                  <div className="space-y-3">
                    <Label>当前分布情况</Label>
                    <div className="grid grid-cols-5 gap-2">
                      {Object.entries(analysis.currentDistribution).map(([day, count]) => (
                        <div key={day} className="text-center p-3 border rounded-lg">
                          <div className="font-medium text-gray-900">{day}</div>
                          <div className="text-2xl font-bold text-blue-600">{count}</div>
                          <div className="text-xs text-gray-500">门课程</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 优化建议 */}
                  <div className="space-y-3">
                    <Label>优化建议</Label>
                    <ul className="list-disc list-inside space-y-2 text-sm text-gray-700">
                      {analysis.recommendations.map((recommendation, index) => (
                        <li key={index}>{recommendation}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 效果预览标签页 */}
        <TabsContent value="preview" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Calendar className="h-5 w-5" />
                <span>效果预览</span>
              </CardTitle>
              <CardDescription>预览核心课程策略的预期效果</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center space-x-2 text-blue-800">
                    <Info className="h-5 w-5" />
                    <span className="font-medium">策略效果说明</span>
                  </div>
                  <p className="text-sm text-blue-700 mt-2">
                    基于当前配置，核心课程将按照以下策略进行安排：
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <Label className="text-sm font-medium text-gray-700">分布模式</Label>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <span className="font-medium">
                        {strategy.distributionMode === 'daily' && '每日分布'}
                        {strategy.distributionMode === 'balanced' && '平衡分布'}
                        {strategy.distributionMode === 'concentrated' && '集中分布'}
                      </span>
                      <p className="text-sm text-gray-600 mt-1">
                        {strategy.distributionMode === 'daily' && '核心课程将尽可能每天都有安排'}
                        {strategy.distributionMode === 'balanced' && '核心课程将在周内平衡分布'}
                        {strategy.distributionMode === 'concentrated' && '核心课程将集中在特定时间段'}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Label className="text-sm font-medium text-gray-700">约束条件</Label>
                    <div className="p-3 bg-gray-50 rounded-lg space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>每日最多：</span>
                        <span className="font-medium">{strategy.maxDailyOccurrences} 门</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>每周最少：</span>
                        <span className="font-medium">{strategy.minDaysPerWeek} 天</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>避免连续：</span>
                        <span className="font-medium">{strategy.avoidConsecutiveDays ? '是' : '否'}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <Label className="text-sm font-medium text-gray-700">预期效果</Label>
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                    <ul className="list-disc list-inside space-y-1 text-sm text-green-800">
                      <li>核心课程将均匀分布在一周内，避免集中在某一天</li>
                      <li>每天的核心课程数量将控制在合理范围内</li>
                      <li>学生将有更好的学习体验和知识吸收效果</li>
                      <li>教师的工作量将更加均衡和合理</li>
                    </ul>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
