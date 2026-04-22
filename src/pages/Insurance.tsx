import { useState, useEffect, useMemo } from 'react';
import { ask } from '@tauri-apps/plugin-dialog';
import {
  getInsurances,
  createInsurance,
  updateInsurance,
  deleteInsurance,
  Insurance,
  InsuranceType,
  InsuranceStatus,
  PremiumFrequency,
} from '../lib/api';

const INSURANCE_TYPE_LABELS: Record<InsuranceType, string> = {
  life: '寿险',
  health: '医疗险',
  accident: '意外险',
  critical: '重疾险',
  car: '车险',
  annuity: '年金险',
  other: '其他',
};

const INSURANCE_TYPE_COLORS: Record<InsuranceType, string> = {
  life: 'bg-blue-100 text-blue-700',
  health: 'bg-green-100 text-green-700',
  accident: 'bg-orange-100 text-orange-700',
  critical: 'bg-purple-100 text-purple-700',
  car: 'bg-gray-100 text-gray-700',
  annuity: 'bg-yellow-100 text-yellow-700',
  other: 'bg-slate-100 text-slate-700',
};

const STATUS_LABELS: Record<InsuranceStatus, string> = {
  active: '生效中',
  expired: '已失效',
  surrendered: '已退保',
  claimed: '已理赔',
};

const PREMIUM_FREQUENCY_LABELS: Record<PremiumFrequency, string> = {
  yearly: '年缴',
  monthly: '月缴',
  quarterly: '季缴',
};

interface InsuranceFormData {
  name: string;
  insurance_type: InsuranceType;
  provider: string;
  policy_no: string;
  holder_name: string;
  insured_name: string;
  beneficiary: string;
  premium: string;
  premium_frequency: PremiumFrequency | '';
  coverage_amount: string;
  coverage_type: string;
  coverage_detail: string;
  start_date: string;
  renewal_date: string;
  end_date: string;
  status: InsuranceStatus;
  notes: string;
  is_renewal_reminder: boolean;
}

const initialFormData: InsuranceFormData = {
  name: '',
  insurance_type: 'health',
  provider: '',
  policy_no: '',
  holder_name: '',
  insured_name: '',
  beneficiary: '',
  premium: '',
  premium_frequency: 'yearly',
  coverage_amount: '',
  coverage_type: '',
  coverage_detail: '',
  start_date: '',
  renewal_date: '',
  end_date: '',
  status: 'active',
  notes: '',
  is_renewal_reminder: true,
};

