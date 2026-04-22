import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ask } from '@tauri-apps/plugin-dialog';
import {
  getPendingReminders,
  getAllAccounts,
  createReminder,
  completeReminder,
  deleteReminder,
  Reminder,
  ReminderType,
  Account,
} from '../lib/api';

type GroupedReminders = {
  [key in ReminderType]?: Reminder[];
};

const REMINDER_TYPE_LABELS: Record<ReminderType, string> = {
  account_update: '账户更新提醒',
  payment_due: '还款提醒',
  loan_due: '贷款到期提醒',
  investment_due: '投资到期提醒',
  insurance_renewal: '保险续保提醒',
  custom: '自定义提醒',
};

const REMINDER_TYPE_ICONS: Record<ReminderType, string> = {
  account_update: '📝',
  payment_due: '💳',
  loan_due: '🏦',
  investment_due: '📈',
  insurance_renewal: '🛡️',
  custom: '🔔',
};

interface ReminderFormData {
  title: string;
  reminder_type: ReminderType;
  account_id: number | null;
  target_date: string;
  advance_days: number;
  is_repeating: boolean;
  repeat_interval: number | null;
  repeat_unit: string | null;
  notes: string | null;
}

const initialFormData: ReminderFormData = {
  title: '',
  reminder_type: 'custom',
  account_id: null,
  target_date: '',
  advance_days: 3,
  is_repeating: false,
  repeat_interval: null,
  repeat_unit: null,
  notes: null,
};

