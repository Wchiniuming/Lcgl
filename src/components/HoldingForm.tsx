import { useState, useEffect } from 'react';
import {
  Holding,
  HoldingType,
  getHoldings,
  updateHolding,
  createHolding,
  batchUpdateHoldingPrices,
  PriceUpdate,
} from '../lib/api';

export type InvestmentTransactionType =
  | 'buy'
  | 'sell'
  | 'dividend'
  | 'add_position'
  | 'reduce_position'
  | 'sip';

export interface TransactionFormData {
  holdingId: number | null;
  symbol: string;
  name: string;
  holdingType: HoldingType;
  transactionType: InvestmentTransactionType;
  transactionDate: string;
  price: number;
  shares: number;
  fees: number;
  currency: string;
}

const HOLDING_TYPES: { value: HoldingType; label: string }[] = [
  { value: 'stock', label: '股票' },
  { value: 'fund', label: '基金' },
  { value: 'bond', label: '债券' },
  { value: 'bank_financial', label: '银行理财' },
  { value: 'precious_metal', label: '贵金属' },
  { value: 'other', label: '其他' },
];

const TX_TYPES: { value: InvestmentTransactionType; label: string; color: string }[] = [
  { value: 'buy', label: '买入', color: 'text-emerald-400' },
  { value: 'sell', label: '卖出', color: 'text-rose-400' },
  { value: 'dividend', label: '分红', color: 'text-amber-400' },
  { value: 'add_position', label: '增持', color: 'text-cyan-400' },
  { value: 'reduce_position', label: '减持', color: 'text-orange-400' },
  { value: 'sip', label: '定投', color: 'text-violet-400' },
];

