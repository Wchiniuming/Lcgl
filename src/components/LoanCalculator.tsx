import { useState } from 'react';

interface AmortizationRow {
  month: number;
  payment: number;
  principal: number;
  interest: number;
  balance: number;
}

interface LoanCalcInputs {
  principal: string;
  rate: string;
  termMonths: string;
}

interface LoanCalcResults {
  monthlyPayment: number;
  totalInterest: number;
  totalPayment: number;
  schedule: AmortizationRow[];
}

function IconCalculator() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-label="计算器"
    >
      <rect x="4" y="2" width="16" height="20" rx="2" />
      <line x1="8" y1="6" x2="16" y2="6" />
      <line x1="8" y1="10" x2="10" y2="10" />
      <line x1="12" y1="10" x2="14" y2="10" />
      <line x1="16" y1="10" x2="16" y2="10" />
      <line x1="8" y1="14" x2="10" y2="14" />
      <line x1="12" y1="14" x2="14" y2="14" />
      <line x1="16" y1="14" x2="16" y2="14" />
      <line x1="8" y1="18" x2="10" y2="18" />
      <line x1="12" y1="18" x2="16" y2="18" />
    </svg>
  );
}

function IconChevronDown() {
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
      aria-label="展开"
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

function IconChevronUp() {
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
      aria-label="收起"
    >
      <polyline points="18 15 12 9 6 15" />
    </svg>
  );
}

