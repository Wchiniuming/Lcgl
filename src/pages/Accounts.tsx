import { useState, useEffect } from 'react';
import { ask } from '@tauri-apps/plugin-dialog';
import QuickEntryModal from '../components/QuickEntryModal';
import {
  Account,
  AccountCategory,
  Template,
  Snapshot,
  getAllAccounts,
  getAllAccountCategories,
  createAccount,
  updateAccount,
  deleteAccount,
  getTemplates,
  createTemplate,
  getSnapshots,
  createSnapshot,
  deleteSnapshot,
} from '../lib/api';

type ViewMode = 'list' | 'form' | 'snapshots';
type AccountTypeFilter = 'all' | 'asset' | 'liability';

function IconPlus() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

function IconEdit() {
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
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );
}

function IconTrash() {
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
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
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

function IconCamera() {
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
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  );
}

function IconRefresh() {
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
      <polyline points="23 4 23 10 17 10" />
      <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
    </svg>
  );
}

interface AccountFormData {
  name: string;
  category_id: string;
  type: 'asset' | 'liability';
  balance: string;
  currency: string;
  institution: string;
  account_no: string;
  interest_rate: string;
  term_months: string;
  start_date: string;
  maturity_date: string;
  payment_due_day: string;
  notes: string;
}

interface AccountFormErrors {
  name?: string;
  category_id?: string;
  balance?: string;
  currency?: string;
}

