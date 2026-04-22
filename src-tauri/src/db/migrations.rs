use rusqlite::{Connection, Result};
use std::path::Path;

pub const CURRENT_APP_VERSION: &str = "0.1.0";
pub const CURRENT_SCHEMA_VERSION: i32 = 1;

pub struct Migration {
    pub version: i32,
    pub description: &'static str,
    pub sql: &'static str,
}

pub struct DataMigration {
    pub from_version: i32,
    pub to_version: i32,
    pub description: &'static str,
    pub migrate_fn: fn(&Connection) -> Result<()>,
}

pub fn get_schema_migrations() -> Vec<Migration> {
    vec![Migration {
        version: 1,
        description: "Initial schema - P0 entities",
        sql: include_str!("schema.sql"),
    }]
}

pub fn get_data_migrations() -> Vec<DataMigration> {
    vec![]
}

pub fn get_schema_version(conn: &Connection) -> Result<i32> {
    let version: i32 = conn.query_row(
        "SELECT COALESCE(MAX(version), 0) FROM schema_version WHERE type = 'schema' OR type IS NULL",
        [],
        |row| row.get(0),
    ).or_else(|_| {
        conn.query_row(
            "SELECT COALESCE(MAX(version), 0) FROM schema_version",
            [],
            |row| row.get(0),
        )
    })?;
    Ok(version)
}

pub fn apply_schema_migration(
    conn: &Connection,
    migration: &Migration,
    app_version: &str,
) -> Result<()> {
    let mut tx = conn.unchecked_transaction()?;
    tx.execute_batch(migration.sql)?;
    tx.execute(
        "INSERT INTO schema_version (version, type, description, app_version, applied_at) VALUES (?1, 'schema', ?2, ?3, datetime('now'))",
        rusqlite::params![migration.version, migration.description, app_version],
    )?;
    tx.commit()?;
    Ok(())
}

pub fn apply_data_migration(conn: &Connection, migration: &DataMigration) -> Result<()> {
    let mut tx = conn.unchecked_transaction()?;
    (migration.migrate_fn)(conn)?;
    tx.execute(
        "INSERT INTO schema_version (version, type, description, app_version, applied_at) VALUES (?1, 'data', ?2, ?3, datetime('now'))",
        rusqlite::params![migration.to_version, migration.description, CURRENT_APP_VERSION],
    )?;
    tx.commit()?;
    Ok(())
}

pub fn initialize_schema_version_table(conn: &Connection) -> Result<()> {
    conn.execute_batch(
        "CREATE TABLE IF NOT EXISTS schema_version (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            version INTEGER NOT NULL,
            type TEXT NOT NULL CHECK(type IN ('schema', 'data')),
            description TEXT,
            app_version TEXT,
            applied_at TEXT NOT NULL DEFAULT (datetime('now')),
            UNIQUE(version, type)
        );",
    )?;
    Ok(())
}

pub fn run_migrations(conn: &Connection) -> Result<()> {
    let schema_exists = conn
        .query_row(
            "SELECT name FROM sqlite_master WHERE type='table' AND name='schema_version'",
            [],
            |row| row.get::<_, String>(0),
        )
        .is_ok();

    if !schema_exists {
        initialize_schema_version_table(conn)?;
    }

    let current_schema_version = get_schema_version(conn)?;

    if current_schema_version >= CURRENT_SCHEMA_VERSION {
        return Ok(());
    }

    conn.execute_batch("PRAGMA foreign_keys = OFF;")?;

    if current_schema_version == 0 && schema_exists {
        conn.execute_batch(
            "ALTER TABLE schema_version ADD COLUMN type TEXT DEFAULT 'schema';
             ALTER TABLE schema_version ADD COLUMN app_version TEXT;
             UPDATE schema_version SET type = 'schema' WHERE type IS NULL;",
        )?;
    }

    for migration in get_schema_migrations() {
        if migration.version > current_schema_version && migration.version <= CURRENT_SCHEMA_VERSION
        {
            apply_schema_migration(conn, &migration, CURRENT_APP_VERSION)?;
            println!(
                "Applied schema migration version {}: {}",
                migration.version, migration.description
            );
        }
    }

    for migration in get_data_migrations() {
        if migration.from_version >= current_schema_version
            && migration.to_version <= CURRENT_SCHEMA_VERSION
        {
            apply_data_migration(conn, &migration)?;
            println!(
                "Applied data migration v{}->v{}: {}",
                migration.from_version, migration.to_version, migration.description
            );
        }
    }

    let _ = conn.execute_batch("PRAGMA foreign_keys = ON;");

    Ok(())
}

pub fn initialize_database(db_path: &Path) -> Result<Connection> {
    let conn = Connection::open(db_path)?;

    conn.execute_batch(
        "PRAGMA journal_mode = WAL;
         PRAGMA synchronous = NORMAL;
         PRAGMA foreign_keys = ON;
         PRAGMA busy_timeout = 5000;",
    )?;

    run_migrations(&conn)?;

    Ok(conn)
}
