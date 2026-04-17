-- LCGL Database Schema
-- Personal Finance Management Application
-- Version: 1.0.0

-- Enable foreign keys
PRAGMA foreign_keys = ON;

-- ============================================
-- SCHEMA VERSION TRACKING
-- ============================================
CREATE TABLE IF NOT EXISTS schema_version (
    version INTEGER PRIMARY KEY,
    applied_at TEXT NOT NULL DEFAULT (datetime('now')),
    description TEXT
);

-- ============================================
-- ACCOUNT CATEGORIES (账户分类)
-- ============================================
CREATE TABLE IF NOT EXISTS account_categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,                           -- Category name (e.g., "活期存款", "房产")
    parent_id INTEGER,                             -- Parent category for sub-categories
    type TEXT NOT NULL CHECK(type IN ('asset', 'liability')),  -- 资产 or 负债
    icon TEXT,                                    -- Icon name for UI
    color TEXT,                                   -- Color code for UI
    sort_order INTEGER DEFAULT 0,                 -- Display order
    is_active INTEGER DEFAULT 1,                  -- Soft delete flag
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (parent_id) REFERENCES account_categories(id) ON DELETE SET NULL
);

-- Indexes for account_categories
CREATE INDEX IF NOT EXISTS idx_account_categories_parent ON account_categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_account_categories_type ON account_categories(type);
CREATE INDEX IF NOT EXISTS idx_account_categories_active ON account_categories(is_active);

-- ============================================
-- ACCOUNTS (账户/资产/负债台账)
-- ============================================
CREATE TABLE IF NOT EXISTS accounts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,                           -- Account name
    category_id INTEGER NOT NULL,                 -- FK to account_categories
    account_type TEXT NOT NULL CHECK(account_type IN ('asset', 'liability')),  -- 资产 or 负债
    balance REAL NOT NULL DEFAULT 0,              -- Current balance/amount
    currency TEXT DEFAULT 'CNY',                  -- Currency code
    institution TEXT,                             -- Bank/institution name
    account_no TEXT,                              -- Account number (encrypted in production)
    interest_rate REAL,                          -- Interest rate (for loans/deposits)
    term_months INTEGER,                         -- Term in months (for loans/deposits)
    start_date TEXT,                              -- Start date
    maturity_date TEXT,                           -- Maturity date
    payment_due_day INTEGER,                      -- Monthly payment due day
    is_active INTEGER DEFAULT 1,                  -- Soft delete flag
    isarchived INTEGER DEFAULT 0,                -- Archive flag for closed accounts
    notes TEXT,                                   -- Additional notes
    extra_data TEXT,                              -- JSON for additional fields
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (category_id) REFERENCES account_categories(id)
);

-- Indexes for accounts
CREATE INDEX IF NOT EXISTS idx_accounts_category ON accounts(category_id);
CREATE INDEX IF NOT EXISTS idx_accounts_type ON accounts(account_type);
CREATE INDEX IF NOT EXISTS idx_accounts_active ON accounts(is_active);
CREATE INDEX IF NOT EXISTS idx_accounts_maturity ON accounts(maturity_date);

-- ============================================
-- TRANSACTIONS (交易记录)
-- ============================================
CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    account_id INTEGER NOT NULL,                 -- FK to accounts
    transaction_type TEXT NOT NULL CHECK(transaction_type IN ('income', 'expense', 'transfer', 'adjustment')),
    amount REAL NOT NULL,                         -- Transaction amount (positive)
    balance_after REAL,                           -- Balance after transaction
    counterparty_id INTEGER,                      -- FK to accounts (for transfers)
    transaction_date TEXT NOT NULL,               -- Date of transaction
    description TEXT,                             -- Description
    category_id INTEGER,                          -- FK to account_categories (for classification)
    template_id INTEGER,                          -- FK to templates (if created from template)
    reference_no TEXT,                           -- Reference number
    attach_path TEXT,                             -- Path to attachment file
    is_active INTEGER DEFAULT 1,                 -- Soft delete flag
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (account_id) REFERENCES accounts(id),
    FOREIGN KEY (counterparty_id) REFERENCES accounts(id),
    FOREIGN KEY (template_id) REFERENCES templates(id)
);

