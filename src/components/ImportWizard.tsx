import { useState, useRef, useCallback } from 'react';
import {
  getAllAccounts,
  batchCreateTransactions,
  Account,
  Transaction,
  TransactionType,
  AccountCategory,
} from '../lib/api';

interface ColumnMapping {
  date: string | null;
  description: string | null;
  amount: string | null;
  category: string | null;
  account: string | null;
  type: string | null;
}

interface ParsedRow {
  [key: string]: string;
}

interface ImportResult {
  success: boolean;
  imported: number;
  failed: number;
  errors: string[];
}

type WizardStep = 'select' | 'preview' | 'mapping' | 'confirm' | 'result';

export default function ImportWizard({
  onComplete: _onComplete,
  onCancel,
}: {
  onComplete?: (result: ImportResult) => void;
  onCancel?: () => void;
}) {
  const [step, setStep] = useState<WizardStep>('select');
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ParsedRow[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<ColumnMapping>({
    date: null,
    description: null,
    amount: null,
    category: null,
    account: null,
    type: null,
  });
  const [targetAccountId, setTargetAccountId] = useState<number | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [_categories, _setCategories] = useState<AccountCategory[]>([]);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadAccounts = useCallback(async () => {
    const accs = await getAllAccounts();
    setAccounts(accs);
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (!selectedFile.name.endsWith('.csv')) {
      setError('请选择 CSV 文件');
      return;
    }

    setFile(selectedFile);
    setError(null);

    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      const lines = text.split('\n').filter((line) => line.trim());

      if (lines.length < 2) {
        setError('CSV 文件内容为空或格式不正确');
        return;
      }

      const headerLine = lines[0];
      const parsedHeaders = parseCSVLine(headerLine);
      setHeaders(parsedHeaders);

      const rows: ParsedRow[] = [];
      for (let i = 1; i < lines.length; i++) {
        const values = parseCSVLine(lines[i]);
        const row: ParsedRow = {};
        parsedHeaders.forEach((header, idx) => {
          row[header] = values[idx] || '';
        });
        rows.push(row);
      }

      setParsedData(rows);
      await loadAccounts();
      setStep('preview');
    };

    reader.readAsText(selectedFile);
  };

  const parseCSVLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  };

  const handleMappingChange = (field: keyof ColumnMapping, value: string | null) => {
    setMapping((prev) => ({ ...prev, [field]: value }));
  };

  const isMappingValid = () => {
    return mapping.date && mapping.description && mapping.amount && targetAccountId;
  };

  const handlePreview = () => {
    if (!isMappingValid()) {
      setError('请至少映射日期、描述、金额字段，并选择目标账户');
      return;
    }
    setError(null);
    setStep('mapping');
  };

  const handleImport = async () => {
    if (!isMappingValid()) return;

    setImporting(true);
    setError(null);

    const errors: string[] = [];
    let imported = 0;
    let failed = 0;

    const transactions: Omit<Transaction, 'id' | 'created_at' | 'updated_at' | 'is_active'>[] = [];

    for (let i = 0; i < parsedData.length; i++) {
      const row = parsedData[i];
      try {
        const dateValue = row[mapping.date!];
        const descValue = row[mapping.description!];
        const amountValue = row[mapping.amount!];

        if (!dateValue || !amountValue) {
          errors.push(`行 ${i + 2}: 日期或金额为空`);
          failed++;
          continue;
        }

        const amount = parseFloat(amountValue.replace(/[^\d.-]/g, ''));
        if (isNaN(amount)) {
          errors.push(`行 ${i + 2}: 金额格式无效`);
          failed++;
          continue;
        }

        const dateParts = dateValue.split(/[-/]/);
        if (dateParts.length !== 3) {
          errors.push(`行 ${i + 2}: 日期格式无效`);
          failed++;
          continue;
        }
        const formattedDate = `${dateParts[0]}-${dateParts[1].padStart(2, '0')}-${dateParts[2].padStart(2, '0')}`;

        let transactionType: TransactionType = 'expense';
        if (mapping.type && row[mapping.type]) {
          const typeValue = row[mapping.type].toLowerCase();
          if (typeValue.includes('收入') || typeValue.includes('转入')) {
            transactionType = 'income';
          } else if (typeValue.includes('转账') || typeValue.includes('转出')) {
            transactionType = 'transfer';
          }
        } else if (amount > 0) {
          transactionType = 'income';
        }

        transactions.push({
          account_id: targetAccountId!,
          transaction_type: transactionType,
          amount: Math.abs(amount),
          balance_after: null,
          counterparty_id: null,
          transaction_date: formattedDate,
          description: descValue || null,
          category_id: null,
          template_id: null,
          reference_no: null,
          attach_path: null,
        });

        imported++;
      } catch (e) {
        errors.push(`行 ${i + 2}: 处理失败`);
        failed++;
      }
    }

    try {
      await batchCreateTransactions(transactions);
      setResult({ success: true, imported, failed, errors: errors.slice(0, 10) });
      setStep('result');
    } catch (e) {
      setError('导入失败: ' + (e as Error).message);
    } finally {
      setImporting(false);
    }
  };

  const handleCancel = () => {
    setFile(null);
    setParsedData([]);
    setHeaders([]);
    setMapping({
      date: null,
      description: null,
      amount: null,
      category: null,
      account: null,
      type: null,
    });
    setTargetAccountId(null);
    setResult(null);
    setStep('select');
    setError(null);
    onCancel?.();
  };

  const renderStep = () => {
    switch (step) {
      case 'select':
        return (
          <div className="space-y-4">
            <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center hover:border-indigo-400 transition-colors">
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileSelect}
                className="hidden"
              />
              <div className="text-4xl mb-4">📄</div>
              <p className="text-slate-700 mb-2">点击选择 CSV 文件</p>
              <p className="text-sm text-slate-400">支持银行账单、券商对账单等 CSV 格式</p>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 transition-colors"
              >
                选择文件
              </button>
            </div>
          </div>
        );

      case 'preview':
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{file?.name}</p>
                <p className="text-sm text-slate-500">共 {parsedData.length} 行数据</p>
              </div>
              <button
                type="button"
                onClick={() => setStep('select')}
                className="text-sm text-slate-500 hover:text-slate-700"
              >
                重新选择
              </button>
            </div>

            <div className="overflow-x-auto border rounded-lg">
              <table className="min-w-full text-sm">
                <thead className="bg-white">
                  <tr>
                    {headers.map((h) => (
                      <th key={h} className="px-3 py-2 text-left font-medium text-slate-600">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {parsedData.slice(0, 5).map((row, i) => (
                    <tr key={i}>
                      {headers.map((h) => (
                        <td key={h} className="px-3 py-2 text-slate-700 truncate max-w-xs">
                          {row[h]}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {parsedData.length > 5 && (
              <p className="text-sm text-slate-500 text-center">
                显示前 5 行，共 {parsedData.length} 行...
              </p>
            )}

            <div className="border rounded-lg p-4">
              <h3 className="font-medium mb-3">选择目标账户 *</h3>
              <select
                value={targetAccountId || ''}
                onChange={(e) => setTargetAccountId(e.target.value ? Number(e.target.value) : null)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-300 focus:border-transparent bg-white"
              >
                <option value="">请选择账户</option>
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={handleCancel}
                className="px-4 py-2 text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handlePreview}
                disabled={!targetAccountId}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 transition-colors disabled:opacity-50"
              >
                下一步
              </button>
            </div>
          </div>
        );

      case 'mapping':
        return (
          <div className="space-y-4">
            <h3 className="font-medium">字段映射</h3>
            <p className="text-sm text-slate-500">将 CSV 列映射到交易记录字段</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="map_date" className="block text-sm font-medium text-slate-700 mb-1">
                  日期列 *
                </label>
                <select
                  id="map_date"
                  value={mapping.date || ''}
                  onChange={(e) => handleMappingChange('date', e.target.value || null)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-300 focus:border-transparent bg-white"
                >
                  <option value="">选择列</option>
                  {headers.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="map_description"
                  className="block text-sm font-medium text-slate-700 mb-1"
                >
                  描述列 *
                </label>
                <select
                  id="map_description"
                  value={mapping.description || ''}
                  onChange={(e) => handleMappingChange('description', e.target.value || null)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-300 focus:border-transparent bg-white"
                >
                  <option value="">选择列</option>
                  {headers.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="map_amount"
                  className="block text-sm font-medium text-slate-700 mb-1"
                >
                  金额列 *
                </label>
                <select
                  id="map_amount"
                  value={mapping.amount || ''}
                  onChange={(e) => handleMappingChange('amount', e.target.value || null)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-300 focus:border-transparent bg-white"
                >
                  <option value="">选择列</option>
                  {headers.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="map_type" className="block text-sm font-medium text-slate-700 mb-1">
                  类型列（可选）
                </label>
                <select
                  id="map_type"
                  value={mapping.type || ''}
                  onChange={(e) => handleMappingChange('type', e.target.value || null)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-300 focus:border-transparent bg-white"
                >
                  <option value="">不使用类型列（自动判断）</option>
                  {headers.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
              <h4 className="font-medium text-indigo-800 mb-2">导入预览</h4>
              <p className="text-sm text-indigo-600">
                将导入 {parsedData.length} 笔交易到账户：
                {accounts.find((a) => a.id === targetAccountId)?.name}
              </p>
            </div>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setStep('preview')}
                className="px-4 py-2 text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
              >
                上一步
              </button>
              <button
                type="button"
                onClick={() => setStep('confirm')}
                disabled={!isMappingValid()}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 transition-colors disabled:opacity-50"
              >
                确认映射
              </button>
            </div>
          </div>
        );

      case 'confirm':
        return (
          <div className="space-y-4">
            <div className="bg-white border border-slate-200 rounded-lg p-6">
              <h3 className="font-medium mb-4">确认导入</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-600">文件：</span>
                  <span className="font-medium">{file?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">目标账户：</span>
                  <span className="font-medium">
                    {accounts.find((a) => a.id === targetAccountId)?.name}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">数据行数：</span>
                  <span className="font-medium">{parsedData.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">日期列：</span>
                  <span className="font-medium">{mapping.date}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">描述列：</span>
                  <span className="font-medium">{mapping.description}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">金额列：</span>
                  <span className="font-medium">{mapping.amount}</span>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setStep('mapping')}
                className="px-4 py-2 text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
              >
                上一步
              </button>
              <button
                type="button"
                onClick={handleImport}
                disabled={importing}
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 transition-colors disabled:opacity-50"
              >
                {importing ? '导入中...' : '确认导入'}
              </button>
            </div>
          </div>
        );

      case 'result':
        return (
          <div className="space-y-4">
            <div className={`rounded-lg p-6 ${result?.success ? 'bg-emerald-50' : 'bg-red-50'}`}>
              <div className="flex items-center gap-3 mb-4">
                <span className="text-3xl">{result?.success ? '✅' : '❌'}</span>
                <div>
                  <h3 className="font-medium text-lg">
                    {result?.success ? '导入完成' : '导入失败'}
                  </h3>
                  <p className="text-sm text-slate-600">
                    成功导入 {result?.imported} 笔，失败 {result?.failed} 笔
                  </p>
                </div>
              </div>

              {result?.errors && result.errors.length > 0 && (
                <div className="mt-4">
                  <h4 className="font-medium text-sm mb-2">错误详情：</h4>
                  <ul className="text-sm text-red-600 space-y-1 max-h-40 overflow-y-auto">
                    {result.errors.map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={handleCancel}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 transition-colors"
              >
                完成
              </button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200">
      <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
        <h2 className="font-semibold text-lg">CSV 导入向导</h2>
        {step !== 'result' && (
          <button
            type="button"
            onClick={handleCancel}
            className="text-slate-400 hover:text-slate-600"
          >
            ✕
          </button>
        )}
      </div>

      <div className="p-6">
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        <div className="mb-4">
          <div className="flex items-center gap-2">
            {['select', 'preview', 'mapping', 'confirm', 'result'].map((s, i) => (
              <div key={s} className="flex items-center">
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                    ['select', 'preview', 'mapping', 'confirm', 'result'].indexOf(step) >= i
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {i + 1}
                </div>
                {i < 4 && (
                  <div
                    className={`w-8 h-0.5 ${
                      ['select', 'preview', 'mapping', 'confirm', 'result'].indexOf(step) > i
                        ? 'bg-indigo-600'
                        : 'bg-slate-200'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-1 text-xs text-slate-500">
            <span>选择文件</span>
            <span>预览</span>
            <span>映射</span>
            <span>确认</span>
            <span>完成</span>
          </div>
        </div>

        {renderStep()}
      </div>
    </div>
  );
}
