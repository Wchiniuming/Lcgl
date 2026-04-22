// ─── Shared Dashboard Widget Renderer ─────────────────────────────────────────
// Used by both Dashboard.tsx and CustomDashboard.tsx

import { useCallback } from 'react';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';
import * as echarts from 'echarts';
import type {
  Account,
  Holding,
  Insurance,
  Transaction,
  Snapshot,
  AccountCategory,
} from '../lib/api';
import type { WidgetConfig } from '../lib/dashboard-constants';

// ─── Types ─────────────────────────────────────────────────────────────────────

export type WidgetType =
  | 'kpi_networth'
  | 'kpi_assets'
  | 'kpi_liabilities'
  | 'kpi_debt_ratio'
  | 'kpi_cashflow'
  | 'kpi_investment_value'
  | 'kpi_investment_return'
  | 'chart_asset_dist'
  | 'chart_liability'
  | 'chart_trend'
  | 'chart_invest_return'
  | 'chart_holdings_rank'
  | 'table_transactions'
  | 'table_reminders'
  | 'accounts_list'
  | 'liabilities_list'
  | 'asset_allocation'
  | 'liability_structure'
  | 'cashflow_trend'
  | 'profit_summary'
  | 'holdings_overview'
  | 'holdings_performance'
  | 'insurance_summary';

export interface WidgetProps {
  type: WidgetType;
  widget?: WidgetConfig;
  netWorth: number;
  totalAssets: number;
  totalLiabilities: number;
  debtToAsset: number;
  accounts: Account[];
  holdings: Holding[];
  insurances: Insurance[];
  transactions: Transaction[];
  snapshots: Snapshot[];
  categories: AccountCategory[];
  allHoldings: Holding[];
  totalInvested: number;
  totalUnrealizedPnl: number;
  monthlyCashFlow: number;
  totalPremium: number;
  totalCoverage: number;
  activeInsuranceCount: number;
  accountsReceivable: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  trendRange: '1M' | '3M' | '6M' | '1Y' | 'ALL';
  setTrendRange: (r: '1M' | '3M' | '6M' | '1Y' | 'ALL') => void;
  assetDrillLevel: number;
  setAssetDrillLevel: (l: number) => void;
  selectedCategoryId: number | null;
  setSelectedCategoryId: (id: number | null) => void;
}

// ─── Icon Components ───────────────────────────────────────────────────────────

function IconTrendUp() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
      <polyline points="17 6 23 6 23 12" />
    </svg>
  );
}

function IconTrendDown() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="23 18 13.5 8.5 8.5 13.5 1 6" />
      <polyline points="17 18 23 18 23 12" />
    </svg>
  );
}

function IconArrowLeft() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <line x1="19" y1="12" x2="5" y2="12" />
      <polyline points="12 19 5 12 12 5" />
    </svg>
  );
}

function IconBuilding() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="4" y="2" width="16" height="20" rx="2" ry="2" />
      <line x1="9" y1="22" x2="9" y2="2" />
      <line x1="15" y1="22" x2="15" y2="2" />
      <line x1="4" y1="7" x2="20" y2="7" />
      <line x1="4" y1="12" x2="20" y2="12" />
      <line x1="4" y1="17" x2="20" y2="17" />
    </svg>
  );
}

function IconPiggy() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M19 5c-1.5 0-2.8 1.4-3 2-3.5-1.5-11-.3-11 5 0 1.8 0 3 2 4.5V20h4v-2h3v2h4v-4c1-.5 1.7-1 2-2h2v-4h-2c0-1-.5-1.5-1-2V5z" />
      <path d="M2 9v1c0 1.1.9 2 2 2h1" />
      <circle cx="13" cy="9" r="1" />
    </svg>
  );
}

function IconCard() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
      <line x1="1" y1="10" x2="23" y2="10" />
    </svg>
  );
}

function IconChart() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  );
}

// ─── KpiCard Component ─────────────────────────────────────────────────────────

