import { useState, useEffect } from 'react';
import { save } from '@tauri-apps/plugin-dialog';
import * as XLSX from 'xlsx';
import { getTransactions, getAllAccounts, getHoldings, getInsurances, Account } from '../lib/api';
import ExcelImportWizard from '../components/ExcelImportWizard';

type ExportDateRange = 'all' | '7d' | '30d' | '90d' | '1y' | 'custom';

const DATE_RANGE_LABELS: Record<ExportDateRange, string> = {
  all: '全部',
  '7d': '最近7天',
  '30d': '最近30天',
  '90d': '最近90天',
  '1y': '最近1年',
  custom: '自定义',
};

export default function ImportExport() {
  const [activeTab, setActiveTab] = useState<'import' | 'export'>('import');
  const [wizardData, setWizardData] = useState<{ filePath: string } | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [dateRange, setDateRange] = useState<ExportDateRange>('30d');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(null);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [selectedModules, setSelectedModules] = useState<Set<string>>(
    new Set(['accounts', 'holdings', 'insurances', 'transactions'])
  );

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const accs = await getAllAccounts();
      setAccounts(accs);
    } catch (e) {
      console.error('Failed to load data:', e);
    }
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
      const filePath = await save({
        filters: [{ name: 'Excel', extensions: ['xlsx'] }],
        defaultPath: `理财管家_${new Date().toISOString().split('T')[0].replace(/-/g, '')}.xlsx`,
      });
      if (!filePath) {
        setExporting(false);
        return;
      }

      const wb = XLSX.utils.book_new();
      const allAccounts = await getAllAccounts();

      if (selectedModules.has('accounts')) {
        const ws = XLSX.utils.json_to_sheet(
          allAccounts.map((a) => ({
            名称: a.name,
            类型: a.type === 'asset' ? '资产' : '负债',
            余额: a.balance,
            货币: a.currency,
            机构: a.institution || '',
            备注: a.notes || '',
          }))
        );
        XLSX.utils.book_append_sheet(wb, ws, '资产账户');
      }

      if (selectedModules.has('holdings')) {
        const holdings = await getHoldings();
        const ws = XLSX.utils.json_to_sheet(
          holdings.map((h) => {
            const acc = allAccounts.find((a) => a.id === h.account_id);
            return {
              账户: acc?.name || '',
              证券代码: h.symbol,
              名称: h.name,
              数量: h.shares,
              成本: h.cost_basis,
              当前价格: h.current_price,
              购入日期: h.purchase_date || '',
              备注: h.notes || '',
            };
          })
        );
        XLSX.utils.book_append_sheet(wb, ws, '投资持仓');
      }

      if (selectedModules.has('insurances')) {
        const insurances = await getInsurances();
        const ws = XLSX.utils.json_to_sheet(
          insurances.map((i) => ({
            名称: i.name,
            类型: i.insurance_type,
            保险公司: i.provider || '',
            保单号: i.policy_no || '',
            保费: i.premium,
            保障额度: i.coverage_amount,
            生效日期: i.start_date || '',
            到期日期: i.end_date || '',
            状态: i.status,
            备注: i.notes || '',
          }))
        );
        XLSX.utils.book_append_sheet(wb, ws, '保险保单');
      }

      if (selectedModules.has('transactions')) {
        const dateFilter = getDateRangeFilter();
        const txns = await getTransactions({
          accountId: selectedAccountId || undefined,
          startDate: dateFilter.startDate,
          endDate: dateFilter.endDate,
          limit: 100000,
        });
        const ws = XLSX.utils.json_to_sheet(
          txns.map((t) => {
            const acc = allAccounts.find((a) => a.id === t.account_id);
            return {
              日期: t.transaction_date,
              账户: acc?.name || '',
              类型:
                t.transaction_type === 'income'
                  ? '收入'
                  : t.transaction_type === 'expense'
                    ? '支出'
                    : t.transaction_type === 'transfer'
                      ? '转账'
                      : '调整',
              金额: t.amount,
              余额: t.balance_after || '',
              描述: t.description || '',
            };
          })
        );
        XLSX.utils.book_append_sheet(wb, ws, '交易记录');
      }

      const buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([buffer], { type: 'application/octet-stream' });
      const arrayBuffer = await blob.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      const { writeFile } = await import('@tauri-apps/plugin-fs');
      await writeFile(filePath, uint8Array);

      alert('导出成功！');
    } catch (e) {
      const err = e as Error;
      console.error('Export failed:', err);
      console.error('Error name:', err.name);
      console.error('Error message:', err.message);
      const errObj = e as Record<string, unknown>;
      console.error('Error keys:', Object.keys(errObj));
      console.error('Full error string:', JSON.stringify(e, null, 2));
      setExportError('导出失败: ' + (err.message || JSON.stringify(e)));
    } finally {
      setExporting(false);
    }
  };

  const toggleModule = (module: string) => {
    setSelectedModules((prev) => {
      const next = new Set(prev);
      if (next.has(module)) {
        next.delete(module);
      } else {
        next.add(module);
      }
      return next;
    });
  };

  const toggleAll = (selected: boolean) => {
    if (selected) {
      setSelectedModules(new Set(['accounts', 'holdings', 'insurances', 'transactions']));
    } else {
      setSelectedModules(new Set());
    }
  };

  const allSelected = selectedModules.size === 4;

  const MODULE_OPTIONS = [
    { key: 'accounts', label: '资产账户' },
    { key: 'holdings', label: '投资持仓' },
    { key: 'insurances', label: '保险保单' },
    { key: 'transactions', label: '交易记录' },
  ] as const;

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold text-slate-800 mb-6">导入导出</h1>

      <div className="flex gap-4 mb-6 border-b">
        {(['import', 'export'] as const).map((tab) => (
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
            {tab === 'import' ? '导入' : '导出'}
          </button>
        ))}
      </div>

      {activeTab === 'import' && (
        <div>
          {!wizardData ? (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 text-center">
              <div className="text-5xl mb-4">📥</div>
              <h2 className="text-xl font-semibold mb-2">导入数据</h2>
              <p className="text-slate-500 mb-6">
                支持 Excel (.xlsx) 格式的资产、负债、投资、保险等数据
              </p>
              <button
                type="button"
                onClick={async () => {
                  const { open } = await import('@tauri-apps/plugin-dialog');
                  const selected = await open({
                    multiple: false,
                    filters: [{ name: 'Excel', extensions: ['xlsx', 'xls'] }],
                  });
                  if (selected) {
                    setWizardData({ filePath: selected as string });
                  }
                }}
                className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              >
                选择 Excel 文件
              </button>
            </div>
          ) : (
            <ExcelImportWizard
              filePath={wizardData.filePath}
              onComplete={() => setWizardData(null)}
              onCancel={() => setWizardData(null)}
            />
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
              <label className="block text-sm font-medium text-slate-700 mb-2">选择导出模块</label>
              <div className="flex items-center gap-4 mb-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={(e) => toggleAll(e.target.checked)}
                    className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                  />
                  <span className="text-sm text-slate-700 font-medium">全选/取消全选</span>
                </label>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {MODULE_OPTIONS.map((opt) => (
                  <label
                    key={opt.key}
                    className="flex items-center gap-2 p-3 rounded-lg border border-slate-200 hover:border-indigo-300 cursor-pointer transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={selectedModules.has(opt.key)}
                      onChange={() => toggleModule(opt.key)}
                      className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                    />
                    <span className="text-sm text-slate-700">{opt.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {selectedModules.has('transactions') && (
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
            )}

            {selectedModules.has('transactions') && (
              <>
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
                disabled={exporting || selectedModules.size === 0}
                className="w-full px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {exporting ? '导出中...' : '导出 Excel 文件'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
