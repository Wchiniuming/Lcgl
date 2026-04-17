use chrono::{DateTime, NaiveDate, Utc};
use rusqlite::Row;
use serde::{Deserialize, Serialize};
use std::str::FromStr;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AccountCategory {
    pub id: i64,
    pub name: String,
    pub parent_id: Option<i64>,
    #[serde(rename = "type")]
    pub category_type: AccountType,
    pub icon: Option<String>,
    pub color: Option<String>,
    pub sort_order: i32,
    pub is_active: bool,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum AccountType {
    Asset,
    Liability,
}

impl FromStr for AccountType {
    type Err = String;
    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s.to_lowercase().as_str() {
            "asset" => Ok(AccountType::Asset),
            "liability" => Ok(AccountType::Liability),
            _ => Err(format!("Invalid account type: {}", s)),
        }
    }
}

impl ToString for AccountType {
    fn to_string(&self) -> String {
        match self {
            AccountType::Asset => "asset".to_string(),
            AccountType::Liability => "liability".to_string(),
        }
    }
}

impl AccountCategory {
    pub fn from_row(row: &Row) -> rusqlite::Result<Self> {
        Ok(AccountCategory {
            id: row.get(0)?,
            name: row.get(1)?,
            parent_id: row.get(2)?,
            category_type: AccountType::from_str(&row.get::<_, String>(3)?)
                .unwrap_or(AccountType::Asset),
            icon: row.get(4)?,
            color: row.get(5)?,
            sort_order: row.get(6)?,
            is_active: row.get::<_, i32>(7)? == 1,
            created_at: row.get(8)?,
            updated_at: row.get(9)?,
        })
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Account {
    pub id: i64,
    pub name: String,
    pub category_id: i64,
    #[serde(rename = "type")]
    pub account_type: AccountType,
    pub balance: f64,
    pub currency: String,
    pub institution: Option<String>,
    pub account_no: Option<String>,
    pub interest_rate: Option<f64>,
    pub term_months: Option<i32>,
    pub start_date: Option<String>,
    pub maturity_date: Option<String>,
    pub payment_due_day: Option<i32>,
    pub is_active: bool,
    pub is_archived: bool,
    pub notes: Option<String>,
    pub extra_data: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

impl Account {
    pub fn from_row(row: &Row) -> rusqlite::Result<Self> {
        Ok(Account {
            id: row.get(0)?,
            name: row.get(1)?,
            category_id: row.get(2)?,
            account_type: AccountType::from_str(&row.get::<_, String>(3)?)
                .unwrap_or(AccountType::Asset),
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
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum TransactionType {
    Income,
    Expense,
    Transfer,
    Adjustment,
}

impl FromStr for TransactionType {
    type Err = String;
    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s.to_lowercase().as_str() {
            "income" => Ok(TransactionType::Income),
            "expense" => Ok(TransactionType::Expense),
            "transfer" => Ok(TransactionType::Transfer),
            "adjustment" => Ok(TransactionType::Adjustment),
            _ => Err(format!("Invalid transaction type: {}", s)),
        }
    }
}

impl ToString for TransactionType {
    fn to_string(&self) -> String {
        match self {
            TransactionType::Income => "income".to_string(),
            TransactionType::Expense => "expense".to_string(),
            TransactionType::Transfer => "transfer".to_string(),
            TransactionType::Adjustment => "adjustment".to_string(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Transaction {
    pub id: i64,
    pub account_id: i64,
    pub transaction_type: TransactionType,
    pub amount: f64,
    pub balance_after: Option<f64>,
    pub counterparty_id: Option<i64>,
    pub transaction_date: String,
    pub description: Option<String>,
    pub category_id: Option<i64>,
    pub template_id: Option<i64>,
    pub reference_no: Option<String>,
    pub attach_path: Option<String>,
    pub is_active: bool,
    pub created_at: String,
    pub updated_at: String,
}

impl Transaction {
    pub fn from_row(row: &Row) -> rusqlite::Result<Self> {
        Ok(Transaction {
            id: row.get(0)?,
            account_id: row.get(1)?,
            transaction_type: TransactionType::from_str(&row.get::<_, String>(2)?)
                .unwrap_or(TransactionType::Adjustment),
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
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum HoldingType {
    Stock,
    Fund,
    Bond,
    BankFinancial,
    PreciousMetal,
    Other,
}

impl FromStr for HoldingType {
    type Err = String;
    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s.to_lowercase().as_str() {
            "stock" => Ok(HoldingType::Stock),
            "fund" => Ok(HoldingType::Fund),
            "bond" => Ok(HoldingType::Bond),
            "bank_financial" => Ok(HoldingType::BankFinancial),
            "precious_metal" => Ok(HoldingType::PreciousMetal),
            "other" => Ok(HoldingType::Other),
            _ => Err(format!("Invalid holding type: {}", s)),
        }
    }
}

impl ToString for HoldingType {
    fn to_string(&self) -> String {
        match self {
            HoldingType::Stock => "stock".to_string(),
            HoldingType::Fund => "fund".to_string(),
            HoldingType::Bond => "bond".to_string(),
            HoldingType::BankFinancial => "bank_financial".to_string(),
            HoldingType::PreciousMetal => "precious_metal".to_string(),
            HoldingType::Other => "other".to_string(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Holding {
    pub id: i64,
    pub symbol: String,
    pub name: String,
    pub holding_type: HoldingType,
    pub account_id: Option<i64>,
    pub shares: f64,
    pub cost_basis: f64,
    pub avg_cost: f64,
    pub current_price: f64,
    pub current_value: f64,
    pub unrealized_pnl: f64,
    pub realized_pnl: f64,
    pub currency: String,
    pub risk_level: Option<String>,
    pub purchase_date: Option<String>,
    pub last_price_update: Option<String>,
    pub is_active: bool,
    pub is_archived: bool,
    pub notes: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

impl Holding {
    pub fn from_row(row: &Row) -> rusqlite::Result<Self> {
        Ok(Holding {
            id: row.get(0)?,
            symbol: row.get(1)?,
            name: row.get(2)?,
            holding_type: HoldingType::from_str(&row.get::<_, String>(3)?)
                .unwrap_or(HoldingType::Other),
            account_id: row.get(4)?,
            shares: row.get(5)?,
            cost_basis: row.get(6)?,
            avg_cost: row.get(7)?,
            current_price: row.get(8)?,
            current_value: row.get(9)?,
            unrealized_pnl: row.get(10)?,
            realized_pnl: row.get(11)?,
            currency: row.get(12)?,
            risk_level: row.get(13)?,
            purchase_date: row.get(14)?,
            last_price_update: row.get(15)?,
            is_active: row.get::<_, i32>(16)? == 1,
            is_archived: row.get::<_, i32>(17)? == 1,
            notes: row.get(18)?,
            created_at: row.get(19)?,
            updated_at: row.get(20)?,
        })
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Price {
    pub id: i64,
    pub symbol: String,
    pub price: f64,
    pub price_date: String,
    pub change_percent: Option<f64>,
    pub volume: Option<f64>,
    pub source: String,
    pub created_at: String,
}

impl Price {
    pub fn from_row(row: &Row) -> rusqlite::Result<Self> {
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
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum TemplateType {
    Transaction,
    Account,
    Holding,
}

impl FromStr for TemplateType {
    type Err = String;
    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s.to_lowercase().as_str() {
            "transaction" => Ok(TemplateType::Transaction),
            "account" => Ok(TemplateType::Account),
            "holding" => Ok(TemplateType::Holding),
            _ => Err(format!("Invalid template type: {}", s)),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Template {
    pub id: i64,
    pub name: String,
    pub description: Option<String>,
    pub template_type: TemplateType,
    pub category_id: Option<i64>,
    pub account_type: Option<String>,
    pub transaction_type: Option<TransactionType>,
    pub amount: Option<f64>,
    pub counterparty_id: Option<i64>,
    pub notes: Option<String>,
    pub is_active: bool,
    pub use_count: i32,
    pub last_used_at: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

impl Template {
    pub fn from_row(row: &Row) -> rusqlite::Result<Self> {
        let transaction_type_str: Option<String> = row.get(10)?;
        let transaction_type = transaction_type_str
            .map(|s| TransactionType::from_str(&s).unwrap_or(TransactionType::Income));

        Ok(Template {
            id: row.get(0)?,
            name: row.get(1)?,
            description: row.get(2)?,
            template_type: TemplateType::from_str(&row.get::<_, String>(3)?)
                .unwrap_or(TemplateType::Transaction),
            category_id: row.get(4)?,
            account_type: row.get(5)?,
            transaction_type,
            amount: row.get(6)?,
            counterparty_id: row.get(7)?,
            notes: row.get(8)?,
            is_active: row.get::<_, i32>(9)? == 1,
            use_count: row.get(11)?,
            last_used_at: row.get(12)?,
            created_at: row.get(13)?,
            updated_at: row.get(14)?,
        })
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Snapshot {
    pub id: i64,
    pub snapshot_date: String,
    pub snapshot_type: String,
    pub total_assets: Option<f64>,
    pub total_liabilities: Option<f64>,
    pub net_assets: Option<f64>,
    pub asset_breakdown: Option<String>,
    pub liability_breakdown: Option<String>,
    pub holdings_value: Option<f64>,
    pub cash_flow: Option<f64>,
    pub notes: Option<String>,
    pub created_at: String,
}

impl Snapshot {
    pub fn from_row(row: &Row) -> rusqlite::Result<Self> {
        Ok(Snapshot {
            id: row.get(0)?,
            snapshot_date: row.get(1)?,
            snapshot_type: row.get(2)?,
            total_assets: row.get(3)?,
            total_liabilities: row.get(4)?,
            net_assets: row.get(5)?,
            asset_breakdown: row.get(6)?,
            liability_breakdown: row.get(7)?,
            holdings_value: row.get(8)?,
            cash_flow: row.get(9)?,
            notes: row.get(10)?,
            created_at: row.get(11)?,
        })
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ReminderType {
    AccountUpdate,
    PaymentDue,
    LoanDue,
    InvestmentDue,
    Custom,
}

impl FromStr for ReminderType {
    type Err = String;
    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s.to_lowercase().as_str() {
            "account_update" => Ok(ReminderType::AccountUpdate),
            "payment_due" => Ok(ReminderType::PaymentDue),
            "loan_due" => Ok(ReminderType::LoanDue),
            "investment_due" => Ok(ReminderType::InvestmentDue),
            "custom" => Ok(ReminderType::Custom),
            _ => Err(format!("Invalid reminder type: {}", s)),
        }
    }
}

impl ToString for ReminderType {
    fn to_string(&self) -> String {
        match self {
            ReminderType::AccountUpdate => "account_update".to_string(),
            ReminderType::PaymentDue => "payment_due".to_string(),
            ReminderType::LoanDue => "loan_due".to_string(),
            ReminderType::InvestmentDue => "investment_due".to_string(),
            ReminderType::Custom => "custom".to_string(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Reminder {
    pub id: i64,
    pub title: String,
    pub reminder_type: ReminderType,
    pub account_id: Option<i64>,
    pub holding_id: Option<i64>,
    pub target_date: String,
    pub advance_days: i32,
    pub is_repeating: bool,
    pub repeat_interval: Option<i32>,
    pub repeat_unit: Option<String>,
    pub is_active: bool,
    pub is_completed: bool,
    pub completed_at: Option<String>,
    pub notes: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

impl Reminder {
    pub fn from_row(row: &Row) -> rusqlite::Result<Self> {
        Ok(Reminder {
            id: row.get(0)?,
            title: row.get(1)?,
            reminder_type: ReminderType::from_str(&row.get::<_, String>(2)?)
                .unwrap_or(ReminderType::Custom),
            account_id: row.get(3)?,
            holding_id: row.get(4)?,
            target_date: row.get(5)?,
            advance_days: row.get(6)?,
            is_repeating: row.get::<_, i32>(7)? == 1,
            repeat_interval: row.get(8)?,
            repeat_unit: row.get(9)?,
            is_active: row.get::<_, i32>(10)? == 1,
            is_completed: row.get::<_, i32>(11)? == 1,
            completed_at: row.get(12)?,
            notes: row.get(13)?,
            created_at: row.get(14)?,
            updated_at: row.get(15)?,
        })
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Setting {
    pub key: String,
    pub value: String,
    pub value_type: String,
    pub description: Option<String>,
    pub updated_at: String,
}

impl Setting {
    pub fn from_row(row: &Row) -> rusqlite::Result<Self> {
        Ok(Setting {
            key: row.get(0)?,
            value: row.get(1)?,
            value_type: row.get(2)?,
            description: row.get(3)?,
            updated_at: row.get(4)?,
        })
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SchemaVersion {
    pub version: i32,
    pub applied_at: String,
    pub description: Option<String>,
}

impl SchemaVersion {
    pub fn from_row(row: &Row) -> rusqlite::Result<Self> {
        Ok(SchemaVersion {
            version: row.get(0)?,
            applied_at: row.get(1)?,
            description: row.get(2)?,
        })
    }
}
