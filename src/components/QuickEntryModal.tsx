import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import {
  AccountCategory,
  createAccount,
  createTransaction,
  getAllAccountCategories,
} from '../lib/api';

interface QuickEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface FormData {
  categoryId: string;
  name: string;
  amount: string;
  date: string;
}

interface FormErrors {
  categoryId?: string;
  name?: string;
  amount?: string;
  date?: string;
}

export default function QuickEntryModal({ isOpen, onClose, onSuccess }: QuickEntryModalProps) {
  const [form, setForm] = useState<FormData>({
    categoryId: '',
    name: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [categories, setCategories] = useState<AccountCategory[]>([]);
  const [assetCategories, setAssetCategories] = useState<AccountCategory[]>([]);
  const [liabilityCategories, setLiabilityCategories] = useState<AccountCategory[]>([]);

  useEffect(() => {
    if (isOpen) {
      loadCategories();
      setForm({
        categoryId: '',
        name: '',
        amount: '',
        date: new Date().toISOString().split('T')[0],
      });
      setErrors({});
    }
  }, [isOpen]);

  async function loadCategories() {
    try {
      const cats = await getAllAccountCategories();
      setCategories(cats);
      setAssetCategories(cats.filter((c) => c.type === 'asset'));
      setLiabilityCategories(cats.filter((c) => c.type === 'liability'));
    } catch (e) {
      console.error('Failed to load categories', e);
    }
  }

  function validate(): boolean {
    const newErrors: FormErrors = {};
    if (!form.categoryId) newErrors.categoryId = '请选择账户类别';
    if (!form.name.trim()) newErrors.name = '请输入账户名称';
    if (!form.amount || parseFloat(form.amount) === 0) newErrors.amount = '请输入有效金额';
    if (!form.date) newErrors.date = '请选择日期';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit(e: React.SubmitEvent) {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      const category = categories.find((c) => c.id === parseInt(form.categoryId));
      if (!category) return;

      const accountId = await createAccount({
        name: form.name.trim(),
        category_id: parseInt(form.categoryId),
        type: category.type,
        balance: parseFloat(form.amount),
        currency: 'CNY',
        institution: null,
        account_no: null,
        interest_rate: null,
        term_months: null,
        start_date: form.date,
        maturity_date: null,
        payment_due_day: null,
        is_active: true,
        is_archived: false,
        notes: null,
        extra_data: null,
      });

      await createTransaction({
        account_id: accountId,
        transaction_type: 'adjustment',
        amount: parseFloat(form.amount),
        balance_after: parseFloat(form.amount),
        counterparty_id: null,
        transaction_date: form.date,
        description: '期初余额',
        category_id: null,
        template_id: null,
        reference_no: null,
        attach_path: null,
      });

      onSuccess();
      onClose();
    } catch (err) {
      console.error('Quick entry failed', err);
    } finally {
      setSubmitting(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="qe-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/40 backdrop-blur-sm cursor-default"
        onClick={onClose}
        aria-label="关闭对话框"
      />

      <div className="relative z-50 w-full max-w-md mx-4 bg-white rounded-2xl shadow-2xl shadow-black/20 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-indigo-600 to-indigo-500">
          <div>
            <h2 id="qe-title" className="text-lg font-semibold text-white">
              快速记账
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">4步完成账户创建</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="关闭"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              账户类别 <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <button
                type="button"
                onClick={() => document.getElementById('qe-dropdown')?.classList.toggle('hidden')}
                className={`w-full px-3 py-2.5 rounded-xl border text-sm transition-all text-left flex items-center justify-between
                  ${
                    errors.categoryId
                      ? 'border-red-400 bg-red-50'
                      : 'border-slate-200 bg-slate-50 hover:border-slate-300'
                  }`}
              >
                <span className={form.categoryId ? 'text-slate-800' : 'text-slate-400'}>
                  {form.categoryId
                    ? categories.find((c) => c.id === parseInt(form.categoryId))?.name ||
                      '—— 选择类别 ——'
                    : '—— 选择类别 ——'}
                </span>
                <svg
                  className="w-4 h-4 text-slate-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>
              <div
                id="qe-dropdown"
                className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-60 overflow-auto hidden"
              >
                <div className="py-1">
                  <div className="px-3 py-1.5 text-xs font-medium text-slate-500 bg-slate-50">
                    🏦 资产账户
                  </div>
                  {assetCategories.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => {
                        setForm({ ...form, categoryId: c.id.toString() });
                        document.getElementById('qe-dropdown')?.classList.add('hidden');
                      }}
                      className="w-full px-3 py-2 text-sm text-left hover:bg-indigo-50 text-slate-700"
                    >
                      {c.name}
                    </button>
                  ))}
                </div>
                <div className="border-t border-slate-100 py-1">
                  <div className="px-3 py-1.5 text-xs font-medium text-slate-500 bg-slate-50">
                    💳 负债账户
                  </div>
                  {liabilityCategories.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => {
                        setForm({ ...form, categoryId: c.id.toString() });
                        document.getElementById('qe-dropdown')?.classList.add('hidden');
                      }}
                      className="w-full px-3 py-2 text-sm text-left hover:bg-indigo-50 text-slate-700"
                    >
                      {c.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            {errors.categoryId && <p className="mt-1 text-xs text-red-500">{errors.categoryId}</p>}
          </div>

          <div>
            <label htmlFor="qe-name" className="block text-sm font-medium text-slate-700 mb-1.5">
              账户名称 <span className="text-red-500">*</span>
            </label>
            <input
              id="qe-name"
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="例如：招商银行储蓄卡"
              className={`w-full px-3 py-2.5 rounded-xl border text-sm transition-all placeholder:text-slate-400
                ${
                  errors.name
                    ? 'border-red-400 bg-red-50 focus:ring-2 focus:ring-red-300'
                    : 'border-slate-200 bg-slate-50 focus:ring-2 focus:ring-slate-300 hover:border-slate-300'
                } focus:outline-none`}
            />
            {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name}</p>}
          </div>

          <div>
            <label htmlFor="qe-amount" className="block text-sm font-medium text-slate-700 mb-1.5">
              当前余额 <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">
                ¥
              </span>
              <input
                id="qe-amount"
                type="number"
                step="0.01"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                placeholder="0.00"
                className={`w-full pl-7 pr-3 py-2.5 rounded-xl border text-sm transition-all placeholder:text-slate-400
                  ${
                    errors.amount
                      ? 'border-red-400 bg-red-50 focus:ring-2 focus:ring-red-300'
                      : 'border-slate-200 bg-slate-50 focus:ring-2 focus:ring-slate-300 hover:border-slate-300'
                  } focus:outline-none`}
              />
            </div>
            {errors.amount && <p className="mt-1 text-xs text-red-500">{errors.amount}</p>}
          </div>

          <div>
            <label htmlFor="qe-date" className="block text-sm font-medium text-slate-700 mb-1.5">
              记账日期 <span className="text-red-500">*</span>
            </label>
            <input
              id="qe-date"
              type="date"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
              className={`w-full px-3 py-2.5 rounded-xl border text-sm transition-all
                ${
                  errors.date
                    ? 'border-red-400 bg-red-50 focus:ring-2 focus:ring-red-300'
                    : 'border-slate-200 bg-slate-50 focus:ring-2 focus:ring-slate-300 hover:border-slate-300'
                } focus:outline-none`}
            />
            {errors.date && <p className="mt-1 text-xs text-red-500">{errors.date}</p>}
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 text-white text-sm font-medium hover:from-emerald-700 hover:to-emerald-600 transition-all shadow-sm shadow-emerald-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? '创建中...' : '创建账户'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
