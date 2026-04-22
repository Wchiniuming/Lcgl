import { invoke } from '@tauri-apps/api/core';
import type {
  ValidatedAccount,
  ValidatedHolding,
  ValidatedInsurance,
  ValidatedTransaction,
} from './excel-schemas';

export type AccountType = 'asset' | 'liability';
export type TransactionType = 'income' | 'expense' | 'transfer' | 'adjustment';
export type HoldingType = 'stock' | 'fund' | 'bond' | 'bank_financial' | 'precious_metal' | 'other';
export type TemplateType = 'transaction' | 'account' | 'holding';
export type ReminderType =
  | 'account_update'
  | 'payment_due'
  | 'loan_due'
  | 'investment_due'
  | 'insurance_renewal'
  | 'custom';

export type InsuranceType =
  | 'life'
  | 'health'
  | 'accident'
  | 'critical'
  | 'car'
  | 'annuity'
  | 'other';
export type InsuranceStatus = 'active' | 'expired' | 'surrendered' | 'claimed';
export type PremiumFrequency = 'yearly' | 'monthly' | 'quarterly';

export interface Insurance {
  id: number;
  name: string;
  insurance_type: InsuranceType;
  provider: string | null;
  policy_no: string | null;
  holder_name: string | null;
  insured_name: string | null;
  beneficiary: string | null;
  premium: number;
  premium_frequency: PremiumFrequency | null;
  coverage_amount: number;
  coverage_type: string | null;
  coverage_detail: string | null;
  start_date: string | null;
  renewal_date: string | null;
  end_date: string | null;
  status: InsuranceStatus;
  notes: string | null;
  doc_path: string | null;
  is_renewal_reminder: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AccountCategory {
  id: number;
  name: string;
  parent_id: number | null;
  type: AccountType;
  icon: string | null;
  color: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Account {
  id: number;
  name: string;
  category_id: number;
  type: AccountType;
  balance: number;
  currency: string;
  institution: string | null;
  account_no: string | null;
  interest_rate: number | null;
  term_months: number | null;
  start_date: string | null;
  maturity_date: string | null;
  payment_due_day: number | null;
  is_active: boolean;
  is_archived: boolean;
  notes: string | null;
  extra_data: string | null;
  created_at: string;
  updated_at: string;
}

export interface Transaction {
  id: number;
  account_id: number;
  transaction_type: TransactionType;
  amount: number;
  balance_after: number | null;
  counterparty_id: number | null;
  transaction_date: string;
  description: string | null;
  category_id: number | null;
  template_id: number | null;
  reference_no: string | null;
  attach_path: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Holding {
  id: number;
  symbol: string;
  name: string;
  holding_type: HoldingType;
  account_id: number | null;
  shares: number;
  cost_basis: number;
  avg_cost: number;
  current_price: number;
  current_value: number;
  unrealized_pnl: number;
  realized_pnl: number;
  currency: string;
  risk_level: string | null;
  purchase_date: string | null;
  last_price_update: string | null;
  is_active: boolean;
  is_archived: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Price {
  id: number;
  symbol: string;
  price: number;
  price_date: string;
  change_percent: number | null;
  volume: number | null;
  source: string;
  created_at: string;
}

export interface Template {
  id: number;
  name: string;
  description: string | null;
  template_type: TemplateType;
  category_id: number | null;
  account_type: string | null;
  transaction_type: TransactionType | null;
  amount: number | null;
  counterparty_id: number | null;
  notes: string | null;
  is_active: boolean;
  use_count: number;
  last_used_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Snapshot {
  id: number;
  snapshot_date: string;
  snapshot_type: string;
  total_assets: number | null;
  total_liabilities: number | null;
  net_assets: number | null;
  asset_breakdown: string | null;
  liability_breakdown: string | null;
  holdings_value: number | null;
  cash_flow: number | null;
  notes: string | null;
  created_at: string;
}

export interface Reminder {
  id: number;
  title: string;
  reminder_type: ReminderType;
  account_id: number | null;
  holding_id: number | null;
  target_date: string;
  advance_days: number;
  is_repeating: boolean;
  repeat_interval: number | null;
  repeat_unit: string | null;
  is_active: boolean;
  is_completed: boolean;
  completed_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Setting {
  key: string;
  value: string;
  value_type: string;
  description: string | null;
  updated_at: string;
}

export async function greet(name: string): Promise<string> {
  return invoke<string>('greet', { name });
}

export async function getDbVersion(): Promise<number> {
  return invoke<number>('get_db_version');
}

export async function getAllAccountCategories(): Promise<AccountCategory[]> {
  return invoke<AccountCategory[]>('get_all_account_categories');
}

export async function createAccountCategory(
  name: string,
  categoryType: string,
  parentId?: number,
  icon?: string,
  color?: string,
  sortOrder?: number
): Promise<number> {
  return invoke<number>('create_account_category', {
    name,
    categoryType,
    parentId: parentId ?? null,
    icon: icon ?? null,
    color: color ?? null,
    sortOrder: sortOrder ?? null,
  });
}

export async function updateAccountCategory(
  id: number,
  name?: string,
  parentId?: number,
  icon?: string,
  color?: string,
  sortOrder?: number,
  isActive?: boolean
): Promise<void> {
  return invoke<void>('update_account_category', {
    id,
    name: name ?? null,
    parentId: parentId ?? null,
    icon: icon ?? null,
    color: color ?? null,
    sortOrder: sortOrder ?? null,
    isActive: isActive ?? null,
  });
}

export async function deleteAccountCategory(id: number): Promise<void> {
  return invoke<void>('delete_account_category', { id });
}

export async function getAllAccounts(): Promise<Account[]> {
  return invoke<Account[]>('get_all_accounts');
}

export async function getAccount(id: number): Promise<Account> {
  return invoke<Account>('get_account', { id });
}

export async function createAccount(
  account: Omit<Account, 'id' | 'created_at' | 'updated_at'>
): Promise<number> {
  return invoke<number>('create_account', {
    account: { ...account, id: 0, created_at: '', updated_at: '' },
  });
}

export async function updateAccount(account: Account): Promise<void> {
  return invoke<void>('update_account', { account });
}

export async function updateAccountBalance(id: number, balance: number): Promise<void> {
  return invoke<void>('update_account_balance', { id, balance });
}

export async function deleteAccount(id: number): Promise<void> {
  return invoke<void>('delete_account', { id });
}

export async function archiveAccount(id: number): Promise<void> {
  return invoke<void>('archive_account', { id });
}

export interface GetTransactionsOptions {
  accountId?: number;
  startDate?: string;
  endDate?: string;
  transactionType?: TransactionType;
  limit?: number;
  offset?: number;
}

export async function getTransactions(
  options: GetTransactionsOptions = {}
): Promise<Transaction[]> {
  return invoke<Transaction[]>('get_transactions', {
    accountId: options.accountId ?? null,
    startDate: options.startDate ?? null,
    endDate: options.endDate ?? null,
    transactionType: options.transactionType ?? null,
    limit: options.limit ?? null,
    offset: options.offset ?? null,
  });
}

export async function getTransaction(id: number): Promise<Transaction> {
  return invoke<Transaction>('get_transaction', { id });
}

export async function createTransaction(
  transaction: Omit<Transaction, 'id' | 'created_at' | 'updated_at' | 'is_active'>
): Promise<number> {
  return invoke<number>('create_transaction', {
    transaction: { ...transaction, id: 0, is_active: true, created_at: '', updated_at: '' },
  });
}

export async function updateTransaction(transaction: Transaction): Promise<void> {
  return invoke<void>('update_transaction', { transaction });
}

export async function deleteTransaction(id: number): Promise<void> {
  return invoke<void>('delete_transaction', { id });
}

export async function batchCreateTransactions(
  transactions: Omit<Transaction, 'id' | 'created_at' | 'updated_at' | 'is_active'>[]
): Promise<number[]> {
  const normalized = transactions.map((tx) => ({
    ...tx,
    id: 0,
    is_active: true,
    created_at: '',
    updated_at: '',
  }));
  return invoke<number[]>('batch_create_transactions', { transactions: normalized });
}

// Batch import result type
export interface BatchImportResult {
  success: number;
  failed: number;
  ids: number[];
}

// Conflict item detected between import data and existing database data
export interface ImportConflictItem {
  module: string;
  rowIndex: number;
  existingData: Record<string, unknown>;
  importData: Record<string, unknown>;
}

// Batch import functions
export async function batchImportAccounts(
  accounts: ValidatedAccount[]
): Promise<BatchImportResult> {
  return invoke('batch_import_accounts', { accounts });
}

export async function batchImportHoldings(
  holdings: ValidatedHolding[]
): Promise<BatchImportResult> {
  return invoke('batch_import_holdings', { holdings });
}

export async function batchImportInsurances(
  insurances: ValidatedInsurance[]
): Promise<BatchImportResult> {
  return invoke('batch_import_insurances', { insurances });
}

export async function batchImportTransactions(
  transactions: ValidatedTransaction[]
): Promise<BatchImportResult> {
  return invoke('batch_import_transactions', { transactions });
}

export interface GetHoldingsOptions {
  holdingType?: HoldingType;
  includeArchived?: boolean;
}

export async function getHoldings(options: GetHoldingsOptions = {}): Promise<Holding[]> {
  return invoke<Holding[]>('get_holdings', {
    holdingType: options.holdingType ?? null,
    includeArchived: options.includeArchived ?? null,
  });
}

export async function getHolding(id: number): Promise<Holding> {
  return invoke<Holding>('get_holding', { id });
}

export async function createHolding(
  holding: Omit<Holding, 'id' | 'created_at' | 'updated_at' | 'is_active' | 'is_archived'>
): Promise<number> {
  return invoke<number>('create_holding', {
    holding: {
      ...holding,
      id: 0,
      is_active: true,
      is_archived: false,
      created_at: '',
      updated_at: '',
    },
  });
}

export async function updateHolding(holding: Holding): Promise<void> {
  return invoke<void>('update_holding', { holding });
}

export async function deleteHolding(id: number): Promise<void> {
  return invoke<void>('delete_holding', { id });
}

export async function archiveHolding(id: number): Promise<void> {
  return invoke<void>('archive_holding', { id });
}

export interface PriceUpdate {
  symbol: string;
  price: number;
}

export async function batchUpdateHoldingPrices(prices: PriceUpdate[]): Promise<void> {
  return invoke<void>('batch_update_holding_prices', {
    prices: prices.map((p) => [p.symbol, p.price] as [string, number]),
  });
}

export interface GetPricesOptions {
  startDate?: string;
  endDate?: string;
  limit?: number;
}

export async function getPrices(symbol: string, options: GetPricesOptions = {}): Promise<Price[]> {
  return invoke<Price[]>('get_prices', {
    symbol,
    startDate: options.startDate ?? null,
    endDate: options.endDate ?? null,
    limit: options.limit ?? null,
  });
}

export async function createPrice(price: Omit<Price, 'id' | 'created_at'>): Promise<number> {
  return invoke<number>('create_price', { price: { ...price, id: 0, created_at: '' } });
}

export async function batchCreatePrices(
  prices: Omit<Price, 'id' | 'created_at'>[]
): Promise<number[]> {
  return invoke<number[]>('batch_create_prices', {
    prices: prices.map((p) => ({ ...p, id: 0, created_at: '' })),
  });
}

export interface GetTemplatesOptions {
  templateType?: TemplateType;
}

export async function getTemplates(options: GetTemplatesOptions = {}): Promise<Template[]> {
  return invoke<Template[]>('get_templates', {
    templateType: options.templateType ?? null,
  });
}

export async function createTemplate(
  template: Omit<
    Template,
    'id' | 'created_at' | 'updated_at' | 'is_active' | 'use_count' | 'last_used_at'
  >
): Promise<number> {
  return invoke<number>('create_template', {
    template: {
      ...template,
      id: 0,
      is_active: true,
      use_count: 0,
      last_used_at: null,
      created_at: '',
      updated_at: '',
    },
  });
}

export async function updateTemplate(template: Template): Promise<void> {
  return invoke<void>('update_template', { template });
}

export async function deleteTemplate(id: number): Promise<void> {
  return invoke<void>('delete_template', { id });
}

export async function incrementTemplateUseCount(id: number): Promise<void> {
  return invoke<void>('increment_template_use_count', { id });
}

export interface GetSnapshotsOptions {
  snapshotType?: string;
  limit?: number;
}

export async function getSnapshots(options: GetSnapshotsOptions = {}): Promise<Snapshot[]> {
  return invoke<Snapshot[]>('get_snapshots', {
    snapshotType: options.snapshotType ?? null,
    limit: options.limit ?? null,
  });
}

export async function getSnapshot(id: number): Promise<Snapshot> {
  return invoke<Snapshot>('get_snapshot', { id });
}

export async function getInsurances(
  options: { insuranceType?: string; status?: string } = {}
): Promise<Insurance[]> {
  return invoke<Insurance[]>('get_insurances', {
    insuranceType: options.insuranceType ?? null,
    status: options.status ?? null,
  });
}

export async function getInsurance(id: number): Promise<Insurance> {
  return invoke<Insurance>('get_insurance', { id });
}

export async function createInsurance(insurance: Insurance): Promise<number> {
  return invoke<number>('create_insurance', { insurance });
}

export async function updateInsurance(insurance: Insurance): Promise<void> {
  return invoke<void>('update_insurance', { insurance });
}

export async function deleteInsurance(id: number): Promise<void> {
  return invoke<void>('delete_insurance', { id });
}

export async function createSnapshot(
  snapshot: Omit<Snapshot, 'id' | 'created_at'>
): Promise<number> {
  return invoke<number>('create_snapshot', { snapshot: { ...snapshot, id: 0, created_at: '' } });
}

export async function deleteSnapshot(id: number): Promise<void> {
  return invoke<void>('delete_snapshot', { id });
}

export async function createAutoSnapshot(): Promise<number> {
  return invoke<number>('create_auto_snapshot');
}

export interface GetRemindersOptions {
  reminderType?: ReminderType;
  isActive?: boolean;
  includeCompleted?: boolean;
}

export async function getReminders(options: GetRemindersOptions = {}): Promise<Reminder[]> {
  return invoke<Reminder[]>('get_reminders', {
    reminderType: options.reminderType ?? null,
    isActive: options.isActive ?? null,
    includeCompleted: options.includeCompleted ?? null,
  });
}

export async function getPendingReminders(): Promise<Reminder[]> {
  return invoke<Reminder[]>('get_pending_reminders');
}

export async function createReminder(
  reminder: Omit<
    Reminder,
    'id' | 'created_at' | 'updated_at' | 'is_active' | 'is_completed' | 'completed_at'
  >
): Promise<number> {
  return invoke<number>('create_reminder', {
    reminder: {
      ...reminder,
      id: 0,
      is_active: true,
      is_completed: false,
      completed_at: null,
      created_at: '',
      updated_at: '',
    },
  });
}

export async function updateReminder(reminder: Reminder): Promise<void> {
  return invoke<void>('update_reminder', { reminder });
}

export async function deleteReminder(id: number): Promise<void> {
  return invoke<void>('delete_reminder', { id });
}

export async function completeReminder(id: number): Promise<void> {
  return invoke<void>('complete_reminder', { id });
}

export async function getSettings(): Promise<Setting[]> {
  return invoke<Setting[]>('get_settings');
}

export async function getSetting(key: string): Promise<Setting | null> {
  return invoke<Setting | null>('get_setting', { key });
}

export async function setSetting(
  key: string,
  value: string,
  valueType: string,
  description?: string
): Promise<void> {
  return invoke<void>('set_setting', {
    key,
    value,
    valueType,
    description: description ?? null,
  });
}

export async function deleteSetting(key: string): Promise<void> {
  return invoke<void>('delete_setting', { key });
}

export interface BackupInfo {
  filename: string;
  path: string;
  created_at: string;
  size_bytes: number;
}

export async function checkPassword(password: string): Promise<boolean> {
  return invoke<boolean>('check_password', { password });
}

export async function setPassword(password: string): Promise<void> {
  return invoke<void>('set_password', { password });
}

export async function hasPassword(): Promise<boolean> {
  return invoke<boolean>('has_password');
}

export async function logout(): Promise<void> {
  return invoke<void>('logout');
}

export async function createBackup(): Promise<BackupInfo> {
  return invoke<BackupInfo>('create_backup');
}

export async function listBackups(): Promise<BackupInfo[]> {
  return invoke<BackupInfo[]>('list_backups');
}

export async function restoreBackup(filename: string): Promise<void> {
  return invoke<void>('restore_backup', { filename });
}

export async function deleteBackup(filename: string): Promise<void> {
  return invoke<void>('delete_backup', { filename });
}

export async function getAutoBackupConfig(): Promise<[boolean, number]> {
  return invoke<[boolean, number]>('get_auto_backup_config');
}

export async function setAutoBackupConfig(enabled: boolean, maxCount: number): Promise<void> {
  return invoke<void>('set_auto_backup_config', { enabled, maxCount });
}
