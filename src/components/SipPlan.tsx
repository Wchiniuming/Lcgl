import { useState } from 'react';
import {
  createReminder,
  updateReminder,
  deleteReminder,
  completeReminder,
  getReminders,
} from '../lib/api';

export interface SipPlan {
  id: number;
  holdingId: number | null;
  symbol: string;
  name: string;
  amount: number;
  currency: string;
  frequency: 'weekly' | 'monthly';
  dayOfWeek?: number;
  dayOfMonth?: number;
  nextDueDate: string;
  isActive: boolean;
  completedCount: number;
  totalInvested: number;
  createdAt: string;
}

const FREQUENCY_OPTIONS = [
  { value: 'weekly', label: '每周' },
  { value: 'monthly', label: '每月' },
];

const WEEKDAYS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

interface Props {
  plans: SipPlan[];
  onRefresh: () => void;
}

export function SipPlanPanel({ plans, onRefresh }: Props) {
  const [showCreate, setShowCreate] = useState(false);
  const [editingPlan, setEditingPlan] = useState<SipPlan | null>(null);

  const activePlans = plans.filter((p) => p.isActive);
  const totalInvested = plans.reduce((s, p) => s + p.totalInvested, 0);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="text-xs text-slate-500 mb-1">进行中的计划</div>
          <div className="text-2xl font-semibold text-indigo-600">{activePlans.length}</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="text-xs text-slate-500 mb-1">累计投入</div>
          <div className="text-2xl font-semibold text-amber-600">
            ¥{totalInvested.toLocaleString()}
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="text-xs text-slate-500 mb-1">每周定投</div>
          <div className="text-2xl font-semibold text-indigo-600">
            ¥
            {plans
              .filter((p) => p.frequency === 'weekly' && p.isActive)
              .reduce((s, p) => s + p.amount, 0)
              .toLocaleString()}
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="text-xs text-slate-500 mb-1">每月定投</div>
          <div className="text-2xl font-semibold text-indigo-600">
            ¥
            {plans
              .filter((p) => p.frequency === 'monthly' && p.isActive)
              .reduce((s, p) => s + p.amount, 0)
              .toLocaleString()}
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {plans.length === 0 ? (
          <div className="text-center py-12 text-slate-500">
            <div className="text-4xl mb-3 opacity-30">📈</div>
            <div className="text-sm">暂无定投计划</div>
            <div className="text-xs mt-1">创建第一个定投计划，开始自动化投资</div>
          </div>
        ) : (
          plans.map((plan) => (
            <SipPlanCard
              key={plan.id}
              plan={plan}
              onEdit={() => setEditingPlan(plan)}
              onDeleted={onRefresh}
            />
          ))
        )}
      </div>

      <button
        type="button"
        onClick={() => setShowCreate(true)}
        className="w-full border-2 border-dashed border-slate-700 hover:border-amber-500/50 text-slate-400 hover:text-amber-400 py-4 rounded-xl transition-all duration-300 text-sm font-medium"
      >
        + 创建定投计划
      </button>

      {(showCreate || editingPlan) && (
        <SipPlanModal
          plan={editingPlan}
          onClose={() => {
            setShowCreate(false);
            setEditingPlan(null);
          }}
          onSuccess={onRefresh}
        />
      )}
    </div>
  );
}

