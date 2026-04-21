import { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import {
  getAllAccounts,
  getHoldings,
  getInsurances,
  getTransactions,
  batchImportAccounts,
  batchImportHoldings,
  batchImportInsurances,
  batchImportTransactions,
} from '../lib/api';
import { detectModules, parseAndValidate } from '../lib/excel-schemas';
import type {
  ValidatedAccount,
  ValidatedHolding,
  ValidatedInsurance,
  ValidatedTransaction,
} from '../lib/excel-schemas';

interface Props {
  filePath: string;
  onComplete?: () => void;
  onCancel?: () => void;
}

type WizardStep = 'loading' | 'preview' | 'conflict' | 'confirm' | 'result';

type ConflictDecision = 'overwrite' | 'skip' | 'keepBoth';

interface ConflictItem {
  rowIndex: number;
  existing: Record<string, unknown>;
  incoming: Record<string, unknown>;
}

const MODULE_LABELS: Record<string, string> = {
  accounts: '账户',
  holdings: '持仓',
  insurances: '保险',
  transactions: '交易',
};

const STEP_LABELS = ['检测', '预览', '冲突', '确认', '完成'];

export default function ExcelImportWizard({ filePath, onComplete, onCancel }: Props) {
  const [step, setStep] = useState<WizardStep>('loading');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    success: number;
    failed: number;
    errors: string[];
    byModule: Record<string, { success: number; failed: number }>;
  } | null>(null);

  const [detectedModules, setDetectedModules] = useState<string[]>([]);
  const [parsedData, setParsedData] = useState<
    Record<string, { data: unknown[]; errors: { row: number; field: string; message: string }[] }>
  >({});

  const [conflictItems, setConflictItems] = useState<Record<string, ConflictItem[]>>({});
  const [conflictDecisions, setConflictDecisions] = useState<
    Record<string, Record<number, ConflictDecision>>
  >({});

  useEffect(() => {
    const loadFile = async () => {
      try {
        setLoading(true);
        const workbook = XLSX.readFile(filePath);
        const sheetNames = workbook.SheetNames;

        const modules = detectModules(sheetNames);
        if (modules.length === 0) {
          setError(
            '未检测到支持的模块。请确保 Excel 文件包含以下工作表之一：资产账户、负债账户、投资持仓、保险保单、交易记录'
          );
          setLoading(false);
          return;
        }

        setDetectedModules(modules);

        const s2m: Record<string, string> = {};
        const sheetNameToModule: Record<string, string> = {
          资产账户: 'accounts',
          负债账户: 'accounts',
          投资持仓: 'holdings',
          保险保单: 'insurances',
          交易记录: 'transactions',
          assets: 'accounts',
          liabilities: 'accounts',
          holdings: 'holdings',
          insurance: 'insurances',
          transactions: 'transactions',
        };
        for (const sn of sheetNames) {
          const m = sheetNameToModule[sn.trim().toLowerCase()];
          if (m) s2m[sn] = m;
        }

        const parsed: typeof parsedData = {};
        for (const module of modules) {
          const sheetName = sheetNames.find((sn) => s2m[sn] === module);
          if (!sheetName) continue;
          const rawData = XLSX.utils.sheet_to_json<Record<string, unknown>>(
            workbook.Sheets[sheetName]
          );
          const validated = parseAndValidate(module, rawData);
          parsed[module] = validated;
        }

        setParsedData(parsed);
        setStep('preview');
      } catch (e) {
        setError('读取 Excel 文件失败: ' + (e as Error).message);
      } finally {
        setLoading(false);
      }
    };

    loadFile();
  }, [filePath]);

  const detectConflicts = async () => {
    setLoading(true);
    setError(null);

    const conflicts: typeof conflictItems = {};
    const decisions: typeof conflictDecisions = {};

    try {
      for (const module of detectedModules) {
        const validated = parsedData[module];
        if (!validated || validated.data.length === 0) continue;

        if (module === 'accounts') {
          const existing = await getAllAccounts();
          const items: ConflictItem[] = [];
          for (let i = 0; i < validated.data.length; i++) {
            const incoming = validated.data[i] as ValidatedAccount;
            const match = existing.find(
              (e) =>
                (e.name === incoming.name ||
                  (e.name as unknown as string) === (incoming.name as unknown as string)) &&
                e.type === incoming.type
            );
            if (match) {
              items.push({
                rowIndex: i,
                existing: match as unknown as Record<string, unknown>,
                incoming: incoming as unknown as Record<string, unknown>,
              });
            }
          }
          if (items.length > 0) {
            conflicts[module] = items;
            decisions[module] = {};
            for (const item of items) {
              decisions[module][item.rowIndex] = 'skip';
            }
          }
        } else if (module === 'holdings') {
          const existing = await getHoldings({ includeArchived: true });
          const items: ConflictItem[] = [];
          for (let i = 0; i < validated.data.length; i++) {
            const incoming = validated.data[i] as ValidatedHolding;
            const match = existing.find(
              (e) =>
                e.symbol === incoming.symbol && String(e.account_id) === String(incoming.account_id)
            );
            if (match) {
              items.push({
                rowIndex: i,
                existing: match as unknown as Record<string, unknown>,
                incoming: incoming as unknown as Record<string, unknown>,
              });
            }
          }
          if (items.length > 0) {
            conflicts[module] = items;
            decisions[module] = {};
            for (const item of items) {
              decisions[module][item.rowIndex] = 'skip';
            }
          }
        } else if (module === 'insurances') {
          const existing = await getInsurances({});
          const items: ConflictItem[] = [];
          for (let i = 0; i < validated.data.length; i++) {
            const incoming = validated.data[i] as ValidatedInsurance;
            const match = existing.find(
              (e) =>
                e.name === incoming.name && (e.provider === incoming.company || !incoming.company)
            );
            if (match) {
              items.push({
                rowIndex: i,
                existing: match as unknown as Record<string, unknown>,
                incoming: incoming as unknown as Record<string, unknown>,
              });
            }
          }
          if (items.length > 0) {
            conflicts[module] = items;
            decisions[module] = {};
            for (const item of items) {
              decisions[module][item.rowIndex] = 'skip';
            }
          }
        } else if (module === 'transactions') {
          const existing = await getTransactions({});
          const items: ConflictItem[] = [];
          for (let i = 0; i < validated.data.length; i++) {
            const incoming = validated.data[i] as ValidatedTransaction;
            const match = existing.find(
              (e) =>
                e.account_id === incoming.account_id &&
                e.transaction_date === incoming.transaction_date &&
                Math.abs(e.amount - incoming.amount) < 0.01
            );
            if (match) {
              items.push({
                rowIndex: i,
                existing: match as unknown as Record<string, unknown>,
                incoming: incoming as unknown as Record<string, unknown>,
              });
            }
          }
          if (items.length > 0) {
            conflicts[module] = items;
            decisions[module] = {};
            for (const item of items) {
              decisions[module][item.rowIndex] = 'skip';
            }
          }
        }
      }

      setConflictItems(conflicts);
      setConflictDecisions(decisions);

      const hasConflicts = Object.keys(conflicts).length > 0;
      setStep(hasConflicts ? 'conflict' : 'confirm');
    } catch (e) {
      setError('冲突检测失败: ' + (e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const executeImport = async () => {
    setLoading(true);
    setError(null);

    const errors: string[] = [];
    let totalSuccess = 0;
    let totalFailed = 0;
    const byModule: Record<string, { success: number; failed: number }> = {};

    try {
      for (const module of detectedModules) {
        const validated = parsedData[module];
        if (!validated || validated.data.length === 0) continue;

        let moduleData = validated.data;
        const modConflicts = conflictItems[module] || [];
        const modDecisions = conflictDecisions[module] || {};

        const skipRows = new Set<number>();
        for (const item of modConflicts) {
          if (modDecisions[item.rowIndex] === 'skip') {
            skipRows.add(item.rowIndex);
          }
        }
        moduleData = moduleData.filter((_, idx) => !skipRows.has(idx));

        let res = { success: 0, failed: 0 };
        if (moduleData.length === 0) {
          res = { success: 0, failed: 0 };
        } else if (module === 'accounts') {
          try {
            const r = await batchImportAccounts(moduleData as ValidatedAccount[]);
            res = { success: r.success, failed: r.failed };
          } catch (e) {
            errors.push(`账户导入失败: ${(e as Error).message}`);
            res = { success: 0, failed: moduleData.length };
            totalSuccess += res.success;
            totalFailed += res.failed;
            byModule[module] = res;
            setResult({ success: totalSuccess, failed: totalFailed, errors, byModule });
            setStep('result');
            setLoading(false);
            return;
          }
        } else if (module === 'holdings') {
          try {
            const r = await batchImportHoldings(moduleData as ValidatedHolding[]);
            res = { success: r.success, failed: r.failed };
          } catch (e) {
            errors.push(`持仓导入失败: ${(e as Error).message}`);
            res = { success: 0, failed: moduleData.length };
            totalSuccess += res.success;
            totalFailed += res.failed;
            byModule[module] = res;
            setResult({ success: totalSuccess, failed: totalFailed, errors, byModule });
            setStep('result');
            setLoading(false);
            return;
          }
        } else if (module === 'insurances') {
          try {
            const r = await batchImportInsurances(moduleData as ValidatedInsurance[]);
            res = { success: r.success, failed: r.failed };
          } catch (e) {
            errors.push(`保险导入失败: ${(e as Error).message}`);
            res = { success: 0, failed: moduleData.length };
            totalSuccess += res.success;
            totalFailed += res.failed;
            byModule[module] = res;
            setResult({ success: totalSuccess, failed: totalFailed, errors, byModule });
            setStep('result');
            setLoading(false);
            return;
          }
        } else if (module === 'transactions') {
          try {
            const r = await batchImportTransactions(moduleData as ValidatedTransaction[]);
            res = { success: r.success, failed: r.failed };
          } catch (e) {
            errors.push(`交易导入失败: ${(e as Error).message}`);
            res = { success: 0, failed: moduleData.length };
            totalSuccess += res.success;
            totalFailed += res.failed;
            byModule[module] = res;
            setResult({ success: totalSuccess, failed: totalFailed, errors, byModule });
            setStep('result');
            setLoading(false);
            return;
          }
        }

        totalSuccess += res.success;
        totalFailed += res.failed;
        byModule[module] = res;
      }

      setResult({ success: totalSuccess, failed: totalFailed, errors, byModule });
      setStep('result');
    } catch (e) {
      setError('导入过程出错: ' + (e as Error).message);
      setLoading(false);
    } finally {
      setLoading(false);
    }
  };

  const handleConflictDecision = (module: string, rowIndex: number, decision: ConflictDecision) => {
    setConflictDecisions((prev) => ({
      ...prev,
      [module]: { ...prev[module], [rowIndex]: decision },
    }));
  };

  const handleBatchDecision = (module: string, decision: ConflictDecision) => {
    const items = conflictItems[module] || [];
    setConflictDecisions((prev) => ({
      ...prev,
      [module]: Object.fromEntries(items.map((i) => [i.rowIndex, decision])),
    }));
  };

  const renderStepIndicator = () => {
    const steps: WizardStep[] = ['loading', 'preview', 'conflict', 'confirm', 'result'];
    const currentIndex = steps.indexOf(step);

    return (
      <div className="mb-6">
        <div className="flex items-center gap-1">
          {steps.map((s, i) => (
            <div key={s} className="flex items-center">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium transition-colors ${
                  currentIndex >= i ? 'bg-amber-600 text-white' : 'bg-slate-700 text-slate-400'
                }`}
              >
                {i + 1}
              </div>
              {i < steps.length - 1 && (
                <div
                  className={`w-10 h-0.5 ${currentIndex > i ? 'bg-amber-600' : 'bg-slate-700'}`}
                />
              )}
            </div>
          ))}
        </div>
        <div className="flex justify-between mt-1 text-xs text-slate-400">
          {STEP_LABELS.map((label, i) => (
            <span key={i} style={{ marginLeft: i === 0 ? 0 : '4px' }}>
              {label}
            </span>
          ))}
        </div>
      </div>
    );
  };

  const renderLoading = () => (
    <div className="flex flex-col items-center justify-center py-12 gap-4">
      <div className="w-10 h-10 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
      <p className="text-slate-400">正在读取并分析 Excel 文件...</p>
    </div>
  );

  const renderPreview = () => (
    <div className="space-y-4">
      <div className="bg-slate-800 rounded-lg p-4">
        <h3 className="font-medium text-slate-100 mb-3">检测到的模块</h3>
        <div className="grid grid-cols-2 gap-3">
          {detectedModules.map((m) => {
            const v = parsedData[m];
            const total = v?.data.length || 0;
            const errCount = v?.errors.length || 0;
            return (
              <div key={m} className="bg-slate-700 rounded-lg p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-slate-100 font-medium">{MODULE_LABELS[m] || m}</span>
                  <span className="text-xs text-slate-400">{total} 行</span>
                </div>
                <div className="flex gap-2 text-xs">
                  {errCount > 0 ? (
                    <span className="text-rose-400">{errCount} 个错误</span>
                  ) : (
                    <span className="text-emerald-400">校验通过</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {detectedModules.map((m) => {
        const v = parsedData[m];
        if (!v || v.data.length === 0) return null;
        const preview = v.data.slice(0, 3);
        const keys = preview.length > 0 ? Object.keys(preview[0] as Record<string, unknown>) : [];

        return (
          <div key={m} className="bg-slate-800 rounded-lg p-4">
            <h4 className="font-medium text-slate-200 mb-2">{MODULE_LABELS[m] || m} — 预览</h4>
            <div className="overflow-x-auto">
              <table className="min-w-full text-xs">
                <thead>
                  <tr className="divide-x divide-slate-600">
                    {keys.slice(0, 6).map((k) => (
                      <th key={k} className="px-2 py-1 text-left text-slate-400 font-medium">
                        {k}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700">
                  {preview.map((row, i) => (
                    <tr key={i} className="divide-x divide-slate-600">
                      {keys.slice(0, 6).map((k) => (
                        <td key={k} className="px-2 py-1 text-slate-300 truncate max-w-xs">
                          {String((row as Record<string, unknown>)[k] ?? '')}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {v.errors.length > 0 && (
              <div className="mt-2 text-xs text-rose-400">
                前 3 条错误:{' '}
                {v.errors
                  .slice(0, 3)
                  .map((e) => `行${e.row} ${e.field}: ${e.message}`)
                  .join(' | ')}
              </div>
            )}
          </div>
        );
      })}

      <div className="flex justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-slate-300 bg-slate-700 rounded-lg hover:bg-slate-600 transition-colors"
        >
          取消
        </button>
        <button
          type="button"
          onClick={detectConflicts}
          disabled={loading}
          className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-500 transition-colors disabled:opacity-50"
        >
          {loading ? '检测中...' : '下一步'}
        </button>
      </div>
    </div>
  );

  const renderConflict = () => (
    <div className="space-y-4">
      <div className="bg-amber-900/20 border border-amber-700/40 rounded-lg p-4 text-amber-300 text-sm">
        检测到 {Object.values(conflictItems).reduce((a, b) => a + b.length, 0)} 条冲突记录。
        请选择处理方式：<strong>覆盖</strong> 用导入数据替换现有记录，<strong>跳过</strong>{' '}
        保留现有数据，
        <strong>保留两者</strong> 同时添加新记录。
      </div>

      {Object.entries(conflictItems).map(([module, items]) => {
        const totalConflicts = items.length;
        const skipCount = Object.values(conflictDecisions[module] || {}).filter(
          (d) => d === 'skip'
        ).length;
        const overwriteCount = Object.values(conflictDecisions[module] || {}).filter(
          (d) => d === 'overwrite'
        ).length;
        const keepBothCount = totalConflicts - skipCount - overwriteCount;

        return (
          <div key={module} className="bg-slate-800 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium text-slate-100">
                {MODULE_LABELS[module] || module} — {totalConflicts} 条冲突
              </h4>
              <div className="flex gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => handleBatchDecision(module, 'overwrite')}
                  className="px-2 py-1 bg-rose-700 text-rose-200 rounded hover:bg-rose-600 transition-colors"
                >
                  全选覆盖 ({overwriteCount})
                </button>
                <button
                  type="button"
                  onClick={() => handleBatchDecision(module, 'skip')}
                  className="px-2 py-1 bg-slate-600 text-slate-200 rounded hover:bg-slate-500 transition-colors"
                >
                  全选跳过 ({skipCount})
                </button>
                <button
                  type="button"
                  onClick={() => handleBatchDecision(module, 'keepBoth')}
                  className="px-2 py-1 bg-emerald-700 text-emerald-200 rounded hover:bg-emerald-600 transition-colors"
                >
                  全选保留 ({keepBothCount})
                </button>
              </div>
            </div>

            <div className="space-y-2 max-h-64 overflow-y-auto">
              {items.map((item) => {
                const decision = conflictDecisions[module]?.[item.rowIndex] || 'skip';
                return (
                  <div key={item.rowIndex} className="bg-slate-700 rounded-lg p-3 text-xs">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-slate-400">行 {item.rowIndex + 1}</span>
                      <div className="flex gap-1">
                        {(['overwrite', 'skip', 'keepBoth'] as ConflictDecision[]).map((d) => (
                          <button
                            key={d}
                            type="button"
                            onClick={() => handleConflictDecision(module, item.rowIndex, d)}
                            className={`px-2 py-0.5 rounded transition-colors ${
                              decision === d
                                ? d === 'overwrite'
                                  ? 'bg-rose-600 text-white'
                                  : d === 'skip'
                                    ? 'bg-slate-500 text-white'
                                    : 'bg-emerald-600 text-white'
                                : 'bg-slate-600 text-slate-300 hover:bg-slate-500'
                            }`}
                          >
                            {d === 'overwrite' ? '覆盖' : d === 'skip' ? '跳过' : '保留两者'}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-slate-800 rounded p-2">
                        <div className="text-slate-500 mb-1">现有数据</div>
                        <div className="text-slate-300 space-y-0.5">
                          {Object.entries(item.existing)
                            .slice(0, 4)
                            .map(([k, v]) => (
                              <div key={k}>
                                <span className="text-slate-500">{k}:</span> {String(v)}
                              </div>
                            ))}
                        </div>
                      </div>
                      <div className="bg-slate-800 rounded p-2">
                        <div className="text-slate-500 mb-1">导入数据</div>
                        <div className="text-slate-300 space-y-0.5">
                          {Object.entries(item.incoming)
                            .slice(0, 4)
                            .map(([k, v]) => (
                              <div key={k}>
                                <span className="text-slate-500">{k}:</span> {String(v)}
                              </div>
                            ))}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      <div className="flex justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={() => setStep('preview')}
          className="px-4 py-2 text-slate-300 bg-slate-700 rounded-lg hover:bg-slate-600 transition-colors"
        >
          上一步
        </button>
        <button
          type="button"
          onClick={() => setStep('confirm')}
          disabled={loading}
          className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-500 transition-colors disabled:opacity-50"
        >
          下一步
        </button>
      </div>
    </div>
  );

  const renderConfirm = () => {
    const totalRows = detectedModules.reduce(
      (sum, m) => sum + (parsedData[m]?.data.length || 0),
      0
    );
    const totalErrors = detectedModules.reduce(
      (sum, m) => sum + (parsedData[m]?.errors.length || 0),
      0
    );
    const totalConflicts = Object.values(conflictItems).reduce((a, b) => a + b.length, 0);
    const totalSkipped = Object.values(conflictDecisions).reduce(
      (sum, modDec) => sum + Object.values(modDec).filter((d) => d === 'skip').length,
      0
    );

    return (
      <div className="space-y-4">
        <div className="bg-slate-800 rounded-lg p-6">
          <h3 className="font-medium text-slate-100 mb-4">确认导入</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-400">检测模块：</span>
              <span className="text-slate-200">
                {detectedModules.map((m) => MODULE_LABELS[m] || m).join('、')}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">数据行数：</span>
              <span className="text-slate-200">{totalRows} 行</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">校验错误：</span>
              <span className={totalErrors > 0 ? 'text-rose-400' : 'text-emerald-400'}>
                {totalErrors > 0 ? `${totalErrors} 个` : '无'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">冲突记录：</span>
              <span className={totalConflicts > 0 ? 'text-amber-400' : 'text-slate-200'}>
                {totalConflicts > 0 ? `${totalConflicts} 条` : '无'}
              </span>
            </div>
            {totalSkipped > 0 && (
              <div className="flex justify-between">
                <span className="text-slate-400">将跳过：</span>
                <span className="text-amber-400">{totalSkipped} 条冲突记录</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={() => setStep(Object.keys(conflictItems).length > 0 ? 'conflict' : 'preview')}
            className="px-4 py-2 text-slate-300 bg-slate-700 rounded-lg hover:bg-slate-600 transition-colors"
          >
            上一步
          </button>
          <button
            type="button"
            onClick={executeImport}
            disabled={loading}
            className="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 transition-colors disabled:opacity-50 font-medium"
          >
            {loading ? '导入中...' : '开始导入'}
          </button>
        </div>
      </div>
    );
  };

  const renderResult = () => (
    <div className="space-y-4">
      <div
        className={`rounded-lg p-6 ${result && result.failed === 0 ? 'bg-emerald-900/20 border border-emerald-700/40' : result && result.success === 0 ? 'bg-rose-900/20 border border-rose-700/40' : 'bg-amber-900/20 border border-amber-700/40'}`}
      >
        <div className="flex items-center gap-3 mb-4">
          <span className="text-3xl">
            {result && result.failed === 0 ? '✅' : result && result.success === 0 ? '❌' : '⚠️'}
          </span>
          <div>
            <h3 className="font-medium text-lg text-slate-100">
              {result && result.failed === 0
                ? '导入完成'
                : result && result.success === 0
                  ? '导入失败'
                  : '导入完成（部分失败）'}
            </h3>
            <p className="text-sm text-slate-400">
              成功 {result?.success} 条，失败 {result?.failed} 条
            </p>
          </div>
        </div>

        {Object.entries(result?.byModule || {}).length > 0 && (
          <div className="grid grid-cols-2 gap-2 mb-3">
            {Object.entries(result!.byModule).map(([m, r]) => (
              <div key={m} className="bg-slate-800/50 rounded p-2 text-xs">
                <span className="text-slate-400">{MODULE_LABELS[m] || m}: </span>
                <span className="text-emerald-400">{r.success} 成功</span>
                {r.failed > 0 && <span className="text-rose-400 ml-1">{r.failed} 失败</span>}
              </div>
            ))}
          </div>
        )}

        {result?.errors && result.errors.length > 0 && (
          <div>
            <h4 className="font-medium text-sm text-rose-300 mb-1">错误详情：</h4>
            <ul className="text-xs text-rose-400/80 space-y-0.5 max-h-32 overflow-y-auto">
              {result.errors.map((err, i) => (
                <li key={i}>{err}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={onComplete}
          className="px-6 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-500 transition-colors font-medium"
        >
          完成
        </button>
      </div>
    </div>
  );

  const renderStep = () => {
    switch (step) {
      case 'loading':
        return renderLoading();
      case 'preview':
        return renderPreview();
      case 'conflict':
        return renderConflict();
      case 'confirm':
        return renderConfirm();
      case 'result':
        return renderResult();
      default:
        return null;
    }
  };

  return (
    <div className="bg-slate-900 rounded-xl shadow-sm border border-slate-700">
      <div className="px-6 py-4 border-b border-slate-700 flex items-center justify-between">
        <h2 className="font-semibold text-lg text-slate-100">Excel 导入向导</h2>
        {step !== 'result' && step !== 'loading' && (
          <button
            type="button"
            onClick={onCancel}
            className="text-slate-400 hover:text-slate-200 transition-colors"
          >
            ✕
          </button>
        )}
      </div>

      <div className="p-6">
        {error && (
          <div className="mb-4 p-4 bg-rose-900/30 border border-rose-700/50 rounded-lg text-rose-300 text-sm">
            {error}
          </div>
        )}

        {step !== 'loading' && renderStepIndicator()}
        {renderStep()}
      </div>
    </div>
  );
}