function KpiCard({
  label,
  value,
  icon,
  gradientFrom,
  gradientTo,
  shadowColor,
  trend,
  subValue,
  subLabel,
  size = 'normal',
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  gradientFrom: string;
  gradientTo: string;
  shadowColor: string;
  trend?: number;
  subValue?: string;
  subLabel?: string;
  size?: 'normal' | 'xl';
}) {
  return (
    <div
      className="relative overflow-hidden rounded-2xl p-5 text-white shadow-lg"
      style={{
        background: `linear-gradient(135deg, ${gradientFrom}, ${gradientTo})`,
        boxShadow: `0 8px 32px -8px ${shadowColor}`,
      }}
    >
      <div className="absolute top-0 right-0 w-32 h-32 opacity-10 -translate-y-8 translate-x-8">
        {icon}
      </div>
      <div className="relative">
        <div className="flex items-center gap-2 mb-2">
          <div className="opacity-80">{icon}</div>
          <p className="text-sm font-medium opacity-90">{label}</p>
          {trend !== undefined && (
            <span className="ml-auto flex items-center gap-0.5 text-xs font-semibold px-1.5 py-0.5 rounded-md bg-white/20">
              {trend >= 0 ? <IconTrendUp /> : <IconTrendDown />}
              {Math.abs(trend).toFixed(1)}%
            </span>
          )}
        </div>
        <p
          className={`${size === 'xl' ? 'text-4xl font-black tracking-tighter leading-none' : 'text-2xl font-bold'} tracking-tight truncate`}
        >
          {value}
        </p>
        {subValue && (
          <div className="mt-2 pt-2 border-t border-white/20">
            <p className="text-xs opacity-70">{subLabel ?? '较上期'}</p>
            <p className="text-sm font-semibold">{subValue}</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── ChartCard Component ───────────────────────────────────────────────────────

function ChartCard({
  title,
  children,
  action,
}: {
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
        <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
        {action}
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

// ─── Widget Renderer ────────────────────────────────────────────────────────────

export function renderWidget(
  type: WidgetType,
  widget: WidgetConfig | undefined,
  props: WidgetProps
): React.ReactNode {
  const {
    netWorth,
    totalAssets,
    totalLiabilities,
    debtToAsset,
    monthlyCashFlow,
    monthlyIncome,
    monthlyExpenses,
    totalInvested,
    totalUnrealizedPnl,
    trendRange,
    setTrendRange,
    assetDrillLevel,
    setAssetDrillLevel,
    selectedCategoryId,
    setSelectedCategoryId,
    accounts,
    holdings,
    insurances,
    transactions,
    snapshots,
    categories,
  } = props;

  const cashFlowPositive = monthlyCashFlow >= 0;
  const liabilityAccounts = accounts.filter((a) => a.type === 'liability');
  const totalPremium = insurances
    .filter((i) => i.is_active)
    .reduce((s, i) => s + (i.premium || 0), 0);
  const totalCoverage = insurances
    .filter((i) => i.is_active)
    .reduce((s, i) => s + (i.coverage_amount || 0), 0);
  const activeInsuranceCount = insurances.filter(
    (i) => i.is_active && i.status === 'active'
  ).length;
  const renewalSoon = insurances.filter((i) => {
    if (!i.renewal_date || !i.is_active) return false;
    const today = new Date();
    const renewal = new Date(i.renewal_date);
    const daysUntil = Math.ceil((renewal.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return daysUntil > 0 && daysUntil <= 30;
  }).length;
  const totalMarketValue = holdings.reduce((s, h) => s + h.current_value, 0);

  // ─── ECharts Option Builders ────────────────────────────────────────────────

  const getAssetDonutOption = useCallback((): EChartsOption => {
    const assetAccounts = accounts.filter((a) => a.type === 'asset');

    if (assetDrillLevel === 0) {
      const catMap = new Map<number, { name: string; value: number; color: string }>();
      for (const acct of assetAccounts) {
        const cat = categories.find((c) => c.id === acct.category_id);
        const parentId = cat?.parent_id ?? acct.category_id;
        const parentCat = categories.find((c) => c.id === parentId);
        const name = parentCat?.name ?? cat?.name ?? '其他';
        const color = parentCat?.color ?? cat?.color ?? '#64748b';
        const existing = catMap.get(parentId);
        if (existing) existing.value += acct.balance;
        else catMap.set(parentId, { name, value: acct.balance, color });
      }
      const data = Array.from(catMap.values());

      return {
        tooltip: {
          trigger: 'item',
          formatter: (params: unknown) => {
            const p = params as { name: string; value: number; percent: number };
            return `${p.name}: ¥${p.value.toLocaleString('zh-CN', { maximumFractionDigits: 2 })} (${p.percent.toFixed(1)}%)`;
          },
        },
        legend: { show: false },
        graphic: [] as unknown as EChartsOption['graphic'],
        series: [
          {
            type: 'pie',
            radius: ['52%', '78%'],
            center: ['50%', '50%'],
            data: data.map((d) => ({
              name: d.name,
              value: d.value,
              itemStyle: { color: d.color },
            })),
            label: { show: true, formatter: '{b}: {d}%', fontSize: 11, color: '#475569' },
            emphasis: {
              itemStyle: { shadowBlur: 10, shadowOffsetX: 0, shadowColor: 'rgba(0,0,0,0.2)' },
            },
          },
        ],
      };
    }

    const subAccounts = assetAccounts.filter((acct) => {
      const cat = categories.find((c) => c.id === acct.category_id);
      const parentId = cat?.parent_id ?? acct.category_id;
      return parentId === selectedCategoryId;
    });
    const data = subAccounts.map((acct) => {
      const cat = categories.find((c) => c.id === acct.category_id);
      return {
        name: acct.name,
        value: acct.balance,
        itemStyle: { color: cat?.color ?? '#64748b' },
      };
    });
    return {
      tooltip: {
        trigger: 'item',
        formatter: (params: unknown) => {
          const p = params as { name: string; value: number; percent: number };
          return `${p.name}: ¥${p.value.toLocaleString('zh-CN', { maximumFractionDigits: 2 })} (${p.percent.toFixed(1)}%)`;
        },
      },
      legend: { show: false },
      graphic: [] as unknown as EChartsOption['graphic'],
      series: [
        {
          type: 'pie',
          radius: ['42%', '68%'],
          center: ['50%', '50%'],
          data,
          label: { show: true, formatter: '{b}: ¥{c}', fontSize: 11, color: '#475569' },
          emphasis: {
            itemStyle: { shadowBlur: 10, shadowOffsetX: 0, shadowColor: 'rgba(0,0,0,0.2)' },
          },
        },
      ],
    };
  }, [accounts, categories, totalAssets, assetDrillLevel, selectedCategoryId]);

  const handleAssetDonutClick = useCallback(
    (params: unknown) => {
      if (assetDrillLevel === 0) {
        const p = params as { name?: string; dataIndex?: number };
        const assetAccounts = accounts.filter((a) => a.type === 'asset');
        const catMap = new Map<number, { name: string; value: number }>();
        for (const acct of assetAccounts) {
          const cat = categories.find((c) => c.id === acct.category_id);
          const parentId = cat?.parent_id ?? acct.category_id;
          const parentCat = categories.find((c) => c.id === parentId);
          const name = parentCat?.name ?? cat?.name ?? '其他';
          const existing = catMap.get(parentId);
          if (existing) existing.value += acct.balance;
          else catMap.set(parentId, { name, value: acct.balance });
        }
        const catIds = Array.from(catMap.keys());
        if (p.dataIndex !== undefined && catIds[p.dataIndex] !== undefined) {
          setSelectedCategoryId(catIds[p.dataIndex]);
          setAssetDrillLevel(1);
        }
      }
    },
    [assetDrillLevel, accounts, categories, setSelectedCategoryId, setAssetDrillLevel]
  );

  const longTermLiab = liabilityAccounts.filter((a) => (a.term_months ?? 0) > 12);
  const shortTermLiab = liabilityAccounts.filter((a) => (a.term_months ?? 0) <= 12);
  const longTermTotal = longTermLiab.reduce((s, a) => s + a.balance, 0);
  const shortTermTotal = shortTermLiab.reduce((s, a) => s + a.balance, 0);

  const lgRed = new echarts.graphic.LinearGradient(0, 0, 0, 1, [
    { offset: 0, color: '#f43f5e' },
    { offset: 1, color: '#fb7185' },
  ]);
  const lgOrange = new echarts.graphic.LinearGradient(0, 0, 0, 1, [
    { offset: 0, color: '#f97316' },
    { offset: 1, color: '#fb923c' },
  ]);

  const liabilityBarOption: EChartsOption = {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (params: unknown) => {
        const ps = params as { name: string; value: number; seriesName: string }[];
        return ps
          .map(
            (p) =>
              `${p.seriesName}: ¥${p.value.toLocaleString('zh-CN', { maximumFractionDigits: 2 })}`
          )
          .join('<br/>');
      },
    },
    grid: { left: '3%', right: '4%', bottom: '3%', top: '8%', containLabel: true },
    xAxis: {
      type: 'category',
      data: ['长期负债', '短期负债'],
      axisLabel: { fontSize: 12, color: '#64748b' },
      axisLine: { lineStyle: { color: '#e2e8f0' } },
    },
    yAxis: {
      type: 'value',
      axisLabel: {
        formatter: (v: number) => `¥${(v / 10000).toFixed(0)}万`,
        fontSize: 11,
        color: '#94a3b8',
      },
      splitLine: { lineStyle: { color: '#f1f5f9' } },
    },
    series: [
      {
        name: '负债金额',
        type: 'bar',
        barWidth: '40%',
        data: [
          {
            value: longTermTotal,
            itemStyle: { color: lgRed },
            label: {
              show: true,
              position: 'top',
              formatter: `¥${longTermTotal.toLocaleString('zh-CN', { maximumFractionDigits: 0 })}`,
              fontSize: 11,
              color: '#e11d48',
            },
          },
          {
            value: shortTermTotal,
            itemStyle: { color: lgOrange },
            label: {
              show: true,
              position: 'top',
              formatter: `¥${shortTermTotal.toLocaleString('zh-CN', { maximumFractionDigits: 0 })}`,
              fontSize: 11,
              color: '#ea580c',
            },
          },
        ],
      },
    ],
  };

  const liabWithRates = liabilityAccounts.filter((a) => a.interest_rate != null);
  const rateLabelData = liabWithRates.slice(0, 5).map((a) => ({
    name: a.name.length > 8 ? a.name.slice(0, 8) + '\u2026' : a.name,
    rate: a.interest_rate!,
    balance: a.balance,
  }));

  const getTrendOption = useCallback((): EChartsOption => {
    const now = new Date();
    let months = 6;
    if (trendRange === '3M') months = 3;
    else if (trendRange === '1Y') months = 12;

    const labels: string[] = [];
    const assetSeries: number[] = [];
    const liabSeries: number[] = [];
    const netSeries: number[] = [];

    const snapshotMap = new Map<string, Snapshot>();
    for (const s of snapshots) {
      snapshotMap.set(s.snapshot_date.slice(0, 7), s);
    }

    for (let i = months - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = d.toISOString().slice(0, 7);
      labels.push(`${d.getMonth() + 1}月`);

      const snap = snapshotMap.get(key);
      if (snap) {
        assetSeries.push(snap.total_assets ?? totalAssets);
        liabSeries.push(snap.total_liabilities ?? totalLiabilities);
        netSeries.push((snap.total_assets ?? 0) - (snap.total_liabilities ?? 0));
      } else {
        const variation = 1 + Math.sin(i * 1.3) * 0.03;
        assetSeries.push(totalAssets * variation);
        liabSeries.push(totalLiabilities * variation);
        netSeries.push(netWorth * variation);
      }
    }

    return {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'cross', label: { backgroundColor: '#1e293b' } },
        formatter: (params: unknown) => {
          const ps = params as {
            axisValue: string;
            seriesName: string;
            value: number;
            color: string;
          }[];
          let html = `<div style="font-weight:600;margin-bottom:4px">${ps[0].axisValue}</div>`;
          for (const p of ps) {
            html += `<div style="display:flex;align-items:center;gap:6px;margin:2px 0">
              <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${p.color}"></span>
              <span style="color:#64748b">${p.seriesName}</span>
              <span style="margin-left:auto;font-weight:600">¥${p.value.toLocaleString('zh-CN', { maximumFractionDigits: 0 })}</span>
            </div>`;
          }
          return html;
        },
      },
      legend: {
        data: ['总资产', '总负债', '净资产'],
        bottom: 0,
        textStyle: { fontSize: 12, color: '#64748b' },
      },
      grid: { left: '3%', right: '4%', bottom: '18%', top: '8%', containLabel: true },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: labels,
        axisLine: { lineStyle: { color: '#e2e8f0' } },
        axisLabel: { fontSize: 12, color: '#94a3b8' },
      },
      yAxis: {
        type: 'value',
        axisLabel: {
          formatter: (v: number) => `¥${(v / 10000).toFixed(0)}万`,
          fontSize: 11,
          color: '#94a3b8',
        },
        splitLine: { lineStyle: { color: '#f1f5f9' } },
      },
      series: [
        {
          name: '总资产',
          type: 'line',
          smooth: true,
          data: assetSeries,
          lineStyle: { color: '#10b981', width: 2.5 },
          itemStyle: { color: '#10b981' },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: 'rgba(16,185,129,0.15)' },
              { offset: 1, color: 'rgba(16,185,129,0)' },
            ]),
          },
        },
        {
          name: '总负债',
          type: 'line',
          smooth: true,
          data: liabSeries,
          lineStyle: { color: '#f43f5e', width: 2.5 },
          itemStyle: { color: '#f43f5e' },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: 'rgba(244,63,94,0.1)' },
              { offset: 1, color: 'rgba(244,63,94,0)' },
            ]),
          },
        },
        {
          name: '净资产',
          type: 'line',
          smooth: true,
          data: netSeries,
          lineStyle: { color: '#4f46e5', width: 2.5, type: 'dashed' },
          itemStyle: { color: '#4f46e5' },
        },
      ],
    };
  }, [trendRange, snapshots, totalAssets, totalLiabilities, netWorth]);

  // ─── Widget Branches ─────────────────────────────────────────────────────────

  if (type === 'kpi_networth') {
    return (
      <KpiCard
        label="净资产"
        value={`¥${netWorth.toLocaleString('zh-CN', { maximumFractionDigits: 2 })}`}
        icon={<IconPiggy />}
        gradientFrom="#4f46e5"
        gradientTo="#6366f1"
        shadowColor="rgba(99,102,241,0.45)"
        trend={2.3}
        subValue={`¥${totalAssets.toLocaleString('zh-CN', { maximumFractionDigits: 0 })} - ¥${totalLiabilities.toLocaleString('zh-CN', { maximumFractionDigits: 0 })}`}
        subLabel="资产 - 负债"
      />
    );
  }
  if (type === 'kpi_assets') {
    return (
      <>
        <KpiCard
          label="总资产"
          value={`¥${totalAssets.toLocaleString('zh-CN', { maximumFractionDigits: 2 })}`}
          icon={<IconBuilding />}
          gradientFrom="#10b981"
          gradientTo="#059669"
          shadowColor="rgba(16,185,129,0.35)"
          trend={3.1}
          size="xl"
          subValue={`${accounts.filter((a) => a.type === 'asset').length} 个资产账户`}
          subLabel="账户数量"
        />
        <KpiCard
          label="总负债"
          value={`¥${totalLiabilities.toLocaleString('zh-CN', { maximumFractionDigits: 2 })}`}
          icon={<IconCard />}
          gradientFrom="#f43f5e"
          gradientTo="#e11d48"
          shadowColor="rgba(244,63,94,0.35)"
          trend={-1.2}
          size="xl"
          subValue={`${accounts.filter((a) => a.type === 'liability').length} 个负债账户`}
          subLabel="账户数量"
        />
      </>
    );
  }
  if (type === 'kpi_liabilities') {
    return null;
  }
  if (type === 'kpi_debt_ratio') {
    return (
      <KpiCard
        label="负债资产比"
        value={`${debtToAsset.toFixed(1)}%`}
        icon={<IconChart />}
        gradientFrom="#8b5cf6"
        gradientTo="#7c3aed"
        shadowColor="rgba(139,92,246,0.35)"
        subValue={debtToAsset < 50 ? '健康' : debtToAsset < 80 ? '警戒' : '危险'}
        subLabel="财务状况"
      />
    );
  }
  if (type === 'kpi_cashflow') {
    return (
      <KpiCard
        label="月现金流"
        value={`¥${monthlyCashFlow.toLocaleString('zh-CN', { maximumFractionDigits: 2 })}`}
        icon={<IconTrendUp />}
        gradientFrom={cashFlowPositive ? '#0ea5e9' : '#f97316'}
        gradientTo={cashFlowPositive ? '#0284c7' : '#ea580c'}
        shadowColor={cashFlowPositive ? 'rgba(14,165,233,0.35)' : 'rgba(249,115,22,0.35)'}
        subValue={`收入¥${monthlyIncome.toLocaleString('zh-CN', { maximumFractionDigits: 0 })} / 支出¥${monthlyExpenses.toLocaleString('zh-CN', { maximumFractionDigits: 0 })}`}
        subLabel="本月收支"
      />
    );
  }
  if (type === 'kpi_investment_value') {
    return (
      <KpiCard
        label="投资总额"
        value={`¥${totalMarketValue.toLocaleString('zh-CN', { maximumFractionDigits: 2 })}`}
        icon={<IconChart />}
        gradientFrom="#6366f1"
        gradientTo="#4f46e5"
        shadowColor="rgba(99,102,241,0.35)"
        subValue={`¥${totalUnrealizedPnl >= 0 ? '+' : ''}${totalUnrealizedPnl.toLocaleString('zh-CN', { maximumFractionDigits: 0 })}`}
        subLabel="未实现收益"
      />
    );
  }
  if (type === 'kpi_investment_return') {
    return (
      <KpiCard
        label="投资收益"
        value={`¥${totalUnrealizedPnl.toLocaleString('zh-CN', { maximumFractionDigits: 2 })}`}
        icon={<IconChart />}
        gradientFrom={totalUnrealizedPnl >= 0 ? '#10b981' : '#f43f5e'}
        gradientTo={totalUnrealizedPnl >= 0 ? '#059669' : '#e11d48'}
        shadowColor={totalUnrealizedPnl >= 0 ? 'rgba(16,185,129,0.35)' : 'rgba(244,63,94,0.35)'}
        subValue={`成本 ¥${totalInvested.toLocaleString('zh-CN', { maximumFractionDigits: 0 })}`}
        subLabel="投资成本"
      />
    );
  }
  if (type === 'chart_asset_dist' || type === 'asset_allocation') {
    return (
      <ChartCard
        title={widget?.title || '资产分布'}
        action={
          assetDrillLevel === 1 ? (
            <button
              type="button"
              onClick={() => setAssetDrillLevel(0)}
              className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800 transition-colors"
            >
              <IconArrowLeft />
              <span>返回总览</span>
            </button>
          ) : undefined
        }
      >
        <ReactECharts
          option={getAssetDonutOption()}
          style={{ height: 280 }}
          onEvents={{ click: handleAssetDonutClick }}
          opts={{ renderer: 'canvas' }}
        />
        <p className="text-center text-xs text-slate-400 mt-1">
          {assetDrillLevel === 0
            ? '点击类别查看子类别明细 →'
            : `查看中: ${categories.find((c) => c.id === selectedCategoryId)?.name ?? ''} 子类别`}
        </p>
      </ChartCard>
    );
  }
  if (type === 'chart_liability' || type === 'liability_structure') {
    return (
      <ChartCard title={widget?.title || '负债结构（按期限）'}>
        <ReactECharts
          option={liabilityBarOption}
          style={{ height: 280 }}
          opts={{ renderer: 'canvas' }}
        />
        {rateLabelData.length > 0 && (
          <div className="mt-2 space-y-1">
            {rateLabelData.map((r) => (
              <div
                key={r.name}
                className="flex items-center justify-between text-xs px-2 py-1 rounded-lg bg-slate-50"
              >
                <span className="text-slate-600 truncate">{r.name}</span>
                <span className="text-amber-600 font-semibold ml-2">
                  利率: {r.rate.toFixed(2)}%
                </span>
              </div>
            ))}
          </div>
        )}
      </ChartCard>
    );
  }
  if (type === 'chart_trend' || type === 'cashflow_trend') {
    return (
      <ChartCard
        title={widget?.title || '资产负债趋势'}
        action={
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
            {(['3M', '6M', '1Y'] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setTrendRange(r)}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${trendRange === r ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                {r}
              </button>
            ))}
          </div>
        }
      >
        <ReactECharts
          option={getTrendOption()}
          style={{ height: 280 }}
          opts={{ renderer: 'canvas' }}
        />
      </ChartCard>
    );
  }
  if (type === 'accounts_list' || type === 'holdings_overview') {
    const assetAccounts = accounts.filter((a) => a.type === 'asset');
    return (
      <ChartCard title={widget?.title || '账户列表'}>
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {assetAccounts.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-4">暂无账户数据</p>
          ) : (
            assetAccounts.map((a) => {
              const cat = categories.find((c) => c.id === a.category_id);
              return (
                <div
                  key={a.id}
                  className="flex items-center justify-between text-sm px-3 py-2 bg-slate-50 rounded-lg"
                >
                  <div>
                    <p className="font-medium text-slate-700">{a.name}</p>
                    <p className="text-xs text-slate-400">{cat?.name ?? '未知分类'}</p>
                  </div>
                  <span className="font-semibold text-slate-700">
                    ¥{a.balance.toLocaleString('zh-CN', { maximumFractionDigits: 2 })}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </ChartCard>
    );
  }
  if (type === 'liabilities_list') {
    return (
      <ChartCard title={widget?.title || '负债列表'}>
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {liabilityAccounts.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-4">暂无负债数据</p>
          ) : (
            liabilityAccounts.map((a) => {
              const cat = categories.find((c) => c.id === a.category_id);
              return (
                <div
                  key={a.id}
                  className="flex items-center justify-between text-sm px-3 py-2 bg-slate-50 rounded-lg"
                >
                  <div>
                    <p className="font-medium text-slate-700">{a.name}</p>
                    <p className="text-xs text-slate-400">{cat?.name ?? '未知分类'}</p>
                  </div>
                  <span className="font-semibold text-rose-600">
                    ¥{a.balance.toLocaleString('zh-CN', { maximumFractionDigits: 2 })}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </ChartCard>
    );
  }
  if (type === 'holdings_performance' || type === 'profit_summary') {
    const sorted = [...holdings].sort((a, b) => b.current_value - a.current_value);
    return (
      <ChartCard title={widget?.title || '持仓表现'}>
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {sorted.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-4">暂无持仓数据</p>
          ) : (
            sorted.slice(0, 10).map((h) => {
              const pnlPct = h.cost_basis > 0 ? (h.unrealized_pnl / h.cost_basis) * 100 : 0;
              return (
                <div
                  key={h.id}
                  className="flex items-center justify-between text-sm px-3 py-2 bg-slate-50 rounded-lg"
                >
                  <div>
                    <p className="font-medium text-slate-700">{h.name}</p>
                    <p className="text-xs text-slate-400">
                      成本: ¥{h.cost_basis.toLocaleString('zh-CN', { maximumFractionDigits: 0 })}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-slate-700">
                      ¥{h.current_value.toLocaleString('zh-CN', { maximumFractionDigits: 0 })}
                    </p>
                    <p
                      className={`text-xs font-medium ${h.unrealized_pnl >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}
                    >
                      {h.unrealized_pnl >= 0 ? '+' : ''}
                      {pnlPct.toFixed(2)}%
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </ChartCard>
    );
  }
  if (type === 'insurance_summary') {
    return (
      <ChartCard title={widget?.title || '保险保障'}>
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-blue-50 rounded-xl p-3 text-center">
            <p className="text-xs text-blue-600 font-medium">总保费</p>
            <p className="text-base font-bold text-blue-700 mt-1">
              ¥{totalPremium.toLocaleString('zh-CN', { maximumFractionDigits: 0 })}
            </p>
            <p className="text-[10px] text-blue-400 mt-0.5">{activeInsuranceCount} 份有效保单</p>
          </div>
          <div className="bg-amber-50 rounded-xl p-3 text-center">
            <p className="text-xs text-amber-600 font-medium">总保额</p>
            <p className="text-base font-bold text-amber-700 mt-1">
              ¥{totalCoverage.toLocaleString('zh-CN', { maximumFractionDigits: 0 })}
            </p>
            <p className="text-[10px] text-amber-400 mt-0.5">风险保障总额</p>
          </div>
          <div
            className={`${renewalSoon > 0 ? 'bg-red-50' : 'bg-emerald-50'} rounded-xl p-3 text-center`}
          >
            <p
              className={`text-xs ${renewalSoon > 0 ? 'text-red-600' : 'text-emerald-600'} font-medium`}
            >
              待续保
            </p>
            <p
              className={`text-base font-bold ${renewalSoon > 0 ? 'text-red-700' : 'text-emerald-700'} mt-1`}
            >
              {renewalSoon}
            </p>
            <p
              className={`text-[10px] ${renewalSoon > 0 ? 'text-red-400' : 'text-emerald-400'} mt-0.5`}
            >
              {renewalSoon > 0 ? '30天内需续保' : '暂无续保提醒'}
            </p>
          </div>
        </div>
      </ChartCard>
    );
  }
  if (type === 'chart_invest_return') {
    const sorted = [...holdings].sort((a, b) =>
      (a.last_price_update ?? '').localeCompare(b.last_price_update ?? '')
    );
    const labels = sorted.slice(-6).map((h) => h.name.slice(0, 6));
    const investTrendOption: EChartsOption = {
      tooltip: { trigger: 'axis' },
      legend: {
        data: ['市值', '成本'],
        bottom: 0,
        textStyle: { fontSize: 12, color: '#64748b' },
      },
      grid: { left: '3%', right: '4%', bottom: '18%', top: '8%', containLabel: true },
      xAxis: {
        type: 'category',
        data: labels,
        axisLabel: { fontSize: 11, color: '#94a3b8', rotate: 15 },
        axisLine: { lineStyle: { color: '#e2e8f0' } },
      },
      yAxis: {
        type: 'value',
        axisLabel: {
          formatter: (v: number) => `¥${(v / 10000).toFixed(1)}万`,
          fontSize: 11,
          color: '#94a3b8',
        },
        splitLine: { lineStyle: { color: '#f1f5f9' } },
      },
      series: [
        {
          name: '市值',
          type: 'bar',
          data: sorted.slice(-6).map((h) => h.current_value),
          itemStyle: { color: '#4f46e5' },
        },
        {
          name: '成本',
          type: 'bar',
          data: sorted.slice(-6).map((h) => h.cost_basis),
          itemStyle: { color: '#94a3b8' },
        },
      ],
    };
    return (
      <ChartCard title={widget?.title || '投资收益趋势'}>
        <ReactECharts
          option={investTrendOption}
          style={{ height: 280 }}
          opts={{ renderer: 'canvas' }}
        />
      </ChartCard>
    );
  }
  if (type === 'chart_holdings_rank') {
    const sortedRank = [...holdings].sort((a, b) => b.current_value - a.current_value).slice(0, 10);
    const holdingsRankOption: EChartsOption = {
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
      grid: { left: '3%', right: '4%', bottom: '3%', top: '3%', containLabel: true },
      xAxis: {
        type: 'value',
        axisLabel: {
          formatter: (v: number) => `¥${(v / 10000).toFixed(0)}万`,
          fontSize: 10,
          color: '#94a3b8',
        },
        splitLine: { lineStyle: { color: '#f1f5f9' } },
      },
      yAxis: {
        type: 'category',
        data: sortedRank.map((h) => h.name.slice(0, 8)).reverse(),
        axisLabel: { fontSize: 10, color: '#64748b' },
      },
      series: [
        {
          name: '市值',
          type: 'bar',
          data: sortedRank.map((h) => h.current_value).reverse(),
          itemStyle: { color: '#10b981' },
          barWidth: '60%',
        },
      ],
    };
    return (
      <ChartCard title={widget?.title || '持仓排名'}>
        <ReactECharts
          option={holdingsRankOption}
          style={{ height: 280 }}
          opts={{ renderer: 'canvas' }}
        />
      </ChartCard>
    );
  }
  if (type === 'table_transactions') {
    const recentTxs = transactions.slice(0, 10);
    return (
      <ChartCard title={widget?.title || '近期交易'}>
        <div className="h-full overflow-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-slate-500 border-b border-slate-100">
                <th className="text-left py-2 font-medium">日期</th>
                <th className="text-right py-2 font-medium">金额</th>
                <th className="text-left py-2 font-medium">类型</th>
              </tr>
            </thead>
            <tbody>
              {recentTxs.map((tx) => (
                <tr key={tx.id} className="border-b border-slate-50 hover:bg-slate-50">
                  <td className="py-1.5 text-slate-600">{tx.transaction_date}</td>
                  <td
                    className={`py-1.5 text-right font-medium ${tx.transaction_type === 'income' ? 'text-emerald-600' : 'text-slate-700'}`}
                  >
                    {tx.transaction_type === 'income' ? '+' : '-'}
                    {tx.amount.toLocaleString('zh-CN', { maximumFractionDigits: 0 })}
                  </td>
                  <td className="py-1.5 text-slate-400">
                    {tx.transaction_type === 'income'
                      ? '收入'
                      : tx.transaction_type === 'expense'
                        ? '支出'
                        : '转账'}
                  </td>
                </tr>
              ))}
              {recentTxs.length === 0 && (
                <tr>
                  <td colSpan={3} className="text-center text-slate-400 py-4">
                    暂无交易数据
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </ChartCard>
    );
  }
  if (type === 'table_reminders') {
    return (
      <ChartCard title={widget?.title || '待办提醒'}>
        <div className="flex flex-col items-center justify-center h-32 text-slate-400 text-sm">
          <span className="text-3xl mb-2">🔔</span>
          <p>暂无提醒数据</p>
        </div>
      </ChartCard>
    );
  }
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 text-center text-sm text-slate-400">
      暂不支持此组件: {type}
    </div>
  );
}
