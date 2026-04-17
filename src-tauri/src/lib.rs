mod db;

use db::{
    initialize_database, get_schema_version, AccountCategory, Account, Transaction, Holding,
    Price, Template, Snapshot, Reminder, Setting,
    AccountType, TransactionType, HoldingType, TemplateType, ReminderType,
};
use rusqlite::Connection;
use std::sync::Mutex;
use tauri::Manager;

struct AppState {
    db: Mutex<Connection>,
}

// =============================================================================
// UTILITY
// =============================================================================

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
fn get_db_version(state: tauri::State<AppState>) -> Result<i32, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    get_schema_version(&conn).map_err(|e| e.to_string())
}

// =============================================================================
// ACCOUNT CATEGORIES
// =============================================================================

#[tauri::command]
fn get_all_account_categories(state: tauri::State<AppState>) -> Result<Vec<AccountCategory>, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn.prepare(
        "SELECT id, name, parent_id, type, icon, color, sort_order, is_active, created_at, updated_at
         FROM account_categories WHERE is_active = 1 ORDER BY sort_order"
    ).map_err(|e| e.to_string())?;

    let categories = stmt.query_map([], |row| {
        Ok(AccountCategory {
            id: row.get(0)?,
            name: row.get(1)?,
            parent_id: row.get(2)?,
            category_type: row.get::<_, String>(3)?.parse().unwrap_or(AccountType::Asset),
            icon: row.get(4)?,
            color: row.get(5)?,
            sort_order: row.get(6)?,
            is_active: row.get::<_, i32>(7)? == 1,
            created_at: row.get(8)?,
            updated_at: row.get(9)?,
        })
    }).map_err(|e| e.to_string())?;

    categories.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
}

#[tauri::command]
fn create_account_category(
    state: tauri::State<AppState>,
    name: String,
    category_type: String,
    parent_id: Option<i64>,
    icon: Option<String>,
    color: Option<String>,
    sort_order: Option<i32>,
) -> Result<i64, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let now = chrono::Utc::now().format("%Y-%m-%d %H:%M:%S").to_string();
    conn.execute(
        "INSERT INTO account_categories (name, parent_id, type, icon, color, sort_order, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
        rusqlite::params![name, parent_id, category_type, icon, color, sort_order.unwrap_or(0), now, now],
    ).map_err(|e| e.to_string())?;
    Ok(conn.last_insert_rowid())
}

#[tauri::command]
fn update_account_category(
    state: tauri::State<AppState>,
    id: i64,
    name: Option<String>,
    parent_id: Option<i64>,
    icon: Option<String>,
    color: Option<String>,
    sort_order: Option<i32>,
    is_active: Option<bool>,
) -> Result<(), String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let now = chrono::Utc::now().format("%Y-%m-%d %H:%M:%S").to_string();

    if let Some(n) = name {
        conn.execute("UPDATE account_categories SET name = ?1, updated_at = ?2 WHERE id = ?3",
            rusqlite::params![n, now, id]).map_err(|e| e.to_string())?;
    }
    if let Some(pid) = parent_id {
        conn.execute("UPDATE account_categories SET parent_id = ?1, updated_at = ?2 WHERE id = ?3",
            rusqlite::params![pid, now, id]).map_err(|e| e.to_string())?;
    }
    if let Some(ic) = icon {
        conn.execute("UPDATE account_categories SET icon = ?1, updated_at = ?2 WHERE id = ?3",
            rusqlite::params![ic, now, id]).map_err(|e| e.to_string())?;
    }
    if let Some(cl) = color {
        conn.execute("UPDATE account_categories SET color = ?1, updated_at = ?2 WHERE id = ?3",
            rusqlite::params![cl, now, id]).map_err(|e| e.to_string())?;
    }
    if let Some(so) = sort_order {
        conn.execute("UPDATE account_categories SET sort_order = ?1, updated_at = ?2 WHERE id = ?3",
            rusqlite::params![so, now, id]).map_err(|e| e.to_string())?;
    }
    if let Some(ia) = is_active {
        conn.execute("UPDATE account_categories SET is_active = ?1, updated_at = ?2 WHERE id = ?3",
            rusqlite::params![ia as i32, now, id]).map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
fn delete_account_category(state: tauri::State<AppState>, id: i64) -> Result<(), String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let now = chrono::Utc::now().format("%Y-%m-%d %H:%M:%S").to_string();
    conn.execute(
        "UPDATE account_categories SET is_active = 0, updated_at = ?1 WHERE id = ?2",
        rusqlite::params![now, id],
    ).map_err(|e| e.to_string())?;
    Ok(())
}

// =============================================================================
// ACCOUNTS
// =============================================================================

#[tauri::command]
fn get_all_accounts(state: tauri::State<AppState>) -> Result<Vec<Account>, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn.prepare(
        "SELECT id, name, category_id, type, balance, currency, institution, account_no,
                interest_rate, term_months, start_date, maturity_date, payment_due_day,
                is_active, is_archived, notes, extra_data, created_at, updated_at
         FROM accounts WHERE is_active = 1 ORDER BY name"
    ).map_err(|e| e.to_string())?;

    let accounts = stmt.query_map([], |row| {
        Ok(Account {
            id: row.get(0)?,
            name: row.get(1)?,
            category_id: row.get(2)?,
            account_type: row.get::<_, String>(3)?.parse().unwrap_or(AccountType::Asset),
            balance: row.get(4)?,
            currency: row.get(5)?,
            institution: row.get(6)?,
            account_no: row.get(7)?,
            interest_rate: row.get(8)?,
            term_months: row.get(9)?,
            start_date: row.get(10)?,
            maturity_date: row.get(11)?,
            payment_due_day: row.get(12)?,
            is_active: row.get::<_, i32>(13)? == 1,
            is_archived: row.get::<_, i32>(14)? == 1,
            notes: row.get(15)?,
            extra_data: row.get(16)?,
            created_at: row.get(17)?,
            updated_at: row.get(18)?,
        })
    }).map_err(|e| e.to_string())?;

    accounts.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
}

#[tauri::command]
fn get_account(state: tauri::State<AppState>, id: i64) -> Result<Account, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn.prepare(
        "SELECT id, name, category_id, type, balance, currency, institution, account_no,
                interest_rate, term_months, start_date, maturity_date, payment_due_day,
                is_active, is_archived, notes, extra_data, created_at, updated_at
         FROM accounts WHERE id = ?1"
    ).map_err(|e| e.to_string())?;

    stmt.query_row([id], |row| {
        Ok(Account {
            id: row.get(0)?,
            name: row.get(1)?,
            category_id: row.get(2)?,
            account_type: row.get::<_, String>(3)?.parse().unwrap_or(AccountType::Asset),
            balance: row.get(4)?,
            currency: row.get(5)?,
            institution: row.get(6)?,
            account_no: row.get(7)?,
            interest_rate: row.get(8)?,
            term_months: row.get(9)?,
            start_date: row.get(10)?,
            maturity_date: row.get(11)?,
            payment_due_day: row.get(12)?,
            is_active: row.get::<_, i32>(13)? == 1,
            is_archived: row.get::<_, i32>(14)? == 1,
            notes: row.get(15)?,
            extra_data: row.get(16)?,
            created_at: row.get(17)?,
            updated_at: row.get(18)?,
        })
    }).map_err(|e| e.to_string())
}

