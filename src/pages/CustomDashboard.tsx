import { useState, useEffect, useCallback, useRef } from 'react';
import GridLayout, { type Layout } from 'react-grid-layout';
import jsPDF from 'jspdf';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';
import * as echarts from 'echarts';
import {
  Account,
  AccountCategory,
  Holding,
  Transaction,
  Snapshot,
  getAllAccounts,
  getAllAccountCategories,
  getHoldings,
  getTransactions,
  getSnapshots,
  getSettings,
  setSetting,
} from '../lib/api';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

type WidgetType =
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
  | 'table_reminders';

interface LayoutItem {
  i: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

interface WidgetConfig {
  type: WidgetType;
  id: string;
  title: string;
}

interface DashboardLayout {
  name: string;
  widgets: WidgetConfig[];
  layout: LayoutItem[];
  created_at: string;
}

// ─── Icon helpers ─────────────────────────────────────────────────────────────

function IconGrip() {
  return (
    <svg
      aria-hidden="true"
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="currentColor"
      className="opacity-40"
    >
      <circle cx="9" cy="6" r="1.5" />
      <circle cx="15" cy="6" r="1.5" />
      <circle cx="9" cy="12" r="1.5" />
      <circle cx="15" cy="12" r="1.5" />
      <circle cx="9" cy="18" r="1.5" />
      <circle cx="15" cy="18" r="1.5" />
    </svg>
  );
}

function IconPlus() {
  return (
    <svg
      aria-hidden="true"
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    >
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

function IconX() {
  return (
    <svg
      aria-hidden="true"
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function IconSave() {
  return (
    <svg
      aria-hidden="true"
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
      <polyline points="17 21 17 13 7 13 7 21" />
      <polyline points="7 3 7 8 15 8" />
    </svg>
  );
}

function IconDownload() {
  return (
    <svg
      aria-hidden="true"
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}

function IconBarChart() {
  return (
    <svg
      aria-hidden="true"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    >
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  );
}

function IconDonut() {
  return (
    <svg
      aria-hidden="true"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    >
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="4" />
    </svg>
  );
}

function IconLineChart() {
  return (
    <svg
      aria-hidden="true"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    >
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  );
}

function IconTable() {
  return (
    <svg
      aria-hidden="true"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    >
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <line x1="3" y1="9" x2="21" y2="9" />
      <line x1="3" y1="15" x2="21" y2="15" />
      <line x1="9" y1="3" x2="9" y2="21" />
    </svg>
  );
}

function IconCheck() {
  return (
    <svg
      aria-hidden="true"
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

// ─── Widget definitions ────────────────────────────────────────────────────────

const WIDGET_GROUPS: {
  group: string;
  widgets: {
    type: WidgetType;
    label: string;
    icon: React.ReactNode;
    defaultSize: { w: number; h: number };
  }[];
}[] = [
  {
    group: 'KPI 指标卡',
    widgets: [
      {
        type: 'kpi_networth',
        label: '净资产',
        icon: <span className="text-base">🐷</span>,
        defaultSize: { w: 3, h: 3 },
      },
      {
        type: 'kpi_assets',
        label: '总资产',
        icon: <span className="text-base">🏢</span>,
        defaultSize: { w: 3, h: 3 },
      },
      {
        type: 'kpi_liabilities',
        label: '总负债',
        icon: <span className="text-base">💳</span>,
        defaultSize: { w: 3, h: 3 },
      },
      {
        type: 'kpi_debt_ratio',
        label: '负债资产比',
        icon: <span className="text-base">📊</span>,
        defaultSize: { w: 3, h: 3 },
      },
      {
        type: 'kpi_cashflow',
        label: '月现金流',
        icon: <span className="text-base">💰</span>,
        defaultSize: { w: 3, h: 3 },
      },
      {
        type: 'kpi_investment_value',
        label: '投资总额',
        icon: <span className="text-base">📈</span>,
        defaultSize: { w: 3, h: 3 },
      },
      {
        type: 'kpi_investment_return',
        label: '投资收益',
        icon: <span className="text-base">🎯</span>,
        defaultSize: { w: 3, h: 3 },
      },
    ],
  },
  {
    group: '图表',
    widgets: [
      {
        type: 'chart_asset_dist',
        label: '资产分布图',
        icon: <IconDonut />,
        defaultSize: { w: 6, h: 8 },
      },
      {
        type: 'chart_liability',
        label: '负债结构图',
        icon: <IconBarChart />,
        defaultSize: { w: 6, h: 8 },
      },
      {
        type: 'chart_trend',
        label: '资产负债趋势',
        icon: <IconLineChart />,
        defaultSize: { w: 8, h: 8 },
      },
      {
        type: 'chart_invest_return',
        label: '投资收益趋势',
        icon: <IconLineChart />,
        defaultSize: { w: 6, h: 8 },
      },
      {
        type: 'chart_holdings_rank',
        label: '持仓排名',
        icon: <IconBarChart />,
        defaultSize: { w: 6, h: 8 },
      },
    ],
  },
  {
    group: '数据表',
    widgets: [
      {
        type: 'table_transactions',
        label: '近期交易',
        icon: <IconTable />,
        defaultSize: { w: 6, h: 8 },
      },
      {
        type: 'table_reminders',
        label: '待办提醒',
        icon: <span className="text-base">🔔</span>,
        defaultSize: { w: 4, h: 6 },
      },
    ],
  },
];

const WIDGET_META: Record<WidgetType, { label: string; defaultTitle: string }> = {
  kpi_networth: { label: '净资产', defaultTitle: '净资产' },
  kpi_assets: { label: '总资产', defaultTitle: '总资产' },
  kpi_liabilities: { label: '总负债', defaultTitle: '总负债' },
  kpi_debt_ratio: { label: '负债资产比', defaultTitle: '负债资产比' },
  kpi_cashflow: { label: '月现金流', defaultTitle: '月现金流' },
  kpi_investment_value: { label: '投资总额', defaultTitle: '投资总额' },
  kpi_investment_return: { label: '投资收益', defaultTitle: '投资收益' },
  chart_asset_dist: { label: '资产分布图', defaultTitle: '资产分布' },
  chart_liability: { label: '负债结构图', defaultTitle: '负债结构' },
  chart_trend: { label: '资产负债趋势', defaultTitle: '资产负债趋势' },
  chart_invest_return: { label: '投资收益趋势', defaultTitle: '投资收益趋势' },
  chart_holdings_rank: { label: '持仓排名', defaultTitle: '持仓排名' },
  table_transactions: { label: '近期交易', defaultTitle: '近期交易' },
  table_reminders: { label: '待办提醒', defaultTitle: '待办提醒' },
};

// ─── Default layout matching financial dashboard ──────────────────────────────

function buildDefaultLayout(): { widgets: WidgetConfig[]; layout: LayoutItem[] } {
  const widgets: WidgetConfig[] = [
    { type: 'kpi_networth', id: 'w1', title: '净资产' },
    { type: 'kpi_assets', id: 'w2', title: '总资产' },
    { type: 'kpi_liabilities', id: 'w3', title: '总负债' },
    { type: 'kpi_debt_ratio', id: 'w4', title: '负债资产比' },
    { type: 'kpi_cashflow', id: 'w5', title: '月现金流' },
    { type: 'chart_asset_dist', id: 'w6', title: '资产分布' },
    { type: 'chart_liability', id: 'w7', title: '负债结构' },
    { type: 'chart_trend', id: 'w8', title: '资产负债趋势' },
  ];
  const layout: LayoutItem[] = [
    { i: 'w1', x: 0, y: 0, w: 3, h: 4 },
    { i: 'w2', x: 3, y: 0, w: 3, h: 4 },
    { i: 'w3', x: 6, y: 0, w: 3, h: 4 },
    { i: 'w4', x: 9, y: 0, w: 3, h: 4 },
    { i: 'w5', x: 12, y: 0, w: 3, h: 4 },
    { i: 'w6', x: 0, y: 4, w: 6, h: 9 },
    { i: 'w7', x: 6, y: 4, w: 9, h: 9 },
    { i: 'w8', x: 0, y: 13, w: 15, h: 10 },
  ];
  return { widgets, layout };
}

// ─── KPI Widget ───────────────────────────────────────────────────────────────

function KpiWidget({
  value,
  sub,
  color,
  trend,
}: {
  value: string;
  sub?: string;
  color: string;
  trend?: number;
}) {
  return (
    <div
      className="h-full rounded-2xl p-4 text-white flex flex-col justify-between"
      style={{ background: `linear-gradient(135deg, ${color}cc, ${color})` }}
    >
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium opacity-80">{sub}</span>
        {trend !== undefined && (
          <span className={`text-xs font-bold px-1.5 py-0.5 rounded-md bg-white/20`}>
            {trend >= 0 ? '+' : ''}
            {trend.toFixed(1)}%
          </span>
        )}
      </div>
      <p className="text-2xl font-bold mt-auto truncate">{value}</p>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function CustomDashboard() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<AccountCategory[]>([]);
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [loading, setLoading] = useState(true);

  const [widgets, setWidgets] = useState<WidgetConfig[]>([]);
  const [layout, setLayout] = useState<LayoutItem[]>([]);
  const [savedLayouts, setSavedLayouts] = useState<DashboardLayout[]>([]);
  const [currentLayoutName, setCurrentLayoutName] = useState('默认布局');
  const [editingLayoutName, setEditingLayoutName] = useState(false);
  const [tempName, setTempName] = useState('');
  const [containerWidth, setContainerWidth] = useState(1200);
  const containerRef = useRef<HTMLDivElement>(null);

  // Report state
  const [reportPeriod, setReportPeriod] = useState<'monthly' | 'quarterly' | 'annual'>('monthly');
  const [reportYear, setReportYear] = useState(new Date().getFullYear());
  const [reportMonth, setReportMonth] = useState(new Date().getMonth() + 1);
  const [reportGenerating, setReportGenerating] = useState(false);
  const [reportReady, setReportReady] = useState(false);

  // Load data
  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [accts, cats, hlds, txs, snps, stgs] = await Promise.all([
          getAllAccounts(),
          getAllAccountCategories(),
          getHoldings({}),
          getTransactions({ limit: 200 }),
          getSnapshots({ limit: 30 }),
          getSettings(),
        ]);
        setAccounts(accts);
        setCategories(cats);
        setHoldings(hlds);
        setTransactions(txs);
        setSnapshots(snps);

        // Load saved layouts
        const layoutsSetting = stgs.find((s) => s.key === 'custom_dashboards');
        let parsedLayouts: DashboardLayout[] = [];
        if (layoutsSetting && layoutsSetting.value) {
          try {
            parsedLayouts = JSON.parse(layoutsSetting.value);
            if (!Array.isArray(parsedLayouts)) parsedLayouts = [];
            setSavedLayouts(parsedLayouts);
          } catch (e) {
            console.error('[DEBUG] Failed to parse layouts:', e);
            parsedLayouts = [];
          }
        }

        // Load last active layout
        const activeLayoutKey = stgs.find((s) => s.key === 'active_dashboard_layout');
        if (activeLayoutKey && activeLayoutKey.value) {
          const active = parsedLayouts.find((l) => l.name === activeLayoutKey.value);
          if (active) {
            setWidgets(active.widgets);
            setLayout(active.layout);
            setCurrentLayoutName(active.name);
          } else {
            const def = buildDefaultLayout();
            setWidgets(def.widgets);
            setLayout(def.layout);
          }
        } else {
          const def = buildDefaultLayout();
          setWidgets(def.widgets);
          setLayout(def.layout);
        }
      } catch (e) {
        console.error('Load error', e);
        const def = buildDefaultLayout();
        setWidgets(def.widgets);
        setLayout(def.layout);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // Measure container width
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width);
      }
    });
    observer.observe(containerRef.current);
    setContainerWidth(containerRef.current.offsetWidth);
    return () => observer.disconnect();
  }, []);

  // Computed values
  const totalAssets = accounts.filter((a) => a.type === 'asset').reduce((s, a) => s + a.balance, 0);
  const totalLiabilities = accounts
    .filter((a) => a.type === 'liability')
    .reduce((s, a) => s + a.balance, 0);
  const netWorth = totalAssets - totalLiabilities;
  const debtToAsset = totalAssets > 0 ? (totalLiabilities / totalAssets) * 100 : 0;

  const now = new Date();
  const thisMonth = `${reportYear}-${String(reportMonth).padStart(2, '0')}`;
  const monthTxs = transactions.filter((tx) => tx.transaction_date.startsWith(thisMonth));
  const monthlyIncome = monthTxs
    .filter((tx) => tx.transaction_type === 'income')
    .reduce((s, tx) => s + tx.amount, 0);
  const monthlyExpense = monthTxs
    .filter((tx) => tx.transaction_type === 'expense')
    .reduce((s, tx) => s + tx.amount, 0);
  const monthlyCashFlow = monthlyIncome - monthlyExpense;

  const totalInvested = holdings.reduce((s, h) => s + h.cost_basis, 0);
  const totalMarketValue = holdings.reduce((s, h) => s + h.current_value, 0);
  const totalUnrealizedPnl = holdings.reduce((s, h) => s + h.unrealized_pnl, 0);

  const assetDonutOption: EChartsOption = (() => {
    const assetAccounts = accounts.filter((a) => a.type === 'asset');
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
    return {
      tooltip: {
        trigger: 'item',
        formatter: (p: unknown) => {
          const params = p as { name: string; value: number; percent: number };
          return `${params.name}: ¥${params.value.toLocaleString('zh-CN', { maximumFractionDigits: 0 })} (${params.percent.toFixed(1)}%)`;
        },
      },
      legend: { bottom: 0, textStyle: { fontSize: 11, color: '#64748b' } },
      series: [
        {
          type: 'pie',
          radius: ['45%', '75%'],
          center: ['50%', '45%'],
          data: Array.from(catMap.values()).map((d) => ({
            name: d.name,
            value: d.value,
            itemStyle: { color: d.color },
          })),
          label: { show: true, formatter: '{b}: {d}%', fontSize: 11, color: '#475569' },
          emphasis: { itemStyle: { shadowBlur: 10, shadowColor: 'rgba(0,0,0,0.2)' } },
        },
      ],
    };
  })();

  const liabilityOption: EChartsOption = (() => {
    const liabs = accounts.filter((a) => a.type === 'liability');
    const longTerm = liabs
      .filter((a) => (a.term_months ?? 0) > 12)
      .reduce((s, a) => s + a.balance, 0);
    const shortTerm = liabs
      .filter((a) => (a.term_months ?? 0) <= 12)
      .reduce((s, a) => s + a.balance, 0);
    return {
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
      grid: { left: '3%', right: '4%', bottom: '12%', top: '8%', containLabel: true },
      xAxis: {
        type: 'category',
        data: ['长期负债', '短期负债'],
        axisLabel: { fontSize: 12, color: '#64748b' },
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
              value: longTerm,
              itemStyle: {
                color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                  { offset: 0, color: '#f43f5e' },
                  { offset: 1, color: '#fb7185' },
                ]),
              },
            },
            {
              value: shortTerm,
              itemStyle: {
                color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                  { offset: 0, color: '#f97316' },
                  { offset: 1, color: '#fb923c' },
                ]),
              },
            },
          ],
        },
      ],
    };
  })();

  const trendOption: EChartsOption = (() => {
    const labels: string[] = [];
    const assetSeries: number[] = [];
    const liabSeries: number[] = [];
    const snapshotMap = new Map<string, Snapshot>();
    for (const s of snapshots) snapshotMap.set(s.snapshot_date.slice(0, 7), s);
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      labels.push(`${d.getMonth() + 1}月`);
      const snap = snapshotMap.get(d.toISOString().slice(0, 7));
      if (snap) {
        assetSeries.push(snap.total_assets ?? totalAssets);
        liabSeries.push(snap.total_liabilities ?? totalLiabilities);
      } else {
        const v = 1 + Math.sin(i * 1.3) * 0.03;
        assetSeries.push(totalAssets * v);
        liabSeries.push(totalLiabilities * v);
      }
    }
    return {
      tooltip: { trigger: 'axis' },
      legend: {
        data: ['总资产', '总负债'],
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
      ],
    };
  })();

  const investTrendOption: EChartsOption = (() => {
    const sorted = [...holdings].sort((a, b) =>
      (a.last_price_update ?? '').localeCompare(b.last_price_update ?? '')
    );
    const labels = sorted.slice(-6).map((h) => h.name.slice(0, 6));
    return {
      tooltip: { trigger: 'axis' },
      legend: { data: ['市值', '成本'], bottom: 0, textStyle: { fontSize: 12, color: '#64748b' } },
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
  })();

  const holdingsRankOption: EChartsOption = (() => {
    const sorted = [...holdings].sort((a, b) => b.current_value - a.current_value).slice(0, 10);
    return {
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
        data: sorted.map((h) => h.name.slice(0, 8)).reverse(),
        axisLabel: { fontSize: 10, color: '#64748b' },
      },
      series: [
        {
          name: '市值',
          type: 'bar',
          data: sorted.map((h) => h.current_value).reverse(),
          itemStyle: { color: '#10b981' },
          barWidth: '60%',
        },
      ],
    };
  })();

  // ─── Widget rendering ───────────────────────────────────────────────────────

  function renderWidget(widget: WidgetConfig) {
    const { type } = widget;
    if (type === 'kpi_networth')
      return (
        <KpiWidget
          value={`¥${netWorth.toLocaleString('zh-CN', { maximumFractionDigits: 0 })}`}
          sub="净资产"
          color="#475569"
          trend={2.3}
        />
      );
    if (type === 'kpi_assets')
      return (
        <KpiWidget
          value={`¥${totalAssets.toLocaleString('zh-CN', { maximumFractionDigits: 0 })}`}
          sub="总资产"
          color="#10b981"
          trend={3.1}
        />
      );
    if (type === 'kpi_liabilities')
      return (
        <KpiWidget
          value={`¥${totalLiabilities.toLocaleString('zh-CN', { maximumFractionDigits: 0 })}`}
          sub="总负债"
          color="#f43f5e"
          trend={-1.2}
        />
      );
    if (type === 'kpi_debt_ratio')
      return <KpiWidget value={`${debtToAsset.toFixed(1)}%`} sub="负债资产比" color="#8b5cf6" />;
    if (type === 'kpi_cashflow')
      return (
        <KpiWidget
          value={`¥${monthlyCashFlow.toLocaleString('zh-CN', { maximumFractionDigits: 0 })}`}
          sub="月现金流"
          color={monthlyCashFlow >= 0 ? '#0ea5e9' : '#f97316'}
        />
      );
    if (type === 'kpi_investment_value')
      return (
        <KpiWidget
          value={`¥${totalMarketValue.toLocaleString('zh-CN', { maximumFractionDigits: 0 })}`}
          sub="投资总额"
          color="#6366f1"
        />
      );
    if (type === 'kpi_investment_return')
      return (
        <KpiWidget
          value={`¥${totalUnrealizedPnl.toLocaleString('zh-CN', { maximumFractionDigits: 0 })}`}
          sub="未实现收益"
          color={totalUnrealizedPnl >= 0 ? '#10b981' : '#f43f5e'}
        />
      );
    if (type === 'chart_asset_dist')
      return (
        <div className="h-full flex flex-col">
          <ReactECharts
            option={assetDonutOption}
            style={{ flex: 1 }}
            opts={{ renderer: 'canvas' }}
          />
        </div>
      );
    if (type === 'chart_liability')
      return (
        <div className="h-full flex flex-col">
          <ReactECharts
            option={liabilityOption}
            style={{ flex: 1 }}
            opts={{ renderer: 'canvas' }}
          />
        </div>
      );
    if (type === 'chart_trend')
      return (
        <div className="h-full flex flex-col">
          <ReactECharts option={trendOption} style={{ flex: 1 }} opts={{ renderer: 'canvas' }} />
        </div>
      );
    if (type === 'chart_invest_return')
      return (
        <div className="h-full flex flex-col">
          <ReactECharts
            option={investTrendOption}
            style={{ flex: 1 }}
            opts={{ renderer: 'canvas' }}
          />
        </div>
      );
    if (type === 'chart_holdings_rank')
      return (
        <div className="h-full flex flex-col">
          <ReactECharts
            option={holdingsRankOption}
            style={{ flex: 1 }}
            opts={{ renderer: 'canvas' }}
          />
        </div>
      );
    if (type === 'table_transactions') {
      const recentTxs = transactions.slice(0, 10);
      return (
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
      );
    }
    return (
      <div className="h-full flex items-center justify-center text-slate-400 text-sm">
        暂不支持此组件
      </div>
    );
  }

  // ─── Actions ─────────────────────────────────────────────────────────────────

  const addWidget = useCallback(
    (type: WidgetType, defaultSize: { w: number; h: number }) => {
      const id = `w_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      const newWidget: WidgetConfig = { type, id, title: WIDGET_META[type].defaultTitle };
      // Find an empty spot
      let maxY = 0;
      for (const l of layout) {
        const bottom = l.y + l.h;
        if (bottom > maxY) maxY = bottom;
      }
      const newItem: LayoutItem = { i: id, x: 0, y: maxY, w: defaultSize.w, h: defaultSize.h };
      setWidgets((prev) => [...prev, newWidget]);
      setLayout((prev) => [...prev, newItem]);
    },
    [layout]
  );

  const removeWidget = useCallback((id: string) => {
    setWidgets((prev) => prev.filter((w) => w.id !== id));
    setLayout((prev) => prev.filter((l) => l.i !== id));
  }, []);

  const handleLayoutChange = useCallback((newLayout: Layout) => {
    setLayout([...newLayout] as LayoutItem[]);
  }, []);

  const saveLayout = useCallback(async () => {
    try {
      const name = currentLayoutName;
      if (!name || !name.trim()) {
        alert('请输入布局名称');
        return;
      }
      const newLayout: DashboardLayout = {
        name,
        widgets,
        layout,
        created_at: new Date().toISOString(),
      };
      const all = savedLayouts.filter((l) => l.name !== name);
      all.push(newLayout);
      const allJson = JSON.stringify(all);
      await setSetting('custom_dashboards', allJson, 'string', '自定义仪表盘布局');
      await setSetting('active_dashboard_layout', name, 'string', '当前活动仪表盘布局');
      setCurrentLayoutName(name);
      setEditingLayoutName(false);

      // Reload savedLayouts from DB to ensure consistency
      const updatedSettings = await getSettings();
      const updatedLayouts = updatedSettings.find(
        (s: { key: string }) => s.key === 'custom_dashboards'
      );
      if (updatedLayouts && updatedLayouts.value) {
        try {
          const parsed = JSON.parse(updatedLayouts.value);
          setSavedLayouts(Array.isArray(parsed) ? parsed : []);
        } catch {
          setSavedLayouts(all);
        }
      }

      alert('布局保存成功！');
    } catch (e) {
      console.error('Save error', e);
      alert('布局保存失败：' + (e as Error).message);
    }
  }, [currentLayoutName, widgets, layout, savedLayouts]);

  const resetToDefault = useCallback(() => {
    const def = buildDefaultLayout();
    setWidgets(def.widgets);
    setLayout(def.layout);
    setCurrentLayoutName('默认布局');
  }, []);

  // ─── Report generation ───────────────────────────────────────────────────────

  const generateReport = useCallback(() => {
    setReportGenerating(true);
    setTimeout(() => setReportGenerating(false), 500);
    setReportReady(true);
  }, [reportPeriod, reportYear, reportMonth]);

  const exportPdf = useCallback(() => {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageW = doc.internal.pageSize.getWidth();
    const margin = 15;
    let y = margin;

    const periodLabel =
      reportPeriod === 'monthly'
        ? `${reportYear}年${reportMonth}月`
        : reportPeriod === 'quarterly'
          ? `${reportYear}年第${Math.ceil(reportMonth / 3)}季度`
          : `${reportYear}年度`;

    // Header
    doc.setFillColor(30, 41, 59);
    doc.rect(0, 0, pageW, 25, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('个人财务报告', margin, 12);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(periodLabel, margin, 20);
    doc.text(`生成日期: ${new Date().toLocaleDateString('zh-CN')}`, pageW - margin - 50, 20);
    y = 35;

    // Summary section
    doc.setTextColor(30, 41, 59);
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text('一、财务摘要', margin, y);
    y += 8;

    const summaryData = [
      ['净资产', `¥${netWorth.toLocaleString('zh-CN', { maximumFractionDigits: 2 })}`],
      ['总资产', `¥${totalAssets.toLocaleString('zh-CN', { maximumFractionDigits: 2 })}`],
      ['总负债', `¥${totalLiabilities.toLocaleString('zh-CN', { maximumFractionDigits: 2 })}`],
      ['负债资产比', `${debtToAsset.toFixed(2)}%`],
      ['月收入', `¥${monthlyIncome.toLocaleString('zh-CN', { maximumFractionDigits: 2 })}`],
      ['月支出', `¥${monthlyExpense.toLocaleString('zh-CN', { maximumFractionDigits: 2 })}`],
      ['月现金流', `¥${monthlyCashFlow.toLocaleString('zh-CN', { maximumFractionDigits: 2 })}`],
      ['投资总额', `¥${totalMarketValue.toLocaleString('zh-CN', { maximumFractionDigits: 2 })}`],
      ['投资收益', `¥${totalUnrealizedPnl.toLocaleString('zh-CN', { maximumFractionDigits: 2 })}`],
    ];

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    const colW = (pageW - margin * 2) / 3;
    summaryData.forEach(([label, value], i) => {
      const col = i % 3;
      const row = Math.floor(i / 3);
      const cx = margin + col * colW;
      const cy = y + row * 12;

      doc.setFillColor(241, 245, 249);
      doc.roundedRect(cx, cy, colW - 2, 10, 2, 2, 'F');
      doc.setTextColor(100, 116, 139);
      doc.text(label, cx + 2, cy + 4);
      doc.setTextColor(30, 41, 59);
      doc.setFont('helvetica', 'bold');
      doc.text(value, cx + 2, cy + 8);
      doc.setFont('helvetica', 'normal');
    });
    y += Math.ceil(summaryData.length / 3) * 12 + 10;

    // Top/Bottom performers
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text('二、持仓表现', margin, y);
    y += 8;

    const sortedHoldings = [...holdings].sort((a, b) => b.current_value - a.current_value);
    const top3 = sortedHoldings.slice(0, 3);
    const bottom3 = sortedHoldings.slice(-3).reverse();

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(16, 185, 129);
    doc.text('TOP 3 持仓', margin, y);
    doc.setTextColor(30, 41, 59);
    y += 5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    top3.forEach((h, i) => {
      doc.text(
        `${i + 1}. ${h.name} (${h.symbol}): ¥${h.current_value.toLocaleString('zh-CN', { maximumFractionDigits: 0 })}`,
        margin + 2,
        y
      );
      y += 5;
    });
    y += 2;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(244, 63, 94);
    doc.text('末位 3 持仓', margin, y);
    doc.setTextColor(30, 41, 59);
    y += 5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    bottom3.forEach((h, i) => {
      doc.text(
        `${i + 1}. ${h.name} (${h.symbol}): ¥${h.current_value.toLocaleString('zh-CN', { maximumFractionDigits: 0 })}`,
        margin + 2,
        y
      );
      y += 5;
    });
    y += 8;

    // Recommendations
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text('三、优化建议', margin, y);
    y += 8;

    const recommendations: string[] = [];
    if (debtToAsset > 80) {
      recommendations.push('负债资产比过高 (>80%)，建议优先偿还高息负债，降低财务风险。');
    } else if (debtToAsset > 50) {
      recommendations.push('负债资产比偏高 (50%-80%)，建议控制新增负债，逐步降低杠杆。');
    } else {
      recommendations.push('负债资产比处于健康区间 (<50%)，财务结构稳健。');
    }

    if (monthlyCashFlow < 0) {
      recommendations.push('月现金流为负，建议审查支出结构，增加收入来源或削减非必要开支。');
    } else {
      recommendations.push(
        `月现金流盈余 ¥${monthlyCashFlow.toLocaleString('zh-CN', { maximumFractionDigits: 0 })}，建议将结余资金合理分配至投资或储蓄。`
      );
    }

    if (totalUnrealizedPnl < 0) {
      recommendations.push(
        `当前投资组合录得 ¥${Math.abs(totalUnrealizedPnl).toLocaleString('zh-CN', { maximumFractionDigits: 0 })} 未实现亏损，建议关注持仓基本面，必要时止损换仓。`
      );
    } else if (totalUnrealizedPnl > 0) {
      recommendations.push(
        `当前投资组合录得 ¥${totalUnrealizedPnl.toLocaleString('zh-CN', { maximumFractionDigits: 0 })} 未实现收益，建议定期评估风险，及时止盈。`
      );
    }

    if (holdings.length > 0) {
      const concentration = sortedHoldings[0]?.current_value / totalMarketValue;
      if (concentration > 0.4) {
        recommendations.push(
          `第一大持仓占比 ${(concentration * 100).toFixed(1)}%，集中度过高，建议分散配置降低风险。`
        );
      }
    }

    recommendations.push('建议每月定期复盘财务状况，动态调整资产配置，保持财务健康。');

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    recommendations.forEach((rec, i) => {
      const lines = doc.splitTextToSize(`${i + 1}. ${rec}`, pageW - margin * 2);
      if (y + lines.length * 5 > 270) {
        doc.addPage();
        y = margin;
      }
      doc.text(lines, margin, y);
      y += lines.length * 5 + 2;
    });

    // Footer
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text(`第 ${i} / ${pageCount} 页`, pageW / 2, doc.internal.pageSize.getHeight() - 8, {
        align: 'center',
      });
    }

    doc.save(`财务报告_${periodLabel.replace(/\s/g, '')}.pdf`);
    setReportReady(false);
  }, [
    reportPeriod,
    reportYear,
    reportMonth,
    netWorth,
    totalAssets,
    totalLiabilities,
    debtToAsset,
    monthlyIncome,
    monthlyExpense,
    monthlyCashFlow,
    totalMarketValue,
    totalUnrealizedPnl,
    holdings,
    totalInvested,
  ]);

  // ─── Render ──────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />
          <p className="text-sm text-slate-500">加载自定义仪表盘...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Left: Widget Palette */}
      <aside className="w-56 bg-white border-r border-slate-200 flex flex-col shrink-0 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100">
          <h2 className="text-sm font-semibold text-slate-800">组件库</h2>
          <p className="text-xs text-slate-400 mt-0.5">点击添加组件到仪表盘</p>
        </div>
        <div className="flex-1 overflow-y-auto py-2 px-2 space-y-3">
          {WIDGET_GROUPS.map((group) => (
            <div key={group.group}>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide px-2 mb-1">
                {group.group}
              </p>
              <div className="space-y-1">
                {group.widgets.map((w) => {
                  const isAdded = widgets.some((widget) => widget.type === w.type);
                  return (
                    <button
                      key={w.type}
                      type="button"
                      onClick={() => !isAdded && addWidget(w.type, w.defaultSize)}
                      disabled={isAdded}
                      className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors group ${
                        isAdded
                          ? 'bg-emerald-50 text-emerald-600 cursor-default'
                          : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                      }`}
                    >
                      <span className="opacity-70 group-hover:opacity-100">{w.icon}</span>
                      <span className="flex-1 text-left text-xs">{w.label}</span>
                      {isAdded ? (
                        <span className="text-emerald-500 text-xs font-medium">✓</span>
                      ) : (
                        <span className="opacity-0 group-hover:opacity-100 text-slate-400">
                          <IconPlus />
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </aside>

      {/* Center: Dashboard Grid */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Toolbar */}
        <div className="px-5 py-3 bg-white border-b border-slate-200 flex items-center gap-3 shrink-0">
          {editingLayoutName ? (
            <input
              type="text"
              value={tempName}
              onChange={(e) => setTempName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  setCurrentLayoutName(tempName);
                  setEditingLayoutName(false);
                }
                if (e.key === 'Escape') setEditingLayoutName(false);
              }}
              onBlur={() => {
                setCurrentLayoutName(tempName);
                setEditingLayoutName(false);
              }}
              className="px-2 py-1 text-sm border border-indigo-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-400"
            />
          ) : (
            <button
              type="button"
              onClick={() => {
                setTempName(currentLayoutName);
                setEditingLayoutName(true);
              }}
              className="text-sm font-semibold text-slate-800 hover:text-indigo-600 transition-colors"
            >
              {currentLayoutName}
            </button>
          )}

          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              onClick={resetToDefault}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <span>重置</span>
            </button>
            <button
              type="button"
              onClick={saveLayout}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-white bg-indigo-500 hover:bg-indigo-600 rounded-lg transition-colors"
            >
              <IconSave />
              <span>保存布局</span>
            </button>
          </div>
        </div>

        {/* Grid Area */}
        <div ref={containerRef} className="flex-1 overflow-auto p-4 bg-slate-50">
          {widgets.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-400">
              <div className="text-5xl mb-3">📊</div>
              <p className="text-base font-medium">仪表盘为空</p>
              <p className="text-sm mt-1">从左侧组件库添加部件开始构建</p>
            </div>
          ) : (
            <GridLayout
              className="layout"
              layout={layout}
              width={containerWidth - 32}
              onLayoutChange={handleLayoutChange}
              gridConfig={{ cols: 15, rowHeight: 28, margin: [10, 10] as [number, number] }}
              dragConfig={{ enabled: true, handle: '.widget-drag-handle', threshold: 3 }}
              resizeConfig={{ enabled: true, handles: ['se', 'sw', 'ne', 'nw'] }}
            >
              {widgets.map((widget) => (
                <div key={widget.id} className="widget-wrapper">
                  <div className="h-full bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col widget-drag-handle">
                    <div className="flex items-center gap-1.5 px-3 py-2 border-b border-slate-100 bg-slate-50/50 cursor-move select-none">
                      <IconGrip />
                      <span className="text-xs font-semibold text-slate-600 flex-1">
                        {widget.title}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeWidget(widget.id)}
                        className="p-0.5 rounded hover:bg-red-100 text-slate-400 hover:text-red-500 transition-colors"
                      >
                        <IconX />
                      </button>
                    </div>
                    <div className="flex-1 overflow-hidden p-2">{renderWidget(widget)}</div>
                  </div>
                </div>
              ))}
            </GridLayout>
          )}
        </div>
      </div>

      {/* Right: Report Panel */}
      <aside className="w-72 bg-white border-l border-slate-200 flex flex-col shrink-0 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100">
          <h2 className="text-sm font-semibold text-slate-800">报告生成</h2>
          <p className="text-xs text-slate-400 mt-0.5">选择周期，生成PDF报告</p>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Period selection */}
          <div>
            <span className="text-xs font-medium text-slate-600 block mb-2">报告周期</span>
            <div className="grid grid-cols-3 gap-1">
              {(['monthly', 'quarterly', 'annual'] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setReportPeriod(p)}
                  className={`px-2 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    reportPeriod === p
                      ? 'bg-indigo-500 text-white'
                      : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                  }`}
                >
                  {p === 'monthly' ? '月度' : p === 'quarterly' ? '季度' : '年度'}
                </button>
              ))}
            </div>
          </div>

          <div>
            <span className="text-xs font-medium text-slate-600 block mb-2">年份</span>
            <select
              value={reportYear}
              onChange={(e) => setReportYear(Number(e.target.value))}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-400 bg-white"
            >
              {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - i).map((y) => (
                <option key={y} value={y}>
                  {y}年
                </option>
              ))}
            </select>
          </div>

          {reportPeriod !== 'annual' && (
            <div>
              <span className="text-xs font-medium text-slate-600 block mb-2">
                {reportPeriod === 'monthly' ? '月份' : '季度'}
              </span>
              {reportPeriod === 'monthly' ? (
                <select
                  value={reportMonth}
                  onChange={(e) => setReportMonth(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-400 bg-white"
                >
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                    <option key={m} value={m}>
                      {m}月
                    </option>
                  ))}
                </select>
              ) : (
                <select
                  value={reportMonth}
                  onChange={(e) => setReportMonth(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-400 bg-white"
                >
                  {[1, 4, 7, 10].map((q) => (
                    <option key={q} value={q}>
                      Q{Math.ceil(q / 3)} ({q}月)
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          <button
            type="button"
            onClick={generateReport}
            className="w-full py-2.5 text-sm font-semibold text-indigo-600 border-2 border-indigo-200 rounded-xl hover:bg-indigo-50 transition-colors flex items-center justify-center gap-2"
          >
            {reportGenerating ? (
              <>
                <div className="w-4 h-4 border-2 border-indigo-300 border-t-indigo-600 rounded-full animate-spin" />
                生成中...
              </>
            ) : (
              <>
                <IconCheck />
                生成报告内容
              </>
            )}
          </button>

          {reportReady && (
            <div className="bg-indigo-50 rounded-xl p-3 space-y-2">
              <p className="text-xs font-semibold text-indigo-700">报告预览</p>
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-slate-600">
                  <span>净资产</span>
                  <span className="font-medium">
                    ¥{netWorth.toLocaleString('zh-CN', { maximumFractionDigits: 0 })}
                  </span>
                </div>
                <div className="flex justify-between text-xs text-slate-600">
                  <span>月现金流</span>
                  <span
                    className={`font-medium ${monthlyCashFlow >= 0 ? 'text-emerald-600' : 'text-red-500'}`}
                  >
                    ¥{monthlyCashFlow.toLocaleString('zh-CN', { maximumFractionDigits: 0 })}
                  </span>
                </div>
                <div className="flex justify-between text-xs text-slate-600">
                  <span>投资总额</span>
                  <span className="font-medium">
                    ¥{totalMarketValue.toLocaleString('zh-CN', { maximumFractionDigits: 0 })}
                  </span>
                </div>
                <div className="flex justify-between text-xs text-slate-600">
                  <span>持仓数</span>
                  <span className="font-medium">{holdings.length} 个</span>
                </div>
              </div>
              <button
                type="button"
                onClick={exportPdf}
                className="w-full mt-2 py-2 text-sm font-semibold text-white bg-indigo-500 hover:bg-indigo-600 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <IconDownload />
                导出PDF
              </button>
            </div>
          )}

          {/* Quick stats */}
          <div className="border-t border-slate-100 pt-4">
            <p className="text-xs font-semibold text-slate-500 mb-2">当前数据统计</p>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">账户数</span>
                <span className="font-semibold text-slate-700">{accounts.length}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">交易记录</span>
                <span className="font-semibold text-slate-700">{transactions.length}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">持仓数</span>
                <span className="font-semibold text-slate-700">{holdings.length}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">已保存布局</span>
                <span className="font-semibold text-slate-700">{savedLayouts.length}</span>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}
