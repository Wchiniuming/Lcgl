import { useState, useEffect } from 'react';
import {
  getTransactions,
  getAllAccounts,
  getAllAccountCategories,
  Account,
  AccountCategory,
} from '../lib/api';
import ImportWizard from '../components/ImportWizard';

interface ImportHistoryItem {
  id: string;
  filename: string;
  imported_at: string;
  imported_count: number;
  account_name: string;
}

type ExportDataType = 'transactions' | 'accounts' | 'categories';
type ExportDateRange = 'all' | '7d' | '30d' | '90d' | '1y' | 'custom';

const EXPORT_TYPE_LABELS: Record<ExportDataType, string> = {
  transactions: '交易记录',
  accounts: '账户信息',
  categories: '分类信息',
};

const DATE_RANGE_LABELS: Record<ExportDateRange, string> = {
  all: '全部',
  '7d': '最近7天',
  '30d': '最近30天',
  '90d': '最近90天',
  '1y': '最近1年',
  custom: '自定义',
};

export default function ImportExport() {
  const [activeTab, setActiveTab] = useState<'import' | 'export' | 'history'>('import');
  const [showWizard, setShowWizard] = useState(false);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<AccountCategory[]>([]);
  const [exportType, setExportType] = useState<ExportDataType>('transactions');
  const [dateRange, setDateRange] = useState<ExportDateRange>('30d');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(null);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [importHistory, setImportHistory] = useState<ImportHistoryItem[]>([]);

  useEffect(() => {
    loadData();
    loadImportHistory();
  }, []);

  const loadData = async () => {
    try {
      const [accs, cats] = await Promise.all([getAllAccounts(), getAllAccountCategories()]);
      setAccounts(accs);
      setCategories(cats);
    } catch (e) {
      console.error('Failed to load data:', e);
    }
  };

  const loadImportHistory = () => {
    const stored = localStorage.getItem('import_history');
    if (stored) {
      try {
        setImportHistory(JSON.parse(stored));
      } catch {
        setImportHistory([]);
      }
    }
  };

  const saveImportHistory = (item: ImportHistoryItem) => {
    const history = [item, ...importHistory].slice(0, 50);
    setImportHistory(history);
    localStorage.setItem('import_history', JSON.stringify(history));
  };

  const handleImportComplete = (result: { imported: number; success: boolean }) => {
    if (result.success) {
      const historyItem: ImportHistoryItem = {
        id: Date.now().toString(),
        filename: 'CSV导入',
        imported_at: new Date().toISOString(),
        imported_count: result.imported,
        account_name: '已导入',
      };
      saveImportHistory(historyItem);
    }
    setShowWizard(false);
  };

  const getDateRangeFilter = (): { startDate?: string; endDate?: string } => {
    const now = new Date();
    let startDate: Date | undefined;
    const endDate = now.toISOString().split('T')[0];

    switch (dateRange) {
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case '1y':
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      case 'custom':
        if (customStartDate) startDate = new Date(customStartDate);
        if (customEndDate) {
          const end = new Date(customEndDate);
          end.setHours(23, 59, 59, 999);
          return { startDate: startDate?.toISOString().split('T')[0], endDate: customEndDate };
        }
        break;
      case 'all':
      default:
        return {};
    }

    return {
      startDate: startDate?.toISOString().split('T')[0],
      endDate,
    };
  };

  const handleExport = async () => {
    setExporting(true);
    setExportError(null);

    try {
      let csvContent = '';
      let filename = '';

      if (exportType === 'transactions') {
        const dateFilter = getDateRangeFilter();
        const transactions = await getTransactions({
          accountId: selectedAccountId || undefined,
          startDate: dateFilter.startDate,
          endDate: dateFilter.endDate,
          limit: 10000,
        });

        const headers = ['日期', '账户', '类型', '金额', '余额', '描述', '备注'];
        const rows = transactions.map((tx) => {
          const account = accounts.find((a) => a.id === tx.account_id);
          return [
            tx.transaction_date,
            account?.name || '',
            tx.transaction_type === 'income'
              ? '收入'
              : tx.transaction_type === 'expense'
                ? '支出'
                : tx.transaction_type === 'transfer'
                  ? '转账'
                  : '调整',
            tx.amount.toFixed(2),
            tx.balance_after?.toFixed(2) || '',
            tx.description || '',
            '',
          ];
        });

        csvContent = [headers.join(','), ...rows.map((r) => r.map((c) => `"${c}"`).join(','))].join(
          '\n'
        );
        filename = `transactions_${new Date().toISOString().split('T')[0]}.csv`;
      } else if (exportType === 'accounts') {
        const headers = ['账户名称', '类型', '余额', '货币', '机构', '备注'];
        const rows = accounts.map((acc) => [
          acc.name,
          acc.type === 'asset' ? '资产' : '负债',
          acc.balance.toFixed(2),
          acc.currency,
          acc.institution || '',
          acc.notes || '',
        ]);

        csvContent = [headers.join(','), ...rows.map((r) => r.map((c) => `"${c}"`).join(','))].join(
          '\n'
        );
        filename = `accounts_${new Date().toISOString().split('T')[0]}.csv`;
      } else if (exportType === 'categories') {
        const headers = ['分类名称', '类型', '父分类', '图标', '颜色'];
        const rows = categories.map((cat) => {
          const parent = categories.find((c) => c.id === cat.parent_id);
          return [
            cat.name,
            cat.type === 'asset' ? '资产' : '负债',
            parent?.name || '',
            cat.icon || '',
            cat.color || '',
          ];
        });

        csvContent = [headers.join(','), ...rows.map((r) => r.map((c) => `"${c}"`).join(','))].join(
          '\n'
        );
        filename = `categories_${new Date().toISOString().split('T')[0]}.csv`;
      }

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (e) {
      setExportError('导出失败: ' + (e as Error).message);
    } finally {
      setExporting(false);
    }
  };

  const handleUndoImport = (id: string) => {
    if (!confirm('撤销导入将删除该次导入的交易记录，确定继续？')) return;
    setImportHistory((prev) => prev.filter((item) => item.id !== id));
    localStorage.setItem(
      'import_history',
      JSON.stringify(importHistory.filter((item) => item.id !== id))
    );
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold text-slate-800 mb-6">导入导出</h1>

      <div className="flex gap-4 mb-6 border-b">
        {(['import', 'export', 'history'] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 font-medium border-b-2 transition-colors ${
              activeTab === tab
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            {tab === 'import' ? '导入' : tab === 'export' ? '导出' : '历史记录'}
          </button>
        ))}
      </div>

      {activeTab === 'import' && (
        <div>
          {!showWizard ? (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 text-center">
              <div className="text-5xl mb-4">📥</div>
              <h2 className="text-xl font-semibold mb-2">导入数据</h2>
              <p className="text-slate-500 mb-6">支持 CSV 格式的银行账单、券商对账单等</p>
              <button
                type="button"
                onClick={() => setShowWizard(true)}
                className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              >
                打开导入向导
              </button>
            </div>
          ) : (
            <ImportWizard onComplete={handleImportComplete} onCancel={() => setShowWizard(false)} />
          )}
        </div>
      )}

      {activeTab === 'export' && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h2 className="text-lg font-semibold mb-4">导出数据</h2>

          {exportError && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              {exportError}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label
                htmlFor="export_type"
                className="block text-sm font-medium text-slate-700 mb-1"
              >
                导出类型
              </label>
              <select
                id="export_type"
                value={exportType}
                onChange={(e) => setExportType(e.target.value as ExportDataType)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                {Object.entries(EXPORT_TYPE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            {exportType === 'transactions' && (
              <>
                <div>
                  <label
                    htmlFor="export_account"
                    className="block text-sm font-medium text-slate-700 mb-1"
                  >
                    账户筛选（可选）
                  </label>
                  <select
                    id="export_account"
                    value={selectedAccountId || ''}
                    onChange={(e) =>
                      setSelectedAccountId(e.target.value ? Number(e.target.value) : null)
                    }
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  >
                    <option value="">全部账户</option>
                    {accounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="date_range"
                    className="block text-sm font-medium text-slate-700 mb-1"
                  >
                    日期范围
                  </label>
                  <select
                    id="date_range"
                    value={dateRange}
                    onChange={(e) => setDateRange(e.target.value as ExportDateRange)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  >
                    {Object.entries(DATE_RANGE_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>

                {dateRange === 'custom' && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label
                        htmlFor="custom_start"
                        className="block text-sm font-medium text-slate-700 mb-1"
                      >
                        开始日期
                      </label>
                      <input
                        id="custom_start"
                        type="date"
                        value={customStartDate}
                        onChange={(e) => setCustomStartDate(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="custom_end"
                        className="block text-sm font-medium text-slate-700 mb-1"
                      >
                        结束日期
                      </label>
                      <input
                        id="custom_end"
                        type="date"
                        value={customEndDate}
                        onChange={(e) => setCustomEndDate(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                )}
              </>
            )}

            <div className="pt-4">
              <button
                type="button"
                onClick={handleExport}
                disabled={exporting}
                className="w-full px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                {exporting ? '导出中...' : '导出 CSV 文件'}
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'history' && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200">
          <div className="px-4 py-3 border-b border-slate-100">
            <h2 className="font-semibold">导入历史</h2>
          </div>
          {importHistory.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              <div className="text-4xl mb-4">📋</div>
              <p>暂无导入记录</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {importHistory.map((item) => (
                <div key={item.id} className="p-4 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{item.filename}</span>
                      <span className="px-2 py-0.5 text-xs bg-green-100 text-green-700 rounded">
                        {item.imported_count} 笔
                      </span>
                    </div>
                    <div className="text-sm text-slate-500 mt-1">
                      {formatDate(item.imported_at)}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleUndoImport(item.id)}
                    className="px-3 py-1 text-sm text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
                  >
                    撤销
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