#[tauri::command]
fn create_account(state: tauri::State<AppState>, account: Account) -> Result<i64, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "INSERT INTO accounts (name, category_id, type, balance, currency, institution, account_no,
                               interest_rate, term_months, start_date, maturity_date, payment_due_day,
                               is_active, is_archived, notes, extra_data)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16)",
        rusqlite::params![
            account.name, account.category_id, account.account_type.to_string(),
            account.balance, account.currency, account.institution, account.account_no,
            account.interest_rate, account.term_months, account.start_date, account.maturity_date,
            account.payment_due_day, 1, 0, account.notes, account.extra_data
        ],
    ).map_err(|e| e.to_string())?;
    Ok(conn.last_insert_rowid())
}

#[tauri::command]
fn update_account(state: tauri::State<AppState>, account: Account) -> Result<(), String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let now = chrono::Utc::now().format("%Y-%m-%d %H:%M:%S").to_string();
    conn.execute(
        "UPDATE accounts SET name = ?1, category_id = ?2, type = ?3, balance = ?4, currency = ?5,
                             institution = ?6, account_no = ?7, interest_rate = ?8, term_months = ?9,
                             start_date = ?10, maturity_date = ?11, payment_due_day = ?12,
                             is_active = ?13, is_archived = ?14, notes = ?15, extra_data = ?16,
                             updated_at = ?17 WHERE id = ?18",
        rusqlite::params![
            account.name, account.category_id, account.account_type.to_string(), account.balance,
            account.currency, account.institution, account.account_no, account.interest_rate,
            account.term_months, account.start_date, account.maturity_date, account.payment_due_day,
            account.is_active as i32, account.is_archived as i32, account.notes, account.extra_data,
            now, account.id
        ],
    ).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn update_account_balance(state: tauri::State<AppState>, id: i64, balance: f64) -> Result<(), String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let now = chrono::Utc::now().format("%Y-%m-%d %H:%M:%S").to_string();
    conn.execute(
        "UPDATE accounts SET balance = ?1, updated_at = ?2 WHERE id = ?3",
        rusqlite::params![balance, now, id],
    ).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn delete_account(state: tauri::State<AppState>, id: i64) -> Result<(), String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let now = chrono::Utc::now().format("%Y-%m-%d %H:%M:%S").to_string();
    conn.execute(
        "UPDATE accounts SET is_active = 0, updated_at = ?1 WHERE id = ?2",
        rusqlite::params![now, id],
    ).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn archive_account(state: tauri::State<AppState>, id: i64) -> Result<(), String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let now = chrono::Utc::now().format("%Y-%m-%d %H:%M:%S").to_string();
    conn.execute(
        "UPDATE accounts SET is_archived = 1, updated_at = ?1 WHERE id = ?2",
        rusqlite::params![now, id],
    ).map_err(|e| e.to_string())?;
    Ok(())
}

// =============================================================================
// TRANSACTIONS
// =============================================================================

#[tauri::command]
fn get_transactions(
    state: tauri::State<AppState>,
    account_id: Option<i64>,
    start_date: Option<String>,
    end_date: Option<String>,
    transaction_type: Option<String>,
    limit: Option<i64>,
    offset: Option<i64>,
) -> Result<Vec<Transaction>, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;

    let mut sql = "SELECT id, account_id, transaction_type, amount, balance_after, counterparty_id,
                   transaction_date, description, category_id, template_id, reference_no,
                   attach_path, is_active, created_at, updated_at
                   FROM transactions WHERE is_active = 1".to_string();
    let mut params_vec: Vec<Box<dyn rusqlite::ToSql>> = Vec::new();

    if account_id.is_some() {
        sql.push_str(" AND account_id = ?");
        params_vec.push(Box::new(account_id.unwrap()));
    }
    if start_date.is_some() {
        sql.push_str(" AND transaction_date >= ?");
        params_vec.push(Box::new(start_date.unwrap()));
    }
    if end_date.is_some() {
        sql.push_str(" AND transaction_date <= ?");
        params_vec.push(Box::new(end_date.unwrap()));
    }
    if transaction_type.is_some() {
        sql.push_str(" AND transaction_type = ?");
        params_vec.push(Box::new(transaction_type.unwrap()));
    }
    sql.push_str(" ORDER BY transaction_date DESC, id DESC");
    if let Some(l) = limit {
        sql.push_str(&format!(" LIMIT {}", l));
    }
    if let Some(o) = offset {
        sql.push_str(&format!(" OFFSET {}", o));
    }

    let params_refs: Vec<&dyn rusqlite::ToSql> = params_vec.iter().map(|b| b.as_ref()).collect();
    let mut stmt = conn.prepare(&sql).map_err(|e| e.to_string())?;

    let rows = stmt.query_map(params_refs.as_slice(), |row| {
        Ok(Transaction {
            id: row.get(0)?,
            account_id: row.get(1)?,
            transaction_type: row.get::<_, String>(2)?.parse().unwrap_or(TransactionType::Adjustment),
            amount: row.get(3)?,
            balance_after: row.get(4)?,
            counterparty_id: row.get(5)?,
            transaction_date: row.get(6)?,
            description: row.get(7)?,
            category_id: row.get(8)?,
            template_id: row.get(9)?,
            reference_no: row.get(10)?,
            attach_path: row.get(11)?,
            is_active: row.get::<_, i32>(12)? == 1,
            created_at: row.get(13)?,
            updated_at: row.get(14)?,
        })
    }).map_err(|e| e.to_string())?;

    rows.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
}

#[tauri::command]
fn get_transaction(state: tauri::State<AppState>, id: i64) -> Result<Transaction, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn.prepare(
        "SELECT id, account_id, transaction_type, amount, balance_after, counterparty_id,
                transaction_date, description, category_id, template_id, reference_no,
                attach_path, is_active, created_at, updated_at
         FROM transactions WHERE id = ?1"
    ).map_err(|e| e.to_string())?;

    stmt.query_row([id], |row| {
        Ok(Transaction {
            id: row.get(0)?,
            account_id: row.get(1)?,
            transaction_type: row.get::<_, String>(2)?.parse().unwrap_or(TransactionType::Adjustment),
            amount: row.get(3)?,
            balance_after: row.get(4)?,
            counterparty_id: row.get(5)?,
            transaction_date: row.get(6)?,
            description: row.get(7)?,
            category_id: row.get(8)?,
            template_id: row.get(9)?,
            reference_no: row.get(10)?,
            attach_path: row.get(11)?,
            is_active: row.get::<_, i32>(12)? == 1,
            created_at: row.get(13)?,
            updated_at: row.get(14)?,
        })
    }).map_err(|e| e.to_string())
}

#[tauri::command]
fn create_transaction(state: tauri::State<AppState>, transaction: Transaction) -> Result<i64, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let now = chrono::Utc::now().format("%Y-%m-%d %H:%M:%S").to_string();

    conn.execute(
        "INSERT INTO transactions (account_id, transaction_type, amount, balance_after, counterparty_id,
                                   transaction_date, description, category_id, template_id, reference_no,
                                   attach_path, is_active, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, 1, ?12, ?12)",
        rusqlite::params![
            transaction.account_id, transaction.transaction_type.to_string(),
            transaction.amount, transaction.balance_after, transaction.counterparty_id,
            transaction.transaction_date, transaction.description, transaction.category_id,
            transaction.template_id, transaction.reference_no, transaction.attach_path,
            now
        ],
    ).map_err(|e| e.to_string())?;

    // Update account balance
    let sign: f64 = match transaction.transaction_type {
        TransactionType::Income | TransactionType::Adjustment => 1.0,
        TransactionType::Expense | TransactionType::Transfer => -1.0,
    };
    conn.execute(
        "UPDATE accounts SET balance = balance + (?1 * ?2), updated_at = ?3 WHERE id = ?4",
        rusqlite::params![sign * transaction.amount, 1.0, now, transaction.account_id],
    ).map_err(|e| e.to_string())?;

    Ok(conn.last_insert_rowid())
}

