# DB Module

**Parent:** src-tauri/src/AGENTS.md

## OVERVIEW
SQLite database layer with rusqlite. Models with FromRow impl, schema migrations.

## STRUCTURE
```
db/
├── schema.sql      # Full DB schema (345 lines, all P0 tables + indexes + seed)
├── models.rs        # 10 entity structs with from_row() implementations
└── migrations.rs   # Version tracking + run_pending_migrations()
```

## MODELS (models.rs)
| Struct | Fields | FromRow |
|--------|--------|---------|
| AccountCategory | 10 | ✓ |
| Account | 19 | ✓ |
| Transaction | 15 | ✓ |
| Holding | 21 | ✓ |
| Price | 8 | ✓ |
| Template | 15 | ✓ |
| Snapshot | 12 | ✓ |
| Reminder | 17 | ✓ |
| Insurance | 23 | ✓ |
| Setting | 5 | ✓ |

## TABLES (schema.sql)
- account_categories (with parent_id hierarchy)
- accounts (balance, interest_rate, term_months, payment_due_day)
- transactions (account_id FK, counterparty_id, template_id, attach_path)
- holdings (symbol, shares, cost_basis, avg_cost, unrealized_pnl, realized_pnl)
- prices (symbol, price, price_date, change_percent, volume, source)
- templates (use_count tracking)
- snapshots (total_assets, total_liabilities, net_assets, asset_breakdown JSON)
- reminders (advance_days, is_repeating, repeat_interval, repeat_unit)
- insurances (premium, coverage_amount, renewal_date, is_renewal_reminder)
- settings (key-value store)
- schema_version (migration tracking)
- audit_log (audit_event, entity_type, entity_id, user_info)

## CONVENTIONS
- `pub struct X` for public models
- `impl X { pub fn from_row(row: &Row) -> rusqlite::Result<Self>` pattern
- Enums derive `Copy, Clone, PartialEq, Eq` + `FromStr` + `ToString`
- Schema uses `INTEGER PRIMARY KEY AUTOINCREMENT`
- Foreign keys via `PRAGMA foreign_keys = ON`
- Timestamps: `datetime('now')` default

## ANTI-PATTERNS
- **DO NOT** use raw SQL in lib.rs - put in schema.sql
- **DO NOT** skip `PRAGMA foreign_keys = ON`

## NOTES
- Insurance table added later - renewal reminders via `check_and_create_renewal_reminder`
- Extra data stored as JSON string in `extra_data` column
- All monetary values stored as REAL (f64)
