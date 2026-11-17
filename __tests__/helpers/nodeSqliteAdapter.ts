// eslint-disable-next-line @typescript-eslint/no-require-imports
const { DatabaseSync } = require('node:sqlite') as {
  DatabaseSync: new (path: string) => {
    exec(sql: string): void;
    prepare(sql: string): {
      run(...params: Array<string | number | null>): {
        changes: number;
        lastInsertRowid: number | bigint;
      };
      get(...params: Array<string | number | null>): unknown;
      all(...params: Array<string | number | null>): unknown[];
    };
    close(): void;
  };
};

import { DatabaseAdapter, SqlBindValue, SqlRunResult } from '../../src/data/database/types';

/**
 * Adaptador SQLite en memoria basado en `node:sqlite` (Node 24) para ejecutar pruebas
 * de integración reales sobre SQL, restricciones CHECK, FK y transacciones ACID.
 */
export class NodeSqliteAdapter implements DatabaseAdapter {
  private readonly db;

  constructor(path = ':memory:') {
    this.db = new DatabaseSync(path);
  }

  async execAsync(sql: string): Promise<void> {
    this.db.exec(sql);
  }

  async runAsync(sql: string, ...params: SqlBindValue[]): Promise<SqlRunResult> {
    const stmt = this.db.prepare(sql);
    const res = stmt.run(...params);
    return {
      changes: Number(res.changes),
      lastInsertRowId: Number(res.lastInsertRowid),
    };
  }

  async getFirstAsync<T>(sql: string, ...params: SqlBindValue[]): Promise<T | null> {
    const stmt = this.db.prepare(sql);
    const row = stmt.get(...params);
    return (row as T | undefined) ?? null;
  }

  async getAllAsync<T>(sql: string, ...params: SqlBindValue[]): Promise<T[]> {
    const stmt = this.db.prepare(sql);
    return stmt.all(...params) as T[];
  }

  async withExclusiveTransactionAsync(fn: () => Promise<void>): Promise<void> {
    this.db.exec('BEGIN IMMEDIATE');
    try {
      await fn();
      this.db.exec('COMMIT');
    } catch (err) {
      this.db.exec('ROLLBACK');
      throw err;
    }
  }

  cerrar(): void {
    this.db.close();
  }
}