#[tauri::command]
fn update_transaction(state: tauri::State<AppState>, transaction: Transaction) -> Result<(), String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let now = chrono::Utc::now().format("%Y-%m-%d %H:%M:%S").to_string();
    conn.execute(
        "UPDATE transactions SET account_id = ?1, transaction_type = ?2, amount = ?3, balance_after = ?4,
                                 counterparty_id = ?5, transaction_date = ?6, description = ?7,
                                 category_id = ?8, template_id = ?9, reference_no = ?10,
                                 attach_path = ?11, updated_at = ?12 WHERE id = ?13",
        rusqlite::params![
            transaction.account_id, transaction.transaction_type.to_string(),
            transaction.amount, transaction.balance_after, transaction.counterparty_id,
            transaction.transaction_date, transaction.description, transaction.category_id,
            transaction.template_id, transaction.reference_no, transaction.attach_path,
            now, transaction.id
        ],
    ).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn delete_transaction(state: tauri::State<AppState>, id: i64) -> Result<(), String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let now = chrono::Utc::now().format("%Y-%m-%d %H:%M:%S").to_string();
    conn.execute(
        "UPDATE transactions SET is_active = 0, updated_at = ?1 WHERE id = ?2",
        rusqlite::params![now, id],
    ).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn batch_create_transactions(
    state: tauri::State<AppState>,
    transactions: Vec<Transaction>,
) -> Result<Vec<i64>, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let now = chrono::Utc::now().format("%Y-%m-%d %H:%M:%S").to_string();
    let mut ids = Vec::new();

    for tx in transactions {
        conn.execute(
            "INSERT INTO transactions (account_id, transaction_type, amount, balance_after, counterparty_id,
                                       transaction_date, description, category_id, template_id, reference_no,
                                       attach_path, is_active, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, 1, ?12, ?12)",
            rusqlite::params![
                tx.account_id, tx.transaction_type.to_string(),
                tx.amount, tx.balance_after, tx.counterparty_id,
                tx.transaction_date, tx.description, tx.category_id,
                tx.template_id, tx.reference_no, tx.attach_path,
                now
            ],
        ).map_err(|e| e.to_string())?;

        let sign: f64 = match tx.transaction_type {
            TransactionType::Income | TransactionType::Adjustment => 1.0,
            TransactionType::Expense | TransactionType::Transfer => -1.0,
        };
        conn.execute(
            "UPDATE accounts SET balance = balance + (?1 * ?2), updated_at = ?3 WHERE id = ?4",
            rusqlite::params![sign * tx.amount, 1.0, now, tx.account_id],
        ).map_err(|e| e.to_string())?;

        ids.push(conn.last_insert_rowid());
    }
    Ok(ids)
}

// =============================================================================
// HOLDINGS
// =============================================================================

#[tauri::command]
fn get_holdings(
    state: tauri::State<AppState>,
    holding_type: Option<String>,
    include_archived: Option<bool>,
) -> Result<Vec<Holding>, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;

    let archived_filter = if include_archived.unwrap_or(false) {
        ""
    } else {
        " AND is_archived = 0"
    };

    let sql = if holding_type.is_some() {
        format!(
            "SELECT id, symbol, name, holding_type, account_id, shares, cost_basis, avg_cost,
                    current_price, current_value, unrealized_pnl, realized_pnl, currency,
                    risk_level, purchase_date, last_price_update, is_active, is_archived,
                    notes, created_at, updated_at
             FROM holdings WHERE is_active = 1{} AND holding_type = ?1 ORDER BY name",
            archived_filter
        )
    } else {
        format!(
            "SELECT id, symbol, name, holding_type, account_id, shares, cost_basis, avg_cost,
                    current_price, current_value, unrealized_pnl, realized_pnl, currency,
                    risk_level, purchase_date, last_price_update, is_active, is_archived,
                    notes, created_at, updated_at
             FROM holdings WHERE is_active = 1{} ORDER BY name",
            archived_filter
        )
    };

    let mut stmt = conn.prepare(&sql).map_err(|e| e.to_string())?;

    let rows = if let Some(ht) = holding_type {
        stmt.query_map([ht], |row| {
            Ok(Holding {
                id: row.get(0)?, symbol: row.get(1)?, name: row.get(2)?,
                holding_type: row.get::<_, String>(3)?.parse().unwrap_or(HoldingType::Other),
                account_id: row.get(4)?, shares: row.get(5)?, cost_basis: row.get(6)?,
                avg_cost: row.get(7)?, current_price: row.get(8)?, current_value: row.get(9)?,
                unrealized_pnl: row.get(10)?, realized_pnl: row.get(11)?, currency: row.get(12)?,
                risk_level: row.get(13)?, purchase_date: row.get(14)?,
                last_price_update: row.get(15)?, is_active: row.get::<_, i32>(16)? == 1,
                is_archived: row.get::<_, i32>(17)? == 1, notes: row.get(18)?,
                created_at: row.get(19)?, updated_at: row.get(20)?,
            })
        }).map_err(|e| e.to_string())?
    } else {
        stmt.query_map([], |row| {
            Ok(Holding {
                id: row.get(0)?, symbol: row.get(1)?, name: row.get(2)?,
                holding_type: row.get::<_, String>(3)?.parse().unwrap_or(HoldingType::Other),
                account_id: row.get(4)?, shares: row.get(5)?, cost_basis: row.get(6)?,
                avg_cost: row.get(7)?, current_price: row.get(8)?, current_value: row.get(9)?,
                unrealized_pnl: row.get(10)?, realized_pnl: row.get(11)?, currency: row.get(12)?,
                risk_level: row.get(13)?, purchase_date: row.get(14)?,
                last_price_update: row.get(15)?, is_active: row.get::<_, i32>(16)? == 1,
                is_archived: row.get::<_, i32>(17)? == 1, notes: row.get(18)?,
                created_at: row.get(19)?, updated_at: row.get(20)?,
            })
        }).map_err(|e| e.to_string())?
    };

    rows.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
}

#[tauri::command]
fn get_holding(state: tauri::State<AppState>, id: i64) -> Result<Holding, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn.prepare(
        "SELECT id, symbol, name, holding_type, account_id, shares, cost_basis, avg_cost,
                current_price, current_value, unrealized_pnl, realized_pnl, currency,
                risk_level, purchase_date, last_price_update, is_active, is_archived,
                notes, created_at, updated_at
         FROM holdings WHERE id = ?1"
    ).map_err(|e| e.to_string())?;

    stmt.query_row([id], |row| {
        Ok(Holding {
            id: row.get(0)?, symbol: row.get(1)?, name: row.get(2)?,
            holding_type: row.get::<_, String>(3)?.parse().unwrap_or(HoldingType::Other),
            account_id: row.get(4)?, shares: row.get(5)?, cost_basis: row.get(6)?,
            avg_cost: row.get(7)?, current_price: row.get(8)?, current_value: row.get(9)?,
            unrealized_pnl: row.get(10)?, realized_pnl: row.get(11)?, currency: row.get(12)?,
            risk_level: row.get(13)?, purchase_date: row.get(14)?,
            last_price_update: row.get(15)?, is_active: row.get::<_, i32>(16)? == 1,
            is_archived: row.get::<_, i32>(17)? == 1, notes: row.get(18)?,
            created_at: row.get(19)?, updated_at: row.get(20)?,
        })
    }).map_err(|e| e.to_string())
}