export default function InsurancePage() {
  const [insurances, setInsurances] = useState<Insurance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<InsuranceFormData>(initialFormData);
  const [saving, setSaving] = useState(false);
  const [filterType, setFilterType] = useState<string>('');

  const stats = useMemo(() => {
    const active = insurances.filter((i) => i.status === 'active');
    const yearlyPremium = active.reduce((sum, i) => {
      if (i.premium_frequency === 'monthly') return sum + i.premium * 12;
      if (i.premium_frequency === 'quarterly') return sum + i.premium * 4;
      return sum + i.premium;
    }, 0);
    const totalCoverage = active.reduce((sum, i) => sum + i.coverage_amount, 0);
    const renewalSoon = active.filter((i) => {
      if (!i.renewal_date) return false;
      const days = Math.ceil(
        (new Date(i.renewal_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );
      return days > 0 && days <= 30;
    }).length;
    return {
      total: active.length,
      yearlyPremium,
      totalCoverage,
      renewalSoon,
    };
  }, [insurances]);

  const filteredInsurances = useMemo(() => {
    if (!filterType) return insurances;
    return insurances.filter((i) => i.insurance_type === filterType);
  }, [insurances, filterType]);

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await getInsurances({});
      setInsurances(data);
      setError(null);
    } catch (e) {
      setError('加载数据失败');
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenForm = (insurance?: Insurance) => {
    if (insurance) {
      setEditingId(insurance.id);
      setFormData({
        name: insurance.name,
        insurance_type: insurance.insurance_type,
        provider: insurance.provider || '',
        policy_no: insurance.policy_no || '',
        holder_name: insurance.holder_name || '',
        insured_name: insurance.insured_name || '',
        beneficiary: insurance.beneficiary || '',
        premium: insurance.premium.toString(),
        premium_frequency: insurance.premium_frequency || '',
        coverage_amount: insurance.coverage_amount.toString(),
        coverage_type: insurance.coverage_type || '',
        coverage_detail: insurance.coverage_detail || '',
        start_date: insurance.start_date || '',
        renewal_date: insurance.renewal_date || '',
        end_date: insurance.end_date || '',
        status: insurance.status,
        notes: insurance.notes || '',
        is_renewal_reminder: insurance.is_renewal_reminder,
      });
    } else {
      setEditingId(null);
      setFormData(initialFormData);
    }
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingId(null);
    setFormData(initialFormData);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      setError('请输入保险名称');
      return;
    }

    try {
      setSaving(true);
      const data: Insurance = {
        id: editingId || 0,
        name: formData.name.trim(),
        insurance_type: formData.insurance_type,
        provider: formData.provider.trim() || null,
        policy_no: formData.policy_no.trim() || null,
        holder_name: formData.holder_name.trim() || null,
        insured_name: formData.insured_name.trim() || null,
        beneficiary: formData.beneficiary.trim() || null,
        premium: parseFloat(formData.premium) || 0,
        premium_frequency: formData.premium_frequency || null,
        coverage_amount: parseFloat(formData.coverage_amount) || 0,
        coverage_type: formData.coverage_type.trim() || null,
        coverage_detail: formData.coverage_detail.trim() || null,
        start_date: formData.start_date || null,
        renewal_date: formData.renewal_date || null,
        end_date: formData.end_date || null,
        status: formData.status,
        notes: formData.notes.trim() || null,
        doc_path: null,
        is_renewal_reminder: formData.is_renewal_reminder,
        is_active: true,
        created_at: '',
        updated_at: '',
      };

      if (editingId) {
        await updateInsurance(data);
      } else {
        await createInsurance(data);
      }

      handleCloseForm();
      await loadData();
      setError(null);
    } catch (e) {
      setError(editingId ? '更新失败' : '创建失败');
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!(await ask('确定要删除这条保险记录吗？', { title: '确认删除', kind: 'warning' }))) return;
    try {
      await deleteInsurance(id);
      await loadData();
    } catch (e) {
      setError('删除失败');
      console.error(e);
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <img
            src="/mascot3.png"
            alt="吉祥物"
            className="w-16 h-16 object-contain"
            style={{ filter: 'drop-shadow(0 4px 8px rgba(99,102,241,0.25))' }}
          />
          <div>
            <h1 className="text-2xl font-bold text-slate-800">保险管理</h1>
            <p className="text-sm text-slate-500 mt-1">管理您的保险保单</p>
          </div>
        </div>
        <button
          onClick={() => handleOpenForm()}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 transition-colors font-medium"
        >
          + 添加保险
        </button>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <div className="text-sm text-slate-500 mb-1">生效保单</div>
          <div className="text-2xl font-bold text-slate-800">{stats.total}</div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <div className="text-sm text-slate-500 mb-1">年化保费</div>
          <div className="text-2xl font-bold text-rose-600">
            ¥{stats.yearlyPremium.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <div className="text-sm text-slate-500 mb-1">总保额</div>
          <div className="text-2xl font-bold text-emerald-600">
            ¥{stats.totalCoverage.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <div className="text-sm text-slate-500 mb-1">近期续保</div>
          <div className="text-2xl font-bold text-amber-600">{stats.renewalSoon}</div>
        </div>
      </div>

      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setFilterType('')}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            !filterType
              ? 'bg-indigo-100 text-indigo-700'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          全部
        </button>
        {(Object.keys(INSURANCE_TYPE_LABELS) as InsuranceType[]).map((type) => (
          <button
            key={type}
            onClick={() => setFilterType(type)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filterType === type
                ? 'bg-indigo-100 text-indigo-700'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {INSURANCE_TYPE_LABELS[type]}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-400">加载中...</div>
      ) : filteredInsurances.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-4xl mb-3 opacity-40">🛡️</div>
          <div className="text-slate-500">暂无保险记录</div>
          <button
            onClick={() => handleOpenForm()}
            className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 transition-colors text-sm"
          >
            添加第一个保险
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredInsurances.map((insurance) => (
            <div
              key={insurance.id}
              className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div
                    className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg font-bold ${
                      INSURANCE_TYPE_COLORS[insurance.insurance_type]
                    }`}
                  >
                    {insurance.insurance_type === 'life' && '🧬'}
                    {insurance.insurance_type === 'health' && '💚'}
                    {insurance.insurance_type === 'accident' && '⚡'}
                    {insurance.insurance_type === 'critical' && '🏥'}
                    {insurance.insurance_type === 'car' && '🚗'}
                    {insurance.insurance_type === 'annuity' && '💰'}
                    {insurance.insurance_type === 'other' && '📋'}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-slate-800">{insurance.name}</h3>
                      <span
                        className={`px-2 py-0.5 rounded text-xs font-medium ${
                          insurance.status === 'active'
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {STATUS_LABELS[insurance.status]}
                      </span>
                    </div>
                    {insurance.provider && (
                      <div className="text-sm text-slate-500 mt-0.5">{insurance.provider}</div>
                    )}
                    <div className="flex items-center gap-4 mt-2 text-sm">
                      <span className="text-slate-500">
                        保费:{' '}
                        <span className="font-medium text-slate-700">
                          ¥{insurance.premium.toLocaleString('zh-CN')}
                          {insurance.premium_frequency && (
                            <span className="text-slate-400">
                              /{PREMIUM_FREQUENCY_LABELS[insurance.premium_frequency]}
                            </span>
                          )}
                        </span>
                      </span>
                      <span className="text-slate-500">
                        保额:{' '}
                        <span className="font-medium text-emerald-600">
                          ¥{insurance.coverage_amount.toLocaleString('zh-CN')}
                        </span>
                      </span>
                    </div>
                    {insurance.renewal_date && (
                      <div className="text-sm text-amber-600 mt-1">
                        续保日期: {insurance.renewal_date}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleOpenForm(insurance)}
                    className="px-3 py-1.5 rounded-lg text-sm font-medium text-indigo-600 hover:bg-indigo-50 transition-colors"
                  >
                    编辑
                  </button>
                  <button
                    onClick={() => handleDelete(insurance.id)}
                    className="px-3 py-1.5 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
                  >
                    删除
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-200">
              <h2 className="text-xl font-bold text-slate-800">
                {editingId ? '编辑保险' : '添加保险'}
              </h2>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  保险名称 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="例如：平安福满分"
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-300 focus:border-indigo-300 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">保险类型</label>
                  <select
                    value={formData.insurance_type}
                    onChange={(e) =>
                      setFormData({ ...formData, insurance_type: e.target.value as InsuranceType })
                    }
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-300 focus:border-indigo-300 outline-none"
                  >
                    {(Object.entries(INSURANCE_TYPE_LABELS) as [InsuranceType, string][]).map(
                      ([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      )
                    )}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">状态</label>
                  <select
                    value={formData.status}
                    onChange={(e) =>
                      setFormData({ ...formData, status: e.target.value as InsuranceStatus })
                    }
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-300 focus:border-indigo-300 outline-none"
                  >
                    {(Object.entries(STATUS_LABELS) as [InsuranceStatus, string][]).map(
                      ([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      )
                    )}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">保险公司</label>
                <input
                  type="text"
                  value={formData.provider}
                  onChange={(e) => setFormData({ ...formData, provider: e.target.value })}
                  placeholder="例如：平安保险"
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-300 focus:border-indigo-300 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">投保人</label>
                  <input
                    type="text"
                    value={formData.holder_name}
                    onChange={(e) => setFormData({ ...formData, holder_name: e.target.value })}
                    placeholder="投保人姓名"
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-300 focus:border-indigo-300 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">被保险人</label>
                  <input
                    type="text"
                    value={formData.insured_name}
                    onChange={(e) => setFormData({ ...formData, insured_name: e.target.value })}
                    placeholder="被保险人姓名"
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-300 focus:border-indigo-300 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">保费</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
                      ¥
                    </span>
                    <input
                      type="number"
                      value={formData.premium}
                      onChange={(e) => setFormData({ ...formData, premium: e.target.value })}
                      placeholder="0.00"
                      className="w-full pl-7 pr-3 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-300 focus:border-indigo-300 outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">缴费频率</label>
                  <select
                    value={formData.premium_frequency}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        premium_frequency: e.target.value as PremiumFrequency | '',
                      })
                    }
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-300 focus:border-indigo-300 outline-none"
                  >
                    <option value="">请选择</option>
                    <option value="yearly">年缴</option>
                    <option value="monthly">月缴</option>
                    <option value="quarterly">季缴</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">保额</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
                      ¥
                    </span>
                    <input
                      type="number"
                      value={formData.coverage_amount}
                      onChange={(e) =>
                        setFormData({ ...formData, coverage_amount: e.target.value })
                      }
                      placeholder="0.00"
                      className="w-full pl-7 pr-3 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-300 focus:border-indigo-300 outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">保障类型</label>
                  <input
                    type="text"
                    value={formData.coverage_type}
                    onChange={(e) => setFormData({ ...formData, coverage_type: e.target.value })}
                    placeholder="例如：终身寿险"
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-300 focus:border-indigo-300 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">生效日期</label>
                  <input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-300 focus:border-indigo-300 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">续保日期</label>
                  <input
                    type="date"
                    value={formData.renewal_date}
                    onChange={(e) => setFormData({ ...formData, renewal_date: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-300 focus:border-indigo-300 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">截止日期</label>
                  <input
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-300 focus:border-indigo-300 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">备注</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={2}
                  placeholder="其他需要记录的信息..."
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-300 focus:border-indigo-300 outline-none resize-none"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="renewalReminder"
                  checked={formData.is_renewal_reminder}
                  onChange={(e) =>
                    setFormData({ ...formData, is_renewal_reminder: e.target.checked })
                  }
                  className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <label htmlFor="renewalReminder" className="text-sm text-slate-600">
                  启用续保提醒（续保日期前自动生成提醒）
                </label>
              </div>
            </div>

            <div className="p-6 border-t border-slate-200 flex gap-3">
              <button
                onClick={handleCloseForm}
                className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors font-medium"
              >
                取消
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 px-4 py-2.5 rounded-xl bg-indigo-600 text-white hover:bg-indigo-500 transition-colors font-medium disabled:opacity-50"
              >
                {saving ? '保存中...' : '保存'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
