# Rust Backend

**Parent:** ./AGENTS.md

## OVERVIEW
Tauri 2.x backend with 49 commands. SQLite via rusqlite, argon2 password hashing, chrono timestamps.

## FILES
```
src-tauri/src/
├── lib.rs        # 2485 lines - 49 Tauri commands (main logic)
├── main.rs       # Entry point - run() dispatcher
├── build.rs      # Tauri build script
└── db/           # Database layer (see db/AGENTS.md)
```

## SYMBOL MAP (lib.rs)
| Category | Count | Key Symbols |
|----------|-------|-------------|
| Auth | 12 | hash_password, verify_password, check_rate_limit, record_failed_login, require_auth, has_password_set, check_password, set_password, has_password, logout, log_audit_event |
| Account | 9 | get_all_accounts, get_account, create_account, update_account, update_account_balance, delete_account, archive_account, batch_import_accounts, get_all_account_categories |
| Holding | 6 | get_holdings, get_holding, create_holding, update_holding, delete_holding, archive_holding, batch_update_holding_prices |
| Transaction | 5 | get_transactions, get_transaction, create_transaction, update_transaction, delete_transaction, batch_create_transactions |
| Price | 3 | get_prices, create_price, batch_create_prices |
| Template | 5 | get_templates, create_template, update_template, delete_template, increment_template_use_count |
| Snapshot | 4 | get_snapshots, get_snapshot, create_snapshot, delete_snapshot, create_auto_snapshot |
| Reminder | 5 | get_reminders, get_pending_reminders, create_reminder, update_reminder, delete_reminder, complete_reminder |
| Insurance | 5 | get_insurances, get_insurance, create_insurance, update_insurance, delete_insurance |
| Settings | 4 | get_settings, get_setting, set_setting, delete_setting |
| Backup | 8 | get_backup_dir, get_db_path, create_backup, cleanup_old_backups, list_backups, restore_backup, delete_backup, get_auto_backup_config, set_auto_backup_config |

## SECURITY
- Password: argon2 hashing
- Rate limiting: failed login tracking (5 attempts, 15 min lockout)
- Auth: require_auth() middleware on protected commands
- Audit: log_audit_event for sensitive operations

## CONVENTIONS
- Commands use `#[tauri::command]` attribute
- Error handling via `thiserror` crate
- JSON serialization via `serde_json`
- Timestamps: RFC 3339 format via chrono
- Batch operations return `BatchImportResult { success, failed, ids }`

## ANTI-PATTERNS
- **DO NOT** put business logic outside lib.rs commands
- **DO NOT** use `unwrap()` in production code - use `?` or explicit error handling

## DEPS (Cargo.toml)
- tauri 2.x (staticlib, cdylib, rlib)
- rusqlite 0.31 (bundled SQLite)
- serde/serde_json 1 (derive)
- chrono 0.4 (serde)
- argon2 0.5 (password hashing)
- rand 0.8
- thiserror 1
