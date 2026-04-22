import React, { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';
import * as echarts from 'echarts';
import { ask } from '@tauri-apps/plugin-dialog';
import {
  Account,
  AccountCategory,
  Snapshot,
  Transaction,
  Insurance,
  Holding,
  getAllAccounts,
  getAllAccountCategories,
  getSnapshots,
  getTransactions,
  getInsurances,
  getHoldings,
  getSettings,
  setSetting,
  deleteTransaction,
} from '../lib/api';

type TrendRange = '3M' | '6M' | '1Y';

function IconTrendUp() {
  return (
    <svg
      width="14"
      height="14"
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
      width="14"
      height="14"
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
      width="14"
      height="14"
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

function IconPiggy() {
  return (
    <svg
      width="20"
      height="20"
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

function KpiCard({
  label,
  value,
  icon,
  gradientFrom,
  gradientTo,
  trend,
  subValue,
  subLabel,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  gradientFrom: string;
  gradientTo: string;
  trend?: number;
  subValue?: string;
  subLabel?: string;
}) {
  return (
    <div
      className="relative overflow-hidden rounded-xl p-4 text-white h-full flex flex-col justify-between"
      style={{ background: `linear-gradient(135deg, ${gradientFrom}, ${gradientTo})` }}
    >
      <div className="absolute top-0 right-0 w-24 h-24 opacity-10 -translate-y-6 translate-x-6">
        {icon}
      </div>
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="opacity-80">{icon}</span>
          <span className="text-xs font-medium opacity-90">{label}</span>
          {trend !== undefined && (
            <span
              className={`ml-auto flex items-center gap-0.5 text-xs font-semibold px-1.5 py-0.5 rounded-md ${trend >= 0 ? 'bg-emerald-400/30' : 'bg-rose-400/30'}`}
            >
              {trend >= 0 ? <IconTrendUp /> : <IconTrendDown />}
              {Math.abs(trend).toFixed(1)}%
            </span>
          )}
        </div>
        <p className="text-xl font-bold tracking-tight truncate">{value}</p>
      </div>
      {subValue && (
        <div className="mt-2 pt-2 border-t border-white/20">
          <p className="text-xs opacity-70">{subLabel ?? ''}</p>
          <p className="text-sm font-semibold truncate">{subValue}</p>
        </div>
      )}
    </div>
  );
}

function SectionCard({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden h-full flex flex-col">
      <div className="flex items-center justify-between px-3 py-2 border-b border-slate-100 flex-shrink-0">
        <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
        {action}
      </div>
      <div className="p-3 flex-1 overflow-hidden">{children}</div>
    </div>
  );
}

export default function Dashboard() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<AccountCategory[]>([]);
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [insurances, setInsurances] = useState<Insurance[]>([]);
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTemplate, setActiveTemplate] = useState<string>('default');

  const location = useLocation();
  const [trendRange, setTrendRange] = useState<TrendRange>('6M');
  const [assetDrillLevel, setAssetDrillLevel] = useState<0 | 1>(0);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [accts, cats, snps, txs, ins, hlds, stgs] = await Promise.all([
          getAllAccounts(),
          getAllAccountCategories(),
          getSnapshots({ limit: 30 }),
          getTransactions({ limit: 500 }),
          getInsurances(),
          getHoldings({}),
          getSettings(),
        ]);
        setAccounts(accts);
        setCategories(cats);
        setSnapshots(snps);
        setTransactions(txs);
        setInsurances(ins);
        setHoldings(hlds);

        const activeLayoutKey = stgs.find((s) => s.key === 'active_dashboard_layout');
        if (activeLayoutKey?.value) setActiveTemplate(activeLayoutKey.value);
        else setActiveTemplate('default');
      } catch (e) {
        console.error('Dashboard load error', e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [location.key]);

  const totalAssets = accounts.filter((a) => a.type === 'asset').reduce((s, a) => s + a.balance, 0);
  const totalLiabilities = accounts
    .filter((a) => a.type === 'liability')
    .reduce((s, a) => s + a.balance, 0);
  const netWorth = totalAssets - totalLiabilities;

  const now = new Date();
  const thisMonth = now.toISOString().slice(0, 7);
  const monthTxs = transactions.filter((tx) => tx.transaction_date.startsWith(thisMonth));
  const monthlyIncome = monthTxs
    .filter((tx) => tx.transaction_type === 'income')
    .reduce((s, tx) => s + tx.amount, 0);
  const monthlyExpense = monthTxs
    .filter((tx) => tx.transaction_type === 'expense')
    .reduce((s, tx) => s + tx.amount, 0);
  const monthlyCashFlow = monthlyIncome - monthlyExpense;

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
  const totalUnrealizedPnl = holdings.reduce((s, h) => s + h.unrealized_pnl, 0);
  const cashFlowPositive = monthlyCashFlow >= 0;

  const liabilityAccounts = accounts.filter((a) => a.type === 'liability');
  const longTermLiab = liabilityAccounts.filter((a) => (a.term_months ?? 0) > 12);
  const shortTermLiab = liabilityAccounts.filter((a) => (a.term_months ?? 0) <= 12);
  const longTermTotal = longTermLiab.reduce((s, a) => s + a.balance, 0);
  const shortTermTotal = shortTermLiab.reduce((s, a) => s + a.balance, 0);

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
        series: [
          {
            type: 'pie',
            radius: ['45%', '75%'],
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
      series: [
        {
          type: 'pie',
          radius: ['35%', '60%'],
          center: ['50%', '50%'],
          data,
          label: { show: true, formatter: '{b}', fontSize: 10, color: '#475569' },
          emphasis: {
            itemStyle: { shadowBlur: 10, shadowOffsetX: 0, shadowColor: 'rgba(0,0,0,0.2)' },
          },
        },
      ],
    };
  }, [accounts, categories, assetDrillLevel, selectedCategoryId]);

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
    [assetDrillLevel, accounts, categories]
  );

  const liabilityBarOption: EChartsOption = {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (params: unknown) => {
        const ps = params as { name: string; value: number }[];
        return ps
          .map(
            (p) => `${p.name}: ¥${p.value.toLocaleString('zh-CN', { maximumFractionDigits: 0 })}`
          )
          .join('<br/>');
      },
    },
    grid: { left: '3%', right: '4%', bottom: '3%', top: '8%', containLabel: true },
    xAxis: {
      type: 'category',
      data: ['长期负债', '短期负债'],
      axisLabel: { fontSize: 11, color: '#64748b' },
      axisLine: { lineStyle: { color: '#e2e8f0' } },
    },
    yAxis: {
      type: 'value',
      axisLabel: {
        formatter: (v: number) => `¥${(v / 10000).toFixed(0)}万`,
        fontSize: 10,
        color: '#94a3b8',
      },
      splitLine: { lineStyle: { color: '#f1f5f9' } },
    },
    series: [
      {
        name: '负债金额',
        type: 'bar',
        barWidth: '50%',
        data: [
          {
            value: longTermTotal,
            itemStyle: {
              color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                { offset: 0, color: '#f43f5e' },
                { offset: 1, color: '#fb7185' },
              ]),
            },
            label: {
              show: true,
              position: 'top',
              formatter: `¥${longTermTotal.toLocaleString('zh-CN', { maximumFractionDigits: 0 })}`,
              fontSize: 10,
              color: '#e11d48',
            },
          },
          {
            value: shortTermTotal,
            itemStyle: {
              color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                { offset: 0, color: '#f97316' },
                { offset: 1, color: '#fb923c' },
              ]),
            },
            label: {
              show: true,
              position: 'top',
              formatter: `¥${shortTermTotal.toLocaleString('zh-CN', { maximumFractionDigits: 0 })}`,
              fontSize: 10,
              color: '#ea580c',
            },
          },
        ],
      },
    ],
  };

  const getTrendOption = useCallback((): EChartsOption => {
    const now = new Date();
    let months = 6;
    if (trendRange === '3M') months = 3;
    else if (trendRange === '1Y') months = 12;

    const labels: string[] = [];
    const assetSeries: number[] = [];
    const liabSeries: number[] = [];

    const snapshotMap = new Map<string, Snapshot>();
    for (const s of snapshots) snapshotMap.set(s.snapshot_date.slice(0, 7), s);

    for (let i = months - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = d.toISOString().slice(0, 7);
      labels.push(`${d.getMonth() + 1}月`);
      const snap = snapshotMap.get(key);
      if (snap) {
        assetSeries.push(snap.total_assets ?? totalAssets);
        liabSeries.push(snap.total_liabilities ?? totalLiabilities);
      } else {
        const variation = 1 + Math.sin(i * 1.3) * 0.03;
        assetSeries.push(totalAssets * variation);
        liabSeries.push(totalLiabilities * variation);
      }
    }

    return {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'cross' },
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
        data: ['总资产', '总负债'],
        bottom: 0,
        textStyle: { fontSize: 11, color: '#64748b' },
      },
      grid: { left: '3%', right: '4%', bottom: '18%', top: '8%', containLabel: true },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: labels,
        axisLine: { lineStyle: { color: '#e2e8f0' } },
        axisLabel: { fontSize: 11, color: '#94a3b8' },
      },
      yAxis: {
        type: 'value',
        axisLabel: {
          formatter: (v: number) => `¥${(v / 10000).toFixed(0)}万`,
          fontSize: 10,
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
          lineStyle: { color: '#10b981', width: 2 },
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
          lineStyle: { color: '#f43f5e', width: 2 },
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
  }, [trendRange, snapshots, totalAssets, totalLiabilities]);

  const getInvestBarOption = useCallback((): EChartsOption => {
    const sorted = [...holdings].sort((a, b) =>
      (a.last_price_update ?? '').localeCompare(b.last_price_update ?? '')
    );
    const labels = sorted.slice(-6).map((h) => h.name.slice(0, 6));
    return {
      tooltip: { trigger: 'axis' },
      legend: { data: ['市值', '成本'], bottom: 0, textStyle: { fontSize: 11, color: '#64748b' } },
      grid: { left: '3%', right: '4%', bottom: '18%', top: '8%', containLabel: true },
      xAxis: {
        type: 'category',
        data: labels,
        axisLabel: { fontSize: 10, color: '#94a3b8', rotate: 15 },
        axisLine: { lineStyle: { color: '#e2e8f0' } },
      },
      yAxis: {
        type: 'value',
        axisLabel: {
          formatter: (v: number) => `¥${(v / 10000).toFixed(1)}万`,
          fontSize: 10,
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
  }, [holdings]);

  const getHoldingsRankOption = useCallback((): EChartsOption => {
    const sortedRank = [...holdings].sort((a, b) => b.current_value - a.current_value).slice(0, 8);
    return {
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
      grid: { left: '3%', right: '4%', bottom: '3%', top: '3%', containLabel: true },
      xAxis: {
        type: 'value',
        axisLabel: {
          formatter: (v: number) => `¥${(v / 10000).toFixed(0)}万`,
          fontSize: 9,
          color: '#94a3b8',
        },
        splitLine: { lineStyle: { color: '#f1f5f9' } },
      },
      yAxis: {
        type: 'category',
        data: sortedRank.map((h) => h.name.slice(0, 6)).reverse(),
        axisLabel: { fontSize: 9, color: '#64748b' },
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
  }, [holdings]);

  const recentTxs = transactions.slice(0, 8);

  const handleDeleteTransaction = async (id: number) => {
    const confirmed = await ask('确定要删除这条交易记录吗？', {
      title: '确认删除',
      kind: 'warning',
    });
    if (!confirmed) return;
    try {
      await deleteTransaction(id);
      setTransactions((prev) => prev.filter((tx) => tx.id !== id));
    } catch (err) {
      console.error('删除交易记录失败', err);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <div className="relative">
          <div className="w-12 h-12 border-4 border-slate-200 border-t-indigo-500 rounded-full animate-spin" />
          <span className="absolute inset-0 flex items-center justify-center text-xl">🐷</span>
        </div>
        <p className="text-sm text-slate-500 animate-pulse">正在整理您的财务数据...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <img
            src="/mascot2.png"
            alt="吉祥物"
            className="w-16 h-16 object-contain"
            style={{ filter: 'drop-shadow(0 4px 8px rgba(99,102,241,0.25))' }}
          />
          <div>
            <h1 className="text-xl font-bold text-slate-800">财务仪表盘</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              {accounts.length} 个账户 · {transactions.length} 笔交易 · 更新于{' '}
              {new Date().toLocaleDateString('zh-CN')}
            </p>
          </div>
        </div>
        <select
          value={activeTemplate}
          onChange={async (e) => {
            const template = e.target.value;
            setActiveTemplate(template);
            try {
              await setSetting('active_dashboard_layout', template, 'string', '当前看板布局');
            } catch (err) {
              console.error('切换布局失败:', err);
            }
          }}
          className="px-3 py-1.5 rounded-lg text-sm border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
        >
          <option value="default">📊 财务概览</option>
          <option value="investment">📈 投资详情</option>
          <option value="wealth">💰 财富健康</option>
        </select>
      </div>

      <div className="grid grid-cols-12 gap-3">
        <div className="col-span-12 grid grid-cols-12 gap-3">
          <div className="col-span-4">
            <KpiCard
              label="净资产"
              value={`¥${netWorth.toLocaleString('zh-CN', { maximumFractionDigits: 0 })}`}
              icon={<IconPiggy />}
              gradientFrom="#4f46e5"
              gradientTo="#6366f1"
              trend={2.3}
              subValue={`资产 ¥${totalAssets.toLocaleString('zh-CN', { maximumFractionDigits: 0 })}`}
              subLabel="总资产"
            />
          </div>
          <div className="col-span-2">
            <KpiCard
              label="总资产"
              value={`¥${(totalAssets / 10000).toFixed(0)}万`}
              icon={<IconBuilding />}
              gradientFrom="#10b981"
              gradientTo="#059669"
              trend={3.1}
            />
          </div>
          <div className="col-span-2">
            <KpiCard
              label="总负债"
              value={`¥${(totalLiabilities / 10000).toFixed(0)}万`}
              icon={<IconCard />}
              gradientFrom="#f43f5e"
              gradientTo="#e11d48"
              trend={-1.2}
            />
          </div>
          <div className="col-span-2">
            <KpiCard
              label="月现金流"
              value={`¥${(monthlyCashFlow / 1000).toFixed(0)}k`}
              icon={<IconTrendUp />}
              gradientFrom={cashFlowPositive ? '#0ea5e9' : '#f97316'}
              gradientTo={cashFlowPositive ? '#0284c7' : '#ea580c'}
              subValue={`收入 ¥${(monthlyIncome / 1000).toFixed(0)}k / 支出 ¥${(monthlyExpense / 1000).toFixed(0)}k`}
              subLabel="本月"
            />
          </div>
          <div className="col-span-2">
            <KpiCard
              label="投资总额"
              value={`¥${(totalMarketValue / 10000).toFixed(0)}万`}
              icon={<IconChart />}
              gradientFrom="#6366f1"
              gradientTo="#4f46e5"
              subValue={`${totalUnrealizedPnl >= 0 ? '+' : ''}¥${(totalUnrealizedPnl / 1000).toFixed(0)}k`}
              subLabel="未实现收益"
            />
          </div>
        </div>

        <div className="col-span-8">
          <SectionCard
            title="资产分布"
            action={
              assetDrillLevel === 1 ? (
                <button
                  type="button"
                  onClick={() => setAssetDrillLevel(0)}
                  className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800"
                >
                  <IconArrowLeft />
                  <span>返回</span>
                </button>
              ) : undefined
            }
          >
            <ReactECharts
              option={getAssetDonutOption()}
              style={{ height: 180 }}
              onEvents={{ click: handleAssetDonutClick }}
              opts={{ renderer: 'canvas' }}
            />
            <p className="text-center text-xs text-slate-400 mt-1">
              {assetDrillLevel === 0
                ? '点击查看子类'
                : `查看: ${categories.find((c) => c.id === selectedCategoryId)?.name ?? ''}`}
            </p>
          </SectionCard>
        </div>
        <div className="col-span-4">
          <SectionCard title="保险保障">
            <div className="grid grid-cols-3 gap-2 h-full">
              <div className="bg-blue-50 rounded-lg p-2 text-center flex flex-col justify-center">
                <p className="text-xs text-blue-600 font-medium">年保费</p>
                <p className="text-sm font-bold text-blue-700 mt-1">
                  ¥{(totalPremium / 10000).toFixed(1)}万
                </p>
                <p className="text-[10px] text-blue-400 mt-0.5">{activeInsuranceCount}份保单</p>
              </div>
              <div className="bg-amber-50 rounded-lg p-2 text-center flex flex-col justify-center">
                <p className="text-xs text-amber-600 font-medium">总保额</p>
                <p className="text-sm font-bold text-amber-700 mt-1">
                  ¥{(totalCoverage / 10000).toFixed(0)}万
                </p>
                <p className="text-[10px] text-amber-400 mt-0.5">风险保障</p>
              </div>
              <div
                className={`${renewalSoon > 0 ? 'bg-red-50' : 'bg-emerald-50'} rounded-lg p-2 text-center flex flex-col justify-center`}
              >
                <p
                  className={`text-xs ${renewalSoon > 0 ? 'text-red-600' : 'text-emerald-600'} font-medium`}
                >
                  待续保
                </p>
                <p
                  className={`text-sm font-bold ${renewalSoon > 0 ? 'text-red-700' : 'text-emerald-700'} mt-1`}
                >
                  {renewalSoon}
                </p>
                <p
                  className={`text-[10px] ${renewalSoon > 0 ? 'text-red-400' : 'text-emerald-400'} mt-0.5`}
                >
                  {renewalSoon > 0 ? '30天内' : '暂无'}
                </p>
              </div>
            </div>
          </SectionCard>
        </div>

        <div className="col-span-12">
          <SectionCard
            title="资产负债趋势"
            action={
              <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-md">
                {(['3M', '6M', '1Y'] as TrendRange[]).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setTrendRange(r)}
                    className={`px-2 py-0.5 rounded text-xs font-medium transition-all ${trendRange === r ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            }
          >
            <ReactECharts
              option={getTrendOption()}
              style={{ height: 160 }}
              opts={{ renderer: 'canvas' }}
            />
          </SectionCard>
        </div>

        {activeTemplate === 'investment' && (
          <>
            <div className="col-span-8">
              <SectionCard title="投资收益趋势">
                <ReactECharts
                  option={getInvestBarOption()}
                  style={{ height: 160 }}
                  opts={{ renderer: 'canvas' }}
                />
              </SectionCard>
            </div>
            <div className="col-span-4">
              <SectionCard title="持仓排名">
                <ReactECharts
                  option={getHoldingsRankOption()}
                  style={{ height: 160 }}
                  opts={{ renderer: 'canvas' }}
                />
              </SectionCard>
            </div>
          </>
        )}

        {activeTemplate === 'wealth' && (
          <>
            <div className="col-span-6">
              <SectionCard title="负债结构">
                <ReactECharts
                  option={liabilityBarOption}
                  style={{ height: 160 }}
                  opts={{ renderer: 'canvas' }}
                />
              </SectionCard>
            </div>
          </>
        )}

        <div className="col-span-12">
          <SectionCard title="近期交易">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-slate-500 border-b border-slate-100">
                    <th className="text-left py-1.5 font-medium">日期</th>
                    <th className="text-right py-1.5 font-medium">金额</th>
                    <th className="text-left py-1.5 font-medium">类型</th>
                    <th className="w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {recentTxs.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="text-center text-slate-400 py-4">
                        暂无交易数据
                      </td>
                    </tr>
                  ) : (
                    recentTxs.map((tx) => (
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
                        <td className="py-1.5 text-right">
                          <button
                            type="button"
                            onClick={() => handleDeleteTransaction(tx.id)}
                            className="text-slate-400 hover:text-red-500 transition-colors p-1"
                            title="删除"
                          >
                            <svg
                              width="14"
                              height="14"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <polyline points="3 6 5 6 21 6" />
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                            </svg>
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