function SipPlanCard({
  plan,
  onEdit,
  onDeleted,
}: {
  plan: SipPlan;
  onEdit: () => void;
  onDeleted: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  async function handleComplete() {
    setLoading(true);
    try {
      await completeReminder(plan.id);
      onDeleted();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    setLoading(true);
    try {
      await deleteReminder(plan.id);
      onDeleted();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  function getNextDueLabel() {
    const d = new Date(plan.nextDueDate);
    const now = new Date();
    const diff = Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (diff <= 0) return '已到期';
    if (diff === 1) return '明天';
    if (diff <= 7) return `${diff} 天后`;
    return d.toLocaleDateString('zh-CN');
  }

  return (
    <div
      className={`bg-white border rounded-xl p-4 transition-all duration-300 ${plan.isActive ? 'border-indigo-200' : 'border-slate-200 opacity-60'}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-semibold text-slate-800">{plan.symbol}</span>
            <span className="text-xs text-slate-500">{plan.name}</span>
            <span
              className={`ml-auto text-xs px-2 py-0.5 rounded-full font-medium ${plan.frequency === 'monthly' ? 'bg-indigo-100 text-indigo-600' : 'bg-indigo-100 text-indigo-600'}`}
            >
              {plan.frequency === 'monthly' ? '每月' : '每周'}
            </span>
          </div>
          <div className="text-lg font-semibold text-amber-600">
            ¥{plan.amount.toLocaleString()}
          </div>
          <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
            <span>
              下次: <span className="text-slate-500">{getNextDueLabel()}</span>
            </span>
            <span>
              已完成: <span className="text-slate-500">{plan.completedCount} 次</span>
            </span>
            <span>
              累计: <span className="text-slate-300">¥{plan.totalInvested.toLocaleString()}</span>
            </span>
          </div>
        </div>
        <div className="flex flex-col gap-2 flex-shrink-0">
          {plan.isActive && (
            <button
              type="button"
              onClick={handleComplete}
              disabled={loading}
              className="text-xs bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
            >
              ✓ 已执行
            </button>
          )}
          <button
            type="button"
            onClick={onEdit}
            className="text-xs text-slate-500 hover:text-indigo-600 px-3 py-1.5 rounded-lg hover:bg-indigo-50 transition-colors"
          >
            编辑
          </button>
          {confirmDelete ? (
            <div className="flex gap-1">
              <button
                type="button"
                onClick={handleDelete}
                disabled={loading}
                className="text-xs bg-rose-500/20 text-rose-400 px-2 py-1 rounded transition-colors disabled:opacity-50"
              >
                确认
              </button>
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded transition-colors"
              >
                取消
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="text-xs text-slate-600 hover:text-rose-400 px-3 py-1.5 rounded-lg transition-colors"
            >
              删除
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

interface SipPlanModalProps {
  plan: SipPlan | null;
  onClose: () => void;
  onSuccess: () => void;
}

function SipPlanModal({ plan, onClose, onSuccess }: SipPlanModalProps) {
  const today = new Date().toISOString().split('T')[0];
  const [form, setForm] = useState({
    symbol: plan?.symbol ?? '',
    name: plan?.name ?? '',
    amount: plan?.amount ?? 1000,
    currency: plan?.currency ?? 'CNY',
    frequency: plan?.frequency ?? ('monthly' as 'weekly' | 'monthly'),
    dayOfWeek: plan?.dayOfWeek ?? 1,
    dayOfMonth: plan?.dayOfMonth ?? 1,
    nextDueDate: plan?.nextDueDate ?? today,
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      if (!form.symbol || !form.name) {
        setError('请填写代码和名称');
        return;
      }
      const due = calculateNextDue(form.frequency, form.dayOfWeek, form.dayOfMonth);

      if (plan) {
        const reminders = await getReminders({});
        const reminder = reminders.find((r) => r.title.includes(form.symbol));
        if (reminder) {
          await updateReminder({
            ...reminder,
            title: `定投 ${form.symbol} - ${form.name}`,
            target_date: due,
            notes: JSON.stringify({
              symbol: form.symbol,
              name: form.name,
              amount: form.amount,
              frequency: form.frequency,
              completedCount: plan.completedCount,
              totalInvested: plan.totalInvested,
            }),
          });
        }
      } else {
        await createReminder({
          title: `定投 ${form.symbol} - ${form.name}`,
          reminder_type: 'investment_due',
          account_id: null,
          holding_id: null,
          target_date: due,
          advance_days: 0,
          is_repeating: true,
          repeat_interval: form.frequency === 'weekly' ? 1 : 1,
          repeat_unit: form.frequency === 'weekly' ? 'week' : 'month',
          notes: JSON.stringify({
            symbol: form.symbol,
            name: form.name,
            amount: form.amount,
            frequency: form.frequency,
            completedCount: 0,
            totalInvested: 0,
          }),
        });
      }
      onSuccess();
      onClose();
    } catch (err) {
      setError(String(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white border border-slate-200 rounded-2xl p-6 w-full max-w-md shadow-2xl">
        <h3 className="text-lg font-semibold text-slate-800 mb-5">
          {plan ? '编辑定投计划' : '创建定投计划'}
        </h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="sip-symbol"
                className="block text-xs font-medium text-slate-500 mb-1.5"
              >
                证券代码 *
              </label>
              <input
                id="sip-symbol"
                type="text"
                required
                value={form.symbol}
                onChange={(e) => setForm((f) => ({ ...f, symbol: e.target.value.toUpperCase() }))}
                placeholder="如 510300"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-amber-500/60 focus:ring-1 focus:ring-amber-500/30 transition-colors"
              />
            </div>
            <div>
              <label htmlFor="sip-name" className="block text-xs font-medium text-slate-500 mb-1.5">
                名称
              </label>
              <input
                id="sip-name"
                type="text"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="如 沪深300ETF"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-amber-500/60 focus:ring-1 focus:ring-amber-500/30 transition-colors"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="sip-amount"
                className="block text-xs font-medium text-slate-500 mb-1.5"
              >
                每期金额
              </label>
              <input
                id="sip-amount"
                type="number"
                min="1"
                value={form.amount}
                onChange={(e) => setForm((f) => ({ ...f, amount: parseInt(e.target.value) || 0 }))}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-amber-500/60 focus:ring-1 focus:ring-amber-500/30 transition-colors"
              />
            </div>
            <div>
              <label
                htmlFor="sip-currency"
                className="block text-xs font-medium text-slate-500 mb-1.5"
              >
                货币
              </label>
              <select
                id="sip-currency"
                value={form.currency}
                onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value }))}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-amber-500/60 focus:ring-1 focus:ring-amber-500/30 transition-colors"
              >
                <option value="CNY">CNY 人民币</option>
                <option value="USD">USD 美元</option>
                <option value="HKD">HKD 港币</option>
              </select>
            </div>
          </div>

          <div>
            <span className="block text-xs font-medium text-slate-500 mb-2">频率</span>
            <div className="grid grid-cols-2 gap-2">
              {FREQUENCY_OPTIONS.map((f) => (
                <button
                  key={f.value}
                  type="button"
                  onClick={() =>
                    setForm((fo) => ({ ...fo, frequency: f.value as 'weekly' | 'monthly' }))
                  }
                  className={`py-2 rounded-lg text-sm font-medium border transition-all duration-200 ${
                    form.frequency === f.value
                      ? 'bg-indigo-100 text-indigo-600 border-indigo-300'
                      : 'text-slate-500 border-slate-200 hover:border-slate-300 hover:text-slate-700'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {form.frequency === 'weekly' ? (
            <div>
              <span className="block text-xs font-medium text-slate-500 mb-2">选择星期</span>
              <div className="grid grid-cols-7 gap-1">
                {WEEKDAYS.map((day, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, dayOfWeek: i }))}
                    className={`py-2 rounded-lg text-xs font-medium border transition-all duration-200 ${
                      form.dayOfWeek === i
                        ? 'bg-indigo-100 text-indigo-600 border-indigo-300'
                        : 'text-slate-500 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    {day}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div>
              <label htmlFor="sip-day" className="block text-xs font-medium text-slate-500 mb-1.5">
                每月几号 (1-31)
              </label>
              <input
                id="sip-day"
                type="number"
                min="1"
                max="31"
                value={form.dayOfMonth}
                onChange={(e) =>
                  setForm((f) => ({ ...f, dayOfMonth: parseInt(e.target.value) || 1 }))
                }
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-amber-500/60 focus:ring-1 focus:ring-amber-500/30 transition-colors"
              />
            </div>
          )}

          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2.5">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 bg-amber-500 hover:bg-amber-400 disabled:bg-amber-600 disabled:cursor-not-allowed text-slate-900 font-semibold py-2.5 rounded-lg transition-all duration-200 text-sm tracking-wide"
            >
              {submitting ? '保存中...' : '保存计划'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-medium py-2.5 rounded-lg transition-all duration-200 text-sm"
            >
              取消
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function calculateNextDue(
  frequency: 'weekly' | 'monthly',
  dayOfWeek: number,
  dayOfMonth: number
): string {
  const now = new Date();
  if (frequency === 'weekly') {
    const daysUntil = (dayOfWeek - now.getDay() + 7) % 7 || 7;
    now.setDate(now.getDate() + daysUntil);
  } else {
    now.setDate(Math.min(dayOfMonth, new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()));
    if (now < new Date()) {
      now.setMonth(now.getMonth() + 1);
      now.setDate(
        Math.min(dayOfMonth, new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate())
      );
    }
  }
  return now.toISOString().split('T')[0];
}