-- Indexes for transactions
CREATE INDEX IF NOT EXISTS idx_transactions_account ON transactions(account_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions(category_id);
CREATE INDEX IF NOT EXISTS idx_transactions_counterparty ON transactions(counterparty_id);

-- ============================================
-- HOLDINGS (持仓/理财台账)
-- ============================================
CREATE TABLE IF NOT EXISTS holdings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    symbol TEXT NOT NULL,                         -- Security code (e.g., "000001.XSHE")
    name TEXT NOT NULL,                           -- Security name
    holding_type TEXT NOT NULL CHECK(holding_type IN ('stock', 'fund', 'bond', 'bank_financial', 'precious_metal', 'other')),
    account_id INTEGER,                           -- FK to accounts (optional - which account holds this)
    shares REAL NOT NULL DEFAULT 0,               -- Number of shares/units
    cost_basis REAL NOT NULL DEFAULT 0,          -- Total cost basis
    avg_cost REAL NOT NULL DEFAULT 0,             -- Average cost per share
    current_price REAL DEFAULT 0,                -- Current price
    current_value REAL DEFAULT 0,                -- Current market value
    unrealized_pnl REAL DEFAULT 0,                -- Unrealized profit/loss
    realized_pnl REAL DEFAULT 0,                 -- Realized profit/loss
    currency TEXT DEFAULT 'CNY',                  -- Currency
    risk_level TEXT CHECK(risk_level IN ('low', 'medium', 'high')),
    purchase_date TEXT,                           -- First purchase date
    last_price_update TEXT,                       -- Last price update time
    is_active INTEGER DEFAULT 1,                  -- Soft delete flag (清仓后归档)
    is_archived INTEGER DEFAULT 0,                -- Archived for closed positions
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (account_id) REFERENCES accounts(id)
);

-- Indexes for holdings
CREATE INDEX IF NOT EXISTS idx_holdings_symbol ON holdings(symbol);
CREATE INDEX IF NOT EXISTS idx_holdings_type ON holdings(holding_type);
CREATE INDEX IF NOT EXISTS idx_holdings_account ON holdings(account_id);
CREATE INDEX IF NOT EXISTS idx_holdings_active ON holdings(is_active);

-- ============================================
-- PRICES (价格历史)
-- ============================================
CREATE TABLE IF NOT EXISTS prices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    symbol TEXT NOT NULL,                         -- Security code
    price REAL NOT NULL,                          -- Price at this date
    price_date TEXT NOT NULL,                     -- Date of price
    change_percent REAL,                         -- Daily change percent
    volume REAL,                                  -- Volume
    source TEXT DEFAULT 'manual',                 -- Price source
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(symbol, price_date)
);

-- Indexes for prices
CREATE INDEX IF NOT EXISTS idx_prices_symbol ON prices(symbol);
CREATE INDEX IF NOT EXISTS idx_prices_date ON prices(price_date);
CREATE INDEX IF NOT EXISTS idx_prices_symbol_date ON prices(symbol, price_date);

-- ============================================
-- TEMPLATES (模板)
-- ============================================
CREATE TABLE IF NOT EXISTS templates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,                           -- Template name
    description TEXT,                             -- Template description
    template_type TEXT NOT NULL CHECK(template_type IN ('transaction', 'account', 'holding')),
    category_id INTEGER,                          -- FK to account_categories
    account_type TEXT,                            -- Target account type
    transaction_type TEXT,                       -- For transaction templates
    amount REAL,                                  -- Default amount
    counterparty_id INTEGER,                      -- Default counterparty
    notes TEXT,                                   -- Default notes
    is_active INTEGER DEFAULT 1,                  -- Soft delete flag
    use_count INTEGER DEFAULT 0,                  -- Times used
    last_used_at TEXT,                            -- Last used timestamp
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (category_id) REFERENCES account_categories(id),
    FOREIGN KEY (counterparty_id) REFERENCES accounts(id)
);

-- Indexes for templates
CREATE INDEX IF NOT EXISTS idx_templates_type ON templates(template_type);
CREATE INDEX IF NOT EXISTS idx_templates_active ON templates(is_active);

-- ============================================
-- SNAPSHOTS (财务快照)
-- ============================================
CREATE TABLE IF NOT EXISTS snapshots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    snapshot_date TEXT NOT NULL,                 -- Date of snapshot
    snapshot_type TEXT NOT NULL CHECK(snapshot_type IN ('manual', 'auto', 'monthly', 'yearly')),
    total_assets REAL,                            -- Total assets value
    total_liabilities REAL,                       -- Total liabilities value
    net_assets REAL,                              -- Net assets (assets - liabilities)
    asset_breakdown TEXT,                         -- JSON: asset breakdown by category
    liability_breakdown TEXT,                      -- JSON: liability breakdown by category
    holdings_value REAL,                          -- Total investments value
    cash_flow REAL,                               -- Monthly cash flow
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Indexes for snapshots
CREATE INDEX IF NOT EXISTS idx_snapshots_date ON snapshots(snapshot_date);
CREATE INDEX IF NOT EXISTS idx_snapshots_type ON snapshots(snapshot_type);

