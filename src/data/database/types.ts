export type SqlBindValue = string | number | null;

export interface SqlRunResult {
  changes: number;
  lastInsertRowId: number;
}

/**
 * Abstracción mínima compatible con expo-sqlite (móvil) y node:sqlite (pruebas Jest),
 * permitiendo ejecutar transacciones ACID reales en ambos entornos.
 */
export interface DatabaseAdapter {
  execAsync(sql: string): Promise<void>;
  runAsync(sql: string, ...params: SqlBindValue[]): Promise<SqlRunResult>;
  getFirstAsync<T>(sql: string, ...params: SqlBindValue[]): Promise<T | null>;
  getAllAsync<T>(sql: string, ...params: SqlBindValue[]): Promise<T[]>;
  withExclusiveTransactionAsync(fn: () => Promise<void>): Promise<void>;
}