#[tauri::command]
fn create_holding(state: tauri::State<AppState>, holding: Holding) -> Result<i64, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let now = chrono::Utc::now().format("%Y-%m-%d %H:%M:%S").to_string();

    conn.execute(
        "INSERT INTO holdings (symbol, name, holding_type, account_id, shares, cost_basis, avg_cost,
                               current_price, current_value, unrealized_pnl, realized_pnl, currency,
                               risk_level, purchase_date, last_price_update, is_active, is_archived,
                               notes, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, 1, 0, ?16, ?17, ?17)",
        rusqlite::params![
            holding.symbol, holding.name, holding.holding_type.to_string(),
            holding.account_id, holding.shares, holding.cost_basis, holding.avg_cost,
            holding.current_price, holding.current_value, holding.unrealized_pnl,
            holding.realized_pnl, holding.currency, holding.risk_level,
            holding.purchase_date, holding.last_price_update, holding.notes,
            now
        ],
    ).map_err(|e| e.to_string())?;
    Ok(conn.last_insert_rowid())
}

#[tauri::command]
fn update_holding(state: tauri::State<AppState>, holding: Holding) -> Result<(), String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let now = chrono::Utc::now().format("%Y-%m-%d %H:%M:%S").to_string();
    conn.execute(
        "UPDATE holdings SET symbol = ?1, name = ?2, holding_type = ?3, account_id = ?4,
                             shares = ?5, cost_basis = ?6, avg_cost = ?7, current_price = ?8,
                             current_value = ?9, unrealized_pnl = ?10, realized_pnl = ?11,
                             currency = ?12, risk_level = ?13, purchase_date = ?14,
                             last_price_update = ?15, is_active = ?16, is_archived = ?17,
                             notes = ?18, updated_at = ?19 WHERE id = ?20",
        rusqlite::params![
            holding.symbol, holding.name, holding.holding_type.to_string(),
            holding.account_id, holding.shares, holding.cost_basis, holding.avg_cost,
            holding.current_price, holding.current_value, holding.unrealized_pnl,
            holding.realized_pnl, holding.currency, holding.risk_level,
            holding.purchase_date, holding.last_price_update,
            holding.is_active as i32, holding.is_archived as i32, holding.notes,
            now, holding.id
        ],
    ).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn delete_holding(state: tauri::State<AppState>, id: i64) -> Result<(), String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let now = chrono::Utc::now().format("%Y-%m-%d %H:%M:%S").to_string();
    conn.execute(
        "UPDATE holdings SET is_active = 0, updated_at = ?1 WHERE id = ?2",
        rusqlite::params![now, id],
    ).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn archive_holding(state: tauri::State<AppState>, id: i64) -> Result<(), String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let now = chrono::Utc::now().format("%Y-%m-%d %H:%M:%S").to_string();
    conn.execute(
        "UPDATE holdings SET is_archived = 1, updated_at = ?1 WHERE id = ?2",
        rusqlite::params![now, id],
    ).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn batch_update_holding_prices(
    state: tauri::State<AppState>,
    prices: Vec<(String, f64)>, // (symbol, price)
) -> Result<(), String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let now = chrono::Utc::now().format("%Y-%m-%d %H:%M:%S").to_string();

    for (symbol, price) in prices {
        // Update holdings with this symbol
        conn.execute(
            "UPDATE holdings SET current_price = ?1, current_value = shares * ?1,
                                 unrealized_pnl = (shares * ?1) - cost_basis,
                                 last_price_update = ?2, updated_at = ?2
             WHERE symbol = ?3 AND is_active = 1",
            rusqlite::params![price, now, symbol],
        ).map_err(|e| e.to_string())?;
    }
    Ok(())
}

// =============================================================================
// PRICES
// =============================================================================

#[tauri::command]
fn get_prices(
    state: tauri::State<AppState>,
    symbol: String,
    start_date: Option<String>,
    end_date: Option<String>,
    limit: Option<i64>,
) -> Result<Vec<Price>, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;

    let mut sql = "SELECT id, symbol, price, price_date, change_percent, volume, source, created_at
                   FROM prices WHERE symbol = ?1".to_string();
    let mut params_vec: Vec<Box<dyn rusqlite::ToSql>> = vec![Box::new(symbol)];

    if start_date.is_some() {
        sql.push_str(" AND price_date >= ?");
        params_vec.push(Box::new(start_date.unwrap()));
    }
    if end_date.is_some() {
        sql.push_str(" AND price_date <= ?");
        params_vec.push(Box::new(end_date.unwrap()));
    }
    sql.push_str(" ORDER BY price_date DESC");
    if let Some(l) = limit {
        sql.push_str(&format!(" LIMIT {}", l));
    }

    let params_refs: Vec<&dyn rusqlite::ToSql> = params_vec.iter().map(|b| b.as_ref()).collect();
    let mut stmt = conn.prepare(&sql).map_err(|e| e.to_string())?;

    let rows = stmt.query_map(params_refs.as_slice(), |row| {
        Ok(Price {
            id: row.get(0)?,
            symbol: row.get(1)?,
            price: row.get(2)?,
            price_date: row.get(3)?,
            change_percent: row.get(4)?,
            volume: row.get(5)?,
            source: row.get(6)?,
            created_at: row.get(7)?,
        })
    }).map_err(|e| e.to_string())?;

    rows.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
}

#[tauri::command]
fn create_price(state: tauri::State<AppState>, price: Price) -> Result<i64, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "INSERT OR REPLACE INTO prices (symbol, price, price_date, change_percent, volume, source)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        rusqlite::params![
            price.symbol, price.price, price.price_date,
            price.change_percent, price.volume, price.source
        ],
    ).map_err(|e| e.to_string())?;
    Ok(conn.last_insert_rowid())
}

#[tauri::command]
fn batch_create_prices(state: tauri::State<AppState>, prices: Vec<Price>) -> Result<Vec<i64>, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let mut ids = Vec::new();
    for p in prices {
        conn.execute(
            "INSERT OR REPLACE INTO prices (symbol, price, price_date, change_percent, volume, source)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
            rusqlite::params![
                p.symbol, p.price, p.price_date,
                p.change_percent, p.volume, p.source
            ],
        ).map_err(|e| e.to_string())?;
        ids.push(conn.last_insert_rowid());
    }
    Ok(ids)
}

// =============================================================================
// TEMPLATES
// =============================================================================

