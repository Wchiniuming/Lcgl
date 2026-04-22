import { useState, useEffect } from 'react';
import {
  hasPassword,
  setPassword,
  checkPassword,
  createBackup,
  listBackups,
  restoreBackup,
  deleteBackup,
  getAutoBackupConfig,
  setAutoBackupConfig,
  BackupInfo,
} from '../lib/api';

function IconShield() {
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
    >
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}

function IconKey() {
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
    >
      <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
    </svg>
  );
}

function IconRefresh() {
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
    >
      <polyline points="23 4 23 10 17 10" />
      <polyline points="1 20 1 14 7 14" />
      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
    </svg>
  );
}

function IconDownload() {
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
    >
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}

function IconUpload() {
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
    >
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
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
    >
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  );
}

function IconCheck() {
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
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function IconLogout() {
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
    >
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}

type SettingsTab = 'security' | 'backup';

interface SettingsProps {
  onLogout?: () => void;
}

export default function Settings({ onLogout }: SettingsProps) {
  const [activeTab, setActiveTab] = useState<SettingsTab>('security');

  const [hasPass, setHasPass] = useState<boolean | null>(null);
  const [passwordMode, setPasswordMode] = useState<'view' | 'setup' | 'change'>('view');
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');

  const [backups, setBackups] = useState<BackupInfo[]>([]);
  const [autoBackupEnabled, setAutoBackupEnabled] = useState(false);
  const [autoBackupMaxCount, setAutoBackupMaxCount] = useState(10);
  const [backupLoading, setBackupLoading] = useState(false);
  const [restoreConfirm, setRestoreConfirm] = useState<string | null>(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    loadPasswordStatus();
    loadBackupData();
  }, []);

  const loadPasswordStatus = async () => {
    try {
      const hasP = await hasPassword();
      setHasPass(hasP);
      setPasswordMode(hasP ? 'view' : 'setup');
    } catch (e) {
      setHasPass(false);
      setPasswordMode('setup');
    }
  };

  const loadBackupData = async () => {
    try {
      const [config, list] = await Promise.all([getAutoBackupConfig(), listBackups()]);
      setAutoBackupEnabled(config[0]);
      setAutoBackupMaxCount(config[1]);
      setBackups(list);
    } catch (e) {
      // silent fail
    }
  };

  const handleSetupPassword = async () => {
    setPasswordError('');
    setPasswordSuccess('');

    if (newPassword.length < 6) {
      setPasswordError('密码长度至少6位');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('两次输入的密码不一致');
      return;
    }

    try {
      await setPassword(newPassword);
      setHasPass(true);
      setPasswordMode('view');
      setPasswordSuccess('密码设置成功');
      setNewPassword('');
      setConfirmPassword('');
    } catch (e: any) {
      setPasswordError(e.toString());
    }
  };

  const handleChangePassword = async () => {
    setPasswordError('');
    setPasswordSuccess('');

    if (newPassword.length < 6) {
      setPasswordError('新密码长度至少6位');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('两次输入的新密码不一致');
      return;
    }

    try {
      const isValid = await checkPassword(oldPassword);
      if (!isValid) {
        setPasswordError('原密码错误');
        return;
      }
      await setPassword(newPassword);
      setPasswordSuccess('密码修改成功');
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordMode('view');
    } catch (e: any) {
      setPasswordError(e.toString());
    }
  };

  const handleCreateBackup = async () => {
    setBackupLoading(true);
    setMessage('');
    try {
      const backup = await createBackup();
      setMessage(`备份创建成功: ${backup.filename}`);
      await loadBackupData();
    } catch (e: any) {
      setMessage(`备份失败: ${e.toString()}`);
    } finally {
      setBackupLoading(false);
    }
  };

  const handleRestore = async (filename: string) => {
    try {
      await restoreBackup(filename);
      setMessage(`恢复成功: ${filename}`);
      setRestoreConfirm(null);
    } catch (e: any) {
      setMessage(`恢复失败: ${e.toString()}`);
    }
  };

  const handleDeleteBackup = async (filename: string) => {
    try {
      await deleteBackup(filename);
      await loadBackupData();
      setMessage(`已删除: ${filename}`);
    } catch (e: any) {
      setMessage(`删除失败: ${e.toString()}`);
    }
  };

  const handleSaveAutoBackupConfig = async () => {
    try {
      await setAutoBackupConfig(autoBackupEnabled, autoBackupMaxCount);
      setMessage('自动备份设置已保存');
    } catch (e: any) {
      setMessage(`保存失败: ${e.toString()}`);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (dateStr: string): string => {
    try {
      const d = new Date(dateStr.replace(' ', 'T'));
      return d.toLocaleString('zh-CN');
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-semibold text-slate-800 mb-6">设置</h1>

      <div className="flex gap-2 mb-6 pb-2 border-b border-slate-200">
        <button
          type="button"
          onClick={() => setActiveTab('security')}
          className={`px-4 py-2 rounded-lg font-medium flex items-center gap-1.5 ${
            activeTab === 'security'
              ? 'bg-indigo-600 text-white'
              : 'bg-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <IconShield /> 安全设置
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('backup')}
          className={`px-4 py-2 rounded-lg font-medium flex items-center gap-1.5 ${
            activeTab === 'backup'
              ? 'bg-indigo-600 text-white'
              : 'bg-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <IconDownload /> 备份还原
        </button>
      </div>

      {message && (
        <div
          className={`p-3 rounded-lg text-sm mb-4 ${
            message.includes('失败')
              ? 'bg-red-50 border border-red-200 text-red-700'
              : 'bg-emerald-50 border border-emerald-200 text-emerald-700'
          }`}
        >
          {message}
        </div>
      )}

      {activeTab === 'security' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <IconKey /> 密码设置
          </h2>

          {hasPass === false || passwordMode === 'setup' ? (
            <div>
              <p className="text-slate-500 mb-4">首次使用，请设置密码保护您的财务数据</p>
              <div className="flex flex-col gap-3">
                <div>
                  <label
                    htmlFor="setup-password"
                    className="block text-sm font-medium text-slate-700 mb-1"
                  >
                    设置密码
                  </label>
                  <input
                    id="setup-password"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="请输入密码（至少6位）"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label
                    htmlFor="setup-confirm-password"
                    className="block text-sm font-medium text-slate-700 mb-1"
                  >
                    确认密码
                  </label>
                  <input
                    id="setup-confirm-password"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="请再次输入密码"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
                {passwordError && <p className="text-red-600 text-sm">{passwordError}</p>}
                {passwordSuccess && <p className="text-emerald-600 text-sm">{passwordSuccess}</p>}
                <button
                  type="button"
                  onClick={handleSetupPassword}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium self-start"
                >
                  设置密码
                </button>
              </div>
            </div>
          ) : passwordMode === 'change' ? (
            <div>
              <p className="text-slate-500 mb-4">修改您的登录密码</p>
              <div className="flex flex-col gap-3">
                <div>
                  <label
                    htmlFor="old-password"
                    className="block text-sm font-medium text-slate-700 mb-1"
                  >
                    原密码
                  </label>
                  <input
                    id="old-password"
                    type="password"
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                    placeholder="请输入原密码"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label
                    htmlFor="new-password"
                    className="block text-sm font-medium text-slate-700 mb-1"
                  >
                    新密码
                  </label>
                  <input
                    id="new-password"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="请输入新密码（至少6位）"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label
                    htmlFor="confirm-new-password"
                    className="block text-sm font-medium text-slate-700 mb-1"
                  >
                    确认新密码
                  </label>
                  <input
                    id="confirm-new-password"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="请再次输入新密码"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
                {passwordError && <p className="text-red-600 text-sm">{passwordError}</p>}
                {passwordSuccess && <p className="text-emerald-600 text-sm">{passwordSuccess}</p>}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleChangePassword}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium"
                  >
                    修改密码
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPasswordMode('view');
                      setOldPassword('');
                      setNewPassword('');
                      setConfirmPassword('');
                      setPasswordError('');
                    }}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium"
                  >
                    取消
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div>
              <div className="flex items-center gap-2 p-3 bg-emerald-50 rounded-lg mb-4">
                <IconCheck />
                <span className="text-emerald-600 font-medium">密码保护已启用</span>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setPasswordMode('change')}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium flex items-center gap-1.5"
                >
                  <IconKey /> 修改密码
                </button>
                {onLogout && (
                  <button
                    type="button"
                    onClick={onLogout}
                    className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg text-sm font-medium flex items-center gap-1.5"
                  >
                    <IconLogout /> 退出登录
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'backup' && (
        <div className="flex flex-col gap-6">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <IconDownload /> 手动备份
            </h2>
            <p className="text-slate-500 mb-4">
              点击下方按钮立即创建数据库备份。备份文件将保存在应用数据目录中。
            </p>
            <button
              type="button"
              onClick={handleCreateBackup}
              disabled={backupLoading}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium flex items-center gap-1.5 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {backupLoading ? (
                <>
                  <IconRefresh /> 创建中...
                </>
              ) : (
                <>
                  <IconDownload /> 创建备份
                </>
              )}
            </button>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <IconRefresh /> 自动备份设置
            </h2>
            <div className="flex flex-col gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoBackupEnabled}
                  onChange={(e) => setAutoBackupEnabled(e.target.checked)}
                  className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500"
                />
                <span className="font-medium">启用自动备份</span>
              </label>
              <div>
                <label
                  htmlFor="max-backup-count"
                  className="block text-sm font-medium text-slate-700 mb-1"
                >
                  最大备份数量
                </label>
                <div className="flex items-center gap-2">
                  <input
                    id="max-backup-count"
                    type="number"
                    min="1"
                    max="100"
                    value={autoBackupMaxCount}
                    onChange={(e) => setAutoBackupMaxCount(parseInt(e.target.value) || 10)}
                    className="w-24 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                  <span className="text-slate-500 text-sm">个</span>
                </div>
                <p className="mt-1 text-xs text-slate-400">超出数量时自动删除最旧的备份</p>
              </div>
              <button
                type="button"
                onClick={handleSaveAutoBackupConfig}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium self-start"
              >
                保存设置
              </button>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <IconUpload /> 备份列表
            </h2>

            {backups.length === 0 ? (
              <p className="text-slate-400 text-center py-6">暂无备份记录</p>
            ) : (
              <div className="flex flex-col gap-2">
                {backups.map((backup, index) => (
                  <div
                    key={index}
                    className={`flex items-center justify-between p-3 rounded-lg border ${
                      restoreConfirm === backup.filename
                        ? 'bg-indigo-50 border-indigo-500'
                        : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div className="flex flex-col gap-0.5">
                      <span className="font-medium text-sm">{backup.filename}</span>
                      <span className="text-slate-500 text-xs">
                        {formatDate(backup.created_at)} • {formatFileSize(backup.size_bytes)}
                      </span>
                    </div>
                    <div className="flex gap-1">
                      {restoreConfirm === backup.filename ? (
                        <>
                          <button
                            type="button"
                            onClick={() => handleRestore(backup.filename)}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-medium"
                          >
                            确认恢复
                          </button>
                          <button
                            type="button"
                            onClick={() => setRestoreConfirm(null)}
                            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded text-xs font-medium"
                          >
                            取消
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => setRestoreConfirm(backup.filename)}
                            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-xs font-medium flex items-center gap-1"
                          >
                            <IconUpload /> 恢复
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteBackup(backup.filename)}
                            className="px-2 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded text-xs flex items-center"
                          >
                            <IconTrash />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {restoreConfirm && (
              <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-sm">
                ⚠️ 警告：恢复备份将覆盖当前所有数据。是否确认要从 <strong>{restoreConfirm}</strong>{' '}
                恢复？
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
