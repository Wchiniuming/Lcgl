import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import * as echarts from 'echarts';
import {
  getHoldings,
  getPrices,
  getSnapshots,
  Holding,
  HoldingType,
  Price,
  Snapshot,
} from '../lib/api';

type Granularity = 'day' | 'week' | 'month' | 'quarter' | 'year';
type Tab = 'timeseries' | 'holding' | 'performance';

const GRANULARITY_LABELS: Record<Granularity, string> = {
  day: '日',
  week: '周',
  month: '月',
  quarter: '季',
  year: '年',
};

function calcIRR(cashFlows: { date: string; amount: number }[]): number {
  if (cashFlows.length < 2) return 0;
  const sorted = [...cashFlows].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );
  const t0 = new Date(sorted[0].date).getTime();
  const flows: { t: number; amount: number }[] = sorted.map((cf) => ({
    t: (new Date(cf.date).getTime() - t0) / (1000 * 60 * 60 * 24 * 365.25),
    amount: cf.amount,
  }));

  const npv = (r: number) => flows.reduce((s, f) => s + f.amount / Math.pow(1 + r, f.t), 0);
  const dnpv = (r: number) =>
    flows.reduce((s, f) => s - (f.t * f.amount) / Math.pow(1 + r, f.t + 1), 0);

  let r = 0.1;
  for (let i = 0; i < 200; i++) {
    const v = npv(r);
    const dv = dnpv(r);
    if (Math.abs(dv) < 1e-12) break;
    const nr = r - v / dv;
    if (Math.abs(nr - r) < 1e-8) return nr;
    r = Math.max(-0.9999, Math.min(nr, 10));
  }
  return r;
}

type SeriesPoint = { date: string; value: number };

function aggregateSnapshots(snapshots: Snapshot[], gran: Granularity): SeriesPoint[] {
  const buckets = new Map<string, number[]>();
  for (const s of snapshots) {
    if (!s.total_assets) continue;
    const d = new Date(s.snapshot_date);
    let key: string;
    if (gran === 'day') key = s.snapshot_date.slice(0, 10);
    else if (gran === 'week') {
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(d.setDate(diff));
      key = monday.toISOString().slice(0, 10);
    } else if (gran === 'month') {
      key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    } else if (gran === 'quarter') {
      const q = Math.floor(d.getMonth() / 3) + 1;
      key = `${d.getFullYear()}Q${q}`;
    } else key = String(d.getFullYear());

    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key)!.push(s.total_assets);
  }
  return Array.from(buckets.entries()).map(([date, vals]) => ({
    date,
    value: vals.reduce((a, b) => a + b, 0) / vals.length,
  }));
}

function aggregateHoldingsByDate(holdings: Holding[], gran: Granularity): SeriesPoint[] {
  const buckets = new Map<string, number>();
  for (const h of holdings) {
    if (!h.purchase_date) continue;
    const d = new Date(h.purchase_date);
    let key: string;
    if (gran === 'day') key = h.purchase_date.slice(0, 10);
    else if (gran === 'month') {
      key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    } else if (gran === 'quarter') {
      const q = Math.floor(d.getMonth() / 3) + 1;
      key = `${d.getFullYear()}Q${q}`;
    } else if (gran === 'week') {
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(new Date(d).setDate(diff));
      key = monday.toISOString().slice(0, 10);
    } else key = String(d.getFullYear());

    buckets.set(key, (buckets.get(key) || 0) + h.current_value);
  }
  return Array.from(buckets.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, value]) => ({ date, value }));
}

interface PerformanceRow {
  symbol: string;
  name: string;
  type: HoldingType;
  cost: number;
  current: number;
  pnl: number;
  pnlPct: number;
  irr: number;
}

