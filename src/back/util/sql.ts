/**
 * Validate an SQL name.
 * Some valid names will be treated as invalid to keep this function simple.
 * Source: https://social.msdn.microsoft.com/Forums/sqlserver/en-US/154c19c4-95ba-4b6f-b6ca-479288feabfb/characters-that-are-not-allowed-in-table-name-amp-column-name-in-sql-server-?forum=databasedesign
 *
 * @param name Name of an SQL table or field.
 * @throws Throws an error if the name is invalid.
 */
export function validateSqlName(name: string): void {
  // The first character is not allowed to be @ or # because they denote special values
  // (They might be safe to use, but I don't know enough to evaluate that //obelisk)

  if (name.length > 128) {
    throw new Error(`SQL name validation failed! The name contains more than 128 characters (name: "${name}", length: ${name.length})!`);
  }

  const result = name.match(/[a-zA-Z_][a-zA-Z0-9@$#_]{0,127}/);
  if (result) {
    const index = sqlKeywords.indexOf(result[0].toUpperCase());
    if (index >= 0) {
      throw new Error(`SQL name validation failed! The name is a reserved keyword (name: "${name}", keyword: "${sqlKeywords[index]}")!`);
    }
  } else {
    throw new Error(`SQL name validation failed! The name contains illegal characters (name: "${name}")!`);
  }
}

/**
 * Validate an SQL order value ("ASC" or "DESC").
 *
 * @param val String to validate.
 * @throws Throws an error if the value is invalid.
 */
export function validateSqlOrder(val: string): void {
  const upperVal = val.toUpperCase();
  if (upperVal !== 'ASC' && upperVal !== 'DESC') {
    throw new Error(`SQL order validation failed! Value is not "ASC" or "DESC" (value: "${val}")!`);
  }
}

/**
 * Reserved Keywords (Transact-SQL).
 * Consider adding "ODBC Reserved Keywords" and "Future Keywords" to this array.
 * Source: https://docs.microsoft.com/en-us/sql/t-sql/language-elements/reserved-keywords-transact-sql?view=sql-server-ver15
 */
const sqlKeywords = [
  'ADD',
  'EXTERNAL',
  'PROCEDURE',
  'ALL',
  'FETCH',
  'PUBLIC',
  'ALTER',
  'FILE',
  'RAISERROR',
  'AND',
  'FILLFACTOR',
  'READ',
  'ANY',
  'FOR',
  'READTEXT',
  'AS',
  'FOREIGN',
  'RECONFIGURE',
  'ASC',
  'FREETEXT',
  'REFERENCES',
  'AUTHORIZATION',
  'FREETEXTTABLE',
  'REPLICATION',
  'BACKUP',
  'FROM',
  'RESTORE',
  'BEGIN',
  'FULL',
  'RESTRICT',
  'BETWEEN',
  'FUNCTION',
  'RETURN',
  'BREAK',
  'GOTO',
  'REVERT',
  'BROWSE',
  'GRANT',
  'REVOKE',
  'BULK',
  'GROUP',
  'RIGHT',
  'BY',
  'HAVING',
  'ROLLBACK',
  'CASCADE',
  'HOLDLOCK',
  'ROWCOUNT',
  'CASE',
  'IDENTITY',
  'ROWGUIDCOL',
  'CHECK',
  'IDENTITY_INSERT',
  'RULE',
  'CHECKPOINT',
  'IDENTITYCOL',
  'SAVE',
  'CLOSE',
  'IF',
  'SCHEMA',
  'CLUSTERED',
  'IN',
  'SECURITYAUDIT',
  'COALESCE',
  'INDEX',
  'SELECT',
  'COLLATE',
  'INNER',
  'SEMANTICKEYPHRASETABLE',
  'COLUMN',
  'INSERT',
  'SEMANTICSIMILARITYDETAILSTABLE',
  'COMMIT',
  'INTERSECT',
  'SEMANTICSIMILARITYTABLE',
  'COMPUTE',
  'INTO',
  'SESSION_USER',
  'CONSTRAINT',
  'IS',
  'SET',
  'CONTAINS',
  'JOIN',
  'SETUSER',
  'CONTAINSTABLE',
  'KEY',
  'SHUTDOWN',
  'CONTINUE',
  'KILL',
  'SOME',
  'CONVERT',
  'LEFT',
  'STATISTICS',
  'CREATE',
  'LIKE',
  'SYSTEM_USER',
  'CROSS',
  'LINENO',
  'TABLE',
  'CURRENT',
  'LOAD',
  'TABLESAMPLE',
  'CURRENT_DATE',
  'MERGE',
  'TEXTSIZE',
  'CURRENT_TIME',
  'NATIONAL',
  'THEN',
  'CURRENT_TIMESTAMP',
  'NOCHECK',
  'TO',
  'CURRENT_USER',
  'NONCLUSTERED',
  'TOP',
  'CURSOR',
  'NOT',
  'TRAN',
  'DATABASE',
  'NULL',
  'TRANSACTION',
  'DBCC',
  'NULLIF',
  'TRIGGER',
  'DEALLOCATE',
  'OF',
  'TRUNCATE',
  'DECLARE',
  'OFF',
  'TRY_CONVERT',
  'DEFAULT',
  'OFFSETS',
  'TSEQUAL',
  'DELETE',
  'ON',
  'UNION',
  'DENY',
  'OPEN',
  'UNIQUE',
  'DESC',
  'OPENDATASOURCE',
  'UNPIVOT',
  'DISK',
  'OPENQUERY',
  'UPDATE',
  'DISTINCT',
  'OPENROWSET',
  'UPDATETEXT',
  'DISTRIBUTED',
  'OPENXML',
  'USE',
  'DOUBLE',
  'OPTION',
  'USER',
  'DROP',
  'OR',
  'VALUES',
  'DUMP',
  'ORDER',
  'VARYING',
  'ELSE',
  'OUTER',
  'VIEW',
  'END',
  'OVER',
  'WAITFOR',
  'ERRLVL',
  'PERCENT',
  'WHEN',
  'ESCAPE',
  'PIVOT',
  'WHERE',
  'EXCEPT',
  'PLAN',
  'WHILE',
  'EXEC',
  'PRECISION',
  'WITH',
  'EXECUTE',
  'PRIMARY',
  'WITHIN GROUP',
  'EXISTS',
  'PRINT',
  'WRITETEXT',
  'EXIT',
  'PROC',
];