-- ============================================
-- REMINDERS (提醒)
-- ============================================
CREATE TABLE IF NOT EXISTS reminders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,                          -- Reminder title
    reminder_type TEXT NOT NULL CHECK(reminder_type IN ('account_update', 'payment_due', 'loan_due', 'investment_due', 'custom')),
    account_id INTEGER,                           -- FK to accounts (optional)
    holding_id INTEGER,                           -- FK to holdings (optional)
    target_date TEXT NOT NULL,                     -- Target date
    advance_days INTEGER DEFAULT 3,               -- Days to advance reminder
    is_repeating INTEGER DEFAULT 0,               -- Is repeating reminder
    repeat_interval INTEGER,                      -- Repeat interval in days
    repeat_unit TEXT CHECK(repeat_unit IN ('day', 'week', 'month', 'year')),
    is_active INTEGER DEFAULT 1,                   -- Soft delete / dismiss
    is_completed INTEGER DEFAULT 0,               -- Mark as completed
    completed_at TEXT,                            -- When completed
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (account_id) REFERENCES accounts(id),
    FOREIGN KEY (holding_id) REFERENCES holdings(id)
);

-- Indexes for reminders
CREATE INDEX IF NOT EXISTS idx_reminders_account ON reminders(account_id);
CREATE INDEX IF NOT EXISTS idx_reminders_date ON reminders(target_date);
CREATE INDEX IF NOT EXISTS idx_reminders_type ON reminders(reminder_type);
CREATE INDEX IF NOT EXISTS idx_reminders_active ON reminders(is_active);

-- ============================================
-- SETTINGS (设置)
-- ============================================
CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,                        -- Setting key
    value TEXT NOT NULL,                           -- Setting value (JSON)
    value_type TEXT NOT NULL CHECK(value_type IN ('string', 'number', 'boolean', 'object', 'array')),
    description TEXT,                             -- Setting description
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ============================================
-- SEED DATA: DEFAULT ACCOUNT CATEGORIES
-- ============================================
INSERT INTO account_categories (name, parent_id, type, icon, color, sort_order) VALUES
-- Asset Categories (资产)
('流动资产', NULL, 'asset', 'wallet', '#4CAF50', 1),
('固定资产', NULL, 'asset', 'home', '#FF9800', 2),
('金融资产', NULL, 'asset', 'trending-up', '#2196F3', 3),
('其他资产', NULL, 'asset', 'ellipsis-h', '#9E9E9E', 4);

-- Sub-categories for 流动资产
INSERT INTO account_categories (name, parent_id, type, icon, color, sort_order) VALUES
('活期存款', (SELECT id FROM account_categories WHERE name = '流动资产'), 'asset', 'credit-card', '#4CAF50', 1),
('定期存款', (SELECT id FROM account_categories WHERE name = '流动资产'), 'asset', 'clock', '#4CAF50', 2),
('现金', (SELECT id FROM account_categories WHERE name = '流动资产'), 'asset', 'dollar', '#4CAF50', 3),
('应收账款', (SELECT id FROM account_categories WHERE name = '流动资产'), 'asset', 'file-invoice', '#4CAF50', 4);

-- Sub-categories for 固定资产
INSERT INTO account_categories (name, parent_id, type, icon, color, sort_order) VALUES
('房产', (SELECT id FROM account_categories WHERE name = '固定资产'), 'asset', 'home', '#FF9800', 1),
('车辆', (SELECT id FROM account_categories WHERE name = '固定资产'), 'asset', 'car', '#FF9800', 2),
('贵重物品', (SELECT id FROM account_categories WHERE name = '固定资产'), 'asset', 'gem', '#FF9800', 3);

-- Sub-categories for 金融资产
INSERT INTO account_categories (name, parent_id, type, icon, color, sort_order) VALUES
('股票', (SELECT id FROM account_categories WHERE name = '金融资产'), 'asset', 'chart-line', '#2196F3', 1),
('公募基金', (SELECT id FROM account_categories WHERE name = '金融资产'), 'asset', 'chart-pie', '#2196F3', 2),
('银行理财', (SELECT id FROM account_categories WHERE name = '金融资产'), 'asset', 'university', '#2196F3', 3),
('债券', (SELECT id FROM account_categories WHERE name = '金融资产'), 'asset', 'file-contract', '#2196F3', 4),
('国债', (SELECT id FROM account_categories WHERE name = '金融资产'), 'asset', 'shield-alt', '#2196F3', 5),
('贵金属', (SELECT id FROM account_categories WHERE name = '金融资产'), 'asset', 'coins', '#2196F3', 6),
('私募基金', (SELECT id FROM account_categories WHERE name = '金融资产'), 'asset', 'users', '#2196F3', 7),
('期货', (SELECT id FROM account_categories WHERE name = '金融资产'), 'asset', 'arrow-alt-right', '#2196F3', 8);

