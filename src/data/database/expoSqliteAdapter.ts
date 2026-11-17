import * as SQLite from 'expo-sqlite';
import { DatabaseAdapter, SqlBindValue, SqlRunResult } from './types';

/**
 * Adaptador para expo-sqlite en tiempo de ejecución móvil (Android / iOS).
 */
export class ExpoSqliteAdapter implements DatabaseAdapter {
  private constructor(private readonly db: SQLite.SQLiteDatabase) {}

  static async abrir(nombreArchivo = 'antropometria_oms.db'): Promise<ExpoSqliteAdapter> {
    const db = await SQLite.openDatabaseAsync(nombreArchivo);
    return new ExpoSqliteAdapter(db);
  }

  async execAsync(sql: string): Promise<void> {
    await this.db.execAsync(sql);
  }

  async runAsync(sql: string, ...params: SqlBindValue[]): Promise<SqlRunResult> {
    const res = await this.db.runAsync(sql, params);
    return {
      changes: res.changes,
      lastInsertRowId: res.lastInsertRowId,
    };
  }

  async getFirstAsync<T>(sql: string, ...params: SqlBindValue[]): Promise<T | null> {
    return this.db.getFirstAsync<T>(sql, params);
  }

  async getAllAsync<T>(sql: string, ...params: SqlBindValue[]): Promise<T[]> {
    return this.db.getAllAsync<T>(sql, params);
  }

  async withExclusiveTransactionAsync(fn: () => Promise<void>): Promise<void> {
    await this.db.withExclusiveTransactionAsync(fn);
  }
}
