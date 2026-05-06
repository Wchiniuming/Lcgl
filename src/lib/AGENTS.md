# API Layer

**Parent:** ./AGENTS.md

## OVERVIEW
TypeScript wrappers for 49 Rust Tauri commands. 684 lines. Invokes via `@tauri-apps/api/core`.

## FILES
```
src/lib/
├── api.ts                 # 684 lines - all Tauri command wrappers
├── dashboard-constants.ts # ECharts theme constants
└── excel-schemas.ts       # Excel import/export schemas
```

## API PATTERN (api.ts)
```typescript
// Example structure:
async function getAccounts(): Promise<Account[]> {
  return invoke<Account[]>('get_all_accounts');
}

async function createAccount(account: NewAccount): Promise<number> {
  return invoke<number>('create_account', { ...account });
}
```

## COMMAND GROUPS
| Group | Functions |
|-------|-----------|
| Auth | setPassword, verifyPassword, hasPassword, logout, hashPassword, verifyPassword, checkRateLimit, recordFailedLogin, clearFailedLogins, requireAuth, hasPasswordSet, checkPassword |
| Accounts | getAccounts, getAccount, createAccount, updateAccount, updateAccountBalance, deleteAccount, archiveAccount, batchImportAccounts, getAllAccountCategories, createAccountCategory, updateAccountCategory, deleteAccountCategory |
| Transactions | getTransactions, getTransaction, createTransaction, updateTransaction, deleteTransaction, batchCreateTransactions |
| Holdings | getHoldings, getHolding, createHolding, updateHolding, deleteHolding, archiveHolding, batchUpdateHoldingPrices |
| Prices | getPrices, createPrice, batchCreatePrices |
| Templates | getTemplates, createTemplate, updateTemplate, deleteTemplate, incrementTemplateUseCount |
| Snapshots | getSnapshots, getSnapshot, createSnapshot, deleteSnapshot, createAutoSnapshot |
| Reminders | getReminders, getPendingReminders, createReminder, updateReminder, deleteReminder, completeReminder |
| Insurances | getInsurances, getInsurance, createInsurance, updateInsurance, deleteInsurance |
| Settings | getSettings, getSetting, setSetting, deleteSetting |
| Backup | getBackupDir, getDbPath, createBackup, cleanupOldBackups, listBackups, restoreBackup, deleteBackup, getAutoBackupConfig, setAutoBackupConfig |

## CONVENTIONS
- All functions async
- PascalCase command names matching Rust
- Type imports from api.ts models
- Error handling: try/catch with user-facing messages

## ANTI-PATTERNS
- **DO NOT** call Tauri commands outside api.ts wrappers
- **DO NOT** use `any` types - define proper interfaces