-- Liability Categories (负债)
INSERT INTO account_categories (name, parent_id, type, icon, color, sort_order) VALUES
('长期负债', NULL, 'liability', 'hourglass-half', '#F44336', 5),
('短期负债', NULL, 'liability', 'exclamation-circle', '#E91E63', 6);

-- Sub-categories for 长期负债
INSERT INTO account_categories (name, parent_id, type, icon, color, sort_order) VALUES
('房贷', (SELECT id FROM account_categories WHERE name = '长期负债'), 'liability', 'home', '#F44336', 1),
('车贷', (SELECT id FROM account_categories WHERE name = '长期负债'), 'liability', 'car', '#F44336', 2),
('经营贷', (SELECT id FROM account_categories WHERE name = '长期负债'), 'liability', 'briefcase', '#F44336', 3),
('教育贷款', (SELECT id FROM account_categories WHERE name = '长期负债'), 'liability', 'graduation-cap', '#F44336', 4);

-- Sub-categories for 短期负债
INSERT INTO account_categories (name, parent_id, type, icon, color, sort_order) VALUES
('信用卡', (SELECT id FROM account_categories WHERE name = '短期负债'), 'liability', 'credit-card', '#E91E63', 1),
('消费贷', (SELECT id FROM account_categories WHERE name = '短期负债'), 'liability', 'shopping-cart', '#E91E63', 2),
('网贷', (SELECT id FROM account_categories WHERE name = '短期负债'), 'liability', 'globe', '#E91E63', 3),
('应付账款', (SELECT id FROM account_categories WHERE name = '短期负债'), 'liability', 'file-invoice-dollar', '#E91E63', 4);

-- ============================================
-- SEED DATA: DEFAULT SETTINGS
-- ============================================
INSERT INTO settings (key, value, value_type, description) VALUES
('app_name', '"理财管家"', 'string', 'Application name'),
('currency', '"CNY"', 'string', 'Default currency'),
('date_format', '"YYYY-MM-DD"', 'string', 'Date format'),
('theme', '"light"', 'string', 'UI theme'),
('auto_backup', 'true', 'boolean', 'Enable auto backup'),
('backup_interval_days', '7', 'number', 'Backup interval in days'),
('session_timeout_minutes', '30', 'number', 'Session timeout in minutes'),
('asset_update_reminder_days', '30', 'number', 'Days between asset update reminders');

-- ============================================
-- INSURANCES (保险)
-- ============================================
CREATE TABLE IF NOT EXISTS insurances (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,                           -- 保险名称
    insurance_type TEXT NOT NULL DEFAULT 'other', -- 保险类型
    provider TEXT,                               -- 保险公司
    policy_no TEXT,                             -- 保单号
    holder_name TEXT,                           -- 投保人
    insured_name TEXT,                           -- 被保险人
    beneficiary TEXT,                            -- 受益人
    premium REAL DEFAULT 0,                     -- 保费金额
    premium_frequency TEXT,                      -- 缴费频率
    coverage_amount REAL DEFAULT 0,              -- 保额
    coverage_type TEXT,                          -- 保障类型
    coverage_detail TEXT,                        -- 保障详情
    start_date TEXT,                            -- 生效日期
    renewal_date TEXT,                          -- 续保日期
    end_date TEXT,                              -- 截止日期
    status TEXT DEFAULT 'active',               -- 状态
    notes TEXT,                                 -- 备注
    doc_path TEXT,                              -- PDF文件路径
    is_renewal_reminder INTEGER DEFAULT 1,     -- 启用续保提醒
    is_active INTEGER DEFAULT 1,                -- 软删除
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_insurances_type ON insurances(insurance_type);
CREATE INDEX IF NOT EXISTS idx_insurances_status ON insurances(status);
CREATE INDEX IF NOT EXISTS idx_insurances_active ON insurances(is_active);
CREATE INDEX IF NOT EXISTS idx_insurances_renewal ON insurances(renewal_date);