#[tauri::command]
fn get_templates(
    state: tauri::State<AppState>,
    template_type: Option<String>,
) -> Result<Vec<Template>, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;

    let sql = if template_type.is_some() {
        "SELECT id, name, description, template_type, category_id, account_type, transaction_type,
                amount, counterparty_id, notes, is_active, use_count, last_used_at,
                created_at, updated_at
         FROM templates WHERE is_active = 1 AND template_type = ?1 ORDER BY use_count DESC, name"
    } else {
        "SELECT id, name, description, template_type, category_id, account_type, transaction_type,
                amount, counterparty_id, notes, is_active, use_count, last_used_at,
                created_at, updated_at
         FROM templates WHERE is_active = 1 ORDER BY use_count DESC, name"
    };

    let mut stmt = conn.prepare(sql).map_err(|e| e.to_string())?;

    let rows = if let Some(tt) = template_type {
        stmt.query_map([tt], |row| {
            let tt_str: Option<String> = row.get(6)?;
            let tt_enum = tt_str.map(|s| TransactionType::from_str(&s).unwrap_or(TransactionType::Income));
            Ok(Template {
                id: row.get(0)?, name: row.get(1)?, description: row.get(2)?,
                template_type: TemplateType::from_str(&row.get::<_, String>(3)?).unwrap_or(TemplateType::Transaction),
                category_id: row.get(4)?, account_type: row.get(5)?, transaction_type: tt_enum,
                amount: row.get(7)?, counterparty_id: row.get(8)?, notes: row.get(9)?,
                is_active: row.get::<_, i32>(10)? == 1, use_count: row.get(11)?,
                last_used_at: row.get(12)?, created_at: row.get(13)?, updated_at: row.get(14)?,
            })
        }).map_err(|e| e.to_string())?
    } else {
        stmt.query_map([], |row| {
            let tt_str: Option<String> = row.get(6)?;
            let tt_enum = tt_str.map(|s| TransactionType::from_str(&s).unwrap_or(TransactionType::Income));
            Ok(Template {
                id: row.get(0)?, name: row.get(1)?, description: row.get(2)?,
                template_type: TemplateType::from_str(&row.get::<_, String>(3)?).unwrap_or(TemplateType::Transaction),
                category_id: row.get(4)?, account_type: row.get(5)?, transaction_type: tt_enum,
                amount: row.get(7)?, counterparty_id: row.get(8)?, notes: row.get(9)?,
                is_active: row.get::<_, i32>(10)? == 1, use_count: row.get(11)?,
                last_used_at: row.get(12)?, created_at: row.get(13)?, updated_at: row.get(14)?,
            })
        }).map_err(|e| e.to_string())?
    };

    rows.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
}

#[tauri::command]
fn create_template(state: tauri::State<AppState>, template: Template) -> Result<i64, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let now = chrono::Utc::now().format("%Y-%m-%d %H:%M:%S").to_string();
    conn.execute(
        "INSERT INTO templates (name, description, template_type, category_id, account_type,
                                 transaction_type, amount, counterparty_id, notes, is_active,
                                 use_count, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, 1, 0, ?10, ?10)",
        rusqlite::params![
            template.name, template.description, template.template_type.to_string(),
            template.category_id, template.account_type,
            template.transaction_type.map(|t| t.to_string()),
            template.amount, template.counterparty_id, template.notes,
            now
        ],
    ).map_err(|e| e.to_string())?;
    Ok(conn.last_insert_rowid())
}

#[tauri::command]
fn update_template(state: tauri::State<AppState>, template: Template) -> Result<(), String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let now = chrono::Utc::now().format("%Y-%m-%d %H:%M:%S").to_string();
    conn.execute(
        "UPDATE templates SET name = ?1, description = ?2, template_type = ?3, category_id = ?4,
                               account_type = ?5, transaction_type = ?6, amount = ?7,
                               counterparty_id = ?8, notes = ?9, is_active = ?10, updated_at = ?11
         WHERE id = ?12",
        rusqlite::params![
            template.name, template.description, template.template_type.to_string(),
            template.category_id, template.account_type,
            template.transaction_type.map(|t| t.to_string()),
            template.amount, template.counterparty_id, template.notes,
            template.is_active as i32, now, template.id
        ],
    ).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn delete_template(state: tauri::State<AppState>, id: i64) -> Result<(), String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let now = chrono::Utc::now().format("%Y-%m-%d %H:%M:%S").to_string();
    conn.execute(
        "UPDATE templates SET is_active = 0, updated_at = ?1 WHERE id = ?2",
        rusqlite::params![now, id],
    ).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn increment_template_use_count(state: tauri::State<AppState>, id: i64) -> Result<(), String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let now = chrono::Utc::now().format("%Y-%m-%d %H:%M:%S").to_string();
    conn.execute(
        "UPDATE templates SET use_count = use_count + 1, last_used_at = ?1, updated_at = ?1 WHERE id = ?2",
        rusqlite::params![now, id],
    ).map_err(|e| e.to_string())?;
    Ok(())
}

// =============================================================================
// SNAPSHOTS
// =============================================================================

#[tauri::command]
fn get_snapshots(
    state: tauri::State<AppState>,
    snapshot_type: Option<String>,
    limit: Option<i64>,
) -> Result<Vec<Snapshot>, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;

    let sql = if snapshot_type.is_some() {
        "SELECT id, snapshot_date, snapshot_type, total_assets, total_liabilities, net_assets,
                asset_breakdown, liability_breakdown, holdings_value, cash_flow, notes, created_at
         FROM snapshots WHERE snapshot_type = ?1 ORDER BY snapshot_date DESC"
    } else {
        "SELECT id, snapshot_date, snapshot_type, total_assets, total_liabilities, net_assets,
                asset_breakdown, liability_breakdown, holdings_value, cash_flow, notes, created_at
         FROM snapshots ORDER BY snapshot_date DESC"
    };

    let mut stmt = conn.prepare(sql).map_err(|e| e.to_string())?;

    let rows = if let Some(st) = snapshot_type {
        stmt.query_map([st], |row| {
            Ok(Snapshot {
                id: row.get(0)?, snapshot_date: row.get(1)?, snapshot_type: row.get(2)?,
                total_assets: row.get(3)?, total_liabilities: row.get(4)?, net_assets: row.get(5)?,
                asset_breakdown: row.get(6)?, liability_breakdown: row.get(7)?,
                holdings_value: row.get(8)?, cash_flow: row.get(9)?, notes: row.get(10)?,
                created_at: row.get(11)?,
            })
        }).map_err(|e| e.to_string())?
    } else {
        stmt.query_map([], |row| {
            Ok(Snapshot {
                id: row.get(0)?, snapshot_date: row.get(1)?, snapshot_type: row.get(2)?,
                total_assets: row.get(3)?, total_liabilities: row.get(4)?, net_assets: row.get(5)?,
                asset_breakdown: row.get(6)?, liability_breakdown: row.get(7)?,
                holdings_value: row.get(8)?, cash_flow: row.get(9)?, notes: row.get(10)?,
                created_at: row.get(11)?,
            })
        }).map_err(|e| e.to_string())?
    };

    rows.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
}

#[tauri::command]
fn get_snapshot(state: tauri::State<AppState>, id: i64) -> Result<Snapshot, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn.prepare(
        "SELECT id, snapshot_date, snapshot_type, total_assets, total_liabilities, net_assets,
                asset_breakdown, liability_breakdown, holdings_value, cash_flow, notes, created_at
         FROM snapshots WHERE id = ?1"
    ).map_err(|e| e.to_string())?;

    stmt.query_row([id], |row| {
        Ok(Snapshot {
            id: row.get(0)?, snapshot_date: row.get(1)?, snapshot_type: row.get(2)?,
            total_assets: row.get(3)?, total_liabilities: row.get(4)?, net_assets: row.get(5)?,
            asset_breakdown: row.get(6)?, liability_breakdown: row.get(7)?,
            holdings_value: row.get(8)?, cash_flow: row.get(9)?, notes: row.get(10)?,
            created_at: row.get(11)?,
        })
    }).map_err(|e| e.to_string())
}

