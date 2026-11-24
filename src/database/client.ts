import { createClient } from '@supabase/supabase-js';
import { getEnv } from '../config/env.js';
import { logger } from '../core/logger/index.js';

export interface IDatabaseClient {
  isMock(): boolean;
  from(table: string): any;
  rawQuery?(sql: string, params?: unknown[]): Promise<any>;
}

class InMemoryTable {
  private rows: Map<string, any> = new Map();

  insert(data: any | any[]): Promise<{ data: any; error: null }> {
    const items = Array.isArray(data) ? data : [data];
    const inserted: any[] = [];
    for (const item of items) {
      const id = item.id || `mock_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const row = { ...item, id };
      this.rows.set(id, row);
      inserted.push(row);
    }
    return Promise.resolve({ data: Array.isArray(data) ? inserted : inserted[0], error: null });
  }

  update(updates: any) {
    return {
      match: async (matchObj: Record<string, any>) => {
        let matched = 0;
        for (const [id, row] of this.rows.entries()) {
          const isMatch = Object.entries(matchObj).every(([k, v]) => row[k] === v);
          if (isMatch) {
            this.rows.set(id, { ...row, ...updates });
            matched++;
          }
        }
        return { data: matched, error: null };
      },
      eq: async (column: string, value: any) => {
        let matched = 0;
        for (const [id, row] of this.rows.entries()) {
          if (row[column] === value) {
            this.rows.set(id, { ...row, ...updates });
            matched++;
          }
        }
        return { data: matched, error: null };
      },
    };
  }

  delete() {
    return {
      match: async (matchObj: Record<string, any>) => {
        for (const [id, row] of this.rows.entries()) {
          const isMatch = Object.entries(matchObj).every(([k, v]) => row[k] === v);
          if (isMatch) {
            this.rows.delete(id);
          }
        }
        return { error: null };
      },
      eq: async (column: string, value: any) => {
        for (const [id, row] of this.rows.entries()) {
          if (row[column] === value) {
            this.rows.delete(id);
          }
        }
        return { error: null };
      },
    };
  }

  selectQuery() {
    let results = Array.from(this.rows.values());

    const builder: any = {
      eq: (column: string, value: any) => {
        results = results.filter((r) => r[column] === value);
        return builder;
      },
      in: (column: string, values: any[]) => {
        results = results.filter((r) => values.includes(r[column]));
        return builder;
      },
      gte: (column: string, value: any) => {
        results = results.filter((r) => r[column] >= value);
        return builder;
      },
      lte: (column: string, value: any) => {
        results = results.filter((r) => r[column] <= value);
        return builder;
      },
      order: (column: string, { ascending = true }: { ascending?: boolean } = {}) => {
        results.sort((a, b) => {
          if (a[column] < b[column]) return ascending ? -1 : 1;
          if (a[column] > b[column]) return ascending ? 1 : -1;
          return 0;
        });
        return builder;
      },
      limit: (count: number) => {
        results = results.slice(0, count);
        return builder;
      },
      single: async () => {
        return { data: results[0] || null, error: null };
      },
      then: (resolve: any, reject?: any) => {
        return Promise.resolve({ data: results, error: null }).then(resolve, reject);
      },
    };

    return builder;
  }
}

export class InMemoryDatabaseClient implements IDatabaseClient {
  private tables: Map<string, InMemoryTable> = new Map();

  isMock(): boolean {
    return true;
  }

  from(table: string): any {
    if (!this.tables.has(table)) {
      this.tables.set(table, new InMemoryTable());
    }
    const memTable = this.tables.get(table)!;

    return {
      insert: (data: any) => memTable.insert(data),
      select: (cols?: string) => memTable.selectQuery(),
      update: (updates: any) => memTable.update(updates),
      delete: () => memTable.delete(),
    };
  }
}

let dbClientInstance: IDatabaseClient | null = null;

export function getDatabaseClient(): IDatabaseClient {
  if (dbClientInstance) return dbClientInstance;

  const env = getEnv();

  if (env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY && !env.DRY_RUN && !env.DATABASE_FALLBACK_MEMORY) {
    try {
      const client = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      });

      dbClientInstance = {
        isMock: () => false,
        from: (table: string) => client.from(table),
      };

      logger.info('Initialized Supabase PostgreSQL Client');
      return dbClientInstance;
    } catch (err) {
      logger.warn('Failed to connect to Supabase, falling back to In-Memory store', { error: String(err) });
    }
  }

  logger.info('Using Resilient In-Memory Database Store');
  dbClientInstance = new InMemoryDatabaseClient();
  return dbClientInstance;
}

export function resetDatabaseClient(): void {
  dbClientInstance = null;
}

export function getSupabaseRawClient(): ReturnType<typeof createClient> | null {
  const env = getEnv();
  if (env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY) {
    return createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }
  return null;
}
