# Backup and Restore with Oracle Data Pump

## Purpose

Oracle Data Pump creates an export file of the `VET` schema. Use it before major changes or before submitting the project. The commands below do not contain a password; Data Pump prompts for one when needed.

## Important: an Oracle DIRECTORY object is required

Data Pump reads and writes files on the **database server**, not in the SQLcl working folder. Before exporting or importing, a database administrator must create an Oracle DIRECTORY object that points to a real folder on the database server.

Example administrator setup (replace the server path with a real backup folder):

```sql
CREATE OR REPLACE DIRECTORY vet_backup_dir AS '/server/path/for/vet_backups';
GRANT READ, WRITE ON DIRECTORY vet_backup_dir TO VET;
```

The `VET` user needs both `READ` and `WRITE` on this DIRECTORY object. Creating a DIRECTORY object usually requires DBA privileges.

## Export the VET schema

Run this in a terminal. Replace `FREEPDB1` if the database service name is different. Data Pump prompts for the `VET` password.

```text
expdp VET@localhost:1521/FREEPDB1 DIRECTORY=VET_BACKUP_DIR DUMPFILE=vet_backup.dmp LOGFILE=vet_export.log SCHEMAS=VET
```

This creates these files in the database-server directory represented by `VET_BACKUP_DIR`:

- `vet_backup.dmp` — the exported schema data and objects.
- `vet_export.log` — the export log; check it for errors.

## Import the VET schema

To import into an empty `VET` schema, run:

```text
impdp VET@localhost:1521/FREEPDB1 DIRECTORY=VET_BACKUP_DIR DUMPFILE=vet_backup.dmp LOGFILE=vet_import.log SCHEMAS=VET
```

If tables already exist and you intentionally want the import to replace them, use this extra option:

```text
TABLE_EXISTS_ACTION=REPLACE
```

`TABLE_EXISTS_ACTION=REPLACE` removes and recreates imported tables, so use it only when overwriting the existing project data is acceptable.

## Simple backup checklist

1. Confirm the `VET_BACKUP_DIR` Oracle DIRECTORY exists and `VET` has `READ` and `WRITE` privileges.
2. Run the export command.
3. Check `vet_export.log` for errors.
4. Keep the dump file in a safe backup location.
5. Practise importing into a separate test schema before relying on a backup.