#[tauri::command]
fn create_snapshot(state: tauri::State<AppState>, snapshot: Snapshot) -> Result<i64, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "INSERT INTO snapshots (snapshot_date, snapshot_type, total_assets, total_liabilities,
                                 net_assets, asset_breakdown, liability_breakdown, holdings_value,
                                 cash_flow, notes)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
        rusqlite::params![
            snapshot.snapshot_date, snapshot.snapshot_type,
            snapshot.total_assets, snapshot.total_liabilities, snapshot.net_assets,
            snapshot.asset_breakdown, snapshot.liability_breakdown,
            snapshot.holdings_value, snapshot.cash_flow, snapshot.notes
        ],
    ).map_err(|e| e.to_string())?;
    Ok(conn.last_insert_rowid())
}

#[tauri::command]
fn delete_snapshot(state: tauri::State<AppState>, id: i64) -> Result<(), String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM snapshots WHERE id = ?1", [id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn create_auto_snapshot(state: tauri::State<AppState>) -> Result<i64, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let now = chrono::Utc::now().format("%Y-%m-%d").to_string();

    // Calculate totals
    let total_assets: f64 = conn.query_row(
        "SELECT COALESCE(SUM(balance), 0) FROM accounts WHERE type = 'asset' AND is_active = 1",
        [], |row| row.get(0)
    ).unwrap_or(0.0);

    let total_liabilities: f64 = conn.query_row(
        "SELECT COALESCE(SUM(balance), 0) FROM accounts WHERE type = 'liability' AND is_active = 1",
        [], |row| row.get(0)
    ).unwrap_or(0.0);

    let holdings_value: f64 = conn.query_row(
        "SELECT COALESCE(SUM(current_value), 0) FROM holdings WHERE is_active = 1",
        [], |row| row.get(0)
    ).unwrap_or(0.0);

    let net_assets = total_assets - total_liabilities;

    conn.execute(
        "INSERT INTO snapshots (snapshot_date, snapshot_type, total_assets, total_liabilities,
                                 net_assets, holdings_value)
         VALUES (?1, 'auto', ?2, ?3, ?4, ?5)",
        rusqlite::params![now, total_assets, total_liabilities, net_assets, holdings_value],
    ).map_err(|e| e.to_string())?;
    Ok(conn.last_insert_rowid())
}

// =============================================================================
// REMINDERS
// =============================================================================

#[tauri::command]
fn get_reminders(
    state: tauri::State<AppState>,
    reminder_type: Option<String>,
    is_active: Option<bool>,
    include_completed: Option<bool>,
) -> Result<Vec<Reminder>, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;

    let mut sql = "SELECT id, title, reminder_type, account_id, holding_id, target_date,
                   advance_days, is_repeating, repeat_interval, repeat_unit, is_active,
                   is_completed, completed_at, notes, created_at, updated_at
                   FROM reminders WHERE 1=1".to_string();
    let mut params_vec: Vec<Box<dyn rusqlite::ToSql>> = Vec::new();

    if let Some(rt) = reminder_type {
        sql.push_str(" AND reminder_type = ?");
        params_vec.push(Box::new(rt));
    }
    if let Some(ia) = is_active {
        sql.push_str(" AND is_active = ?");
        params_vec.push(Box::new(ia as i32));
    }
    if !include_completed.unwrap_or(false) {
        sql.push_str(" AND is_completed = 0");
    }
    sql.push_str(" ORDER BY target_date ASC");

    let params_refs: Vec<&dyn rusqlite::ToSql> = params_vec.iter().map(|b| b.as_ref()).collect();
    let mut stmt = conn.prepare(&sql).map_err(|e| e.to_string())?;

    let rows = stmt.query_map(params_refs.as_slice(), |row| {
        Ok(Reminder {
            id: row.get(0)?, title: row.get(1)?,
            reminder_type: ReminderType::from_str(&row.get::<_, String>(2)?).unwrap_or(ReminderType::Custom),
            account_id: row.get(3)?, holding_id: row.get(4)?, target_date: row.get(5)?,
            advance_days: row.get(6)?, is_repeating: row.get::<_, i32>(7)? == 1,
            repeat_interval: row.get(8)?, repeat_unit: row.get(9)?,
            is_active: row.get::<_, i32>(10)? == 1,
            is_completed: row.get::<_, i32>(11)? == 1, completed_at: row.get(12)?,
            notes: row.get(13)?, created_at: row.get(14)?, updated_at: row.get(15)?,
        })
    }).map_err(|e| e.to_string())?;

    rows.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
}

#[tauri::command]
fn get_pending_reminders(state: tauri::State<AppState>) -> Result<Vec<Reminder>, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let now = chrono::Utc::now().format("%Y-%m-%d").to_string();
    let future = chrono::Utc::now()
        .checked_add_signed(chrono::Duration::days(30))
        .unwrap()
        .format("%Y-%m-%d")
        .to_string();

    let mut stmt = conn.prepare(
        "SELECT id, title, reminder_type, account_id, holding_id, target_date,
                advance_days, is_repeating, repeat_interval, repeat_unit, is_active,
                is_completed, completed_at, notes, created_at, updated_at
         FROM reminders
         WHERE is_active = 1 AND is_completed = 0
           AND date(target_date, '-' || advance_days || ' days') <= ?1
           AND target_date <= ?2
         ORDER BY target_date ASC"
    ).map_err(|e| e.to_string())?;

    let rows = stmt.query_map([&now, &future], |row| {
        Ok(Reminder {
            id: row.get(0)?, title: row.get(1)?,
            reminder_type: ReminderType::from_str(&row.get::<_, String>(2)?).unwrap_or(ReminderType::Custom),
            account_id: row.get(3)?, holding_id: row.get(4)?, target_date: row.get(5)?,
            advance_days: row.get(6)?, is_repeating: row.get::<_, i32>(7)? == 1,
            repeat_interval: row.get(8)?, repeat_unit: row.get(9)?,
            is_active: row.get::<_, i32>(10)? == 1,
            is_completed: row.get::<_, i32>(11)? == 1, completed_at: row.get(12)?,
            notes: row.get(13)?, created_at: row.get(14)?, updated_at: row.get(15)?,
        })
    }).map_err(|e| e.to_string())?;

    rows.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
}

#[tauri::command]
fn create_reminder(state: tauri::State<AppState>, reminder: Reminder) -> Result<i64, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let now = chrono::Utc::now().format("%Y-%m-%d %H:%M:%S").to_string();
    conn.execute(
        "INSERT INTO reminders (title, reminder_type, account_id, holding_id, target_date,
                                advance_days, is_repeating, repeat_interval, repeat_unit,
                                is_active, is_completed, notes, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, 1, 0, ?10, ?11, ?11)",
        rusqlite::params![
            reminder.title, reminder.reminder_type.to_string(),
            reminder.account_id, reminder.holding_id, reminder.target_date,
            reminder.advance_days, reminder.is_repeating as i32,
            reminder.repeat_interval, reminder.repeat_unit, reminder.notes,
            now
        ],
    ).map_err(|e| e.to_string())?;
    Ok(conn.last_insert_rowid())
}