function calcPerformanceRows(holdings: Holding[]): {
  rows: PerformanceRow[];
  portfolioIRR: number;
} {
  const rows: PerformanceRow[] = holdings.map((h) => {
    const cashFlows = [
      {
        date: h.purchase_date || new Date().toISOString(),
        amount: -h.cost_basis,
      },
      {
        date: new Date().toISOString(),
        amount: h.current_value,
      },
    ];

    return {
      symbol: h.symbol,
      name: h.name,
      type: h.holding_type,
      cost: h.cost_basis,
      current: h.current_value,
      pnl: h.unrealized_pnl + h.realized_pnl,
      pnlPct: h.cost_basis > 0 ? ((h.current_value - h.cost_basis) / h.cost_basis) * 100 : 0,
      irr: calcIRR(cashFlows) * 100,
    };
  });

  const totalCost = holdings.reduce((s, h) => s + h.cost_basis, 0);
  const totalValue = holdings.reduce((s, h) => s + h.current_value, 0);
  const portfolioFlows = [
    { date: '2020-01-01', amount: -totalCost },
    { date: new Date().toISOString(), amount: totalValue },
  ];

  return {
    rows,
    portfolioIRR: calcIRR(portfolioFlows) * 100,
  };
}

type TxMarker = {
  date: string;
  type: 'buy' | 'sell' | 'dividend';
  price: number;
  shares: number;
};

function buildTxMarkers(h: Holding): TxMarker[] {
  const markers: TxMarker[] = [];
  try {
    if (h.notes) {
      const parsed = JSON.parse(h.notes);
      if (parsed.transactions) {
        for (const t of parsed.transactions) {
          if (t.type === 'buy') {
            markers.push({ date: t.date, type: 'buy', price: t.price, shares: t.shares });
          } else if (t.type === 'sell') {
            markers.push({ date: t.date, type: 'sell', price: t.price, shares: t.shares });
          } else if (t.type === 'dividend') {
            markers.push({
              date: t.date,
              type: 'dividend',
              price: t.price || h.current_price,
              shares: 1,
            });
          }
        }
      }
    }
  } catch {}
  return markers;
}