interface Props {
  holding?: Holding | null;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function HoldingForm({ holding, onSuccess, onCancel }: Props) {
  const today = new Date().toISOString().split('T')[0];
  const [form, setForm] = useState<TransactionFormData>({
    holdingId: holding?.id ?? null,
    symbol: holding?.symbol ?? '',
    name: holding?.name ?? '',
    holdingType: holding?.holding_type ?? 'stock',
    transactionType: 'buy',
    transactionDate: today,
    price: holding?.current_price ?? 0,
    shares: 0,
    fees: 0,
    currency: holding?.currency ?? 'CNY',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [mode, setMode] = useState<'new' | 'existing'>(holding ? 'existing' : 'new');

  const estimatedCost = form.shares * form.price + form.fees;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      if (mode === 'new') {
        if (!form.symbol || !form.name) {
          setError('请填写代码和名称');
          return;
        }
        await createHolding({
          symbol: form.symbol.toUpperCase(),
          name: form.name,
          holding_type: form.holdingType,
          account_id: null,
          shares: form.shares,
          cost_basis: estimatedCost,
          avg_cost: form.shares > 0 ? estimatedCost / form.shares : 0,
          current_price: form.price,
          current_value: form.shares * form.price,
          unrealized_pnl: 0,
          realized_pnl: 0,
          currency: form.currency,
          risk_level: null,
          purchase_date: form.transactionDate,
          last_price_update: form.transactionDate,
          notes: JSON.stringify({
            transactions: [
              {
                type: form.transactionType,
                date: form.transactionDate,
                price: form.price,
                shares: form.shares,
                fees: form.fees,
              },
            ],
          }),
        });

        const { createPrice } = await import('../lib/api');
        await createPrice({
          symbol: form.symbol.toUpperCase(),
          price: form.price,
          price_date: form.transactionDate,
          change_percent: null,
          volume: null,
          source: 'manual',
        });
      } else if (form.holdingId) {
        const { getHolding } = await import('../lib/api');
        const h = await getHolding(form.holdingId);
        let newShares = h.shares;
        let newCostBasis = h.cost_basis;
        let newAvgCost = h.avg_cost;

        if (
          form.transactionType === 'buy' ||
          form.transactionType === 'add_position' ||
          form.transactionType === 'sip'
        ) {
          const addedCost = form.shares * form.price + form.fees;
          newShares += form.shares;
          newCostBasis += addedCost;
          newAvgCost = newShares > 0 ? newCostBasis / newShares : 0;
        } else if (form.transactionType === 'sell' || form.transactionType === 'reduce_position') {
          const removedShares = Math.min(form.shares, newShares);
          newShares -= removedShares;
          newCostBasis = newShares > 0 ? newShares * newAvgCost : 0;
        } else if (form.transactionType === 'dividend') {
          const divAmount = form.shares * form.price;
          newCostBasis = Math.max(0, newCostBasis - divAmount);
          newAvgCost = newShares > 0 ? newCostBasis / newShares : 0;
        }

        const newCurrentValue = newShares * form.price;
        const newUnrealizedPnl = newCurrentValue - newCostBasis;
        const txNote = `[${form.transactionDate}] ${form.transactionType}: ${form.shares}股 @ ${form.price}`;

        await updateHolding({
          ...h,
          shares: newShares,
          cost_basis: newCostBasis,
          avg_cost: newAvgCost,
          current_price: form.price,
          current_value: newCurrentValue,
          unrealized_pnl: newUnrealizedPnl,
          last_price_update: form.transactionDate,
          notes: h.notes ? `${h.notes}\n${txNote}` : txNote,
        });
      }

      onSuccess?.();
    } catch (err) {
      setError(String(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="flex gap-2 p-1 bg-slate-100 rounded-lg w-fit">
        {(['new', 'existing'] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all duration-200 ${
              mode === m
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {m === 'new' ? '新建持仓' : '现有持仓'}
          </button>
        ))}
      </div>

      {mode === 'new' && (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="symbol-input"
              className="block text-xs font-medium text-slate-500 mb-1.5"
            >
              证券代码 *
            </label>
            <input
              id="symbol-input"
              type="text"
              required
              value={form.symbol}
              onChange={(e) => setForm((f) => ({ ...f, symbol: e.target.value.toUpperCase() }))}
              placeholder="如 AAPL"
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30 transition-colors"
            />
          </div>
          <div>
            <label htmlFor="name-input" className="block text-xs font-medium text-slate-500 mb-1.5">
              名称 *
            </label>
            <input
              id="name-input"
              type="text"
              required
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="如 苹果公司"
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30 transition-colors"
            />
          </div>
          <div>
            <label
              htmlFor="holding-type-select"
              className="block text-xs font-medium text-slate-500 mb-1.5"
            >
              类型
            </label>
            <select
              id="holding-type-select"
              value={form.holdingType}
              onChange={(e) =>
                setForm((f) => ({ ...f, holdingType: e.target.value as HoldingType }))
              }
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30 transition-colors"
            >
              {HOLDING_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label
              htmlFor="currency-select"
              className="block text-xs font-medium text-slate-500 mb-1.5"
            >
              货币
            </label>
            <select
              id="currency-select"
              value={form.currency}
              onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value }))}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30 transition-colors"
            >
              <option value="CNY">CNY 人民币</option>
              <option value="USD">USD 美元</option>
              <option value="HKD">HKD 港币</option>
            </select>
          </div>
        </div>
      )}

      {mode === 'existing' && (
        <div>
          <label
            htmlFor="holding-select-existing"
            className="block text-xs font-medium text-slate-500 mb-1.5"
          >
            选择持仓
          </label>
          <HoldingSelect
            value={form.holdingId}
            onChange={(id) => {
              setForm((f) => ({ ...f, holdingId: id }));
              if (id) {
                getHoldings({}).then((holdings) => {
                  const h = holdings.find((x) => x.id === id);
                  if (h) {
                    setForm((f) => ({
                      ...f,
                      symbol: h.symbol,
                      name: h.name,
                      holdingType: h.holding_type,
                      price: h.current_price,
                      currency: h.currency,
                    }));
                  }
                });
              }
            }}
          />
        </div>
      )}

      <div>
        <span className="block text-xs font-medium text-slate-500 mb-2">交易类型</span>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          {TX_TYPES.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => setForm((f) => ({ ...f, transactionType: t.value }))}
              className={`py-2 rounded-lg text-sm font-medium border transition-all duration-200 ${
                form.transactionType === t.value
                  ? `${t.color} border-current bg-slate-200/80`
                  : 'text-slate-500 border-slate-200 hover:border-slate-300 hover:text-slate-700'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label
            htmlFor="tx-date-input"
            className="block text-xs font-medium text-slate-500 mb-1.5"
          >
            交易日期
          </label>
          <input
            id="tx-date-input"
            type="date"
            value={form.transactionDate}
            onChange={(e) => setForm((f) => ({ ...f, transactionDate: e.target.value }))}
            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30 transition-colors"
          />
        </div>
        <div>
          <label htmlFor="price-input" className="block text-xs font-medium text-slate-500 mb-1.5">
            单价 {form.currency}
          </label>
          <input
            id="price-input"
            type="number"
            step="0.001"
            min="0"
            value={form.price || ''}
            onChange={(e) => setForm((f) => ({ ...f, price: parseFloat(e.target.value) || 0 }))}
            placeholder="0.00"
            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30 transition-colors"
          />
        </div>
        <div>
          <label htmlFor="shares-input" className="block text-xs font-medium text-slate-500 mb-1.5">
            数量
          </label>
          <input
            id="shares-input"
            type="number"
            step="0.0001"
            min="0"
            value={form.shares || ''}
            onChange={(e) => setForm((f) => ({ ...f, shares: parseFloat(e.target.value) || 0 }))}
            placeholder="0"
            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30 transition-colors"
          />
        </div>
        <div>
          <label htmlFor="fees-input" className="block text-xs font-medium text-slate-500 mb-1.5">
            手续费 {form.currency}
          </label>
          <input
            id="fees-input"
            type="number"
            step="0.01"
            min="0"
            value={form.fees || ''}
            onChange={(e) => setForm((f) => ({ ...f, fees: parseFloat(e.target.value) || 0 }))}
            placeholder="0.00"
            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30 transition-colors"
          />
        </div>
      </div>

      <div className="rounded-lg bg-slate-50 border border-slate-200 p-4">
        <div className="text-xs text-slate-500 mb-2">预估成本</div>
        <div className="text-2xl font-light text-slate-800">
          {form.currency === 'CNY' ? '¥' : form.currency === 'USD' ? '$' : 'HK$'}
          {estimatedCost.toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
        </div>
        {form.shares > 0 && (
          <div className="text-xs text-slate-500 mt-1">
            {form.shares} 股 @{' '}
            {form.currency === 'CNY' ? '¥' : form.currency === 'USD' ? '$' : 'HK$'}
            {form.price.toFixed(3)} +{' '}
            {form.currency === 'CNY' ? '¥' : form.currency === 'USD' ? '$' : 'HK$'}
            {form.fees.toFixed(2)} 手续费
          </div>
        )}
      </div>

      {error && (
        <div className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-4 py-2.5">
          {error}
        </div>
      )}

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={submitting}
          className="flex-1 bg-amber-500 hover:bg-amber-400 disabled:bg-amber-600 disabled:cursor-not-allowed text-slate-900 font-semibold py-2.5 rounded-lg transition-all duration-200 text-sm tracking-wide"
        >
          {submitting ? '提交中...' : '确认交易'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-medium py-2.5 rounded-lg transition-all duration-200 text-sm"
        >
          取消
        </button>
      </div>
    </form>
  );
}

function HoldingSelect({
  value,
  onChange,
}: {
  value: number | null;
  onChange: (id: number) => void;
}) {
  const [holdings, setHoldings] = useState<Holding[]>([]);

  useEffect(() => {
    getHoldings({}).then(setHoldings);
  }, []);

  return (
    <select
      id="holding-select-existing"
      value={value ?? ''}
      onChange={(e) => onChange(Number(e.target.value))}
      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30 transition-colors"
    >
      <option value="">选择持仓...</option>
      {holdings.map((h) => (
        <option key={h.id} value={h.id}>
          {h.symbol} - {h.name}
        </option>
      ))}
    </select>
  );
}

interface BatchPriceUpdateProps {
  holdings: Holding[];
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function BatchPriceUpdate({ holdings, onSuccess, onCancel }: BatchPriceUpdateProps) {
  const [prices, setPrices] = useState<Map<string, number>>(() => {
    const m = new Map<string, number>();
    holdings.forEach((h) => {
      m.set(h.symbol, h.current_price);
    });
    return m;
  });
  const [dirty, setDirty] = useState<Map<string, boolean>>(() => new Map());
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  function handlePriceChange(symbol: string, value: string) {
    const num = parseFloat(value) || 0;
    setPrices((p) => new Map(p).set(symbol, num));
    setDirty((d) => new Map(d).set(symbol, true));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const updates: PriceUpdate[] = [];
      dirty.forEach((isDirty, symbol) => {
        if (isDirty) {
          updates.push({ symbol, price: prices.get(symbol) ?? 0 });
        }
      });
      if (updates.length > 0) {
        await batchUpdateHoldingPrices(updates);
        const updated = await getHoldings({});
        for (const h of updated) {
          const update = updates.find((u) => u.symbol === h.symbol);
          if (update) {
            const pnl = h.shares * update.price - h.cost_basis;
            await updateHolding({
              ...h,
              current_price: update.price,
              current_value: h.shares * update.price,
              unrealized_pnl: pnl,
              last_price_update: new Date().toISOString().split('T')[0],
            });
          }
        }
      }
      onSuccess?.();
    } catch (err) {
      setError(String(err));
    } finally {
      setSubmitting(false);
    }
  }

  const dirtyCount = Array.from(dirty.values()).filter(Boolean).length;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="text-sm text-slate-500">
        共 {holdings.length} 个持仓 | 待更新:{' '}
        <span className="text-amber-600 font-medium">{dirtyCount}</span> 个
      </div>

      <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
        {holdings.map((h) => (
          <div
            key={h.id}
            className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-lg px-4 py-3"
          >
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-slate-800 truncate">{h.symbol}</div>
              <div className="text-xs text-slate-500 truncate">{h.name}</div>
            </div>
            <div className="text-xs text-slate-500">
              现价: <span className="text-slate-700">¥{h.current_price.toFixed(3)}</span>
            </div>
            <div className="flex items-center gap-1">
              <input
                id={`price-${h.id}`}
                type="number"
                step="0.001"
                min="0"
                value={prices.get(h.symbol) ?? ''}
                onChange={(e) => handlePriceChange(h.symbol, e.target.value)}
                placeholder="新价格"
                className="w-28 bg-slate-100 border border-slate-200 rounded px-2.5 py-1.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30 transition-colors text-right"
              />
              {dirty.get(h.symbol) && (
                <span className="w-2 h-2 rounded-full bg-amber-400 flex-shrink-0" />
              )}
            </div>
          </div>
        ))}
      </div>

      {error && (
        <div className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-4 py-2.5">
          {error}
        </div>
      )}

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={submitting || dirtyCount === 0}
          className="flex-1 bg-amber-500 hover:bg-amber-400 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-slate-900 font-semibold py-2.5 rounded-lg transition-all duration-200 text-sm tracking-wide"
        >
          {submitting ? '更新中...' : `批量更新价格 (${dirtyCount})`}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-medium py-2.5 rounded-lg transition-all duration-200 text-sm"
        >
          取消
        </button>
      </div>
    </form>
  );
}