export default function Accounts() {
  const [view, setView] = useState<ViewMode>('list');
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<AccountCategory[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [loading, setLoading] = useState(true);

  const [typeFilter, setTypeFilter] = useState<AccountTypeFilter>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState<AccountFormData>({
    name: '',
    category_id: '',
    type: 'asset',
    balance: '',
    currency: 'CNY',
    institution: '',
    account_no: '',
    interest_rate: '',
    term_months: '',
    start_date: '',
    maturity_date: '',
    payment_due_day: '',
    notes: '',
  });
  const [formErrors, setFormErrors] = useState<AccountFormErrors>({});
  const [formSubmitting, setFormSubmitting] = useState(false);

  const [showQuickEntry, setShowQuickEntry] = useState(false);
  const [templateForm, setTemplateForm] = useState({
    name: '',
    description: '',
    template_type: 'account' as const,
    category_id: '' as string | number,
    account_type: '' as string,
    amount: '',
    notes: '',
  });
  const [showTemplateList, setShowTemplateList] = useState(false);
  const [showSaveTemplate, setShowSaveTemplate] = useState(false);

  const [snapshotNotes, setSnapshotNotes] = useState('');
  const [snapshotSaving, setSnapshotSaving] = useState(false);
  const [confirmSnapshotId, setConfirmSnapshotId] = useState<number | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [accts, cats, tmpls, snps] = await Promise.all([
        getAllAccounts(),
        getAllAccountCategories(),
        getTemplates({ templateType: 'account' }),
        getSnapshots({ snapshotType: 'manual' }),
      ]);
      setAccounts(accts);
      setCategories(cats);
      setTemplates(tmpls);
      setSnapshots(snps);
    } catch (e) {
      console.error('Failed to load data', e);
    } finally {
      setLoading(false);
    }
  }

  const filteredAccounts = accounts.filter((a) => {
    if (typeFilter !== 'all' && a.type !== typeFilter) return false;
    if (categoryFilter !== 'all' && a.category_id !== parseInt(categoryFilter)) return false;
    return true;
  });

  const totalAssets = accounts
    .filter((a) => a.type === 'asset')
    .reduce((sum, a) => sum + a.balance, 0);
  const totalLiabilities = accounts
    .filter((a) => a.type === 'liability')
    .reduce((sum, a) => sum + a.balance, 0);
  const netWorth = totalAssets - totalLiabilities;

  function openNewForm(type: 'asset' | 'liability' = 'asset') {
    setSelectedAccount(null);
    setEditMode(true);
    setFormData({
      name: '',
      category_id: '',
      type,
      balance: '',
      currency: 'CNY',
      institution: '',
      account_no: '',
      interest_rate: '',
      term_months: '',
      start_date: '',
      maturity_date: '',
      payment_due_day: '',
      notes: '',
    });
    setFormErrors({});
    setView('form');
  }

  function openEditForm(account: Account) {
    setSelectedAccount(account);
    setEditMode(true);
    setFormData({
      name: account.name,
      category_id: String(account.category_id),
      type: account.type,
      balance: String(account.balance),
      currency: account.currency,
      institution: account.institution ?? '',
      account_no: account.account_no ?? '',
      interest_rate: account.interest_rate != null ? String(account.interest_rate) : '',
      term_months: account.term_months != null ? String(account.term_months) : '',
      start_date: account.start_date ?? '',
      maturity_date: account.maturity_date ?? '',
      payment_due_day: account.payment_due_day != null ? String(account.payment_due_day) : '',
      notes: account.notes ?? '',
    });
    setFormErrors({});
    setView('form');
  }

  function validateAccountForm(): boolean {
    const errs: AccountFormErrors = {};
    if (!formData.name.trim()) errs.name = '请输入账户名称';
    if (!formData.category_id) errs.category_id = '请选择账户类别';
    if (formData.balance && isNaN(parseFloat(formData.balance)))
      errs.balance = '余额必须为有效数字';
    if (!formData.currency) errs.currency = '请选择币种';
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSaveAccount() {
    if (!validateAccountForm()) return;
    setFormSubmitting(true);
    try {
      const payload = {
        name: formData.name.trim(),
        category_id: parseInt(formData.category_id),
        type: formData.type,
        balance: parseFloat(formData.balance) || 0,
        currency: formData.currency,
        institution: formData.institution || null,
        account_no: formData.account_no || null,
        interest_rate: formData.interest_rate ? parseFloat(formData.interest_rate) : null,
        term_months: formData.term_months ? parseInt(formData.term_months) : null,
        start_date: formData.start_date || null,
        maturity_date: formData.maturity_date || null,
        payment_due_day: formData.payment_due_day ? parseInt(formData.payment_due_day) : null,
        is_active: true,
        is_archived: false,
        notes: formData.notes || null,
        extra_data: null,
      };
      if (selectedAccount) {
        await updateAccount({ ...selectedAccount, ...payload });
      } else {
        await createAccount(payload as Parameters<typeof createAccount>[0]);
      }
      setEditMode(false);
      setSelectedAccount(null);
      await loadData();
      setView('list');
    } catch (err) {
      console.error('Save failed', err);
    } finally {
      setFormSubmitting(false);
    }
  }

  async function handleDeleteAccount(id: number) {
    if (!(await ask('确定要删除该账户吗？', { title: '确认删除', kind: 'warning' }))) return;
    try {
      await deleteAccount(id);
      setSelectedAccount(null);
      setEditMode(false);
      await loadData();
      setView('list');
    } catch (err) {
      console.error('Delete failed', err);
    }
  }

  async function handleSaveSnapshot() {
    setSnapshotSaving(true);
    try {
      const now = new Date().toISOString().split('T')[0];
      await createSnapshot({
        snapshot_date: now,
        snapshot_type: 'manual',
        total_assets: totalAssets,
        total_liabilities: totalLiabilities,
        net_assets: netWorth,
        asset_breakdown: JSON.stringify(
          filteredAccounts
            .filter((a) => a.type === 'asset')
            .map((a) => ({ name: a.name, balance: a.balance }))
        ),
        liability_breakdown: JSON.stringify(
          filteredAccounts
            .filter((a) => a.type === 'liability')
            .map((a) => ({ name: a.name, balance: a.balance }))
        ),
        holdings_value: null,
        cash_flow: null,
        notes: snapshotNotes || null,
      });
      setSnapshotNotes('');
      await loadData();
    } catch (err) {
      console.error('Save snapshot failed', err);
    } finally {
      setSnapshotSaving(false);
    }
  }

  async function handleRestoreSnapshot(snapshot: Snapshot) {
    if (
      !(await ask(`确定要恢复到 ${snapshot.snapshot_date} 的快照吗？`, {
        title: '确认恢复',
        kind: 'warning',
      }))
    )
      return;
    try {
      if (snapshot.asset_breakdown) {
        const assets = JSON.parse(snapshot.asset_breakdown) as Array<{
          name: string;
          balance: number;
        }>;
        for (const item of assets) {
          const acct = accounts.find((a) => a.name === item.name && a.type === 'asset');
          if (acct) await updateAccount({ ...acct, balance: item.balance });
        }
      }
      if (snapshot.liability_breakdown) {
        const liabilities = JSON.parse(snapshot.liability_breakdown) as Array<{
          name: string;
          balance: number;
        }>;
        for (const item of liabilities) {
          const acct = accounts.find((a) => a.name === item.name && a.type === 'liability');
          if (acct) await updateAccount({ ...acct, balance: item.balance });
        }
      }
      await loadData();
      setConfirmSnapshotId(null);
    } catch (err) {
      console.error('Restore snapshot failed', err);
    }
  }

  async function handleDeleteSnapshot(id: number) {
    if (!(await ask('确定要删除该快照吗？', { title: '确认删除', kind: 'warning' }))) return;
    try {
      await deleteSnapshot(id);
      await loadData();
    } catch (err) {
      console.error('Delete snapshot failed', err);
    }
  }

  function formatCurrency(val: number): string {
    return val.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function getCategoryName(catId: number): string {
    return categories.find((c) => c.id === catId)?.name ?? '未知类别';
  }

  function getCategoryColor(catId: number): string {
    return categories.find((c) => c.id === catId)?.color ?? '#64748b';
  }

  const typeCategories = categories.filter((c) => typeFilter === 'all' || c.type === typeFilter);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <div className="relative">
          <div className="w-12 h-12 border-4 border-emerald-100 border-t-emerald-500 rounded-full animate-spin" />
          <span className="absolute inset-0 flex items-center justify-center text-lg">🏦</span>
        </div>
        <p className="text-sm text-slate-500 animate-pulse">正在加载账户数据...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <QuickEntryModal
        isOpen={showQuickEntry}
        onClose={() => setShowQuickEntry(false)}
        onSuccess={() => {
          setShowQuickEntry(false);
          loadData();
        }}
      />

      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <img
              src="/mascot1.png"
              alt="吉祥物"
              className="w-16 h-16 object-contain"
              style={{ filter: 'drop-shadow(0 4px 8px rgba(99,102,241,0.25))' }}
            />
            <div>
              <h1 className="text-2xl font-bold text-slate-800">资产负债管理</h1>
              <p className="text-sm text-slate-500 mt-1">管理您的资产与负债账户</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setShowQuickEntry(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 text-white text-sm font-medium hover:from-emerald-700 hover:to-emerald-600 transition-all shadow-sm shadow-emerald-200"
            >
              <IconPlus />
              <span>快速记账</span>
            </button>
            <button
              type="button"
              onClick={() => openNewForm('asset')}
              className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-300 text-slate-700 text-sm font-medium hover:bg-slate-100 transition-all"
            >
              <IconPlus />
              <span>新增账户</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl p-5 text-white shadow-lg shadow-emerald-200/50">
            <p className="text-sm text-emerald-100 font-medium">总资产</p>
            <p className="text-2xl font-bold mt-1">¥{formatCurrency(totalAssets)}</p>
          </div>
          <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-2xl p-5 text-white shadow-lg shadow-red-200/50">
            <p className="text-sm text-red-100 font-medium">总负债</p>
            <p className="text-2xl font-bold mt-1">¥{formatCurrency(totalLiabilities)}</p>
          </div>
          <div className="bg-gradient-to-br from-indigo-600 to-indigo-500 rounded-2xl p-5 text-white shadow-lg shadow-indigo-200/50">
            <p className="text-sm text-indigo-200 font-medium">净资产</p>
            <p className="text-2xl font-bold mt-1">¥{formatCurrency(netWorth)}</p>
          </div>
        </div>

        <div className="flex items-center gap-1 mb-4 bg-slate-100 p-1 rounded-xl w-fit">
          {(
            [
              { key: 'list', label: '账户列表' },
              { key: 'snapshots', label: '历史快照' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => {
                setView(tab.key);
                setEditMode(false);
                setSelectedAccount(null);
              }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                view === tab.key
                  ? 'bg-white text-slate-800 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {view === 'list' && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="relative">
                <select
                  value={typeFilter}
                  onChange={(e) => {
                    setTypeFilter(e.target.value as AccountTypeFilter);
                    setCategoryFilter('all');
                  }}
                  className="px-3 py-2 pr-8 rounded-lg border border-slate-200 text-sm bg-white focus:ring-2 focus:ring-slate-300 focus:outline-none"
                >
                  <option value="all">全部类型</option>
                  <option value="asset">资产</option>
                  <option value="liability">负债</option>
                </select>
                {typeFilter !== 'all' && (
                  <button
                    type="button"
                    onClick={() => {
                      setTypeFilter('all');
                      setCategoryFilter('all');
                    }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                    title="清除筛选"
                  >
                    ×
                  </button>
                )}
              </div>
              <div className="relative">
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="px-3 py-2 pr-8 rounded-lg border border-slate-200 text-sm bg-white focus:ring-2 focus:ring-slate-300 focus:outline-none"
                >
                  <option value="all">全部类别</option>
                  {typeCategories.map((c) => (
                    <option key={c.id} value={String(c.id)}>
                      {c.name}
                    </option>
                  ))}
                </select>
                {categoryFilter !== 'all' && (
                  <button
                    type="button"
                    onClick={() => setCategoryFilter('all')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                    title="清除筛选"
                  >
                    ×
                  </button>
                )}
              </div>
              <span className="ml-auto text-sm text-slate-500">
                共 {filteredAccounts.length} 个账户
              </span>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                      账户名称
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                      类别
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">
                      余额
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                      机构
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">
                      利率
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">
                      操作
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredAccounts.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-16 text-center">
                        <div className="flex flex-col items-center gap-2">
                          <span className="text-4xl opacity-40">🏠💳</span>
                          <p className="text-sm text-slate-400">暂无账户数据</p>
                          <p className="text-xs text-slate-300">
                            点击「新增账户」添加您的第一笔资产或负债吧
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredAccounts.map((account) => (
                      <tr
                        key={account.id}
                        className="hover:bg-slate-50 transition-colors cursor-pointer"
                        onClick={() => {
                          setSelectedAccount(account);
                          setEditMode(false);
                          setView('form');
                        }}
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <span
                              className={`inline-flex w-2 h-2 rounded-full ${account.type === 'asset' ? 'bg-emerald-400' : 'bg-red-400'}`}
                            />
                            <span className="text-sm font-medium text-slate-800">
                              {account.name}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className="inline-flex px-2 py-0.5 rounded-md text-xs font-medium text-white"
                            style={{ backgroundColor: getCategoryColor(account.category_id) }}
                          >
                            {getCategoryName(account.category_id)}
                          </span>
                        </td>
                        <td
                          className={`px-4 py-3 text-right text-lg font-bold ${account.type === 'asset' ? 'text-emerald-600' : 'text-red-600'}`}
                        >
                          {account.type === 'liability' ? '-' : ''}¥
                          {formatCurrency(account.balance)}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-500">
                          {account.institution ?? '-'}
                        </td>
                        <td className="px-4 py-3 text-right text-sm text-slate-500">
                          {account.interest_rate != null ? `${account.interest_rate}%` : '-'}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                openEditForm(account);
                              }}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                              title="编辑"
                            >
                              <IconEdit />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteAccount(account.id);
                              }}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                              title="删除"
                            >
                              <IconTrash />
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
        )}

        {view === 'form' && (
          <div className="w-full max-w-4xl mx-auto">
            <div className="flex items-center gap-3 mb-4">
              <button
                type="button"
                onClick={() => {
                  setView('list');
                  setEditMode(false);
                  setSelectedAccount(null);
                }}
                className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition-colors"
              >
                <IconArrowLeft />
                <span>返回列表</span>
              </button>
              <div className="h-4 w-px bg-slate-300" />
              <h2 className="text-sm font-semibold text-slate-800">
                {selectedAccount ? (editMode ? '编辑账户' : '账户详情') : '新增账户'}
              </h2>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-5">
                <div className="flex items-center gap-4 mb-4 pb-3 border-b border-slate-100">
                  {!selectedAccount && (
                    <div className="flex gap-2">
                      {(['asset', 'liability'] as const).map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setFormData({ ...formData, type: t, category_id: '' })}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                            formData.type === t
                              ? t === 'asset'
                                ? 'bg-emerald-100 text-emerald-700 border border-emerald-300'
                                : 'bg-red-100 text-red-700 border border-red-300'
                              : 'bg-slate-50 text-slate-500 border border-slate-200'
                          }`}
                        >
                          {t === 'asset' ? '资产账户' : '负债账户'}
                        </button>
                      ))}
                    </div>
                  )}
                  {selectedAccount && !editMode && (
                    <div
                      className={`inline-flex px-2 py-1 rounded-lg text-xs font-medium ${selectedAccount.type === 'asset' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}
                    >
                      {selectedAccount.type === 'asset' ? '资产账户' : '负债账户'}
                    </div>
                  )}
                  {selectedAccount && editMode && (
                    <div className="flex gap-2">
                      {(['asset', 'liability'] as const).map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setFormData({ ...formData, type: t, category_id: '' })}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                            formData.type === t
                              ? t === 'asset'
                                ? 'bg-emerald-100 text-emerald-700 border border-emerald-300'
                                : 'bg-red-100 text-red-700 border border-red-300'
                              : 'bg-slate-50 text-slate-500 border border-slate-200'
                          }`}
                        >
                          {t === 'asset' ? '资产账户' : '负债账户'}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-3 mb-3">
                  <div>
                    <label
                      htmlFor="acc-name"
                      className="block text-xs font-medium text-slate-600 mb-1"
                    >
                      名称 <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="acc-name"
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      disabled={!editMode && !!selectedAccount}
                      placeholder="账户名称"
                      className={`w-full px-2.5 py-2 rounded-lg border text-xs transition-all placeholder:text-slate-400
                        ${!editMode && !!selectedAccount ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : ''}
                        ${formErrors.name ? 'border-red-400 bg-red-50' : 'border-slate-200 bg-white focus:ring-2 focus:ring-slate-300 hover:border-slate-300'}
                        focus:outline-none`}
                    />
                    {formErrors.name && (
                      <p className="mt-0.5 text-xs text-red-500">{formErrors.name}</p>
                    )}
                  </div>
                  <div>
                    <label
                      htmlFor="acc-category"
                      className="block text-xs font-medium text-slate-600 mb-1"
                    >
                      类别 <span className="text-red-500">*</span>
                    </label>
                    <select
                      id="acc-category"
                      value={formData.category_id}
                      onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                      disabled={!editMode && !!selectedAccount}
                      className={`w-full px-2.5 py-2 rounded-lg border text-xs transition-all
                        ${!editMode && !!selectedAccount ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : ''}
                        ${formErrors.category_id ? 'border-red-400 bg-red-50' : 'border-slate-200 bg-white focus:ring-2 focus:ring-slate-300 hover:border-slate-300'}
                        focus:outline-none`}
                    >
                      <option value="">选择类别</option>
                      {categories
                        .filter((c) => c.type === formData.type)
                        .map((c) => (
                          <option key={c.id} value={String(c.id)}>
                            {c.name}
                          </option>
                        ))}
                    </select>
                    {formErrors.category_id && (
                      <p className="mt-0.5 text-xs text-red-500">{formErrors.category_id}</p>
                    )}
                  </div>
                  <div>
                    <label
                      htmlFor="acc-balance"
                      className="block text-xs font-medium text-slate-600 mb-1"
                    >
                      余额
                    </label>
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs">
                        ¥
                      </span>
                      <input
                        id="acc-balance"
                        type="number"
                        step="0.01"
                        value={formData.balance}
                        onChange={(e) => setFormData({ ...formData, balance: e.target.value })}
                        disabled={!editMode}
                        placeholder="0.00"
                        className={`w-full pl-6 pr-2.5 py-2 rounded-lg border text-xs transition-all placeholder:text-slate-400
                          ${!editMode ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : ''}
                          ${formErrors.balance ? 'border-red-400 bg-red-50' : 'border-slate-200 bg-white focus:ring-2 focus:ring-slate-300 hover:border-slate-300'}
                          focus:outline-none`}
                      />
                    </div>
                    {formErrors.balance && (
                      <p className="mt-0.5 text-xs text-red-500">{formErrors.balance}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 mb-3">
                  <div>
                    <label
                      htmlFor="acc-currency"
                      className="block text-xs font-medium text-slate-600 mb-1"
                    >
                      币种
                    </label>
                    <select
                      id="acc-currency"
                      value={formData.currency}
                      onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                      disabled={!editMode}
                      className={`w-full px-2.5 py-2 rounded-lg border text-xs transition-all
                        ${!editMode ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : 'border-slate-200 bg-white focus:ring-2 focus:ring-slate-300 hover:border-slate-300'}
                        focus:outline-none`}
                    >
                      <option value="CNY">CNY</option>
                      <option value="USD">USD</option>
                      <option value="EUR">EUR</option>
                      <option value="HKD">HKD</option>
                      <option value="JPY">JPY</option>
                      <option value="GBP">GBP</option>
                    </select>
                  </div>
                  <div>
                    <label
                      htmlFor="acc-institution"
                      className="block text-xs font-medium text-slate-600 mb-1"
                    >
                      机构
                    </label>
                    <input
                      id="acc-institution"
                      type="text"
                      value={formData.institution}
                      onChange={(e) => setFormData({ ...formData, institution: e.target.value })}
                      disabled={!editMode}
                      placeholder="机构名称"
                      className={`w-full px-2.5 py-2 rounded-lg border text-xs transition-all placeholder:text-slate-400
                        ${!editMode ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : 'border-slate-200 bg-white focus:ring-2 focus:ring-slate-300 hover:border-slate-300'}
                        focus:outline-none`}
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="acc-account-no"
                      className="block text-xs font-medium text-slate-600 mb-1"
                    >
                      账号
                    </label>
                    <input
                      id="acc-account-no"
                      type="text"
                      value={formData.account_no}
                      onChange={(e) => setFormData({ ...formData, account_no: e.target.value })}
                      disabled={!editMode}
                      placeholder="尾号（选填）"
                      className={`w-full px-2.5 py-2 rounded-lg border text-xs transition-all placeholder:text-slate-400
                        ${!editMode ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : 'border-slate-200 bg-white focus:ring-2 focus:ring-slate-300 hover:border-slate-300'}
                        focus:outline-none`}
                    />
                  </div>
                </div>

                {formData.type === 'liability' ? (
                  <div className="grid grid-cols-3 gap-3 mb-3">
                    <div>
                      <label
                        htmlFor="acc-rate"
                        className="block text-xs font-medium text-slate-600 mb-1"
                      >
                        年利率
                      </label>
                      <div className="relative">
                        <input
                          id="acc-rate"
                          type="number"
                          step="0.001"
                          value={formData.interest_rate}
                          onChange={(e) =>
                            setFormData({ ...formData, interest_rate: e.target.value })
                          }
                          disabled={!editMode}
                          placeholder="4.9"
                          className={`w-full px-2.5 py-2 rounded-lg border text-xs transition-all placeholder:text-slate-400
                            ${!editMode ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : 'border-slate-200 bg-white focus:ring-2 focus:ring-slate-300 hover:border-slate-300'}
                            focus:outline-none pr-7`}
                        />
                        <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs">
                          %
                        </span>
                      </div>
                    </div>
                    <div>
                      <label
                        htmlFor="acc-term"
                        className="block text-xs font-medium text-slate-600 mb-1"
                      >
                        期限
                      </label>
                      <input
                        id="acc-term"
                        type="number"
                        value={formData.term_months}
                        onChange={(e) => setFormData({ ...formData, term_months: e.target.value })}
                        disabled={!editMode}
                        placeholder="月数"
                        className={`w-full px-2.5 py-2 rounded-lg border text-xs transition-all placeholder:text-slate-400
                          ${!editMode ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : 'border-slate-200 bg-white focus:ring-2 focus:ring-slate-300 hover:border-slate-300'}
                          focus:outline-none`}
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="acc-due-day"
                        className="block text-xs font-medium text-slate-600 mb-1"
                      >
                        还款日
                      </label>
                      <input
                        id="acc-due-day"
                        type="number"
                        min="1"
                        max="31"
                        value={formData.payment_due_day}
                        onChange={(e) =>
                          setFormData({ ...formData, payment_due_day: e.target.value })
                        }
                        disabled={!editMode}
                        placeholder="1-31"
                        className={`w-full px-2.5 py-2 rounded-lg border text-xs transition-all placeholder:text-slate-400
                          ${!editMode ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : 'border-slate-200 bg-white focus:ring-2 focus:ring-slate-300 hover:border-slate-300'}
                          focus:outline-none`}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div>
                      <label
                        htmlFor="acc-start-date"
                        className="block text-xs font-medium text-slate-600 mb-1"
                      >
                        起始日
                      </label>
                      <input
                        id="acc-start-date"
                        type="date"
                        value={formData.start_date}
                        onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                        disabled={!editMode}
                        className={`w-full px-2.5 py-2 rounded-lg border text-xs transition-all
                          ${!editMode ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : 'border-slate-200 bg-white focus:ring-2 focus:ring-slate-300 hover:border-slate-300'}
                          focus:outline-none`}
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="acc-maturity"
                        className="block text-xs font-medium text-slate-600 mb-1"
                      >
                        到期日
                      </label>
                      <input
                        id="acc-maturity"
                        type="date"
                        value={formData.maturity_date}
                        onChange={(e) =>
                          setFormData({ ...formData, maturity_date: e.target.value })
                        }
                        disabled={!editMode}
                        className={`w-full px-2.5 py-2 rounded-lg border text-xs transition-all
                          ${!editMode ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : 'border-slate-200 bg-white focus:ring-2 focus:ring-slate-300 hover:border-slate-300'}
                          focus:outline-none`}
                      />
                    </div>
                  </div>
                )}

                <div className="mb-3">
                  <label
                    htmlFor="acc-notes"
                    className="block text-xs font-medium text-slate-600 mb-1"
                  >
                    备注
                  </label>
                  <textarea
                    id="acc-notes"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    disabled={!editMode}
                    rows={2}
                    placeholder="备注信息..."
                    className={`w-full px-2.5 py-2 rounded-lg border text-xs transition-all placeholder:text-slate-400 resize-none
                      ${!editMode ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : 'border-slate-200 bg-white focus:ring-2 focus:ring-slate-300 hover:border-slate-300'}
                      focus:outline-none`}
                  />
                </div>

                <div className="flex gap-2">
                  {editMode || !selectedAccount ? (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          if (selectedAccount) {
                            setEditMode(false);
                            openEditForm(selectedAccount);
                          } else {
                            setView('list');
                          }
                        }}
                        className="px-4 py-2 rounded-lg border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors"
                      >
                        取消
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveAccount}
                        disabled={formSubmitting}
                        className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-xs font-medium hover:bg-indigo-500 transition-all disabled:opacity-50"
                      >
                        {formSubmitting ? '保存中...' : '保存'}
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => openEditForm(selectedAccount)}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-slate-300 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                      >
                        <IconEdit />
                        <span>编辑</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteAccount(selectedAccount.id)}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-red-200 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors"
                      >
                        <IconTrash />
                        <span>删除</span>
                      </button>
                    </>
                  )}
                </div>

                {(editMode || !selectedAccount) && (
                  <div className="mt-3 flex gap-2 justify-end">
                    <button
                      type="button"
                      onClick={() => setShowTemplateList(!showTemplateList)}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium text-indigo-600 hover:bg-indigo-50 transition-colors border border-indigo-200"
                    >
                      {showTemplateList ? '收起模板' : '加载模板'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowSaveTemplate(!showSaveTemplate)}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium text-amber-600 hover:bg-amber-50 transition-colors border border-amber-200"
                    >
                      {showSaveTemplate ? '收起' : '保存为模板'}
                    </button>
                  </div>
                )}

                {showTemplateList && (
                  <div className="mt-3 p-4 bg-slate-50 rounded-xl border border-slate-200">
                    <h4 className="text-sm font-medium text-slate-700 mb-2">选择模板</h4>
                    {templates.filter((t) => !t.account_type || t.account_type === formData.type)
                      .length === 0 ? (
                      <div className="text-center py-3">
                        <p className="text-xs text-slate-400">暂无可用模板</p>
                        <p className="text-xs text-slate-400 mt-1">
                          使用下方「保存为模板」按钮创建
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {templates
                          .filter((t) => !t.account_type || t.account_type === formData.type)
                          .sort((a, b) => b.use_count - a.use_count)
                          .map((tmpl) => (
                            <button
                              key={tmpl.id}
                              type="button"
                              onClick={() => {
                                setFormData({
                                  ...formData,
                                  name: formData.name || tmpl.name,
                                  category_id: tmpl.category_id
                                    ? String(tmpl.category_id)
                                    : formData.category_id,
                                  interest_rate: tmpl.amount ? '' : formData.interest_rate,
                                });
                                setShowTemplateList(false);
                              }}
                              className="w-full text-left px-3 py-2 rounded-lg bg-white border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50 transition-colors"
                            >
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-medium text-slate-700">
                                  {tmpl.name}
                                </span>
                                <span className="text-xs text-slate-400">
                                  使用 {tmpl.use_count} 次
                                </span>
                              </div>
                              {tmpl.description && (
                                <p className="text-xs text-slate-400 mt-0.5">{tmpl.description}</p>
                              )}
                            </button>
                          ))}
                      </div>
                    )}
                  </div>
                )}

                {showSaveTemplate && (
                  <div className="mt-3 p-4 bg-slate-50 rounded-xl border border-slate-200">
                    <h4 className="text-sm font-medium text-slate-700 mb-2">保存为模板</h4>
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={templateForm.name}
                        onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })}
                        placeholder="模板名称"
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm focus:ring-2 focus:ring-indigo-300 focus:border-indigo-300 outline-none"
                      />
                      <button
                        type="button"
                        onClick={async () => {
                          if (!templateForm.name.trim()) {
                            alert('请输入模板名称');
                            return;
                          }
                          try {
                            await createTemplate({
                              name: templateForm.name.trim(),
                              description: templateForm.description || null,
                              template_type: 'account',
                              category_id: formData.category_id
                                ? parseInt(formData.category_id)
                                : null,
                              account_type: formData.type,
                              transaction_type: null,
                              amount: formData.balance ? parseFloat(formData.balance) : null,
                              counterparty_id: null,
                              notes: null,
                            });
                            await loadData();
                            setShowSaveTemplate(false);
                            setTemplateForm({ ...templateForm, name: '' });
                            alert('模板保存成功');
                          } catch (err) {
                            alert('模板保存失败');
                          }
                        }}
                        className="w-full px-3 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-500 transition-colors"
                      >
                        保存
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {view === 'snapshots' && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-5 py-4 bg-gradient-to-r from-teal-700 to-teal-600">
                <h3 className="text-white font-semibold text-sm">保存快照</h3>
                <p className="text-teal-200 text-xs mt-0.5">保存当前资产负债状态为历史快照</p>
              </div>
              <div className="p-5">
                <div className="flex items-start gap-3">
                  <div className="flex-1">
                    <textarea
                      value={snapshotNotes}
                      onChange={(e) => setSnapshotNotes(e.target.value)}
                      rows={2}
                      placeholder="添加快照备注（选填）..."
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:ring-2 focus:ring-slate-300 hover:border-slate-300 focus:outline-none resize-none"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleSaveSnapshot}
                    disabled={snapshotSaving}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-teal-600 to-teal-500 text-white text-sm font-medium hover:from-teal-700 hover:to-teal-600 transition-all shadow-sm shadow-teal-200 disabled:opacity-50 shrink-0"
                  >
                    <IconCamera />
                    <span>{snapshotSaving ? '保存中...' : '保存快照'}</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-5 py-3 border-b border-slate-200">
                <h3 className="text-sm font-semibold text-slate-700">
                  历史快照 ({snapshots.length})
                </h3>
              </div>
              {snapshots.length === 0 ? (
                <div className="px-5 py-8 text-center text-sm text-slate-400">暂无快照记录</div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {snapshots.map((snap) => (
                    <div key={snap.id} className="px-5 py-4 hover:bg-slate-50 transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-semibold text-slate-800">
                              {snap.snapshot_date}
                            </span>
                            {snap.notes && (
                              <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                                {snap.notes}
                              </span>
                            )}
                          </div>
                          <div className="grid grid-cols-3 gap-4 mt-2">
                            <div>
                              <p className="text-xs text-emerald-600">总资产</p>
                              <p className="text-sm font-semibold text-emerald-700">
                                ¥
                                {snap.total_assets != null
                                  ? formatCurrency(snap.total_assets)
                                  : '-'}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-red-600">总负债</p>
                              <p className="text-sm font-semibold text-red-700">
                                ¥
                                {snap.total_liabilities != null
                                  ? formatCurrency(snap.total_liabilities)
                                  : '-'}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-slate-500">净资产</p>
                              <p className="text-sm font-semibold text-slate-700">
                                ¥{snap.net_assets != null ? formatCurrency(snap.net_assets) : '-'}
                              </p>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 ml-4">
                          {confirmSnapshotId === snap.id ? (
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => handleRestoreSnapshot(snap)}
                                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-teal-600 text-white hover:bg-teal-700 transition-colors"
                              >
                                确认恢复
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmSnapshotId(null)}
                                className="px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
                              >
                                取消
                              </button>
                            </div>
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={() => setConfirmSnapshotId(snap.id)}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-teal-600 hover:bg-teal-50 transition-colors border border-teal-200"
                              >
                                <IconRefresh />
                                <span>恢复</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteSnapshot(snap.id)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                                title="删除"
                              >
                                <IconTrash />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
