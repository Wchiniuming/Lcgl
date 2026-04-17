use rusqlite::{Connection, Result};
use std::path::Path;

const CURRENT_SCHEMA_VERSION: i32 = 1;

pub struct Migration {
    pub version: i32,
    pub description: &'static str,
    pub sql: &'static str,
}

pub fn get_migrations() -> Vec<Migration> {
    vec![Migration {
        version: 1,
        description: "Initial schema - P0 entities",
        sql: include_str!("schema.sql"),
    }]
}

pub fn get_schema_version(conn: &Connection) -> Result<i32> {
    let version: i32 = conn.query_row(
        "SELECT COALESCE(MAX(version), 0) FROM schema_version",
        [],
        |row| row.get(0),
    )?;
    Ok(version)
}

pub fn apply_migration(conn: &Connection, migration: &Migration) -> Result<()> {
    let tx = conn.unchecked_transaction()?;

    conn.execute_batch(migration.sql)?;

    conn.execute(
        "INSERT INTO schema_version (version, description) VALUES (?1, ?2)",
        rusqlite::params![migration.version, migration.description],
    )?;

    tx.commit()?;
    Ok(())
}

pub fn run_migrations(conn: &Connection) -> Result<()> {
    let current_version = get_schema_version(conn)?;

    if current_version >= CURRENT_SCHEMA_VERSION {
        return Ok(());
    }

    conn.execute_batch("PRAGMA foreign_keys = OFF;")?;

    for migration in get_migrations() {
        if migration.version > current_version {
            apply_migration(conn, &migration)?;
            println!(
                "Applied migration version {}: {}",
                migration.version, migration.description
            );
        }
    }

    conn.execute_batch("PRAGMA foreign_keys = ON;")?;

    Ok(())
}

pub fn initialize_database(db_path: &Path) -> Result<Connection> {
    let conn = Connection::open(db_path)?;

    conn.set_db_config(rusqlite::DbConfig::SQLITE_DBCONFIG_ENABLE_FKEY, true)?;

    conn.execute_batch(
        "PRAGMA journal_mode = WAL;
         PRAGMA synchronous = NORMAL;
         PRAGMA foreign_keys = ON;
         PRAGMA busy_timeout = 5000;",
    )?;

    run_migrations(&conn)?;

    Ok(conn)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use tempfile::tempdir;

    #[test]
    fn test_migration_system() {
        let dir = tempdir().unwrap();
        let db_path = dir.path().join("test.db");

        let conn = initialize_database(&db_path).unwrap();

        let version = get_schema_version(&conn).unwrap();
        assert_eq!(version, CURRENT_SCHEMA_VERSION);

        let count: i64 = conn
            .query_row("SELECT COUNT(*) FROM account_categories", [], |row| {
                row.get(0)
            })
            .unwrap();
        assert!(count > 0);

        let setting_count: i64 = conn
            .query_row("SELECT COUNT(*) FROM settings", [], |row| row.get(0))
            .unwrap();
        assert!(setting_count > 0);
    }
}