#[tauri::command]
fn update_reminder(state: tauri::State<AppState>, reminder: Reminder) -> Result<(), String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let now = chrono::Utc::now().format("%Y-%m-%d %H:%M:%S").to_string();
    conn.execute(
        "UPDATE reminders SET title = ?1, reminder_type = ?2, account_id = ?3, holding_id = ?4,
                               target_date = ?5, advance_days = ?6, is_repeating = ?7,
                               repeat_interval = ?8, repeat_unit = ?9, is_active = ?10,
                               notes = ?11, updated_at = ?12 WHERE id = ?13",
        rusqlite::params![
            reminder.title, reminder.reminder_type.to_string(),
            reminder.account_id, reminder.holding_id, reminder.target_date,
            reminder.advance_days, reminder.is_repeating as i32,
            reminder.repeat_interval, reminder.repeat_unit,
            reminder.is_active as i32, reminder.notes, now, reminder.id
        ],
    ).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn delete_reminder(state: tauri::State<AppState>, id: i64) -> Result<(), String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let now = chrono::Utc::now().format("%Y-%m-%d %H:%M:%S").to_string();
    conn.execute(
        "UPDATE reminders SET is_active = 0, updated_at = ?1 WHERE id = ?2",
        rusqlite::params![now, id],
    ).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn complete_reminder(state: tauri::State<AppState>, id: i64) -> Result<(), String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let now = chrono::Utc::now().format("%Y-%m-%d %H:%M:%S").to_string();

    // Check if it's repeating, if so schedule next occurrence
    let is_repeating: bool = conn.query_row(
        "SELECT is_repeating FROM reminders WHERE id = ?1",
        [id], |row| Ok(row.get::<_, i32>(0)? == 1)
    ).map_err(|e| e.to_string())?;

    if is_repeating {
        let repeat_interval: i32 = conn.query_row(
            "SELECT repeat_interval FROM reminders WHERE id = ?1",
            [id], |row| row.get::<_, Option<i32>>(0)
        ).map_err(|e| e.to_string())?.unwrap_or(30);
        let repeat_unit: String = conn.query_row(
            "SELECT repeat_unit FROM reminders WHERE id = ?1",
            [id], |row| row.get::<_, Option<String>>(0)
        ).map_err(|e| e.to_string())?.unwrap_or_else(|| "day".to_string());

        let next_date = match repeat_unit.as_str() {
            "day" => chrono::Utc::now().checked_add_signed(chrono::Duration::days(repeat_interval as i64)),
            "week" => chrono::Utc::now().checked_add_signed(chrono::Duration::weeks(repeat_interval as i64)),
            "month" => chrono::Utc::now().checked_add_signed(chrono::Duration::days((repeat_interval as i64) * 30)),
            "year" => chrono::Utc::now().checked_add_signed(chrono::Duration::days((repeat_interval as i64) * 365)),
            _ => None,
        };

        if let Some(nd) = next_date {
            conn.execute(
                "UPDATE reminders SET is_completed = 1, completed_at = ?1, target_date = ?2, updated_at = ?1 WHERE id = ?3",
                rusqlite::params![now, nd.format("%Y-%m-%d").to_string(), id],
            ).map_err(|e| e.to_string())?;
        }
    } else {
        conn.execute(
            "UPDATE reminders SET is_completed = 1, completed_at = ?1, updated_at = ?1 WHERE id = ?2",
            rusqlite::params![now, id],
        ).map_err(|e| e.to_string())?;
    }
    Ok(())
}

// =============================================================================
// SETTINGS
// =============================================================================

#[tauri::command]
fn get_settings(state: tauri::State<AppState>) -> Result<Vec<Setting>, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn.prepare(
        "SELECT key, value, value_type, description, updated_at FROM settings"
    ).map_err(|e| e.to_string())?;

    let rows = stmt.query_map([], |row| {
        Ok(Setting {
            key: row.get(0)?,
            value: row.get(1)?,
            value_type: row.get(2)?,
            description: row.get(3)?,
            updated_at: row.get(4)?,
        })
    }).map_err(|e| e.to_string())?;

    rows.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
}

#[tauri::command]
fn get_setting(state: tauri::State<AppState>, key: String) -> Result<Option<Setting>, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let result = conn.query_row(
        "SELECT key, value, value_type, description, updated_at FROM settings WHERE key = ?1",
        [&key],
        |row| {
            Ok(Setting {
                key: row.get(0)?,
                value: row.get(1)?,
                value_type: row.get(2)?,
                description: row.get(3)?,
                updated_at: row.get(4)?,
            })
        },
    );
    match result {
        Ok(s) => Ok(Some(s)),
        Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
        Err(e) => Err(e.to_string()),
    }
}

#[tauri::command]
fn set_setting(
    state: tauri::State<AppState>,
    key: String,
    value: String,
    value_type: String,
    description: Option<String>,
) -> Result<(), String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let now = chrono::Utc::now().format("%Y-%m-%d %H:%M:%S").to_string();
    conn.execute(
        "INSERT OR REPLACE INTO settings (key, value, value_type, description, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5)",
        rusqlite::params![key, value, value_type, description, now],
    ).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn delete_setting(state: tauri::State<AppState>, key: String) -> Result<(), String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM settings WHERE key = ?1", [&key])
        .map_err(|e| e.to_string())?;
    Ok(())
}

// =============================================================================
// PASSWORD SECURITY (Argon2)
// =============================================================================

use argon2::{
    password_hash::{rand_core::OsRng, PasswordHash, PasswordHasher, PasswordVerifier, SaltString},
    Argon2,
};

fn hash_password(password: &str) -> Result<String, String> {
    let salt = SaltString::generate(&mut OsRng);
    let argon2 = Argon2::default();
    let hash = argon2
        .hash_password(password.as_bytes(), &salt)
        .map_err(|e| e.to_string())?;
    Ok(hash.to_string())
}

fn verify_password(password: &str, hash: &str) -> Result<bool, String> {
    let parsed_hash = PasswordHash::new(hash).map_err(|e| e.to_string())?;
    Ok(Argon2::default()
        .verify_password(password.as_bytes(), &parsed_hash)
        .is_ok())
}

#[tauri::command]
fn check_password(state: tauri::State<AppState>, password: String) -> Result<bool, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let result = conn.query_row(
        "SELECT value FROM settings WHERE key = 'app_password'",
        [],
        |row| row.get::<_, String>(0),
    );
    match result {
        Ok(stored_hash) => verify_password(&password, &stored_hash),
        Err(rusqlite::Error::QueryReturnedNoRows) => Ok(false),
        Err(e) => Err(e.to_string()),
    }
}

#[tauri::command]
fn set_password(state: tauri::State<AppState>, password: String) -> Result<(), String> {
    if password.len() < 6 {
        return Err("密码长度不能少于6位".to_string());
    }
    let hash = hash_password(&password)?;
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let now = chrono::Utc::now().format("%Y-%m-%d %H:%M:%S").to_string();
    conn.execute(
        "INSERT OR REPLACE INTO settings (key, value, value_type, description, updated_at)
         VALUES ('app_password', ?1, 'string', '应用程序密码', ?2)",
        rusqlite::params![hash, now],
    ).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn has_password(state: tauri::State<AppState>) -> Result<bool, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let count: i32 = conn.query_row(
        "SELECT COUNT(*) FROM settings WHERE key = 'app_password'",
        [],
        |row| row.get(0),
    ).map_err(|e| e.to_string())?;
    Ok(count > 0)
}

// =============================================================================
// BACKUP & RESTORE
// =============================================================================

#[derive(Debug, Clone, serde::Serialize)]
pub struct BackupInfo {
    pub filename: String,
    pub path: String,
    pub created_at: String,
    pub size_bytes: u64,
}

fn get_backup_dir(app: &tauri::AppHandle) -> Result<std::path::PathBuf, String> {
    let app_data_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    let backup_dir = app_data_dir.join("backups");
    if !backup_dir.exists() {
        std::fs::create_dir_all(&backup_dir).map_err(|e| e.to_string())?;
    }
    Ok(backup_dir)
}