export default function Reminders() {
  const navigate = useNavigate();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [groupedReminders, setGroupedReminders] = useState<GroupedReminders>({});
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<ReminderFormData>(initialFormData);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [pendingReminders, allAccounts] = await Promise.all([
        getPendingReminders(),
        getAllAccounts(),
      ]);
      setAccounts(allAccounts);

      const grouped: GroupedReminders = {};
      for (const r of pendingReminders) {
        if (!grouped[r.reminder_type]) {
          grouped[r.reminder_type] = [];
        }
        grouped[r.reminder_type]!.push(r);
      }
      setGroupedReminders(grouped);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCreateReminder = async () => {
    if (!formData.title.trim()) {
      setError('请输入提醒标题');
      return;
    }
    if (!formData.target_date) {
      setError('请选择目标日期');
      return;
    }

    try {
      setSaving(true);
      await createReminder({
        title: formData.title,
        reminder_type: formData.reminder_type,
        account_id: formData.account_id,
        holding_id: null,
        target_date: formData.target_date,
        advance_days: formData.advance_days,
        is_repeating: formData.is_repeating,
        repeat_interval: formData.is_repeating ? formData.repeat_interval : null,
        repeat_unit: formData.is_repeating ? formData.repeat_unit : null,
        notes: formData.notes,
      });
      setFormData(initialFormData);
      setShowForm(false);
      await loadData();
      setError(null);
    } catch (e) {
      setError('创建提醒失败');
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const handleComplete = async (id: number) => {
    try {
      await completeReminder(id);
      await loadData();
    } catch (e) {
      setError('完成提醒失败');
      console.error(e);
    }
  };

  const handleDelete = async (id: number) => {
    if (!(await ask('确定要删除这条提醒吗？', { title: '确认删除', kind: 'warning' }))) return;
    try {
      await deleteReminder(id);
      await loadData();
    } catch (e) {
      setError('删除提醒失败');
      console.error(e);
    }
  };

  const handleReminderClick = (reminder: Reminder) => {
    if (reminder.account_id) {
      navigate(`/accounts/${reminder.account_id}`);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const isOverdue = (targetDate: string) => {
    return new Date(targetDate) < new Date();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-500">加载中...</div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-slate-800">提醒中心</h1>
        <button
          type="button"
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 transition-colors"
        >
          {showForm ? '取消创建' : '+ 新建提醒'}
        </button>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      {showForm && (
        <div className="mb-6 bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h2 className="text-lg font-semibold mb-4">创建新提醒</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label htmlFor="title" className="block text-sm font-medium text-slate-700 mb-1">
                提醒标题 *
              </label>
              <input
                id="title"
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="例如：信用卡还款日"
              />
            </div>

            <div>
              <label
                htmlFor="reminder_type"
                className="block text-sm font-medium text-slate-700 mb-1"
              >
                提醒类型
              </label>
              <select
                id="reminder_type"
                value={formData.reminder_type}
                onChange={(e) =>
                  setFormData({ ...formData, reminder_type: e.target.value as ReminderType })
                }
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                {Object.entries(REMINDER_TYPE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="account_id" className="block text-sm font-medium text-slate-700 mb-1">
                关联账户
              </label>
              <select
                id="account_id"
                value={formData.account_id || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    account_id: e.target.value ? Number(e.target.value) : null,
                  })
                }
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="">不关联</option>
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="target_date"
                className="block text-sm font-medium text-slate-700 mb-1"
              >
                目标日期 *
              </label>
              <input
                id="target_date"
                type="date"
                value={formData.target_date}
                onChange={(e) => setFormData({ ...formData, target_date: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>

            <div>
              <label
                htmlFor="advance_days"
                className="block text-sm font-medium text-slate-700 mb-1"
              >
                提前提醒天数
              </label>
              <input
                id="advance_days"
                type="number"
                min="0"
                max="30"
                value={formData.advance_days}
                onChange={(e) =>
                  setFormData({ ...formData, advance_days: parseInt(e.target.value) || 0 })
                }
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>

            <div className="md:col-span-2 flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.is_repeating}
                  onChange={(e) => setFormData({ ...formData, is_repeating: e.target.checked })}
                  className="w-4 h-4 text-indigo-600 border-slate-200 rounded focus:ring-indigo-500"
                />
                <span className="text-sm font-medium text-slate-700">重复提醒</span>
              </label>

              {formData.is_repeating && (
                <div className="flex items-center gap-2">
                  <input
                    id="repeat_interval"
                    type="number"
                    min="1"
                    value={formData.repeat_interval || 1}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        repeat_interval: parseInt(e.target.value) || 1,
                      })
                    }
                    className="w-20 px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                  <select
                    id="repeat_unit"
                    value={formData.repeat_unit || 'month'}
                    onChange={(e) => setFormData({ ...formData, repeat_unit: e.target.value })}
                    className="px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  >
                    <option value="day">天</option>
                    <option value="week">周</option>
                    <option value="month">月</option>
                    <option value="year">年</option>
                  </select>
                </div>
              )}
            </div>

            <div className="md:col-span-2">
              <label htmlFor="notes" className="block text-sm font-medium text-slate-700 mb-1">
                备注
              </label>
              <textarea
                id="notes"
                value={formData.notes || ''}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value || null })}
                rows={3}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="添加备注信息..."
              />
            </div>
          </div>

          <div className="mt-4 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                setFormData(initialFormData);
                setError(null);
              }}
              className="px-4 py-2 text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
            >
              取消
            </button>
            <button
              type="button"
              onClick={handleCreateReminder}
              disabled={saving}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 transition-colors disabled:opacity-50"
            >
              {saving ? '保存中...' : '保存提醒'}
            </button>
          </div>
        </div>
      )}

      {Object.keys(groupedReminders).length === 0 ? (
        <div className="text-center py-12 text-slate-500">
          <div className="text-4xl mb-4">🔔</div>
          <p>暂无待处理提醒</p>
          <p className="text-sm mt-1">点击右上角按钮创建新提醒</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedReminders).map(([type, typeReminders]) => {
            if (!typeReminders || typeReminders.length === 0) return null;
            return (
              <div key={type} className="bg-white rounded-xl shadow-sm border border-slate-200">
                <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2">
                  <span className="text-xl">{REMINDER_TYPE_ICONS[type as ReminderType]}</span>
                  <h2 className="font-semibold text-slate-800">
                    {REMINDER_TYPE_LABELS[type as ReminderType]}
                  </h2>
                  <span className="ml-auto text-sm text-slate-500">{typeReminders.length} 条</span>
                </div>
                <div className="divide-y divide-slate-100">
                  {typeReminders.map((reminder) => (
                    <button
                      type="button"
                      key={reminder.id}
                      className={`w-full text-left p-4 hover:bg-slate-50 cursor-pointer transition-colors ${
                        isOverdue(reminder.target_date) ? 'bg-red-50' : ''
                      }`}
                      onClick={() => handleReminderClick(reminder)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-medium text-slate-800">{reminder.title}</h3>
                            {isOverdue(reminder.target_date) && (
                              <span className="px-2 py-0.5 text-xs bg-red-100 text-red-700 rounded">
                                已过期
                              </span>
                            )}
                            {reminder.is_repeating && (
                              <span className="px-2 py-0.5 text-xs bg-indigo-100 text-indigo-700 rounded">
                                重复
                              </span>
                            )}
                          </div>
                          <div className="mt-1 text-sm text-slate-500">
                            <span>目标日期：{formatDate(reminder.target_date)}</span>
                            <span className="mx-2">•</span>
                            <span>提前 {reminder.advance_days} 天提醒</span>
                            {reminder.notes && (
                              <>
                                <span className="mx-2">•</span>
                                <span className="truncate max-w-xs">{reminder.notes}</span>
                              </>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 ml-4">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleComplete(reminder.id);
                            }}
                            className="px-3 py-1 text-sm text-emerald-600 bg-emerald-50 rounded-lg hover:bg-emerald-100 transition-colors"
                          >
                            完成
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(reminder.id);
                            }}
                            className="px-3 py-1 text-sm text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
                          >
                            删除
                          </button>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
