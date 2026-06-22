DB Migration Plan and Versioning (offline SQLite)

- Objective
  - Ensure schema changes are applied reliably for upgrades while preserving offline data.

- Migration Strategy
  - Use an on-startup migrations runner that applies needed migrations to reach the latest schema.
  - Maintain a dedicated migration history table:
    - schema_migrations(version INTEGER PRIMARY KEY, applied_at TEXT, description TEXT)

- Versioning Scheme
  - Start at version 1 for the initial schema (as per schema-sql-1.md).
  - For upgrades, run migrations in ascending version order (2, 3, ...).

- Example Migrations (structure)
  - Each version has a corresponding SQL block/script:
    - migrate_to_v2.sql
    - migrate_to_v3.sql
  - SQL blocks should be wrapped in a transaction:
    BEGIN TRANSACTION;
    -- statements
    COMMIT;

- Typical Migration Content
  - Add new tables or columns: ALTER TABLE Habits ADD COLUMN lastModified TEXT;
  - Rename columns via create-temp-table-and-copy pattern if SQLite limitations apply.
  - Create new tables: CREATE TABLE NewTable (...);
  - Create or update indices for performance.

- Data Migration Guidance
  - Preserve existing data during structural changes when possible.
  - Use UPDATE statements to map old values to new columns.
  - If data loss is possible, document it and provide recovery steps.

- Startup/Apply Flow (high level)
  1. Read current version from schema_migrations.max(version) or 0 if table missing.
  2. For each target version > current, execute corresponding migration script in order.
  3. After successful migration, insert a row into schema_migrations with version and description.
  4. If a migration fails, stop and provide rollback/alert path.

- Acceptance Criteria
  - All users on the device end up with latest schema after app startup.
  - Data integrity is preserved; no unexpected NULLs or data loss.
  - Clear rollback/alert path documented for migration failures.

- References
  - Initial schema: /Users/goisemail/base/habbitNow/habbitNow/IsmailNow/notes/schema-sql-1.md

- Next steps (optional)
  - Add concrete v2 and v3 SQL migration scripts in this notes folder when business approves.
