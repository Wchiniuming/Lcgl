import { useState, useEffect, useCallback, useMemo } from 'react';
import { Holding, HoldingType, getHoldings, archiveHolding, getReminders } from '../lib/api';
import { HoldingForm, BatchPriceUpdate } from '../components/HoldingForm';
import { SipPlanPanel, SipPlan } from '../components/SipPlan';

type Tab = 'holdings' | 'transactions' | 'sip' | 'archived';
type SortKey = 'symbol' | 'current_value' | 'unrealized_pnl' | 'return_pct' | 'annualized_return';
type SortDir = 'asc' | 'desc';

function cn(...classes: (string | boolean | undefined | null)[]) {
  return classes.filter(Boolean).join(' ');
}

const HOLDING_TYPE_LABELS: Record<HoldingType, string> = {
  stock: '股票',
  fund: '基金',
  bond: '债券',
  bank_financial: '银行理财',
  precious_metal: '贵金属',
  other: '其他',
};

interface HoldingWithMetrics extends Holding {
  return_pct: number;
  annualized_return: number;
}

function calcMetrics(h: Holding): { return_pct: number; annualized_return: number } {
  if (h.cost_basis <= 0) return { return_pct: 0, annualized_return: 0 };
  const ret = ((h.current_value - h.cost_basis) / h.cost_basis) * 100;
  const annualized = ret;
  if (h.purchase_date) {
    const start = new Date(h.purchase_date);
    const now = new Date();
    const years = (now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
    if (years > 0.01) {
      const annualizedRaw = (Math.pow(h.current_value / h.cost_basis, 1 / years) - 1) * 100;
      return { return_pct: ret, annualized_return: annualizedRaw };
    }
  }
  return { return_pct: ret, annualized_return: annualized };
}

export default function Portfolio() {
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [archivedHoldings, setArchivedHoldings] = useState<Holding[]>([]);
  const [sipPlans, setSipPlans] = useState<SipPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<Tab>('holdings');
  const [sortKey, setSortKey] = useState<SortKey>('current_value');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [filterType, setFilterType] = useState<HoldingType | 'all'>('all');
  const [showForm, setShowForm] = useState(false);
  const [showBatchPrice, setShowBatchPrice] = useState(false);
  const [editingHolding, setEditingHolding] = useState<Holding | null>(null);
  const [showArchiveHistory, setShowArchiveHistory] = useState<Holding | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [active, archived, reminders] = await Promise.all([
        getHoldings({ includeArchived: false }),
        getHoldings({ includeArchived: true }),
        getReminders({ reminderType: 'investment_due' }),
      ]);
      setHoldings(active.filter((h) => !h.is_archived));
      setArchivedHoldings(archived.filter((h) => h.is_archived));
      const plans: SipPlan[] = reminders
        .filter((r) => r.title.startsWith('定投'))
        .map((r) => {
          let extra = {
            symbol: '',
            name: '',
            amount: 0,
            frequency: 'monthly' as const,
            completedCount: 0,
            totalInvested: 0,
          };
          try {
            if (r.notes) extra = JSON.parse(r.notes);
          } catch {}
          return {
            id: r.id,
            holdingId: r.holding_id,
            symbol: extra.symbol || r.title.split(' ')[1] || '',
            name: extra.name || r.title,
            amount: extra.amount || 0,
            currency: 'CNY',
            frequency: extra.frequency || 'monthly',
            nextDueDate: r.target_date,
            isActive: r.is_active && !r.is_completed,
            completedCount: extra.completedCount || 0,
            totalInvested: extra.totalInvested || 0,
            createdAt: r.created_at,
          } satisfies SipPlan;
        });
      setSipPlans(plans);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const holdingsWithMetrics: HoldingWithMetrics[] = useMemo(() => {
    return holdings
      .map((h) => ({ ...h, ...calcMetrics(h) }))
      .filter((h) => filterType === 'all' || h.holding_type === filterType)
      .sort((a, b) => {
        let av: number, bv: number;
        switch (sortKey) {
          case 'symbol':
            return sortDir === 'asc'
              ? a.symbol.localeCompare(b.symbol)
              : b.symbol.localeCompare(a.symbol);
          case 'current_value':
            av = a.current_value;
            bv = b.current_value;
            break;
          case 'unrealized_pnl':
            av = a.unrealized_pnl;
            bv = b.unrealized_pnl;
            break;
          case 'return_pct':
            av = a.return_pct;
            bv = b.return_pct;
            break;
          case 'annualized_return':
            av = a.annualized_return;
            bv = b.annualized_return;
            break;
          default:
            av = a.current_value;
            bv = b.current_value;
        }
        return sortDir === 'asc' ? av - bv : bv - av;
      });
  }, [holdings, sortKey, sortDir, filterType]);

  const summary = useMemo(() => {
    const totalValue = holdings.reduce((s, h) => s + h.current_value, 0);
    const totalCost = holdings.reduce((s, h) => s + h.cost_basis, 0);
    const totalPnl = holdings.reduce((s, h) => s + h.unrealized_pnl, 0);
    const totalRealized = holdings.reduce((s, h) => s + h.realized_pnl, 0);
    return { totalValue, totalCost, totalPnl, totalRealized };
  }, [holdings]);

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  }

  function SortIcon({ k }: { k: SortKey }) {
    if (sortKey !== k) return <span className="text-slate-400 ml-1">↕</span>;
    return <span className="text-amber-400 ml-1">{sortDir === 'asc' ? '↑' : '↓'}</span>;
  }

  async function handleArchive(h: Holding) {
    try {
      await archiveHolding(h.id);
      loadData();
    } catch (err) {
      setError(String(err));
    }
  }

  if (loading && holdings.length === 0) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center gap-3">
        <div className="relative">
          <div className="w-12 h-12 border-4 border-amber-100 border-t-amber-500 rounded-full animate-spin" />
          <span className="absolute inset-0 flex items-center justify-center text-lg">📈</span>
        </div>
        <p className="text-sm text-slate-500 animate-pulse">正在加载投资组合...</p>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen bg-slate-50 text-slate-800"
      style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}
    >
      {/* Header */}
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur-sm sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                💼 <span>投资组合</span>
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                Investment Portfolio · 总览您的财富增长
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowBatchPrice(true)}
                className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-600 px-3 py-1.5 rounded-lg transition-colors border border-slate-200"
              >
                📊 批量更新价格
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditingHolding(null);
                  setShowForm(true);
                }}
                className="text-sm bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-4 py-2 rounded-lg transition-colors shadow-sm"
              >
                + 交易记录
              </button>
            </div>
          </div>

          {/* Summary strip */}
          <div className="grid grid-cols-4 gap-3 mt-4">
            {[
              {
                label: '总市值',
                value: summary.totalValue,
                fmt: true,
                color: 'text-indigo-600',
                accent: true,
              },
              { label: '成本总额', value: summary.totalCost, fmt: true, color: 'text-slate-600' },
              {
                label: '未实现盈亏 💰',
                value: summary.totalPnl,
                fmt: true,
                color: summary.totalPnl >= 0 ? 'text-emerald-500' : 'text-rose-500',
                accent: true,
              },
              {
                label: '已实现盈亏 🏆',
                value: summary.totalRealized,
                fmt: true,
                color: summary.totalRealized >= 0 ? 'text-emerald-500' : 'text-rose-500',
                accent: true,
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
                  {item.fmt
                    ? (item.value >= 0 ? '+' : '') +
                      '¥' +
                      Math.abs(item.value).toLocaleString('en-US', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })
                    : item.value}
                </div>
              </div>
            ))}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-white border border-slate-200 p-1 rounded-xl w-fit shadow-sm">
          {(
            [
              ['holdings', '📈 持仓'],
              ['transactions', '📋 交易'],
              ['sip', '💎 定投'],
              ['archived', '📁 已平仓'],
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

        {/* Error */}
        {error && (
          <div className="mb-4 text-sm text-rose-500 bg-rose-50 border border-rose-200 rounded-lg px-4 py-3">
            ⚠️ {error}
          </div>
        )}

        {/* Holdings tab */}
        {activeTab === 'holdings' && (
          <div>
            {/* Filters & sort */}
            <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <label htmlFor="filter-type" className="text-xs text-slate-400 font-medium">
                  筛选类型:
                </label>
                <select
                  id="filter-type"
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value as HoldingType | 'all')}
                  className="bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="all">全部</option>
                  {Object.entries(HOLDING_TYPE_LABELS).map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                </select>
              </div>
              <div className="text-xs text-slate-400 font-medium">
                💼 共 {holdingsWithMetrics.length} 个持仓
              </div>
            </div>

            {/* Table */}
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50">
                      {[
                        ['symbol', '代码'],
                        ['name', '名称'],
                        ['type', '类型'],
                        ['shares', '数量'],
                        ['cost_basis', '成本'],
                        ['current_value', '市值'],
                        ['unrealized_pnl', '未实现盈亏'],
                        ['return_pct', '收益率'],
                        ['annualized_return', '年化收益'],
                      ].map(([k, label]) => (
                        <th
                          key={k}
                          onClick={() =>
                            k !== 'name' &&
                            k !== 'type' &&
                            k !== 'shares' &&
                            handleSort(k as SortKey)
                          }
                          className={cn(
                            'px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap',
                            k !== 'name' &&
                              k !== 'type' &&
                              k !== 'shares' &&
                              'cursor-pointer hover:text-indigo-600 select-none'
                          )}
                        >
                          {label}
                          <SortIcon k={k as SortKey} />
                        </th>
                      ))}
                      <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        操作
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {holdingsWithMetrics.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="text-center py-20">
                          <div className="text-5xl mb-3">🎯</div>
                          <div className="text-base font-medium text-slate-500">暂无持仓记录</div>
                          <div className="text-sm text-slate-400 mt-1">
                            点击右上角「+ 新交易」开启您的投资之旅
                          </div>
                          <div className="text-xs text-slate-300 mt-1">
                            支持股票、基金、债券等多种投资品种
                          </div>
                        </td>
                      </tr>
                    ) : (
                      holdingsWithMetrics.map((h, i) => (
                        <tr
                          key={h.id}
                          className="hover:bg-slate-50 transition-colors"
                          style={{ animationDelay: `${i * 30}ms` }}
                        >
                          <td className="px-4 py-3.5">
                            <span className="font-bold text-indigo-600 text-lg whitespace-nowrap">
                              {h.symbol}
                            </span>
                          </td>
                          <td className="px-4 py-3.5">
                            <span className="text-slate-600 max-w-32 truncate block">{h.name}</span>
                          </td>
                          <td className="px-4 py-3.5">
                            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">
                              {HOLDING_TYPE_LABELS[h.holding_type]}
                            </span>
                          </td>
                          <td className="px-4 py-3.5">
                            <span className="text-slate-500 whitespace-nowrap">
                              {h.shares.toFixed(4)}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 border-l-2 border-slate-100">
                            <span className="text-slate-500 text-lg font-semibold whitespace-nowrap">
                              ¥{h.cost_basis.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 border-l-2 border-slate-100">
                            <span className="text-indigo-600 font-bold text-xl whitespace-nowrap">
                              ¥
                              {h.current_value.toLocaleString('en-US', {
                                minimumFractionDigits: 2,
                              })}
                            </span>
                          </td>
                          <td
                            className={cn(
                              'px-4 py-3.5 border-l-2 border-slate-100 whitespace-nowrap font-bold text-xl',
                              h.unrealized_pnl >= 0 ? 'text-emerald-500' : 'text-rose-500'
                            )}
                          >
                            {h.unrealized_pnl >= 0 ? '+' : ''}
                            {h.unrealized_pnl >= 0 ? '¥' : '-¥'}
                            {Math.abs(h.unrealized_pnl).toLocaleString('en-US', {
                              minimumFractionDigits: 2,
                            })}
                          </td>
                          <td
                            className={cn(
                              'px-4 py-3.5 whitespace-nowrap font-bold text-xl',
                              h.return_pct >= 0 ? 'text-emerald-500' : 'text-rose-500'
                            )}
                          >
                            {h.return_pct >= 0 ? '+' : ''}
                            {h.return_pct.toFixed(2)}%
                          </td>
                          <td
                            className={cn(
                              'px-4 py-3.5 whitespace-nowrap font-semibold text-lg',
                              h.annualized_return >= 0 ? 'text-emerald-500' : 'text-rose-500'
                            )}
                          >
                            {h.annualized_return >= 0 ? '+' : ''}
                            {h.annualized_return.toFixed(2)}%
                          </td>
                          <td className="px-4 py-3.5 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingHolding(h);
                                  setShowForm(true);
                                }}
                                className="text-xs text-slate-400 hover:text-indigo-600 px-2 py-1 rounded hover:bg-indigo-50 transition-colors"
                              >
                                交易
                              </button>
                              <button
                                type="button"
                                onClick={() => handleArchive(h)}
                                className="text-xs text-slate-500 hover:text-rose-500 px-2 py-1 rounded hover:bg-rose-50 transition-colors"
                              >
                                平仓
                              </button>
                            </div>
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

        {/* Transactions tab */}
        {activeTab === 'transactions' && (
          <div>
            <div className="mb-4">
              <p className="text-sm text-slate-500">交易历史记录 📋</p>
            </div>
            {holdings.filter((h) => h.notes && typeof h.notes === 'string' && h.notes.length > 2)
              .length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-2xl p-16 text-center shadow-sm">
                <div className="text-5xl mb-4 opacity-40">📋</div>
                <div className="text-base font-medium text-slate-500">暂无交易记录</div>
                <div className="text-sm text-slate-400 mt-2">
                  在持仓页面点击「交易」按钮记录买入、卖出、分红等交易
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {holdings
                  .filter((h) => h.notes && typeof h.notes === 'string' && h.notes.length > 2)
                  .map((h) => {
                    let transactions: any[] = [];
                    try {
                      transactions = JSON.parse(h.notes as string);
                    } catch {}
                    return transactions.map((tx, idx) => (
                      <div
                        key={`${h.id}-${idx}`}
                        className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span
                              className={`inline-flex px-2 py-1 rounded text-xs font-medium ${
                                tx.type === 'buy'
                                  ? 'bg-emerald-100 text-emerald-700'
                                  : tx.type === 'sell'
                                    ? 'bg-red-100 text-red-700'
                                    : 'bg-amber-100 text-amber-700'
                              }`}
                            >
                              {tx.type === 'buy' ? '买入' : tx.type === 'sell' ? '卖出' : '分红'}
                            </span>
                            <span className="font-medium text-slate-800">{h.symbol}</span>
                            {h.name && <span className="text-sm text-slate-500">- {h.name}</span>}
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-medium text-slate-700">
                              {tx.amount != null &&
                                `¥${Number(tx.amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                              {tx.shares != null && ` × ${tx.shares}`}
                            </div>
                            <div className="text-xs text-slate-400">{tx.date}</div>
                          </div>
                        </div>
                      </div>
                    ));
                  })}
              </div>
            )}
          </div>
        )}

        {/* SIP tab */}
        {activeTab === 'sip' && <SipPlanPanel plans={sipPlans} onRefresh={loadData} />}

        {/* Archived tab */}
        {activeTab === 'archived' && (
          <div>
            <div className="text-sm text-slate-500 mb-4 font-medium">
              📁 已平仓 {archivedHoldings.length} 个仓位
            </div>
            <div className="space-y-3">
              {archivedHoldings.length === 0 ? (
                <div className="bg-white border border-slate-200 rounded-2xl p-16 text-center shadow-sm">
                  <div className="text-5xl mb-4 opacity-40">🏆</div>
                  <div className="text-base font-medium text-slate-500">暂无已平仓记录</div>
                  <div className="text-sm text-slate-400 mt-2">平仓的仓位将显示在这里</div>
                </div>
              ) : (
                archivedHoldings.map((h) => (
                  <ArchivedHoldingCard
                    key={h.id}
                    holding={h}
                    onViewHistory={() => setShowArchiveHistory(h)}
                  />
                ))
              )}
            </div>
          </div>
        )}
      </main>

      {/* Transaction form modal */}
      {showForm && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                {editingHolding ? `💹 交易 - ${editingHolding.symbol}` : '📝 新建交易'}
              </h2>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditingHolding(null);
                }}
                className="text-slate-400 hover:text-slate-600 text-xl leading-none"
              >
                ×
              </button>
            </div>
            <HoldingForm
              holding={editingHolding}
              onSuccess={() => {
                setShowForm(false);
                setEditingHolding(null);
                loadData();
              }}
              onCancel={() => {
                setShowForm(false);
                setEditingHolding(null);
              }}
            />
          </div>
        </div>
      )}

      {/* Batch price update modal */}
      {showBatchPrice && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 w-full max-w-lg shadow-2xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                📊 批量更新价格
              </h2>
              <button
                type="button"
                onClick={() => setShowBatchPrice(false)}
                className="text-slate-400 hover:text-slate-600 text-xl leading-none"
              >
                ×
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              <BatchPriceUpdate
                holdings={holdings}
                onSuccess={() => {
                  setShowBatchPrice(false);
                  loadData();
                }}
                onCancel={() => setShowBatchPrice(false)}
              />
            </div>
          </div>
        </div>
      )}

      {/* Archive history modal */}
      {showArchiveHistory && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                📋 {showArchiveHistory.symbol} - {showArchiveHistory.name}
              </h2>
              <button
                type="button"
                onClick={() => setShowArchiveHistory(null)}
                className="text-slate-400 hover:text-slate-600 text-xl leading-none"
              >
                ×
              </button>
            </div>
            <ArchiveHistory holding={showArchiveHistory} />
          </div>
        </div>
      )}
    </div>
  );
}

function ArchivedHoldingCard({
  holding,
  onViewHistory,
}: {
  holding: Holding;
  onViewHistory: () => void;
}) {
  const { return_pct } = calcMetrics(holding);
  const finalPnl = holding.current_value - holding.cost_basis;

  return (
    <button
      type="button"
      className="w-full text-left bg-white border border-slate-200 rounded-xl p-4 hover:border-indigo-300 hover:shadow-sm transition-colors cursor-pointer shadow-sm"
      onClick={onViewHistory}
    >
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-bold text-indigo-600">{holding.symbol}</span>
            <span className="text-xs text-slate-400">{holding.name}</span>
          </div>
          <div className="text-xs text-slate-400">
            成本: ¥{holding.cost_basis.toLocaleString()} | 最终市值: ¥
            {holding.current_value.toLocaleString()}
          </div>
        </div>
        <div className="text-right">
          <div
            className={cn(
              'text-xl font-bold',
              finalPnl >= 0 ? 'text-emerald-500' : 'text-rose-500'
            )}
          >
            {finalPnl >= 0 ? '+' : ''}¥
            {finalPnl.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-xs text-slate-400">
            {return_pct >= 0 ? '+' : ''}
            {return_pct.toFixed(2)}% 总收益
          </div>
        </div>
      </div>
    </button>
  );
}

function ArchiveHistory({ holding }: { holding: Holding }) {
  const [prices, setPrices] = useState<{ symbol: string; price: number; price_date: string }[]>([]);
  const { return_pct, annualized_return } = calcMetrics(holding);
  const finalPnl = holding.current_value - holding.cost_basis;

  useEffect(() => {
    if (holding.symbol) {
      import('../lib/api').then(({ getPrices }) => {
        getPrices(holding.symbol, { limit: 100 }).then(setPrices);
      });
    }
  }, [holding.symbol]);

  let txHistory: { date: string; type: string; detail: string }[] = [];
  try {
    if (holding.notes) {
      const parsed = JSON.parse(holding.notes);
      if (parsed.transactions) {
        txHistory = parsed.transactions.map((t: any) => ({
          date: t.date || '',
          type: t.type || 'unknown',
          detail: `${t.shares}股 @ ¥${t.price} (费用¥${t.fees})`,
        }));
      }
    }
  } catch {}

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
          <div className="text-xs text-slate-400 mb-1">💰 成本</div>
          <div className="text-base font-semibold text-slate-800">
            ¥{holding.cost_basis.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
        </div>
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
          <div className="text-xs text-slate-400 mb-1">📊 最终市值</div>
          <div className="text-base font-semibold text-slate-800">
            ¥{holding.current_value.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
        </div>
        <div
          className={cn(
            'bg-slate-50 border rounded-xl p-3',
            finalPnl >= 0 ? 'border-emerald-200' : 'border-rose-200'
          )}
        >
          <div className="text-xs text-slate-400 mb-1">📈 最终盈亏</div>
          <div
            className={cn(
              'text-base font-bold',
              finalPnl >= 0 ? 'text-emerald-500' : 'text-rose-500'
            )}
          >
            {finalPnl >= 0 ? '+' : ''}¥
            {finalPnl.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
        </div>
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
          <div className="text-xs text-slate-400 mb-1">🎯 总收益率</div>
          <div
            className={cn(
              'text-base font-bold',
              return_pct >= 0 ? 'text-emerald-500' : 'text-rose-500'
            )}
          >
            {return_pct >= 0 ? '+' : ''}
            {return_pct.toFixed(2)}%
          </div>
        </div>
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
          <div className="text-xs text-slate-400 mb-1">📉 年化收益率</div>
          <div
            className={cn(
              'text-base font-bold',
              annualized_return >= 0 ? 'text-emerald-500' : 'text-rose-500'
            )}
          >
            {annualized_return >= 0 ? '+' : ''}
            {annualized_return.toFixed(2)}%
          </div>
        </div>
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
          <div className="text-xs text-slate-400 mb-1">🏆 已实现盈亏</div>
          <div
            className={cn(
              'text-base font-bold',
              holding.realized_pnl >= 0 ? 'text-emerald-500' : 'text-rose-500'
            )}
          >
            {holding.realized_pnl >= 0 ? '+' : ''}¥
            {holding.realized_pnl.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
        </div>
      </div>

      {txHistory.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-slate-600 mb-2">📋 交易历史</h4>
          <div className="space-y-2">
            {txHistory.map((tx, i) => (
              <div
                key={i}
                className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2"
              >
                <span className="text-xs text-slate-400 w-24 flex-shrink-0">{tx.date}</span>
                <span
                  className={cn(
                    'text-xs font-semibold',
                    tx.type === 'buy'
                      ? 'text-emerald-500'
                      : tx.type === 'sell'
                        ? 'text-rose-500'
                        : 'text-amber-500'
                  )}
                >
                  {tx.type === 'buy' ? '买入' : tx.type === 'sell' ? '卖出' : '分红'}
                </span>
                <span className="text-xs text-slate-500">{tx.detail}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {prices.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-slate-600 mb-2">📈 历史价格 ({prices.length})</h4>
          <div className="text-xs text-slate-400 max-h-40 overflow-y-auto space-y-1">
            {prices.slice(0, 50).map((p, i) => (
              <div key={i} className="flex justify-between">
                <span className="text-slate-500">{p.price_date}</span>
                <span className="text-slate-600">¥{p.price.toFixed(3)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
