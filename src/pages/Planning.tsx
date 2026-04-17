import { useState, useEffect, useCallback, useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import { getHoldings, Holding, HoldingType } from '../lib/api';

// Types
interface Goal {
  id: string;
  name: string;
  targetAmount: number;
  targetDate: string;
  initialInvestment: number;
  monthlyContribution: number;
  riskLevel: number; // 1-5
  linkedHoldings: number[];
  createdAt: string;
  version: number;
  isActive: boolean;
}

interface AllocationTarget {
  assetClass: HoldingType;
  targetPercent: number;
}

interface PlanVersion {
  id: string;
  goalId: string;
  version: number;
  snapshot: Goal;
  createdAt: string;
}

interface RebalanceAlert {
  assetClass: HoldingType;
  currentPercent: number;
  targetPercent: number;
  drift: number;
  suggestedTrade: string;
  suggestedAmount: number;
}

const HOLDING_TYPE_LABELS: Record<HoldingType, string> = {
  stock: '股票',
  fund: '基金',
  bond: '债券',
  bank_financial: '银行理财',
  precious_metal: '贵金属',
  other: '其他',
};

const HOLDING_TYPE_COLORS: Record<HoldingType, string> = {
  stock: '#4f46e5',
  fund: '#4f46e5',
  bond: '#10b981',
  bank_financial: '#8b5cf6',
  precious_metal: '#f97316',
  other: '#6b7280',
};

// Risk level to allocation mapping
const RISK_ALLOCATION: Record<number, AllocationTarget[]> = {
  1: [
    { assetClass: 'bond', targetPercent: 50 },
    { assetClass: 'bank_financial', targetPercent: 30 },
    { assetClass: 'fund', targetPercent: 15 },
    { assetClass: 'stock', targetPercent: 5 },
  ],
  2: [
    { assetClass: 'bond', targetPercent: 40 },
    { assetClass: 'bank_financial', targetPercent: 25 },
    { assetClass: 'fund', targetPercent: 20 },
    { assetClass: 'stock', targetPercent: 15 },
  ],
  3: [
    { assetClass: 'stock', targetPercent: 35 },
    { assetClass: 'fund', targetPercent: 25 },
    { assetClass: 'bond', targetPercent: 25 },
    { assetClass: 'bank_financial', targetPercent: 10 },
    { assetClass: 'precious_metal', targetPercent: 5 },
  ],
  4: [
    { assetClass: 'stock', targetPercent: 50 },
    { assetClass: 'fund', targetPercent: 25 },
    { assetClass: 'bond', targetPercent: 15 },
    { assetClass: 'precious_metal', targetPercent: 10 },
  ],
  5: [
    { assetClass: 'stock', targetPercent: 60 },
    { assetClass: 'fund', targetPercent: 25 },
    { assetClass: 'precious_metal', targetPercent: 10 },
    { assetClass: 'bond', targetPercent: 5 },
  ],
};

const RISK_LABELS: Record<number, string> = {
  1: '保守型',
  2: '稳健型',
  3: '平衡型',
  4: '成长型',
  5: '激进型',
};

function cn(...classes: (string | boolean | undefined | null)[]) {
  return classes.filter(Boolean).join(' ');
}

// Calculate required annual return to reach goal
function calcRequiredReturn(
  targetAmount: number,
  currentAmount: number,
  monthlyContribution: number,
  monthsRemaining: number
): number {
  if (currentAmount <= 0 && monthlyContribution <= 0) return 0;
  if (monthsRemaining <= 0) return 0;

  const n = monthsRemaining;

  if (currentAmount <= 0) {
    let guess = 0.08;
    for (let i = 0; i < 100; i++) {
      const fv = monthlyContribution * ((Math.pow(1 + guess / 12, n) - 1) / (guess / 12));
      if (Math.abs(fv - targetAmount) < 1) break;
    }
    return guess * 100;
  }

  // Use logarithmic approach for estimation
  const totalContrib = monthlyContribution * n;
  const futureValueOfContrib =
    monthlyContribution * ((Math.pow(1 + 0.08 / 12, n) - 1) / (0.08 / 12));
  const remaining = targetAmount - currentAmount - futureValueOfContrib;

  if (remaining <= 0) return 0;

  // Simple annual return estimation
  const years = n / 12;
  const expectedReturn =
    Math.pow(targetAmount / (currentAmount + totalContrib * 0.5), 1 / years) - 1;
  return Math.max(0, expectedReturn * 100);
}

// Monte Carlo simulation for probability of success
function calcProbabilityOfSuccess(
  targetAmount: number,
  currentAmount: number,
  monthlyContribution: number,
  monthsRemaining: number,
  riskLevel: number
): number {
  const _years = monthsRemaining / 12;
  void _years;
  const simulations = 1000;

  // Expected return and volatility based on risk level
  const expectedReturns: Record<number, [number, number]> = {
    1: [0.04, 0.05],
    2: [0.06, 0.08],
    3: [0.08, 0.12],
    4: [0.1, 0.18],
    5: [0.12, 0.25],
  };

  const [expectedReturn, volatility] = expectedReturns[riskLevel];
  let successes = 0;

  for (let i = 0; i < simulations; i++) {
    let value = currentAmount;
    const monthlyReturn = expectedReturn / 12;
    const monthlyVol = volatility / Math.sqrt(12);

    for (let m = 0; m < monthsRemaining; m++) {
      const randomReturn = monthlyReturn + monthlyVol * (Math.random() * 2 - 1) * Math.sqrt(3);
      value = value * (1 + randomReturn) + monthlyContribution;
    }

    if (value >= targetAmount) {
      successes++;
    }
  }

  return (successes / simulations) * 100;
}

export default function Planning() {
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [planVersions, setPlanVersions] = useState<PlanVersion[]>([]);
  const [activeTab, setActiveTab] = useState<'goals' | 'rebalance'>('goals');
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
  const [rebalanceThreshold, setRebalanceThreshold] = useState(5); // 5% default

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    targetAmount: 100000,
    targetDate: '',
    initialInvestment: 0,
    monthlyContribution: 1000,
    riskLevel: 3,
    linkedHoldings: [] as number[],
  });

  // Local storage for persistence
  useEffect(() => {
    const savedGoals = localStorage.getItem('planning_goals');
    if (savedGoals) {
      setGoals(JSON.parse(savedGoals));
    }
    const savedVersions = localStorage.getItem('planning_versions');
    if (savedVersions) {
      setPlanVersions(JSON.parse(savedVersions));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('planning_goals', JSON.stringify(goals));
  }, [goals]);

  useEffect(() => {
    localStorage.setItem('planning_versions', JSON.stringify(planVersions));
  }, [planVersions]);

  const loadHoldings = useCallback(async () => {
    try {
      const h = await getHoldings({ includeArchived: false });
      setHoldings(h.filter((x) => !x.is_archived));
    } catch (e) {
      console.error('Failed to load holdings', e);
    }
  }, []);

  useEffect(() => {
    loadHoldings();
  }, [loadHoldings]);

  // Calculate current allocation from holdings
  const currentAllocation = useMemo(() => {
    const totalValue = holdings.reduce((sum, h) => sum + h.current_value, 0);
    if (totalValue === 0) return [];

    const map: Record<HoldingType, number> = {} as Record<HoldingType, number>;
    for (const h of holdings) {
      map[h.holding_type] = (map[h.holding_type] || 0) + h.current_value;
    }

    return Object.entries(map)
      .filter(([, v]) => v > 0)
      .map(([type, value]) => ({
        assetClass: type as HoldingType,
        currentPercent: (value / totalValue) * 100,
        currentValue: value,
        targetPercent: 0,
      }));
  }, [holdings]);

  // Calculate rebalance alerts
  const rebalanceAlerts = useMemo((): RebalanceAlert[] => {
    const totalValue = holdings.reduce((sum, h) => sum + h.current_value, 0);
    if (totalValue === 0) return [];

    const suggestedAllocation = RISK_ALLOCATION[3]; // Default to balanced
    const alerts: RebalanceAlert[] = [];

    for (const target of suggestedAllocation) {
      const current = currentAllocation.find((c) => c.assetClass === target.assetClass);
      const currentPercent = current?.currentPercent || 0;
      const drift = currentPercent - target.targetPercent;

      if (Math.abs(drift) >= rebalanceThreshold) {
        const currentValue = current?.currentValue || 0;
        const targetValue = (totalValue * target.targetPercent) / 100;
        const suggestedAmount = targetValue - currentValue;

        alerts.push({
          assetClass: target.assetClass,
          currentPercent,
          targetPercent: target.targetPercent,
          drift,
          suggestedTrade: suggestedAmount >= 0 ? '增持' : '减持',
          suggestedAmount: Math.abs(suggestedAmount),
        });
      }
    }

    return alerts;
  }, [holdings, currentAllocation, rebalanceThreshold]);

  // Goal projection calculations
  const goalProjection = useMemo(() => {
    if (!selectedGoal) return null;

    const monthsRemaining = Math.max(
      0,
      (new Date(selectedGoal.targetDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24 * 30)
    );

    const requiredReturn = calcRequiredReturn(
      selectedGoal.targetAmount,
      selectedGoal.initialInvestment,
      selectedGoal.monthlyContribution,
      monthsRemaining
    );

    const probability = calcProbabilityOfSuccess(
      selectedGoal.targetAmount,
      selectedGoal.initialInvestment,
      selectedGoal.monthlyContribution,
      monthsRemaining,
      selectedGoal.riskLevel
    );

    return {
      monthsRemaining: Math.round(monthsRemaining),
      requiredReturn: Math.min(requiredReturn, 50),
      probability: Math.min(Math.max(probability, 0), 100),
    };
  }, [selectedGoal]);

  // Suggested allocation based on risk level
  const suggestedAllocation = useMemo(() => {
    return RISK_ALLOCATION[formData.riskLevel] || RISK_ALLOCATION[3];
  }, [formData.riskLevel]);

  // ECharts options
  const allocationChartOption = useMemo(() => {
    const hasGoalAllocation = selectedGoal && goalProjection;
    const data = hasGoalAllocation
      ? suggestedAllocation.map((a) => ({
          name: HOLDING_TYPE_LABELS[a.assetClass],
          value: a.targetPercent,
          itemStyle: { color: HOLDING_TYPE_COLORS[a.assetClass] },
        }))
      : currentAllocation.map((a) => ({
          name: HOLDING_TYPE_LABELS[a.assetClass],
          value: a.currentPercent.toFixed(1),
          itemStyle: { color: HOLDING_TYPE_COLORS[a.assetClass] },
        }));

    return {
      backgroundColor: 'transparent',
      textStyle: { color: '#94a3b8' },
      tooltip: {
        trigger: 'item',
        backgroundColor: 'rgba(15,23,42,0.95)',
        borderColor: '#334155',
        textStyle: { color: '#e2e8f0', fontSize: 12 },
        formatter: (p: any) => `${p.name}<br/>占比: ${p.value}%`,
      },
      legend: {
        orient: 'vertical',
        right: 16,
        top: 'center',
        textStyle: { color: '#94a3b8', fontSize: 11 },
      },
      series: [
        {
          name: '资产配置',
          type: 'pie',
          radius: ['40%', '70%'],
          center: ['35%', '50%'],
          avoidLabelOverlap: false,
          label: { show: false },
          emphasis: {
            label: { show: false },
            itemStyle: { shadowBlur: 10, shadowColor: 'rgba(0,0,0,0.5)' },
          },
          data,
        },
      ],
    };
  }, [selectedGoal, goalProjection, suggestedAllocation, currentAllocation]);

  const driftChartOption = useMemo(() => {
    const alerts = rebalanceAlerts;
    if (alerts.length === 0) {
      return {
        backgroundColor: 'transparent',
        textStyle: { color: '#94a3b8' },
        title: {
          text: '当前配置偏离度',
          textStyle: { color: '#94a3b8', fontSize: 14 },
          left: 'center',
          top: 'center',
        },
        series: [],
      };
    }

    return {
      backgroundColor: 'transparent',
      textStyle: { color: '#94a3b8' },
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(15,23,42,0.95)',
        borderColor: '#334155',
        textStyle: { color: '#e2e8f0', fontSize: 12 },
        axisPointer: { type: 'shadow' },
      },
      grid: { top: 16, right: 16, bottom: 40, left: 16, containLabel: true },
      xAxis: {
        type: 'category',
        data: alerts.map((a) => HOLDING_TYPE_LABELS[a.assetClass]),
        axisLine: { lineStyle: { color: '#334155' } },
        axisTick: { show: false },
        axisLabel: { color: '#94a3b8', fontSize: 10 },
      },
      yAxis: {
        type: 'value',
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: {
          color: '#64748b',
          fontSize: 10,
          formatter: (v: number) => `${v.toFixed(0)}%`,
        },
        splitLine: { lineStyle: { color: '#1e293b', type: 'dashed' } },
      },
      series: [
        {
          name: '当前占比',
          type: 'bar',
          data: alerts.map((a) => ({
            value: a.currentPercent.toFixed(1),
            itemStyle: { color: HOLDING_TYPE_COLORS[a.assetClass] },
          })),
          barMaxWidth: 32,
        },
        {
          name: '目标占比',
          type: 'bar',
          data: alerts.map((a) => ({
            value: a.targetPercent,
            itemStyle: { color: 'rgba(148,163,184,0.3)' },
          })),
          barMaxWidth: 32,
        },
      ],
    };
  }, [rebalanceAlerts]);

  // Handlers
  const handleCreateGoal = () => {
    const newGoal: Goal = {
      id: `goal_${Date.now()}`,
      name: formData.name,
      targetAmount: formData.targetAmount,
      targetDate: formData.targetDate,
      initialInvestment: formData.initialInvestment,
      monthlyContribution: formData.monthlyContribution,
      riskLevel: formData.riskLevel,
      linkedHoldings: formData.linkedHoldings,
      createdAt: new Date().toISOString(),
      version: 1,
      isActive: true,
    };

    setGoals([...goals, newGoal]);

    // Save version
    const version: PlanVersion = {
      id: `version_${Date.now()}`,
      goalId: newGoal.id,
      version: 1,
      snapshot: { ...newGoal },
      createdAt: new Date().toISOString(),
    };
    setPlanVersions([...planVersions, version]);

    // Reset form
    setFormData({
      name: '',
      targetAmount: 100000,
      targetDate: '',
      initialInvestment: 0,
      monthlyContribution: 1000,
      riskLevel: 3,
      linkedHoldings: [],
    });
  };

  const handleUpdateGoal = () => {
    if (!editingGoal) return;

    // Save current version before updating
    const version: PlanVersion = {
      id: `version_${Date.now()}`,
      goalId: editingGoal.id,
      version: editingGoal.version,
      snapshot: { ...editingGoal },
      createdAt: new Date().toISOString(),
    };
    setPlanVersions([...planVersions, version]);

    // Update goal with new version
    const updatedGoal: Goal = {
      ...editingGoal,
      name: formData.name,
      targetAmount: formData.targetAmount,
      targetDate: formData.targetDate,
      initialInvestment: formData.initialInvestment,
      monthlyContribution: formData.monthlyContribution,
      riskLevel: formData.riskLevel,
      linkedHoldings: formData.linkedHoldings,
      version: editingGoal.version + 1,
    };

    setGoals(goals.map((g) => (g.id === updatedGoal.id ? updatedGoal : g)));

    // Save new version
    const newVersion: PlanVersion = {
      id: `version_${Date.now()}_new`,
      goalId: updatedGoal.id,
      version: updatedGoal.version,
      snapshot: { ...updatedGoal },
      createdAt: new Date().toISOString(),
    };
    setPlanVersions([...planVersions, newVersion]);

    setEditingGoal(null);
    setFormData({
      name: '',
      targetAmount: 100000,
      targetDate: '',
      initialInvestment: 0,
      monthlyContribution: 1000,
      riskLevel: 3,
      linkedHoldings: [],
    });
  };

  const handleEditGoal = (goal: Goal) => {
    setEditingGoal(goal);
    setFormData({
      name: goal.name,
      targetAmount: goal.targetAmount,
      targetDate: goal.targetDate,
      initialInvestment: goal.initialInvestment,
      monthlyContribution: goal.monthlyContribution,
      riskLevel: goal.riskLevel,
      linkedHoldings: goal.linkedHoldings,
    });
  };

  const handleDeleteGoal = (goalId: string) => {
    setGoals(goals.filter((g) => g.id !== goalId));
    setSelectedGoal(null);
  };

  const handleRestoreVersion = (version: PlanVersion) => {
    const restoredGoal: Goal = {
      ...version.snapshot,
      id: version.goalId,
      version: version.version + 1,
      createdAt: new Date().toISOString(),
    };

    setGoals(goals.map((g) => (g.id === version.goalId ? restoredGoal : g)));

    // Save restoration version
    const restoreVersion: PlanVersion = {
      id: `version_${Date.now()}_restored`,
      goalId: restoredGoal.id,
      version: restoredGoal.version,
      snapshot: { ...restoredGoal },
      createdAt: new Date().toISOString(),
    };
    setPlanVersions([...planVersions, restoreVersion]);
  };

  const goalVersions = useMemo(() => {
    if (!selectedGoal) return [];
    return planVersions
      .filter((v) => v.goalId === selectedGoal.id)
      .sort((a, b) => b.version - a.version);
  }, [selectedGoal, planVersions]);

  return (
    <div
      className="min-h-screen bg-slate-50 text-slate-800"
      style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}
    >
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur-sm sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                🎯 <span>理财规划</span>
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                Goal Planning & Portfolio Rebalancing · 规划您的财务未来
              </p>
            </div>
            <div className="flex items-center gap-2 bg-white border border-slate-200 p-1 rounded-lg shadow-sm">
              <button
                type="button"
                onClick={() => setActiveTab('goals')}
                className={cn(
                  'px-4 py-1.5 rounded-md text-sm font-medium transition-colors',
                  activeTab === 'goals'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                )}
              >
                🎯 目标规划
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('rebalance')}
                className={cn(
                  'px-4 py-1.5 rounded-md text-sm font-medium transition-colors',
                  activeTab === 'rebalance'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                )}
              >
                ⚖️ 组合再平衡
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {activeTab === 'goals' ? (
          <>
            {/* Goal Creation Form */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-800 mb-6 flex items-center gap-2">
                {editingGoal ? '✏️ 编辑目标' : '✨ 创建理财目标'}
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Goal Name */}
                <div className="space-y-2">
                  <span className="text-sm text-slate-500 font-medium">🎯 目标名称</span>
                  <input
                    id="goal-name"
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="如：养老储备、子女教育"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>

                {/* Target Amount */}
                <div className="space-y-2">
                  <span className="text-sm text-slate-500 font-medium">💰 目标金额 (¥)</span>
                  <input
                    id="target-amount"
                    type="number"
                    value={formData.targetAmount}
                    onChange={(e) =>
                      setFormData({ ...formData, targetAmount: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>

                {/* Target Date */}
                <div className="space-y-2">
                  <span className="text-sm text-slate-500 font-medium">📅 目标日期</span>
                  <input
                    id="target-date"
                    type="date"
                    value={formData.targetDate}
                    onChange={(e) => setFormData({ ...formData, targetDate: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>

                {/* Initial Investment */}
                <div className="space-y-2">
                  <span className="text-sm text-slate-500 font-medium">💎 初始投入 (¥)</span>
                  <input
                    id="initial-investment"
                    type="number"
                    value={formData.initialInvestment}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        initialInvestment: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>

                {/* Monthly Contribution */}
                <div className="space-y-2">
                  <span className="text-sm text-slate-500 font-medium">📈 每月定投 (¥)</span>
                  <input
                    id="monthly-contribution"
                    type="number"
                    value={formData.monthlyContribution}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        monthlyContribution: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>

                {/* Risk Level */}
                <div className="space-y-2">
                  <span className="text-sm text-slate-500 font-medium">
                    ⚖️ 风险等级 ({formData.riskLevel}) - {RISK_LABELS[formData.riskLevel]}
                  </span>
                  <input
                    id="risk-level"
                    type="range"
                    min="1"
                    max="5"
                    value={formData.riskLevel}
                    onChange={(e) =>
                      setFormData({ ...formData, riskLevel: parseInt(e.target.value) })
                    }
                    className="w-full accent-indigo-600"
                  />
                  <div className="flex justify-between text-xs text-slate-400">
                    <span>保守</span>
                    <span>激进</span>
                  </div>
                </div>
              </div>

              {/* Linked Holdings */}
              <div className="mt-6 space-y-2">
                <span className="text-sm text-slate-500 font-medium">🔗 关联持仓</span>
                <div className="flex flex-wrap gap-2">
                  {holdings.map((h) => (
                    <button
                      type="button"
                      key={h.id}
                      onClick={() => {
                        const linked = formData.linkedHoldings.includes(h.id)
                          ? formData.linkedHoldings.filter((id) => id !== h.id)
                          : [...formData.linkedHoldings, h.id];
                        setFormData({ ...formData, linkedHoldings: linked });
                      }}
                      className={cn(
                        'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                        formData.linkedHoldings.includes(h.id)
                          ? 'bg-indigo-100 text-indigo-700 border border-indigo-300'
                          : 'bg-slate-50 text-slate-500 border border-slate-200 hover:text-slate-700'
                      )}
                    >
                      {h.name}
                    </button>
                  ))}
                  {holdings.length === 0 && (
                    <span className="text-sm text-slate-400">暂无可关联的持仓 💼</span>
                  )}
                </div>
              </div>

              {/* Suggested Allocation Preview */}
              <div className="mt-6">
                <span className="text-sm text-slate-500 font-medium mb-3 block">
                  💡 建议配置方案
                </span>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  {suggestedAllocation.map((a) => (
                    <div
                      key={a.assetClass}
                      className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-center"
                    >
                      <div
                        className="w-3 h-3 rounded-full mx-auto mb-1"
                        style={{ backgroundColor: HOLDING_TYPE_COLORS[a.assetClass] }}
                      />
                      <div className="text-xs text-slate-500">
                        {HOLDING_TYPE_LABELS[a.assetClass]}
                      </div>
                      <div className="text-base font-bold text-slate-800">{a.targetPercent}%</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Submit Button */}
              <div className="mt-6 flex gap-3">
                {editingGoal ? (
                  <>
                    <button
                      type="button"
                      onClick={handleUpdateGoal}
                      className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-500 transition-colors shadow-sm font-medium"
                    >
                      ✨ 保存修改
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingGoal(null);
                        setFormData({
                          name: '',
                          targetAmount: 100000,
                          targetDate: '',
                          initialInvestment: 0,
                          monthlyContribution: 1000,
                          riskLevel: 3,
                          linkedHoldings: [],
                        });
                      }}
                      className="px-4 py-2 bg-slate-50 text-slate-500 rounded-lg text-sm hover:text-slate-700 transition-colors border border-slate-200"
                    >
                      取消
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={handleCreateGoal}
                    disabled={!formData.name || !formData.targetDate}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-500 transition-colors shadow-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    ✨ 创建目标
                  </button>
                )}
              </div>
            </div>

            {/* Goals List */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Goals */}
              <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                <div className="px-4 py-3 border-b border-slate-100">
                  <h2 className="text-sm font-semibold text-slate-600">🎯 我的目标</h2>
                </div>
                {goals.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-48 gap-2 text-slate-400">
                    <span className="text-4xl opacity-30">🎯</span>
                    <div className="text-sm">暂无理财目标，点击上方创建</div>
                    <div className="text-xs text-slate-300">设定目标，追踪您的财务梦想</div>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {goals.map((goal) => {
                      const linkedHoldingsList = holdings.filter((h) =>
                        goal.linkedHoldings.includes(h.id)
                      );
                      const linkedValue = linkedHoldingsList.reduce(
                        (sum, h) => sum + h.current_value,
                        0
                      );

                      return (
                        <div
                          key={goal.id}
                          className={cn(
                            'px-4 py-3 transition-colors',
                            selectedGoal?.id === goal.id ? 'bg-indigo-50' : 'hover:bg-slate-50'
                          )}
                        >
                          <div className="flex items-start justify-between">
                            <button
                              type="button"
                              onClick={() => setSelectedGoal(goal)}
                              className="text-left flex-1"
                            >
                              <div className="text-sm font-semibold text-slate-800">
                                {goal.name}
                              </div>
                              <div className="text-xs text-slate-400 mt-0.5">
                                目标 ¥{goal.targetAmount.toLocaleString()} ·{' '}
                                {RISK_LABELS[goal.riskLevel]} · v{goal.version}
                              </div>
                              {linkedHoldingsList.length > 0 && (
                                <div className="text-xs text-slate-400 mt-1">
                                  🔗 {linkedHoldingsList.map((h) => h.name).join(', ')}
                                </div>
                              )}
                            </button>
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEditGoal(goal);
                                }}
                                className="text-xs text-slate-400 hover:text-indigo-600 transition-colors px-2 py-1 rounded hover:bg-indigo-50"
                              >
                                编辑
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteGoal(goal.id);
                                }}
                                className="text-xs text-slate-400 hover:text-rose-500 transition-colors px-2 py-1 rounded hover:bg-rose-50"
                              >
                                删除
                              </button>
                            </div>
                          </div>
                          {/* Progress */}
                          <div className="mt-2">
                            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-indigo-500 rounded-full"
                                style={{
                                  width: `${Math.min(
                                    100,
                                    (linkedValue / goal.targetAmount) * 100
                                  )}%`,
                                }}
                              />
                            </div>
                            <div className="flex justify-between text-xs text-slate-400 mt-1">
                              <span>¥{linkedValue.toLocaleString()}</span>
                              <span>{((linkedValue / goal.targetAmount) * 100).toFixed(1)}%</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Goal Projection */}
              <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                <div className="px-4 py-3 border-b border-slate-100">
                  <h2 className="text-sm font-semibold text-slate-600">📊 目标分析</h2>
                </div>
                {selectedGoal && goalProjection ? (
                  <div className="p-4 space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                        <div className="text-xs text-slate-400">⏱️ 剩余时间</div>
                        <div className="text-2xl font-bold text-indigo-600">
                          {goalProjection.monthsRemaining}
                        </div>
                        <div className="text-xs text-slate-400">个月</div>
                      </div>
                      <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                        <div className="text-xs text-slate-400">🎯 达成概率</div>
                        <div
                          className={cn(
                            'text-2xl font-bold',
                            goalProjection.probability >= 70
                              ? 'text-emerald-500'
                              : goalProjection.probability >= 40
                                ? 'text-amber-500'
                                : 'text-rose-500'
                          )}
                        >
                          {goalProjection.probability.toFixed(1)}%
                        </div>
                      </div>
                    </div>

                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                      <div className="text-xs text-slate-400">📈 所需年化收益率</div>
                      <div
                        className={cn(
                          'text-3xl font-black',
                          goalProjection.requiredReturn > 15
                            ? 'text-rose-500'
                            : goalProjection.requiredReturn > 8
                              ? 'text-amber-500'
                              : 'text-emerald-500'
                        )}
                      >
                        {goalProjection.requiredReturn.toFixed(1)}%
                      </div>
                      <div className="text-xs text-slate-400 mt-1">
                        {goalProjection.requiredReturn > 15
                          ? '⚠️ 目标较难达成，考虑调整'
                          : goalProjection.requiredReturn > 8
                            ? '⚡ 需积极投资策略'
                            : '✓ 目标可实现'}
                      </div>
                    </div>

                    {/* Allocation Chart */}
                    <div>
                      <div className="text-xs text-slate-400 mb-2 font-medium">💡 建议配置</div>
                      <ReactECharts
                        option={allocationChartOption}
                        style={{ height: 200 }}
                        opts={{ renderer: 'canvas' }}
                        notMerge={false}
                        theme="dark"
                      />
                    </div>

                    {/* Version History */}
                    {goalVersions.length > 0 && (
                      <div>
                        <div className="text-xs text-slate-400 mb-2 font-medium">📜 版本历史</div>
                        <div className="space-y-2">
                          {goalVersions.slice(0, 5).map((v) => (
                            <div
                              key={v.id}
                              className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-lg px-3 py-2"
                            >
                              <div className="text-xs text-slate-500">
                                v{v.version} · {new Date(v.createdAt).toLocaleDateString()}
                              </div>
                              <button
                                type="button"
                                onClick={() => handleRestoreVersion(v)}
                                className="text-xs text-indigo-600 hover:text-indigo-500 transition-colors font-medium"
                              >
                                恢复
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-64 gap-2 text-slate-400">
                    <span className="text-4xl opacity-30">🎯</span>
                    <div className="text-sm">选择目标查看分析</div>
                    <div className="text-xs text-slate-300">点击左侧目标查看详细分析</div>
                  </div>
                )}
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Rebalancing Section */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                  ⚖️ 组合再平衡
                </h2>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-slate-500 font-medium">偏离阈值</span>
                  <input
                    type="number"
                    value={rebalanceThreshold}
                    onChange={(e) => setRebalanceThreshold(parseFloat(e.target.value) || 5)}
                    className="w-20 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                  <span className="text-sm text-slate-500 font-medium">%</span>
                </div>
              </div>

              {/* Drift Detection Chart */}
              <div className="mb-6">
                <ReactECharts
                  option={driftChartOption}
                  style={{ height: 250 }}
                  opts={{ renderer: 'canvas' }}
                  notMerge={false}
                  theme="dark"
                />
              </div>

              {/* Rebalance Alerts */}
              {rebalanceAlerts.length > 0 ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-amber-500">
                    <span className="text-lg">⚠️</span>
                    <span className="text-sm font-semibold">
                      检测到 {rebalanceAlerts.length} 项偏离超过阈值
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {rebalanceAlerts.map((alert) => (
                      <div
                        key={alert.assetClass}
                        className={cn(
                          'bg-slate-50 rounded-xl p-4 border',
                          Math.abs(alert.drift) > 10 ? 'border-rose-300' : 'border-amber-200'
                        )}
                      >
                        <div className="flex items-center gap-2 mb-3">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: HOLDING_TYPE_COLORS[alert.assetClass] }}
                          />
                          <span className="text-sm font-semibold text-slate-800">
                            {HOLDING_TYPE_LABELS[alert.assetClass]}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div>
                            <div className="text-xs text-slate-400">当前占比</div>
                            <div className="text-base font-bold text-slate-800">
                              {alert.currentPercent.toFixed(1)}%
                            </div>
                          </div>
                          <div>
                            <div className="text-xs text-slate-400">目标占比</div>
                            <div className="text-base font-bold text-slate-800">
                              {alert.targetPercent}%
                            </div>
                          </div>
                        </div>

                        <div className="mt-3 pt-3 border-t border-slate-200">
                          <div className="flex items-center justify-between">
                            <span
                              className={cn(
                                'text-sm font-bold',
                                alert.drift > 0 ? 'text-rose-500' : 'text-emerald-500'
                              )}
                            >
                              偏离 {Math.abs(alert.drift).toFixed(1)}%
                            </span>
                            <span
                              className={cn(
                                'text-sm font-bold',
                                alert.suggestedTrade === '增持'
                                  ? 'text-emerald-500'
                                  : 'text-rose-500'
                              )}
                            >
                              {alert.suggestedTrade}
                            </span>
                          </div>
                          <div className="text-xs text-slate-400 mt-1">
                            建议 {alert.suggestedTrade === '增持' ? '买入' : '卖出'} ¥
                            {alert.suggestedAmount.toLocaleString()}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Suggested Trades Summary */}
                  <div className="mt-6 bg-slate-50 border border-slate-200 rounded-xl p-4">
                    <h3 className="text-sm font-semibold text-slate-600 mb-3">📋 调仓建议汇总</h3>
                    <div className="space-y-2">
                      {rebalanceAlerts
                        .sort((a, b) => b.suggestedAmount - a.suggestedAmount)
                        .map((alert) => (
                          <div
                            key={alert.assetClass}
                            className="flex items-center justify-between text-sm"
                          >
                            <div className="flex items-center gap-2">
                              <span
                                className={cn(
                                  alert.suggestedTrade === '增持'
                                    ? 'text-emerald-500'
                                    : 'text-rose-500'
                                )}
                              >
                                {alert.suggestedTrade === '增持' ? '📈' : '📉'}
                              </span>
                              <span className="text-slate-600 font-medium">
                                {HOLDING_TYPE_LABELS[alert.assetClass]}
                              </span>
                            </div>
                            <span className="text-slate-500 font-semibold">
                              {alert.suggestedTrade === '增持' ? '+' : '-'}¥
                              {alert.suggestedAmount.toLocaleString()}
                            </span>
                          </div>
                        ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-48 text-slate-400">
                  <div className="text-center">
                    <div className="text-4xl mb-3 opacity-30">✨</div>
                    <div className="text-base font-medium text-emerald-500">
                      当前配置偏离在阈值范围内
                    </div>
                    <div className="text-sm text-slate-400 mt-1">🎉 无需进行再平衡，继续保持！</div>
                  </div>
                </div>
              )}
            </div>

            {/* Current vs Target Allocation */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Current Allocation */}
              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
                <h2 className="text-sm font-semibold text-slate-600 mb-4 flex items-center gap-2">
                  📊 当前配置
                </h2>
                {currentAllocation.length > 0 ? (
                  <ReactECharts
                    option={{
                      ...allocationChartOption,
                      series: [
                        {
                          ...allocationChartOption.series[0],
                          data: currentAllocation.map((a) => ({
                            name: HOLDING_TYPE_LABELS[a.assetClass],
                            value: a.currentPercent.toFixed(1),
                            itemStyle: { color: HOLDING_TYPE_COLORS[a.assetClass] },
                          })),
                        },
                      ],
                    }}
                    style={{ height: 280 }}
                    opts={{ renderer: 'canvas' }}
                    notMerge={false}
                    theme="dark"
                  />
                ) : (
                  <div className="h-64 flex flex-col items-center justify-center text-slate-400 gap-2">
                    <span className="text-4xl opacity-30">📊</span>
                    <p className="text-sm">暂无持仓数据</p>
                    <p className="text-xs text-slate-300">添加投资后查看配置</p>
                  </div>
                )}
              </div>

              {/* Target Allocation */}
              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
                <h2 className="text-sm font-semibold text-slate-600 mb-4 flex items-center gap-2">
                  🎯 目标配置
                </h2>
                <div className="space-y-3">
                  {suggestedAllocation.map((a) => (
                    <div key={a.assetClass} className="flex items-center gap-3">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: HOLDING_TYPE_COLORS[a.assetClass] }}
                      />
                      <span className="text-sm text-slate-600 flex-1 font-medium">
                        {HOLDING_TYPE_LABELS[a.assetClass]}
                      </span>
                      <span className="text-base font-bold text-indigo-600">
                        {a.targetPercent}%
                      </span>
                    </div>
                  ))}
                </div>
                <div className="mt-6">
                  <div className="text-xs text-slate-400 mb-2 font-medium">
                    ⚖️ 风险等级：{RISK_LABELS[3]}
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="5"
                    value={3}
                    className="w-full accent-indigo-600"
                    disabled
                  />
                </div>
              </div>
            </div>

            {/* All Plan Versions */}
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
              <div className="px-4 py-3 border-b border-slate-100">
                <h2 className="text-sm font-semibold text-slate-600 flex items-center gap-2">
                  📜 所有方案版本
                </h2>
              </div>
              {planVersions.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-32 gap-2 text-slate-400">
                  <span className="text-3xl opacity-30">📜</span>
                  <div className="text-sm">暂无版本历史</div>
                </div>
              ) : (
                <div className="divide-y divide-slate-100 max-h-64 overflow-y-auto">
                  {planVersions
                    .sort(
                      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
                    )
                    .map((v) => (
                      <div
                        key={v.id}
                        className="flex items-center justify-between px-4 py-2.5 hover:bg-slate-50 transition-colors"
                      >
                        <div>
                          <div className="text-sm font-medium text-slate-800">
                            {v.snapshot.name}
                          </div>
                          <div className="text-xs text-slate-400">
                            v{v.version} · {new Date(v.createdAt).toLocaleString()}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const goal = goals.find((g) => g.id === v.goalId);
                            if (goal) {
                              setSelectedGoal(goal);
                              setActiveTab('goals');
                            }
                          }}
                          className="text-xs text-indigo-600 hover:text-indigo-500 transition-colors font-medium px-2 py-1 rounded hover:bg-indigo-50"
                        >
                          查看
                        </button>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