function fmt(v: number, prefix = '¥'): string {
  return `${v >= 0 ? prefix : '-' + prefix}${Math.abs(v).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function fmtPct(v: number): string {
  return `${v >= 0 ? '+' : ''}${v.toFixed(2)}%`;
}

function cn(...classes: (string | boolean | undefined | null)[]) {
  return classes.filter(Boolean).join(' ');
}

const CHART_BG = 'transparent';
const CHART_TEXT = '#94a3b8';
const CHART_LINE = '#475569';

function darkSplitLine() {
  return {
    splitLine: {
      lineStyle: { color: CHART_LINE, width: 0.5, type: 'dashed' as const },
    },
  };
}

function darkTooltip(): echarts.TooltipComponentOption {
  return {
    trigger: 'axis',
    backgroundColor: '#1e293b',
    borderColor: '#334155',
    textStyle: { color: '#e2e8f0', fontSize: 12 },
  };
}

export default function ProfitAnalysis() {
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [activeTab, setActiveTab] = useState<Tab>('timeseries');
  const [granularity, setGranularity] = useState<Granularity>('month');
  const [selectedHolding, setSelectedHolding] = useState<Holding | null>(null);
  const [holdingPrices, setHoldingPrices] = useState<Price[]>([]);

  const timeseriesChartRef = useRef<HTMLDivElement>(null);
  const holdingChartRef = useRef<HTMLDivElement>(null);

  const timeseriesChart = useRef<echarts.ECharts | null>(null);
  const holdingChart = useRef<echarts.ECharts | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [h, s] = await Promise.all([
        getHoldings({ includeArchived: false }),
        getSnapshots({ limit: 365 }),
      ]);
      setHoldings(h.filter((x) => !x.is_archived));
      setSnapshots(s);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (selectedHolding) {
      getPrices(selectedHolding.symbol, { limit: 365 })
        .then(setHoldingPrices)
        .catch(() => setHoldingPrices([]));
    }
  }, [selectedHolding]);

  useEffect(() => {
    const resizeCharts = () => {
      timeseriesChart.current?.resize();
      holdingChart.current?.resize();
    };
    window.addEventListener('resize', resizeCharts);
    return () => window.removeEventListener('resize', resizeCharts);
  }, []);

  useEffect(() => {
    if (!timeseriesChartRef.current) return;

    if (activeTab !== 'timeseries') {
      if (timeseriesChart.current) {
        timeseriesChart.current.dispose();
        timeseriesChart.current = null;
      }
      return;
    }

    if (timeseriesChart.current) {
      timeseriesChart.current.dispose();
    }
    timeseriesChart.current = echarts.init(timeseriesChartRef.current);
    const chart = timeseriesChart.current;

    const series = aggregateSnapshots(snapshots, granularity);
    const holdingsSeries = aggregateHoldingsByDate(holdings, granularity);

    const option = {
      backgroundColor: CHART_BG,
      tooltip: {
        ...darkTooltip(),
        formatter: (params: any) => {
          const p = params[0];
          return `${p.axisValue}<br/>${p.seriesName}: ¥${p.value.toLocaleString()}`;
        },
      },
      legend: {
        data: ['总资产', '持仓均价'],
        textStyle: { color: CHART_TEXT },
        top: 8,
      },
      grid: { top: 40, right: 20, bottom: 40, left: 60, containLabel: true },
      xAxis: {
        type: 'category',
        data: series.map((p) => p.date),
        axisLabel: { color: CHART_TEXT, fontSize: 11 },
        axisLine: { lineStyle: { color: CHART_LINE } },
        ...darkSplitLine(),
      },
      yAxis: {
        type: 'value',
        axisLabel: {
          color: CHART_TEXT,
          fontSize: 11,
          formatter: (v: number) => `¥${(v / 10000).toFixed(0)}万`,
        },
        splitLine: {
          lineStyle: { color: CHART_LINE, type: 'dashed', opacity: 0.4 },
        },
      },
      series: [
        {
          name: '总资产',
          type: 'line',
          smooth: true,
          data: series.map((p) => p.value),
          lineStyle: { color: '#4f46e5', width: 2 },
          itemStyle: { color: '#4f46e5' },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: 'rgba(79,70,229,0.15)' },
              { offset: 1, color: 'rgba(79,70,229,0)' },
            ]),
          },
        },
        {
          name: '持仓均价',
          type: 'line',
          smooth: true,
          data: holdingsSeries.map((p) => p.value),
          lineStyle: { color: '#f59e0b', width: 2, type: 'dashed' },
          itemStyle: { color: '#f59e0b' },
        },
      ],
    };

    chart.setOption(option as any, false);
  }, [snapshots, holdings, granularity, activeTab]);

  useEffect(() => {
    if (!holdingChartRef.current) return;

    if (activeTab !== 'holding') {
      if (holdingChart.current) {
        holdingChart.current.dispose();
        holdingChart.current = null;
      }
      return;
    }

    if (holdingChart.current) {
      holdingChart.current.dispose();
    }
    holdingChart.current = echarts.init(holdingChartRef.current);
    const chart = holdingChart.current;

    if (!selectedHolding || holdingPrices.length === 0) {
      chart.clear();
      return;
    }

    const markers = buildTxMarkers(selectedHolding);
    const sortedPrices = [...holdingPrices].sort(
      (a, b) => new Date(a.price_date).getTime() - new Date(b.price_date).getTime()
    );
    const dates = sortedPrices.map((p) => p.price_date.slice(0, 10));
    const prices = sortedPrices.map((p) => p.price);

    const markLineData: any[] = markers.map((m) => ({
      xAxis: m.date.slice(0, 10),
      label: {
        show: true,
        formatter: m.type === 'buy' ? '买入' : m.type === 'sell' ? '卖出' : '分红',
        color: m.type === 'buy' ? '#34d399' : m.type === 'sell' ? '#fb7185' : '#fbbf24',
        fontSize: 11,
      },
      lineStyle: {
        color: m.type === 'buy' ? '#34d399' : m.type === 'sell' ? '#fb7185' : '#fbbf24',
        type: 'dashed',
        width: 1.5,
      },
    }));

    const option = {
      backgroundColor: CHART_BG,
      tooltip: {
        ...darkTooltip(),
        formatter: (params: any) => {
          const p = params[0];
          return `${p.axisValue}<br/>价格: ¥${p.value}`;
        },
      },
      legend: {
        data: [selectedHolding.symbol],
        textStyle: { color: CHART_TEXT },
        top: 8,
      },
      grid: {
        top: 40,
        right: 20,
        bottom: markers.length > 0 ? 60 : 40,
        left: 60,
        containLabel: true,
      },
      xAxis: {
        type: 'category',
        data: dates,
        axisLabel: { color: CHART_TEXT, fontSize: 11 },
        axisLine: { lineStyle: { color: CHART_LINE } },
        ...darkSplitLine(),
      },
      yAxis: {
        type: 'value',
        axisLabel: {
          color: CHART_TEXT,
          fontSize: 11,
          formatter: (v: number) => `¥${v}`,
        },
        splitLine: {
          lineStyle: { color: CHART_LINE, type: 'dashed', opacity: 0.4 },
        },
      },
      series: [
        {
          name: selectedHolding.symbol,
          type: 'line',
          smooth: true,
          data: prices,
          lineStyle: { color: '#4f46e5', width: 2 },
          itemStyle: { color: '#4f46e5' },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: 'rgba(79,70,229,0.15)' },
              { offset: 1, color: 'rgba(79,70,229,0)' },
            ]),
          },
          markLine: {
            silent: true,
            symbol: 'none',
            data: markLineData,
          },
        },
      ],
    };

    chart.setOption(option as any, false);
  }, [selectedHolding, holdingPrices, activeTab]);

  const timeSeriesData = useMemo(
    () => aggregateSnapshots(snapshots, granularity),
    [snapshots, granularity]
  );
  const { rows: perfRows, portfolioIRR } = useMemo(() => calcPerformanceRows(holdings), [holdings]);

  const totalPnl = useMemo(
    () => holdings.reduce((s, h) => s + h.unrealized_pnl + h.realized_pnl, 0),
    [holdings]
  );
  const totalCost = useMemo(() => holdings.reduce((s, h) => s + h.cost_basis, 0), [holdings]);
  const totalValue = useMemo(() => holdings.reduce((s, h) => s + h.current_value, 0), [holdings]);
  const totalPct = totalCost > 0 ? (totalPnl / totalCost) * 100 : 0;

  const profitMessage =
    totalPnl > 0 && totalCost > 0
      ? `今日收益不错，总收益率 ${totalPct >= 0 ? '+' : ''}${totalPct.toFixed(2)}% 🎉`
      : totalPnl > 0
        ? '投资收益为正，继续保持！💪'
        : '市场波动是正常的，长期坚持是关键 📈';

  const HOLDING_TYPE_LABELS: Record<HoldingType, string> = {
    stock: '股票',
    fund: '基金',
    bond: '债券',
    bank_financial: '银行理财',
    precious_metal: '贵金属',
    other: '其他',
  };

  if (loading && holdings.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-3">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin" />
          <span className="absolute inset-0 flex items-center justify-center text-2xl">💹</span>
        </div>
        <p className="text-sm text-slate-500 animate-pulse">正在分析您的收益数据...</p>
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
                📈 <span>收益分析</span>
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                Profit & Loss Analysis · 深度解读投资收益
              </p>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-3 mt-4">
            {[
              { label: '💎 总市值', value: totalValue, color: 'text-indigo-600', accent: true },
              { label: '💰 成本总额', value: totalCost, color: 'text-slate-600' },
              {
                label: '📈 总盈亏',
                value: totalPnl,
                color: totalPnl >= 0 ? 'text-emerald-500' : 'text-rose-500',
                accent: true,
              },
              {
                label: '🎯 总收益率',
                value: totalPct,
                color: totalPct >= 0 ? 'text-emerald-500' : 'text-rose-500',
                accent: true,
                isPct: true,
              },
            ].map((item, i) => (
              <div
                key={i}
                className="bg-white border border-slate-200 rounded-xl px-4 py-3 shadow-sm"
              >
                <div className="text-xs text-slate-400 mb-1">{item.label}</div>
                <div
                  className={`${item.accent ? 'text-xl font-bold' : 'text-base font-semibold'} ${item.color}`}
                >
                  {item.isPct ? fmtPct(item.value) : fmt(item.value)}
                </div>
              </div>
            ))}
          </div>
          {totalCost > 0 && (
            <div className="mt-3 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-50 to-emerald-50 border border-indigo-100">
              <span className="text-base">{totalPnl > 0 ? '🎉' : '💡'}</span>
              <p className="text-sm text-indigo-700 font-semibold">{profitMessage}</p>
            </div>
          )}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {error && (
          <div className="mb-4 text-sm text-rose-500 bg-rose-50 border border-rose-200 rounded-lg px-4 py-3">
            ⚠️ {error}
          </div>
        )}

        <div className="flex gap-1 mb-6 bg-white border border-slate-200 p-1 rounded-xl w-fit flex-wrap shadow-sm">
          {(
            [
              ['timeseries', '📈 时间序列'],
              ['holding', '💼 持仓详情'],
              ['performance', '🏆 绩效指标'],
            ] as [Tab, string][]
          ).map(([tab, label]) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={cn(
                'px-5 py-2 rounded-lg text-sm font-medium transition-all duration-200',
                activeTab === tab
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {activeTab === 'timeseries' && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 font-medium">⏱️ 时间粒度:</span>
              <div className="flex gap-1 bg-white border border-slate-200 p-1 rounded-lg shadow-sm">
                {(Object.keys(GRANULARITY_LABELS) as Granularity[]).map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setGranularity(g)}
                    className={cn(
                      'px-3 py-1 rounded text-xs font-medium transition-colors',
                      granularity === g
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'text-slate-500 hover:text-slate-700'
                    )}
                  >
                    {GRANULARITY_LABELS[g]}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
              <div ref={timeseriesChartRef} style={{ width: '100%', height: 340 }} />
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50">
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        📅 时间
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        💎 总资产 (¥)
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        📊 持仓均价 (¥)
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {[...timeSeriesData].reverse().map((p, i) => (
                      <tr key={i} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{p.date}</td>
                        <td className="px-4 py-3 text-right text-slate-800 font-semibold text-base whitespace-nowrap">
                          ¥{p.value.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-3 text-right text-amber-500 font-semibold whitespace-nowrap">
                          ¥
                          {aggregateHoldingsByDate(holdings, granularity)[i]?.value.toLocaleString(
                            'en-US',
                            { minimumFractionDigits: 2 }
                          ) ?? '-'}
                        </td>
                      </tr>
                    ))}
                    {timeSeriesData.length === 0 && (
                      <tr>
                        <td colSpan={3} className="text-center py-16">
                          <div className="text-4xl mb-2 opacity-30">📊</div>
                          <div className="text-sm text-slate-500">暂无数据</div>
                          <div className="text-xs text-slate-400 mt-1">
                            请先在资产负债管理中创建快照
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'holding' && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-xs text-slate-500 font-medium">💼 选择持仓:</span>
              <div className="flex gap-2 flex-wrap">
                {holdings.map((h) => (
                  <button
                    key={h.id}
                    type="button"
                    onClick={() => setSelectedHolding(h)}
                    className={cn(
                      'px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors border',
                      selectedHolding?.id === h.id
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300'
                    )}
                  >
                    {h.symbol}
                  </button>
                ))}
              </div>
            </div>

            {selectedHolding ? (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    {
                      label: '💰 当前价',
                      value: `¥${selectedHolding.current_price.toFixed(3)}`,
                      color: 'text-indigo-600',
                      accent: true,
                    },
                    {
                      label: '📊 持仓数量',
                      value: selectedHolding.shares.toFixed(4),
                      color: 'text-slate-600',
                    },
                    {
                      label: '💹 未实现盈亏',
                      value: fmt(selectedHolding.unrealized_pnl),
                      color:
                        selectedHolding.unrealized_pnl >= 0 ? 'text-emerald-500' : 'text-rose-500',
                      accent: true,
                    },
                    {
                      label: '🎯 持仓收益率',
                      value: fmtPct(
                        selectedHolding.cost_basis > 0
                          ? ((selectedHolding.current_value - selectedHolding.cost_basis) /
                              selectedHolding.cost_basis) *
                              100
                          : 0
                      ),
                      color:
                        selectedHolding.current_value - selectedHolding.cost_basis >= 0
                          ? 'text-emerald-500'
                          : 'text-rose-500',
                      accent: true,
                    },
                  ].map((item, i) => (
                    <div
                      key={i}
                      className="bg-white border border-slate-200 rounded-xl px-3 py-2 shadow-sm"
                    >
                      <div className="text-xs text-slate-400 mb-1">{item.label}</div>
                      <div
                        className={`${item.accent ? 'text-lg font-bold' : 'text-sm font-semibold'} ${item.color}`}
                      >
                        {item.value}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
                  <div ref={holdingChartRef} style={{ width: '100%', height: 340 }} />
                  {holdingPrices.length === 0 && (
                    <div className="text-center text-slate-400 text-sm py-8 flex flex-col items-center gap-2">
                      <span className="text-3xl opacity-30">📉</span>
                      暂无历史价格数据
                    </div>
                  )}
                </div>

                <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
                  <h3 className="text-sm font-semibold text-slate-600 mb-3">📋 交易记录</h3>
                  <div className="space-y-2">
                    {buildTxMarkers(selectedHolding).map((m, i) => (
                      <div key={i} className="flex items-center gap-3 text-xs">
                        <span className="w-20 flex-shrink-0 text-slate-400">{m.date}</span>
                        <span
                          className={cn(
                            'font-semibold w-12',
                            m.type === 'buy'
                              ? 'text-emerald-500'
                              : m.type === 'sell'
                                ? 'text-rose-500'
                                : 'text-amber-500'
                          )}
                        >
                          {m.type === 'buy' ? '买入' : m.type === 'sell' ? '卖出' : '分红'}
                        </span>
                        <span className="text-slate-600">
                          {m.type !== 'dividend' ? `${m.shares}股 @ ¥${m.price}` : `¥${m.price}`}
                        </span>
                      </div>
                    ))}
                    {buildTxMarkers(selectedHolding).length === 0 && (
                      <div className="text-slate-400 text-xs text-center py-4">暂无交易记录</div>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <div className="bg-white border border-slate-200 rounded-2xl p-16 text-center shadow-sm">
                <div className="text-5xl mb-4 opacity-40">💼</div>
                <div className="text-base font-medium text-slate-500">请从上方选择一个持仓</div>
                <div className="text-sm text-slate-400 mt-2">点击持仓代码查看详细分析</div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'performance' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="bg-white border border-slate-200 rounded-xl px-4 py-3 shadow-sm">
                <div className="text-xs text-slate-400 mb-1">🎯 组合 IRR</div>
                <div
                  className={cn(
                    'text-2xl font-bold',
                    portfolioIRR >= 0 ? 'text-emerald-500' : 'text-rose-500'
                  )}
                >
                  {fmtPct(portfolioIRR)}
                </div>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl px-4 py-3 shadow-sm">
                <div className="text-xs text-slate-400 mb-1">💰 成本总额</div>
                <div className="text-2xl font-bold text-indigo-600">
                  ¥{totalCost.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </div>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl px-4 py-3 shadow-sm">
                <div className="text-xs text-slate-400 mb-1">📊 基准对比</div>
                <div className="text-xl font-semibold text-slate-400">暂无</div>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50">
                      {[
                        '💼 代码',
                        '📝 名称',
                        '🏷️ 类型',
                        '💰 成本(¥)',
                        '📊 市值(¥)',
                        '💹 盈亏(¥)',
                        '📈 收益率',
                        '🎯 IRR',
                      ].map((h, idx) => (
                        <th
                          key={idx}
                          className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {perfRows.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="text-center py-16">
                          <div className="text-4xl mb-2 opacity-30">📊</div>
                          <div className="text-sm text-slate-500">暂无持仓数据</div>
                        </td>
                      </tr>
                    ) : (
                      perfRows.map((r, i) => (
                        <tr key={i} className="hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-3 font-bold text-indigo-600 whitespace-nowrap">
                            {r.symbol}
                          </td>
                          <td className="px-4 py-3 text-slate-600 max-w-32 truncate">{r.name}</td>
                          <td className="px-4 py-3">
                            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">
                              {HOLDING_TYPE_LABELS[r.type]}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                            ¥{r.cost.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="px-4 py-3 text-slate-800 font-semibold whitespace-nowrap">
                            ¥{r.current.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </td>
                          <td
                            className={cn(
                              'px-4 py-3 whitespace-nowrap font-bold text-base',
                              r.pnl >= 0 ? 'text-emerald-500' : 'text-rose-500'
                            )}
                          >
                            {fmtPct(r.pnlPct)}
                            <span className="text-xs ml-1 opacity-70">({fmt(r.pnl)})</span>
                          </td>
                          <td
                            className={cn(
                              'px-4 py-3 whitespace-nowrap font-bold text-base',
                              r.pnlPct >= 0 ? 'text-emerald-500' : 'text-rose-500'
                            )}
                          >
                            {fmtPct(r.pnlPct)}
                          </td>
                          <td
                            className={cn(
                              'px-4 py-3 whitespace-nowrap font-semibold',
                              r.irr >= 0 ? 'text-emerald-500' : 'text-rose-500'
                            )}
                          >
                            {fmtPct(r.irr)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
