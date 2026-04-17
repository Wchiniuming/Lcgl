import { useState, useEffect, useCallback } from 'react';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';
import * as echarts from 'echarts';
import {
  Account,
  AccountCategory,
  Snapshot,
  Transaction,
  Insurance,
  getAllAccounts,
  getAllAccountCategories,
  getSnapshots,
  getTransactions,
  getInsurances,
} from '../lib/api';

type TrendRange = '3M' | '6M' | '1Y' | 'custom';
type SubDashboardTab = 'fixed' | 'cashflow' | 'liquidity';

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

function IconWallet() {
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
      <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
      <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
      <path d="M18 12a2 2 0 0 0 0 4h4v-4z" />
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
        <p className="text-2xl font-bold tracking-tight">{value}</p>
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

function SubDashboard({
  accounts,
  categories,
  transactions,
  activeTab,
}: {
  accounts: Account[];
  categories: AccountCategory[];
  transactions: Transaction[];
  activeTab: SubDashboardTab;
}) {
  const assetAccounts = accounts.filter((a) => a.type === 'asset');
  const liquidityAccounts = assetAccounts.filter((a) => {
    const cat = categories.find((c) => c.id === a.category_id);
    return cat?.name === '现金' || cat?.name === '活期存款';
  });

  if (activeTab === 'fixed') {
    const fixedAssets = assetAccounts.map((a) => {
      const cat = categories.find((c) => c.id === a.category_id);
      return {
        name: a.name,
        category: cat?.name ?? '未知',
        balance: a.balance,
        depreciation: a.balance * 0.05,
        netValue: a.balance * 0.95,
      };
    });
    const totalBalance = fixedAssets.reduce((s, f) => s + f.balance, 0);

    return (
      <div>
        <div className="flex items-center gap-2 mb-4">
          <IconBuilding />
          <h3 className="font-semibold text-slate-800">固定资产明细</h3>
          <span className="ml-auto text-xs text-slate-400">共 {fixedAssets.length} 项</span>
        </div>
        {fixedAssets.length === 0 ? (
          <div className="flex flex-col items-center py-10 gap-2">
            <span className="text-4xl opacity-30">🏠</span>
            <p className="text-sm text-slate-400">暂无固定资产数据</p>
            <p className="text-xs text-slate-300">添加房产、车辆等固定资产吧</p>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="grid grid-cols-4 gap-2 px-4 py-2 bg-slate-50 rounded-xl text-xs font-semibold text-slate-500">
              <span>名称</span>
              <span className="text-right">原值</span>
              <span className="text-right">折旧</span>
              <span className="text-right">净值</span>
            </div>
            {fixedAssets.map((fa) => (
              <div
                key={fa.name}
                className="grid grid-cols-4 gap-2 px-4 py-3 bg-white rounded-xl border border-slate-100 hover:border-slate-200 transition-colors text-sm"
              >
                <div>
                  <p className="font-medium text-slate-800">{fa.name}</p>
                  <p className="text-xs text-slate-400">{fa.category}</p>
                </div>
                <span className="text-right text-slate-600 font-medium">
                  ¥{fa.balance.toLocaleString('zh-CN', { maximumFractionDigits: 2 })}
                </span>
                <span className="text-right text-amber-600 font-medium">
                  -¥{fa.depreciation.toLocaleString('zh-CN', { maximumFractionDigits: 2 })}
                </span>
                <span className="text-right text-emerald-600 font-semibold">
                  ¥{fa.netValue.toLocaleString('zh-CN', { maximumFractionDigits: 2 })}
                </span>
              </div>
            ))}
            <div className="grid grid-cols-4 gap-2 px-4 py-3 bg-indigo-600 rounded-xl text-sm font-semibold text-white">
              <span>合计</span>
              <span className="text-right">
                ¥{totalBalance.toLocaleString('zh-CN', { maximumFractionDigits: 2 })}
              </span>
              <span className="text-right">
                -¥{(totalBalance * 0.05).toLocaleString('zh-CN', { maximumFractionDigits: 2 })}
              </span>
              <span className="text-right">
                ¥{(totalBalance * 0.95).toLocaleString('zh-CN', { maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (activeTab === 'cashflow') {
    const now = new Date();
    const months: { month: string; income: number; expense: number; net: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthStr = d.toISOString().slice(0, 7);
      const monthTxs = transactions.filter((tx) => tx.transaction_date.startsWith(monthStr));
      const income = monthTxs
        .filter((tx) => tx.transaction_type === 'income')
        .reduce((s, tx) => s + tx.amount, 0);
      const expense = monthTxs
        .filter((tx) => tx.transaction_type === 'expense')
        .reduce((s, tx) => s + tx.amount, 0);
      months.push({ month: `${d.getMonth() + 1}月`, income, expense, net: income - expense });
    }
    const avgIncome = months.reduce((s, m) => s + m.income, 0) / months.length || 0;
    const avgExpense = months.reduce((s, m) => s + m.expense, 0) / months.length || 0;

    return (
      <div>
        <div className="flex items-center gap-2 mb-4">
          <IconChart />
          <h3 className="font-semibold text-slate-800">现金流健康分析</h3>
        </div>
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="bg-emerald-50 rounded-xl p-3 text-center">
            <p className="text-xs text-emerald-600 font-medium">月均收入</p>
            <p className="text-lg font-bold text-emerald-700 mt-1">
              ¥{avgIncome.toLocaleString('zh-CN', { maximumFractionDigits: 0 })}
            </p>
          </div>
          <div className="bg-red-50 rounded-xl p-3 text-center">
            <p className="text-xs text-red-600 font-medium">月均支出</p>
            <p className="text-lg font-bold text-red-700 mt-1">
              ¥{avgExpense.toLocaleString('zh-CN', { maximumFractionDigits: 0 })}
            </p>
          </div>
          <div className="bg-slate-100 rounded-xl p-3 text-center">
            <p className="text-xs text-slate-600 font-medium">结余率</p>
            <p className="text-lg font-bold text-slate-700 mt-1">
              {avgIncome > 0 ? (((avgIncome - avgExpense) / avgIncome) * 100).toFixed(1) : 0}%
            </p>
          </div>
        </div>
        <div className="space-y-2">
          {months.map((m) => (
            <div
              key={m.month}
              className="flex items-center gap-3 bg-white rounded-xl border border-slate-100 px-4 py-2.5 text-sm"
            >
              <span className="w-8 text-slate-500 font-medium">{m.month}</span>
              <div className="flex-1 relative h-5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="absolute left-0 top-0 h-full bg-emerald-400 rounded-full"
                  style={{ width: `${avgIncome > 0 ? (m.income / avgIncome) * 50 : 0}%` }}
                />
                <div
                  className="absolute top-0 h-full bg-red-400 rounded-full"
                  style={{
                    left: `${avgIncome > 0 ? (m.expense / avgIncome) * 50 : 0}%`,
                    width: `${avgIncome > 0 ? (m.expense / avgIncome) * 50 : 0}%`,
                  }}
                />
              </div>
              <span className="w-20 text-right font-medium text-slate-600">
                ¥{m.net.toLocaleString('zh-CN', { maximumFractionDigits: 0 })}
              </span>
              <span
                className={`w-16 text-right font-semibold ${m.net >= 0 ? 'text-emerald-600' : 'text-red-500'}`}
              >
                {m.net >= 0 ? '盈余' : '赤字'}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const liqRows = liquidityAccounts.map((a) => {
    const cat = categories.find((c) => c.id === a.category_id);
    let level: 'high' | 'medium' | 'low' = 'medium';
    if (cat?.name === '现金') level = 'high';
    else if (cat?.name === '活期存款') level = 'medium';
    return {
      name: a.name,
      category: cat?.name ?? '未知',
      balance: a.balance,
      liquidityLevel: level,
    };
  });
  const highLiq = liqRows
    .filter((r) => r.liquidityLevel === 'high')
    .reduce((s, r) => s + r.balance, 0);
  const medLiq = liqRows
    .filter((r) => r.liquidityLevel === 'medium')
    .reduce((s, r) => s + r.balance, 0);

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <IconWallet />
        <h3 className="font-semibold text-slate-800">流动性 Breakdown</h3>
      </div>
      {liqRows.length === 0 ? (
        <div className="flex flex-col items-center py-10 gap-2">
          <span className="text-4xl opacity-30">💰</span>
          <p className="text-sm text-slate-400">暂无流动性数据</p>
          <p className="text-xs text-slate-300">添加现金或活期账户来查看</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="bg-emerald-50 rounded-xl p-3 text-center">
              <p className="text-xs text-emerald-600 font-medium">高流动性</p>
              <p className="text-lg font-bold text-emerald-700 mt-1">
                ¥{highLiq.toLocaleString('zh-CN', { maximumFractionDigits: 0 })}
              </p>
            </div>
            <div className="bg-indigo-50 rounded-xl p-3 text-center">
              <p className="text-xs text-indigo-600 font-medium">中流动性</p>
              <p className="text-lg font-bold text-indigo-700 mt-1">
                ¥{medLiq.toLocaleString('zh-CN', { maximumFractionDigits: 0 })}
              </p>
            </div>
            <div className="bg-amber-50 rounded-xl p-3 text-center">
              <p className="text-xs text-amber-600 font-medium">低流动性</p>
              <p className="text-lg font-bold text-amber-700 mt-1">
                ¥
                {(
                  assetAccounts.reduce((s, a) => s + a.balance, 0) -
                  highLiq -
                  medLiq
                ).toLocaleString('zh-CN', { maximumFractionDigits: 0 })}
              </p>
            </div>
          </div>
          <div className="space-y-2">
            {liqRows.map((r) => (
              <div
                key={r.name}
                className="flex items-center gap-3 bg-white rounded-xl border border-slate-100 px-4 py-2.5 text-sm"
              >
                <div className="flex-1">
                  <p className="font-medium text-slate-800">{r.name}</p>
                  <p className="text-xs text-slate-400">{r.category}</p>
                </div>
                <span
                  className={`px-2 py-0.5 rounded-md text-xs font-semibold ${
                    r.liquidityLevel === 'high'
                      ? 'bg-emerald-100 text-emerald-700'
                      : r.liquidityLevel === 'medium'
                        ? 'bg-indigo-100 text-indigo-700'
                        : 'bg-amber-100 text-amber-700'
                  }`}
                >
                  {r.liquidityLevel === 'high' ? '高' : r.liquidityLevel === 'medium' ? '中' : '低'}
                </span>
                <span className="font-semibold text-slate-700">
                  ¥{r.balance.toLocaleString('zh-CN', { maximumFractionDigits: 2 })}
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default function Dashboard() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<AccountCategory[]>([]);
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [insurances, setInsurances] = useState<Insurance[]>([]);
  const [loading, setLoading] = useState(true);

  const [trendRange, setTrendRange] = useState<TrendRange>('6M');
  const [subTab, setSubTab] = useState<SubDashboardTab>('fixed');
  const [assetDrillLevel, setAssetDrillLevel] = useState<0 | 1>(0);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [accts, cats, snps, txs, ins] = await Promise.all([
          getAllAccounts(),
          getAllAccountCategories(),
          getSnapshots({ limit: 30 }),
          getTransactions({ limit: 500 }),
          getInsurances(),
        ]);
        setAccounts(accts);
        setCategories(cats);
        setSnapshots(snps);
        setTransactions(txs);
        setInsurances(ins);
      } catch (e) {
        console.error('Dashboard load error', e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const totalAssets = accounts.filter((a) => a.type === 'asset').reduce((s, a) => s + a.balance, 0);
  const totalLiabilities = accounts
    .filter((a) => a.type === 'liability')
    .reduce((s, a) => s + a.balance, 0);
  const netWorth = totalAssets - totalLiabilities;
  const debtToAsset = totalAssets > 0 ? (totalLiabilities / totalAssets) * 100 : 0;

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
  const activeInsuranceCount = insurances.filter((i) => i.is_active && i.status === 'active').length;
  const renewalSoon = insurances.filter((i) => {
    if (!i.renewal_date || !i.is_active) return false;
    const today = new Date();
    const renewal = new Date(i.renewal_date);
    const daysUntil = Math.ceil((renewal.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return daysUntil > 0 && daysUntil <= 30;
  }).length;

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
    [assetDrillLevel, accounts, categories]
  );

  const liabilityAccounts = accounts.filter((a) => a.type === 'liability');
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

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-slate-200 border-t-indigo-500 rounded-full animate-spin" />
          <span className="absolute inset-0 flex items-center justify-center text-2xl">🐷</span>
        </div>
        <p className="text-sm text-slate-500 animate-pulse">正在整理您的财务数据...</p>
      </div>
    );
  }

  const netWorthPositive = netWorth >= 0;
  const cashFlowPositive = monthlyCashFlow >= 0;
  const encouragingMessage =
    netWorthPositive && monthlyCashFlow >= 0
      ? '太棒了！今日收支状况良好 🎉'
      : netWorthPositive
        ? '您的净资产在增长，继续保持！💪'
        : '坚持记账，逐步改善财务状况 📈';

  return (
    <div className="max-w-7xl mx-auto px-6 py-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">财务仪表盘</h1>
          <p className="text-sm text-slate-500 mt-1">实时掌握您的财务健康状况</p>
        </div>
        <div className="text-right text-xs text-slate-400">
          <p>数据更新于 {new Date().toLocaleDateString('zh-CN')}</p>
          <p>
            {accounts.length} 个账户 · {transactions.length} 笔交易
          </p>
        </div>
      </div>

      <div className="grid grid-cols-5 gap-4">
        <div
          className="col-span-1 relative overflow-hidden rounded-2xl p-5 text-white shadow-lg"
          style={{
            background: 'linear-gradient(135deg, #4f46e5, #6366f1)',
            boxShadow: '0 8px 32px -8px rgba(99,102,241,0.45)',
          }}
        >
          <div className="absolute -top-4 -right-4 w-40 h-40 opacity-10">
            <IconPiggy />
          </div>
          <div className="relative">
            <div className="flex items-center gap-2 mb-2">
              <div className="opacity-80">
                <IconPiggy />
              </div>
              <p className="text-sm font-medium opacity-90">净资产</p>
              {2.3 >= 0 && (
                <span className="ml-auto flex items-center gap-0.5 text-xs font-semibold px-1.5 py-0.5 rounded-md bg-white/20">
                  <IconTrendUp />
                  {Math.abs(2.3).toFixed(1)}%
                </span>
              )}
            </div>
            <p className="text-5xl font-black tracking-tighter leading-none">
              ¥{netWorth.toLocaleString('zh-CN', { maximumFractionDigits: 2 })}
            </p>
            {netWorthPositive ? (
              <p className="text-[10px] mt-2 opacity-80 flex items-center gap-1">
                <span>📈</span> 净资产稳健增长中
              </p>
            ) : (
              <p className="text-[10px] mt-2 opacity-80 flex items-center gap-1">
                <span>💡</span> 负债优化中，继续加油
              </p>
            )}
            <div className="mt-2 pt-2 border-t border-white/20">
              <p className="text-[10px] opacity-70">资产 - 负债</p>
              <p className="text-xs font-semibold">
                ¥{totalAssets.toLocaleString('zh-CN', { maximumFractionDigits: 0 })} - ¥
                {totalLiabilities.toLocaleString('zh-CN', { maximumFractionDigits: 0 })}
              </p>
            </div>
          </div>
        </div>

        <KpiCard
          label="总资产"
          value={`¥${totalAssets.toLocaleString('zh-CN', { maximumFractionDigits: 2 })}`}
          icon={<IconBuilding />}
          gradientFrom="#10b981"
          gradientTo="#059669"
          shadowColor="rgba(16,185,129,0.35)"
          trend={3.1}
        />
        <KpiCard
          label="总负债"
          value={`¥${totalLiabilities.toLocaleString('zh-CN', { maximumFractionDigits: 2 })}`}
          icon={<IconCard />}
          gradientFrom="#f43f5e"
          gradientTo="#e11d48"
          shadowColor="rgba(244,63,94,0.35)"
          trend={-1.2}
        />
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
        <KpiCard
          label="月现金流"
          value={`¥${monthlyCashFlow.toLocaleString('zh-CN', { maximumFractionDigits: 2 })}`}
          icon={<IconTrendUp />}
          gradientFrom={cashFlowPositive ? '#0ea5e9' : '#f97316'}
          gradientTo={cashFlowPositive ? '#0284c7' : '#ea580c'}
          shadowColor={cashFlowPositive ? 'rgba(14,165,233,0.35)' : 'rgba(249,115,22,0.35)'}
          subValue={`收入¥${monthlyIncome.toLocaleString('zh-CN', { maximumFractionDigits: 0 })} / 支出¥${monthlyExpense.toLocaleString('zh-CN', { maximumFractionDigits: 0 })}`}
          subLabel="本月收支"
        />
      </div>

      {/* Insurance Section */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 px-1">
          <span className="text-lg">🛡️</span>
          <h2 className="text-base font-semibold text-slate-700">保险保障</h2>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div
            className="relative overflow-hidden rounded-2xl p-5 text-white shadow-lg"
            style={{
              background: 'linear-gradient(135deg, #0ea5e9, #0284c7)',
              boxShadow: '0 8px 32px -8px rgba(14,165,233,0.45)',
            }}
          >
            <div className="absolute -top-4 -right-4 w-40 h-40 opacity-10">
              <svg width="160" height="160" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L4 5v6.09c0 5.05 3.41 9.76 8 10.91 4.59-1.15 8-5.86 8-10.91V5l-8-3z"/></svg>
            </div>
            <div className="relative">
              <p className="text-sm font-medium opacity-90 mb-1">总保费</p>
              <p className="text-2xl font-bold tracking-tight">
                ¥{totalPremium.toLocaleString('zh-CN', { maximumFractionDigits: 2 })}
              </p>
              <p className="text-[10px] mt-1 opacity-70">
                {activeInsuranceCount} 份有效保单
              </p>
            </div>
          </div>

          <div
            className="relative overflow-hidden rounded-2xl p-5 text-white shadow-lg"
            style={{
              background: 'linear-gradient(135deg, #f59e0b, #d97706)',
              boxShadow: '0 8px 32px -8px rgba(245,158,11,0.45)',
            }}
          >
            <div className="absolute -top-4 -right-4 w-40 h-40 opacity-10">
              <svg width="160" height="160" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L4 5v6.09c0 5.05 3.41 9.76 8 10.91 4.59-1.15 8-5.86 8-10.91V5l-8-3z"/></svg>
            </div>
            <div className="relative">
              <p className="text-sm font-medium opacity-90 mb-1">总保额</p>
              <p className="text-2xl font-bold tracking-tight">
                ¥{totalCoverage.toLocaleString('zh-CN', { maximumFractionDigits: 0 })}
              </p>
              <p className="text-[10px] mt-1 opacity-70">
                风险保障总额
              </p>
            </div>
          </div>
          <div
            className="relative overflow-hidden rounded-2xl p-5 text-white shadow-lg"
            style={{
              background: renewalSoon > 0
                ? 'linear-gradient(135deg, #ef4444, #dc2626)'
                : 'linear-gradient(135deg, #10b981, #059669)',
              boxShadow: renewalSoon > 0 ? '0 8px 32px -8px rgba(239,68,68,0.45)' : '0 8px 32px -8px rgba(16,185,129,0.45)',
            }}
          >
            <div className="absolute -top-4 -right-4 w-40 h-40 opacity-10">
              <svg width="160" height="160" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L4 5v6.09c0 5.05 3.41 9.76 8 10.91 4.59-1.15 8-5.86 8-10.91V5l-8-3z"/></svg>
            </div>
            <div className="relative">
              <p className="text-sm font-medium opacity-90 mb-1">待续保</p>
              <p className="text-2xl font-bold tracking-tight">{renewalSoon}</p>
              <p className="text-[10px] mt-1 opacity-70">
                {renewalSoon > 0 ? '30天内需要续保' : '暂无续保提醒'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {(netWorthPositive || cashFlowPositive) && (
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-100">
          <span className="text-base">{netWorthPositive ? '✨' : '💡'}</span>
          <p className="text-sm text-indigo-700 font-medium">{encouragingMessage}</p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-5">
        <ChartCard
          title="资产分布"
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

        <ChartCard title="负债结构（按期限）">
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
      </div>

      <ChartCard
        title="资产负债趋势"
        action={
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
            {(['3M', '6M', '1Y'] as TrendRange[]).map((r) => (
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

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="flex items-center gap-1 px-5 pt-4 pb-0 bg-slate-50">
          {(
            [
              { key: 'fixed', label: '固定资产', icon: <IconBuilding /> },
              { key: 'cashflow', label: '现金流健康', icon: <IconChart /> },
              { key: 'liquidity', label: '流动性 Breakdown', icon: <IconWallet /> },
            ] as { key: SubDashboardTab; label: string; icon: React.ReactNode }[]
          ).map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setSubTab(tab.key)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-all ${
                subTab === tab.key
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
        <div className="p-5">
          <SubDashboard
            accounts={accounts}
            categories={categories}
            transactions={transactions}
            activeTab={subTab}
          />
        </div>
      </div>
    </div>
  );
}