fn get_db_path(app: &tauri::AppHandle) -> Result<std::path::PathBuf, String> {
    let app_data_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    Ok(app_data_dir.join("lcgl.db"))
}

#[tauri::command]
fn create_backup(app: tauri::AppHandle) -> Result<BackupInfo, String> {
    let backup_dir = get_backup_dir(&app)?;
    let db_path = get_db_path(&app)?;
    let timestamp = chrono::Utc::now().format("%Y%m%d_%H%M%S").to_string();
    let backup_filename = format!("lcgl_backup_{}.db", timestamp);
    let backup_path = backup_dir.join(&backup_filename);

    std::fs::copy(&db_path, &backup_path).map_err(|e| format!("备份创建失败: {}", e))?;
    let metadata = std::fs::metadata(&backup_path).map_err(|e| e.to_string())?;
    let size_bytes = metadata.len();
    let created_at = chrono::Utc::now().format("%Y-%m-%d %H:%M:%S").to_string();

    // Cleanup old backups if max_count is set
    if let Ok(max_count) = get_auto_backup_max_count_internal(&app) {
        cleanup_old_backups(&app, max_count)?;
    }

    Ok(BackupInfo {
        filename: backup_filename,
        path: backup_path.to_string_lossy().to_string(),
        created_at,
        size_bytes,
    })
}

fn get_auto_backup_max_count_internal(app: &tauri::AppHandle) -> Result<i32, String> {
    // This is a simplified internal function - actual impl would query settings
    Ok(10)
}

fn cleanup_old_backups(app: &tauri::AppHandle, max_count: i32) -> Result<(), String> {
    let backup_dir = get_backup_dir(app)?;
    let mut entries: Vec<_> = std::fs::read_dir(&backup_dir)
        .map_err(|e| e.to_string())?
        .filter_map(|e| e.ok())
        .filter(|e| {
            e.file_name().to_string_lossy().starts_with("lcgl_backup_")
        })
        .collect();
    entries.sort_by_key(|e| std::cmp::Reverse(e.metadata().and_then(|m| m.created()).ok()));

    if entries.len() > max_count as usize {
        for entry in entries.iter().skip(max_count as usize) {
            let _ = std::fs::remove_file(entry.path());
        }
    }
    Ok(())
}

#[tauri::command]
fn list_backups(app: tauri::AppHandle) -> Result<Vec<BackupInfo>, String> {
    let backup_dir = get_backup_dir(&app)?;
    let entries: Vec<BackupInfo> = std::fs::read_dir(&backup_dir)
        .map_err(|e| e.to_string())?
        .filter_map(|e| e.ok())
        .filter(|e| {
            e.file_name().to_string_lossy().starts_with("lcgl_backup_")
        })
        .filter_map(|e| {
            let metadata = e.metadata().ok()?;
            let created_at = metadata
                .created()
                .ok()
                .and_then(|t| {
                    let datetime: chrono::DateTime<chrono::Utc> = t.into();
                    Some(datetime.format("%Y-%m-%d %H:%M:%S").to_string())
                })
                .unwrap_or_else(|| "Unknown".to_string());
            Some(BackupInfo {
                filename: e.file_name().to_string_lossy().to_string(),
                path: e.path().to_string_lossy().to_string(),
                created_at,
                size_bytes: metadata.len(),
            })
        })
        .collect();
    Ok(entries)
}

#[tauri::command]
fn restore_backup(app: tauri::AppHandle, filename: String) -> Result<(), String> {
    let backup_dir = get_backup_dir(&app)?;
    let backup_path = backup_dir.join(&filename);
    let db_path = get_db_path(&app)?;

    if !backup_path.exists() {
        return Err("备份文件不存在".to_string());
    }

    // Close current DB connection by dropping the state temporarily
    // Then copy backup over and reinitialize
    std::fs::copy(&backup_path, &db_path).map_err(|e| format!("恢复失败: {}", e))?;
    Ok(())
}

#[tauri::command]
fn delete_backup(app: tauri::AppHandle, filename: String) -> Result<(), String> {
    let backup_dir = get_backup_dir(&app)?;
    let backup_path = backup_dir.join(&filename);
    if backup_path.exists() {
        std::fs::remove_file(&backup_path).map_err(|e| format!("删除失败: {}", e))?;
    }
    Ok(())
}

#[tauri::command]
fn get_auto_backup_config(app: tauri::AppHandle) -> Result<(bool, i32), String> {
    let app_data_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    let config_path = app_data_dir.join("backup_config.json");
    if config_path.exists() {
        let content = std::fs::read_to_string(&config_path).map_err(|e| e.to_string())?;
        let config: serde_json::Value = serde_json::from_str(&content).map_err(|e| e.to_string())?;
        let enabled = config.get("enabled").and_then(|v| v.as_bool()).unwrap_or(false);
        let max_count = config.get("max_count").and_then(|v| v.as_i64()).unwrap_or(10) as i32;
        Ok((enabled, max_count))
    } else {
        Ok((false, 10))
    }
}

#[tauri::command]
fn set_auto_backup_config(app: tauri::AppHandle, enabled: bool, max_count: i32) -> Result<(), String> {
    let app_data_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    std::fs::create_dir_all(&app_data_dir).map_err(|e| e.to_string())?;
    let config_path = app_data_dir.join("backup_config.json");
    let config = serde_json::json!({
        "enabled": enabled,
        "max_count": max_count
    });
    std::fs::write(&config_path, serde_json::to_string_pretty(&config).map_err(|e| e.to_string())?)
        .map_err(|e| e.to_string())?;
    Ok(())
}

// =============================================================================
// APP ENTRY
// =============================================================================

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_fs::init())
        .setup(|app| {
            let app_data_dir = app.path().app_data_dir()
                .expect("Failed to get app data directory");

            std::fs::create_dir_all(&app_data_dir)
                .expect("Failed to create app data directory");

            let db_path = app_data_dir.join("lcgl.db");
            println!("Database path: {:?}", db_path);

            let conn = initialize_database(&db_path)
                .expect("Failed to initialize database");

            app.manage(AppState {
                db: Mutex::new(conn),
            });

            println!("Database initialized successfully");
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // Utility
            greet,
            get_db_version,
            // Password security
            check_password,
            set_password,
            has_password,
            // Backup & restore
            create_backup,
            list_backups,
            restore_backup,
            delete_backup,
            get_auto_backup_config,
            set_auto_backup_config,
            // Account categories
            get_all_account_categories,
            create_account_category,
            update_account_category,
            delete_account_category,
            // Accounts
            get_all_accounts,
            get_account,
            create_account,
            update_account,
            update_account_balance,
            delete_account,
            archive_account,
            // Transactions
            get_transactions,
            get_transaction,
            create_transaction,
            update_transaction,
            delete_transaction,
            batch_create_transactions,
            // Holdings
            get_holdings,
            get_holding,
            create_holding,
            update_holding,
            delete_holding,
            archive_holding,
            batch_update_holding_prices,
            // Prices
            get_prices,
            create_price,
            batch_create_prices,
            // Templates
            get_templates,
            create_template,
            update_template,
            delete_template,
            increment_template_use_count,
            // Snapshots
            get_snapshots,
            get_snapshot,
            create_snapshot,
            delete_snapshot,
            create_auto_snapshot,
            // Reminders
            get_reminders,
            get_pending_reminders,
            create_reminder,
            update_reminder,
            delete_reminder,
            complete_reminder,
            // Settings
            get_settings,
            get_setting,
            set_setting,
            delete_setting,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
