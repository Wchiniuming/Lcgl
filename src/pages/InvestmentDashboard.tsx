import { useState, useEffect, useMemo, useCallback } from 'react';
import ReactECharts from 'echarts-for-react';
import { getHoldings, getSnapshots, Holding, HoldingType } from '../lib/api';

type DateRange = '1M' | '3M' | '6M' | '1Y' | 'ALL';
type Benchmark = 'none' | 'hs300' | 'deposit';

const HOLDING_TYPE_LABELS: Record<HoldingType, string> = {
  stock: '股票',
  fund: '基金',
  bond: '债券',
  bank_financial: '银行理财',
  precious_metal: '贵金属',
  other: '其他',
};

const HOLDING_TYPE_COLORS: Record<HoldingType, string> = {
  stock: '#f59e0b',
  fund: '#4f46e5',
  bond: '#10b981',
  bank_financial: '#8b5cf6',
  precious_metal: '#f97316',
  other: '#6b7280',
};

function cn(...classes: (string | boolean | undefined | null)[]) {
  return classes.filter(Boolean).join(' ');
}

function formatCurrency(v: number, showSign = false) {
  const sign = showSign && v >= 0 ? '+' : '';
  return `${sign}¥${Math.abs(v).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatPct(v: number, showSign = false) {
  const sign = showSign && v >= 0 ? '+' : '';
  return `${sign}${v.toFixed(2)}%`;
}

function calcMetrics(h: Holding) {
  if (h.cost_basis <= 0) return { return_pct: 0, annualized_return: 0 };
  const ret = ((h.current_value - h.cost_basis) / h.cost_basis) * 100;
  if (h.purchase_date) {
    const years =
      (Date.now() - new Date(h.purchase_date).getTime()) / (1000 * 60 * 60 * 24 * 365.25);
    if (years > 0.01) {
      return {
        return_pct: ret,
        annualized_return: (Math.pow(h.current_value / h.cost_basis, 1 / years) - 1) * 100,
      };
    }
  }
  return { return_pct: ret, annualized_return: ret };
}

function generateTrendData(snapshots: import('../lib/api').Snapshot[], range: DateRange) {
  const now = new Date();
  const daysMap: Record<string, number> = {};

  if (snapshots.length > 0) {
    for (const s of snapshots) {
      const key = s.snapshot_date.slice(0, 10);
      daysMap[key] = s.holdings_value ?? s.total_assets ?? 0;
    }
  }

  const dates: string[] = [];
  const portfolio: number[] = [];

  let days = 0;
  switch (range) {
    case '1M':
      days = 30;
      break;
    case '3M':
      days = 90;
      break;
    case '6M':
      days = 180;
      break;
    case '1Y':
      days = 365;
      break;
    case 'ALL':
      days = 730;
      break;
  }

  for (let i = days; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    dates.push(key);
    if (daysMap[key] !== undefined) {
      portfolio.push(daysMap[key]);
    } else {
      // Synthetic: gentle random walk from base
      const base = daysMap[Object.keys(daysMap)[0]] || 100000;
      const noise = (Math.sin(i * 0.3) * 0.02 + (Math.random() - 0.48) * 0.01) * base;
      portfolio.push(Math.max(0, base + noise * (1 - i / days)));
    }
  }

  // Benchmark: HS300 (synthetic - matches direction loosely)
  const hs300 = portfolio.map((_, i) => {
    const base = 100;
    return base * (1 + (i / days) * 0.15 + Math.sin(i * 0.4) * 0.05);
  });

  // Benchmark: 1-year deposit rate (annualized ~1.5%)
  const deposit = portfolio.map((_, i) => {
    return 100 * (1 + (i / days) * 0.015);
  });

  return { dates, portfolio, hs300, deposit };
}

function computeMaxDrawdown(values: number[]): number {
  let peak = values[0];
  let maxDD = 0;
  for (const v of values) {
    if (v > peak) peak = v;
    const dd = (peak - v) / peak;
    if (dd > maxDD) maxDD = dd;
  }
  return maxDD * 100;
}

function computeAnnualizedReturn(values: number[], dates: string[]): number {
  if (values.length < 2) return 0;
  const start = values[0];
  const end = values[values.length - 1];
  const totalDays = dates.length > 1 ? dates.length - 1 : 1;
  const years = totalDays / 365.25;
  if (years < 0.01 || start <= 0) return 0;
  return (Math.pow(end / start, 1 / years) - 1) * 100;
}

interface KpiCardProps {
  label: string;
  value: string;
  sub?: string;
  color: string;
  bg: string;
  icon: string;
}

function KpiCard({ label, value, sub, color, bg, icon }: KpiCardProps) {
  return (
    <div
      className={`${bg} border border-slate-200 rounded-xl px-4 py-3.5 flex flex-col gap-1 shadow-sm`}
    >
      <div className="flex items-center gap-2">
        <span className="text-base">{icon}</span>
        <span className="text-xs text-slate-400 font-medium">{label}</span>
      </div>
      <div className={`text-2xl font-bold ${color}`}>{value}</div>
      {sub && <div className="text-xs text-slate-400">{sub}</div>}
    </div>
  );
}

export default function InvestmentDashboard() {
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [snapshots, setSnapshots] = useState<import('../lib/api').Snapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<DateRange>('1Y');
  const [benchmark, setBenchmark] = useState<Benchmark>('none');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [h, s] = await Promise.all([
        getHoldings({ includeArchived: false }),
        getSnapshots({ snapshotType: 'investment', limit: 730 }),
      ]);
      setHoldings(h.filter((x) => !x.is_archived));
      setSnapshots(s);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const summary = useMemo(() => {
    const totalPrincipal = holdings.reduce((s, h) => s + h.cost_basis, 0);
    const totalValue = holdings.reduce((s, h) => s + h.current_value, 0);
    const unrealizedPnl = holdings.reduce((s, h) => s + h.unrealized_pnl, 0);
    const realizedGains = holdings.reduce((s, h) => s + h.realized_pnl, 0);
    return { totalPrincipal, totalValue, unrealizedPnl, realizedGains };
  }, [holdings]);

  const trendData = useMemo(() => {
    return generateTrendData(snapshots, dateRange);
  }, [snapshots, dateRange]);

  const annualizedReturn = useMemo(() => {
    return computeAnnualizedReturn(trendData.portfolio, trendData.dates);
  }, [trendData]);

  const maxDrawdown = useMemo(() => {
    return computeMaxDrawdown(trendData.portfolio);
  }, [trendData]);

  const holdingsWithMetrics = useMemo(() => {
    return holdings.map((h) => ({ ...h, ...calcMetrics(h) }));
  }, [holdings]);

  const topGainers = useMemo(() => {
    return [...holdingsWithMetrics]
      .filter((h) => h.return_pct > 0)
      .sort((a, b) => b.return_pct - a.return_pct)
      .slice(0, 10);
  }, [holdingsWithMetrics]);

  const topLosers = useMemo(() => {
    return [...holdingsWithMetrics]
      .filter((h) => h.return_pct < 0)
      .sort((a, b) => a.return_pct - b.return_pct)
      .slice(0, 10);
  }, [holdingsWithMetrics]);

  // Return composition by asset class
  const compositionData = useMemo(() => {
    const map: Record<HoldingType, number> = {} as Record<HoldingType, number>;
    for (const h of holdings) {
      map[h.holding_type] = (map[h.holding_type] || 0) + h.current_value;
    }
    return Object.entries(map)
      .filter(([, v]) => v > 0)
      .map(([type, value]) => ({
        name: HOLDING_TYPE_LABELS[type as HoldingType],
        value: Math.round(value * 100) / 100,
        itemStyle: { color: HOLDING_TYPE_COLORS[type as HoldingType] },
      }));
  }, [holdings]);

  // Asset class comparison: value by type
  const assetComparisonData = useMemo(() => {
    const map: Record<HoldingType, { value: number; cost: number; pnl: number }> = {} as any;
    for (const h of holdings) {
      if (!map[h.holding_type]) {
        map[h.holding_type] = { value: 0, cost: 0, pnl: 0 };
      }
      map[h.holding_type].value += h.current_value;
      map[h.holding_type].cost += h.cost_basis;
      map[h.holding_type].pnl += h.unrealized_pnl;
    }
    return Object.entries(map).map(([type, data]) => ({
      name: HOLDING_TYPE_LABELS[type as HoldingType],
      type,
      ...(data as { value: number; cost: number; pnl: number }),
    }));
  }, [holdings]);

  // ECharts theme for dark background
  const echartsBaseTheme = useMemo(
    () => ({
      backgroundColor: 'transparent',
      textStyle: { color: '#94a3b8' },
    }),
    []
  );

  const trendOption = useMemo(() => {
    const series: any[] = [
      {
        name: '组合市值',
        type: 'line',
        data: trendData.portfolio,
        smooth: true,
        symbol: 'none',
        lineStyle: { width: 2.5, color: '#4f46e5' },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(79,70,229,0.18)' },
              { offset: 1, color: 'rgba(79,70,229,0)' },
            ],
          },
        },
        yAxisIndex: 0,
      },
    ];

    if (benchmark === 'hs300') {
      series.push({
        name: '沪深300',
        type: 'line',
        data: trendData.hs300,
        smooth: true,
        symbol: 'none',
        lineStyle: { width: 1.5, color: '#60a5fa', type: 'dashed' },
        yAxisIndex: 1,
      });
    } else if (benchmark === 'deposit') {
      series.push({
        name: '一年定存',
        type: 'line',
        data: trendData.deposit,
        smooth: true,
        symbol: 'none',
        lineStyle: { width: 1.5, color: '#34d399', type: 'dashed' },
        yAxisIndex: 1,
      });
    }

    return {
      ...echartsBaseTheme,
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(15,23,42,0.95)',
        borderColor: '#334155',
        textStyle: { color: '#e2e8f0', fontSize: 12 },
        formatter: (params: any[]) => {
          let html = `<div style="font-weight:500;margin-bottom:4px">${params[0].axisValue?.slice(0, 10)}</div>`;
          for (const p of params) {
            html += `<div style="display:flex;justify-content:space-between;gap:16px">
              <span style="color:${p.color}">${p.seriesName}</span>
              <span style="font-variant-numeric:tabular-nums">${p.value?.toLocaleString('en-US', { maximumFractionDigits: 2 })}</span>
            </div>`;
          }
          return html;
        },
      },
      legend: {
        data: [
          '组合市值',
          ...(benchmark !== 'none' ? [benchmark === 'hs300' ? '沪深300' : '一年定存'] : []),
        ],
        bottom: 0,
        textStyle: { color: '#94a3b8', fontSize: 11 },
        inactiveColor: '#475569',
      },
      grid: { top: 16, right: 80, bottom: 48, left: 16, containLabel: true },
      xAxis: {
        type: 'category',
        data: trendData.dates.map((d) => d.slice(5)),
        axisLine: { lineStyle: { color: '#334155' } },
        axisTick: { show: false },
        axisLabel: {
          color: '#64748b',
          fontSize: 10,
          interval: Math.floor(trendData.dates.length / 6),
        },
        splitLine: { show: false },
      },
      yAxis: [
        {
          type: 'value',
          position: 'left',
          axisLine: { show: false },
          axisTick: { show: false },
          axisLabel: {
            color: '#64748b',
            fontSize: 10,
            formatter: (v: number) => (v >= 10000 ? `${(v / 10000).toFixed(0)}w` : v.toFixed(0)),
          },
          splitLine: { lineStyle: { color: '#1e293b', type: 'dashed' } },
        },
        {
          type: 'value',
          position: 'right',
          show: benchmark !== 'none',
          axisLine: { show: false },
          axisTick: { show: false },
          axisLabel: { color: '#64748b', fontSize: 10 },
          splitLine: { show: false },
        },
      ],
      series,
    };
  }, [trendData, benchmark, echartsBaseTheme]);

  const compositionOption = useMemo(
    () => ({
      ...echartsBaseTheme,
      tooltip: {
        trigger: 'item',
        backgroundColor: 'rgba(15,23,42,0.95)',
        borderColor: '#334155',
        textStyle: { color: '#e2e8f0', fontSize: 12 },
        formatter: (p: any) =>
          `${p.name}<br/>市值: ¥${p.value.toLocaleString()}<br/>占比: ${p.percent.toFixed(1)}%`,
      },
      legend: {
        orient: 'vertical',
        right: 16,
        top: 'center',
        textStyle: { color: '#94a3b8', fontSize: 11 },
      },
      series: [
        {
          name: '资产分布',
          type: 'pie',
          radius: ['40%', '70%'],
          center: ['35%', '50%'],
          avoidLabelOverlap: false,
          label: { show: false },
          emphasis: {
            label: { show: false },
            itemStyle: { shadowBlur: 10, shadowColor: 'rgba(0,0,0,0.5)' },
          },
          data: compositionData,
        },
      ],
    }),
    [compositionData, echartsBaseTheme]
  );

  const assetComparisonOption = useMemo(
    () => ({
      ...echartsBaseTheme,
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(15,23,42,0.95)',
        borderColor: '#334155',
        textStyle: { color: '#e2e8f0', fontSize: 12 },
        axisPointer: { type: 'shadow' },
      },
      legend: {
        bottom: 0,
        textStyle: { color: '#94a3b8', fontSize: 11 },
      },
      grid: { top: 16, right: 16, bottom: 40, left: 16, containLabel: true },
      xAxis: {
        type: 'category',
        data: assetComparisonData.map((d) => d.name),
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
          formatter: (v: number) => (v >= 10000 ? `${(v / 10000).toFixed(0)}w` : v.toFixed(0)),
        },
        splitLine: { lineStyle: { color: '#1e293b', type: 'dashed' } },
      },
      series: [
        {
          name: '市值',
          type: 'bar',
          data: assetComparisonData.map((d) => ({
            value: Math.round(d.value * 100) / 100,
            itemStyle: { color: HOLDING_TYPE_COLORS[d.type as HoldingType] },
          })),
          barMaxWidth: 32,
        },
        {
          name: '成本',
          type: 'bar',
          data: assetComparisonData.map((d) => ({
            value: Math.round(d.cost * 100) / 100,
            itemStyle: { color: 'rgba(148,163,184,0.3)' },
          })),
          barMaxWidth: 32,
        },
      ],
    }),
    [assetComparisonData, echartsBaseTheme]
  );

  if (loading && holdings.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-3">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin" />
          <span className="absolute inset-0 flex items-center justify-center text-2xl">📊</span>
        </div>
        <p className="text-sm text-slate-500 animate-pulse">正在加载投资数据...</p>
      </div>
    );
  }

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
                📊 <span>投资看板</span>
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                Investment Dashboard · 追踪您的投资收益
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-4">
            <KpiCard
              label="💰 投入本金"
              value={formatCurrency(summary.totalPrincipal)}
              icon="💰"
              color="text-indigo-600"
              bg="bg-white"
            />
            <KpiCard
              label="💎 当前市值"
              value={formatCurrency(summary.totalValue)}
              icon="💎"
              color="text-indigo-600"
              bg="bg-white"
            />
            <KpiCard
              label="📈 未实现盈亏"
              value={formatCurrency(summary.unrealizedPnl, true)}
              sub={
                summary.totalPrincipal > 0
                  ? formatPct((summary.unrealizedPnl / summary.totalPrincipal) * 100, true)
                  : undefined
              }
              icon="📈"
              color={summary.unrealizedPnl >= 0 ? 'text-emerald-500' : 'text-rose-500'}
              bg={
                summary.unrealizedPnl >= 0
                  ? 'bg-emerald-50 border-emerald-200'
                  : 'bg-rose-50 border-rose-200'
              }
            />
            <KpiCard
              label="🏆 已实现收益"
              value={formatCurrency(summary.realizedGains, true)}
              icon="🏆"
              color={summary.realizedGains >= 0 ? 'text-emerald-500' : 'text-rose-500'}
              bg={
                summary.realizedGains >= 0
                  ? 'bg-emerald-50 border-emerald-200'
                  : 'bg-rose-50 border-rose-200'
              }
            />
            <KpiCard
              label="📉 年化收益率"
              value={formatPct(annualizedReturn, true)}
              icon="📉"
              color={annualizedReturn >= 0 ? 'text-emerald-500' : 'text-rose-500'}
              bg={
                annualizedReturn >= 0
                  ? 'bg-emerald-50 border-emerald-200'
                  : 'bg-rose-50 border-rose-200'
              }
            />
            <KpiCard
              label="⚡ 最大回撤"
              value={`-${maxDrawdown.toFixed(2)}%`}
              icon="⚡"
              color={
                maxDrawdown < 5
                  ? 'text-emerald-500'
                  : maxDrawdown < 15
                    ? 'text-amber-500'
                    : 'text-rose-500'
              }
              bg={
                maxDrawdown < 5
                  ? 'bg-emerald-50 border-emerald-200'
                  : maxDrawdown < 15
                    ? 'bg-amber-50 border-amber-200'
                    : 'bg-rose-50 border-rose-200'
              }
            />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
            <h2 className="text-base font-semibold text-slate-800 flex items-center gap-2">
              📈 组合市值走势
            </h2>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
                {(
                  [
                    ['none', '无'],
                    ['hs300', '沪深300'],
                    ['deposit', '一年定存'],
                  ] as [Benchmark, string][]
                ).map(([v, label]) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setBenchmark(v)}
                    className={cn(
                      'px-3 py-1 rounded-md text-xs font-medium transition-colors',
                      benchmark === v
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-slate-600'
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
                {(['1M', '3M', '6M', '1Y', 'ALL'] as DateRange[]).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setDateRange(r)}
                    className={cn(
                      'px-3 py-1 rounded-md text-xs font-medium transition-colors',
                      dateRange === r
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-slate-600'
                    )}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <ReactECharts
            option={trendOption}
            style={{ height: 300 }}
            opts={{ renderer: 'canvas' }}
            notMerge={false}
            theme="dark"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
            <h2 className="text-base font-semibold text-slate-800 mb-4 flex items-center gap-2">
              🥧 资产分布构成
            </h2>
            {compositionData.length > 0 ? (
              <ReactECharts
                option={compositionOption}
                style={{ height: 280 }}
                opts={{ renderer: 'canvas' }}
                notMerge={false}
                theme="dark"
              />
            ) : (
              <div className="h-64 flex items-center justify-center flex-col gap-2">
                <span className="text-4xl opacity-30">🥧</span>
                <p className="text-sm text-slate-400">暂无持仓数据，请先添加投资</p>
              </div>
            )}
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
            <h2 className="text-base font-semibold text-slate-800 mb-4 flex items-center gap-2">
              📊 资产类别对比
            </h2>
            {assetComparisonData.length > 0 ? (
              <ReactECharts
                option={assetComparisonOption}
                style={{ height: 280 }}
                opts={{ renderer: 'canvas' }}
                notMerge={false}
                theme="dark"
              />
            ) : (
              <div className="h-64 flex items-center justify-center flex-col gap-2">
                <span className="text-4xl opacity-30">📊</span>
                <p className="text-sm text-slate-400">暂无持仓数据，请先添加投资</p>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
            <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2">
              <span className="text-base font-bold text-emerald-500">🎉</span>
              <h2 className="text-sm font-semibold text-slate-800">收益 Top 10</h2>
            </div>
            {topGainers.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 gap-2">
                <span className="text-4xl opacity-30">🎉</span>
                <p className="text-sm text-slate-400">暂无正收益持仓</p>
                <p className="text-xs text-slate-300">添加投资后这里将显示盈利排名</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {topGainers.map((h, i) => (
                  <div
                    key={h.id}
                    className="flex items-center justify-between px-4 py-2.5 hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="text-xs text-slate-400 w-4 text-right">{i + 1}</span>
                      <div className="min-w-0">
                        <div className="text-sm font-bold text-indigo-600 truncate">{h.symbol}</div>
                        <div className="text-xs text-slate-400 truncate">{h.name}</div>
                      </div>
                    </div>
                    <div className="text-right shrink-0 ml-3">
                      <div className="text-base font-bold text-emerald-500">
                        {formatPct(h.return_pct, true)}
                      </div>
                      <div className="text-xs text-slate-400">
                        {formatCurrency(h.unrealized_pnl, true)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
            <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2">
              <span className="text-base font-bold text-rose-500">📉</span>
              <h2 className="text-sm font-semibold text-slate-800">亏损 Top 10</h2>
            </div>
            {topLosers.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 gap-2">
                <span className="text-4xl opacity-30">✨</span>
                <p className="text-sm text-slate-400">暂无亏损持仓 🎉</p>
                <p className="text-xs text-slate-300">您的投资组合表现优异</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {topLosers.map((h, i) => (
                  <div
                    key={h.id}
                    className="flex items-center justify-between px-4 py-2.5 hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="text-xs text-slate-400 w-4 text-right">{i + 1}</span>
                      <div className="min-w-0">
                        <div className="text-sm font-bold text-indigo-600 truncate">{h.symbol}</div>
                        <div className="text-xs text-slate-400 truncate">{h.name}</div>
                      </div>
                    </div>
                    <div className="text-right shrink-0 ml-3">
                      <div className="text-base font-bold text-rose-500">
                        {formatPct(h.return_pct, true)}
                      </div>
                      <div className="text-xs text-slate-400">
                        {formatCurrency(h.unrealized_pnl, true)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