export default function LoanCalculator() {
  const [inputs, setInputs] = useState<LoanCalcInputs>({
    principal: '',
    rate: '',
    termMonths: '',
  });
  const [errors, setErrors] = useState<Partial<LoanCalcInputs>>({});
  const [results, setResults] = useState<LoanCalcResults | null>(null);
  const [showSchedule, setShowSchedule] = useState(false);

  function validate(): boolean {
    const newErrors: Partial<LoanCalcInputs> = {};
    const p = parseFloat(inputs.principal);
    const r = parseFloat(inputs.rate);
    const t = parseInt(inputs.termMonths);
    if (!inputs.principal || p <= 0) newErrors.principal = '请输入有效的贷款本金';
    if (!inputs.rate || r <= 0 || r > 100) newErrors.rate = '请输入有效的年利率 (0.1-100)';
    if (!inputs.termMonths || t <= 0 || t > 600)
      newErrors.termMonths = '请输入有效的贷款期限 (1-600个月)';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  function calculate() {
    if (!validate()) return;
    const P = parseFloat(inputs.principal);
    const annualRate = parseFloat(inputs.rate) / 100;
    const r = annualRate / 12;
    const n = parseInt(inputs.termMonths);

    let monthlyPayment: number;
    if (r === 0) {
      monthlyPayment = P / n;
    } else {
      monthlyPayment = (P * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
    }

    const totalPayment = monthlyPayment * n;
    const totalInterest = totalPayment - P;

    const schedule: AmortizationRow[] = [];
    let balance = P;
    for (let month = 1; month <= n; month++) {
      const interestPayment = balance * r;
      const principalPayment = monthlyPayment - interestPayment;
      balance = Math.max(0, balance - principalPayment);
      schedule.push({
        month,
        payment: monthlyPayment,
        principal: principalPayment,
        interest: interestPayment,
        balance,
      });
    }

    setResults({ monthlyPayment, totalInterest, totalPayment, schedule });
  }

  function formatCurrency(val: number): string {
    return val.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="flex items-center gap-2.5 px-5 py-4 bg-gradient-to-r from-indigo-600 to-indigo-500">
        <span className="text-slate-400">
          <IconCalculator />
        </span>
        <h3 className="text-white font-semibold text-sm">贷款计算器</h3>
      </div>

      <div className="p-5 space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label htmlFor="lc-principal" className="block text-xs font-medium text-slate-500 mb-1">
              贷款本金 (元)
            </label>
            <input
              id="lc-principal"
              type="number"
              step="0.01"
              value={inputs.principal}
              onChange={(e) => setInputs({ ...inputs, principal: e.target.value })}
              placeholder="500000"
              className={`w-full px-3 py-2 rounded-lg border text-sm transition-all placeholder:text-slate-400
                ${
                  errors.principal
                    ? 'border-red-400 bg-red-50 focus:ring-2 focus:ring-red-300'
                    : 'border-slate-200 bg-slate-50 focus:ring-2 focus:ring-slate-300 hover:border-slate-300'
                } focus:outline-none`}
            />
            {errors.principal && <p className="mt-0.5 text-xs text-red-500">{errors.principal}</p>}
          </div>

          <div>
            <label htmlFor="lc-rate" className="block text-xs font-medium text-slate-500 mb-1">
              年利率 (%)
            </label>
            <input
              id="lc-rate"
              type="number"
              step="0.001"
              value={inputs.rate}
              onChange={(e) => setInputs({ ...inputs, rate: e.target.value })}
              placeholder="4.9"
              className={`w-full px-3 py-2 rounded-lg border text-sm transition-all placeholder:text-slate-400
                ${
                  errors.rate
                    ? 'border-red-400 bg-red-50 focus:ring-2 focus:ring-red-300'
                    : 'border-slate-200 bg-slate-50 focus:ring-2 focus:ring-slate-300 hover:border-slate-300'
                } focus:outline-none`}
            />
            {errors.rate && <p className="mt-0.5 text-xs text-red-500">{errors.rate}</p>}
          </div>

          <div>
            <label htmlFor="lc-term" className="block text-xs font-medium text-slate-500 mb-1">
              贷款期限 (月)
            </label>
            <input
              id="lc-term"
              type="number"
              value={inputs.termMonths}
              onChange={(e) => setInputs({ ...inputs, termMonths: e.target.value })}
              placeholder="360"
              className={`w-full px-3 py-2 rounded-lg border text-sm transition-all placeholder:text-slate-400
                ${
                  errors.termMonths
                    ? 'border-red-400 bg-red-50 focus:ring-2 focus:ring-red-300'
                    : 'border-slate-200 bg-slate-50 focus:ring-2 focus:ring-slate-300 hover:border-slate-300'
                } focus:outline-none`}
            />
            {errors.termMonths && (
              <p className="mt-0.5 text-xs text-red-500">{errors.termMonths}</p>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={calculate}
          className="w-full px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 text-white text-sm font-medium hover:from-amber-700 hover:to-amber-600 transition-all shadow-sm shadow-amber-200"
        >
          计算月供
        </button>

        {results && (
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-xl p-3.5 border border-emerald-200">
                <p className="text-xs text-emerald-600 font-medium mb-1">月供</p>
                <p className="text-lg font-bold text-emerald-700">
                  ¥{formatCurrency(results.monthlyPayment)}
                </p>
              </div>
              <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-xl p-3.5 border border-red-200">
                <p className="text-xs text-red-600 font-medium mb-1">总利息</p>
                <p className="text-lg font-bold text-red-700">
                  ¥{formatCurrency(results.totalInterest)}
                </p>
              </div>
              <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl p-3.5 border border-slate-200">
                <p className="text-xs text-slate-600 font-medium mb-1">还款总额</p>
                <p className="text-lg font-bold text-slate-700">
                  ¥{formatCurrency(results.totalPayment)}
                </p>
              </div>
            </div>

            <div>
              <button
                type="button"
                onClick={() => setShowSchedule(!showSchedule)}
                className="flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-800 transition-colors"
              >
                <span>{showSchedule ? <IconChevronUp /> : <IconChevronDown />}</span>
                <span>{showSchedule ? '收起' : '查看'}还款计划表</span>
                <span className="text-xs text-slate-400">({results.schedule.length}期)</span>
              </button>

              {showSchedule && (
                <div className="mt-3 rounded-xl border border-slate-200 overflow-hidden overflow-y-auto max-h-64">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-50 sticky top-0">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium text-slate-600">期数</th>
                        <th className="px-3 py-2 text-right font-medium text-slate-600">月供</th>
                        <th className="px-3 py-2 text-right font-medium text-slate-600">本金</th>
                        <th className="px-3 py-2 text-right font-medium text-slate-600">利息</th>
                        <th className="px-3 py-2 text-right font-medium text-slate-600">余额</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {results.schedule.map((row) => (
                        <tr key={row.month} className="hover:bg-slate-50 transition-colors">
                          <td className="px-3 py-1.5 text-slate-700">{row.month}</td>
                          <td className="px-3 py-1.5 text-right text-slate-600">
                            ¥{formatCurrency(row.payment)}
                          </td>
                          <td className="px-3 py-1.5 text-right text-emerald-600">
                            ¥{formatCurrency(row.principal)}
                          </td>
                          <td className="px-3 py-1.5 text-right text-red-500">
                            ¥{formatCurrency(row.interest)}
                          </td>
                          <td className="px-3 py-1.5 text-right text-slate-600">
                            ¥{formatCurrency(row.balance)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
